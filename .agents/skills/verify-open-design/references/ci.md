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

## Fork runner setup

The runner resolver in `ci.yml` defaults same-repository events to the Nexu runner fleet. A fork without that fleet needs an available profile. The existing `economic` mode selects GitHub-hosted Linux and Windows runners from [runners.json](../../../../.github/config/runners.json).

Inspect `OD_CI_RUNNER_MODE` with `gh variable get OD_CI_RUNNER_MODE`. When preparing a fork without private runners, set it to `economic` within the authorized setup scope. This changes runner selection, not test selection. Jobs already queued for an old label need separate handling; a variable update is not evidence they reran.

The workflow's aggregate gate is distinct from GitHub branch protection. Read actual repository rules before claiming merges are blocked on a check. If GitHub denies access or the plan lacks protection support, report that limitation rather than changing repository visibility or billing.

## Formal verification candidate

A targeted check is warranted before changing Claude stream-json turn completion or steering. The useful property is that forwarded sub-agent frames cannot complete the main turn or close its input, and steering follows the real stdin lifecycle.

Trace `emitTurnEndOnce` in [claude-stream.ts](../../../../apps/daemon/src/runtimes/claude-stream.ts), `applyClaudeStreamJsonRunBookkeeping` in [chat-run-lifecycle.ts](../../../../apps/daemon/src/runtimes/chat-run-lifecycle.ts), and `classifyRunSteering` in [run-steering.ts](../../../../apps/daemon/src/runtimes/run-steering.ts). Existing [recording tests](../../../../apps/daemon/tests/runtimes/w107-claude-turn-boundary-real-cli.test.ts) and [sidechain tests](../../../../apps/daemon/tests/claude-sidechain-turn-end-false-success.test.ts) cover selected examples.

This setup adds no formal proof. A future bounded sequence check must execute the parser and bookkeeping, state its bounds, distinguish turns from process lifetime, and detect a deliberately broken real-code variant. A detached model with no mutation witness is insufficient. Record covered functions and the sync commit in any resulting formal-verification skill.
