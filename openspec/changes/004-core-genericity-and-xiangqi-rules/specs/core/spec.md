# Core Platform Genericity Specification (Change 004)

## 1. Scope
Ensures `GameId` and `Player` types are generic strings allowing arbitrary engines and player configurations to register without platform core modification.

## 2. Scenarios

### Scenario: Registering engine with novel GameId and player colors
- **Given** an engine with `id: "gomoku"` and player colors `"black" | "white"`
- **When** registered into `GameRegistry`
- **Then** registration succeeds without type errors or runtime errors
- **And** `registry.get("gomoku")` returns the engine instance.
