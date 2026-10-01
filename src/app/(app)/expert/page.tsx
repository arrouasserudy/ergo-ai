import { redirect } from "next/navigation";

/** Amit is a bubble on every page now: old links open it on the dashboard (child and episode kept). */
export default async function ExpertRedirect(props: PageProps<"/expert">) {
  const sp = await props.searchParams;
  const query = new URLSearchParams({ amit: "new" });
  if (typeof sp.child === "string") query.set("amitChild", sp.child);
  if (typeof sp.episode === "string") query.set("amitEpisode", sp.episode);
  redirect(`/?${query}`);
}
