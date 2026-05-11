import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { slugify } from "@/lib/slug";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/become-host")({
  component: () => (
    <ProtectedRoute>
      <BecomeHostPage />
    </ProtectedRoute>
  ),
});

const schema = z.object({
  name: z.string().trim().min(2, "Name is required").max(80),
  slug: z
    .string()
    .trim()
    .min(2, "Slug is required")
    .max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers, hyphens"),
  bio: z.string().trim().max(500).optional().or(z.literal("")),
  contact_email: z.string().trim().email("Valid email required"),
});

function BecomeHostPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [bio, setBio] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user?.email && !contactEmail) setContactEmail(user.email);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  useEffect(() => {
    if (!slugTouched) setSlug(slugify(name));
  }, [name, slugTouched]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const parsed = schema.safeParse({ name, slug, bio, contact_email: contactEmail });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        errs[i.path.join(".")] = i.message;
      });
      setErrors(errs);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      // Check slug uniqueness
      const { data: existing } = await supabase
        .from("hosts")
        .select("id")
        .eq("slug", parsed.data.slug)
        .maybeSingle();
      if (existing) {
        setErrors({ slug: "That slug is already taken" });
        setSubmitting(false);
        return;
      }

      let logo_url: string | null = null;
      if (logoFile) {
        const ext = logoFile.name.split(".").pop() ?? "png";
        const path = `${user.id}/${parsed.data.slug}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("host-logos")
          .upload(path, logoFile, { upsert: true, contentType: logoFile.type });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("host-logos").getPublicUrl(path);
        logo_url = pub.publicUrl;
      }

      const { error: insErr } = await supabase.from("hosts").insert({
        name: parsed.data.name,
        slug: parsed.data.slug,
        bio: parsed.data.bio || null,
        contact_email: parsed.data.contact_email,
        logo_url,
        created_by: user.id,
      });
      if (insErr) throw insErr;

      toast.success("Host created");
      navigate({ to: "/hosts/$slug", params: { slug: parsed.data.slug } });
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to create host");
      setSubmitting(false);
    }
  }

  return (
    <>
      <Helmet>
        <title>Become a Host — Gatherwave</title>
        <meta name="description" content="Create your host profile and start publishing events." />
      </Helmet>
      <main className="mx-auto max-w-2xl px-4 py-10">
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-4">
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to home
          </Link>
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Become a Host</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name">Host name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Acme Events"
                />
                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(e.target.value);
                  }}
                  placeholder="acme-events"
                />
                {errors.slug && <p className="text-sm text-destructive">{errors.slug}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="logo">Logo</Label>
                <Input
                  id="logo"
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Short bio</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="What kind of events do you host?"
                  rows={4}
                />
                {errors.bio && <p className="text-sm text-destructive">{errors.bio}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_email">Contact email</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                />
                {errors.contact_email && (
                  <p className="text-sm text-destructive">{errors.contact_email}</p>
                )}
              </div>

              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "Creating…" : "Create host"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </>
  );
}