// La protección de /admin vive en (protected)/layout.tsx; este layout solo
// envuelve a sus hijos para que /admin/login quede fuera del grupo protegido.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
