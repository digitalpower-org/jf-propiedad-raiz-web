'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { Checkbox, Select, Input, Button, Group, Text, Grid, Divider } from '@mantine/core';
import type { TipoInmueble, Operacion } from '@jf/shared-types';
import styles from './Filters.module.css';
export interface PropertyFilters {
  tipo?: string | undefined;
  departamento?: string | undefined;
  municipio?: string | undefined;
  precioMin?: number | undefined;
  precioMax?: number | undefined;
  dormitorios?: string | undefined;
  banos?: string | undefined;
  areaMin?: string | undefined;
  estrato?: string | undefined;
  destacada?: boolean | undefined;
}

interface FiltersProps {
  readonly operacion: Operacion;
  readonly locale: 'es' | 'en';
  readonly onFiltersChange?: (filters: PropertyFilters) => void;
  readonly initialFilters?: PropertyFilters;
}

const TIPO_INMUEBLE_OPTIONS = {
  es: [
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

const DEPARTAMENTO_OPTIONS = {
  es: [
    { value: 'Antioquia', label: 'Antioquia' },
    { value: 'Cundinamarca', label: 'Cundinamarca' },
    { value: 'Valle del Cauca', label: 'Valle del Cauca' },
    { value: 'Atlántico', label: 'Atlántico' },
    { value: 'Santander', label: 'Santander' },
    { value: 'Bolívar', label: 'Bolívar' },
  ],
  en: [
    { value: 'Antioquia', label: 'Antioquia' },
    { value: 'Cundinamarca', label: 'Cundinamarca' },
    { value: 'Valle del Cauca', label: 'Valle del Cauca' },
    { value: 'Atlántico', label: 'Atlántico' },
    { value: 'Santander', label: 'Santander' },
    { value: 'Bolívar', label: 'Bolívar' },
  ],
};

const MUNICIPIO_OPTIONS: Record<string, { es: string; en: string }[]> = {
  Antioquia: [
    { es: 'Medellín', en: 'Medellín' },
    { es: 'Envigado', en: 'Envigado' },
    { es: 'Itagüí', en: 'Itagüí' },
    { es: 'Bello', en: 'Bello' },
    { es: 'Sabaneta', en: 'Sabaneta' },
    { es: 'Rionegro', en: 'Rionegro' },
    { es: 'Copacabana', en: 'Copacabana' },
  ],
  Cundinamarca: [
    { es: 'Bogotá', en: 'Bogotá' },
    { es: 'Soacha', en: 'Soacha' },
    { es: 'Chía', en: 'Chía' },
    { es: 'Cajicá', en: 'Cajicá' },
  ],
  'Valle del Cauca': [
    { es: 'Cali', en: 'Cali' },
    { es: 'Palmira', en: 'Palmira' },
    { es: 'Tuluá', en: 'Tuluá' },
  ],
  Atlántico: [
    { es: 'Barranquilla', en: 'Barranquilla' },
    { es: 'Soledad', en: 'Soledad' },
  ],
  Santander: [
    { es: 'Bucaramanga', en: 'Bucaramanga' },
    { es: 'Floridablanca', en: 'Floridablanca' },
  ],
  Bolívar: [{ es: 'Cartagena', en: 'Cartagena' }],
};

export function Filters({
  operacion: _operacion,
  locale,
  onFiltersChange,
  initialFilters,
}: FiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Helper to parse searchParams into initial state
  const getInitialState = (params: URLSearchParams) => ({
    tipo: params.get('tipo') ? (params.get('tipo')!.split(',') as TipoInmueble[]) : [],
    departamento: params.get('departamento') || '',
    municipio: params.get('municipio') || '',
    precioMin: params.get('precioMin') || '',
    precioMax: params.get('precioMax') || '',
    destacada: params.get('destacada') === 'true',
    dormitorios: params.get('dormitorios') || '',
    banos: params.get('banos') || '',
    areaMin: params.get('areaMin') || '',
    estrato: params.get('estrato') || '',
  });

  const initialState = getInitialState(searchParams);

  // Merge URL params with initialFilters prop (prop takes precedence)
  const mergedTipo = initialFilters?.tipo
    ? ([initialFilters.tipo] as TipoInmueble[])
    : initialState.tipo;
  const mergedDepartamento = initialFilters?.departamento ?? initialState.departamento;
  const mergedMunicipio = initialFilters?.municipio ?? initialState.municipio;
  const mergedPrecioMin = initialFilters?.precioMin
    ? String(initialFilters.precioMin)
    : initialState.precioMin;
  const mergedPrecioMax = initialFilters?.precioMax
    ? String(initialFilters.precioMax)
    : initialState.precioMax;
  const mergedDestacada = initialFilters?.destacada ?? initialState.destacada;
  const mergedDormitorios = initialFilters?.dormitorios ?? initialState.dormitorios;
  const mergedBanos = initialFilters?.banos ?? initialState.banos;
  const mergedAreaMin = initialFilters?.areaMin ?? initialState.areaMin;
  const mergedEstrato = initialFilters?.estrato ?? initialState.estrato;

  const [tipo, setTipo] = useState<TipoInmueble[]>(mergedTipo);
  const [departamento, setDepartamento] = useState<string>(mergedDepartamento);
  const [municipio, setMunicipio] = useState<string>(mergedMunicipio);
  const [precioMin, setPrecioMin] = useState<string>(mergedPrecioMin);
  const [precioMax, setPrecioMax] = useState<string>(mergedPrecioMax);
  const [destacada, setDestacada] = useState<boolean>(mergedDestacada);
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
    setDestacada(newState.destacada);
    setDormitorios(newState.dormitorios);
    setBanos(newState.banos);
    setAreaMin(newState.areaMin);
    setEstrato(newState.estrato);
  }, [searchParams]);

  const notifyFiltersChange = () => {
    if (onFiltersChange) {
      onFiltersChange({
        tipo: tipo.length > 0 ? tipo.join(',') : undefined,
        departamento: departamento || undefined,
        municipio: municipio || undefined,
        precioMin: precioMin ? Number(precioMin) : undefined,
        precioMax: precioMax ? Number(precioMax) : undefined,
        dormitorios: dormitorios || undefined,
        banos: banos || undefined,
        areaMin: areaMin || undefined,
        estrato: estrato || undefined,
        destacada: destacada || undefined,
      });
    }
  };

  const updateUrl = () => {
    const params = new URLSearchParams();
    if (tipo.length > 0) params.set('tipo', tipo.join(','));
    if (departamento) params.set('departamento', departamento);
    if (municipio) params.set('municipio', municipio);
    if (precioMin) params.set('precioMin', precioMin);
    if (precioMax) params.set('precioMax', precioMax);
    if (destacada) params.set('destacada', 'true');
    if (dormitorios) params.set('dormitorios', dormitorios);
    if (banos) params.set('banos', banos);
    if (areaMin) params.set('areaMin', areaMin);
    if (estrato) params.set('estrato', estrato);

    const currentPath = window.location.pathname;
    const newUrl = params.toString() ? `${currentPath}?${params.toString()}` : currentPath;
    router.push(newUrl, { scroll: false });
    notifyFiltersChange();
  };

  const handleClear = () => {
    setTipo([]);
    setDepartamento('');
    setMunicipio('');
    setPrecioMin('');
    setPrecioMax('');
    setDestacada(false);
    setDormitorios('');
    setBanos('');
    setAreaMin('');
    setEstrato('');
    router.push(window.location.pathname, { scroll: false });
    notifyFiltersChange();
  };

  const hasActiveFilters =
    tipo.length > 0 ||
    departamento ||
    municipio ||
    precioMin ||
    precioMax ||
    destacada ||
    dormitorios ||
    banos ||
    areaMin ||
    estrato;

  const t = {
    es: {
      title: 'Filtros',
      tipo: 'Tipo de inmueble',
      ubicacion: 'Ubicación',
      departamento: 'Departamento',
      municipio: 'Municipio',
      precio: 'Rango de precio (COP)',
      min: 'Mín',
      max: 'Máx',
      destacada: 'Solo destacadas',
      dormitorios: 'Dormitorios mín.',
      banos: 'Baños mín.',
      area: 'Área mín. (m²)',
      estrato: 'Estrato',
      aplicar: 'Aplicar',
      limpiar: 'Limpiar',
      clearAll: 'Limpiar todos',
    },
    en: {
      title: 'Filters',
      tipo: 'Property Type',
      ubicacion: 'Location',
      departamento: 'Department',
      municipio: 'Municipality',
      precio: 'Price Range (COP)',
      min: 'Min',
      max: 'Max',
      destacada: 'Featured Only',
      dormitorios: 'Min Bedrooms',
      banos: 'Min Bathrooms',
      area: 'Min Area (m²)',
      estrato: 'Stratum',
      aplicar: 'Apply',
      limpiar: 'Clear',
      clearAll: 'Clear All',
    },
  }[locale];

  const municipioOptions = departamento ? MUNICIPIO_OPTIONS[departamento] || [] : [];

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

      <Grid
        className={styles.grid}
      >
        {/* Tipo de inmueble */}
        <div className={`${styles.field} ${styles.fieldSpan2}`}>
          <Text size="sm" fw={500} c="dimmed" className={styles.label}>
            {t.tipo}
          </Text>
          <Group grow>
            {TIPO_INMUEBLE_OPTIONS[locale].map((opt) => (
              <Checkbox
                key={opt.value}
                label={opt.label}
                checked={tipo.includes(opt.value as TipoInmueble)}
                onChange={(e) =>
                  setTipo((prev) =>
                    e.currentTarget.checked
                      ? [...prev, opt.value as TipoInmueble]
                      : prev.filter((t) => t !== opt.value),
                  )
                }
                size="sm"
              />
            ))}
          </Group>
        </div>

        {/* Ubicación - Departamento */}
        <div className={styles.field}>
          <Text size="sm" fw={500} c="dimmed" className={styles.label}>
            {t.departamento}
          </Text>
          <Select
            placeholder={t.departamento}
            value={departamento}
            onChange={(value) => {
              setDepartamento(value || '');
              setMunicipio('');
            }}
            data={DEPARTAMENTO_OPTIONS[locale].map((d) => ({ value: d.value, label: d.label }))}
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
            value={municipio}
            onChange={(value) => setMunicipio(value || '')}
            data={municipioOptions.map((m) => ({ value: m.es, label: m[locale] }))}
            size="sm"
            clearable
            disabled={!departamento}
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
            />
            <Input
              type="number"
              placeholder={t.max}
              value={precioMax}
              onChange={(e) => setPrecioMax(e.target.value)}
              size="sm"
              min={0}
              step={100000}
            />
          </Grid>
        </div>

        {/* Destacada */}
        <div className={`${styles.field} ${styles.featuredField}`}>
          <Checkbox
            label={t.destacada}
            checked={destacada}
            onChange={(e) => setDestacada(e.currentTarget.checked)}
            size="sm"
          />
        </div>

        {/* Dormitorios */}
        <div className={styles.field}>
          <Text size="sm" fw={500} c="dimmed" className={styles.label}>
            {t.dormitorios}
          </Text>
          <Select
            placeholder={t.dormitorios}
            value={dormitorios}
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
            value={banos}
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
            value={estrato}
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
        <Button onClick={updateUrl} size="sm">
          {t.aplicar}
        </Button>
      </Group>
    </div>
  );
}
