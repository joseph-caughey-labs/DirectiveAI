# Security Policy

## Supported versions
Security updates are provided for the latest **minor** release line (e.g. `1.x`). Critical fixes may be backported at the maintainer’s discretion.

## Reporting a vulnerability
Please report security issues **privately**.

Include:
- clear description
- reproduction steps / proof-of-concept
- affected versions
- impact assessment
- any suggested mitigation

## What counts as a security issue?
Examples:
- arbitrary command execution via directive/config parsing
- path traversal or unintended writes outside repo root
- leaking secrets into `.ai/out/` artifacts
- unsafe runner defaults exposing host credentials

## Disclosure process
1. Acknowledge receipt
2. Reproduce and assess severity
3. Develop and test fix
4. Release with security notes
5. Credit given if requested

## Security design goals
- No hidden network activity
- Explicit opt-in for remote execution
- Least-privilege runner defaults
- Avoid storing secrets in artifacts
- Prefer deterministic behavior where feasible
