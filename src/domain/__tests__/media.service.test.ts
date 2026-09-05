import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Actor } from '@/server/policy';

vi.mock('@/domain/media/repository', () => ({ putObject: vi.fn() }));

import * as repo from '@/domain/media/repository';
import { uploadImage } from '@/domain/media/service';
import { resetRateLimits } from '@/server/rate-limit';

const anon: Actor = { kind: 'anonymous' };
const member: Actor = { kind: 'user', name: null, id: 'u1', email: 'u@e.com', role: 'USER', canCreateEvents: false };

const image = (name = 'portrait.jpg', type = 'image/jpeg', bytes = 1024) =>
  new File([new Uint8Array(bytes)], name, { type });

beforeEach(() => {
  vi.clearAllMocks();
  resetRateLimits();
});

describe('uploadImage', () => {
  it('refuses anonymous callers', async () => {
    const result = await uploadImage(anon, image(), 'ip:1.2.3.4');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('Forbidden');
    expect(repo.putObject).not.toHaveBeenCalled();
  });

  it('accepts an allowed image and returns its URL', async () => {
    vi.mocked(repo.putObject).mockResolvedValue('https://cdn.example.com/a.jpg');
    const result = await uploadImage(member, image(), 'actor:u1');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.url).toBe('https://cdn.example.com/a.jpg');
  });

  it('never derives the storage key from the client filename', async () => {
    // A timestamp prefix collides under concurrency, and user input in a
    // storage path is a traversal waiting to happen.
    vi.mocked(repo.putObject).mockResolvedValue('https://cdn.example.com/x.jpg');
    const result = await uploadImage(member, image('../../etc/passwd.jpg'), 'actor:u1');
    if (result.ok) {
      expect(result.value.key).not.toContain('passwd');
      expect(result.value.key).not.toContain('..');
      expect(result.value.key).toMatch(/^profiles\/[0-9a-f-]{36}\.jpg$/);
    }
  });

  it('rejects a disallowed content type', async () => {
    const result = await uploadImage(member, image('x.svg', 'image/svg+xml'), 'actor:u1');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('Validation');
    expect(repo.putObject).not.toHaveBeenCalled();
  });

  it('rejects an oversized file', async () => {
    const result = await uploadImage(member, image('big.png', 'image/png', 6 * 1024 * 1024), 'actor:u1');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('Validation');
  });

  it('rate-limits a single caller', async () => {
    vi.mocked(repo.putObject).mockResolvedValue('https://cdn.example.com/a.jpg');
    for (let i = 0; i < 20; i += 1) {
      expect((await uploadImage(member, image(), 'actor:spam')).ok).toBe(true);
    }
    const blocked = await uploadImage(member, image(), 'actor:spam');
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.error.kind).toBe('RateLimited');
  });

  it('reports an Internal error when storage fails, without leaking the cause', async () => {
    vi.mocked(repo.putObject).mockRejectedValue(new Error('bucket "profiles" not found'));
    const result = await uploadImage(member, image(), 'actor:u1');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('Internal');
      expect(result.error.message).not.toContain('bucket');
    }
  });
});
