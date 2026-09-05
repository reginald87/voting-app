import { requireAccreditor } from "@/lib/session";
import { FaceAuditView } from "@/components/admin/FaceAuditView";

export const dynamic = "force-dynamic";

export default async function AccreditorFaceAuditPage({
  searchParams,
}: {
  searchParams: { vp?: string; pp?: string };
}) {
  await requireAccreditor();

  return <FaceAuditView searchParams={searchParams} />;
}