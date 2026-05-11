import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [hostMembershipCount, setHostMembershipCount] = useState<number>(0);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setHostMembershipCount(0);
      return;
    }
    supabase
      .from("host_members")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .then(({ count }) => {
        if (!cancelled) setHostMembershipCount(count ?? 0);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  return {
    user,
    loading,
    isSignedIn: !!user,
    hasHostMembership: hostMembershipCount > 0,
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };
}
