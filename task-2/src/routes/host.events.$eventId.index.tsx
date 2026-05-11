import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";
import { format } from "date-fns";
import { Download, Pencil, ScanLine, ExternalLink, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ProtectedRoute } from "@/components/protected-route";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ModerationTab } from "@/components/moderation-tab";

export const Route = createFileRoute("/host/events/$eventId/")({
  component: () => (
    <ProtectedRoute>
      <EventDetailPage />
    </ProtectedRoute>
  ),
});

type EventRow = {
  id: string;
  host_id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  status: "draft" | "published";
  visibility: "public" | "unlisted";
  capacity: number;
};

type Stats = { going_count: number; waitlist_count: number; checked_in_count: number };

type Attendee = {
  id: string;
  ticket_code: string;
  status: "going" | "waitlist" | "cancelled";
  waitlist_position: number | null;
  created_at: string;
  user_id: string;
  checked_in: boolean;
  display_name: string | null;
  email: string | null;
};

type FeedbackRow = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  user_id: string;
  display_name: string | null;
};

function EventDetailPage() {
  const { eventId } = Route.useParams();
  const [event, setEvent] = useState<EventRow | null>(null);
  const [stats, setStats] = useState<Stats>({
    going_count: 0,
    waitlist_count: 0,
    checked_in_count: 0,
  });
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  async function load() {
    const { data: ev } = await supabase
      .from("events")
      .select("id, host_id, title, starts_at, ends_at, status, visibility, capacity")
      .eq("id", eventId)
      .maybeSingle();
    if (!ev) {
      setLoading(false);
      return;
    }
    setEvent(ev as EventRow);

    const { data: s } = await supabase
      .from("event_stats")
      .select("going_count, waitlist_count, checked_in_count")
      .eq("event_id", eventId)
      .maybeSingle();
    if (s) {
      setStats({
        going_count: Number((s as any).going_count ?? 0),
        waitlist_count: Number((s as any).waitlist_count ?? 0),
        checked_in_count: Number((s as any).checked_in_count ?? 0),
      });
    }

    const { data: rs } = await supabase
      .from("rsvps")
      .select("id, ticket_code, status, waitlist_position, created_at, user_id")
      .eq("event_id", eventId)
      .in("status", ["going", "waitlist", "cancelled"])
      .order("created_at", { ascending: true });
    const rsList = (rs as any[]) ?? [];
    const userIds = rsList.map((r) => r.user_id);
    const rsvpIds = rsList.map((r) => r.id);

    const [{ data: profs }, { data: cis }, { data: emails }] = await Promise.all([
      userIds.length
        ? supabase.from("profiles").select("id, display_name").in("id", userIds)
        : Promise.resolve({ data: [] as any[] }),
      rsvpIds.length
        ? supabase
            .from("check_ins")
            .select("rsvp_id, undone")
            .in("rsvp_id", rsvpIds)
        : Promise.resolve({ data: [] as any[] }),
      supabase.rpc("host_get_attendee_emails", { p_event_id: eventId }),
    ]);
    const profById = new Map((profs ?? []).map((p: any) => [p.id, p]));
    const emailById = new Map(
      ((emails as any[]) ?? []).map((e: any) => [e.user_id, e.email])
    );
    const checkedSet = new Set(
      ((cis as any[]) ?? []).filter((c) => !c.undone).map((c) => c.rsvp_id)
    );
    setAttendees(
      rsList.map((r) => ({
        id: r.id,
        ticket_code: r.ticket_code,
        status: r.status,
        waitlist_position: r.waitlist_position,
        created_at: r.created_at,
        user_id: r.user_id,
        checked_in: checkedSet.has(r.id),
        display_name: profById.get(r.user_id)?.display_name ?? null,
        email: emailById.get(r.user_id) ?? null,
      }))
    );

    const { data: fb } = await supabase
      .from("feedback")
      .select("id, rating, comment, created_at, user_id")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });
    const fbList = (fb as any[]) ?? [];
    const fbUsers = fbList.map((f) => f.user_id);
    let fbProfs = new Map<string, any>();
    if (fbUsers.length) {
      const { data: fps } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", fbUsers);
      fbProfs = new Map((fps ?? []).map((p: any) => [p.id, p]));
    }
    setFeedback(
      fbList.map((f) => ({
        id: f.id,
        rating: f.rating,
        comment: f.comment,
        created_at: f.created_at,
        user_id: f.user_id,
        display_name: fbProfs.get(f.user_id)?.display_name ?? null,
      }))
    );
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return attendees;
    return attendees.filter(
      (a) =>
        (a.display_name ?? "").toLowerCase().includes(q) ||
        (a.email ?? "").toLowerCase().includes(q) ||
        a.ticket_code.toLowerCase().includes(q)
    );
  }, [attendees, search]);

  function exportCsv() {
    const headers = [
      "name",
      "email",
      "status",
      "ticket_code",
      "waitlist_position",
      "checked_in",
      "rsvped_at",
    ];
    const rows = attendees.map((a) =>
      [
        a.display_name ?? "",
        a.email ?? "",
        a.status,
        a.ticket_code,
        a.waitlist_position ?? "",
        a.checked_in ? "yes" : "no",
        a.created_at,
      ]
        .map(csvCell)
        .join(",")
    );
    // Use CRLF (RFC 4180) and prepend "sep=," so Excel honors the comma
    // delimiter regardless of the user's locale (EU Excel defaults to ;).
    // UTF-8 BOM ensures Excel detects the encoding and shows accents.
    const csv = ["sep=,", headers.join(","), ...rows].join("\r\n") + "\r\n";
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeName = (event?.title ?? "event").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    a.download = `${safeName}-attendees.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded");
  }

  if (loading) {
    return <main className="mx-auto max-w-5xl px-4 py-10 text-muted-foreground">Loading…</main>;
  }
  if (!event) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Event not found</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link to="/host">Back to dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const avgRating =
    feedback.length > 0
      ? feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length
      : 0;

  return (
    <>
      <Helmet>
        <title>{event.title} — Host</title>
      </Helmet>
      <main className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/host">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to dashboard
          </Link>
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight truncate">{event.title}</h1>
            <p className="text-sm text-muted-foreground">
              {format(new Date(event.starts_at), "PPP · p")} →{" "}
              {format(new Date(event.ends_at), "p")}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge variant={event.status === "published" ? "default" : "secondary"}>
                {event.status}
              </Badge>
              <Badge variant="outline">{event.visibility}</Badge>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/event/$eventId" params={{ eventId: event.id }}>
                <ExternalLink className="h-4 w-4 mr-1" /> Public page
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link
                to="/host/events/$eventId/check-in"
                params={{ eventId: event.id }}
              >
                <ScanLine className="h-4 w-4 mr-1" /> Check-in
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link
                to="/host/events/$eventId/edit"
                params={{ eventId: event.id }}
              >
                <Pencil className="h-4 w-4 mr-1" /> Edit
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          <StatCard label="Going" value={stats.going_count} hint={`of ${event.capacity}`} />
          <StatCard label="Waitlist" value={stats.waitlist_count} />
          <StatCard label="Checked-in" value={stats.checked_in_count} />
          <StatCard
            label="Feedback"
            value={feedback.length}
            hint={feedback.length ? `★ ${avgRating.toFixed(1)} avg` : "no responses"}
          />
        </div>

        <Tabs defaultValue="attendees">
          <TabsList>
            <TabsTrigger value="attendees">Attendees ({attendees.length})</TabsTrigger>
            <TabsTrigger value="feedback">Feedback ({feedback.length})</TabsTrigger>
            <TabsTrigger value="moderation">Moderation</TabsTrigger>
          </TabsList>

          <TabsContent value="attendees" className="mt-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, email, or ticket"
                className="max-w-sm"
              />
              <Button variant="outline" size="sm" onClick={exportCsv}>
                <Download className="h-4 w-4 mr-1" /> Export CSV
              </Button>
            </div>
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 font-medium">Name</th>
                        <th className="px-3 py-2 font-medium">Email</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                        <th className="px-3 py-2 font-medium">Ticket</th>
                        <th className="px-3 py-2 font-medium">Checked-in</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-3 py-6 text-center text-muted-foreground"
                          >
                            No attendees yet.
                          </td>
                        </tr>
                      ) : (
                        filtered.map((a) => (
                          <tr key={a.id} className="border-t">
                            <td className="px-3 py-2">{a.display_name ?? "—"}</td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {a.email ?? "—"}
                            </td>
                            <td className="px-3 py-2">
                              <Badge
                                variant={
                                  a.status === "going"
                                    ? "default"
                                    : a.status === "waitlist"
                                      ? "secondary"
                                      : "outline"
                                }
                              >
                                {a.status}
                                {a.status === "waitlist" && a.waitlist_position
                                  ? ` #${a.waitlist_position}`
                                  : ""}
                              </Badge>
                            </td>
                            <td className="px-3 py-2 font-mono text-xs">{a.ticket_code}</td>
                            <td className="px-3 py-2">{a.checked_in ? "✓" : ""}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="feedback" className="mt-4">
            {feedback.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  No feedback yet. Attendees can leave a rating after the event ends.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {feedback.map((f) => (
                  <Card key={f.id}>
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">
                          {f.display_name ?? "Attendee"}
                        </div>
                        <div className="text-amber-500" aria-label={`${f.rating} stars`}>
                          {"★".repeat(f.rating)}
                          <span className="text-muted-foreground">
                            {"★".repeat(5 - f.rating)}
                          </span>
                        </div>
                      </div>
                      {f.comment && (
                        <p className="mt-2 text-sm whitespace-pre-line">{f.comment}</p>
                      )}
                      <p className="mt-2 text-xs text-muted-foreground">
                        {format(new Date(f.created_at), "PPp")}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="moderation" className="mt-4">
            <ModerationTab eventId={event.id} />
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-semibold">{value}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}

function csvCell(v: string | number) {
  const s = String(v ?? "");
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  if (/[",\n]/.test(safe)) return `"${safe.replace(/"/g, '""')}"`;
  return safe;
}