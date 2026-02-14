/**
 * Parse an ISO date-only string (YYYY-MM-DD) as a local calendar date.
 * Avoids timezone issues from new Date("YYYY-MM-DD") (which is interpreted as UTC midnight).
 */
function parseISODateOnly(iso: string): Date | null {
  const parts = iso.trim().split('-');
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) return null;
  if (month < 0 || month > 11 || day < 1 || day > 31) return null;
  const d = new Date(year, month, day);
  if (d.getFullYear() !== year || d.getMonth() !== month || d.getDate() !== day) return null;
  return d;
}

/**
 * Compute age from profile birth_date (preferred) or birth_year.
 * Uses full date when birth_date is set (month/day aware); otherwise approximates from birth_year.
 */
export function calculateAge(profile: {
  birth_date?: string | null;
  birth_year?: number | null;
}): number | null {
  if (profile.birth_date) {
    const birth = parseISODateOnly(profile.birth_date);
    if (!birth) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age -= 1;
    }
    return age >= 0 ? age : null;
  }
  if (profile.birth_year != null) {
    const currentYear = new Date().getFullYear();
    return currentYear - profile.birth_year;
  }
  return null;
}
