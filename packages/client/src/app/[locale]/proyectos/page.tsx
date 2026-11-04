import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { isLocale } from '@/i18n/config';
import { getDestacadasByOperacion, getNoDestacadasByOperacion } from '@/mocks/property-mock';
import { CatalogClient } from '@/components/catalog/CatalogClient';

type CatalogoPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function ProyectosPage({ params, searchParams }: CatalogoPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  setRequestLocale(locale);
  const t = await getTranslations();
  const search = await searchParams;

  const destacadas = getDestacadasByOperacion('PROYECTO_SOBRE_PLANOS');
  const noDestacadas = getNoDestacadasByOperacion('PROYECTO_SOBRE_PLANOS');
  const initialData = [...destacadas, ...noDestacadas].slice(0, 12);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('projects.title')}
          </h1>
          <p className="text-gray-600">{t('projects.empty')}</p>
        </div>

        <CatalogClient
          operacion="PROYECTO_SOBRE_PLANOS"
          locale={locale}
          initialData={initialData}
        />
      </div>
    </div>
  );
}