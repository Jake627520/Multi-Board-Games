# Notice: Multi Board Games Platform

## 1. Project Overview & License
This project is an open-source platform providing implementations of traditional abstract board games (Chinese Chess / Xiangqi, Gomoku, and Banqi).
- Original source code, architecture specifications, and UI components are Copyright (c) 2026 Jake627520 (Multi Board Games Platform Contributors) and released under the **MIT License** (see `LICENSE`).

## 2. Game Mechanics & Traditional Rules
The underlying rules, mechanics, and names of traditional games (Xiangqi, Gomoku, Banqi) represent public-domain cultural heritage. This repository does not claim copyright over traditional game rules themselves, but rather over the original software code, data structures, and documentation written to execute and test them.

## 3. Visual Assets & Typography
- **Pieces & Boards**: Rendered purely via semantic HTML/CSS and system/Unicode characters (e.g. `將`, `帥`, `卒`, `兵`, and `🀄` for face-down Banqi pieces). Board lines and piece shapes are drawn with CSS alone. This repository contains **no image, sprite, icon, SVG, or audio assets** of any kind.
- **Fonts**: No proprietary font files or binary typography assets are bundled within this repository. Web typography utilizes open-source web fonts (`Ma Shan Zheng` and `Noto Serif TC` / `Noto Sans TC`, governed by the SIL Open Font License 1.1) fetched dynamically via Google Fonts, with seamless fallback to the viewer's local system fonts (`system-ui`, `-apple-system`, `PingFang TC`, `Microsoft YaHei`, `serif`, `sans-serif`, `monospace`), plus the operating system's emoji font for `🀄`.

## 4. Third-Party Dependencies
This platform uses external open-source packages governed by permissive licenses (MIT, ISC, BSD, Apache-2.0). A complete, up-to-date inventory of dependencies and upstream licenses is maintained in:
👉 [`docs/THIRD_PARTY_LICENSES.md`](./docs/THIRD_PARTY_LICENSES.md)

Detailed intellectual property policies can be reviewed in:
👉 [`docs/COPYRIGHT_POLICY.md`](./docs/COPYRIGHT_POLICY.md)
