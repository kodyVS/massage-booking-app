import { redirect } from "next/navigation";
import { schedulesController, settingsController } from "@/backend";
import { auth } from "@/auth";
import { HoursForm } from "./hours-form";

export const dynamic = "force-dynamic";

export default async function WorkerHoursPage() {
  const session = await auth();
  if (!session?.user?.therapistId) redirect("/login");
  const therapistId = session.user.therapistId;

  const [settings, hours] = await Promise.all([
    settingsController.get(),
    schedulesController.getWorkingHours({ input: { therapistId } }),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="font-display text-3xl text-coral-dark">Working hours</h1>
        <p className="text-sm text-ink/60">
          Business envelope:{" "}
          <span className="font-medium">
            {settings.defaultOpenTime}–{settings.defaultCloseTime}
          </span>
          . You cannot set hours outside this range.
        </p>
      </header>
      <HoursForm
        initial={hours}
        envelopeOpen={settings.defaultOpenTime}
        envelopeClose={settings.defaultCloseTime}
      />
    </div>
  );
}
