/**
 * Safe parser for various timestamp formats:
 * - Unix timestamp in seconds (e.g. 1788057000)
 * - Unix timestamp in milliseconds (e.g. 1788057000000)
 * - ISO string or Date string (e.g. "2026-08-26T20:00:00+05:30" or "2026-08-26 20:00:00")
 */
export function parseToDate(input) {
  if (!input) return new Date();

  // If already Date
  if (input instanceof Date) return input;

  // If numeric or numeric string
  if (typeof input === 'number' || (!isNaN(input) && !isNaN(parseFloat(input)))) {
    const num = Number(input);
    // If timestamp is in seconds (e.g. 10 digits ~ 1.7e9), convert to ms
    if (num < 100000000000) {
      return new Date(num * 1000);
    }
    return new Date(num);
  }

  // If string
  if (typeof input === 'string') {
    // If string like "2026-08-26 20:00:00" (CodeChef format in IST)
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(input.trim())) {
      // CodeChef times are in IST (UTC+05:30)
      const isoStr = input.trim().replace(' ', 'T') + '+05:30';
      const d = new Date(isoStr);
      if (!isNaN(d.getTime())) return d;
    }
    const d = new Date(input);
    if (!isNaN(d.getTime())) return d;
  }

  return new Date();
}

/**
 * Format date & time into localized readable string:
 * e.g. "Sat, 29 Aug 2026, 08:00 PM"
 */
export function formatDateTime(input, options = {}) {
  const date = parseToDate(input);
  if (isNaN(date.getTime())) return "Invalid Date";

  const defaultOptions = {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  };

  return date.toLocaleString(undefined, { ...defaultOptions, ...options });
}

/**
 * Format just the time (e.g. "08:00 PM")
 */
export function formatTime(input) {
  const date = parseToDate(input);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Format short date (e.g. "29 Aug, 08:00 PM")
 */
export function formatShortDateTime(input) {
  const date = parseToDate(input);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Format duration from seconds or minutes into human readable text:
 * e.g. 5400 -> "1h 30m", 7200 -> "2 hours", 86400 -> "1 day"
 */
export function formatDuration(durationInSeconds) {
  if (!durationInSeconds || isNaN(durationInSeconds)) return "N/A";
  
  const totalSeconds = Number(durationInSeconds);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);

  return parts.length > 0 ? parts.join(" ") : `${totalSeconds}s`;
}

/**
 * Get detailed countdown object: { days, hours, minutes, seconds, isLive, isPast, text }
 */
export function getCountdown(startTimeInput, durationSeconds = 0) {
  const startDate = parseToDate(startTimeInput);
  const startMs = startDate.getTime();
  const durMs = (Number(durationSeconds) || 0) * 1000;
  const endMs = startMs + durMs;
  const nowMs = Date.now();

  // If ongoing / live
  if (nowMs >= startMs && (durMs === 0 || nowMs < endMs)) {
    const remainingToLiveEnd = endMs - nowMs;
    const s = Math.max(0, Math.floor(remainingToLiveEnd / 1000));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return {
      status: "LIVE",
      isLive: true,
      isPast: false,
      isUpcoming: false,
      text: durMs > 0 ? `Ends in ${h}h ${m}m ${sec}s` : "Live Now",
      days: 0,
      hours: h,
      minutes: m,
      seconds: sec,
      totalSecondsRemaining: s,
    };
  }

  // If in future
  if (nowMs < startMs) {
    const diffSec = Math.floor((startMs - nowMs) / 1000);
    const d = Math.floor(diffSec / 86400);
    const h = Math.floor((diffSec % 86400) / 3600);
    const m = Math.floor((diffSec % 3600) / 60);
    const s = diffSec % 60;

    let text;
    if (d > 0) text = `Starts in ${d}d ${h}h ${m}m`;
    else if (h > 0) text = `Starts in ${h}h ${m}m ${s}s`;
    else if (m > 0) text = `Starts in ${m}m ${s}s`;
    else text = `Starts in ${s}s`;

    return {
      status: "UPCOMING",
      isLive: false,
      isPast: false,
      isUpcoming: true,
      text,
      days: d,
      hours: h,
      minutes: m,
      seconds: s,
      totalSecondsRemaining: diffSec,
    };
  }

  // In past
  const pastSec = Math.floor((nowMs - startMs) / 1000);
  const d = Math.floor(pastSec / 86400);
  let text = "Finished";
  if (d === 0) text = "Ended today";
  else if (d === 1) text = "Ended yesterday";
  else if (d < 30) text = `Ended ${d} days ago`;

  return {
    status: "FINISHED",
    isLive: false,
    isPast: true,
    isUpcoming: false,
    text,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    totalSecondsRemaining: 0,
  };
}

/**
 * Generate Google Calendar Event link
 */
export function getGoogleCalendarUrl(contest) {
  if (!contest) return "#";
  const startDate = parseToDate(contest.startTime);
  const durSec = Number(contest.duration) || 7200; // default 2 hrs
  const endDate = new Date(startDate.getTime() + durSec * 1000);

  const pad = (n) => String(n).padStart(2, "0");
  const toUtcIso = (d) =>
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(
      d.getUTCHours()
    )}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;

  const dates = `${toUtcIso(startDate)}/${toUtcIso(endDate)}`;
  const title = encodeURIComponent(`${contest.name} [${contest.platform}]`);
  const details = encodeURIComponent(
    `Platform: ${contest.platform}\nContest URL: ${contest.url}\nDuration: ${formatDuration(
      durSec
    )}\n\nAdded via NextContest`
  );
  const location = encodeURIComponent(contest.url || contest.platform);

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
}

/**
 * Get User's Timezone string (e.g. "IST (UTC+5:30)")
 */
export function getUserTimeZone() {
  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const now = new Date();
    const offsetMin = -now.getTimezoneOffset();
    const sign = offsetMin >= 0 ? "+" : "-";
    const hours = Math.floor(Math.abs(offsetMin) / 60);
    const mins = Math.abs(offsetMin) % 60;
    const formattedOffset = `UTC${sign}${hours}${mins > 0 ? `:${mins}` : ""}`;
    return `${timeZone} (${formattedOffset})`;
  } catch {
    return "Local Time";
  }
}
