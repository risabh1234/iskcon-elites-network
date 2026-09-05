'use client';

import { useReportWebVitals } from 'next/web-vitals';

/**
 * Sends field measurements, not lab ones.
 *
 * `sendBeacon` because the page is often unloading when the last metric
 * arrives — a fetch would be cancelled, which is precisely how CLS and INP go
 * missing from real-user data.
 */
export function WebVitals() {
  useReportWebVitals((metric) => {
    const body = JSON.stringify({
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      id: metric.id,
    });

    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/vitals', body);
      return;
    }

    void fetch('/api/vitals', { body, method: 'POST', keepalive: true }).catch(() => {});
  });

  return null;
}
