import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/invite/$token")({
  component: InvitePage,
});

function InvitePage() {
  const { token } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"idle" | "redeeming" | "done" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    if (loading || !user || status !== "idle") return;
    setStatus("redeeming");
    (async () => {
      const { data, error } = await supabase.rpc("redeem_invite", { p_token: token });
      if (error) {
        setStatus("error");
        setMessage(error.message);
        return;
      }
      setStatus("done");
      toast.success("Invite accepted");
      const hostId = (data as any)?.host_id;
      if (hostId && typeof window !== "undefined") {
        window.localStorage.setItem("eventr.activeHostId", hostId);
      }
      setTimeout(() => navigate({ to: "/host" }), 800);
    })();
  }, [loading, user, token, status, navigate]);

  return (
    <>
      <Helmet>
        <title>Accept invite — Gatherwave</title>
      </Helmet>
      <main className="mx-auto max-w-md px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle>Accept invite</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading && <p className="text-sm text-muted-foreground">Checking session…</p>}
            {!loading && !user && (
              <>
                <p className="text-sm text-muted-foreground">
                  Sign in to accept this invite. We'll bring you back here.
                </p>
                <Button asChild>
                  <Link
                    to="/auth"
                    search={{ next: `/invite/${token}` }}
                  >
                    Sign in
                  </Link>
                </Button>
              </>
            )}
            {user && status === "redeeming" && (
              <p className="text-sm text-muted-foreground">Accepting invite…</p>
            )}
            {user && status === "done" && (
              <p className="text-sm">You're in! Redirecting to your host dashboard…</p>
            )}
            {user && status === "error" && (
              <>
                <p className="text-sm text-destructive">{message || "This invite is invalid or expired."}</p>
                <Button asChild variant="outline">
                  <Link to="/">Go home</Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}