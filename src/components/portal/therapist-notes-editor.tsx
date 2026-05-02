"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { updateTherapistNotesAction } from "@/app/(admin)/admin/bookings/actions";

interface Props {
  bookingId: string;
  initial: string;
}

export function TherapistNotesEditor({ bookingId, initial }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(initial);
  const dirty = value !== initial;

  function save() {
    startTransition(async () => {
      const r = await updateTherapistNotesAction(bookingId, value);
      if (r.ok) {
        toast.success("Notes saved");
        router.refresh();
      } else toast.error(r.error);
    });
  }

  return (
    <div className="mt-3 space-y-2">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={5}
        maxLength={2000}
        placeholder="Internal notes, e.g. preferences, follow-up reminders…"
      />
      <div className="flex items-center justify-end gap-2">
        {dirty && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setValue(initial)}
            disabled={pending}
          >
            Discard
          </Button>
        )}
        <Button onClick={save} size="sm" disabled={pending || !dirty}>
          {pending ? "Saving…" : "Save notes"}
        </Button>
      </div>
    </div>
  );
}
