import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";
import { format } from "date-fns";
import { Pencil, ScanLine, ExternalLink, CalendarIcon, X } from "lucide-react";
import { ProtectedRoute } from "@/components/protected-route";
import { useHostMemberships } from "@/hooks/use-host-memberships";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/events")({
  component: () => (
    <ProtectedRoute>
      <MyEventsPage />
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
};

type Stats = { going_count: number; waitlist_count: number; checked_in_count: number };

function MyEventsPage() {
  const { memberships, loading: membershipsLoading } = useHostMemberships();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [stats, setStats] = useState<Record<string, Stats>>({});
  const [loading, setLoading] = useState(false);
  const [hostFilter, setHostFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);

  const hostIds = useMemo(() => memberships.map((m) => m.host_id), [memberships]);
  const hostNameById = useMemo(
    () => Object.fromEntries(memberships.map((m) => [m.host_id, m.hosts.name])),
    [memberships]
  );
  const roleByHost = useMemo(
    () => Object.fromEntries(memberships.map((m) => [m.host_id, m.role])),
    [memberships]
  );

  useEffect(() => {
    if (!hostIds.length) {
      setEvents([]);
      setStats({});
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data: ev } = await supabase
        .from("events")
        .select("id, host_id, title, starts_at, ends_at, status, visibility")
        .in("host_id", hostIds)
        .order("starts_at", { ascending: false });
      if (cancelled) return;
      const list = (ev as EventRow[]) ?? [];
      setEvents(list);

      if (list.length) {
        const { data: s } = await supabase
          .from("event_stats")
          .select("event_id, going_count, waitlist_count, checked_in_count")
          .in("event_id", list.map((e) => e.id));
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
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [hostIds]);

  if (membershipsLoading) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10 text-muted-foreground">Loading…</main>
    );
  }

  if (!memberships.length) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>You're not on any host team yet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Become a host or accept an invite to manage events here.
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
  const q = search.trim().toLowerCase();
  const fromMs = fromDate ? new Date(fromDate).setHours(0, 0, 0, 0) : null;
  const toMs = toDate ? new Date(toDate).setHours(23, 59, 59, 999) : null;
  const filtered = events.filter((e) => {
    if (hostFilter !== "all" && e.host_id !== hostFilter) return false;
    if (q && !e.title.toLowerCase().includes(q)) return false;
    const startMs = new Date(e.starts_at).getTime();
    if (fromMs !== null && startMs < fromMs) return false;
    if (toMs !== null && startMs > toMs) return false;
    return true;
  });
  const upcoming = filtered.filter(
    (e) => e.status === "published" && new Date(e.ends_at).getTime() >= now
  );
  const past = filtered.filter(
    (e) => e.status === "published" && new Date(e.ends_at).getTime() < now
  );
  const drafts = filtered.filter((e) => e.status === "draft");

  return (
    <>
      <Helmet>
        <title>My Events — Gatherwave</title>
      </Helmet>
      <main className="mx-auto max-w-5xl px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">My Events</h1>
          <Button asChild>
            <Link to="/host/events/new">New event</Link>
          </Button>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          All events across the {memberships.length} host
          {memberships.length === 1 ? "" : "s"} you belong to.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title"
            className="max-w-xs"
          />
          {memberships.length > 1 && (
            <Select value={hostFilter} onValueChange={setHostFilter}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All hosts</SelectItem>
                {memberships.map((m) => (
                  <SelectItem key={m.host_id} value={m.host_id}>
                    {m.hosts.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <DateField date={fromDate} onChange={setFromDate} placeholder="From date" />
          <DateField date={toDate} onChange={setToDate} placeholder="To date" />
          {(fromDate || toDate || search || hostFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setFromDate(undefined);
                setToDate(undefined);
                setHostFilter("all");
              }}
            >
              Clear filters
            </Button>
          )}
        </div>

        <Tabs defaultValue="upcoming" className="mt-6">
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
            <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
            <TabsTrigger value="drafts">Drafts ({drafts.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="upcoming" className="mt-4">
            <EventList
              events={upcoming}
              stats={stats}
              hostNameById={hostNameById}
              roleByHost={roleByHost}
              loading={loading}
              emptyText="No upcoming events."
            />
          </TabsContent>
          <TabsContent value="past" className="mt-4">
            <EventList
              events={past}
              stats={stats}
              hostNameById={hostNameById}
              roleByHost={roleByHost}
              loading={loading}
              emptyText="No past events yet."
              showEnded
            />
          </TabsContent>
          <TabsContent value="drafts" className="mt-4">
            <EventList
              events={drafts}
              stats={stats}
              hostNameById={hostNameById}
              roleByHost={roleByHost}
              loading={loading}
              emptyText="No drafts."
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
  hostNameById,
  roleByHost,
  loading,
  emptyText,
  showEnded,
}: {
  events: EventRow[];
  stats: Record<string, Stats>;
  hostNameById: Record<string, string>;
  roleByHost: Record<string, string>;
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
        const isHost = roleByHost[e.host_id] === "host";
        return (
          <Card key={e.id}>
            <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <Link
                  to={isHost ? "/host/events/$eventId" : "/host/events/$eventId/check-in"}
                  params={{ eventId: e.id }}
                  className="font-medium hover:underline"
                >
                  {e.title}
                </Link>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {hostNameById[e.host_id] ?? "Host"} ·{" "}
                  {format(new Date(e.starts_at), "PPP · p")}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge variant={e.status === "published" ? "default" : "secondary"}>
                    {e.status}
                  </Badge>
                  <Badge variant="outline">{e.visibility}</Badge>
                  <Badge variant="outline" className="capitalize">
                    {roleByHost[e.host_id] ?? "member"}
                  </Badge>
                  {showEnded && <Badge variant="outline">Ended</Badge>}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <Stat label="Going" value={s.going_count} />
                <Stat label="Wait" value={s.waitlist_count} />
                <Stat label="In" value={s.checked_in_count} />
                <div className="flex gap-1.5">
                  {isHost && (
                    <Button asChild size="sm" variant="outline" title="Open public page">
                      <Link to="/event/$eventId" params={{ eventId: e.id }}>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  )}
                  <Button asChild size="sm" variant="outline" title="Check-in">
                    <Link
                      to="/host/events/$eventId/check-in"
                      params={{ eventId: e.id }}
                    >
                      <ScanLine className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                  {isHost && (
                    <Button asChild size="sm" title="Edit event">
                      <Link
                        to="/host/events/$eventId/edit"
                        params={{ eventId: e.id }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  )}
                </div>
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
      <div className="text-base font-semibold leading-none">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function DateField({
  date,
  onChange,
  placeholder,
}: {
  date: Date | undefined;
  onChange: (d: Date | undefined) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "w-44 justify-start pr-8 text-left font-normal",
              !date && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 opacity-60" />
            {date ? format(date, "PPP") : <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={onChange}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
      {date && (
        <button
          type="button"
          onClick={() => onChange(undefined)}
          aria-label="Clear date"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
