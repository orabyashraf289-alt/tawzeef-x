# Testing and CI

The active pull request quality check is `.github/workflows/ci.yml`. It runs the Vitest suite in `src/test/` and builds the app:

```bash
npm ci
npm test
npm run build
```

The TestSprite GitHub App uses a separate test format. It looks for a committed MCP-generated `testsprite_tests/` suite. The existing test cases in the TestSprite Web Portal and the Vitest tests in `src/test/` do not supply that suite. The CLI dependency alone also does not create one. Without a suite, the app posts `TestSprite Pre-Check: No tests detected` even when CI succeeds.

Access for this repository should remain disabled until a real TestSprite MCP suite is generated, committed, and verified against an isolated preview using synthetic data. In particular, automated browser tests must not visit authenticated candidate pages against live data: the candidates page can start evaluations when opened.
