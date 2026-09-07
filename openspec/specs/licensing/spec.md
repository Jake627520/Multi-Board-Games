# Licensing & Intellectual Property Specification

## 1. Scope & Purpose

This specification governs the licensing boundaries, copyright allocations, and intellectual property requirements of the Multi Board Games Platform repository.

---

## 2. Requirements & Behavioral Scenarios

### 2.1 Project Source License

#### Scenario: Consuming repository source code
- **Given** original source code, specifications, and tests authored in this repository
- **When** a user or developer acquires, forks, or vendors the repository
- **Then** the original source code may be used, modified, and redistributed under the terms of the MIT License
- **And** the copyright notice in `LICENSE` must be preserved in all copies or substantial portions.

---

### 2.2 Third-Party Dependency Boundary

#### Scenario: Upstream package license preservation
- **Given** third-party dependencies defined in `package.json` (such as React, Vite, TypeScript)
- **When** the project is compiled, bundled, or executed
- **Then** each third-party package remains governed exclusively by its upstream license
- **And** no third-party package is converted or claimed to be licensed under the project's MIT License.

---

### 2.3 Third-Party Asset Attribution

#### Scenario: Incorporating external media assets
- **Given** an external visual asset, font, or audio sample with attribution requirements (e.g., CC-BY or OFL)
- **When** the asset is committed to the repository
- **Then** `docs/THIRD_PARTY_LICENSES.md` or a designated attribution document must record the creator name, source URL, license type, and copyright statement.

---

### 2.4 External Game Data & Chess Notation

#### Scenario: Importing historical or competitive game databases
- **Given** an external game dataset (PGN, opening book, puzzle collection)
- **When** the dataset is integrated into the platform
- **Then** the dataset must retain its original provenance and licensing terms
- **And** the dataset must not be claimed as the proprietary copyright or MIT software of this project.

---

### 2.5 Pre-Commit License Audit for External Assets

#### Scenario: Pull request or change introducing external code or assets
- **Given** a proposed change introducing a new dependency, library, or media asset
- **When** the change is reviewed
- **Then** the license compatibility must be audited prior to merge
- **And** strong copyleft licenses (such as GPLv3) must not be statically linked into the core platform without protocol isolation.
