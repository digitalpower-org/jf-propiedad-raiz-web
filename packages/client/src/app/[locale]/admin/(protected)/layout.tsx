import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
export const dynamic = 'force-dynamic';
export default async function ProtectedLayout({ children, params }: { children: React.ReactNode; params: { locale: string } }) {
  const cookieStore = await cookies();
  if (!cookieStore.get('__session')) redirect(`/${params.locale}/admin/login`);
  return <>{children}</>;
}
