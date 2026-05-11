import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useHostMemberships } from "@/hooks/use-host-memberships";
import { ProtectedRoute } from "@/components/protected-route";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy, Trash2, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/host/members")({
  component: () => (
    <ProtectedRoute>
      <MembersPage />
    </ProtectedRoute>
  ),
});

type Role = "host" | "checker";

type Member = {
  id: string;
  user_id: string;
  role: Role;
  created_at: string;
  profiles?: { display_name: string | null; email: string | null } | null;
};

type Invite = {
  id: string;
  token: string;
  role: Role;
  created_at: string;
  expires_at: string;
  used_at: string | null;
};

function MembersPage() {
  const { user } = useAuth();
  const { memberships, loading, activeHostId, setActiveHostId } = useHostMemberships();
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [busy, setBusy] = useState(false);
  const [newRole, setNewRole] = useState<Role>("checker");

  async function refresh(hostId: string) {
    const [{ data: ms }, { data: inv }] = await Promise.all([
      supabase
        .from("host_members")
        .select("id, user_id, role, created_at, profiles:profiles!host_members_user_id_fkey(display_name, email)")
        .eq("host_id", hostId)
        .order("created_at", { ascending: true }),
      supabase
        .from("host_invites")
        .select("id, token, role, created_at, expires_at, used_at")
        .eq("host_id", hostId)
        .order("created_at", { ascending: false }),
    ]);
    // Fallback: profiles join may fail if FK alias not present; fetch separately
    let memberRows = (ms as any[]) ?? [];
    if (memberRows.length && !memberRows[0]?.profiles) {
      const ids = memberRows.map((m) => m.user_id);
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name, email")
        .in("id", ids);
      const byId = new Map((profs ?? []).map((p: any) => [p.id, p]));
      memberRows = memberRows.map((m) => ({ ...m, profiles: byId.get(m.user_id) ?? null }));
    }
    setMembers(memberRows as Member[]);
    setInvites((inv as Invite[]) ?? []);
  }

  useEffect(() => {
    if (!activeHostId) return;
    refresh(activeHostId);
  }, [activeHostId]);

  async function createInvite() {
    if (!activeHostId || !user) return;
    setBusy(true);
    const { error } = await supabase.from("host_invites").insert({
      host_id: activeHostId,
      role: newRole,
      created_by: user.id,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Invite created");
    refresh(activeHostId);
  }

  async function revokeInvite(id: string) {
    if (!activeHostId) return;
    const { error } = await supabase.from("host_invites").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Invite revoked");
    refresh(activeHostId);
  }

  async function removeMember(m: Member) {
    if (!activeHostId) return;
    if (m.user_id === user?.id) {
      toast.error("You cannot remove yourself");
      return;
    }
    if (!confirm(`Remove ${m.profiles?.display_name ?? m.profiles?.email ?? "this member"}?`))
      return;
    const { error } = await supabase.from("host_members").delete().eq("id", m.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Member removed");
    refresh(activeHostId);
  }

  function inviteUrl(token: string) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/invite/${token}`;
  }

  async function copyLink(token: string) {
    try {
      await navigator.clipboard.writeText(inviteUrl(token));
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy");
    }
  }

  if (loading) {
    return <main className="mx-auto max-w-4xl px-4 py-10 text-muted-foreground">Loading…</main>;
  }
  if (!memberships.length) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>You're not a host yet</CardTitle>
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

  const pending = invites.filter((i) => !i.used_at && new Date(i.expires_at) > new Date());
  const expired = invites.filter((i) => i.used_at || new Date(i.expires_at) <= new Date());

  return (
    <>
      <Helmet>
        <title>Members — Gatherwave</title>
      </Helmet>
      <main className="mx-auto max-w-4xl px-4 py-10 space-y-6">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/host">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to dashboard
          </Link>
        </Button>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">Members</h1>
            {memberships.length > 1 && activeHostId && (
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
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create invite link</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Role</label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as Role)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="checker">Checker</SelectItem>
                  <SelectItem value="host">Host</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={createInvite} disabled={busy}>
              Generate invite
            </Button>
            <p className="text-xs text-muted-foreground">Invites expire after 30 days.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending invites ({pending.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {pending.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending invites.</p>
            ) : (
              <ul className="divide-y">
                {pending.map((i) => (
                  <li key={i.id} className="flex flex-wrap items-center gap-3 py-3">
                    <Badge variant="secondary">{i.role}</Badge>
                    <code className="flex-1 truncate text-xs text-muted-foreground">
                      {inviteUrl(i.token)}
                    </code>
                    <span className="text-xs text-muted-foreground">
                      expires {format(new Date(i.expires_at), "PP")}
                    </span>
                    <Button size="sm" variant="outline" onClick={() => copyLink(i.token)}>
                      <Copy className="h-3.5 w-3.5 mr-1" /> Copy
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => revokeInvite(i.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team ({members.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {members.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">
                      {m.profiles?.display_name ?? m.profiles?.email ?? m.user_id}
                      {m.user_id === user?.id && (
                        <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                      )}
                    </div>
                    {m.profiles?.email && (
                      <div className="text-xs text-muted-foreground truncate">
                        {m.profiles.email}
                      </div>
                    )}
                  </div>
                  <Badge variant={m.role === "host" ? "default" : "secondary"}>{m.role}</Badge>
                  {m.user_id !== user?.id && (
                    <Button size="sm" variant="ghost" onClick={() => removeMember(m)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {expired.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Past invites ({expired.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y text-sm">
                {expired.map((i) => (
                  <li key={i.id} className="flex items-center gap-3 py-2">
                    <Badge variant="outline">{i.role}</Badge>
                    <span className="text-muted-foreground">
                      {i.used_at ? "used" : "expired"} ·{" "}
                      {format(new Date(i.used_at ?? i.expires_at), "PP")}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </main>
    </>
  );
}