import { redirect } from "next/navigation";
import { requireTherapist } from "@/lib/session";

/** Reports are reached from each child's Reports tab; old links land on the children list. */
export default async function ReportsPage() {
  await requireTherapist();
  redirect("/children");
}
