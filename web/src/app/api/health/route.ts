import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      ok: true,
      service: "buddylocation-web",
      version: "v1",
      ts: Date.now(),
    },
    { status: 200 },
  );
}
