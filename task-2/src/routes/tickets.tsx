import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";
import { QRCodeSVG } from "qrcode.react";
import { formatInTimeZone } from "date-fns-tz";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/tickets")({
  component: () => (
    <ProtectedRoute>
      <TicketsPage />
    </ProtectedRoute>
  ),
});

type Row = {
  id: string;
  status: "going" | "waitlist";
  ticket_code: string;
  waitlist_position: number | null;
  events: {
    id: string;
    title: string;
    starts_at: string;
    ends_at: string;
    time_zone: string;
    venue_address: string | null;
    online_url: string | null;
  } | null;
};

function TicketsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const prevStatusRef = useRef<Record<string, "going" | "waitlist">>({});

  const refresh = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("rsvps")
      .select(
        "id,status,ticket_code,waitlist_position,events(id,title,starts_at,ends_at,time_zone,venue_address)"
      )
      .eq("user_id", user.id)
      .in("status", ["going", "waitlist"])
      .order("created_at", { ascending: false });
    const list = ((data ?? []) as unknown as Row[]).filter(
      (r) => r.events && new Date(r.events.ends_at).getTime() >= Date.now()
    );

    // Hydrate online_url for going attendees via attendee-only RPC
    await Promise.all(
      list.map(async (r) => {
        if (r.status !== "going" || !r.events || r.events.venue_address) return;
        const { data: url } = await supabase.rpc("get_event_online_url", {
          p_event_id: r.events.id,
        });
        if (typeof url === "string" && url.length > 0) {
          r.events.online_url = url;
        }
      })
    );

    // Detect promotion via diff
    const prev = prevStatusRef.current;
    list.forEach((r) => {
      if (prev[r.id] === "waitlist" && r.status === "going") {
        toast.success(`Promoted from waitlist for ${r.events?.title ?? "event"}`);
      }
    });
    prevStatusRef.current = Object.fromEntries(list.map((r) => [r.id, r.status]));

    setRows(list);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    refresh();
  }, [user, refresh]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`tickets:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rsvps",
          filter: `user_id=eq.${user.id}`,
        },
        () => refresh()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refresh]);

  return (
    <>
      <Helmet>
        <title>My tickets — Gatherwave</title>
      </Helmet>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">My tickets</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upcoming RSVPs and waitlist spots.
        </p>

        <div className="mt-6 space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                You don't have any upcoming tickets yet.{" "}
                <Link to="/explore" className="text-primary hover:underline">
                  Explore events
                </Link>
                .
              </CardContent>
            </Card>
          ) : (
            rows.map((r) => {
              const ev = r.events!;
              const dateLine = formatInTimeZone(
                ev.starts_at,
                ev.time_zone || "UTC",
                "PPP · p (zzz)"
              );
              return (
                <Card key={r.id}>
                  <CardContent className="flex items-center gap-4 py-4">
                    <div className="rounded border border-border bg-white p-1.5">
                      <QRCodeSVG value={r.ticket_code} size={64} includeMargin={false} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        to="/event/$eventId"
                        params={{ eventId: ev.id }}
                        className="font-medium hover:underline"
                      >
                        {ev.title}
                      </Link>
                      <p className="text-sm text-muted-foreground">{dateLine}</p>
                      <p className="mt-1 font-mono text-sm tracking-widest">
                        {r.ticket_code}
                      </p>
                    </div>
                    {r.status === "going" ? (
                      <Badge>Going</Badge>
                    ) : (
                      <Badge variant="secondary">
                        Waitlist #{r.waitlist_position ?? "?"}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </main>
    </>
  );
}