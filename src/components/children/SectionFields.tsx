"use client";

import { InputField, TextareaField } from "@/components/ui/Field";
import { TagPicker } from "@/components/ui/TagPicker";
import type { Child } from "@/db/schema";
import { SMS_LANGUAGES } from "@/db/schema";
import { LOCALE_NAMES } from "@/i18n";
import { useI18n } from "@/i18n/client";
import {
  BACKGROUND_FACTOR_OPTIONS,
  CALMING_STRATEGY_OPTIONS,
  HYPER_SENSITIVITY_OPTIONS,
  HYPO_REACTIVITY_OPTIONS,
  INTEREST_OPTIONS,
} from "@/lib/options";
import type { FieldErrors } from "@/lib/validation";

const today = () => new Date().toISOString().slice(0, 10);

/** Saved record, optionally overlaid with raw values from a failed submit. */
type FieldValues = Partial<Omit<Child, "siblingsCount">> & { siblingsCount?: number | string | null };
type FieldsProps = { child?: FieldValues; errors?: FieldErrors };

export function IdentityFields({ child, errors = {} }: FieldsProps) {
  const f = useI18n().t.fields;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <InputField
        name="name"
        label={f.name}
        placeholder={f.namePlaceholder}
        defaultValue={child?.name ?? ""}
        error={errors.name}
        maxLength={100}
        autoComplete="off"
        required
      />
      <InputField name="birthDate" type="date" label={f.birthDate} max={today()} defaultValue={child?.birthDate ?? ""} error={errors.birthDate} />
      <InputField
        name="referralReason"
        label={f.referralReason}
        placeholder={f.referralReasonPlaceholder}
        defaultValue={child?.referralReason ?? ""}
        error={errors.referralReason}
        className="sm:col-span-2"
        maxLength={200}
        required
      />
      <InputField name="schoolLevel" label={f.schoolLevel} placeholder={f.schoolLevelPlaceholder} defaultValue={child?.schoolLevel ?? ""} error={errors.schoolLevel} maxLength={80} />
      <InputField name="followUpStart" type="date" label={f.followUpStart} max={today()} defaultValue={child?.followUpStart ?? ""} error={errors.followUpStart} />
    </div>
  );
}

export function HistoryFields({ child, errors = {} }: FieldsProps) {
  const f = useI18n().t.fields;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextareaField name="medicalHistory" label={f.medicalHistory} defaultValue={child?.medicalHistory ?? ""} error={errors.medicalHistory} className="sm:col-span-2" />
      <TextareaField name="birthHistory" label={f.birthHistory} placeholder={f.birthHistoryPlaceholder} defaultValue={child?.birthHistory ?? ""} error={errors.birthHistory} rows={2} />
      <TextareaField name="surgicalHistory" label={f.surgicalHistory} defaultValue={child?.surgicalHistory ?? ""} error={errors.surgicalHistory} rows={2} />
      <TextareaField name="geneticDiagnoses" label={f.geneticDiagnoses} defaultValue={child?.geneticDiagnoses ?? ""} error={errors.geneticDiagnoses} className="sm:col-span-2" rows={2} />
      <TextareaField name="familyHistory" label={f.familyHistory} defaultValue={child?.familyHistory ?? ""} error={errors.familyHistory} className="sm:col-span-2" rows={2} />
      <TextareaField name="familyComposition" label={f.familyComposition} defaultValue={child?.familyComposition ?? ""} error={errors.familyComposition} rows={2} />
      <InputField name="siblingsCount" type="number" min={0} max={20} label={f.siblingsCount} defaultValue={child?.siblingsCount ?? ""} error={errors.siblingsCount} />
      <TextareaField name="otherInfo" label={f.otherInfo} defaultValue={child?.otherInfo ?? ""} error={errors.otherInfo} className="sm:col-span-2" rows={2} />
    </div>
  );
}

export function SensoryFields({ child, errors = {} }: FieldsProps) {
  const f = useI18n().t.fields;
  return (
    <div className="flex flex-col gap-5">
      <TextareaField name="knownTriggers" label={f.knownTriggers} placeholder={f.knownTriggersPlaceholder} defaultValue={child?.knownTriggers ?? ""} error={errors.knownTriggers} rows={2} />
      <TagPicker name="hyperSensitivities" label={f.hyperSensitivities} options={HYPER_SENSITIVITY_OPTIONS} defaultValue={child?.hyperSensitivities} />
      <TagPicker name="hypoReactivities" label={f.hypoReactivities} options={HYPO_REACTIVITY_OPTIONS} defaultValue={child?.hypoReactivities} />
      <label className="flex items-start gap-3 py-1 text-[14px] text-ink-soft">
        <input type="checkbox" name="seeksDeepPressure" defaultChecked={child?.seeksDeepPressure ?? false} className="mt-0.5 size-5 shrink-0 accent-primary" />
        {f.seeksDeepPressure}
      </label>
      <TagPicker name="backgroundFactors" label={f.backgroundFactors} options={BACKGROUND_FACTOR_OPTIONS} defaultValue={child?.backgroundFactors} />
      <TextareaField name="warningSigns" label={f.warningSigns} placeholder={f.warningSignsPlaceholder} defaultValue={child?.warningSigns ?? ""} error={errors.warningSigns} rows={2} />
      <TagPicker name="calmingStrategies" label={f.calmingStrategies} options={CALMING_STRATEGY_OPTIONS} defaultValue={child?.calmingStrategies} />
      <TagPicker name="interests" label={f.interests} options={INTEREST_OPTIONS} defaultValue={child?.interests} />
    </div>
  );
}

export function ParentsFields({ child, errors = {} }: FieldsProps) {
  const f = useI18n().t.fields;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <InputField name="parentName" label={f.parentName} placeholder={f.parentNamePlaceholder} defaultValue={child?.parentName ?? ""} error={errors.parentName} maxLength={100} autoComplete="off" />
      <InputField
        name="parentPhone"
        type="tel"
        dir="ltr"
        label={f.parentPhone}
        placeholder={f.parentPhonePlaceholder}
        help={f.parentPhoneHelp}
        defaultValue={child?.parentPhone ?? ""}
        error={errors.parentPhone}
        maxLength={30}
        autoComplete="off"
      />
      <label className="flex items-start gap-3 py-1 text-[14px] text-ink-soft sm:col-span-2">
        <input type="checkbox" name="smsReminders" defaultChecked={child?.smsReminders ?? false} className="mt-0.5 size-5 shrink-0 accent-primary" />
        {f.smsReminders}
      </label>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="smsLanguage" className="text-[12.5px] font-medium text-ink-soft">
          {f.smsLanguage}
        </label>
        <select
          id="smsLanguage"
          name="smsLanguage"
          defaultValue={child?.smsLanguage ?? "he"}
          className="h-11 w-full rounded-lg border border-line-strong bg-surface px-3 text-[14px] focus:border-primary focus:ring-2 focus:ring-primary/15 focus:outline-none"
        >
          {SMS_LANGUAGES.map((lang) => (
            <option key={lang} value={lang}>
              {LOCALE_NAMES[lang]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
