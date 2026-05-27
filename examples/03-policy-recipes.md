# Policy recipes

Policies live in `.ai/policy.yml` and apply to **every** run. They're the repo-wide guard rails — distinct from per-directive `scope` (which only binds the files for one batch).

## When to use what

| Concern | Where it lives | Scope |
| --- | --- | --- |
| "Never touch X" repo-wide | `policy.yml` `deny` | All runs, all directives |
| "This task may only touch Y" | Directive `scope.allow` | One run |
| "Auth changes need tests" | `policy.yml` `require` | Conditional on intent + paths |

## Deny dangerous paths

```yaml
rules:
  - id: deny-secrets
    when:
      touched_globs: ["**/.env", "**/.env.*"]
    deny:
      message: "Do not modify env files via DirectiveAI."
```

Run output when violated:

```json
// .ai/out/FEAT-001/policy.violations.json
{
  "id": "batch",
  "status": "fail",
  "violations": [
    { "rule_id": "deny-secrets", "message": "Do not modify env files via DirectiveAI.", "at": "..." }
  ]
}
```

## Require tests for sensitive areas

Fires only when both intent **and** touched paths match:

```yaml
rules:
  - id: auth-requires-tests
    when:
      intent_keywords: ["auth", "login", "token", "wallet", "payment"]
      touched_globs:   ["src/**", "functions/**"]
    require:
      any_verify_checks: ["test"]
      message: "Auth/payments changes require a passing test check."
```

Workflow that satisfies it:

```bash
npx directiveai run --ready --branch FEAT-AUTH-12
npx directiveai verify-auto FEAT-AUTH-12   # runs `test` per .ai/config.yml
# policy now sees a passing "test" check → run can be reviewed and shipped
```

## Cap blast radius

`deny_if.max_files_touched_over` bounds how many files a single run may modify. `--force` bypasses it (and is recorded in the violation file).

```yaml
rules:
  - id: cap-blast-radius
    when:
      always: true
    deny_if:
      max_files_touched_over: 25
      message: "Refusing run that touches >25 files. Split the directive or pass --force."
```

## Pair with directive scope-lock

Policy is the repo guard rail; `scope` is the per-directive contract. Use both:

```yaml
# .ai/policy.yml — repo-wide
rules:
  - id: deny-secrets
    when: { touched_globs: ["**/.env*"] }
    deny: { message: "no env edits" }
```

```yaml
# directive
id: marquee-fix
scope:
  allow: ["src/components/Marquee/**"]
```

A run that tries to edit `src/components/Marquee/.env` is blocked twice — once by policy `deny-secrets`, once by `scope.allow` (the `.env` isn't in the allow list anyway). Defense in depth.

## Pattern reference

| Field | Meaning |
| --- | --- |
| `when.always: true` | Rule always evaluates |
| `when.touched_globs: [...]` | Rule triggers if any touched file matches any glob |
| `when.intent_keywords: [...]` | Rule triggers if directive intent (case-insensitive) contains any keyword |
| `deny.message` | Hard block with explanation |
| `deny_if.max_files_touched_over: N` | Block if more than N files changed (unless `--force`) |
| `require.any_verify_checks: ["test", "lint"]` | At least one named verify check must have passed |
