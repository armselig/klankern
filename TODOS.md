# TODOS

Tracked follow-ups. Each item includes context so it's actionable when picked up.

---

## AUTH-001: Rate limiting on `POST /api/auth/register`

**Status:** Deferred — add after auth + onboarding ships
**What:** Add `nuxt-security` `rateLimiter` to the register endpoint — 10 requests/hour per IP.
**Why:** An open registration endpoint without rate limiting is an account-creation bot target. The `409` response for existing emails also leaks whether an address is registered — rate limiting reduces the enumeration window.
**Pros:** Trivially prevents brute-force account creation with existing infrastructure dependency.
**Cons:** Rate limiting can cause false positives in CI/E2E tests — must be bypassed in `NODE_ENV=test`.
**Context:** `nuxt-security` is already a declared dependency. The design doc (`~/.gstack/projects/klankern/henneuma-develop-design-20260324-103323.md`) explicitly deferred this as a "fast follow after initial ship." The `POST /api/auth/register` endpoint is created in the auth + onboarding iteration.
**Depends on:** Auth + onboarding PR (branch: develop) merged.

---

## DESIGN-001: Create DESIGN.md via /design-consultation

**Status:** Deferred — add after auth + onboarding ships
**What:** Run `/design-consultation` to formalize the project's design system into a `DESIGN.md` file.
**Why:** The auth + onboarding iteration established several design decisions (auth card layout, 4px radius token, heading scale `--font-lg/xl`, color token values, error placement patterns) that are currently only documented in the plan file. Without a DESIGN.md, future feature implementers will rediscover or contradict these decisions.
**Pros:** All future features have a single source of truth for visual decisions. Eliminates per-feature design review startup cost.
**Cons:** Takes ~30 minutes of back-and-forth with the design consultation skill. Low priority until second UI feature is planned.
**Context:** `theme.css` is the current token source. Auth + onboarding plan (`~/.gstack/projects/klankern/henneuma-develop-design-20260324-103323.md`) contains the decisions to fold in. Key decisions made during auth review: `--radius-sm: 4px`, `--font-lg: 1.25rem`, `--font-xl: 2rem`, auth card max-width 420px, system font, `--color-primary` only for large/bold text (contrast ratio 3.1:1, passes large text AA only).
**Depends on:** Auth + onboarding PR (branch: develop) merged.

---

## AUTH-002: Email sending infrastructure

**Status:** Deferred — requires provider decision
**What:** Wire up a transactional email provider (Resend recommended — has a generous free tier and a clean Node SDK) to make email verification and password reset functional.
**Why:** The email verify nudge currently shows a "Verification email sent" toast that lies — no email is ever sent (`// TODO: email sending not yet implemented` comment at the call site). Password reset is fully gated on this.
**Pros:** Unblocks password reset, makes the verification nudge honest, completes the auth story.
**Cons:** New infrastructure dependency + provider account required.
**Context:** `server/api/auth/send-verification.post.ts` is stubbed. The stub generates a verification token and logs it but does not send. `nuxt-mailer` provides the Nuxt integration layer. Start at the stub — it already handles token generation.
**Depends on:** Provider account decision. Unblocked otherwise.
