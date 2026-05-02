"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { TherapistDTO } from "@/backend";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { deactivateTherapistAction, updateTherapistAction } from "./actions";

export function TherapistRowActions({ therapist }: { therapist: TherapistDTO }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  function deactivate() {
    if (!confirm(`Deactivate ${therapist.name}? They will not appear on the public site.`)) return;
    startTransition(async () => {
      const r = await deactivateTherapistAction(therapist.id);
      if (r.ok) {
        toast.success("Therapist deactivated");
        router.refresh();
      } else toast.error(r.error);
    });
  }

  function reactivate() {
    startTransition(async () => {
      const r = await updateTherapistAction({ id: therapist.id, active: true });
      if (r.ok) {
        toast.success("Therapist reactivated");
        router.refresh();
      } else toast.error(r.error);
    });
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      <Link href={`/admin/therapists/${therapist.id}`}>
        <Button size="sm" variant="secondary">
          Edit
        </Button>
      </Link>
      {therapist.active ? (
        <Button size="sm" variant="ghost" onClick={deactivate} disabled={pending}>
          Deactivate
        </Button>
      ) : (
        <Button size="sm" variant="secondary" onClick={reactivate} disabled={pending}>
          Reactivate
        </Button>
      )}
    </div>
  );
}
