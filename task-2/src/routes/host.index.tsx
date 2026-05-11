import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";
import { format } from "date-fns";
import { ProtectedRoute } from "@/components/protected-route";
import { useHostMemberships } from "@/hooks/use-host-memberships";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/host/")({
  component: () => (
    <ProtectedRoute>
      <HostDashboard />
    </ProtectedRoute>
  ),
});

type EventRow = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  status: "draft" | "published";
  visibility: "public" | "unlisted";
};

type Stats = {
  going_count: number;
  waitlist_count: number;
  checked_in_count: number;
};

function HostDashboard() {
  const { memberships, loading, activeHostId, setActiveHostId } = useHostMemberships();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [stats, setStats] = useState<Record<string, Stats>>({});
  const [eventsLoading, setEventsLoading] = useState(false);

  useEffect(() => {
    if (!activeHostId) return;
    let cancelled = false;
    setEventsLoading(true);
    (async () => {
      const { data: ev } = await supabase
        .from("events")
        .select("id, title, starts_at, ends_at, status, visibility")
        .eq("host_id", activeHostId)
        .order("starts_at", { ascending: false });
      if (cancelled) return;
      const list = (ev as EventRow[]) ?? [];
      setEvents(list);

      if (list.length) {
        const { data: s } = await supabase
          .from("event_stats")
          .select("event_id, going_count, waitlist_count, checked_in_count")
          .in(
            "event_id",
            list.map((e) => e.id)
          );
        if (cancelled) return;
        const map: Record<string, Stats> = {};
        (s ?? []).forEach((r: any) => {
          map[r.event_id] = {
            going_count: Number(r.going_count ?? 0),
            waitlist_count: Number(r.waitlist_count ?? 0),
            checked_in_count: Number(r.checked_in_count ?? 0),
          };
        });
        setStats(map);
      } else {
        setStats({});
      }
      setEventsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [activeHostId]);

  if (loading) {
    return <main className="mx-auto max-w-5xl px-4 py-10 text-muted-foreground">Loading…</main>;
  }

  if (!memberships.length) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>You're not a host yet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Create a host profile to start publishing events.
            </p>
            <Button asChild>
              <Link to="/become-host">Become a Host</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const now = Date.now();
  const upcoming = events.filter((e) => new Date(e.ends_at).getTime() >= now);
  const past = events.filter((e) => new Date(e.ends_at).getTime() < now);

  return (
    <>
      <Helmet>
        <title>Host dashboard — Gatherwave</title>
      </Helmet>
      <main className="mx-auto max-w-5xl px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">Host dashboard</h1>
            {memberships.length > 1 && activeHostId && (
              <Select value={activeHostId} onValueChange={setActiveHostId}>
                <SelectTrigger className="w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {memberships.map((m) => (
                    <SelectItem key={m.host_id} value={m.host_id}>
                      {m.hosts.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to="/host/members">Members</Link>
            </Button>
            <Button asChild>
              <Link to="/host/events/new">New event</Link>
            </Button>
          </div>
        </div>

        <Tabs defaultValue="upcoming" className="mt-6">
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
            <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="upcoming" className="mt-4">
            <EventList
              events={upcoming}
              stats={stats}
              loading={eventsLoading}
              emptyText="No upcoming events. Create one to get started."
            />
          </TabsContent>
          <TabsContent value="past" className="mt-4">
            <EventList
              events={past}
              stats={stats}
              loading={eventsLoading}
              emptyText="No past events yet."
              showEnded
            />
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
}

function EventList({
  events,
  stats,
  loading,
  emptyText,
  showEnded,
}: {
  events: EventRow[];
  stats: Record<string, Stats>;
  loading: boolean;
  emptyText: string;
  showEnded?: boolean;
}) {
  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!events.length) return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  return (
    <div className="space-y-3">
      {events.map((e) => {
        const s = stats[e.id] ?? { going_count: 0, waitlist_count: 0, checked_in_count: 0 };
        return (
          <Card key={e.id}>
            <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <Link
                  to="/host/events/$eventId"
                  params={{ eventId: e.id }}
                  className="font-medium hover:underline"
                >
                  {e.title}
                </Link>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {format(new Date(e.starts_at), "PPP · p")}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge variant={e.status === "published" ? "default" : "secondary"}>
                    {e.status}
                  </Badge>
                  <Badge variant="outline">{e.visibility}</Badge>
                  {showEnded && <Badge variant="outline">Ended</Badge>}
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <Stat label="Going" value={s.going_count} />
                <Stat label="Waitlist" value={s.waitlist_count} />
                <Stat label="Checked-in" value={s.checked_in_count} />
                <Button asChild size="sm" variant="outline">
                  <Link
                    to="/host/events/$eventId/check-in"
                    params={{ eventId: e.id }}
                  >
                    Check-in
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="text-base font-semibold">{value}</div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}