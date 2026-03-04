# Project Vision

**DirectiveAI** is a lightweight, editor-agnostic standard for writing structured AI directives inside repositories and compiling them into safe, auditable feature branches.

## The problem

AI can accelerate development, but most workflows are either:
- unstructured (chat-driven) and hard to reproduce, or
- tightly coupled to a single IDE or vendor.

Teams need a repo-native way to communicate intent and turn it into changes with traceability, safety rails, consistent verification, and predictable outputs.

## The approach

DirectiveAI treats AI work like a compiler pipeline:

1. **Directives**: intent captured in files and/or code comments
2. **Ingest**: normalize directives into explicit specs
3. **Scope**: discover → propose → lock
4. **Compile**: generate patches, apply safely with rollback
5. **Policy**: enforce repo rules and required verification
6. **Verify**: run checks selected based on what changed
7. **Review & PR**: generate standardized artifacts
8. **CI parity**: export the same rules to CI

## Principles

- Language agnostic
- Editor agnostic
- Git-first
- Safety-first
- Auditable outputs (`.ai/out/`)
- Composable modules over monoliths

## What success looks like

- Directives become normal codebase communication
- “Compile to feature” becomes as routine as “run tests”
- `.ai/` standard is portable across repos and teams
- Tooling stays small, boring, reliable, and well-documented
