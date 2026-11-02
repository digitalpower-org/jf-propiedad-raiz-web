import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
export const dynamic = 'force-dynamic';
export default async function ProtectedLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const cookieStore = await cookies();
  if (!cookieStore.get('__session')) redirect(`/${locale}/admin/login`);
  return <>{children}</>;
}
