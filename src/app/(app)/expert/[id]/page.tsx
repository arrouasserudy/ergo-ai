import { redirect } from "next/navigation";

/** Old conversation links open that conversation in the Amit bubble (access is checked when it loads). */
export default async function ConversationRedirect(props: PageProps<"/expert/[id]">) {
  const { id } = await props.params;
  redirect(`/?${new URLSearchParams({ amit: id })}`);
}
