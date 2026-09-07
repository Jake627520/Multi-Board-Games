# Game Platform Specification (Change 001)

## 1. Scope
Defines generic `GameEngine`, `GameRegistry`, and platform data contracts.

## 2. Scenarios

### Scenario: Engine contract conformance
- **Given** a type-checked `GameEngine<S, M>`
- **When** methods are called
- **Then** state transitions, move legality, and win conditions must adhere to the generic contract.

### Scenario: Registry engine discovery
- **Given** a registered engine
- **When** looked up by `id`
- **Then** the engine instance is returned.

### Scenario: Registry rejects duplicate
- **Given** an engine registered under ID `id`
- **When** another engine with the same ID is registered
- **Then** an error is thrown.
