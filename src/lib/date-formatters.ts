
import { startOfWeek, endOfWeek, format, getYear as dfGetYear, getISOWeek as dfGetISOWeek, setYear, setISOWeek, addDays } from 'date-fns';
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
  // Fallback for "YYYY-WX" or "YYYYWXX" format like "2025-W1" or "2025W24"
  const isoMatch = periodLabel.match(/(\d{4})-?W(\d{1,2})/i);
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
 * Week starts on Sunday (0) and ends on Saturday (6).
 * @param year The year.
 * @param weekNumber The week number (1-53).
 * @returns An object with start and end Date objects, or null if input is invalid.
 */
export function getWeekDateObjects(year: number, weekNumber: number): { start: Date; end: Date } | null {
  if (isNaN(year) || isNaN(weekNumber) || weekNumber < 1 || weekNumber > 53) {
    return null;
  }
  try {
    // Create a date in the target year, then set the ISO week.
    // date-fns's setISOWeek and startOfWeek/endOfWeek are robust.
    // We use ISO week for consistency, then adjust to Sunday-Saturday.
    let dateInYear = new Date(year, 0, 4); // January 4th is always in week 1 for ISO
    let targetDateForIsoWeek = setISOWeek(setYear(dateInYear, year), weekNumber);
    
    // Get the Sunday of that ISO week (or the week containing targetDateForIsoWeek)
    const startDate = startOfWeek(targetDateForIsoWeek, { weekStartsOn: 0 /* Sunday */ });
    
    // End date is Saturday of that week (Sunday + 6 days)
    const endDate = addDays(startDate, 6);

    return { start: startDate, end: endDate };
  } catch (e) {
    console.error("Error calculating week dates:", e);
    return null;
  }
}


/**
 * Gets a formatted date range string for a given year and week.
 * Example output: "W24 (06/08-06/14)" for Sunday to Saturday
 * This function is kept for potential other uses or for detailed views.
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
 * Formats a period label (e.g., "2025年第24周") into a concise X-axis tick label
 * displaying the last day of the week (Saturday) in "YY-MM-DD" format.
 * Example output: "25-06-14"
 * @param periodLabel The full period label.
 * @returns A formatted string of the week's end date for chart axis.
 */
export function formatPeriodLabelForAxis(periodLabel: string): string {
  const parsed = parsePeriodLabelToYearWeek(periodLabel);
  if (parsed) {
    const dates = getWeekDateObjects(parsed.year, parsed.week);
    if (dates && dates.end) {
      return format(dates.end, 'yy-MM-dd');
    }
  }
  // Fallback for labels that don't match primary format or if date calculation fails
  const weekMatch = periodLabel.match(/第?(\d{1,2})周/);
  if (weekMatch && weekMatch[1]) {
    return `W${weekMatch[1]}`; // Fallback to week number if date parsing fails
  }
  return typeof periodLabel === 'string' ? periodLabel.slice(-5) : String(periodLabel);
}

/**
 * Formats a period label for display in tooltips, including year and full date range.
 * Example output: "2025年 W24 (06/08-06/14)"
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
