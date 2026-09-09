# Third-Party Licenses Inventory

This document tracks third-party software dependencies directly used in this repository, their installed versions, and their respective licensing terms.

The MIT License of Multi Board Games Platform applies solely to the original source code created within this project and does not alter, replace, or supersede the licenses of the third-party components listed below.

---

## 1. Runtime Dependencies

These packages are shipped or bundled into production builds:

| Package Name | Installed Version | License | Purpose | Source / Repository | Attribution Requirement |
|---|---|---|---|---|---|
| `react` | `19.2.8` | `MIT` | Declarative UI component library | [https://react.dev/](https://react.dev/) | Retain copyright notice in distribution |
| `react-dom` | `19.2.8` | `MIT` | React DOM renderer for web | [https://react.dev/](https://react.dev/) | Retain copyright notice in distribution |

---

## 2. Development & Tooling Dependencies

These packages are used solely during development, testing, and compilation; they are not bundled into production runtime artifacts:

| Package Name | Installed Version | License | Purpose | Source / Repository | Attribution Requirement |
|---|---|---|---|---|---|
| `@playwright/test` | `1.63.0` | `Apache-2.0` | End-to-end browser test automation | [https://playwright.dev](https://playwright.dev) | Apache-2.0 notice retention |
| `@types/react` | `19.2.18` | `MIT` | TypeScript type declarations for React | [DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped) | Retain copyright notice |
| `@types/react-dom` | `19.2.7` | `MIT` | TypeScript type declarations for React DOM | [DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped) | Retain copyright notice |
| `@vitejs/plugin-react` | `5.2.0` | `MIT` | Vite plugin for React fast refresh | [vite-plugin-react](https://github.com/vitejs/vite-plugin-react) | Retain copyright notice |
| `typescript` | `5.9.3` | `Apache-2.0` | Static type checker and TS compiler | [TypeScript](https://www.typescriptlang.org/) | Apache-2.0 notice retention |
| `vite` | `7.3.6` | `MIT` | Frontend dev server and production bundler | [https://vite.dev](https://vite.dev) | Retain copyright notice |
| `vitest` | `3.2.7` | `MIT` | Unit test execution framework | [https://vitest.dev](https://vitest.dev) | Retain copyright notice |
| `jsdom` | `26.1.0` | `MIT` | Headless DOM implementation for test environment | [jsdom](https://github.com/jsdom/jsdom) | Retain copyright notice |

---

## 3. External Web Typography

These web fonts are requested dynamically via Google Fonts and are governed by permissive open-source font licenses; no binary font files are bundled into the repository:

| Font Family | License | Upstream Author / Project | Attribution Requirement |
|---|---|---|---|
| `Ma Shan Zheng` | `OFL-1.1` | The Ma Shan Zheng Project Authors | SIL Open Font License notice retention |
| `Noto Serif TC` | `OFL-1.1` | Google Inc. | SIL Open Font License notice retention |
| `Noto Sans TC` | `OFL-1.1` | Adobe (derived from Source Han Sans) | SIL Open Font License notice retention |

---

## 4. Maintenance & Audit Guidelines

Whenever a new dependency is added via `npm install`:
1. Verify that the license is permissive (e.g., MIT, BSD, Apache-2.0, ISC).
2. Avoid packages with copyleft licenses (GPL, AGPL) unless explicitly approved and architecturally isolated.
3. Update this inventory document with exact package name, version, license, and repository URL.
