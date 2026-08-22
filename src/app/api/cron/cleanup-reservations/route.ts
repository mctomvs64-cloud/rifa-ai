import { NextResponse } from "next/server";
import { releaseExpiredReservations } from "@/lib/reservations";

export const dynamic = "force-dynamic";

/**
 * GET/POST /api/cron/cleanup-reservations
 * Endpoint para liberar reservas vencidas periodicamente ou sob demanda.
 */
export async function GET() {
  const result = await releaseExpiredReservations();
  return NextResponse.json({
    success: true,
    ...result,
    timestamp: new Date().toISOString(),
  });
}

export async function POST() {
  const result = await releaseExpiredReservations();
  return NextResponse.json({
    success: true,
    ...result,
    timestamp: new Date().toISOString(),
  });
}
