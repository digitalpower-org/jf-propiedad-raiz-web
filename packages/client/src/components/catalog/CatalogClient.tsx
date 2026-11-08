'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Filters, type PropertyFilters } from '@/components/catalog/Filters';
import { PropertyGrid } from '@/components/catalog/PropertyGrid';
import type { PropertyListParams } from '@/lib/api-catalog';

interface CatalogClientProps {
  readonly operacion: 'VENTA' | 'ALQUILER' | 'PROYECTO_SOBRE_PLANOS';
  readonly locale: 'es' | 'en';
  readonly initialData?: import('@jf/shared-types').PropertyCard[];
}

function getInitialFilters(searchParams: URLSearchParams): PropertyFilters {
  const newFilters: PropertyFilters = {};
  if (searchParams.get('tipo')) newFilters.tipo = searchParams.get('tipo')!;
  if (searchParams.get('departamento')) newFilters.departamento = searchParams.get('departamento')!;
  if (searchParams.get('municipio')) newFilters.municipio = searchParams.get('municipio')!;
  if (searchParams.get('precioMin')) newFilters.precioMin = Number(searchParams.get('precioMin'));
  if (searchParams.get('precioMax')) newFilters.precioMax = Number(searchParams.get('precioMax'));
  // Note: dormitorios, banos, areaMin, estrato are frontend-only filters
  return newFilters;
}

export function CatalogClient({ operacion, locale, initialData }: CatalogClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<PropertyFilters>(() => getInitialFilters(searchParams));

  // Sync filters with URL changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Syncing state with URL changes is intentional
    setFilters(() => getInitialFilters(searchParams));
  }, [searchParams]);

  // Convert PropertyFilters to PropertyListParams for PropertyGrid
  const propertyListFilters: Partial<PropertyListParams> = {
    tipo: filters.tipo,
    departamento: filters.departamento,
    municipio: filters.municipio,
    precioMin: filters.precioMin,
    precioMax: filters.precioMax,
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      <aside className="lg:w-72 flex-shrink-0">
        <div className="sticky top-24">
          <Filters
            operacion={operacion}
            locale={locale}
            onFiltersChange={(newFilters) => {
              setFilters(newFilters);
              // Update URL
              const params = new URLSearchParams(searchParams.toString());
              if (newFilters.tipo) params.set('tipo', newFilters.tipo);
              else params.delete('tipo');
              if (newFilters.departamento) params.set('departamento', newFilters.departamento);
              else params.delete('departamento');
              if (newFilters.municipio) params.set('municipio', newFilters.municipio);
              else params.delete('municipio');
              if (newFilters.precioMin) params.set('precioMin', String(newFilters.precioMin));
              else params.delete('precioMin');
              if (newFilters.precioMax) params.set('precioMax', String(newFilters.precioMax));
              else params.delete('precioMax');
              const currentPath = window.location.pathname;
              const newUrl = params.toString()
                ? `${currentPath}?${params.toString()}`
                : currentPath;
              router.push(newUrl, { scroll: false });
            }}
          />
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <PropertyGrid
          operacion={operacion}
          locale={locale}
          initialData={initialData}
          filters={propertyListFilters}
        />
      </main>
    </div>
  );
}
