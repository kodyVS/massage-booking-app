import { settingsController } from "@/backend";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

// Layout fetches settings (business name + footer contact info). These rarely
// change, so cache the layout for an hour. Child pages override with their
// own revalidate when they need fresher data.
export const revalidate = 3600;

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await settingsController.get();
  return (
    <>
      <SiteHeader businessName={settings.businessName} />
      <main className="flex-1">{children}</main>
      <SiteFooter
        businessName={settings.businessName}
        businessPhone={settings.businessPhone}
        businessAddress={settings.businessAddress}
      />
    </>
  );
}
