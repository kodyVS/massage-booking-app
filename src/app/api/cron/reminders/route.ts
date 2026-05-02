import { NextRequest, NextResponse } from "next/server";
import { cronController } from "@/backend";
import { withApiResponse } from "@/lib/api-response";

/** Vercel Cron hits this every 15 min (see vercel.json). */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    req.headers.get("x-cron-secret");
  if (!secret || provided !== secret) {
    return NextResponse.json(
      { ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
      { status: 401 },
    );
  }
  return withApiResponse(() => cronController.sendReminders());
}
