import { BookRedirect } from '../../components/BookRedirect';

export default async function BookPage({
  params,
}: {
  params: Promise<{ bookId: string }>;
}) {
  const { bookId } = await params;
  return <BookRedirect bookId={bookId} />;
}
