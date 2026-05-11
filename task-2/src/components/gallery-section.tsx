import { useCallback, useEffect, useRef, useState } from "react";
import { Upload, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ReportButton } from "@/components/report-button";
import { extractGalleryPath, getGallerySignedUrls } from "@/lib/gallery-url";

type Photo = {
  id: string;
  image_url: string;
  status: "pending" | "approved" | "hidden";
  user_id: string;
  created_at: string;
};

type Props = {
  eventId: string;
  userId: string | null;
  canUpload: boolean;
};

export function GallerySection({ eventId, userId, canUpload }: Props) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [signed, setSigned] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("gallery_photos")
      .select("id, image_url, status, user_id, created_at")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });
    const list = (data as Photo[]) ?? [];
    setPhotos(list);
    const urls = await getGallerySignedUrls(list.map((p) => p.image_url));
    setSigned(urls);
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !userId) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Max 10MB per photo");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${eventId}/${userId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("gallery")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from("gallery_photos").insert({
        event_id: eventId,
        user_id: userId,
        image_url: path,
        status: "pending",
      });
      if (insErr) throw insErr;
      toast.success("Uploaded — pending host approval");
      await load();
    } catch (err: any) {
      toast.error(err?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Gallery</h2>
        {canUpload && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFile}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="h-4 w-4 mr-1" />
              {uploading ? "Uploading…" : "Add photo"}
            </Button>
          </>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : photos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
            <ImageIcon className="h-8 w-8" />
            <p className="text-sm">No photos yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {photos.map((p) => {
            const mine = p.user_id === userId;
            const visible = p.status === "approved" || mine;
            if (!visible) return null;
            const src = signed[p.image_url];
            if (!src) return null;
            return (
              <div
                key={p.id}
                className="group relative overflow-hidden rounded-lg border bg-muted"
              >
                <img
                  src={src}
                  alt="Event photo"
                  loading="lazy"
                  className="aspect-square w-full object-cover"
                />
                {p.status !== "approved" && (
                  <Badge
                    variant="secondary"
                    className="absolute left-1.5 top-1.5 text-[10px]"
                  >
                    {p.status}
                  </Badge>
                )}
                {!mine && p.status === "approved" && (
                  <div className="absolute right-1 top-1 opacity-0 transition group-hover:opacity-100">
                    <ReportButton
                      targetType="photo"
                      targetId={p.id}
                      label=""
                      variant="secondary"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}