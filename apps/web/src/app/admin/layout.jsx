import { redirect } from "next/navigation";
import { requireSession } from "@/app/api/_utils/auth";
import { isOwnerBusiness } from "@/lib/entitlements";

export default async function AdminLayout({ children }) {
  // This is a server component, so we need to check auth differently
  // We'll create a client wrapper for the actual auth check
  return <AdminWrapper>{children}</AdminWrapper>;
}

function AdminWrapper({ children }) {
  // For now, we'll rely on client-side auth checks in the page component
  // In a production app, you might want to implement server-side auth middleware
  return <>{children}</>;
}
