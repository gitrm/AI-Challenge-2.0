import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { CalendarDays, MapPin, Globe, Users, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TicketCard } from "@/components/ticket-card";
import { FeedbackSection } from "@/components/feedback-section";
import { GallerySection } from "@/components/gallery-section";
import { ReportButton } from "@/components/report-button";

export const Route = createFileRoute("/event/$eventId")({
  component: EventPage,
});

type EventDetail = {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  starts_at: string;
  ends_at: string;
  time_zone: string;
  venue_address: string | null;
  online_url?: string | null;
  capacity: number;
  status: "draft" | "published";
  visibility: "public" | "unlisted";
  host_id: string;
  hosts: { id: string; name: string; slug: string; logo_url: string | null } | null;
};

type Stats = { going_count: number; waitlist_count: number };
type MyRsvp = {
  id: string;
  status: "going" | "waitlist" | "cancelled";
  ticket_code: string;
  waitlist_position: number | null;
};

function EventPage() {
  const { eventId } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [stats, setStats] = useState<Stats>({ going_count: 0, waitlist_count: 0 });
  const [myRsvp, setMyRsvp] = useState<MyRsvp | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const prevStatusRef = useRef<MyRsvp["status"] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("events")
        .select(
          "id,title,description,cover_image_url,starts_at,ends_at,time_zone,venue_address,capacity,status,visibility,host_id,hosts(id,name,slug,logo_url)"
        )
        .eq("id", eventId)
        .maybeSingle();
      if (cancelled) return;
      if (!data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setEvent(data as unknown as EventDetail);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const refreshStats = useCallback(async () => {
    const { data } = await supabase
      .from("event_stats")
      .select("going_count, waitlist_count")
      .eq("event_id", eventId)
      .maybeSingle();
    if (data) {
      setStats({
        going_count: Number(data.going_count ?? 0),
        waitlist_count: Number(data.waitlist_count ?? 0),
      });
    }
  }, [eventId]);

  const refreshMyRsvp = useCallback(async () => {
    if (!user) {
      setMyRsvp(null);
      return;
    }
    const { data } = await supabase
      .from("rsvps")
      .select("id,status,ticket_code,waitlist_position")
      .eq("event_id", eventId)
      .eq("user_id", user.id)
      .in("status", ["going", "waitlist"])
      .maybeSingle();
    setMyRsvp((data as MyRsvp) ?? null);
  }, [user, eventId]);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  useEffect(() => {
    refreshMyRsvp();
  }, [refreshMyRsvp]);

  // Fetch online URL only when viewer is allowed (going attendee or host member)
  useEffect(() => {
    let cancelled = false;
    if (!user || !event) return;
    if (myRsvp?.status !== "going") return;
    (async () => {
      const { data } = await supabase.rpc("get_event_online_url", { p_event_id: event.id });
      if (cancelled) return;
      if (typeof data === "string" && data.length > 0) {
        setEvent((prev) => (prev ? { ...prev, online_url: data } : prev));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, event?.id, myRsvp?.status]);

  // Realtime: detect promotion from waitlist → going
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`rsvps:${eventId}:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rsvps",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as { event_id?: string } | undefined;
          if (!row || row.event_id !== eventId) return;
          refreshMyRsvp();
          refreshStats();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rsvps",
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          refreshStats();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, eventId, refreshMyRsvp, refreshStats]);

  // Toast on waitlist → going promotion
  useEffect(() => {
    const prev = prevStatusRef.current;
    const next = myRsvp?.status ?? null;
    if (prev === "waitlist" && next === "going") {
      toast.success("You've been promoted from the waitlist.");
    }
    prevStatusRef.current = next;
  }, [myRsvp?.status]);

  async function handleRsvp() {
    if (!user || !event) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc("rsvp_to_event", { p_event_id: event.id });
      if (error) throw error;
      await Promise.all([refreshMyRsvp(), refreshStats()]);
    } catch (err: any) {
      toast.error(err?.message ?? "RSVP failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel() {
    if (!user || !event) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc("cancel_rsvp", { p_event_id: event.id });
      if (error) throw error;
      await Promise.all([refreshMyRsvp(), refreshStats()]);
      toast.success("RSVP cancelled");
    } catch (err: any) {
      toast.error(err?.message ?? "Cancel failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || authLoading) {
    return <main className="mx-auto max-w-4xl px-4 py-10 text-muted-foreground">Loading…</main>;
  }

  if (notFound || !event) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-semibold">Event not found</h1>
      </main>
    );
  }

  const ended = new Date(event.ends_at).getTime() < Date.now();
  const tz = event.time_zone || "UTC";
  const startInTz = formatInTimeZone(event.starts_at, tz, "PPP · p (zzz)");
  const endInTz = formatInTimeZone(event.ends_at, tz, "PPP · p (zzz)");
  const startLocal = format(new Date(event.starts_at), "PPP · p");
  const isAttendee = myRsvp?.status === "going";
  const description =
    event.description?.slice(0, 160) ?? `Join ${event.hosts?.name ?? "this host"} on Gatherwave.`;

  return (
    <>
      <Helmet>
        <title>{event.title} — Gatherwave</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={event.title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        {event.cover_image_url && (
          <meta property="og:image" content={event.cover_image_url} />
        )}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={event.title} />
        <meta name="twitter:description" content={description} />
        {event.cover_image_url && (
          <meta name="twitter:image" content={event.cover_image_url} />
        )}
      </Helmet>

      <main className="mx-auto max-w-4xl px-4 py-10">
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-4">
          <Link to="/explore">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to explore
          </Link>
        </Button>
        {event.cover_image_url && (
          <div className="mb-6 aspect-[16/7] w-full overflow-hidden rounded-xl bg-muted">
            <img
              src={event.cover_image_url}
              alt={event.title}
              className="h-full w-full object-cover"
            />
          </div>
        )}

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {ended && <Badge variant="destructive">Ended</Badge>}
              {event.visibility === "unlisted" && (
                <Badge variant="outline">Unlisted</Badge>
              )}
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">{event.title}</h1>
            {event.hosts && (
              <p className="mt-1 text-muted-foreground">
                Hosted by{" "}
                <Link
                  to="/hosts/$slug"
                  params={{ slug: event.hosts.slug }}
                  className="text-primary hover:underline"
                >
                  {event.hosts.name}
                </Link>
              </p>
            )}
          </div>
          {user && (
            <ReportButton targetType="event" targetId={event.id} />
          )}
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardContent className="space-y-5 py-5">
              <div className="flex items-start gap-3">
                <CalendarDays className="mt-0.5 h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{startInTz}</p>
                  <p className="text-sm text-muted-foreground">to {endInTz}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Your local time: {startLocal}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                {event.venue_address ? (
                  <>
                    <MapPin className="mt-0.5 h-5 w-5 text-muted-foreground" />
                    <p>{event.venue_address}</p>
                  </>
                ) : (
                  <>
                    <Globe className="mt-0.5 h-5 w-5 text-muted-foreground" />
                    <div>
                      <p>Online event</p>
                      {isAttendee && event.online_url ? (
                        <a
                          href={event.online_url}
                          className="text-sm text-primary hover:underline"
                          target="_blank"
                          rel="noreferrer"
                        >
                          {event.online_url}
                        </a>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Link visible to attendees after RSVP
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>

              {event.description && (
                <div className="prose prose-sm max-w-none whitespace-pre-line text-foreground">
                  {event.description}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 py-5">
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>
                  <strong>{stats.going_count}</strong> going ·{" "}
                  <strong>{stats.waitlist_count}</strong> on waitlist
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Capacity: {event.capacity}</p>

              {ended ? (
                <p className="text-sm text-muted-foreground">
                  This event has ended. Feedback and gallery coming soon.
                </p>
              ) : !user ? (
                <Button asChild className="w-full">
                  <a href={`/auth?next=${encodeURIComponent(`/event/${event.id}`)}`}>
                    Sign in to RSVP
                  </a>
                </Button>
              ) : myRsvp?.status === "going" ? (
                <Badge className="w-full justify-center py-2 text-sm">You're going</Badge>
              ) : myRsvp?.status === "waitlist" ? (
                <Badge variant="secondary" className="w-full justify-center py-2 text-sm">
                  You're #{myRsvp.waitlist_position ?? "?"} on the waitlist
                </Badge>
              ) : (
                <Button className="w-full" onClick={handleRsvp} disabled={submitting}>
                  {submitting ? "RSVPing…" : "RSVP"}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {!ended && myRsvp && (
          <section className="mt-8">
            <h2 className="mb-3 text-lg font-semibold">Your ticket</h2>
            <TicketCard
              ticketCode={myRsvp.ticket_code}
              event={{
                id: event.id,
                title: event.title,
                description: event.description,
                starts_at: event.starts_at,
                ends_at: event.ends_at,
                venue_address: event.venue_address,
                online_url: event.online_url,
                formattedDateLine: `${startInTz} → ${endInTz}`,
              }}
              onCancel={handleCancel}
              cancelling={submitting}
            />
          </section>
        )}

        {ended && user && myRsvp?.status === "going" && (
          <section className="mt-8">
            <FeedbackSection eventId={event.id} userId={user.id} />
          </section>
        )}

        {ended && (
          <div className="mt-8">
            <GallerySection
              eventId={event.id}
              userId={user?.id ?? null}
              canUpload={!!user && myRsvp?.status === "going"}
            />
          </div>
        )}
      </main>
    </>
  );
}