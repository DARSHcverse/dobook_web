import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminPanelClient from "./AdminPanelClient";
import { getAdminSessionFromCookies } from "@/lib/adminAuth";

export default function AdminPage() {
  const session = getAdminSessionFromCookies(cookies());
  if (!session.ok) {
    redirect("/admin/auth");
  }

  return <AdminPanelClient />;
}
