import type { Role } from '@/server/policy';

/** Admin-facing. */
export type UserDto = {
  id: string;
  email: string;
  username: string | null;
  name: string | null;
  role: Role;
  canCreateEvents: boolean;
  createdAt: string;
};

/** What the signed-in user learns about themselves. */
export type SelfDto = {
  id: string;
  role: Role;
  canCreateEvents: boolean;
};

export type UserRecord = {
  id: string;
  email: string;
  username: string | null;
  name: string | null;
  role: string;
  canCreateEvents: boolean;
  createdAt: Date;
  /** True when the account can sign in with a password at all. */
  hasPassword?: boolean;
};

export function toUserDto(record: UserRecord): UserDto {
  return {
    id: record.id,
    email: record.email,
    username: record.username,
    name: record.name,
    role: record.role as Role,
    canCreateEvents: record.canCreateEvents,
    createdAt: record.createdAt.toISOString(),
  };
}
