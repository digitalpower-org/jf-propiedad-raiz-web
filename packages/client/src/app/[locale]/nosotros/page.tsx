import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { loadMessages } from '@/i18n/messages';
import { isLocale } from '@/i18n/config';

type NosotrosPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function NosotrosPage({ params }: NosotrosPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  setRequestLocale(locale);
  const t = await getTranslations('about');
  const messages = await loadMessages(locale);
  const today = new Date().toLocaleDateString(locale === 'es' ? 'es-CO' : 'en-US');

  const sections = messages.about.sections as Array<{ id: string; titulo: string; cuerpo: string }>;
  const equipo = messages.about.equipo as Array<{
    id: string;
    nombre: string;
    cargo: string;
    descripcion?: string;
    foto?: string | null;
  }>;

  return (
    <div className="prose max-w-3xl mx-auto p-4 md:p-8">
      <h1>{t('title')}</h1>
      <p className="text-sm text-muted-foreground mb-8">{t('lastUpdated', { date: today })}</p>

      <section className="mb-12">
        <p className="text-lg leading-relaxed">{t('extracto')}</p>
      </section>

      {sections.map((section) => (
        <section key={section.id} className="mb-12">
          <h2>{section.titulo}</h2>
          <div className="mt-4 whitespace-pre-wrap leading-relaxed">{section.cuerpo}</div>
        </section>
      ))}

      {equipo.length > 0 && (
        <section className="mb-12">
          <h2>{locale === 'es' ? 'Nuestro Equipo' : 'Our Team'}</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {equipo.map((member) => (
              <article
                key={member.id}
                className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm"
              >
                {member.foto && (
                  <div className="mb-4 aspect-square rounded-lg overflow-hidden bg-gray-100">
                    <img
                      src={member.foto}
                      alt={member.nombre}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <h3 className="text-lg font-semibold text-gray-900">{member.nombre}</h3>
                <p className="text-green-600 font-medium mb-2">{member.cargo}</p>
                {member.descripcion && (
                  <p className="text-gray-600 text-sm">{member.descripcion}</p>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
