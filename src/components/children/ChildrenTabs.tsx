"use client";

import { Shapes, UserRound } from "lucide-react";
import { Tabs } from "@/components/ui/Tabs";
import { useI18n } from "@/i18n/client";

/** Children list / groups, on top of both pages (the sidebar's "Children" item covers both). */
export function ChildrenTabs() {
  const { t } = useI18n();
  return (
    <Tabs
      label={t.children.tabsLabel}
      tabs={[
        { label: t.nav.children, icon: UserRound, href: "/children" },
        { label: t.nav.groups, icon: Shapes, href: "/groups" },
      ]}
    />
  );
}
