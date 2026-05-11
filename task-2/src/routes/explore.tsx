import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";
import { format } from "date-fns";
import { Search, MapPin, Globe, CalendarDays, CalendarIcon, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/explore")({
  component: ExplorePage,
});

type EventCard = {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  starts_at: string;
  ends_at: string;
  venue_address: string | null;
};

function useDebounced<T>(value: T, delay = 250): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

function ExplorePage() {
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);
  const [includePast, setIncludePast] = useState(false);
  const [events, setEvents] = useState<EventCard[]>([]);
  const [loading, setLoading] = useState(true);

  const debSearch = useDebounced(search);
  const debLocation = useDebounced(location);
  const from = fromDate ? format(fromDate, "yyyy-MM-dd") : "";
  const to = toDate ? format(toDate, "yyyy-MM-dd") : "";

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      let q = supabase
        .from("events")
        .select(
          "id,title,description,cover_image_url,starts_at,ends_at,venue_address"
        )
        .eq("status", "published")
        .eq("visibility", "public")
        .order("starts_at", { ascending: true })
        .limit(60);

      if (!includePast) {
        q = q.gte("starts_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString());
      }
      if (from) q = q.gte("starts_at", new Date(from).toISOString());
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        q = q.lte("starts_at", end.toISOString());
      }
      if (debSearch.trim()) {
        const term = `%${debSearch.trim()}%`;
        q = q.or(`title.ilike.${term},description.ilike.${term}`);
      }
      if (debLocation.trim()) {
        q = q.ilike("venue_address", `%${debLocation.trim()}%`);
      }

      const { data } = await q;
      if (!cancelled) {
        setEvents((data as EventCard[]) ?? []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debSearch, debLocation, from, to, includePast]);

  const now = useMemo(() => Date.now(), [events]);

  return (
    <>
      <Helmet>
        <title>Explore events — Gatherwave</title>
        <meta
          name="description"
          content="Browse upcoming community events and RSVP in one tap."
        />
      </Helmet>

      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Explore events</h1>

        <div className="mt-6 grid gap-3 md:grid-cols-[2fr_1fr_1fr_1fr_auto]">
          <div className="space-y-1.5">
            <Label htmlFor="q">Search</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="q"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Title or description"
                className="pl-8"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="loc">Location</Label>
            <Input
              id="loc"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City or venue"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="from">From</Label>
            <DateField date={fromDate} onChange={setFromDate} placeholder="Any date" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="to">To</Label>
            <DateField date={toDate} onChange={setToDate} placeholder="Any date" />
          </div>
          <div className="flex items-end gap-2 pb-1.5">
            <Switch
              id="past"
              checked={includePast}
              onCheckedChange={setIncludePast}
            />
            <Label htmlFor="past" className="font-normal">
              Include past
            </Label>
          </div>
        </div>

        <section className="mt-8">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-72 animate-pulse rounded-lg border bg-muted/40"
                />
              ))}
            </div>
          ) : events.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                No events match your filters. Try clearing them.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((e) => {
                const ended = new Date(e.ends_at).getTime() < now;
                const isOnline = !e.venue_address;
                return (
                  <Link
                    key={e.id}
                    to="/event/$eventId"
                    params={{ eventId: e.id }}
                    className="block"
                  >
                    <Card className="h-full overflow-hidden transition-colors hover:border-primary">
                      {e.cover_image_url ? (
                        <div className="aspect-video w-full overflow-hidden bg-muted">
                          <img
                            src={e.cover_image_url}
                            alt={e.title}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex aspect-video w-full items-center justify-center bg-muted">
                          <CalendarDays className="h-10 w-10 text-muted-foreground/40" />
                        </div>
                      )}
                      <CardHeader className="pb-2">
                        <div className="flex flex-wrap gap-1.5">
                          {ended && <Badge variant="destructive">Ended</Badge>}
                          {isOnline && <Badge variant="secondary">Online</Badge>}
                        </div>
                        <CardTitle className="line-clamp-2 mt-1">{e.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-1 text-sm text-muted-foreground">
                        <p>{format(new Date(e.starts_at), "PPP · p")}</p>
                        <p className="flex items-center gap-1.5 line-clamp-1">
                          {isOnline ? (
                            <Globe className="h-3.5 w-3.5" />
                          ) : (
                            <MapPin className="h-3.5 w-3.5" />
                          )}
                          {e.venue_address ?? (isOnline ? "Online" : "")}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </>
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
              "w-full justify-start pr-8 text-left font-normal",
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