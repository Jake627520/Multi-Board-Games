# Change 003 Design: Open Source License and IP Governance

## 1. Architectural Strategy

The licensing strategy preserves a strict boundary across repository elements:

```text
┌─────────────────────────────────────────────────────────┐
│                    Repository Root                      │
├──────────────────────────┬──────────────────────────────┤
│ Original Source Code     │ MIT License (LICENSE)        │
│ Architecture / Docs      │ MIT License (LICENSE)        │
│ Traditional Game Rules   │ Public Domain Concepts       │
├──────────────────────────┼──────────────────────────────┤
│ Third-Party npm Packages │ Upstream Licenses (MIT/Ap-2) │
│ Future External Datasets │ Sourced License / Provenance │
│ Future External Engines  │ Process Boundary Isolation   │
└──────────────────────────┴──────────────────────────────┘
```

## 2. Policy Structure
- **`LICENSE`**: Standard OSI-approved MIT text designating `Jake627520 (Multi Board Games Platform Contributors)` as copyright holder.
- **`docs/THIRD_PARTY_LICENSES.md`**: Upstream license catalog detailing runtime vs tooling dependencies.
- **`docs/COPYRIGHT_POLICY.md`**: Operational rules preventing accidental unlicensed asset ingestion or copyleft contagion.
- **`tests/core/licensing.test.ts`**: Automated repository-level contract test checking required file existence, package license validity, and documentation cross-references.

## 3. Risk Mitigation
- **Copyleft contamination**: Any future integration of GPLv3 Xiangqi engines (e.g. Pikafish/Stockfish) must communicate via standardized UCI/UCCI text protocol across subprocess/worker boundaries, preventing viral copyleft contamination of the core platform.
