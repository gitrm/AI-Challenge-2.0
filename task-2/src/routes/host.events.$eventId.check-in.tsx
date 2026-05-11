import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";
import { format } from "date-fns";
import { toast } from "sonner";
import { CheckCircle2, Camera, CameraOff, Undo2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/components/protected-route";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/host/events/$eventId/check-in")({
  component: () => (
    <ProtectedRoute>
      <CheckInPage />
    </ProtectedRoute>
  ),
});

type EventInfo = {
  id: string;
  title: string;
  starts_at: string;
  host_id: string;
};

type RecentRow = {
  id: string;
  checked_in_at: string;
  undone: boolean;
  rsvp: {
    id: string;
    ticket_code: string;
    user_id: string;
    profiles?: { display_name: string | null; email: string | null } | null;
  };
};

function CheckInPage() {
  const { eventId } = Route.useParams();
  const { user } = useAuth();
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [recent, setRecent] = useState<RecentRow[]>([]);
  const [stats, setStats] = useState({ going: 0, checked_in: 0 });
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: ev } = await supabase
        .from("events")
        .select("id, title, starts_at, host_id")
        .eq("id", eventId)
        .maybeSingle();
      if (cancelled) return;
      if (!ev) {
        setAuthorized(false);
        return;
      }
      setEvent(ev as EventInfo);
      const { data: mem } = await supabase
        .from("host_members")
        .select("role")
        .eq("host_id", (ev as any).host_id)
        .eq("user_id", user?.id ?? "")
        .maybeSingle();
      setAuthorized(!!mem);
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId, user?.id]);

  async function loadRecent() {
    const { data } = await supabase
      .from("check_ins")
      .select(
        "id, checked_in_at, undone, rsvp:rsvps!check_ins_rsvp_id_fkey(id, ticket_code, user_id)"
      )
      .order("checked_in_at", { ascending: false })
      .limit(20);
    let rows = ((data as any[]) ?? []).filter((r) => r.rsvp);
    // Filter to this event
    if (rows.length) {
      const rsvpIds = rows.map((r) => r.rsvp.id);
      const { data: rsvps } = await supabase
        .from("rsvps")
        .select("id, event_id")
        .in("id", rsvpIds);
      const mine = new Set(
        (rsvps ?? []).filter((r: any) => r.event_id === eventId).map((r: any) => r.id)
      );
      rows = rows.filter((r) => mine.has(r.rsvp.id));
      const userIds = rows.map((r) => r.rsvp.user_id);
      if (userIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, display_name, email")
          .in("id", userIds);
        const byId = new Map((profs ?? []).map((p: any) => [p.id, p]));
        rows = rows.map((r) => ({
          ...r,
          rsvp: { ...r.rsvp, profiles: byId.get(r.rsvp.user_id) ?? null },
        }));
      }
    }
    setRecent(rows as RecentRow[]);

    const { data: s } = await supabase
      .from("event_stats")
      .select("going_count, checked_in_count")
      .eq("event_id", eventId)
      .maybeSingle();
    if (s) {
      setStats({
        going: Number((s as any).going_count ?? 0),
        checked_in: Number((s as any).checked_in_count ?? 0),
      });
    }
  }

  useEffect(() => {
    if (authorized) loadRecent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorized, eventId]);

  async function checkIn(rawCode: string) {
    const trimmed = rawCode.trim().toUpperCase();
    if (!trimmed || !user) return;
    setBusy(true);
    try {
      const { data: rsvp, error: rErr } = await supabase
        .from("rsvps")
        .select("id, status, user_id")
        .eq("event_id", eventId)
        .eq("ticket_code", trimmed)
        .maybeSingle();
      if (rErr || !rsvp) {
        toast.error("Ticket not found for this event");
        return;
      }
      if ((rsvp as any).status !== "going") {
        toast.error(`Ticket status is "${(rsvp as any).status}", cannot check in`);
        return;
      }
      const { data: existing } = await supabase
        .from("check_ins")
        .select("id, undone")
        .eq("rsvp_id", (rsvp as any).id)
        .eq("undone", false)
        .maybeSingle();
      if (existing) {
        toast.warning("Already checked in");
        return;
      }
      const { error: insErr } = await supabase.from("check_ins").insert({
        rsvp_id: (rsvp as any).id,
        checker_id: user.id,
      });
      if (insErr) {
        toast.error(insErr.message);
        return;
      }
      toast.success("Checked in");
      setCode("");
      inputRef.current?.focus();
      loadRecent();
    } finally {
      setBusy(false);
    }
  }

  async function undoCheckIn(id: string) {
    const { error } = await supabase
      .from("check_ins")
      .update({ undone: true })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Check-in undone");
    loadRecent();
  }

  async function startScanning() {
    const BD = (window as any).BarcodeDetector;
    if (!BD) {
      toast.error("Camera scanning not supported in this browser. Use manual entry.");
      return;
    }
    try {
      detectorRef.current = new BD({ formats: ["qr_code"] });
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not access camera");
    }
  }

  function stopScanning() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  }

  useEffect(() => {
    if (!scanning) return;
    let raf: number;
    let lastCode = "";
    let lastAt = 0;
    const tick = async () => {
      if (videoRef.current && detectorRef.current) {
        try {
          const codes = await detectorRef.current.detect(videoRef.current);
          const value = codes?.[0]?.rawValue as string | undefined;
          const now = Date.now();
          if (value && (value !== lastCode || now - lastAt > 3000)) {
            lastCode = value;
            lastAt = now;
            checkIn(value);
          }
        } catch {
          // ignore frame errors
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning]);

  useEffect(() => () => stopScanning(), []);

  if (authorized === null) {
    return <main className="mx-auto max-w-3xl px-4 py-10 text-muted-foreground">Loading…</main>;
  }
  if (!authorized) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Not authorized</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              You don't have check-in access for this event.
            </p>
            <Button asChild variant="outline">
              <Link to="/">Go home</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <>
      <Helmet>
        <title>Check-in — {event?.title ?? "Event"}</title>
      </Helmet>
      <main className="mx-auto max-w-3xl px-4 py-8 space-y-5">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/host/events/$eventId" params={{ eventId }}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to event
          </Link>
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Check-in</h1>
            {event && (
              <p className="text-sm text-muted-foreground">
                {event.title} · {format(new Date(event.starts_at), "PPP · p")}
              </p>
            )}
          </div>
          <div className="flex gap-3 text-sm">
            <div className="text-center">
              <div className="text-xl font-semibold">{stats.checked_in}</div>
              <div className="text-xs uppercase text-muted-foreground">Checked-in</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-semibold">{stats.going}</div>
              <div className="text-xs uppercase text-muted-foreground">Going</div>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Scan or enter ticket code</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                checkIn(code);
              }}
            >
              <Input
                ref={inputRef}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="ABCD1234"
                autoFocus
                className="font-mono uppercase tracking-widest"
              />
              <Button type="submit" disabled={busy || !code.trim()}>
                <CheckCircle2 className="h-4 w-4 mr-1" /> Check in
              </Button>
            </form>

            <div className="flex items-center gap-2">
              {!scanning ? (
                <Button variant="outline" size="sm" onClick={startScanning}>
                  <Camera className="h-4 w-4 mr-1" /> Scan with camera
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={stopScanning}>
                  <CameraOff className="h-4 w-4 mr-1" /> Stop scanning
                </Button>
              )}
            </div>

            {scanning && (
              <div className="overflow-hidden rounded-lg border bg-black">
                <video
                  ref={videoRef}
                  className="aspect-video w-full object-cover"
                  muted
                  playsInline
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent check-ins</CardTitle>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">No check-ins yet.</p>
            ) : (
              <ul className="divide-y">
                {recent.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">
                        {r.rsvp.profiles?.display_name ??
                          r.rsvp.profiles?.email ??
                          r.rsvp.user_id}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <span className="font-mono">{r.rsvp.ticket_code}</span> ·{" "}
                        {format(new Date(r.checked_in_at), "p")}
                      </div>
                    </div>
                    {r.undone ? (
                      <Badge variant="outline">undone</Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => undoCheckIn(r.id)}
                      >
                        <Undo2 className="h-3.5 w-3.5 mr-1" /> Undo
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}