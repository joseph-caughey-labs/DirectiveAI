# Governance

This project follows a **Benevolent Maintainer** governance model.

## Roles

### Maintainer
**Joseph Caughey** is the project maintainer and holds final decision authority over:
- Project direction and roadmap
- Release management
- Security decisions and disclosure handling
- Breaking changes and deprecations
- Governance updates and maintainer appointments

### Contributors
Anyone may contribute via issues, discussions, pull requests, and documentation updates.

## Decision-making

### Day-to-day changes
Small fixes, docs, and non-breaking improvements are handled via normal PR review.

### Major changes
Major changes include (but aren’t limited to):
- Breaking CLI behavior changes
- Directive spec format changes
- Policy engine semantics changes
- Runner/CI architecture changes
- New execution capabilities that modify repositories automatically

Major changes should have:
1. An issue describing rationale and tradeoffs
2. A small design note (issue body or short markdown doc)
3. Maintainer approval prior to merge

## Stability philosophy

This is infrastructure software. Priorities:
1. Safety and determinism
2. Predictability and clarity
3. Backwards compatibility
4. Extensibility

## Governance changes

Updates to this file require a PR and maintainer approval.

## License

MIT.
