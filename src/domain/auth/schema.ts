import { z } from 'zod';

/**
 * Password rules follow NIST SP 800-63B: length is what matters, and
 * composition rules ("one number, one symbol") mostly push people towards
 * Passw0rd! without adding real entropy.
 */
export const MIN_PASSWORD_LENGTH = 10;
export const MAX_PASSWORD_LENGTH = 200;

export const emailField = z
  .string()
  .trim()
  .min(1, 'Enter your email address.')
  .max(200)
  .email('That does not look like an email address.')
  // Lower-cased so a@Example.com and a@example.com are the same account.
  .transform((v) => v.toLowerCase());

export const signUpSchema = z.object({
  name: z.string().trim().min(1, 'Enter your name.').max(120),
  email: emailField,
  password: z
    .string()
    .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters.`)
    .max(MAX_PASSWORD_LENGTH),
});

export const signInSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Enter your password.').max(MAX_PASSWORD_LENGTH),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
