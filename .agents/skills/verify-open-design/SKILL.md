---
name: verify-open-design
description: Verify OpenDesign development setup and changes to its web UI, od CLI, or daemon using the repository's isolated runtime and focused smoke tests. Use before declaring an affected workflow ready.
---

# Verify OpenDesign

Run from the repository root. Read [AGENTS.md](../../../AGENTS.md), then [e2e guidance](../../../e2e/AGENTS.md) before using its harness. Select affected workflows from the [feature map](features/README.md). The [CI reference](references/ci.md) separates automated gates from agent instructions. For source updates, follow the [update procedure](references/updates.md).

## Preserve the baseline

Before installation or edits, create an ignored evidence directory. Record `git rev-parse HEAD`, `git status --porcelain=v1`, `git diff --binary`, `git diff --cached --binary`, `git remote -v`, `node --version`, and `corepack pnpm --version`. Preserve existing changes and failures. Record command exit codes as well as logs. Do not treat a merged commit as evidence of passing CI.

## Launch

For a new checkout, check `node --version` against `package.json#engines`, then run:

```sh
corepack pnpm --version
corepack pnpm install --frozen-lockfile
corepack pnpm --filter @open-design/desktop build
corepack pnpm --filter @open-design/web build:sidecar
corepack pnpm guard
corepack pnpm typecheck
corepack pnpm -C e2e exec playwright install chromium
```

The install postinstall builds local packages, the daemon, and tools. The two explicit builds mirror CI's generated declarations. Do not skip failed install scripts or change the lockfile to conceal a baseline failure.

For scripted proof, use the existing suites. They launch their own runtime and stop it afterward:

```sh
corepack pnpm --filter @open-design/e2e test tests/tools-dev/inspect.test.ts
corepack pnpm --filter @open-design/e2e test specs/dialog/main.spec.ts
corepack pnpm -C e2e exec playwright test -c playwright.config.ts ui/critical-smoke.test.ts --workers=1 --trace on
```

These are focused files, not the full web or daemon suites. On later changes, choose the relevant file or case from the map. Do not repeat installation unless dependencies, workspace links, or command entries changed.

For an interactive browser or CLI witness, follow [interactive verification](references/interactive.md). When real-provider testing is in scope, extend it with [live generation, native resume, and restart](references/live-agent.md). Daemon data setup must follow the root [Daemon data directory contract](../../../AGENTS.md#daemon-data-directory-contract). Test lifecycle belongs to `e2e/lib/tools-dev/`, composed through `e2e/lib/vitest/suite.ts` or `e2e/lib/playwright/suite.ts`. Do not replace those fixtures or hand-spawn servers in tests.

## Doctor

For the instance owned by this verification, run `corepack pnpm tools-dev check --namespace "$OD_VERIFY_NAMESPACE" --json`. Read its status and logs; exit code zero alone is insufficient. Confirm the namespace, live daemon and web PIDs, and URLs agree with the recorded launch. Fetch `/api/health` and `/api/version` from that exact daemon URL. A health response alone does not prove the web app is usable.

The automated suites check their own runtime status. Before driving a manually launched instance, also confirm that Home or the requested project finishes loading. After a surprising error, repeat the doctor before continuing. `tools-dev doctor` is not a command.

## Drive

Use each feature's recipe and observable end state. For browser investigation, prefer T3 `preview_status`, `preview_open`, and snapshot locators. The existing Playwright suites are the reproducible test path. For CLI proof, use `corepack pnpm exec od` with an explicit `--daemon-url` and `--json`; default discovery can target a different namespace.

The critical UI suite mocks agent and cloud metadata. The dialog suite launches a fake agent process. The inspect suite uses a local mock provider. Label these boundaries in the report. They prove local integration, not live provider authentication, hosted services, or packaged desktop behavior.

For desktop-specific changes, read [tools guidance](../../../tools/AGENTS.md), start the owned desktop runtime through `tools-dev`, and use `tools-dev inspect desktop status`, `eval`, and `screenshot`. Packaged or updater changes require [tools/pack guidance](../../../tools/pack/AGENTS.md). A web smoke does not satisfy those checks.

## Evidence

Create an ignored evidence directory for the run. Record the Git SHA, initial dirty paths, runtime versions, exact commands, exit codes, and applicable mock boundaries. Capture action plus resulting state. Check stored state through the production CLI or HTTP API where the workflow persists data.

Vitest smoke reports survive under `.tmp/e2e/<suite-namespace>/report/`. Retain `summary.json` and `suite-result.json`. Playwright writes traces and reports under `e2e/ui/reports/`; copy the relevant reports into the run's evidence directory before another run overwrites them. `--trace on` retains successful actions as well as failures.

Report each mapped workflow as passed, failed, or not run, with a reason and evidence path. A filtered test count of zero is not a pass. Record baseline failures without weakening assertions or silently repairing product code.

## Cleanup

The automated fixtures own shutdown. Verify their runtime PIDs are gone and their evidence still exists. Successful Vitest suites remove scratch state and preserve reports; failed suites preserve diagnostic scratch. Do not erase failure evidence while diagnosing it.

For interactive runs, use the namespace-specific stop and cleanup in the linked procedure. Never stop a default or unrelated runtime, kill by process name, or remove evidence during teardown.

## Helpers and discovery

This skill adds no runner. Its commands reuse the checked-in tools and tests. Both `.agents/skills/verify-open-design/` and the Claude entrypoint are narrowly allowed by `.gitignore`; keep personal agent configuration ignored. `CLAUDE.md` already imports root `AGENTS.md`.

Use `$verify-open-design` in Codex or `/verify-open-design` in Claude. New sessions must discover the entrypoint from the checkout. A skill file is agent guidance, not a GitHub Actions hook. After changing the map, rerun its affected procedure; use pstack's `maintain-verification-skill` when a broader source and live audit is needed.
