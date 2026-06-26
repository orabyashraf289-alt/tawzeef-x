import { Calendar, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getGoogleCalendarUrl, getOutlookCalendarUrl, downloadICSFile } from "@/lib/calendarLinks";

interface Props {
  title: string;
  description?: string;
  location?: string;
  date: string;
  time: string;
  durationMinutes?: number;
  size?: "sm" | "default";
}

export default function AddToCalendarButton({ title, description, location, date, time, durationMinutes, size = "sm" }: Props) {
  const event = { title, description, location, date, time, durationMinutes };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size={size} className="gap-1.5 text-xs h-7">
          <Calendar className="w-3.5 h-3.5" />
          أضف للتقويم
          <ChevronDown className="w-3 h-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[180px]">
        <DropdownMenuItem onClick={() => window.open(getGoogleCalendarUrl(event), "_blank")}>
          <span className="text-xs">Google Calendar</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => window.open(getOutlookCalendarUrl(event), "_blank")}>
          <span className="text-xs">Outlook</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => downloadICSFile(event)}>
          <span className="text-xs">Apple Calendar (.ics)</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
