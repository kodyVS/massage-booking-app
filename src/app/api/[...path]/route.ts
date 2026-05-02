import { NextRequest, NextResponse } from "next/server";
import { match } from "../_lib/router";
import {
  availabilityController,
  bookingsController,
  cronController,
  holdsController,
} from "@/backend";
import { withApiResponse, apiError } from "@/lib/api-response";
import { clientIpFrom, rateLimitOrFail } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const notFound = () =>
  NextResponse.json(
    { ok: false, error: { code: "NOT_FOUND", message: "Not found" } },
    { status: 404 },
  );

// ─── GET ────────────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const parts = (await ctx.params).path;

  if (match(parts, "availability")) return handleAvailability(req);
  if (match(parts, "bookings/ics")) return handleBookingsIcs(req);
  if (match(parts, "cron/reminders")) return handleCronReminders(req);

  return notFound();
}

// ─── POST ───────────────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const parts = (await ctx.params).path;

  if (match(parts, "bookings")) return handleCreateBooking(req);
  if (match(parts, "holds")) return handleCreateHold(req);

  return notFound();
}

// ─── PATCH ──────────────────────────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const parts = (await ctx.params).path;

  const m = match(parts, "bookings/:id");
  if (m) return handleRescheduleBooking(req, m.id);

  return notFound();
}

// ─── DELETE ─────────────────────────────────────────────────────────────────

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const parts = (await ctx.params).path;

  let m = match(parts, "bookings/:id");
  if (m) return handleCancelBooking(req, m.id);

  m = match(parts, "holds/:id");
  if (m) return handleReleaseHold(req, m.id);

  return notFound();
}

// ─── Handlers ───────────────────────────────────────────────────────────────

function handleAvailability(req: NextRequest) {
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

async function handleBookingsIcs(req: NextRequest) {
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

function handleCronReminders(req: NextRequest) {
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

async function handleCreateBooking(req: NextRequest) {
  const ip = clientIpFrom(req.headers);
  const limited = await rateLimitOrFail("bookings", ip);
  if (limited) return limited;
  return withApiResponse(async () => {
    const body = await req.json();
    return bookingsController.create({ input: body, context: { ip } });
  });
}

async function handleCreateHold(req: NextRequest) {
  const limited = await rateLimitOrFail("holds", clientIpFrom(req.headers));
  if (limited) return limited;
  return withApiResponse(async () => {
    const body = await req.json();
    return holdsController.create({ input: body });
  });
}

function handleRescheduleBooking(req: NextRequest, manageToken: string) {
  return withApiResponse(async () => {
    const body = await req.json();
    return bookingsController.reschedule({
      input: { manageToken, newStartAt: body.newStartAt },
    });
  });
}

function handleCancelBooking(req: NextRequest, manageToken: string) {
  return withApiResponse(async () => {
    const reason = req.nextUrl.searchParams.get("reason") ?? undefined;
    return bookingsController.cancel({ input: { manageToken, reason } });
  });
}

function handleReleaseHold(req: NextRequest, id: string) {
  return withApiResponse(async () => {
    const sessionId = req.nextUrl.searchParams.get("sessionId") ?? "";
    return holdsController.release({ input: { id, sessionId } });
  });
}
