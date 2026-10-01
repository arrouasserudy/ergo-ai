import { redirect } from "next/navigation";
import { requireTherapist } from "@/lib/session";

/** The child's OT tests are listed in the "Forms & tests" tab. */
export default async function ChildAssessmentsPage(props: PageProps<"/children/[id]/assessments">) {
  await requireTherapist();
  redirect(`/children/${(await props.params).id}/forms`);
}
