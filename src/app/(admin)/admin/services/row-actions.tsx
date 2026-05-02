"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { ServiceDTO } from "@/backend";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { deactivateServiceAction, updateServiceAction } from "./actions";

export function ServiceRowActions({ service }: { service: ServiceDTO }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  function deactivate() {
    if (!confirm(`Deactivate ${service.name}?`)) return;
    startTransition(async () => {
      const r = await deactivateServiceAction(service.id);
      if (r.ok) {
        toast.success("Service deactivated");
        router.refresh();
      } else toast.error(r.error);
    });
  }

  function reactivate() {
    startTransition(async () => {
      const r = await updateServiceAction({ id: service.id, active: true });
      if (r.ok) {
        toast.success("Service reactivated");
        router.refresh();
      } else toast.error(r.error);
    });
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      <Link href={`/admin/services/${service.id}`}>
        <Button size="sm" variant="secondary">
          Edit
        </Button>
      </Link>
      {service.active ? (
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
