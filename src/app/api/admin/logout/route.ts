import { NextResponse } from "next/server";
import { destroyAdminSession } from "@/lib/session";
import { redirect } from "next/navigation";

export async function POST() {
  await destroyAdminSession();
  return NextResponse.json({ ok: true });
}

export async function GET() {
  await destroyAdminSession();
  redirect("/admin/login");
}
