import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { Check, EyeOff, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getGallerySignedUrls } from "@/lib/gallery-url";

type Photo = {
  id: string;
  image_url: string;
  status: "pending" | "approved" | "hidden";
  user_id: string;
  created_at: string;
  display_name: string | null;
};

type Report = {
  id: string;
  target_type: "event" | "photo";
  target_id: string;
  reason: string | null;
  status: "open" | "hidden" | "dismissed";
  created_at: string;
  reporter_id: string;
  reporter_name: string | null;
  photo_url: string | null;
};

export function ModerationTab({ eventId }: { eventId: string }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [signed, setSigned] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    const { data: ph } = await supabase
      .from("gallery_photos")
      .select("id, image_url, status, user_id, created_at")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });
    const phList = (ph as any[]) ?? [];

    const photoIds = phList.map((p) => p.id);
    const userIds = Array.from(new Set(phList.map((p) => p.user_id)));

    // reports targeting this event OR any of its photos
    const orFilter = [
      `and(target_type.eq.event,target_id.eq.${eventId})`,
      photoIds.length
        ? `and(target_type.eq.photo,target_id.in.(${photoIds.join(",")}))`
        : null,
    ]
      .filter(Boolean)
      .join(",");
    const { data: rp } = await supabase
      .from("reports")
      .select("id, target_type, target_id, reason, status, created_at, reporter_id")
      .or(orFilter)
      .order("created_at", { ascending: false });
    const rpList = (rp as any[]) ?? [];

    const allUserIds = Array.from(
      new Set([...userIds, ...rpList.map((r) => r.reporter_id)])
    );
    let profMap = new Map<string, any>();
    if (allUserIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", allUserIds);
      profMap = new Map((profs ?? []).map((p: any) => [p.id, p]));
    }
    const photoMap = new Map(phList.map((p) => [p.id, p]));

    setPhotos(
      phList.map((p) => ({
        ...p,
        display_name: profMap.get(p.user_id)?.display_name ?? null,
      }))
    );
    setReports(
      rpList.map((r) => ({
        id: r.id,
        target_type: r.target_type,
        target_id: r.target_id,
        reason: r.reason,
        status: r.status,
        created_at: r.created_at,
        reporter_id: r.reporter_id,
        reporter_name: profMap.get(r.reporter_id)?.display_name ?? null,
        photo_url:
          r.target_type === "photo" ? (photoMap.get(r.target_id)?.image_url ?? null) : null,
      }))
    );
    const allUrls = [
      ...phList.map((p: any) => p.image_url),
      ...rpList
        .map((r: any) => photoMap.get(r.target_id)?.image_url)
        .filter(Boolean),
    ];
    setSigned(await getGallerySignedUrls(allUrls));
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  async function setPhotoStatus(id: string, status: Photo["status"]) {
    const { error } = await supabase
      .from("gallery_photos")
      .update({ status })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(status === "approved" ? "Approved" : "Hidden");
    load();
  }

  async function setReportStatus(id: string, status: Report["status"]) {
    const { error } = await supabase.from("reports").update({ status }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Updated");
    load();
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  const pending = photos.filter((p) => p.status === "pending");
  const openReports = reports.filter((r) => r.status === "open");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Pending photos ({pending.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing waiting for review.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {pending.map((p) => (
                <div key={p.id} className="overflow-hidden rounded-lg border">
                  <img
                    src={signed[p.image_url] ?? ""}
                    alt="Pending photo"
                    className="aspect-square w-full object-cover"
                  />
                  <div className="space-y-1.5 p-2">
                    <p className="truncate text-xs text-muted-foreground">
                      {p.display_name ?? "User"}
                    </p>
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        className="h-7 flex-1"
                        onClick={() => setPhotoStatus(p.id, "approved")}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 flex-1"
                        onClick={() => setPhotoStatus(p.id, "hidden")}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Reports ({openReports.length} open · {reports.length} total)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reports yet.</p>
          ) : (
            <ul className="space-y-3">
              {reports.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-start gap-3 rounded-lg border p-3"
                >
                  {r.photo_url && (
                    <img
                      src={signed[r.photo_url] ?? ""}
                      alt="Reported photo"
                      className="h-16 w-16 rounded object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{r.target_type}</Badge>
                      <Badge
                        variant={r.status === "open" ? "default" : "secondary"}
                      >
                        {r.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(r.created_at), "PPp")} ·{" "}
                        {r.reporter_name ?? "Anon"}
                      </span>
                    </div>
                    {r.reason && (
                      <p className="mt-1 text-sm whitespace-pre-line">{r.reason}</p>
                    )}
                  </div>
                  {r.status === "open" && (
                    <div className="flex gap-1.5">
                      {r.target_type === "photo" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            await setPhotoStatus(r.target_id, "hidden");
                            await setReportStatus(r.id, "hidden");
                          }}
                        >
                          <EyeOff className="h-3.5 w-3.5 mr-1" /> Hide photo
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setReportStatus(r.id, "dismissed")}
                      >
                        Dismiss
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}