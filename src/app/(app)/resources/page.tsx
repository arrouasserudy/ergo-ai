import { redirect } from "next/navigation";
import { requireTherapist } from "@/lib/session";

/** "Resources" groups Forms, OT tests and the library, which keep their own URLs: open the first tab. */
export default async function ResourcesPage() {
  await requireTherapist();
  redirect("/forms");
}
