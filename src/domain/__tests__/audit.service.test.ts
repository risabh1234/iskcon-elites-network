import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Actor } from '@/server/policy';

vi.mock('@/domain/audit/repository', () => ({ write: vi.fn(), list: vi.fn() }));

import * as repo from '@/domain/audit/repository';
import { listAudit, record } from '@/domain/audit/service';

const member: Actor = { kind: 'user', name: null, id: 'u1', email: 'u@e.com', role: 'USER', canCreateEvents: false };
const admin: Actor = { kind: 'user', name: null, id: 'a1', email: 'a@e.com', role: 'ADMIN', canCreateEvents: true };

beforeEach(() => vi.clearAllMocks());

describe('record', () => {
  it('writes the entry', async () => {
    await record({ actorId: 'a1', action: 'member.approve', entity: 'Member', entityId: 'm1' });
    expect(repo.write).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'member.approve', entityId: 'm1' }),
    );
  });

  it('never throws when the log write fails', async () => {
    // An admin action that succeeded must not be reported as failed because the
    // audit row could not be written.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(repo.write).mockRejectedValue(new Error('table is missing'));

    await expect(
      record({ actorId: 'a1', action: 'member.approve', entity: 'Member' }),
    ).resolves.toBeUndefined();

    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});

describe('listAudit', () => {
  it('is admins only — reading who did what is itself privileged', async () => {
    const result = await listAudit(member);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('Forbidden');
    expect(repo.list).not.toHaveBeenCalled();
  });

  it('does not re-expose the actor’s email address', async () => {
    vi.mocked(repo.list).mockResolvedValue({
      rows: [{
        id: 'l1', action: 'member.approve', entity: 'Member', entityId: 'm1',
        at: new Date('2026-01-01'),
        actor: { id: 'a1', email: 'a@e.com', name: 'An Admin' },
      }],
      nextCursor: null,
    } as never);

    const result = await listAudit(admin);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.entries[0]!.actor).toEqual({ id: 'a1', name: 'An Admin' });
      expect(JSON.stringify(result.value)).not.toContain('a@e.com');
    }
  });
});
