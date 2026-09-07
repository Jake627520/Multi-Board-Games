# Intellectual Property & Copyright Policy

This document defines the copyright boundaries, licensing scope, and asset attribution rules for the **Multi Board Games Platform**.

---

## 1. Original Source Code

All original source code, architecture specifications, test suites, UI component implementations, and documentation authored within this repository are released under the **MIT License** (see `LICENSE`).

Contributors retain individual copyright to their contributions, licensed under the terms of the MIT License.

---

## 2. Third-Party Dependencies

Third-party npm packages, build tools, and type definitions used by this project do not become MIT-licensed by virtue of being referenced or bundled in this repository. They remain governed strictly by their respective upstream licenses.

A comprehensive inventory of direct dependencies is tracked in [`docs/THIRD_PARTY_LICENSES.md`](./docs/THIRD_PARTY_LICENSES.md).

---

## 3. Game Rules and Concepts

The general rules, mechanics, and concepts of traditional board games (including Chinese Chess / Xiangqi, Gomoku, Banqi, and Chinese Checkers) are public domain cultural heritage and game mechanics.

This project **does NOT** claim exclusive copyright over traditional board game rules. The copyright claim applies strictly to:
- The proprietary TypeScript code implementing the rules.
- The state machines, data structures, and algorithms designed herein.
- The unit and integration test suites.
- The custom React UI components and layouts.
- The architectural documentation and living specifications.

---

## 4. Future Game Records & Notation (PGN / XJF)

If the project imports or bundles external game notation, opening books, historic tournament records, or puzzle databases:
- Each dataset must undergo a separate copyright and provenance audit.
- Sourced game collections must retain their original license, public domain dedication, or CC attribution.
- External datasets **shall NOT** be automatically treated as MIT-licensed merely by inclusion in this repository.

---

## 5. Visual Assets (Images, Icons, Board Textures)

Whenever visual assets (e.g. piece sprites, board textures, SVG icons, background art) are added:
- The source, creator, license type, and any attribution requirements must be recorded in an asset registry.
- Strictly prohibited:
  - Downloading arbitrary images from search engines.
  - Scraping piece sets from commercial board game applications or websites.
  - Using assets without explicit permissive open-source licenses or public domain dedication.

---

## 6. Fonts & Typography

If custom web fonts (e.g., Noto Sans CJK, 思源黑體, specialized calligraphy fonts) are bundled:
- Fonts must be verified under permissive font licenses (e.g., SIL Open Font License 1.1 or Apache 2.0).
- The font license file and copyright notice must be distributed alongside the font binaries.

---

## 7. Audio & Sound Effects

If piece movement, capture, or check sounds are added:
- Audio assets must be audited for provenance (e.g. CC0, CC-BY 3.0/4.0).
- For CC-BY audio, explicit author credits and license links must be placed in a dedicated sound attribution file.

---

## 8. External AI & Chess Engines

If external chess/AI engines (such as Stockfish, Fairy-Stockfish, Pikafish, ElephantEye) are integrated:
- These engines often carry strong copyleft licenses (e.g. **GNU General Public License v3 (GPLv3)**).
- **CRITICAL**: An external engine must never be linked in a manner that compromises the permissive MIT status of the platform core. If a GPL engine is integrated, it must communicate across decoupled process boundaries (e.g., UCI/UCCI protocol over standard I/O or WebWorker) and be clearly segregated in licensing documentation.
- Do not assume that any third-party AI engine inherits the repository's MIT License.
