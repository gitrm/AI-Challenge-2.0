import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { CalendarDays, MapPin, Globe, Sparkles, Ticket, ScanLine } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  component: Index,
});

type Featured = {
  id: string;
  title: string;
  cover_image_url: string | null;
  starts_at: string;
  venue_address: string | null;
};

function Index() {
  const [events, setEvents] = useState<Featured[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("events")
        .select("id,title,cover_image_url,starts_at,venue_address")
        .eq("status", "published")
        .eq("visibility", "public")
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(6);
      if (!cancelled) setEvents((data as Featured[]) ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/10 via-background to-background" />
        <div className="mx-auto flex max-w-4xl flex-col items-center px-4 py-20 text-center sm:py-28">
          <Badge variant="secondary" className="mb-4 gap-1.5">
            <Sparkles className="h-3 w-3" /> New on Gatherwave
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Find events worth showing up for.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            Discover community gatherings, grab a free ticket, and check in with a
            QR code at the door.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/explore">Explore events</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/become-host">Become a host</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Featured */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">
            Upcoming events
          </h2>
          <Link
            to="/explore"
            className="text-sm font-medium text-primary hover:underline"
          >
            See all →
          </Link>
        </div>

        {events === null ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-72 animate-pulse rounded-lg border bg-muted/40"
              />
            ))}
          </div>
        ) : events.length === 0 ? (
          <Card className="mt-6">
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No upcoming events yet — check back soon.
            </CardContent>
          </Card>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((e) => {
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
                      <div className="aspect-video overflow-hidden bg-muted">
                        <img
                          src={e.cover_image_url}
                          alt={e.title}
                          className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                        />
                      </div>
                    ) : (
                      <div className="flex aspect-video items-center justify-center bg-muted">
                        <CalendarDays className="h-10 w-10 text-muted-foreground/40" />
                      </div>
                    )}
                    <CardHeader className="pb-2">
                      <CardTitle className="line-clamp-2">{e.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm text-muted-foreground">
                      <p>{format(new Date(e.starts_at), "PPP · p")}</p>
                      <p className="flex items-center gap-1.5 line-clamp-1">
                        {isOnline ? (
                          <Globe className="h-3.5 w-3.5" />
                        ) : (
                          <MapPin className="h-3.5 w-3.5" />
                        )}
                        {e.venue_address ?? (isOnline ? "Online" : "TBA")}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* How it works */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-5xl px-4 py-14">
          <h2 className="text-center text-2xl font-semibold tracking-tight">
            How Gatherwave works
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            <Feature
              icon={<CalendarDays className="h-5 w-5" />}
              title="Discover"
              text="Browse upcoming community events near you or online."
            />
            <Feature
              icon={<Ticket className="h-5 w-5" />}
              title="RSVP"
              text="Grab a free ticket in one tap. Auto-waitlist if it's full."
            />
            <Feature
              icon={<ScanLine className="h-5 w-5" />}
              title="Check in"
              text="Show your QR at the door. Hosts scan and you're in."
            />
          </div>
        </div>
      </section>
    </main>
  );
}

function Feature({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mt-3 font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
