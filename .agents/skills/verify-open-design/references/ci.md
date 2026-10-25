# CI coverage and local proof

## Executed checks

[ci.yml](../../../../.github/workflows/ci.yml) owns PR validation. Its planner selects jobs through [scopes.py](../../../../.github/scripts/scopes.py) and [scopes.json](../../../../.github/config/scopes.json). The `validate` job checks selected job outcomes. Convergence may reuse a matching successful workload.

- `preflight` runs `pnpm guard` and `pnpm i18n:check`. When the planner selects typecheck, it prebuilds desktop and web sidecar declarations, typechecks workspaces, and checks root scripts.
- `e2e_vitest`, when selected, runs the e2e package. That includes `tests/tools-dev/inspect.test.ts` and `specs/dialog/main.spec.ts` from this skill.
- `playwright_critical` and `ui_p0` use planner-selected files or groups. A priority tag alone does not register a test in a merge lane. See [e2e guidance](../../../../e2e/AGENTS.md#ui-test-stability-rules).
- Daemon, web, workspace, and packaging test jobs have separate selection rules. The local seed smoke does not replace them.

For a proposed diff, inspect the plan without changing policy:

```sh
python3 .github/scripts/scopes.py plan --context pr --files .agents/skills/verify-open-design/SKILL.md .claude/skills/verify-open-design/SKILL.md AGENTS.md .gitignore
```

Replace the file list with the actual diff. Before changing planner confidence or omission policy, read [specs/current/ci.md](../../../../specs/current/ci.md) and [.github guidance](../../../../.github/AGENTS.md).

## Agent instructions

Skill discovery, automatic selection, manual browser witnesses, evidence retention, and the feature map are agent workflows. CI does not execute this Markdown or guarantee that an agent loads it. Root `AGENTS.md` points agents here; both harness entrypoints remain discoverable.

Every setup report must distinguish a local pass from an actual GitHub run. Do not label local smoke as full CI, live provider, hosted service, or packaged-app acceptance.

The browser case in `ui/real-daemon-run.test.ts` uses a fake OpenCode executable despite its filename. Live-provider checks in [live-agent.md](live-agent.md) are manual acceptance, not a CI lane. Skill-only edits do not automatically execute the recipes. Test edits must route to their own executor; replay the planner when editing a mapped harness.

## Inspect actual repository coverage

Read job outcomes and logs for the exact revision, not only workflow definitions or badges. Record the plan's selected lanes and distinguish scope omissions from convergence reuse. The October 24, 2026 audit found:

- Baseline `954fe25f` had no completed `ci` run on that exact SHA. Its tree matched PR #3's head, whose [run 40093217961](https://github.com/zachuntitled/design-playground/actions/runs/40093217961) failed.
- That PR run passed E2E Vitest (including both mapped cases) and all six UI P0 groups (including the three critical-smoke cases). Daemon shard 3 timed out on `tests/chat-route.test.ts`, “marks stalled runs failed even when the child ignores SIGTERM”. That proves a CI failure; it does not establish its cause.
- `ui-extended-main.yml` was guarded to `nexu-io/open-design` and had no runs in this repository. Do not advertise its full functional pool as a local fork backstop.
- Main had no protection, rulesets, or required checks. The PR merged despite the failed aggregate. See [update safety](updates.md).

These are dated observations, not permanent guarantees. Requery GitHub for a later readiness report. Local runner/routing repairs require a subsequent published workflow run before claiming hosted verification.

## Fork runner setup

The runner resolver in `ci.yml` defaults same-repository events to the Nexu runner fleet. A fork without that fleet needs an available profile. The existing `economic` mode selects GitHub-hosted Linux and Windows runners from [runners.json](../../../../.github/config/runners.json).

Inspect `OD_CI_RUNNER_MODE` with `gh variable get OD_CI_RUNNER_MODE`. When preparing a fork without private runners, set it to `economic` within the authorized setup scope. `economic` requires a public repository. Private repositories get 2 vCPU / 7 GB hosted runners, where the UI suites time out or the runner is killed, so `runners.py` rejects that pairing; a private fork uses `blacksmith` instead. The local `visual-baseline.yml` repair now resolves `visual_hot` through the same `runners.py` profile configuration. Hosted capture/upload still needs a run on the published revision; local topology tests do not prove it. This changes runner selection, not test selection. Jobs already queued for an old label need separate handling; a variable update is not evidence they reran.

The workflow's aggregate gate is distinct from GitHub branch protection. Read actual repository rules before claiming merges are blocked on a check. If GitHub denies access or the plan lacks protection support, report that limitation rather than changing repository visibility or billing.

## Formal verification candidate

A targeted check is warranted before changing Claude stream-json turn completion or steering. The useful property is that forwarded sub-agent frames cannot complete the main turn or close its input, and steering follows the real stdin lifecycle.

Trace `emitTurnEndOnce` in [claude-stream.ts](../../../../apps/daemon/src/runtimes/claude-stream.ts), `applyClaudeStreamJsonRunBookkeeping` in [chat-run-lifecycle.ts](../../../../apps/daemon/src/runtimes/chat-run-lifecycle.ts), and `classifyRunSteering` in [run-steering.ts](../../../../apps/daemon/src/runtimes/run-steering.ts). Existing [recording tests](../../../../apps/daemon/tests/runtimes/w107-claude-turn-boundary-real-cli.test.ts) and [sidechain tests](../../../../apps/daemon/tests/claude-sidechain-turn-end-false-success.test.ts) cover selected examples.

This setup adds no formal proof. A future bounded sequence check must execute the parser and bookkeeping, state its bounds, distinguish turns from process lifetime, and detect a deliberately broken real-code variant. A detached model with no mutation witness is insufficient. Record covered functions and the sync commit in any resulting formal-verification skill.
