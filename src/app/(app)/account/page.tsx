import { redirect } from "next/navigation";

/** "My practice" now lives in Settings; old links and bookmarks land on its practice section. */
export default function AccountPage() {
  redirect("/settings#practice");
}
