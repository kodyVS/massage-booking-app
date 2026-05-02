import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Sidebar } from "@/components/portal/sidebar";
import { ToastProvider } from "@/components/ui/toast";

const ADMIN_NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/schedules", label: "Schedules" },
  { href: "/admin/therapists", label: "Therapists" },
  { href: "/admin/services", label: "Services" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/settings", label: "Settings" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Middleware already gates this group, but defense-in-depth: when called
  // from a server action the middleware doesn't run, so re-check here.
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    redirect("/login?from=/admin");
  }

  return (
    <ToastProvider>
      <div className="flex min-h-screen flex-col bg-cream md:flex-row">
        <Sidebar
          title="VTM Admin"
          subtitle="Operations console"
          items={ADMIN_NAV}
          user={{ email: session.user.email ?? undefined, role: "admin" }}
        />
        <main className="flex-1 px-4 py-8 sm:px-8 md:px-10">{children}</main>
      </div>
    </ToastProvider>
  );
}
