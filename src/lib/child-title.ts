import { isolate, type I18n } from "@/i18n";

/** "L. M. · 7 ans" / "L. M. · גיל 7" */
export function childTitle(child: { initials: string; birthDate: string | null }, i18n: I18n): string {
  const age = i18n.age(child.birthDate);
  return age ? `${isolate(child.initials)} · ${age}` : isolate(child.initials);
}
