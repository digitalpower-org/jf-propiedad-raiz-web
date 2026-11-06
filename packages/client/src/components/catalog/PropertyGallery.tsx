'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type { Foto, VideoYouTube, Panorama } from '@jf/shared-types';
import styles from './PropertyGallery.module.css';

interface PropertyGalleryProps {
  readonly fotos: readonly Foto[];
  readonly videos?: readonly VideoYouTube[];
  readonly panoramas?: readonly Panorama[];
  readonly titulo: string;
  readonly locale: 'es' | 'en';
}

export function PropertyGallery({
  fotos,
  videos,
  panoramas,
  titulo,
  locale,
}: PropertyGalleryProps) {
  const t = useTranslations('property');
  const [mainIndex, setMainIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);

  const allImages = fotos.flatMap((foto, fotoIndex) =>
    foto.derivados.map((derivado) => ({
      src: `/${derivado.clave}`,
      ancho: derivado.ancho,
      alt: `${titulo} - ${t('gallery')} ${fotoIndex + 1}`,
      fotoIndex,
    })),
  );

  // Keyboard navigation in fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setFullscreenIndex((i) => (i > 0 ? i - 1 : allImages.length - 1));
      if (e.key === 'ArrowRight') setFullscreenIndex((i) => (i < allImages.length - 1 ? i + 1 : 0));
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, allImages.length]);

  // Sync mainIndex with fullscreenIndex - only run when both are truthy
  useEffect(() => {
    if (isFullscreen && fullscreenIndex !== mainIndex) {
      setMainIndex(fullscreenIndex);
    }
  }, [fullscreenIndex, isFullscreen, mainIndex]);

  const hasImages = allImages.length > 0;
  const currentImage = hasImages ? allImages[mainIndex] : null;

  // Render placeholder when no images
  if (!hasImages) {
    return (
      <div className={styles.gallery} role="region" aria-label={t('gallery')}>
        <div className={styles.placeholder} aria-hidden="true">
          <svg
            className={styles.placeholderIcon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 002-2H6a2 2 0 002-2v12a2 2 0 002 2z" />
          </svg>
          <p className={styles.placeholderText}>
            {locale === 'es' ? 'Sin imágenes disponibles' : 'No images available'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.gallery} role="region" aria-label={t('gallery')}>
      {/* Main Image */}
      <div className={styles.mainImage}>
        {isFullscreen ? (
          <div
            className={styles.fullscreenOverlay}
            onClick={() => setIsFullscreen(false)}
            role="dialog"
            aria-modal="true"
            aria-label={t('gallery')}
          >
            <button
              className={styles.fullscreenClose}
              onClick={() => setIsFullscreen(false)}
              aria-label={locale === 'es' ? 'Cerrar vista completa' : 'Close fullscreen'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
            <button
              className={styles.fullscreenNav}
              onClick={() => setFullscreenIndex((i) => (i > 0 ? i - 1 : allImages.length - 1))}
              aria-label={locale === 'es' ? 'Anterior' : 'Previous'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <Image
              src={allImages[fullscreenIndex]!.src}
              alt={allImages[fullscreenIndex]!.alt}
              fill
              sizes="100vw"
              className={styles.fullscreenImage}
              priority
            />
            <button
              className={`${styles.fullscreenNav} ${styles.fullscreenNavNext}`}
              onClick={() => setFullscreenIndex((i) => (i < allImages.length - 1 ? i + 1 : 0))}
              aria-label={locale === 'es' ? 'Siguiente' : 'Next'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
            <div className={styles.fullscreenCounter}>
              {fullscreenIndex + 1} / {allImages.length}
            </div>
          </div>
        ) : (
          <div>
            <Image
              src={currentImage!.src}
              alt={currentImage!.alt}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className={styles.mainImg}
              priority={mainIndex === 0}
              onClick={() => setIsFullscreen(true)}
            />
            {fotos.length > 1 && (
              <button
                className={styles.fullscreenBtn}
                onClick={() => setIsFullscreen(true)}
                aria-label={t('virtualTour')}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7" />
                  <path d="M16 3h5v5" />
                  <path d="M8 21V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7" />
                  <path d="M3 10h18" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Thumbnails */}
        {fotos.length > 1 && (
          <div className={styles.thumbnails} role="tablist" aria-label={t('gallery')}>
            {fotos.map((foto, fotoIndex) => (
              <button
                key={fotoIndex}
                role="tab"
                aria-selected={
                  mainIndex >= fotoIndex * foto.derivados.length &&
                  mainIndex < (fotoIndex + 1) * foto.derivados.length
                }
                aria-label={`${t('gallery')} ${fotoIndex + 1}`}
                onClick={() => setMainIndex(fotoIndex * foto.derivados.length)}
                className={`${styles.thumb} ${mainIndex >= fotoIndex * foto.derivados.length && mainIndex < (fotoIndex + 1) * foto.derivados.length ? styles.thumbActive : ''}`}
              >
                <Image
                  src={`/${foto.derivados[0]?.clave}`}
                  alt={`${titulo} - ${t('gallery')} ${fotoIndex + 1}`}
                  width={80}
                  height={60}
                  className={styles.thumbImg}
                />
              </button>
            ))}
          </div>
        )}

        {/* Video indicators */}
        {videos && videos.length > 0 && (
          <div className={styles.mediaIndicators}>
            {videos.map((video, i) => (
              <button
                key={i}
                className={styles.mediaIndicator}
                aria-label={`${t('videos')} ${i + 1}`}
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
            ))}
          </div>
        )}

        {/* Panorama indicators */}
        {panoramas && panoramas.length > 0 && (
          <div className={styles.mediaIndicators}>
            {panoramas.map((_, i) => (
              <button
                key={i}
                className={styles.mediaIndicator}
                aria-label={`${t('virtualTour')} ${i + 1}`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7" />
                  <path d="M16 3h5v5" />
                  <path d="M8 21V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7" />
                  <path d="M3 10h18" />
                </svg>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}