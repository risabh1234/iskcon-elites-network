import { describe, expect, it } from 'vitest';
import { buildIcs } from '@/lib/ics';

const base = {
  id: 'e1',
  title: 'Annual gathering',
  startsAt: new Date('2026-11-14T13:00:00Z'),
};

describe('buildIcs', () => {
  it('emits a valid VCALENDAR with UTC stamps', () => {
    const ics = buildIcs(base, 'https://example.com');
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics).toContain('DTSTART:20261114T130000Z');
  });

  it('uses CRLF line endings, as RFC 5545 requires', () => {
    // Calendar clients are strict about this; a bare \n is rejected by some.
    expect(buildIcs(base, 'https://example.com')).toContain('\r\n');
  });

  it('defaults to an hour when no end time is recorded', () => {
    // Without this the event lands in a calendar as an all-day block.
    expect(buildIcs(base, 'https://example.com')).toContain('DTEND:20261114T140000Z');
  });

  it('honours an explicit end time', () => {
    const ics = buildIcs({ ...base, endsAt: new Date('2026-11-14T16:30:00Z') }, 'https://x.com');
    expect(ics).toContain('DTEND:20261114T163000Z');
  });

  it('escapes commas, semicolons and newlines in text', () => {
    const ics = buildIcs(
      { ...base, title: 'Kirtan, then prasadam; bring friends', description: 'Line one\nLine two' },
      'https://example.com',
    );
    expect(ics).toContain('Kirtan\\, then prasadam\; bring friends');
    expect(ics).toContain('Line one\\nLine two');
  });

  it('folds lines longer than 75 octets', () => {
    const ics = buildIcs({ ...base, title: 'A'.repeat(200) }, 'https://example.com');
    for (const line of ics.split('\r\n')) {
      expect(line.length).toBeLessThanOrEqual(75);
    }
  });

  it('omits optional properties rather than emitting empty ones', () => {
    const ics = buildIcs(base, 'https://example.com');
    expect(ics).not.toContain('LOCATION:');
    expect(ics).not.toContain('DESCRIPTION:');
  });
});
