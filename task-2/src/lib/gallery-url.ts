import { supabase } from "@/integrations/supabase/client";

export function extractGalleryPath(stored: string): string {
  const marker = "/gallery/";
  const idx = stored.indexOf(marker);
  if (idx >= 0) return stored.substring(idx + marker.length);
  return stored;
}

export async function getGallerySignedUrl(stored: string): Promise<string | null> {
  const path = extractGalleryPath(stored);
  const { data } = await supabase.storage
    .from("gallery")
    .createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

export async function getGallerySignedUrls(
  storedList: string[],
): Promise<Record<string, string>> {
  const uniq = Array.from(new Set(storedList));
  const entries = await Promise.all(
    uniq.map(async (s) => [s, await getGallerySignedUrl(s)] as const),
  );
  const out: Record<string, string> = {};
  for (const [k, v] of entries) if (v) out[k] = v;
  return out;
}