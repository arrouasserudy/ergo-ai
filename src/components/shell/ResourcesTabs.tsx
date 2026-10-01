"use client";

import { ClipboardList, Gauge, Library } from "lucide-react";
import { Tabs } from "@/components/ui/Tabs";
import { useI18n } from "@/i18n/client";
import type { Dictionary } from "@/i18n/fr";

/** The sections grouped under the "Resources" sidebar item (see `Sidebar.tsx`). Their URLs stay as they were. */
export const RESOURCE_TABS = [
  { label: "forms", icon: ClipboardList, href: "/forms" },
  { label: "assessments", icon: Gauge, href: "/assessments" },
  { label: "library", icon: Library, href: "/expert/library" },
] as const satisfies { label: keyof Dictionary["nav"]; icon: unknown; href: string }[];

/** Tab bar on top of every Resources page (index and detail): the section's tab stays active on its sub-pages. */
export function ResourcesTabs() {
  const { t } = useI18n();
  return <Tabs label={t.nav.resources} tabs={RESOURCE_TABS.map(({ label, icon, href }) => ({ label: t.nav[label], icon, href }))} />;
}
