'use client';
import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Filters } from '@/components/catalog/Filters';
import { PropertyGrid } from '@/components/catalog/PropertyGrid';
import { filtrosParaApi, leerFiltrosDeUrl, leerFiltrosFrontend } from '@/lib/catalog-filters';

interface CatalogClientProps {
  readonly operacion: 'VENTA' | 'ALQUILER' | 'PROYECTO_SOBRE_PLANOS';
  readonly locale: 'es' | 'en';
  readonly initialData?: import('@jf/shared-types').PropertyCard[];
}

export function CatalogClient({ operacion, locale, initialData }: CatalogClientProps) {
  const searchParams = useSearchParams();

  // La URL es la única fuente de verdad (AC2.2.2): los filtros se derivan de ella.
  const filtros = useMemo(
    () => leerFiltrosDeUrl(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );
  const filtrosApi = useMemo(() => filtrosParaApi(filtros), [filtros]);
  // Dormitorios, baños, área y estrato se filtran en el navegador, nunca en la API (D9).
  const filtrosFrontend = useMemo(() => leerFiltrosFrontend(filtros), [filtros]);

  // Los datos iniciales del servidor no están filtrados: con un filtro de base de datos activo
  // se descartan para que no se mezclen tarjetas que no cumplen el filtro.
  const hayFiltrosBd = Object.keys(filtrosApi).length > 0;

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
          initialData={hayFiltrosBd ? undefined : initialData}
          filters={filtrosApi}
          frontendFilters={filtrosFrontend}
        />
      </main>
    </div>
  );
}
