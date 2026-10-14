import { redirect } from "next/navigation";

// Memorable entry point; the real screen lives at /auth. Query params
// (plan, industry, ...) are carried through.
export default async function LoginPage({ searchParams }) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries((await searchParams) || {})) {
    if (key === "mode") continue;
    for (const v of [].concat(value)) params.append(key, v);
  }
  params.set("mode", "login");
  redirect(`/auth?${params.toString()}`);
}
