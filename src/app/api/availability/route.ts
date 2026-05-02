import { NextRequest } from "next/server";
import { availabilityController } from "@/backend";
import { withApiResponse } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  return withApiResponse(async () => {
    const mode = sp.get("mode");
    if (mode === "first-available") {
      return availabilityController.firstAvailable({
        input: {
          serviceId: sp.get("serviceId") ?? "",
          fromDate: sp.get("fromDate") ?? undefined,
          daysAhead: sp.get("daysAhead") ? Number(sp.get("daysAhead")) : 14,
        },
      });
    }
    if (mode === "by-service") {
      return availabilityController.slotsByService({
        input: {
          serviceId: sp.get("serviceId") ?? "",
          date: sp.get("date") ?? "",
        },
      });
    }
    return availabilityController.list({
      input: {
        therapistId: sp.get("therapistId") ?? "",
        serviceId: sp.get("serviceId") ?? "",
        date: sp.get("date") ?? "",
      },
    });
  });
}
