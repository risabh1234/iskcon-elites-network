import { describe, expect, it, vi } from 'vitest';
import { scrubMessage } from '@/server/observability/report';
import { captureException } from '@/server/observability/report';

describe('scrubMessage', () => {
  it('redacts a connection string', () => {
    // Prisma puts the whole DSN in the message when a connection fails, and
    // that message goes straight to a log aggregator.
    const scrubbed = scrubMessage(
      'Can\'t reach database server at postgresql://admin:hunter2@db.example.com:5432/prod',
    );
    expect(scrubbed).not.toContain('hunter2');
    expect(scrubbed).not.toContain('db.example.com');
    expect(scrubbed).toContain('[redacted]');
  });

  it('redacts email addresses', () => {
    const scrubbed = scrubMessage('Unique constraint failed for srivasa@example.com');
    expect(scrubbed).not.toContain('srivasa@example.com');
    expect(scrubbed).toContain('[email]');
  });

  it('redacts tokens that look like credentials', () => {
    for (const secret of ['eyJhbGciOiJIUzI1NiJ9', 'sk_live_abcdefgh1234', 'whsec_abcdefgh1234']) {
      expect(scrubMessage(`failed with ${secret}`)).not.toContain(secret);
    }
  });

  it('leaves an ordinary message intact', () => {
    const message = 'That profile could not be found.';
    expect(scrubMessage(message)).toBe(message);
  });
});

describe('captureException', () => {
  it('scrubs the stack, and does not drop it', () => {
    // The stack is the whole value of a report.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error('connect failed: postgresql://u:p@host/db');

    captureException(error, { route: '/api/directory' });

    const line = spy.mock.calls[0]![0] as string;
    expect(line).not.toContain('u:p@host');
    expect(line).toContain('stack');
    expect(line).toContain('/api/directory');
    spy.mockRestore();
  });

  it('accepts a non-Error without throwing', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => captureException('a string was thrown')).not.toThrow();
    spy.mockRestore();
  });
});
