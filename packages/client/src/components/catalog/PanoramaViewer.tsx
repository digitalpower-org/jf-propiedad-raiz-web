'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import type { Panorama, DerivadoImagen } from '@jf/shared-types';
import styles from './PanoramaViewer.module.css';

interface PanoramaViewerProps {
  readonly panoramas: readonly Panorama[];
  readonly locale: 'es' | 'en';
}

interface PannellumViewer {
  destroy: () => void;
}

interface PannellumModule {
  viewer: (container: HTMLElement, options: unknown) => PannellumViewer;
}

export function PanoramaViewer({ panoramas, locale }: PanoramaViewerProps) {
  const t = useTranslations('property');
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [pannellumViewer, setPannellumViewer] = useState<PannellumViewer | null>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef<Set<number>>(new Set());

  const loadPannellum = useCallback(() => {
    import('pannellum')
      .then((module) => {
        const pannellum = module.default || module;
        setPannellumViewer(() => ({
          destroy: () => {
            // Pannellum doesn't have a standard destroy method on the module
            // We'll just set to null and let React handle cleanup
          },
        }));
      })
      .catch(() => {
        // Silently fail - Pannellum is optional
      });
  }, []);

  useEffect(() => {
    if (openIndex !== null) {
      loadPannellum();
    }
  }, [openIndex, loadPannellum]);

  useEffect(() => {
    if (!pannellumViewer || openIndex === null || !viewerRef.current) return;
    if (initializedRef.current.has(openIndex)) return;

    const panorama = panoramas[openIndex];
    if (!panorama || panorama.derivados.length === 0) return;

    const bestDerivative = panorama.derivados.reduce<DerivadoImagen>(
      (best, current) => (current.ancho > best.ancho ? current : best),
      panorama.derivados[0]!,
    );

    const panoramaUrl = `/${bestDerivative.clave}`;

    try {
      // @ts-expect-error - pannellum is dynamically loaded
      const viewer = window.pannellum?.viewer(viewerRef.current!, {
        type: 'equirectangular',
        panorama: panoramaUrl,
        autoLoad: true,
        showZoomCtrl: true,
        showFullscreenCtrl: true,
        keyboardZoom: true,
        mouseZoom: true,
        touchZoom: true,
        autoRotate: -2,
        autoRotateInactivityDelay: 3000,
        hfov: 100,
        minHfov: 50,
        maxHfov: 120,
        pitch: 0,
        yaw: 0,
        minPitch: -90,
        maxPitch: 90,
        minYaw: -180,
        maxYaw: 180,
        compass: true,
        northOffset: 0,
        showControls: true,
        orientationOnByDefault: false,
      });
      if (viewer) {
        initializedRef.current.add(openIndex);
      }
    } catch {
      // Silently fail
    }
  }, [openIndex, panoramas]);

  useEffect(() => {
    return () => {
      // Cleanup is handled by Pannellum internally
      initializedRef.current.clear();
    };
  }, []);

  if (!panoramas || panoramas.length === 0) return null;

  return (
    <section className={styles.section} aria-labelledby={styles.titleId}>
      <h2 id={styles.titleId} className={styles.title}>
        {t('virtualTour')}
      </h2>
      <div className={styles.grid} role="list">
        {panoramas.map((panorama, index) => {
          const bestDerivative = panorama.derivados.reduce<DerivadoImagen>(
            (best, current) => (current.ancho > best.ancho ? current : best),
            panorama.derivados[0]!,
          );
          return (
            <article key={index} className={styles.card} role="listitem">
              <div className={styles.thumbnailWrapper}>
                <img
                  src={`/${bestDerivative.clave}`}
                  alt={`${t('virtualTour')} ${index + 1}`}
                  className={styles.thumbnail}
                  loading="lazy"
                  width="400"
                  height="200"
                />
                <button
                  className={styles.viewBtn}
                  onClick={() => setOpenIndex(index)}
                  aria-label={`${t('virtualTour')} ${index + 1}`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    aria-hidden="true"
                  >
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7" />
                    <path d="M16 3h5v5" />
                    <path d="M8 21V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7" />
                    <path d="M3 10h18" />
                  </svg>
                  <span>
                    {t('virtualTour')} {index + 1}
                  </span>
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {/* Modal */}
      {openIndex !== null && pannellumViewer && panoramas[openIndex] && (
        <div
          className={styles.modalOverlay}
          onClick={() => setOpenIndex(null)}
          role="dialog"
          aria-modal="true"
          aria-label={t('virtualTour')}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button
              className={styles.modalClose}
              onClick={() => setOpenIndex(null)}
              aria-label={locale === 'es' ? 'Cerrar tour 360°' : 'Close 360° tour'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
            <div className={styles.modalContent} ref={viewerRef} />
          </div>
        </div>
      )}
    </section>
  );
}
