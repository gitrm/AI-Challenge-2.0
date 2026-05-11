import { QRCodeSVG } from "qrcode.react";
import { CalendarPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { buildIcs, downloadIcs } from "@/lib/ics";

export type TicketEventInfo = {
  id: string;
  title: string;
  description?: string | null;
  starts_at: string;
  ends_at: string;
  venue_address?: string | null;
  online_url?: string | null;
  formattedDateLine: string;
};

export function TicketCard({
  ticketCode,
  event,
  onCancel,
  cancelling,
}: {
  ticketCode: string;
  event: TicketEventInfo;
  onCancel?: () => void;
  cancelling?: boolean;
}) {
  const location = event.venue_address || event.online_url || "";

  function handleAddToCalendar() {
    const ics = buildIcs({
      uid: ticketCode,
      title: event.title,
      description: event.description,
      location,
      startsAt: event.starts_at,
      endsAt: event.ends_at,
    });
    downloadIcs(`${event.title}.ics`, ics);
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center">
        <div className="rounded-lg border border-border bg-white p-2">
          <QRCodeSVG value={ticketCode} size={120} includeMargin={false} />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-semibold leading-tight">{event.title}</p>
          <p className="text-sm text-muted-foreground">{event.formattedDateLine}</p>
          {location && (
            <p className="text-sm text-muted-foreground line-clamp-1">{location}</p>
          )}
          <p className="mt-2 font-mono text-lg tracking-widest">{ticketCode}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={handleAddToCalendar}>
              <CalendarPlus className="mr-1.5 h-4 w-4" />
              Add to Calendar
            </Button>
            {onCancel && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onCancel}
                disabled={cancelling}
                className="text-destructive hover:text-destructive"
              >
                <X className="mr-1.5 h-4 w-4" />
                {cancelling ? "Cancelling…" : "Cancel RSVP"}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}