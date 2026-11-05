interface CalendarInterview {
  title: string;
  description: string;
  location: string;
  date: string;
  time?: string | null;
  startsAt?: string | null;
  timeZone?: string | null;
  durationMinutes?: number | null;
}
export function interviewCalendarUrl(interview: CalendarInterview): string {
  const {
    title,
    description,
    location,
    date,
    time,
    startsAt,
    timeZone,
    durationMinutes,
  } = interview;
  const start = new Date(
    startsAt || `${date}T${(time || "00:00").slice(0, 5)}:00Z`,
  );
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    details: description,
    location,
  });
  if (Number.isFinite(start.getTime())) {
    const format = (value: Date) =>
      value.toISOString().replace(/[-:]/g, "").replace(
        /\.\d{3}Z$/,
        startsAt ? "Z" : "",
      );
    params.set(
      "dates",
      `${format(start)}/${
        format(new Date(start.getTime() + (durationMinutes ?? 30) * 60000))
      }`,
    );
    params.set("ctz", timeZone || "Africa/Cairo");
  }
  return `https://calendar.google.com/calendar/render?${params}`;
}
