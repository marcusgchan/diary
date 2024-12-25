import { EditMapForm } from "./EditMapForm";

export default function EditMapPage({
  params,
}: {
  params: { diaryId: string; entryId: string };
}) {
  return (
    <EditMapForm
      diaryId={Number(params.diaryId)}
      entryId={Number(params.entryId)}
    />
  );
}
