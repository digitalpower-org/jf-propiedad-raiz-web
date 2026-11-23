'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { Select, Input, Button, Group, Text, Grid, Divider } from '@mantine/core';
import type { Operacion } from '@jf/shared-types';
import styles from './Filters.module.css';
import { DEPARTAMENTOS, municipiosDe } from '@/lib/consignment/locations';
import {
  TIPOS_INMUEBLE_CATALOGO,
  leerFiltrosDeUrl,
  tieneErrores,
  validarFiltros,
  type PropertyFilters,
} from '@/lib/catalog-filters';

export type { PropertyFilters };

interface FiltersProps {
  readonly operacion: Operacion;
  readonly locale: 'es' | 'en';
  readonly initialFilters?: PropertyFilters;
}

/**
 * Panel de filtros del catálogo. La URL es la única fuente de verdad (AC2.2.2): «Aplicar» solo
 * la escribe, y quien consume los filtros (CatalogClient) los lee de ella.
 */
export function Filters({ operacion: _operacion, locale, initialFilters }: FiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Helper to parse searchParams into initial state
  const getInitialState = (params: URLSearchParams) => {
    const filtros = leerFiltrosDeUrl(params);
    return {
      tipo: filtros.tipo ?? '',
      departamento: filtros.departamento ?? '',
      municipio: filtros.municipio ?? '',
      precioMin: params.get('precioMin') || '',
      precioMax: params.get('precioMax') || '',
      dormitorios: filtros.dormitorios ?? '',
      banos: filtros.banos ?? '',
      areaMin: filtros.areaMin ?? '',
      estrato: filtros.estrato ?? '',
    };
  };

  const initialState = getInitialState(searchParams);

  // Merge URL params with initialFilters prop (prop takes precedence)
  const mergedTipo = initialFilters?.tipo ?? initialState.tipo;
  const mergedDepartamento = initialFilters?.departamento ?? initialState.departamento;
  const mergedMunicipio = initialFilters?.municipio ?? initialState.municipio;
  const mergedPrecioMin = initialFilters?.precioMin
    ? String(initialFilters.precioMin)
    : initialState.precioMin;
  const mergedPrecioMax = initialFilters?.precioMax
    ? String(initialFilters.precioMax)
    : initialState.precioMax;
  const mergedDormitorios = initialFilters?.dormitorios ?? initialState.dormitorios;
  const mergedBanos = initialFilters?.banos ?? initialState.banos;
  const mergedAreaMin = initialFilters?.areaMin ?? initialState.areaMin;
  const mergedEstrato = initialFilters?.estrato ?? initialState.estrato;

  const [tipo, setTipo] = useState<string>(mergedTipo);
  const [departamento, setDepartamento] = useState<string>(mergedDepartamento);
  const [municipio, setMunicipio] = useState<string>(mergedMunicipio);
  const [precioMin, setPrecioMin] = useState<string>(mergedPrecioMin);
  const [precioMax, setPrecioMax] = useState<string>(mergedPrecioMax);
  const [dormitorios, setDormitorios] = useState<string>(mergedDormitorios);
  const [banos, setBanos] = useState<string>(mergedBanos);
  const [areaMin, setAreaMin] = useState<string>(mergedAreaMin);
  const [estrato, setEstrato] = useState<string>(mergedEstrato);

  // Sync with URL changes (only after initial render)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    const newState = getInitialState(params);
    setTipo(newState.tipo);
    setDepartamento(newState.departamento);
    setMunicipio(newState.municipio);
    setPrecioMin(newState.precioMin);
    setPrecioMax(newState.precioMax);
    setDormitorios(newState.dormitorios);
    setBanos(newState.banos);
    setAreaMin(newState.areaMin);
    setEstrato(newState.estrato);
  }, [searchParams]);

  // AC2.2.3: las combinaciones que el backend rechazaría se impiden antes de pedir.
  const errores = validarFiltros({
    departamento: departamento || undefined,
    municipio: municipio || undefined,
    precioMin: precioMin === '' ? undefined : Number(precioMin),
    precioMax: precioMax === '' ? undefined : Number(precioMax),
  });
  const hayErrores = tieneErrores(errores);

  const updateUrl = () => {
    const params = new URLSearchParams();
    if (tipo) params.set('tipo', tipo);
    if (departamento) params.set('departamento', departamento);
    if (municipio) params.set('municipio', municipio);
    if (precioMin) params.set('precioMin', precioMin);
    if (precioMax) params.set('precioMax', precioMax);
    if (dormitorios) params.set('dormitorios', dormitorios);
    if (banos) params.set('banos', banos);
    if (areaMin) params.set('areaMin', areaMin);
    if (estrato) params.set('estrato', estrato);

    const currentPath = window.location.pathname;
    const newUrl = params.toString() ? `${currentPath}?${params.toString()}` : currentPath;
    router.push(newUrl, { scroll: false });
  };

  const handleClear = () => {
    setTipo('');
    setDepartamento('');
    setMunicipio('');
    setPrecioMin('');
    setPrecioMax('');
    setDormitorios('');
    setBanos('');
    setAreaMin('');
    setEstrato('');
    router.push(window.location.pathname, { scroll: false });
  };

  const hasActiveFilters =
    tipo ||
    departamento ||
    municipio ||
    precioMin ||
    precioMax ||
    dormitorios ||
    banos ||
    areaMin ||
    estrato;

  const t = {
    es: {
      title: 'Filtros',
      tipo: 'Tipo de inmueble',
      departamento: 'Departamento',
      municipio: 'Municipio',
      precio: 'Rango de precio (COP)',
      min: 'Mín',
      max: 'Máx',
      dormitorios: 'Dormitorios mín.',
      banos: 'Baños mín.',
      area: 'Área mín. (m²)',
      estrato: 'Estrato',
      aplicar: 'Aplicar',
      limpiar: 'Limpiar',
      clearAll: 'Limpiar todos',
      errUbicacion: 'Elige también el municipio.',
      errPrecioRango: 'El precio mínimo no puede ser mayor que el máximo.',
      errPrecioFormato: 'Escribe precios enteros, sin signo ni decimales.',
    },
    en: {
      title: 'Filters',
      tipo: 'Property Type',
      departamento: 'Department',
      municipio: 'Municipality',
      precio: 'Price Range (COP)',
      min: 'Min',
      max: 'Max',
      dormitorios: 'Min Bedrooms',
      banos: 'Min Bathrooms',
      area: 'Min Area (m²)',
      estrato: 'Stratum',
      aplicar: 'Apply',
      limpiar: 'Clear',
      clearAll: 'Clear All',
      errUbicacion: 'Please choose a municipality too.',
      errPrecioRango: 'The minimum price cannot be greater than the maximum.',
      errPrecioFormato: 'Enter whole prices, without sign or decimals.',
    },
  }[locale];

  const municipioOptions = municipiosDe(departamento);
  const tipoOptions = TIPOS_INMUEBLE_CATALOGO.map((opt) => ({
    value: opt.value,
    label: opt.label[locale],
  }));

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>{t.title}</h2>
        {hasActiveFilters && (
          <Button
            variant="subtle"
            color="gray"
            size="sm"
            onClick={handleClear}
            className={styles.clearAllBtn}
          >
            {t.clearAll}
          </Button>
        )}
      </div>

      <Grid className={styles.grid}>
        {/* Tipo de inmueble (un solo valor, D28) */}
        <div className={`${styles.field} ${styles.fieldSpan2}`}>
          <Text size="sm" fw={500} c="dimmed" className={styles.label}>
            {t.tipo}
          </Text>
          <Select
            placeholder={t.tipo}
            value={tipo || null}
            onChange={(value) => setTipo(value || '')}
            data={tipoOptions}
            size="sm"
            clearable
          />
        </div>

        {/* Ubicación - Departamento */}
        <div className={styles.field}>
          <Text size="sm" fw={500} c="dimmed" className={styles.label}>
            {t.departamento}
          </Text>
          <Select
            placeholder={t.departamento}
            value={departamento || null}
            onChange={(value) => {
              setDepartamento(value || '');
              setMunicipio('');
            }}
            data={[...DEPARTAMENTOS]}
            size="sm"
            clearable
          />
        </div>

        {/* Ubicación - Municipio */}
        <div className={styles.field}>
          <Text size="sm" fw={500} c="dimmed" className={styles.label}>
            {t.municipio}
          </Text>
          <Select
            placeholder={t.municipio}
            value={municipio || null}
            onChange={(value) => setMunicipio(value || '')}
            data={[...municipioOptions]}
            size="sm"
            clearable
            disabled={!departamento}
            error={errores.ubicacion && departamento ? t.errUbicacion : undefined}
          />
        </div>

        {/* Precio */}
        <div className={styles.field}>
          <Text size="sm" fw={500} c="dimmed" className={styles.label}>
            {t.precio}
          </Text>
          <Grid gap={2} className={styles.priceGrid}>
            <Input
              type="number"
              placeholder={t.min}
              value={precioMin}
              onChange={(e) => setPrecioMin(e.target.value)}
              size="sm"
              min={0}
              step={100000}
              error={errores.precio !== null}
            />
            <Input
              type="number"
              placeholder={t.max}
              value={precioMax}
              onChange={(e) => setPrecioMax(e.target.value)}
              size="sm"
              min={0}
              step={100000}
              error={errores.precio !== null}
            />
          </Grid>
          {errores.precio !== null && (
            <Text size="xs" c="red" role="alert">
              {errores.precio === 'rango' ? t.errPrecioRango : t.errPrecioFormato}
            </Text>
          )}
        </div>

        {/* Dormitorios */}
        <div className={styles.field}>
          <Text size="sm" fw={500} c="dimmed" className={styles.label}>
            {t.dormitorios}
          </Text>
          <Select
            placeholder={t.dormitorios}
            value={dormitorios || null}
            onChange={(value) => setDormitorios(value || '')}
            data={[
              { value: '1', label: '1+' },
              { value: '2', label: '2+' },
              { value: '3', label: '3+' },
              { value: '4', label: '4+' },
              { value: '5', label: '5+' },
            ]}
            size="sm"
            clearable
          />
        </div>

        {/* Baños */}
        <div className={styles.field}>
          <Text size="sm" fw={500} c="dimmed" className={styles.label}>
            {t.banos}
          </Text>
          <Select
            placeholder={t.banos}
            value={banos || null}
            onChange={(value) => setBanos(value || '')}
            data={[
              { value: '1', label: '1+' },
              { value: '2', label: '2+' },
              { value: '3', label: '3+' },
              { value: '4', label: '4+' },
            ]}
            size="sm"
            clearable
          />
        </div>

        {/* Área mínima */}
        <div className={styles.field}>
          <Text size="sm" fw={500} c="dimmed" className={styles.label}>
            {t.area}
          </Text>
          <Input
            type="number"
            placeholder={t.area}
            value={areaMin}
            onChange={(e) => setAreaMin(e.target.value)}
            size="sm"
            min={0}
            step={10}
          />
        </div>

        {/* Estrato */}
        <div className={styles.field}>
          <Text size="sm" fw={500} c="dimmed" className={styles.label}>
            {t.estrato}
          </Text>
          <Select
            placeholder={t.estrato}
            value={estrato || null}
            onChange={(value) => setEstrato(value || '')}
            data={[
              { value: '1', label: '1' },
              { value: '2', label: '2' },
              { value: '3', label: '3' },
              { value: '4', label: '4' },
              { value: '5', label: '5' },
              { value: '6', label: '6' },
            ]}
            size="sm"
            clearable
          />
        </div>
      </Grid>

      <Divider my="md" />

      <Group justify="flex-end" gap={2} className={styles.actions}>
        <Button variant="subtle" color="gray" onClick={handleClear} size="sm">
          {t.limpiar}
        </Button>
        <Button onClick={updateUrl} size="sm" disabled={hayErrores}>
          {t.aplicar}
        </Button>
      </Group>
    </div>
  );
}
