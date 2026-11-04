'use client';
import { Filters } from '@/components/catalog/Filters';
import { PropertyGrid } from '@/components/catalog/PropertyGrid';

interface CatalogClientProps {
  readonly operacion: 'VENTA' | 'ALQUILER' | 'PROYECTO_SOBRE_PLANOS';
  readonly locale: 'es' | 'en';
  readonly initialData?: import('@jf/shared-types').PropertyCard[];
}

export function CatalogClient({ operacion, locale, initialData }: CatalogClientProps) {
  return (
    <div className="flex flex-col lg:flex-row gap-8">
      <aside className="lg:w-72 flex-shrink-0">
        <div className="sticky top-24">
          <Filters operacion={operacion} locale={locale} />
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <PropertyGrid operacion={operacion} locale={locale} initialData={initialData} />
      </main>
    </div>
  );
}