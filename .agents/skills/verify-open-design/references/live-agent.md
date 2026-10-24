# Live generation, native resume, and restart

Use this procedure when real-provider verification is authorized. It can incur provider usage, including onboarding connection probes. Use existing authentication; never publish credentials or private native session handles. This proves local web/daemon behavior, not packaged, hosted-service, or model-quality acceptance.

## Allocate and identify

Complete the install/prebuild steps in [the skill](../SKILL.md), then allocate and start one owned runtime using [interactive verification](interactive.md#start-and-inspect). Keep its namespace, ports, scratch allocation, and complete launch environment unchanged across restart. Data ownership follows the root [contract](../../../../AGENTS.md#daemon-data-directory-contract). Record browser isolation actually achieved; a fresh origin in an existing profile is not a fresh profile.

Keep the default strategy setting. If `OD_NEXT_STRATEGY_ROLLOUT=off` is needed for an adapter diagnostic, label that narrower result and preserve the setting across restart. A CLI-created freeform project can report `not_applicable`; that does not prove active strategy behavior. When `strategyTask` exists, record `taskExecutionId`, `runMappings`, active run, and terminal outcome. One prompt can produce multiple physical runs.

Define this helper in the shell used below:

```sh
od_verify() {
  corepack pnpm exec od "$@" --daemon-url "${OD_VERIFY_DAEMON_URL:?Set the owned daemon URL}"
}
od_verify --help
od_verify run --help
```

Run the skill's doctor. Complete visible onboarding, choose Local AI, select installed OpenCode and an available model, and verify selection survives reload. Record executable path/version, exact model ID, and connection-test results. Assign `OD_VERIFY_MODEL` to that exact ID in the shell. A probe is not generation proof. Avoid unfiltered `/api/app-config` exports.

For each generation, compare the recorded `start` event's `data.model` with the requested ID. Creation and `run info` responses omit top-level `model`; use `run watch` events. This records the model selected by the daemon, not independently measured upstream provider routing.

## Create two projects and retain their identities

Create a UI project through **New project → Prototype → name → Create** at `/projects`. Record the actual project and conversation IDs from the workspace URL and production readbacks as `OD_VERIFY_UI_PROJECT_ID` and `OD_VERIFY_UI_CONVERSATION_ID`. Use a unique name.

Create a separate CLI project:

```sh
od_verify project create --name "CLI verification $OD_VERIFY_NAMESPACE" --json > "$OD_VERIFY_EVIDENCE/cli-created.json"
od_verify project list --json > "$OD_VERIFY_EVIDENCE/projects-created.json"
```

Assign that response's `project.id` and `conversationId` to `OD_VERIFY_CLI_PROJECT_ID` and `OD_VERIFY_CLI_CONVERSATION_ID`. Require both exact IDs and names in the list. Keep the two pairs separate throughout. Use project-scoped conversations: at baseline `954fe25f`, `od conversation info` requests an unimplemented endpoint and returns HTTP 404 despite a healthy daemon.

## Define a capture command

This helper takes an explicit project, conversation, run, and **new** output directory. Call it once for each physical run after completion. It rejects an existing directory; do not reuse a previous capture name.

```sh
od_verify_capture() {
  : "${1:?project ID}" "${2:?conversation ID}" "${3:?run ID}" "${4:?new output directory}"
  mkdir "$4" || return 1
  od_verify project info "$1" --json > "$4/project-info.json" || return 1
  od_verify conversation list "$1" --json > "$4/conversations.json" || return 1
  curl --fail --silent --show-error \
    "$OD_VERIFY_DAEMON_URL/api/projects/$1/conversations/$2/messages" \
    > "$4/messages.json" || return 1
  od_verify run watch "$3" > "$4/run-events.jsonl" || return 1
  od_verify run info "$3" --json > "$4/run-info.json" || return 1
  od_verify run result-package "$3" --json > "$4/run-result.json" || return 1
  od_verify files list "$1" --json > "$4/files.json" || return 1
  od_verify files read "$1" proof.html > "$4/proof.html" || return 1
  od_verify files read "$1" cwd-witness.json > "$4/cwd-witness.json" || return 1
}
```

Check that the captured run's project/conversation IDs match the helper's selected pair. Require terminal `succeeded`, exit status, successful tool results, delivered HTML and syntax validation, and stored messages. `run watch` ending alone is insufficient. Capture every mapped physical run into its own directory; an intermediate run without a deliverable must be recorded as such, not silently treated as a completed artifact.

## UI phase 1

Submit this small functional fixture through the UI project's composer, replacing the nonce placeholder with a fresh value recorded in local evidence:

> Create `proof.html` using a relative write from the current project directory. Do not change directory, supply any shell workdir/cwd override, use absolute output paths, install packages, or fetch external assets. Show heading “Live proof phase 1” and a button “Verify” that changes visible status from “Ready” to “Verified”. Run a native shell command with only the command argument to record physical cwd, `process.cwd()`, and `process.env.PWD` in relative `cwd-witness.json`. Read both files back. Remember nonce `<fresh UI nonce>` for a later turn but do not write it into either file. Return a link to proof.html.

Use the project-filtered run list and new assistant message to identify the run; never choose a global latest run. Assign its actual ID to `OD_VERIFY_UI_RUN_1`. Capture this UI run **before proceeding to CLI generation**:

```sh
od_verify_capture "$OD_VERIFY_UI_PROJECT_ID" "$OD_VERIFY_UI_CONVERSATION_ID" \
  "$OD_VERIFY_UI_RUN_1" "$OD_VERIFY_EVIDENCE/ui-phase1"
```

Open the artifact in OpenDesign, require its heading in the active preview, click Verify, and require Verified. Save action/result screenshots and full browser state. The UI project establishes UI creation and initial generation; the CLI project below owns the cross-surface continuation sequence.

## CLI phase 1

Prepare a new input directory and prompt file. The quoted prompt body preserves literal command names; the final line inserts a newly generated nonce.

```sh
: "${OD_VERIFY_MODEL:?Assign the exact model ID chosen in Settings}"
: "${OD_VERIFY_CLI_PROJECT_ID:?Set the CLI project ID}"
: "${OD_VERIFY_CLI_CONVERSATION_ID:?Set its conversation ID}"
OD_VERIFY_INPUT_DIR="$OD_VERIFY_EVIDENCE/cli-phase1-input"
mkdir "$OD_VERIFY_INPUT_DIR" || { return 1 2>/dev/null || exit 1; }
OD_VERIFY_PROMPT_FILE="$OD_VERIFY_INPUT_DIR/prompt.txt"
OD_VERIFY_CLI_NONCE="$(node -e 'console.log(require("node:crypto").randomUUID())')"
: "${OD_VERIFY_CLI_NONCE:?Nonce generation failed}"
cat > "$OD_VERIFY_PROMPT_FILE" <<'PROMPT'
Create proof.html using a relative write from the current project directory. Do not change directory, supply any shell workdir/cwd override, use absolute output paths, install packages, or fetch external assets. Show heading "Live proof phase 1" and a button "Verify" that changes visible status from "Ready" to "Verified". Run a native shell command with only the command argument to record physical cwd, process.cwd(), and process.env.PWD in relative cwd-witness.json. Read both files back. Return a link to proof.html.
PROMPT
printf '\nRemember nonce %s for a later turn; do not write it into either generated file.\n' "$OD_VERIFY_CLI_NONCE" >> "$OD_VERIFY_PROMPT_FILE"
test -s "$OD_VERIFY_PROMPT_FILE" || { return 1 2>/dev/null || exit 1; }
od_verify run start --project "$OD_VERIFY_CLI_PROJECT_ID" \
  --conversation "$OD_VERIFY_CLI_CONVERSATION_ID" --agent opencode \
  --model "$OD_VERIFY_MODEL" --prompt-file "$OD_VERIFY_PROMPT_FILE" \
  --json > "$OD_VERIFY_INPUT_DIR/run-created.json"
```

Assign the returned `runId` to `OD_VERIFY_CLI_RUN_1`; retain `assistantMessageId`. Then capture and perform the same active-preview button check:

```sh
od_verify_capture "$OD_VERIFY_CLI_PROJECT_ID" "$OD_VERIFY_CLI_CONVERSATION_ID" \
  "$OD_VERIFY_CLI_RUN_1" "$OD_VERIFY_EVIDENCE/cli-phase1"
```

For both phase-1 runs, canonicalize all witnessed paths and `project-info.json`'s `resolvedDir` before comparing; macOS `/var` and `/private/var` can resolve identically. Inspect actual tool inputs. Absolute writes, workdir/cwd overrides, or cd/chdir invalidate inherited-cwd proof even when saved paths match. Retain the failed attempt and use a focused constrained follow-up, with its own run capture, if needed. Agent prose is not a native cwd witness.

If the preview stalls, retain the failure first, check health and the raw URL, then try visible Reload Preview once. A recovered preview is a qualified result, not first-open success. If browser state is an accessibility delta, retain its preceding full state too.

## CLI project phase 2, submitted through UI

Open **the CLI-created project and its existing conversation** in the UI, using `OD_VERIFY_CLI_PROJECT_ID` and `OD_VERIFY_CLI_CONVERSATION_ID`. Keep the same OpenCode/model selection. Submit:

> State the nonce from our first request without reading logs or conversation databases. Using relative paths without changing directory or supplying workdir/cwd overrides, update proof.html to “Live proof phase 2”, retain its button, refresh cwd-witness.json using a shell command with only the command argument, and read the files back.

Identify the new run as `OD_VERIFY_CLI_RUN_2` and capture it:

```sh
od_verify_capture "$OD_VERIFY_CLI_PROJECT_ID" "$OD_VERIFY_CLI_CONVERSATION_ID" \
  "$OD_VERIFY_CLI_RUN_2" "$OD_VERIFY_EVIDENCE/cli-phase2-via-ui"
```

Compare **only against CLI phase 1**: correct CLI nonce, `nativeSessionRecovery.state == "resumed"`, same non-null `handle.sha256`, no guard/fallback reason, successful relative edits, and a working phase-2 preview button. Reject `resume_skipped`, `auto_reseeded`, changed hashes, or `agent_resume_auto_reseed` as native-resume acceptance. The creation response's top-level `resumed` is not the native verdict. Separate UI-only and CLI-only conversations do not prove this surface switch.

## Snapshot, restart, and CLI project phase 3

Wait for every physical run to terminate. Retain recovery metadata before stopping. At baseline `954fe25f`, historical run hydration omits `nativeSessionRecovery`; report that diagnostic loss separately from persisted conversation content.

Capture the following for **each recorded project/conversation pair**, into separate new before/after directories, around the exact stop/start sequence in [interactive verification](interactive.md#restart-and-read-again):

```text
GET /api/projects/P
GET /api/projects/P/conversations
GET /api/projects/P/conversations/C/messages
GET /api/runs?projectId=P
GET /api/runs/R (each recorded run)
GET /api/projects/P/files
GET /api/projects/P/raw/proof.html
GET /api/projects/P/raw/cwd-witness.json
```

Use `curl --fail --silent --show-error` or the CLI equivalents and retain bodies. Compare IDs, names, resolved directory, message contents/run references/artifacts, terminal statuses, and file hashes. Compare runs by ID while retaining original order and any order change separately. Record differences rather than excluding fields after a failed comparison. Process IDs and volatile timestamps may change; saved messages and artifact bytes should not. Require new daemon/web PIDs, exited old PIDs, same URLs, and healthy doctor results.

Reload the CLI-created conversation in UI. Confirm its saved history and phase-2 artifact **before** new generation. Then send a phase-3 request through CLI, using that same CLI identity pair, agent, and model. Use `run start` again, not `run continue` (the latter is for resumable failed runs). Follow the CLI phase-1 input/submission pattern with a new `cli-phase3-input` directory and a prompt requesting phase 3, relative cwd witnesses, and recall of the original nonce **without restating it or generating a new one**. Submit from a new input directory:

```sh
: "${OD_VERIFY_MODEL:?Assign the exact model ID chosen in Settings}"
: "${OD_VERIFY_CLI_PROJECT_ID:?Set the CLI project ID}"
: "${OD_VERIFY_CLI_CONVERSATION_ID:?Set its conversation ID}"
OD_VERIFY_INPUT_DIR="$OD_VERIFY_EVIDENCE/cli-phase3-input"
mkdir "$OD_VERIFY_INPUT_DIR" || { return 1 2>/dev/null || exit 1; }
OD_VERIFY_PROMPT_FILE="$OD_VERIFY_INPUT_DIR/prompt.txt"
cat > "$OD_VERIFY_PROMPT_FILE" <<'PROMPT'
Recall the nonce from our first request without reading logs or conversation databases. Using relative paths with no cd/chdir or workdir/cwd override, update proof.html to Live proof phase 3 and retain its working Verify button. Refresh cwd-witness.json with physical cwd, process.cwd(), and process.env.PWD using a shell payload containing only command. Read both files back.
PROMPT
test -s "$OD_VERIFY_PROMPT_FILE" || { return 1 2>/dev/null || exit 1; }
od_verify run start --project "$OD_VERIFY_CLI_PROJECT_ID" \
  --conversation "$OD_VERIFY_CLI_CONVERSATION_ID" --agent opencode \
  --model "$OD_VERIFY_MODEL" --prompt-file "$OD_VERIFY_PROMPT_FILE" \
  --json > "$OD_VERIFY_INPUT_DIR/run-created.json"
```

Assign the returned run ID to `OD_VERIFY_CLI_RUN_3`, then capture:

```sh
od_verify_capture "$OD_VERIFY_CLI_PROJECT_ID" "$OD_VERIFY_CLI_CONVERSATION_ID" \
  "$OD_VERIFY_CLI_RUN_3" "$OD_VERIFY_EVIDENCE/cli-phase3-via-cli"
```

Require native `resumed`, the original CLI phase-1 hash, correct nonce recall and native tool inputs, persisted phase-3 bytes/messages, and a working active preview button. Record whether new CLI messages appear in the already-open UI immediately or only after reload. This closes CLI → UI → restart → CLI continuity.

## Retain and clean up

Report each capability separately, including initial rendering versus recovery, strategy applicability, provider/model/probes, creation through both surfaces, native continuation, restart comparison, and surface switching. Include exact commands/exits, IDs/hashes, actual tool inputs, browser evidence, and limits. Never substitute mock success for a failed live step.

Follow [owned shutdown](interactive.md#stop-and-retain-evidence). Keep evidence outside scratch. After failures, retain diagnostic scratch locally after stopping. Inspect watch events and result packages for private session IDs before sharing; retain hash correlation instead. Do not upload credentials or provider homes. Keep product defects separate from setup/harness repairs.
