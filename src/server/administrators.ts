/**
 * Designated administrators.
 *
 * Two addresses hold the register by standing arrangement rather than by
 * someone having clicked a button. They exist because the alternative — "the
 * first account to register becomes SUPERADMIN" — is a bootstrap that works
 * exactly once, on an empty database, and answers nothing about who is
 * supposed to be in charge afterwards.
 *
 * Consequences, all of them deliberate:
 *
 *  - An account created with one of these addresses is SUPERADMIN from its
 *    first request, whether it registers with a password or with Google.
 *  - The role is reconciled at every sign-in, so the arrangement survives an
 *    accidental demotion, a restored backup, and an account that existed
 *    before this list did.
 *  - Because it is reconciled, the console must not offer to demote them: a
 *    control that appears to work and silently reverts on the next sign-in is
 *    worse than one that refuses. `policy.ts` refuses, via `targetIsProtected`.
 *
 * Removing an address here removes the arrangement; the account keeps whatever
 * role it currently holds, and the console can then change it like any other.
 */
const DESIGNATED = [
  'tukaramd.official@gmail.com',
  'risabhbharadwaj4@gmail.com',
] as const;

/** Emails are stored lower-cased, and compared that way. */
const normalise = (email: string) => email.trim().toLowerCase();

/**
 * The effective list: the addresses above, plus anything in `ADMIN_EMAILS`
 * (comma-separated). The environment can add, so a deployment can seat an
 * administrator without a release; it cannot remove, because an environment
 * variable is not where "who runs this institution" should be decided.
 */
export function administratorEmails(raw = process.env.ADMIN_EMAILS): Set<string> {
  const fromEnv = (raw ?? '')
    .split(',')
    .map(normalise)
    .filter((entry) => entry.includes('@'));

  return new Set([...DESIGNATED.map(normalise), ...fromEnv]);
}

export function isDesignatedAdministrator(
  email: string | null | undefined,
  raw?: string,
): boolean {
  if (!email) return false;
  return administratorEmails(raw).has(normalise(email));
}
