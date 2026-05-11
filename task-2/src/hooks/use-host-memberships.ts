import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export type HostMembership = {
  host_id: string;
  role: string;
  hosts: { id: string; name: string; slug: string; logo_url: string | null };
};

const STORAGE_KEY = "eventr.activeHostId";

export function useHostMemberships() {
  const { user } = useAuth();
  const [memberships, setMemberships] = useState<HostMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeHostId, setActiveHostIdState] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setMemberships([]);
      setLoading(false);
      setActiveHostIdState(null);
      return;
    }
    setLoading(true);
    supabase
      .from("host_members")
      .select("host_id, role, hosts(id, name, slug, logo_url)")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (cancelled) return;
        const list = (data ?? []) as unknown as HostMembership[];
        setMemberships(list);
        const stored =
          typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
        const valid = list.find((m) => m.host_id === stored)?.host_id;
        setActiveHostIdState(valid ?? list[0]?.host_id ?? null);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  function setActiveHostId(id: string) {
    setActiveHostIdState(id);
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, id);
  }

  return { memberships, loading, activeHostId, setActiveHostId };
}