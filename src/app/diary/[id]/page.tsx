import { DiaryView } from '../../pages/DiaryView';

export default async function DiaryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ bookId?: string }>;
}) {
  const { id } = await params;
  const { bookId } = await searchParams;
  return <DiaryView id={id} bookId={bookId ?? undefined} />;
}
