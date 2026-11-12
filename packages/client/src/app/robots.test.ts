/**
 * Tests de robots.txt (AC2.7.4, AC2.7.5).
 */

import { describe, expect, it } from 'vitest';
import Robots from './robots';

const BASE = 'https://example.test';

function getRobots() {
  // Mock env
  process.env.NEXT_PUBLIC_SITE_URL = BASE;
  return Robots();
}

describe('robots.txt (AC2.7.4 / AC2.7.5)', () => {
  it('contiene Disallow para /admin/ y /api/', () => {
    const robots = getRobots();
    const rules = Array.isArray(robots.rules) ? robots.rules : [robots.rules];

    // Al menos un grupo tiene /admin/ y /api/ en disallow
    const hasAdmin = rules.some((r) => r.disallow?.includes('/admin/'));
    const hasApi = rules.some((r) => r.disallow?.includes('/api/'));
    expect(hasAdmin).toBe(true);
    expect(hasApi).toBe(true);
  });

  it('contiene línea Sitemap', () => {
    const robots = getRobots();
    expect(robots.sitemap).toBe(`${BASE}/sitemap.xml`);
  });

  it('tiene grupos explícitos para bots conocidos (AC2.7.5)', () => {
    const robots = getRobots();
    const rules = Array.isArray(robots.rules) ? robots.rules : [robots.rules];

    const knownBots = ['ClaudeBot', 'GPTBot', 'PerplexityBot', 'Google-Extended', 'CCBot'];

    for (const bot of knownBots) {
      const botRule = rules.find((r) => r.userAgent === bot);
      expect(botRule).toBeDefined();
      // Cada grupo de bot debe repetir Disallow /admin/ y /api/
      expect(botRule?.disallow).toContain('/admin/');
      expect(botRule?.disallow).toContain('/api/');
    }
  });

  it('el grupo * (fallback) también existe', () => {
    const robots = getRobots();
    const rules = Array.isArray(robots.rules) ? robots.rules : [robots.rules];
    const fallback = rules.find((r) => r.userAgent === '*');
    expect(fallback).toBeDefined();
    expect(fallback?.disallow).toContain('/admin/');
    expect(fallback?.disallow).toContain('/api/');
  });
});
