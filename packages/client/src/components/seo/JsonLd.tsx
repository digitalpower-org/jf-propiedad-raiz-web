import { serializeJsonLd } from '@/lib/property-seo';

/** Bloque JSON-LD (AC2.7.6). serializeJsonLd escapa el `<`, así que ningún texto puede cerrar el script. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
