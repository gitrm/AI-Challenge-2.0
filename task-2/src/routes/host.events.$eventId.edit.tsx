import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ProtectedRoute } from "@/components/protected-route";
import { EventEditor } from "@/components/event-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/host/events/$eventId/edit")({
  component: () => (
    <ProtectedRoute>
      <EditEventPage />
    </ProtectedRoute>
  ),
});

function EditEventPage() {
  const { eventId } = Route.useParams();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .maybeSingle();
      if (cancelled) return;
      if (!data) setNotFound(true);
      else {
        const { data: url } = await supabase.rpc("host_get_event_online_url", {
          p_event_id: eventId,
        });
        setEvent({ ...data, online_url: typeof url === "string" ? url : null });
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  if (loading) {
    return <main className="mx-auto max-w-3xl px-4 py-10 text-muted-foreground">Loading…</main>;
  }
  if (notFound || !event) {
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

  return (
    <>
      <Helmet>
        <title>Edit event — Gatherwave</title>
      </Helmet>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-4">
          <Link to="/host/events/$eventId" params={{ eventId }}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to event
          </Link>
        </Button>
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">Edit event</h1>
        <EventEditor hostId={event.host_id} initial={event} />
      </main>
    </>
  );
}