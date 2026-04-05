const CHICAGO_TIME_ZONE = "America/Chicago";

export interface ChicagoParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

function getChicagoFormatter() {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: CHICAGO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  });
}

export function getChicagoNowParts(now = new Date()): ChicagoParts {
  const formatted = getChicagoFormatter().formatToParts(now);
  const readPart = (type: Intl.DateTimeFormatPartTypes) => {
    const part = formatted.find((entry) => entry.type === type)?.value;
    if (!part) {
      throw new Error(`Missing Chicago time part: ${type}`);
    }
    return Number(part);
  };

  return {
    year: readPart("year"),
    month: readPart("month"),
    day: readPart("day"),
    hour: readPart("hour"),
    minute: readPart("minute")
  };
}

export function chicagoDateString(now = new Date()): string {
  const parts = getChicagoNowParts(now);
  return `${parts.year.toString().padStart(4, "0")}-${parts.month.toString().padStart(2, "0")}-${parts.day.toString().padStart(2, "0")}`;
}

export function isBeforeChicagoNoon(now = new Date()): boolean {
  const parts = getChicagoNowParts(now);
  return parts.hour < 12;
}

export function isChicagoNoon(now = new Date()): boolean {
  const parts = getChicagoNowParts(now);
  return parts.hour === 12 && parts.minute < 15;
}

export function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [yearString, monthString, dayString] = value.split("-");
  const year = Number(yearString);
  const month = Number(monthString);
  const day = Number(dayString);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function compareDateStrings(left: string, right: string): number {
  if (left === right) {
    return 0;
  }
  return left < right ? -1 : 1;
}

export function discordDateUnix(dateString: string): number {
  const [yearString, monthString, dayString] = dateString.split("-");
  const year = Number(yearString);
  const month = Number(monthString);
  const day = Number(dayString);
  return Math.floor(Date.UTC(year, month - 1, day, 17, 0, 0) / 1000);
}

export function formatDiscordDateTag(dateString: string): string {
  return `<t:${discordDateUnix(dateString)}:D>`;
}

export function formatReminderMessage(eventTitle: string, targetDate: string, todayDate: string): string | null {
  const dateComparison = compareDateStrings(targetDate, todayDate);
  if (dateComparison < 0) {
    return null;
  }

  const unix = discordDateUnix(targetDate);
  if (dateComparison === 0) {
    return `**${eventTitle}** is today (<t:${unix}:D>)`;
  }

  return `**${eventTitle}** <t:${unix}:R> (<t:${unix}:D>)`;
}

export { CHICAGO_TIME_ZONE };
