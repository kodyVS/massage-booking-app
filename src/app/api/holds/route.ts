import { NextRequest } from "next/server";
import { holdsController } from "@/backend";
import { withApiResponse } from "@/lib/api-response";
import { clientIpFrom, rateLimitOrFail } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const limited = await rateLimitOrFail("holds", clientIpFrom(req.headers));
  if (limited) return limited;
  return withApiResponse(async () => {
    const body = await req.json();
    return holdsController.create({ input: body });
  });
}
