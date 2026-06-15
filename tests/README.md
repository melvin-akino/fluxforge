# FluxForge Test Suite

Uses Node.js built-in `node:test` and `node:assert` (Node 18+, no install needed).

## Run all tests
```bash
node --test tests/
```

## Run individual suites
```bash
node --test tests/sim-engine.test.js
node --test tests/server-api.test.js
node --test tests/uds-schema.test.js
node --test tests/i18n.test.js
node --test tests/design-store.test.js
node --test tests/validate-design.test.js
```

## Run with verbose output
```bash
node --test --test-reporter=spec tests/
```
