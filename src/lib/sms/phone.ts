/**
 * Phone numbers as the therapist types them ("050-123 4567", "+972 50…", "0033 6…")
 * → E.164 ("+972501234567"). Numbers starting with a single 0 are national numbers
 * of the practice's country.
 */
export const DEFAULT_COUNTRY_CODE = "972";

export function normalizePhone(input: string, countryCode = DEFAULT_COUNTRY_CODE): string | null {
  const trimmed = input.trim();
  if (!/^[+\d\s().-]+$/.test(trimmed)) return null;
  const digits = trimmed.replace(/\D/g, "");
  let e164: string;
  if (trimmed.startsWith("+")) e164 = `+${digits}`;
  else if (digits.startsWith("00")) e164 = `+${digits.slice(2)}`;
  else if (digits.startsWith("0")) e164 = `+${countryCode}${digits.slice(1)}`;
  else if (digits.startsWith(countryCode)) e164 = `+${digits}`;
  else return null;
  return /^\+[1-9]\d{7,14}$/.test(e164) ? e164 : null;
}

/** Opens the therapist's own messaging app with the text ready (works on iOS and Android). */
export function smsHref(phoneE164: string, body: string): string {
  return `sms:${phoneE164}?&body=${encodeURIComponent(body)}`;
}
