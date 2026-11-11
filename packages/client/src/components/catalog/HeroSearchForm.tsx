'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState, FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { getRoute } from '@/i18n/routes';
import { Select, Button, Group } from '@mantine/core';

import styles from './HeroSearchForm.module.css';

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
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const tSearch = useTranslations('search');

  const initialTipo = searchParams.get('tipo') || '';
  const initialDepartamento = searchParams.get('departamento') || '';
  const initialMunicipio = searchParams.get('municipio') || '';
  const initialPrecioMax = searchParams.get('precioMax') || '';

  const initialUbicacion =
    initialDepartamento && initialMunicipio
      ? `${initialDepartamento},${initialMunicipio}`
      : initialDepartamento;

  const initialOperacion: 'VENTA' | 'ALQUILER' | 'PROYECTO_SOBRE_PLANOS' =
    pathname.includes('/alquiler') || pathname.includes('/rent')
      ? 'ALQUILER'
      : pathname.includes('/proyectos') || pathname.includes('/projects')
        ? 'PROYECTO_SOBRE_PLANOS'
        : 'VENTA';

  const [tipo, setTipo] = useState(initialTipo);
  const [ubicacion, setUbicacion] = useState(initialUbicacion);
  const [precioMax, setPrecioMax] = useState(initialPrecioMax);
  const [operacion, setOperacion] = useState<'VENTA' | 'ALQUILER' | 'PROYECTO_SOBRE_PLANOS'>(
    initialOperacion,
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
      className={styles.searchForm}
      role="search"
      aria-label={tSearch('filters')}
    >
      <div className={styles.searchField}>
        <label htmlFor="hero-operacion" className={styles.searchLabel}>
          {tSearch('operation')}
        </label>
        <Select
          id="hero-operacion"
          data={OPERACION_OPTIONS[locale].map((opt) => ({
            value: opt.value,
            label: opt.label,
          }))}
          value={operacion}
          onChange={(value) =>
            setOperacion(value as 'VENTA' | 'ALQUILER' | 'PROYECTO_SOBRE_PLANOS')
          }
          placeholder={tSearch('operation')}
          size="sm"
          clearable
          rightSectionWidth={28}
        />
      </div>
      <div className={styles.searchField}>
        <label htmlFor="hero-tipo" className={styles.searchLabel}>
          {tSearch('propertyType')}
        </label>
        <Select
          id="hero-tipo"
          data={TIPO_OPTIONS[locale].map((opt) => ({
            value: opt.value,
            label: opt.label,
          }))}
          value={tipo}
          onChange={(value) => setTipo(value as string)}
          placeholder={tSearch('propertyType')}
          size="sm"
          clearable
          rightSectionWidth={28}
        />
      </div>
      <div className={styles.searchField}>
        <label htmlFor="hero-ubicacion" className={styles.searchLabel}>
          {tSearch('location')}
        </label>
        <Select
          id="hero-ubicacion"
          data={UBICACION_OPTIONS[locale].map((opt) => ({
            value: opt.value,
            label: opt.label,
          }))}
          value={ubicacion}
          onChange={(value) => setUbicacion(value as string)}
          placeholder={tSearch('location')}
          size="sm"
          clearable
          rightSectionWidth={28}
        />
      </div>
      <div className={styles.searchField}>
        <label htmlFor="hero-precio" className={styles.searchLabel}>
          {tSearch('priceMaxLabel')}
        </label>
        <Select
          id="hero-precio"
          data={PRECIO_OPTIONS[locale].map((opt) => ({
            value: opt.value,
            label: opt.label,
          }))}
          value={precioMax}
          onChange={(value) => setPrecioMax(value as string)}
          placeholder={tSearch('priceMaxLabel')}
          size="sm"
          clearable
          rightSectionWidth={28}
        />
      </div>
      <Group justify="right">
        <Button type="submit" className={styles.searchButton}>
          {tSearch('btnSearch')}
        </Button>
      </Group>
    </form>
  );
}
