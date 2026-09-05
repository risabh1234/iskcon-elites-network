import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Import boundaries (CLAUDE.md, rule 1).
 *
 *   app/     ──▶  components/, domain/, server/, lib/
 *   domain/  ──▶  server/, lib/
 *   domain/  ──✗──▶  app/, components/
 *
 * These are not stylistic. Business rules that import a React component cannot
 * be unit-tested or reused from a script; Prisma calls scattered outside the
 * repositories cannot be cached or audited in one place; and Clerk read from
 * sixteen files is how one endpoint ended up comparing against a different role
 * vocabulary than the other fifteen (docs/AUDIT.md §3).
 *
 * NOTE ON ORDERING: flat config does not merge rule options — for a given file
 * the LAST matching block wins outright. So each exemption below re-declares
 * the whole restriction minus the one import it is allowed, and the blocks run
 * general-to-specific. Adding a fourth block that sets `no-restricted-imports`
 * without re-declaring the rest would silently switch the others off.
 */
const PRISMA = [
  {
    name: "@/lib/prisma",
    message:
      "Only domain/<entity>/repository.ts may query the database. Call the service instead.",
  },
  {
    name: "@prisma/client",
    message:
      "Only domain/<entity>/repository.ts may query the database. Call the service instead.",
  },
];

const CLERK = [
  {
    name: "@clerk/nextjs/server",
    message:
      "Only server/auth.ts may read Clerk. Use getActor() and can() so authorisation lives in one place.",
  },
];

const NO_UI_FROM_DOMAIN = [
  {
    group: [
      "@/app",
      "@/app/*",
      "@/components",
      "@/components/*",
      "../app/*",
      "../components/*",
      "../../app/*",
      "../../components/*",
    ],
    message:
      "domain/ may not import from app/ or components/. Business rules must not depend on the UI — move the shared type into domain/ or lib/.",
  },
];

const restrict = (paths, patterns = []) => ({
  "no-restricted-imports": ["error", { paths, ...(patterns.length ? { patterns } : {}) }],
});

const boundaries = [
  // 1. Baseline for everything under src/.
  {
    name: "boundaries/baseline",
    files: ["src/**/*.ts", "src/**/*.tsx"],
    rules: restrict([...PRISMA, ...CLERK]),
  },
  // 2. domain/ additionally may not reach for the UI.
  {
    name: "boundaries/domain",
    files: ["src/domain/**/*.ts", "src/domain/**/*.tsx"],
    rules: restrict([...PRISMA, ...CLERK], NO_UI_FROM_DOMAIN),
  },
  // 3. Repositories are the one place Prisma is allowed.
  {
    name: "boundaries/repository",
    files: ["src/domain/*/repository.ts"],
    rules: restrict([...CLERK], NO_UI_FROM_DOMAIN),
  },
  // 4. The Prisma singleton itself.
  {
    name: "boundaries/prisma-singleton",
    files: ["src/lib/prisma.ts"],
    rules: restrict([...CLERK]),
  },
  // 5. proxy.ts is the framework's entry point for clerkMiddleware.
  {
    name: "boundaries/proxy",
    files: ["src/proxy.ts"],
    rules: restrict([...PRISMA]),
  },
  // 6. server/auth.ts resolves a Clerk session into an Actor, so it needs both.
  {
    name: "boundaries/auth",
    files: ["src/server/auth.ts"],
    rules: { "no-restricted-imports": "off" },
  },
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  ...boundaries,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    ".open-next/**",
    "next-env.d.ts",
    "coverage/**",
  ]),
]);

export default eslintConfig;
