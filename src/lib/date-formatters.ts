
import { parse, startOfWeek, endOfWeek, format, getYear as dfGetYear, getISOWeek as dfGetISOWeek, setYear, setISOWeek } from 'date-fns';
import { zhCN } from 'date-fns/locale';

/**
 * Parses a period label string like "YYYY年第WW周" into year and week number.
 * @param periodLabel The period label string.
 * @returns An object with year and week number, or null if parsing fails.
 */
export function parsePeriodLabelToYearWeek(periodLabel: string): { year: number; week: number } | null {
  if (!periodLabel || typeof periodLabel !== 'string') {
    return null;
  }
  const match = periodLabel.match(/(\d{4})年第(\d{1,2})周/);
  if (match && match[1] && match[2]) {
    const year = parseInt(match[1], 10);
    const week = parseInt(match[2], 10);
    if (!isNaN(year) && !isNaN(week)) {
      return { year, week };
    }
  }
  // Fallback for "YYYYWX" or "YYYYWXX" format like "2025W1" or "2025W24"
  const isoMatch = periodLabel.match(/(\d{4})W(\d{1,2})/i);
  if (isoMatch && isoMatch[1] && isoMatch[2]) {
    const year = parseInt(isoMatch[1], 10);
    const week = parseInt(isoMatch[2], 10);
    if (!isNaN(year) && !isNaN(week)) {
      return { year, week };
    }
  }
  return null;
}

/**
 * Calculates the start and end dates of a given week in a given year.
 * Assumes week starts on Monday and ends on Sunday based on common ISO week behavior.
 * Then adjusts end date to Saturday as per user requirement.
 * @param year The year.
 * @param weekNumber The week number (1-53).
 * @returns An object with start and end Date objects, or null if input is invalid.
 */
function getWeekDateObjects(year: number, weekNumber: number): { start: Date; end: Date } | null {
  if (isNaN(year) || isNaN(weekNumber) || weekNumber < 1 || weekNumber > 53) {
    return null;
  }
  try {
    // Create a date in the target year, then set the ISO week.
    // date-fns's setISOWeek and startOfWeek/endOfWeek (with weekStartsOn: 1 for Monday) are robust.
    let dateInYear = new Date(year, 0, 4); // January 4th is always in week 1
    let targetDate = setISOWeek(setYear(dateInYear, year), weekNumber);
    
    const startDate = startOfWeek(targetDate, { weekStartsOn: 1 /* Monday */ });
    // User specified data is up to Saturday of that week.
    // So, if startOfWeek gives Monday, end is Monday + 5 days = Saturday.
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 5);

    // Sanity check: ensure the calculated week's year matches the input year,
    // especially for weeks at the beginning/end of the year.
    // If end date's year is different, it means week 53 might spill or week 1 started late.
    // For simplicity here, we trust date-fns's ISO week logic handles this.
    // If strict "week must end within the year" is needed, further checks are required.

    return { start: startDate, end: endDate };
  } catch (e) {
    console.error("Error calculating week dates:", e);
    return null;
  }
}


/**
 * Gets a formatted date range string for a given year and week.
 * Example output: "W24 (06/09-06/14)"
 * @param year The year.
 * @param weekNumber The week number.
 * @returns Formatted string or the original week number if dates can't be calculated.
 */
export function getFormattedWeekDateRange(year: number, weekNumber: number): string {
  const dates = getWeekDateObjects(year, weekNumber);
  if (dates) {
    const formattedStart = format(dates.start, 'MM/dd');
    const formattedEnd = format(dates.end, 'MM/dd');
    return `W${weekNumber} (${formattedStart}-${formattedEnd})`;
  }
  return `W${weekNumber}`; // Fallback
}

/**
 * Formats a period label (e.g., "2025年第24周") into a concise X-axis tick label.
 * Example output: "W24 (06/09-06/14)"
 * @param periodLabel The full period label.
 * @returns A concise formatted string for chart axis.
 */
export function formatPeriodLabelForAxis(periodLabel: string): string {
  const parsed = parsePeriodLabelToYearWeek(periodLabel);
  if (parsed) {
    return getFormattedWeekDateRange(parsed.year, parsed.week);
  }
  // Fallback for labels that don't match primary format, try to extract week number
  const weekMatch = periodLabel.match(/第?(\d{1,2})周/);
  if (weekMatch && weekMatch[1]) {
    return `W${weekMatch[1]}`;
  }
  // Final fallback: if still a string, return last 5 chars, otherwise original value
  return typeof periodLabel === 'string' ? periodLabel.slice(-5) : String(periodLabel);
}

/**
 * Formats a period label for display in tooltips, including year.
 * Example output: "2025年 W24 (06/09-06/14)"
 * @param periodLabel The full period label.
 * @returns A detailed formatted string for tooltips.
 */
export function formatPeriodLabelForTooltip(periodLabel: string): string {
  const parsed = parsePeriodLabelToYearWeek(periodLabel);
  if (parsed) {
    const dateRange = getWeekDateObjects(parsed.year, parsed.week);
    if (dateRange) {
      const formattedStart = format(dateRange.start, 'MM/dd');
      const formattedEnd = format(dateRange.end, 'MM/dd');
      return `${parsed.year}年 W${parsed.week} (${formattedStart}-${formattedEnd})`;
    }
    return `${parsed.year}年 W${parsed.week}`;
  }
  return periodLabel; // Fallback
}

