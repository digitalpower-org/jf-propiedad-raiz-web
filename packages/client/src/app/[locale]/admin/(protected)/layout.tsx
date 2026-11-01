import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
export const dynamic = 'force-dynamic';
export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const c = cookies();
  if (!c.get('__session')) redirect('/admin/login');
  return <>{children}</>;
}
