import type { ReactNode } from "react";
import { ResourcesTabs } from "@/components/shell/ResourcesTabs";

/** One of the Resources sections: the shared tab bar sits above the page. */
export default function ResourcesSectionLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="mx-auto mb-5 max-w-6xl">
        <ResourcesTabs />
      </div>
      {children}
    </>
  );
}
