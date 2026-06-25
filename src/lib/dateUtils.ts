/**
 * Utility functions for date formatting in the system.
 * We store dates as YYYY-MM-DD or YYYY-MM-DD HH:mm (ISO format) in the DB
 * but display them as DD/MM/YYYY or DD/MM/YYYY HH:mm for standard Vietnamese presentation.
 */

/**
 * Formats a date string (YYYY-MM-DD or ISO) to DD/MM/YYYY
 * @param dateStr Date string to format
 * @param fallback Fallback string if formatting fails
 */
export function formatDate(dateStr?: string | null, fallback: string = ''): string {
  if (!dateStr) return fallback;
  
  try {
    // If it's already formatted as DD/MM/YYYY, return it
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
      return dateStr;
    }

    // Try to parse out YYYY-MM-DD from start of string
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, y, m, d] = match;
      return `${d}/${m}/${y}`;
    }

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return dateStr; // Return as-is if parsing fails
    }

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

/**
 * Formats a date-time string (YYYY-MM-DD HH:mm or ISO) to DD/MM/YYYY HH:mm
 * @param dateTimeStr Date-time string to format
 * @param fallback Fallback string if formatting fails
 */
export function formatDateTime(dateTimeStr?: string | null, fallback: string = ''): string {
  if (!dateTimeStr) return fallback;

  try {
    // If it already matches DD/MM/YYYY HH:mm
    if (/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/.test(dateTimeStr)) {
      return dateTimeStr;
    }

    // Parse YYYY-MM-DD and HH:mm
    const match = dateTimeStr.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})/);
    if (match) {
      const [, y, m, d, hh, mm] = match;
      return `${d}/${m}/${y} ${hh}:${mm}`;
    }

    const date = new Date(dateTimeStr);
    if (isNaN(date.getTime())) {
      return dateTimeStr;
    }

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hh}:${mm}`;
  } catch {
    return dateTimeStr;
  }
}
