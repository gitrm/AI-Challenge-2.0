import { Navigate, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isSignedIn, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <Navigate
        to="/auth"
        search={{ next: location.pathname + location.searchStr }}
        replace
      />
    );
  }

  return <>{children}</>;
}
