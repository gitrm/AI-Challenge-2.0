import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function FeedbackSection({
  eventId,
  userId,
}: {
  eventId: string;
  userId: string;
}) {
  const [existing, setExisting] = useState<{
    rating: number;
    comment: string | null;
  } | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [others, setOthers] = useState<
    Array<{
      id: string;
      rating: number;
      comment: string | null;
      created_at: string;
      display_name: string | null;
    }>
  >([]);

  async function loadFeedback() {
    const { data } = await supabase
      .from("feedback")
      .select("id, rating, comment, created_at, user_id")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });
    const rows = (data as any[]) ?? [];
    const mine = rows.find((r) => r.user_id === userId) ?? null;
    if (mine) {
      setExisting({ rating: mine.rating, comment: mine.comment });
      setRating(mine.rating);
      setComment(mine.comment ?? "");
    }
    const otherRows = rows.filter((r) => r.user_id !== userId);
    let nameMap = new Map<string, string | null>();
    if (otherRows.length) {
      const ids = Array.from(new Set(otherRows.map((r) => r.user_id)));
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", ids);
      nameMap = new Map(
        (profs ?? []).map((p: any) => [p.id, p.display_name ?? null])
      );
    }
    setOthers(
      otherRows.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        created_at: r.created_at,
        display_name: nameMap.get(r.user_id) ?? null,
      }))
    );
    setLoading(false);
  }

  useEffect(() => {
    loadFeedback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, userId]);

  async function submit() {
    if (rating < 1) {
      toast.error("Pick a rating from 1 to 5");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("feedback").insert({
      event_id: eventId,
      user_id: userId,
      rating,
      comment: comment.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Thanks for your feedback!");
    setExisting({ rating, comment: comment.trim() || null });
    loadFeedback();
  }

  if (loading) return null;

  return (
    <div className="space-y-4">
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {existing ? "Your feedback" : "How was the event?"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              disabled={!!existing}
              onClick={() => setRating(n)}
              className="disabled:cursor-default"
              aria-label={`${n} stars`}
            >
              <Star
                className={`h-7 w-7 ${
                  n <= rating
                    ? "fill-amber-400 text-amber-400"
                    : "text-muted-foreground"
                }`}
              />
            </button>
          ))}
        </div>
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Optional: share what you thought"
          rows={3}
          maxLength={1000}
          disabled={!!existing}
        />
        {!existing && (
          <Button onClick={submit} disabled={submitting || rating < 1}>
            {submitting ? "Submitting…" : "Submit feedback"}
          </Button>
        )}
      </CardContent>
    </Card>

      {others.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              What others said ({others.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {others.map((f) => (
              <div key={f.id} className="border-b last:border-b-0 pb-3 last:pb-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">
                    {f.display_name ?? "Attendee"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(f.created_at), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
                <div className="flex gap-0.5 mb-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      className={`h-4 w-4 ${
                        n <= f.rating
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground/40"
                      }`}
                    />
                  ))}
                </div>
                {f.comment && (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {f.comment}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}