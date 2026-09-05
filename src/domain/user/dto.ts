import type { Role } from '@/server/policy';

/**
 * Admin-facing. `clerkId` is deliberately absent: it is an identifier for a
 * third-party system and nothing in the console needs it, but the previous
 * handler selected it into the browser payload for every user in the register.
 */
export type UserDto = {
  id: string;
  email: string;
  username: string | null;
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
  clerkId: string;
  email: string;
  username: string | null;
  role: string;
  canCreateEvents: boolean;
  createdAt: Date;
};

export function toUserDto(record: UserRecord): UserDto {
  return {
    id: record.id,
    email: record.email,
    username: record.username,
    role: record.role as Role,
    canCreateEvents: record.canCreateEvents,
    createdAt: record.createdAt.toISOString(),
  };
}
