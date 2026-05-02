import { NextRequest } from "next/server";
import { bookingsController } from "@/backend";
import { withApiResponse } from "@/lib/api-response";

// `id` is the magic-link manage token for public flows. Phase 3 portals will
// use server actions with role-based context instead of these endpoints.

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: manageToken } = await ctx.params;
  return withApiResponse(async () => {
    const body = await req.json();
    return bookingsController.reschedule({
      input: { manageToken, newStartAt: body.newStartAt },
    });
  });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: manageToken } = await ctx.params;
  return withApiResponse(async () => {
    const reason = req.nextUrl.searchParams.get("reason") ?? undefined;
    return bookingsController.cancel({ input: { manageToken, reason } });
  });
}
