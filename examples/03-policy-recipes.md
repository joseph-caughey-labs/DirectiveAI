# Policy recipes

## Deny dangerous paths

```yml
- id: deny-secrets
  when:
    touched_globs: ["**/.env", "**/.env.*"]
  deny:
    message: "Do not modify env files via DirectiveAI."
```

## Require tests for auth/payments

```yml
- id: auth-requires-tests
  when:
    intent_keywords: ["auth", "login", "token", "wallet", "payment"]
    touched_globs: ["src/**", "functions/**"]
  require:
    any_verify_checks: ["test"]
```

## Add verify checks when touching migrations

```yml
- id: migrations-add-verify
  when:
    touched_globs: ["**/migrations/**"]
  verify_add:
    - name: migrate-check
      cmd: npm run migrate:check
```

