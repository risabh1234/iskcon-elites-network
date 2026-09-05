import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Actor } from '@/server/policy';

vi.mock('@/domain/user/repository', () => ({
  listUsers: vi.fn(), findUserById: vi.fn(), updateRole: vi.fn(),
  updatePermissions: vi.fn(), deleteUser: vi.fn(), countAdmins: vi.fn(),
}));
vi.mock('@/server/cache', () => ({ invalidate: vi.fn(), tags: { users: () => 'users' } }));

import * as repo from '@/domain/user/repository';
import * as service from '@/domain/user/service';

const member: Actor = { kind: 'user', name: null, id: 'u1', email: 'u@e.com', role: 'USER', canCreateEvents: false };
const admin: Actor = { kind: 'user', name: null, id: 'a1', email: 'a@e.com', role: 'ADMIN', canCreateEvents: true };
const superadmin: Actor = { kind: 'user', name: null, id: 's1', email: 's@e.com', role: 'SUPERADMIN', canCreateEvents: true };

const rec = (over = {}) => ({
  id: 'u2', email: 'target@e.com', username: 'target',
  role: 'USER', canCreateEvents: false, createdAt: new Date('2026-01-01'), ...over,
});

beforeEach(() => vi.clearAllMocks());

describe('listUsers', () => {
  it('is admins only', async () => {
    expect((await service.listUsers(member)).ok).toBe(false);
  });

  it('never returns the password hash', async () => {
    vi.mocked(repo.listUsers).mockResolvedValue([rec() as never]);
    const result = await service.listUsers(admin);
    expect(result.ok).toBe(true);
    if (result.ok) expect('passwordHash' in result.value[0]!).toBe(false);
  });
});

describe('updateUserRole', () => {
  it('refuses a non-admin', async () => {
    vi.mocked(repo.findUserById).mockResolvedValue(rec() as never);
    expect((await service.updateUserRole(member, 'u2', { role: 'ADMIN' })).ok).toBe(false);
  });

  it('refuses self-modification', async () => {
    vi.mocked(repo.findUserById).mockResolvedValue(rec({ id: 'a1', role: 'ADMIN' }) as never);
    const result = await service.updateUserRole(admin, 'a1', { role: 'USER' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('Forbidden');
  });

  it('refuses an ADMIN acting on a SUPERADMIN', async () => {
    vi.mocked(repo.findUserById).mockResolvedValue(rec({ role: 'SUPERADMIN' }) as never);
    expect((await service.updateUserRole(admin, 'u2', { role: 'USER' })).ok).toBe(false);
  });

  it('allows a SUPERADMIN acting on a SUPERADMIN', async () => {
    vi.mocked(repo.findUserById).mockResolvedValue(rec({ role: 'SUPERADMIN' }) as never);
    vi.mocked(repo.countAdmins).mockResolvedValue(3);
    expect((await service.updateUserRole(superadmin, 'u2', { role: 'USER' })).ok).toBe(true);
  });

  it('rejects a role that is not in the enum', async () => {
    vi.mocked(repo.findUserById).mockResolvedValue(rec() as never);
    const result = await service.updateUserRole(admin, 'u2', { role: 'OWNER' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('Validation');
  });

  it('refuses to demote the last administrator', async () => {
    // Two admins could previously demote each other and lock the institution
    // out of its own console.
    vi.mocked(repo.findUserById).mockResolvedValue(rec({ role: 'ADMIN' }) as never);
    vi.mocked(repo.countAdmins).mockResolvedValue(1);
    const result = await service.updateUserRole(superadmin, 'u2', { role: 'USER' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('Conflict');
    expect(repo.updateRole).not.toHaveBeenCalled();
  });

  it('allows demoting an admin when others remain', async () => {
    vi.mocked(repo.findUserById).mockResolvedValue(rec({ role: 'ADMIN' }) as never);
    vi.mocked(repo.countAdmins).mockResolvedValue(2);
    expect((await service.updateUserRole(superadmin, 'u2', { role: 'USER' })).ok).toBe(true);
  });

  it('does not count admins when promoting', async () => {
    vi.mocked(repo.findUserById).mockResolvedValue(rec({ role: 'USER' }) as never);
    expect((await service.updateUserRole(admin, 'u2', { role: 'ADMIN' })).ok).toBe(true);
    expect(repo.countAdmins).not.toHaveBeenCalled();
  });
});

describe('deleteUser', () => {
  it('refuses self-deletion', async () => {
    vi.mocked(repo.findUserById).mockResolvedValue(rec({ id: 'a1', role: 'ADMIN' }) as never);
    expect((await service.deleteUser(admin, 'a1')).ok).toBe(false);
  });

  it('refuses to remove the last administrator', async () => {
    vi.mocked(repo.findUserById).mockResolvedValue(rec({ role: 'ADMIN' }) as never);
    vi.mocked(repo.countAdmins).mockResolvedValue(1);
    const result = await service.deleteUser(superadmin, 'u2');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('Conflict');
  });

  it('answers NotFound for an unknown user', async () => {
    vi.mocked(repo.findUserById).mockResolvedValue(null);
    const result = await service.deleteUser(admin, 'nope');
    if (!result.ok) expect(result.error.kind).toBe('NotFound');
  });

  it('removes the user, cascading their sessions', async () => {
    vi.mocked(repo.findUserById).mockResolvedValue(rec() as never);
    vi.mocked(repo.countAdmins).mockResolvedValue(2);
    expect((await service.deleteUser(admin, 'u2')).ok).toBe(true);
    expect(repo.deleteUser).toHaveBeenCalledWith('u2');
  });
});

describe('getSelf', () => {
  it('returns null for an anonymous caller rather than erroring', () => {
    const result = service.getSelf({ kind: 'anonymous' });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBeNull();
  });

  it('never exposes the email or the password hash', () => {
    const result = service.getSelf(admin);
    if (result.ok && result.value) {
      expect(Object.keys(result.value).sort()).toEqual(['canCreateEvents', 'id', 'role']);
    }
  });
});

describe('updateUserPermissions', () => {
  it('is admins only', async () => {
    expect((await service.updateUserPermissions(member, 'u2', { canCreateEvents: true })).ok).toBe(false);
  });

  it('answers NotFound for an unknown user', async () => {
    vi.mocked(repo.findUserById).mockResolvedValue(null);
    const result = await service.updateUserPermissions(admin, 'nope', { canCreateEvents: true });
    if (!result.ok) expect(result.error.kind).toBe('NotFound');
  });

  it('rejects a non-boolean value instead of handing it to the database', async () => {
    vi.mocked(repo.findUserById).mockResolvedValue(rec() as never);
    const result = await service.updateUserPermissions(admin, 'u2', { canCreateEvents: 'yes' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('Validation');
    expect(repo.updatePermissions).not.toHaveBeenCalled();
  });

  it('applies a valid change', async () => {
    vi.mocked(repo.findUserById).mockResolvedValue(rec() as never);
    expect((await service.updateUserPermissions(admin, 'u2', { canCreateEvents: true })).ok).toBe(true);
    expect(repo.updatePermissions).toHaveBeenCalledWith('u2', true);
  });
});
