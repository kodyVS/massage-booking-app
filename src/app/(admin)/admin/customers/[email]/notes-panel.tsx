"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { CustomerNoteDTO } from "@/backend";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import {
  addCustomerNoteAction,
  deleteCustomerNoteAction,
} from "../actions";

export function CustomerNotesPanel({
  customerEmail,
  notes,
}: {
  customerEmail: string;
  notes: CustomerNoteDTO[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [body, setBody] = useState("");

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    startTransition(async () => {
      const r = await addCustomerNoteAction(customerEmail, body.trim());
      if (r.ok) {
        toast.success("Note added");
        setBody("");
        router.refresh();
      } else toast.error(r.error);
    });
  }

  function del(id: string) {
    if (!confirm("Delete note?")) return;
    startTransition(async () => {
      const r = await deleteCustomerNoteAction(id, customerEmail);
      if (r.ok) {
        toast.success("Note deleted");
        router.refresh();
      } else toast.error(r.error);
    });
  }

  return (
    <section className="rounded-2xl bg-cream/80 p-5 ring-1 ring-coral/10">
      <p className="font-display text-xl text-coral-dark">Admin notes</p>
      <p className="mt-1 text-xs text-ink/60">
        Internal - not visible to the customer or therapists.
      </p>

      <form onSubmit={add} className="mt-3 space-y-2">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a private note about this customer…"
          rows={3}
          maxLength={5000}
        />
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={pending || !body.trim()}>
            {pending ? "Adding…" : "Add note"}
          </Button>
        </div>
      </form>

      <ul className="mt-4 space-y-2">
        {notes.length === 0 ? (
          <li className="text-sm text-ink/55">No notes yet.</li>
        ) : (
          notes.map((n) => (
            <li
              key={n.id}
              className="flex items-start gap-3 rounded-xl bg-blush/30 p-3 text-sm"
            >
              <div className="flex-1">
                <p className="whitespace-pre-wrap text-ink">{n.body}</p>
                <p className="mt-1 text-[11px] text-ink/55">
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => del(n.id)}
                disabled={pending}
                className="text-xs text-coral-dark hover:underline"
              >
                Delete
              </button>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
