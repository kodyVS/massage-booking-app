import { settingsController } from "@/backend";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const dynamic = "force-dynamic";

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
