import { NextRequest, NextResponse } from "next/server";

type TelemetryRequestBody = {
  event?: string;
  level?: "info" | "warn" | "error";
  message?: string;
  path?: string;
  ts?: number;
  data?: Record<string, unknown>;
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as TelemetryRequestBody;
    const telemetryLine = {
      event: body.event ?? "unknown_event",
      level: body.level ?? "info",
      message: body.message ?? null,
      path: body.path ?? null,
      ts: body.ts ?? Date.now(),
      data: body.data ?? {},
      userAgent: request.headers.get("user-agent") ?? "unknown",
      forwardedFor: request.headers.get("x-forwarded-for") ?? "unknown",
    };

    console.log("[telemetry]", JSON.stringify(telemetryLine));
    return NextResponse.json({ ok: true }, { status: 202 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
