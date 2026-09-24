import { t } from "@/i18n/fr";

/** Age in whole months between an ISO birth date and `now`. */
export function ageInMonths(birthDate: string, now = new Date()): number {
  const birth = new Date(`${birthDate}T00:00:00`);
  let months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (now.getDate() < birth.getDate()) months -= 1;
  return Math.max(0, months);
}

/**
 * Human age label: months under 2 years, half-years under 4, whole years after.
 * Returns null when the birth date is unknown.
 */
export function formatAge(birthDate: string | null, now = new Date()): string | null {
  if (!birthDate) return null;
  const months = ageInMonths(birthDate, now);
  if (months < 24) return t.age.months(months);
  const years = Math.floor(months / 12);
  if (years < 4 && months % 12 >= 6) return t.age.yearsAndHalf(years);
  return t.age.years(years);
}
