import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Sidebar } from "@/components/portal/sidebar";
import { ToastProvider } from "@/components/ui/toast";

const PORTAL_NAV = [
  { href: "/portal", label: "Today" },
  { href: "/portal/schedule", label: "Schedule" },
  { href: "/portal/availability", label: "Time Off" },
  { href: "/portal/hours", label: "Working Hours" },
];

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "worker") {
    redirect("/login?from=/portal");
  }

  return (
    <ToastProvider>
      <div className="flex min-h-screen flex-col bg-cream md:flex-row">
        <Sidebar
          title="Therapist Portal"
          subtitle="Your schedule"
          items={PORTAL_NAV}
          user={{ email: session.user.email ?? undefined, role: "therapist" }}
        />
        <main className="flex-1 px-4 py-8 sm:px-8 md:px-10">{children}</main>
      </div>
    </ToastProvider>
  );
}
