import { requireAccreditor } from "@/lib/session";
import { VoterActivityView } from "@/components/admin/VoterActivityView";

export const dynamic = "force-dynamic";

export default async function AccreditorVoterActivityPage({
  searchParams,
}: {
  searchParams: { mat?: string; epage?: string };
}) {
  await requireAccreditor();

  return (
    <VoterActivityView
      searchParams={searchParams}
      pickerBasePath="/accreditor/voter-activity"
      pickerLoginUrl="/accreditor/login"
    />
  );
}