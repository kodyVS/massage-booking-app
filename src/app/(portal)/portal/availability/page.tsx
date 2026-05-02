import { redirect } from "next/navigation";
import {
  schedulesController,
  settingsController,
} from "@/backend";
import { auth } from "@/auth";
import { TimeOffPanel } from "./time-off-panel";

export const dynamic = "force-dynamic";

export default async function WorkerAvailabilityPage() {
  const session = await auth();
  if (!session?.user?.therapistId) redirect("/login");
  const therapistId = session.user.therapistId;
  const [settings, all] = await Promise.all([
    settingsController.get(),
    schedulesController.listTimeOff({
      input: { therapistId },
      context: { role: "worker", userId: session.user.id, therapistId },
    }),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="font-display text-3xl text-coral-dark">Time off</h1>
        <p className="text-sm text-ink/60">
          {settings.autoApproveWorkerTimeOff
            ? "Your requests are auto-approved."
            : "Submitted requests are reviewed by an admin before they take effect."}
        </p>
      </header>
      <TimeOffPanel timeOff={all} tz={settings.businessTimezone} />
    </div>
  );
}
