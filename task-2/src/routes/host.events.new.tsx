import { createFileRoute, Link } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";
import { ArrowLeft } from "lucide-react";
import { ProtectedRoute } from "@/components/protected-route";
import { useHostMemberships } from "@/hooks/use-host-memberships";
import { EventEditor } from "@/components/event-editor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/host/events/new")({
  component: () => (
    <ProtectedRoute>
      <NewEventPage />
    </ProtectedRoute>
  ),
});

function NewEventPage() {
  const { memberships, loading, activeHostId, setActiveHostId } = useHostMemberships();

  if (loading) {
    return <main className="mx-auto max-w-3xl px-4 py-10 text-muted-foreground">Loading…</main>;
  }

  if (!memberships.length) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Become a host first</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/become-host">Become a Host</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <>
      <Helmet>
        <title>New event — Gatherwave</title>
      </Helmet>
      <main className="mx-auto max-w-3xl px-4 py-10 space-y-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/host">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to dashboard
          </Link>
        </Button>
        {memberships.length > 1 && activeHostId && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Host:</span>
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
          </div>
        )}
        {activeHostId && <EventEditor hostId={activeHostId} />}
      </main>
    </>
  );
}