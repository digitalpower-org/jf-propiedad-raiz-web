'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { VideoYouTube } from '@jf/shared-types';
import styles from './VideoFacade.module.css';

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

interface VideoFacadeProps {
  readonly videos: readonly VideoYouTube[];
  readonly locale: 'es' | 'en';
}

export function VideoFacade({ videos, locale }: VideoFacadeProps) {
  const t = useTranslations('property');
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (!videos || videos.length === 0) return null;

  return (
    <section className={styles.section} aria-labelledby={styles.titleId}>
      <h2 id={styles.titleId} className={styles.title}>
        {t('videos')}
      </h2>
      <div className={styles.grid} role="list">
        {videos.map((videoUrl, index) => {
          const videoId = extractYouTubeId(videoUrl);
          const thumbnailUrl = videoId
            ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
            : '';
          const titulo = `${t('videos')} ${index + 1}`;

          return (
            <article key={index} className={styles.card} role="listitem">
              {videoId && (
                <div className={styles.thumbnailWrapper}>
                  <img
                    src={thumbnailUrl}
                    alt={titulo}
                    className={styles.thumbnail}
                    loading="lazy"
                    width="640"
                    height="360"
                  />
                  <button
                    className={styles.playBtn}
                    onClick={() => setOpenIndex(index)}
                    aria-label={`${titulo}`}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </button>
                </div>
              )}

              <h3 className={styles.videoTitle}>{titulo}</h3>
            </article>
          );
        })}
      </div>

      {/* Modal */}
      {openIndex !== null && videos[openIndex] && (
        <div
          className={styles.modalOverlay}
          onClick={() => setOpenIndex(null)}
          role="dialog"
          aria-modal="true"
          aria-label={t('videos')}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button
              className={styles.modalClose}
              onClick={() => setOpenIndex(null)}
              aria-label={locale === 'es' ? 'Cerrar video' : 'Close video'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
            <div className={styles.modalContent}>
              {(() => {
                const videoId = extractYouTubeId(videos[openIndex]);
                if (!videoId) return null;
                return (
                  <iframe
                    title={`${t('videos')} ${openIndex + 1}`}
                    src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className={styles.iframe}
                  />
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
