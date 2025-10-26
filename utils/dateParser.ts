// --- Helper: parse various date/time formats and return JS Date or null ---

interface ParseDateTimeOptions {
  defaultTime?: string | null;
}

export function parseDateTime(
  dateInput: string,
  timeInput: string,
  { defaultTime = "09:00" }: ParseDateTimeOptions = {}
): Date | null {
  if (!dateInput) return null;

  // sanitize inputs
  const d = dateInput.trim();
  let t = (timeInput || "").trim();

  // treat placeholders like "--:--" or ":" as empty
  if (/^-+:?-*$/i.test(t) || t === ":" || t === "--:--") t = "";

  // If time empty, use defaultTime (or fail if defaultTime is null)
  if (!t) {
    if (defaultTime) {
      t = defaultTime;
    } else {
      return null; // Time is required but not provided
    }
  }

  // Accept ISO-like yyyy-mm-dd (from <input type="date">) OR dd-mm-yyyy or dd/mm/yyyy
  let year: number, month: number, day: number, hour = 0, minute = 0;

  // Parse time HH:MM (24h)
  const timeMatch = t.match(/^(\d{1,2}):(\d{2})$/);
  if (timeMatch) {
    hour = parseInt(timeMatch[1], 10);
    minute = parseInt(timeMatch[2], 10);
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  } else {
    // invalid time format
    return null;
  }

  // Parse date
  // 1) ISO yyyy-mm-dd
  const isoMatch = d.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    year = parseInt(isoMatch[1], 10);
    month = parseInt(isoMatch[2], 10);
    day = parseInt(isoMatch[3], 10);
  } else {
    // 2) dd-mm-yyyy or dd/mm/yyyy
    const dmMatch = d.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
    if (dmMatch) {
      day = parseInt(dmMatch[1], 10);
      month = parseInt(dmMatch[2], 10);
      year = parseInt(dmMatch[3], 10);
    } else {
      // not a recognized date format
      return null;
    }
  }

  // construct JS Date (month index is 0-based)
  const jsDate = new Date(year, month - 1, day, hour, minute, 0, 0);

  // sanity check: constructed fields match input (guards against invalid dates like 31 Feb)
  if (
    jsDate.getFullYear() !== year ||
    jsDate.getMonth() !== month - 1 ||
    jsDate.getDate() !== day ||
    jsDate.getHours() !== hour ||
    jsDate.getMinutes() !== minute
  ) {
    return null;
  }

  return jsDate;
}
