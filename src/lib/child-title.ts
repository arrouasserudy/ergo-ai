import { isolate, type I18n } from "@/i18n";

/** "Léa Martin · 7 ans" / "L. M. #3F2A1C · גיל 7" (hidden mode) */
export function childTitle(child: { id: string; name: string; birthDate: string | null }, i18n: I18n): string {
  const age = i18n.age(child.birthDate);
  const name = isolate(i18n.childName(child));
  return age ? `${name} · ${age}` : name;
}
