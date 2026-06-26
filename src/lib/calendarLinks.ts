/**
 * Calendar link generators for interview scheduling.
 * Supports Google Calendar, Outlook, and .ics (Apple/generic).
 */

interface CalendarEvent {
  title: string;
  description?: string;
  location?: string;
  date: string;       // YYYY-MM-DD
  time: string;       // HH:MM or HH:MM:SS
  durationMinutes?: number;
}

function toUTCDatetime(date: string, time: string): string {
  // Create local datetime then format as YYYYMMDDTHHmmss
  const dt = new Date(`${date}T${time.slice(0, 5)}:00`);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}T${pad(dt.getHours())}${pad(dt.getMinutes())}00`;
}

function addMinutes(date: string, time: string, mins: number): string {
  const dt = new Date(`${date}T${time.slice(0, 5)}:00`);
  dt.setMinutes(dt.getMinutes() + mins);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}T${pad(dt.getHours())}${pad(dt.getMinutes())}00`;
}

export function getGoogleCalendarUrl(event: CalendarEvent): string {
  const dur = event.durationMinutes || 60;
  const start = toUTCDatetime(event.date, event.time);
  const end = addMinutes(event.date, event.time, dur);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${start}/${end}`,
    details: event.description || "",
    location: event.location || "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function getOutlookCalendarUrl(event: CalendarEvent): string {
  const dur = event.durationMinutes || 60;
  const startDt = new Date(`${event.date}T${event.time.slice(0, 5)}:00`);
  const endDt = new Date(startDt.getTime() + dur * 60000);
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: event.title,
    startdt: startDt.toISOString(),
    enddt: endDt.toISOString(),
    body: event.description || "",
    location: event.location || "",
  });
  return `https://outlook.live.com/calendar/0/action/compose?${params.toString()}`;
}

export function downloadICSFile(event: CalendarEvent): void {
  const dur = event.durationMinutes || 60;
  const start = toUTCDatetime(event.date, event.time);
  const end = addMinutes(event.date, event.time, dur);
  const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}@tawzeef-x`;

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Tawzeef-X//Interview//AR",
    "BEGIN:VEVENT",
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${(event.description || "").replace(/\n/g, "\\n")}`,
    `LOCATION:${event.location || ""}`,
    `UID:${uid}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "interview.ics";
  a.click();
  URL.revokeObjectURL(url);
}
