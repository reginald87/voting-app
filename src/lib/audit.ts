import { prisma } from "./prisma";

export async function logAudit(opts: {
  actor: string;
  actorName: string;
  action: string;
  target?: string;
  detail?: string;
  ip?: string | null;
}) {
  await prisma.auditLog.create({
    data: {
      actor: opts.actor,
      actorName: opts.actorName,
      action: opts.action,
      target: opts.target ?? null,
      detail: opts.detail ?? null,
      ip: opts.ip ?? null,
    },
  });
}
