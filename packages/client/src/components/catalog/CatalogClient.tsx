'use client';
import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Filters } from '@/components/catalog/Filters';
import { PropertyGrid } from '@/components/catalog/PropertyGrid';
import { filtrosParaApi, leerFiltrosDeUrl, leerFiltrosFrontend } from '@/lib/catalog-filters';

interface CatalogClientProps {
  readonly operacion: 'VENTA' | 'ALQUILER' | 'PROYECTO_SOBRE_PLANOS';
  readonly locale: 'es' | 'en';
}

export function CatalogClient({ operacion, locale }: CatalogClientProps) {
  const searchParams = useSearchParams();

  // La URL es la única fuente de verdad (AC2.2.2): los filtros se derivan de ella.
  const filtros = useMemo(
    () => leerFiltrosDeUrl(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );
  const filtrosApi = useMemo(() => filtrosParaApi(filtros), [filtros]);
  // Dormitorios, baños, área y estrato se filtran en el navegador, nunca en la API (D9).
  const filtrosFrontend = useMemo(() => leerFiltrosFrontend(filtros), [filtros]);

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      <aside className="lg:w-72 flex-shrink-0">
        <div className="sticky top-24">
          <Filters operacion={operacion} locale={locale} />
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <PropertyGrid
          operacion={operacion}
          locale={locale}
          filters={filtrosApi}
          frontendFilters={filtrosFrontend}
        />
      </main>
    </div>
  );
}
