import "server-only";

/**
 * SMS sending for the parents' meeting reminders. One provider for now: Twilio
 * (works with Israeli numbers, alphanumeric sender allowed). Without it, the
 * therapist sends the ready-made text from her own phone (see `smsHref`).
 * Only the phone number and the reminder text are sent: no child name.
 */
export type SmsProvider = "twilio";

export function smsProvider(): SmsProvider | null {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM, TWILIO_MESSAGING_SERVICE_SID } = process.env;
  return TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && (TWILIO_FROM || TWILIO_MESSAGING_SERVICE_SID) ? "twilio" : null;
}

/** National numbers typed without a country code belong to this country. */
export const phoneCountryCode = () => process.env.PHONE_COUNTRY_CODE ?? "972";

export async function sendSms(to: string, body: string): Promise<void> {
  if (smsProvider() !== "twilio") throw new Error("SMS provider not configured");
  const { TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: token, TWILIO_FROM: from, TWILIO_MESSAGING_SERVICE_SID: service } = process.env;

  const form = new URLSearchParams({ To: to, Body: body });
  if (service) form.set("MessagingServiceSid", service);
  else form.set("From", from!);

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const detail = (await res.json().catch(() => null)) as { code?: number; message?: string } | null;
    throw new Error(`Twilio ${res.status}${detail?.code ? ` (${detail.code})` : ""}: ${detail?.message ?? res.statusText}`);
  }
}
