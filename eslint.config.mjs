import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import boundaries from "eslint-plugin-boundaries";

/**
 * Backend isolation is enforced here so the boundary lives in CI, not in
 * convention. Violations break `npm run lint`.
 *
 * Rules (mirroring "Backend Architecture" → "Dependency rules" in TEAM_PROMPT):
 *   1. `src/backend/**` may import only from itself + a small allowlist of
 *      third-party libraries. It must NOT import from `next/*`, `next-auth`,
 *      or any frontend folder (`src/app/**`, `src/components/**`,
 *      `src/hooks/**`, `src/lib/**`).
 *   2. Frontend code (`src/app/**`, `src/components/**`, `src/hooks/**`)
 *      may import from `@/backend` (the public surface) but must NOT
 *      reach into `src/backend/services/**` or `src/backend/models/**`.
 *
 * The `no-restricted-imports` rule below is a redundant guardrail
 * specifically for `next/*` and `next-auth` - `eslint-plugin-boundaries`
 * handles the cross-element rules; `no-restricted-imports` handles
 * specific package patterns that boundaries can't express.
 */

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // -------------------------------------------------------------------------
  // Boundary rules - applied to all source files.
  // -------------------------------------------------------------------------
  {
    plugins: { boundaries },
    settings: {
      // Resolve `@/...` TypeScript path aliases so boundary rules see the
      // real folder location instead of the alias.
      "import/resolver": {
        typescript: {
          project: "./tsconfig.json",
        },
        node: true,
      },
      "boundaries/include": ["src/**/*"],
      "boundaries/elements": [
        // Backend-internal layers (each may import from other backend layers
        // per the rules below).
        { type: "backend-controllers", pattern: "src/backend/controllers/**" },
        { type: "backend-services", pattern: "src/backend/services/**" },
        { type: "backend-models", pattern: "src/backend/models/**" },
        { type: "backend-db", pattern: "src/backend/db/**" },
        { type: "backend-types", pattern: "src/backend/types/**" },
        { type: "backend-validation", pattern: "src/backend/validation/**" },
        { type: "backend-public", pattern: "src/backend/index.ts", mode: "file" },

        // Frontend.
        { type: "app", pattern: "src/app/**" },
        { type: "components", pattern: "src/components/**" },
        { type: "hooks", pattern: "src/hooks/**" },
        { type: "lib", pattern: "src/lib/**" },
        { type: "middleware", pattern: "src/middleware.ts", mode: "file" },
        { type: "emails", pattern: "src/emails/**" },
      ],
    },
    rules: {
      // Rule (1): backend folder may only import from itself.
      // Rules (2)+(3): frontend may import from backend public surface only -
      // never directly from services or models.
      "boundaries/element-types": [
        "error",
        {
          default: "allow",
          rules: [
            // Backend layers can freely import other backend layers.
            {
              from: [
                "backend-controllers",
                "backend-services",
                "backend-models",
                "backend-db",
                "backend-types",
                "backend-validation",
                "backend-public",
              ],
              disallow: ["app", "components", "hooks", "lib", "middleware"],
              message:
                "Backend code (src/backend/**) must not import from frontend folders. Move shared logic into src/backend/.",
            },
            // Frontend / route layer must use the public surface, not internals.
            {
              from: ["app", "components", "hooks", "middleware"],
              disallow: [
                "backend-services",
                "backend-models",
                "backend-controllers",
                "backend-db",
                "backend-validation",
              ],
              message:
                "Import from '@/backend' (the public surface) instead of reaching into src/backend/{services,models,controllers,db,validation}/* directly.",
            },
            // `src/lib` is frontend-only - must not pull in backend internals.
            {
              from: ["lib"],
              disallow: [
                "backend-services",
                "backend-models",
                "backend-controllers",
                "backend-db",
                "backend-validation",
              ],
              message:
                "src/lib is frontend-only. If you need backend logic, expose it via @/backend.",
            },
            // `src/emails/` is presentational + portable. Templates may only
            // import from themselves and third-party libs - never from any
            // app/component/hook/lib/backend internal. The email service
            // (a backend service) imports the templates, not the other way.
            {
              from: ["emails"],
              disallow: [
                "app",
                "components",
                "hooks",
                "lib",
                "middleware",
                "backend-services",
                "backend-models",
                "backend-controllers",
                "backend-db",
                "backend-types",
                "backend-validation",
                "backend-public",
              ],
              message:
                "src/emails/ may only import from itself and third-party libraries. The email service imports templates from here; the dependency direction must not reverse.",
            },
          ],
        },
      ],
    },
  },

  // -------------------------------------------------------------------------
  // Backend folder: forbid Next.js, NextAuth, and any non-backend internal path.
  // (Boundaries handles internal paths; this catches the package names.)
  // -------------------------------------------------------------------------
  {
    files: ["src/backend/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["next", "next/*", "next/**"],
              message:
                "Backend code is framework-agnostic. Do not import from 'next/*' inside src/backend/.",
            },
            {
              group: ["next-auth", "next-auth/*"],
              message:
                "NextAuth wraps the backend from the route layer. Inside src/backend/, expose pure functions (e.g. authService.verifyCredentials) that NextAuth calls.",
            },
            {
              group: ["@/app/*", "@/components/*", "@/hooks/*", "@/lib/*"],
              message:
                "Backend code must not depend on frontend modules. Move shared types/helpers into src/backend/.",
            },
          ],
        },
      ],
    },
  },

  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
