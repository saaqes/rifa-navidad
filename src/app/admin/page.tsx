import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/auth";
import { getRaffleConfig } from "@/lib/config";
import { AdminDashboard } from "@/components/AdminDashboard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Administración | Gran Rifa Navideña", robots: { index: false } };

export default async function AdminPage() {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return <AdminDashboard email={admin} currency={getRaffleConfig().currency} />;
}
