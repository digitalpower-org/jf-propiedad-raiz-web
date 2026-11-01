import Link from 'next/link';

export default function AdminPage() {
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">Panel de Administración</h1>
      <p className="mt-2">Bienvenido al área de administración.</p>
      <Link href="/admin/login" className="mt-4 inline-block text-blue-600 underline">
        Cerrar sesión
      </Link>
    </div>
  );
}
