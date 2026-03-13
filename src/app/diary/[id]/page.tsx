import { DiaryView } from '../../pages/DiaryView';

export default async function DiaryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ bookId?: string; open?: string; focus?: string }>;
}) {
  const { id } = await params;
  const { bookId, open, focus } = await searchParams;
  return (
    <DiaryView
      id={id}
      bookId={bookId ?? undefined}
      initialOpen={open === '1'}
      initialFocusContent={focus === '1'}
    />
  );
}
