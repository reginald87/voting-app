import { NextResponse } from "next/server";
import { destroyVoterSession } from "@/lib/session";

export async function POST() {
  await destroyVoterSession();
  return NextResponse.json({ ok: true });
}

export async function GET() {
  await destroyVoterSession();
  return NextResponse.redirect("/");
}
