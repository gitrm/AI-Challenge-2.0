import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type EventRow = {
  id: string;
  host_id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  time_zone: string;
  venue_address: string | null;
  online_url: string | null;
  capacity: number;
  cover_image_url: string | null;
  visibility: "public" | "unlisted";
  status: "draft" | "published";
  is_paid: boolean;
};

function browserTz(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function listTimeZones(): string[] {
  const anyIntl = Intl as unknown as { supportedValuesOf?: (k: string) => string[] };
  if (typeof anyIntl.supportedValuesOf === "function") {
    return anyIntl.supportedValuesOf("timeZone");
  }
  return ["UTC", browserTz()];
}

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

const schema = z
  .object({
    title: z.string().trim().min(1, "Title is required"),
    description: z.string().optional(),
    starts_at: z.string().min(1, "Start required"),
    ends_at: z.string().min(1, "End required"),
    time_zone: z.string().min(1),
    venue_address: z.string().optional(),
    online_url: z
      .string()
      .optional()
      .refine((v) => !v || /^https?:\/\//i.test(v), "Must be a valid URL"),
    capacity: z.coerce.number().int().positive("Capacity must be > 0"),
    visibility: z.enum(["public", "unlisted"]),
  })
  .refine((v) => v.venue_address?.trim() || v.online_url?.trim(), {
    message: "Provide a venue address or an online URL",
    path: ["venue_address"],
  })
  .refine(
    (v) => {
      const s = new Date(v.starts_at).getTime();
      const e = new Date(v.ends_at).getTime();
      return !isNaN(s) && !isNaN(e) && e > s;
    },
    { message: "End must be after start", path: ["ends_at"] }
  );

export function EventEditor({
  hostId,
  initial,
}: {
  hostId: string;
  initial?: EventRow | null;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isEdit = !!initial;

  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [startsAt, setStartsAt] = useState(toLocalInput(initial?.starts_at));
  const [endsAt, setEndsAt] = useState(toLocalInput(initial?.ends_at));
  const [timeZone, setTimeZone] = useState(initial?.time_zone ?? browserTz());
  const [venueAddress, setVenueAddress] = useState(initial?.venue_address ?? "");
  const [onlineUrl, setOnlineUrl] = useState(initial?.online_url ?? "");
  const [capacity, setCapacity] = useState<string>(
    initial?.capacity ? String(initial.capacity) : "50"
  );
  const [visibility, setVisibility] = useState<"public" | "unlisted">(
    initial?.visibility ?? "public"
  );
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(initial?.cover_image_url ?? null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const tzList = useMemo(() => listTimeZones(), []);

  useEffect(() => {
    if (initial) {
      setTitle(initial.title);
      setDescription(initial.description ?? "");
      setStartsAt(toLocalInput(initial.starts_at));
      setEndsAt(toLocalInput(initial.ends_at));
      setTimeZone(initial.time_zone);
      setVenueAddress(initial.venue_address ?? "");
      setOnlineUrl(initial.online_url ?? "");
      setCapacity(String(initial.capacity));
      setVisibility(initial.visibility);
      setCoverUrl(initial.cover_image_url);
    }
  }, [initial?.id]);

  async function uploadCoverIfNeeded(): Promise<string | null> {
    if (!coverFile || !user) return coverUrl;
    const ext = coverFile.name.split(".").pop() ?? "jpg";
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("event-covers")
      .upload(path, coverFile, { upsert: true, contentType: coverFile.type });
    if (error) throw error;
    const { data } = supabase.storage.from("event-covers").getPublicUrl(path);
    return data.publicUrl;
  }

  function validate() {
    const parsed = schema.safeParse({
      title,
      description,
      starts_at: fromLocalInput(startsAt) ?? "",
      ends_at: fromLocalInput(endsAt) ?? "",
      time_zone: timeZone,
      venue_address: venueAddress,
      online_url: onlineUrl,
      capacity,
      visibility,
    });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        errs[i.path.join(".")] = i.message;
      });
      setErrors(errs);
      return null;
    }
    setErrors({});
    return parsed.data;
  }

  async function save(targetStatus: "draft" | "published") {
    const data = validate();
    if (!data) return;
    if (!user) return;
    setSubmitting(true);
    try {
      const cover = await uploadCoverIfNeeded();
      const payload = {
        host_id: hostId,
        title: data.title,
        description: data.description || null,
        starts_at: data.starts_at,
        ends_at: data.ends_at,
        time_zone: data.time_zone,
        venue_address: data.venue_address?.trim() || null,
        online_url: data.online_url?.trim() || null,
        capacity: data.capacity,
        visibility: data.visibility,
        cover_image_url: cover,
        status: targetStatus,
        is_paid: false,
      };
      if (isEdit && initial) {
        const { error } = await supabase.from("events").update(payload).eq("id", initial.id);
        if (error) throw error;
        toast.success(targetStatus === "published" ? "Event published" : "Event saved");
      } else {
        const { data: created, error } = await supabase
          .from("events")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        toast.success(targetStatus === "published" ? "Event published" : "Draft saved");
        navigate({
          to: "/host/events/$eventId/edit",
          params: { eventId: created.id },
        });
        return;
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to save event");
    } finally {
      setSubmitting(false);
    }
  }

  async function unpublish() {
    if (!isEdit || !initial) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("events")
        .update({ status: "draft" })
        .eq("id", initial.id);
      if (error) throw error;
      toast.success("Event unpublished");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function duplicate() {
    if (!isEdit || !initial) return;
    setSubmitting(true);
    try {
      const { data: created, error } = await supabase
        .from("events")
        .insert({
          host_id: initial.host_id,
          title: `${initial.title} (copy)`,
          description: initial.description,
          starts_at: initial.starts_at,
          ends_at: initial.ends_at,
          time_zone: initial.time_zone,
          venue_address: initial.venue_address,
          online_url: initial.online_url,
          capacity: initial.capacity,
          visibility: initial.visibility,
          cover_image_url: initial.cover_image_url,
          status: "draft",
          is_paid: false,
        })
        .select("id")
        .single();
      if (error) throw error;
      toast.success("Duplicated as draft");
      navigate({ to: "/host/events/$eventId/edit", params: { eventId: created.id } });
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to duplicate");
    } finally {
      setSubmitting(false);
    }
  }

  const currentStatus = initial?.status ?? "draft";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? "Edit event" : "New event"}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
            {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="starts_at">Starts</Label>
              <Input
                id="starts_at"
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
              {errors.starts_at && <p className="text-sm text-destructive">{errors.starts_at}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="ends_at">Ends</Label>
              <Input
                id="ends_at"
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
              />
              {errors.ends_at && <p className="text-sm text-destructive">{errors.ends_at}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Time zone</Label>
            <Select value={timeZone} onValueChange={setTimeZone}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {tzList.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="venue_address">Venue address</Label>
              <Input
                id="venue_address"
                value={venueAddress}
                onChange={(e) => setVenueAddress(e.target.value)}
                placeholder="123 Main St, City"
              />
              {errors.venue_address && (
                <p className="text-sm text-destructive">{errors.venue_address}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="online_url">Online URL</Label>
              <Input
                id="online_url"
                value={onlineUrl}
                onChange={(e) => setOnlineUrl(e.target.value)}
                placeholder="https://meet.example.com/abc"
              />
              {errors.online_url && (
                <p className="text-sm text-destructive">{errors.online_url}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="capacity">Capacity</Label>
              <Input
                id="capacity"
                type="number"
                min={1}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
              />
              {errors.capacity && <p className="text-sm text-destructive">{errors.capacity}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="cover">Cover image</Label>
              <Input
                id="cover"
                type="file"
                accept="image/*"
                onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
              />
              {coverUrl && !coverFile && (
                <img
                  src={coverUrl}
                  alt="Cover"
                  className="mt-2 h-24 w-auto rounded border border-border object-cover"
                />
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Visibility</Label>
            <RadioGroup
              value={visibility}
              onValueChange={(v) => setVisibility(v as "public" | "unlisted")}
              className="flex gap-6"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="public" id="vis-public" />
                <Label htmlFor="vis-public" className="font-normal">Public</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="unlisted" id="vis-unlisted" />
                <Label htmlFor="vis-unlisted" className="font-normal">Unlisted</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Pricing</Label>
            <div className="flex items-center gap-3">
              <span className="text-sm">Free</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Switch checked={false} disabled />
                  </span>
                </TooltipTrigger>
                <TooltipContent>Coming soon</TooltipContent>
              </Tooltip>
              <span className="text-sm text-muted-foreground">Paid</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              variant="outline"
              disabled={submitting}
              onClick={() => save("draft")}
            >
              Save Draft
            </Button>
            {currentStatus !== "published" ? (
              <Button disabled={submitting} onClick={() => save("published")}>
                Publish
              </Button>
            ) : (
              <>
                <Button disabled={submitting} onClick={() => save("published")}>
                  Save Changes
                </Button>
                <Button variant="secondary" disabled={submitting} onClick={unpublish}>
                  Unpublish
                </Button>
              </>
            )}
            {isEdit && (
              <Button variant="ghost" disabled={submitting} onClick={duplicate}>
                Duplicate
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}