import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mail, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/hosts/$slug")({
  component: HostPage,
});

type Host = {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  logo_url: string | null;
  contact_email: string | null;
};

type EventCard = {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  starts_at: string;
  ends_at: string;
  venue_address: string | null;
};

function HostPage() {
  const { slug } = Route.useParams();
  const [host, setHost] = useState<Host | null>(null);
  const [events, setEvents] = useState<EventCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: h } = await supabase
        .from("hosts")
        .select("id,name,slug,bio,logo_url")
        .eq("slug", slug)
        .maybeSingle();
      if (cancelled) return;
      if (!h) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      let email: string | null = null;
      const { data: sess } = await supabase.auth.getSession();
      if (sess.session) {
        const { data: he } = await supabase
          .from("hosts")
          .select("contact_email")
          .eq("id", (h as any).id)
          .maybeSingle();
        email = (he as any)?.contact_email ?? null;
      }
      setHost({ ...(h as any), contact_email: email });

      const { data: ev } = await supabase
        .from("events")
        .select("id,title,description,cover_image_url,starts_at,ends_at,venue_address")
        .eq("host_id", h.id)
        .eq("status", "published")
        .eq("visibility", "public")
        .gte("ends_at", new Date().toISOString())
        .order("starts_at", { ascending: true });
      if (!cancelled) {
        setEvents((ev as EventCard[]) ?? []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return <main className="mx-auto max-w-4xl px-4 py-10 text-muted-foreground">Loading…</main>;
  }

  if (notFound || !host) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-semibold">Host not found</h1>
        <p className="mt-2 text-muted-foreground">We couldn't find that host.</p>
      </main>
    );
  }

  const description =
    host.bio?.slice(0, 160) ?? `Events hosted by ${host.name} on Gatherwave.`;
  const initials = host.name.slice(0, 2).toUpperCase();

  return (
    <>
      <Helmet>
        <title>{host.name} — Gatherwave</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={host.name} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="profile" />
        {host.logo_url && <meta property="og:image" content={host.logo_url} />}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={host.name} />
        <meta name="twitter:description" content={description} />
      </Helmet>

      <main className="mx-auto max-w-4xl px-4 py-10">
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-4">
          <Link to="/explore">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to explore
          </Link>
        </Button>
        <header className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <Avatar className="h-20 w-20">
            {host.logo_url && <AvatarImage src={host.logo_url} alt={host.name} />}
            <AvatarFallback className="text-xl">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="text-3xl font-semibold tracking-tight">{host.name}</h1>
            {host.bio && (
              <p className="mt-2 text-muted-foreground whitespace-pre-line">{host.bio}</p>
            )}
            {host.contact_email && (
              <a
                href={`mailto:${host.contact_email}`}
                className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <Mail className="h-4 w-4" />
                {host.contact_email}
              </a>
            )}
          </div>
        </header>

        <section className="mt-10">
          <h2 className="text-xl font-semibold">Upcoming events</h2>
          {events.length === 0 ? (
            <p className="mt-3 text-muted-foreground">No upcoming events yet.</p>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {events.map((e) => (
                <Link
                  key={e.id}
                  to="/event/$eventId"
                  params={{ eventId: e.id }}
                  className="block"
                >
                  <Card className="h-full overflow-hidden transition-colors hover:border-primary">
                    {e.cover_image_url && (
                      <div className="aspect-video w-full overflow-hidden bg-muted">
                        <img
                          src={e.cover_image_url}
                          alt={e.title}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                    <CardHeader>
                      <CardTitle className="line-clamp-2">{e.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm text-muted-foreground">
                      <p>{format(new Date(e.starts_at), "PPP · p")}</p>
                      <p className="line-clamp-1">
                        {e.venue_address ?? "Online"}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}