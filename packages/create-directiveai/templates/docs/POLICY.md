# Policy (v1)

Policy lives at `.ai/policy.yml`.

Use it to:
- deny dangerous changes
- require verify checks for high-risk areas
- add verify commands when certain paths change

## Example

```yml
rules:
  - id: no-secrets
    when:
      touched_globs: ["**/.env", "**/.env.*"]
    deny:
      message: "Don't modify secrets via DirectiveAI."

  - id: auth-requires-tests
    when:
      intent_keywords: ["auth","login","token"]
      touched_globs: ["src/**"]
    require:
      any_verify_checks: ["test"]
```
