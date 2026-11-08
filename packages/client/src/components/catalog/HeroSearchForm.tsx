'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { getRoute } from '@/i18n/routes';

const TIPO_OPTIONS = {
  es: [
    { value: '', label: 'Todos los tipos' },
    { value: 'CASA', label: 'Casa' },
    { value: 'APARTAMENTO', label: 'Apartamento' },
    { value: 'LOTE_CAMPESTRE', label: 'Lote Campestre' },
    { value: 'LOTE_URBANO', label: 'Lote Urbano' },
    { value: 'FINCA', label: 'Finca' },
    { value: 'LOCAL_COMERCIAL', label: 'Local Comercial' },
    { value: 'BODEGA', label: 'Bodega' },
    { value: 'OFICINA', label: 'Oficina' },
  ],
  en: [
    { value: '', label: 'All Types' },
    { value: 'CASA', label: 'House' },
    { value: 'APARTAMENTO', label: 'Apartment' },
    { value: 'LOTE_CAMPESTRE', label: 'Country Lot' },
    { value: 'LOTE_URBANO', label: 'Urban Lot' },
    { value: 'FINCA', label: 'Farm' },
    { value: 'LOCAL_COMERCIAL', label: 'Commercial Space' },
    { value: 'BODEGA', label: 'Warehouse' },
    { value: 'OFICINA', label: 'Office' },
  ],
};

const UBICACION_OPTIONS = {
  es: [
    { value: '', label: 'Todas las ubicaciones' },
    { value: 'Antioquia,Medellín', label: 'Medellín, Antioquia' },
    { value: 'Antioquia,Envigado', label: 'Envigado, Antioquia' },
    { value: 'Antioquia,Itagüí', label: 'Itagüí, Antioquia' },
    { value: 'Antioquia,Bello', label: 'Bello, Antioquia' },
    { value: 'Antioquia,Sabaneta', label: 'Sabaneta, Antioquia' },
    { value: 'Antioquia,Rionegro', label: 'Rionegro, Antioquia' },
    { value: 'Antioquia,Copacabana', label: 'Copacabana, Antioquia' },
  ],
  en: [
    { value: '', label: 'All Locations' },
    { value: 'Antioquia,Medellín', label: 'Medellín, Antioquia' },
    { value: 'Antioquia,Envigado', label: 'Envigado, Antioquia' },
    { value: 'Antioquia,Itagüí', label: 'Itagüí, Antioquia' },
    { value: 'Antioquia,Bello', label: 'Bello, Antioquia' },
    { value: 'Antioquia,Sabaneta', label: 'Sabaneta, Antioquia' },
    { value: 'Antioquia,Rionegro', label: 'Rionegro, Antioquia' },
    { value: 'Antioquia,Copacabana', label: 'Copacabana, Antioquia' },
  ],
};

const PRECIO_OPTIONS = {
  es: [
    { value: '', label: 'Sin límite' },
    { value: '200000000', label: '$ 200.000.000' },
    { value: '400000000', label: '$ 400.000.000' },
    { value: '600000000', label: '$ 600.000.000' },
    { value: '800000000', label: '$ 800.000.000' },
    { value: '1000000000', label: '$ 1.000.000.000' },
    { value: '2000000000', label: '$ 2.000.000.000+' },
  ],
  en: [
    { value: '', label: 'No Limit' },
    { value: '200000000', label: '$ 200.000.000' },
    { value: '400000000', label: '$ 400.000.000' },
    { value: '600000000', label: '$ 600.000.000' },
    { value: '800000000', label: '$ 800.000.000' },
    { value: '1000000000', label: '$ 1.000.000.000' },
    { value: '2000000000', label: '$ 2.000.000.000+' },
  ],
};

const OPERACION_OPTIONS = {
  es: [
    { value: 'VENTA', label: 'Venta' },
    { value: 'ALQUILER', label: 'Alquiler' },
    { value: 'PROYECTO_SOBRE_PLANOS', label: 'Proyectos' },
  ],
  en: [
    { value: 'VENTA', label: 'For Sale' },
    { value: 'ALQUILER', label: 'For Rent' },
    { value: 'PROYECTO_SOBRE_PLANOS', label: 'Projects' },
  ],
};

interface HeroSearchFormProps {
  readonly locale: 'es' | 'en';
}

export function HeroSearchForm({ locale }: HeroSearchFormProps) {
  const router = useRouter();
  const tSearch = useTranslations('search');

  const [tipo, setTipo] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [precioMax, setPrecioMax] = useState('');
  const [operacion, setOperacion] = useState<'VENTA' | 'ALQUILER' | 'PROYECTO_SOBRE_PLANOS'>(
    'VENTA',
  );

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const params = new URLSearchParams();
    if (tipo) params.set('tipo', tipo);
    if (ubicacion) {
      const [departamento, municipio] = ubicacion.split(',');
      if (departamento) params.set('departamento', departamento);
      if (municipio) params.set('municipio', municipio);
    }
    if (precioMax) params.set('precioMax', precioMax);
    params.set('destacada', 'false');

    const targetRoute = getRoute(
      operacion === 'VENTA' ? 'sale' : operacion === 'ALQUILER' ? 'rent' : 'projects',
      locale,
    );
    const url = params.toString() ? `${targetRoute}?${params.toString()}` : targetRoute;
    router.push(url, { scroll: false });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="searchForm"
      role="search"
      aria-label={tSearch('filters')}
    >
      <div className="searchField">
        <label htmlFor="hero-operacion" className="searchLabel">
          {locale === 'es' ? 'Operación' : 'Operation'}
        </label>
        <select
          id="hero-operacion"
          className="searchSelect"
          value={operacion}
          onChange={(e) =>
            setOperacion(e.target.value as 'VENTA' | 'ALQUILER' | 'PROYECTO_SOBRE_PLANOS')
          }
        >
          {OPERACION_OPTIONS[locale].map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div className="searchField">
        <label htmlFor="hero-tipo" className="searchLabel">
          {locale === 'es' ? 'Tipo de inmueble' : 'Property Type'}
        </label>
        <select
          id="hero-tipo"
          className="searchSelect"
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
        >
          {TIPO_OPTIONS[locale].map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div className="searchField">
        <label htmlFor="hero-ubicacion" className="searchLabel">
          {locale === 'es' ? 'Ubicación' : 'Location'}
        </label>
        <select
          id="hero-ubicacion"
          className="searchSelect"
          value={ubicacion}
          onChange={(e) => setUbicacion(e.target.value)}
        >
          {UBICACION_OPTIONS[locale].map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div className="searchField">
        <label htmlFor="hero-precio" className="searchLabel">
          {locale === 'es' ? 'Precio máximo (COP)' : 'Max Price (COP)'}
        </label>
        <select
          id="hero-precio"
          className="searchSelect"
          value={precioMax}
          onChange={(e) => setPrecioMax(e.target.value)}
        >
          {PRECIO_OPTIONS[locale].map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <button type="submit" className="searchButton">
        {locale === 'es' ? 'Buscar' : 'Search'}
      </button>
    </form>
  );
}
