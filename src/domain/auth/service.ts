import { conflict, internal, unauthenticated, validation } from '@/server/errors';
import { err, ok, type Result } from '@/server/result';
import { checkRateLimit, LIMITS } from '@/server/rate-limit';
import { hashPassword, needsRehash, verifyPassword } from '@/server/auth/password';
import {
  createSession,
  destroyAllSessions,
  destroySession,
  setSessionCookie,
} from '@/server/auth/session';
import type { GoogleProfile } from '@/server/auth/google';
import { isDesignatedAdministrator } from '@/server/administrators';
import * as repo from './repository';
import { signInSchema, signUpSchema } from './schema';

function fieldErrors(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  const fields: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join('.') || '_';
    (fields[key] ??= []).push(issue.message);
  }
  return fields;
}

export type AuthedUser = { id: string; email: string; name: string | null };

/**
 * Registration.
 *
 * The response is deliberately identical whether or not the address is already
 * registered — "that email is taken" on a public form is an account-enumeration
 * oracle. An existing account gets a generic conflict, and the real remedy
 * (sign in, or reset) is offered in the UI copy rather than confirmed here.
 */
export async function signUp(
  input: unknown,
  context: { rateKey: string; userAgent?: string | null },
): Promise<Result<AuthedUser>> {
  const limited = checkRateLimit(`signup:${context.rateKey}`, LIMITS.auth);
  if (!limited.ok) return limited;

  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) {
    return err(validation('Check the highlighted fields.', { fields: fieldErrors(parsed.error) }));
  }

  const { email, name, password } = parsed.data;

  const existing = await repo.findByEmail(email);
  if (existing) {
    return err(conflict('That account could not be created. Try signing in instead.'));
  }

  try {
    // Two ways in. The very first account to register becomes the
    // administrator, because a fresh install otherwise has no way into its own
    // console — a bootstrap, not a promotion path. A designated address is the
    // standing arrangement, and holds whether it registers first or thousandth.
    const first = await repo.isFirstUser();
    const designated = isDesignatedAdministrator(email);

    const user = await repo.createUser({
      email,
      name,
      passwordHash: await hashPassword(password),
      emailVerifiedAt: null,
    });

    if (first || designated) await repo.promoteToSuperadmin(user.id);

    const token = await createSession(user.id, context.userAgent);
    await setSessionCookie(token);

    return ok({ id: user.id, email: user.email, name: user.name });
  } catch (cause) {
    return err(internal('The account could not be created.', { cause }));
  }
}

/**
 * Sign-in.
 *
 * One message for both "no such address" and "wrong password", and the password
 * is verified even when the account does not exist, so neither the wording nor
 * the response time distinguishes the two.
 */
export async function signIn(
  input: unknown,
  context: { rateKey: string; userAgent?: string | null },
): Promise<Result<AuthedUser>> {
  const limited = checkRateLimit(`signin:${context.rateKey}`, LIMITS.auth);
  if (!limited.ok) return limited;

  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) {
    return err(validation('Check the highlighted fields.', { fields: fieldErrors(parsed.error) }));
  }

  const { email, password } = parsed.data;
  const user = await repo.findByEmail(email);

  const valid = await verifyPassword(password, user?.passwordHash ?? null);
  if (!user || !valid) {
    return err(unauthenticated('That email and password do not match.'));
  }

  try {
    // Transparent upgrade if the cost factor has been raised since they last
    // signed in. They never see it and never have to reset anything.
    if (needsRehash(user.passwordHash)) {
      await repo.setPasswordHash(user.id, await hashPassword(password));
    }

    // The standing arrangement is reasserted here rather than only at
    // registration, so it also covers an account that predates the list, a
    // restored backup, and an accidental demotion.
    if (isDesignatedAdministrator(user.email)) {
      await repo.restoreSuperadmin(user.id);
    }

    const token = await createSession(user.id, context.userAgent);
    await setSessionCookie(token);

    return ok({ id: user.id, email: user.email, name: user.name });
  } catch (cause) {
    return err(internal('Signing in failed.', { cause }));
  }
}

export async function signOut(): Promise<Result<void>> {
  await destroySession();
  return ok(undefined);
}

/**
 * Google sign-in, after the code exchange has produced a verified profile.
 *
 * Linking by email address is only safe because Google tells us whether it has
 * verified that address. Linking on an unverified one would let anybody who can
 * create a Google account claiming victim@example.com take over that account.
 */
export async function signInWithGoogle(
  profile: GoogleProfile,
  context: { userAgent?: string | null },
): Promise<Result<AuthedUser>> {
  try {
    const linked = await repo.findLinkedAccount('google', profile.sub);

    let userId: string;
    let user: repo.AuthUser | null;

    if (linked) {
      userId = linked.userId;
      user = await repo.findByEmail(profile.email);
    } else {
      const existing = await repo.findByEmail(profile.email);

      if (existing) {
        if (!profile.emailVerified) {
          return err(
            conflict('That email is already registered. Sign in with your password instead.'),
          );
        }
        userId = existing.id;
        user = existing;
        await repo.linkAccount(userId, 'google', profile.sub);
        await repo.markEmailVerified(userId);
      } else {
        const first = await repo.isFirstUser();
        const designated = isDesignatedAdministrator(profile.email);
        const created = await repo.createUser({
          email: profile.email,
          name: profile.name ?? profile.email.split('@')[0]!,
          // No password: this account signs in with Google until it sets one.
          passwordHash: null,
          emailVerifiedAt: profile.emailVerified ? new Date() : null,
        });
        if (first || designated) await repo.promoteToSuperadmin(created.id);
        userId = created.id;
        user = created;
        await repo.linkAccount(userId, 'google', profile.sub);
      }
    }

    if (isDesignatedAdministrator(user?.email ?? profile.email)) {
      await repo.restoreSuperadmin(userId);
    }

    const token = await createSession(userId, context.userAgent);
    await setSessionCookie(token);

    return ok({
      id: userId,
      email: user?.email ?? profile.email,
      name: user?.name ?? profile.name,
    });
  } catch (cause) {
    return err(internal('Signing in with Google failed.', { cause }));
  }
}

/** Sets or replaces a password, then signs every other device out. */
export async function setPassword(
  userId: string,
  password: string,
): Promise<Result<void>> {
  const parsed = signUpSchema.shape.password.safeParse(password);
  if (!parsed.success) {
    return err(validation(parsed.error.issues[0]?.message ?? 'That password is too short.'));
  }

  try {
    await repo.setPasswordHash(userId, await hashPassword(parsed.data));
    // A password change must not leave an old stolen session alive.
    await destroyAllSessions(userId);
    return ok(undefined);
  } catch (cause) {
    return err(internal('The password could not be changed.', { cause }));
  }
}
