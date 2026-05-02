import { NextRequest } from "next/server";
import { bookingsController } from "@/backend";
import { withApiResponse } from "@/lib/api-response";
import { clientIpFrom, rateLimitOrFail } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ip = clientIpFrom(req.headers);
  const limited = await rateLimitOrFail("bookings", ip);
  if (limited) return limited;
  return withApiResponse(async () => {
    const body = await req.json();
    return bookingsController.create({ input: body, context: { ip } });
  });
}
