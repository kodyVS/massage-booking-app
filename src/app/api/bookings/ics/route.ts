import { NextRequest } from "next/server";
import { bookingsController } from "@/backend";
import { apiError } from "@/lib/api-response";

/** GET /api/bookings/ics?token=<manageToken> — returns text/calendar */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  try {
    const { filename, body } = await bookingsController.getICS({
      input: { manageToken: token },
    });
    return new Response(body, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    return apiError(err);
  }
}
