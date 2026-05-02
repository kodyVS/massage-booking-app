import { settingsController } from "@/backend";
import { SettingsForm } from "./settings-form";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const settings = await settingsController.get();
  // Read the env-level integration toggles. When false, the Settings UI
  // disables the corresponding switch with explanatory text - the env flag
  // is the master kill-switch (Phase 4 wiring requires both env and settings
  // to send notifications).
  const smsEnabledByEnv = process.env.SMS_ENABLED === "true";
  const emailEnabledByEnv = process.env.EMAIL_ENABLED === "true";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="font-display text-3xl text-coral-dark">Settings</h1>
        <p className="text-sm text-ink/60">
          Business hours, slot scheduling, notifications, and policy.
        </p>
      </header>
      <SettingsForm
        initial={settings}
        smsEnabledByEnv={smsEnabledByEnv}
        emailEnabledByEnv={emailEnabledByEnv}
      />
    </div>
  );
}
