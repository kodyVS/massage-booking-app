import { NextRequest } from "next/server";
import { holdsController } from "@/backend";
import { withApiResponse } from "@/lib/api-response";

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  return withApiResponse(async () => {
    const sessionId = req.nextUrl.searchParams.get("sessionId") ?? "";
    return holdsController.release({ input: { id, sessionId } });
  });
}
