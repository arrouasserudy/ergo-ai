"use client";

import { Activity, ClipboardList, FileText, History, LayoutGrid, UserRound } from "lucide-react";
import { Tabs } from "@/components/ui/Tabs";
import { useI18n } from "@/i18n/client";

/** The child file's sections (see `children/[id]/layout.tsx`). Detail pages light up their section's tab. */
export function ChildTabs({ childId }: { childId: string }) {
  const { t } = useI18n();
  const tab = t.children.tabs;
  const base = `/children/${childId}`;
  return (
    <Tabs
      label={tab.label}
      tabs={[
        { label: tab.overview, icon: LayoutGrid, href: base },
        { label: tab.profile, icon: UserRound, href: `${base}/profile` },
        { label: tab.crises, icon: Activity, href: `${base}/episodes` },
        { label: tab.reports, icon: FileText, href: `${base}/reports` },
        { label: tab.forms, icon: ClipboardList, href: `${base}/forms`, match: [`${base}/forms`, `${base}/assessments`] },
        { label: tab.timeline, icon: History, href: `${base}/timeline` },
      ]}
    />
  );
}
