import { expect, test } from '@playwright/test';

/**
 * The console must refuse everyone who is not a reviewer.
 *
 * These run against a server started separately (see package.json `e2e`), so
 * they exercise the real proxy, the real layout gate and the real services
 * rather than a mock of any of them.
 */
const ADMIN_ROUTES = [
  '/admin',
  '/admin/members',
  '/admin/events',
  '/admin/stories',
  '/admin/users',
  '/admin/media',
  '/admin/audit',
] as const;

test.describe('signed out', () => {
  for (const route of ADMIN_ROUTES) {
    test(`${route} redirects to sign-in`, async ({ page }) => {
      const response = await page.goto(route);

      // The proxy sends an unauthenticated caller to sign in, carrying the
      // destination so they land where they were going.
      await expect(page).toHaveURL(/\/sign-in\?redirectTo=/);
      expect(response?.status()).toBeLessThan(400);
    });
  }

  test('a forged session cookie does not get past the layout gate', async ({ page, context }) => {
    // The proxy only checks that a cookie is PRESENT — it cannot validate one
    // without a database round trip on every request. This proves the real
    // check, `can(actor, 'admin:access')`, is the one that stops it.
    await context.addCookies([
      {
        name: 'ien_session',
        value: 'not-a-real-session-token',
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.goto('/admin/members');

    // Asserted as an absence rather than a specific page, because the two
    // failure modes are both acceptable and which one appears depends on the
    // environment: with a database reachable the layout renders the denial,
    // and without one `getActor()` throws and the error boundary renders. Both
    // fail closed. What must never happen is the console rendering.
    await expect(page.getByRole('navigation', { name: 'Console sections' })).toHaveCount(0);
    await expect(page.getByRole('table')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Audit' })).toHaveCount(0);
  });
});

test.describe('the console is not indexable', () => {
  test('admin pages are marked noindex', async ({ page }) => {
    await page.goto('/admin/members');
    const robots = page.locator('meta[name="robots"]');
    await expect(robots).toHaveAttribute('content', /noindex/);
  });
});

/**
 * Signed-in, non-admin access needs a real account and therefore a database.
 * The policy layer covers every (role x action) combination in
 * src/domain/__tests__/policy.test.ts; this spec is where the same rules are
 * proven end to end once a seeded database is available.
 */
test.describe('signed in as a member', () => {
  test.skip(
    !process.env.E2E_MEMBER_EMAIL,
    'Set E2E_MEMBER_EMAIL and E2E_MEMBER_PASSWORD against a seeded database.',
  );

  test.beforeEach(async ({ page }) => {
    await page.goto('/sign-in');
    await page.getByLabel('Email').fill(process.env.E2E_MEMBER_EMAIL!);
    await page.getByLabel('Password').fill(process.env.E2E_MEMBER_PASSWORD!);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL(/\/directory/);
  });

  for (const route of ADMIN_ROUTES) {
    test(`${route} is refused`, async ({ page }) => {
      await page.goto(route);
      await expect(
        page.getByRole('heading', { name: /don’t have access to the console/i }),
      ).toBeVisible();
      await expect(page.getByRole('table')).toHaveCount(0);
    });
  }
});
