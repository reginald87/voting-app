import { requireAccreditor } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AccreditationManager } from "@/components/admin/AccreditationManager";

export const dynamic = "force-dynamic";

export default async function AccreditorAccreditationPage() {
  await requireAccreditor();
  const [voters, total, accredited] = await Promise.all([
    prisma.voter.findMany({
      orderBy: [{ accredited: "asc" }, { createdAt: "desc" }],
      take: 200,
      include: { _count: { select: { votes: true } } },
    }),
    prisma.voter.count(),
    prisma.voter.count({ where: { accredited: true } }),
  ]);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-bold text-ink">Accreditation</h1>
      <p className="mt-1 text-sm text-slate-500">
        Verify SUG receipts and accredit voters to enable voting.
      </p>
      <div className="mt-6">
        <AccreditationManager
          initialVoters={voters.map((v) => ({
            id: v.id,
            matNumber: v.matNumber,
            email: v.email,
            firstName: v.firstName,
            lastName: v.lastName,
            department: v.department,
            level: v.level,
            sugReceipt: v.sugReceipt,
            sugReceiptUrl: v.sugReceiptUrl,
            accredited: v.accredited,
            _count: { votes: v._count.votes },
          }))}
          initialTotal={total}
          initialAccredited={accredited}
          loginUrl="/accreditor/login"
        />
      </div>
    </div>
  );
}
