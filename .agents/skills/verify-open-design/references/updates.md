# Update this checkout without losing verification

Treat dependency updates, upstream source merges, and packaged auto-update as separate workflows. This procedure covers source development. For a packaged app or updater change, start with [tools/pack guidance](../../../../tools/pack/AGENTS.md); a source web smoke cannot establish installer or updater acceptance.

## Establish the source and baseline

Read the repository identity, default branch, remotes, tracking branches, and current worktree before choosing an update source:

```sh
git status --porcelain=v1
git rev-parse HEAD
git remote -v
git branch -vv
gh repo view --json nameWithOwner,defaultBranchRef,isFork,parent
```

Preserve dirty work and record the baseline using [the skill](../SKILL.md#preserve-the-baseline). Do not reset, overwrite, or automatically stash someone else's changes.

The October 24, 2026 audit found that `zachuntitled/design-playground` is an independent repository, with only `origin` configured. Its source is `nexu-io/open-design`, identified by the README. There is no automatic source-sync workflow or GitHub fork-parent relationship. `dsh-upstream-drift` tracks DeepSeek Harness releases, not OpenDesign source. Recheck these facts before a later update.

## Integrate a pinned upstream revision

When source updating is requested, verify the intended upstream URL. Add an `upstream` remote if needed, or fetch that verified URL into a dedicated ref. Do not silently retarget an existing remote. Fetch origin and upstream, record both exact commit IDs, and create a dedicated update branch/worktree from current `origin/main`. Use the workspace-aware orchestration tool when it owns the checkout.

Merge the recorded upstream commit into the update branch. Preserve both upstream intent and this repository's local changes. Review optional publishing, runner selection, OpenCode compatibility, artifact-cover behavior, and verification guidance explicitly; use the actual diff, not this historical list, to identify all affected boundaries. Do not rebase shared main history or force-push it.

After dependency changes, use `corepack pnpm install --frozen-lockfile` with the pinned runtime/package manager, followed by the skill's prebuilds. Diagnose lockfile/install failures rather than switching versions or skipping install scripts to obtain a pass.

## Select and prove the affected workflows

Inspect all changed paths, including untracked files intended for the change. Run the planner in both contexts with that complete list:

```sh
python3 -B .github/scripts/scopes.py plan --context pr --files <actual changed paths>
python3 -B .github/scripts/scopes.py plan --context merge-queue --files <actual changed paths>
```

Use [the feature map](../features/README.md) for focused local checks. Run `pnpm guard`, `pnpm typecheck`, and `git diff --check` before publication. Leave full daemon/web suites to PR CI. When updates affect generation, native sessions, or preview persistence, repeat the [live procedure](live-agent.md) with new isolated state and retained evidence. A previous session's successful run is not proof of the updated revision.

Follow the repository PR template and title policy. Require an actual successful **Validate workspace** on the current PR revision before merge, and inspect which jobs were selected, reused, skipped, or failed. Resolve failures without blind reruns. A local smoke or a green check on an earlier tree is insufficient. If a check is reused, inspect its workload identity and receipt.

## Check whether GitHub enforces that gate

Set `OD_VERIFY_REPO` to the verified `owner/repository` and inspect current settings:

```sh
gh api "repos/$OD_VERIFY_REPO/branches/main"
gh api "repos/$OD_VERIFY_REPO/branches/main/protection"
gh api "repos/$OD_VERIFY_REPO/rulesets"
gh api "repos/$OD_VERIFY_REPO/rules/branches/main"
gh run list --repo "$OD_VERIFY_REPO" --workflow ci.yml --limit 10
```

Use the actual default branch if it is not `main`. Distinguish an unprotected-branch 404 from an authorization error. Report missing required checks or PR rules; do not claim the workflow YAML itself enforces merging. Repository-setting changes are a separate policy decision.

At the October 24 audit, main had no protection or applicable rules. PR #3 merged after its aggregate check failed on a daemon timeout. Until settings change, green current-revision CI is a procedural merge requirement. `ci.yml` runs on PRs, merge groups, and dispatch, not ordinary main pushes. The separate `visual-baseline.yml` runs on main pushes and manual dispatch. The stricter merge-group planner is not a backstop unless merge queue actually runs.

After merge, update the main checkout with a normal fast-forward pull, rerun affected setup checks, and start a new owned runtime against the merged revision. Retain the update's before/after SHAs, conflict decisions, focused results, actual CI URL, and any live evidence.
