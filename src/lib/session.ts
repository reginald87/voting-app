import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes, createHmac } from "crypto";
import { prisma } from "./prisma";

const SESSION_COOKIE = "bmu_session";
const ADMIN_COOKIE = "bmu_admin";
const SECRET = process.env.SESSION_SECRET || "dev-insecure-secret-change-me";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

function sign(value: string) {
  const mac = createHmac("sha256", SECRET).update(value).digest("base64url");
  return `${value}.${mac}`;
}

function unsign(signed: string | undefined): string | null {
  if (!signed) return null;
  const idx = signed.lastIndexOf(".");
  if (idx < 0) return null;
  const value = signed.slice(0, idx);
  const mac = signed.slice(idx + 1);
  const expected = createHmac("sha256", SECRET).update(value).digest("base64url");
  if (mac.length !== expected.length) return null;
  let mismatch = 0;
  for (let i = 0; i < mac.length; i++) {
    mismatch |= mac.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0 ? value : null;
}

export async function createVoterSession(voterId: number) {
  const id = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.session.create({ data: { id, voterId, expiresAt } });
  cookies().set(SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
  return id;
}

export async function destroyVoterSession() {
  const id = cookies().get(SESSION_COOKIE)?.value;
  if (id) {
    await prisma.session.deleteMany({ where: { id } });
    cookies().delete(SESSION_COOKIE);
  }
}

export async function getVoter() {
  const id = cookies().get(SESSION_COOKIE)?.value;
  if (!id) return null;
  const session = await prisma.session.findUnique({
    where: { id },
    include: { voter: true },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id } }).catch(() => {});
    return null;
  }
  return session.voter;
}

export async function createAdminSession(adminId: number) {
  const value = sign(String(adminId));
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  cookies().set(ADMIN_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroyAdminSession() {
  cookies().delete(ADMIN_COOKIE);
}

export async function getAdmin() {
  const value = cookies().get(ADMIN_COOKIE)?.value;
  const raw = unsign(value);
  if (!raw) return null;
  const admin = await prisma.admin.findUnique({ where: { id: Number(raw) } });
  return admin;
}

export async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
