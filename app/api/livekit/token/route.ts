import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { createClient, getSessionProfile, isStaff } from "@/lib/supabase/server";
import { createToken } from "@/lib/livekit";
import type { Majlis } from "@/lib/types";

export async function GET(req: NextRequest) {
  const majlisId = req.nextUrl.searchParams.get("majlisId");
  const wantHost = req.nextUrl.searchParams.get("role") === "host";
  if (!majlisId) return NextResponse.json({ error: "majlisId required" }, { status: 400 });

  const supabase = await createClient();
  const { data: m } = await supabase.from("majlis").select("*").eq("id", majlisId).single<Majlis>();
  if (!m) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { userId, profile } = await getSessionProfile();
  const host = wantHost && isStaff(profile);
  if (wantHost && !host) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!host && m.status !== "live") return NextResponse.json({ error: "not live" }, { status: 409 });

  const token = await createToken({
    room: m.livekit_room,
    identity: host ? `host-${userId}` : userId ? `u-${userId}` : `guest-${randomUUID().slice(0, 8)}`,
    name: profile?.display_name || "guest",
    canPublish: host,
  });

  return NextResponse.json({ token, url: process.env.NEXT_PUBLIC_LIVEKIT_URL });
}
