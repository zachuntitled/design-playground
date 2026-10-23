# Verify one owned runtime

Run from the repository root after the skill's install and prebuild steps. Read the root [Daemon data directory contract](../../../../AGENTS.md#daemon-data-directory-contract). Use a new temporary allocation for this run; do not use an existing user's runtime.

## Start and inspect

Choose two free local ports using the existing allocator:

```sh
node --experimental-strip-types --input-type=module -e 'import { allocateToolsDevPorts } from "./e2e/lib/tools-dev/ports.ts"; const p = await allocateToolsDevPorts(); console.log(JSON.stringify({daemonPort:p.daemonPort, webPort:p.webPort})); await p.release();'
```

Set `OD_VERIFY_DAEMON_PORT` and `OD_VERIFY_WEB_PORT` to the returned numbers. If startup reports a collision, allocate new ports. Do not stop the process using the conflicting port.

Allocate scratch and evidence separately:

```sh
OD_VERIFY_NAMESPACE="verify-$(date +%s)-$$"
OD_VERIFY_DATA_DIR="$(mktemp -d)"
OD_VERIFY_AMR_HOME="$(mktemp -d)"
OD_VERIFY_EVIDENCE="$(mktemp -d)"
OD_VERIFY_DAEMON_URL="http://127.0.0.1:$OD_VERIFY_DAEMON_PORT"
OD_VERIFY_WEB_URL="http://127.0.0.1:$OD_VERIFY_WEB_PORT"
OD_DATA_DIR="$OD_VERIFY_DATA_DIR" AMR_HOME="$OD_VERIFY_AMR_HOME" OD_RELEASE_CHANNEL=development corepack pnpm tools-dev start web --namespace "$OD_VERIFY_NAMESPACE" --daemon-port "$OD_VERIFY_DAEMON_PORT" --web-port "$OD_VERIFY_WEB_PORT" --json > "$OD_VERIFY_EVIDENCE/start.log"
corepack pnpm tools-dev check --namespace "$OD_VERIFY_NAMESPACE" --json > "$OD_VERIFY_EVIDENCE/check.log"
curl --fail --silent --show-error "$OD_VERIFY_DAEMON_URL/api/health" > "$OD_VERIFY_EVIDENCE/health.json"
curl --fail --silent --show-error "$OD_VERIFY_DAEMON_URL/api/version" > "$OD_VERIFY_EVIDENCE/version.json"
```

Read the launch and doctor outputs. Require the expected namespace and URLs, running daemon and web processes, and successful health responses. Keep the initial PIDs for cleanup verification. Use an isolated browser profile when opening `OD_VERIFY_WEB_URL`. Complete visible onboarding and privacy choices through the UI if prompted. Local AI onboarding can detect and test an installed CLI; record any such probe separately from generation evidence. Do not submit a generation prompt to a real provider for this project-only check.

## Create and read a project

```sh
corepack pnpm exec od project create --name "Verification $OD_VERIFY_NAMESPACE" --daemon-url "$OD_VERIFY_DAEMON_URL" --json > "$OD_VERIFY_EVIDENCE/project-created.json"
corepack pnpm exec od project list --daemon-url "$OD_VERIFY_DAEMON_URL" --json > "$OD_VERIFY_EVIDENCE/project-list.json"
```

Read the returned `project.id` into `OD_VERIFY_PROJECT_ID`. Require that exact ID and name in the list. Then run:

```sh
corepack pnpm exec od project info "$OD_VERIFY_PROJECT_ID" --daemon-url "$OD_VERIFY_DAEMON_URL" --json > "$OD_VERIFY_EVIDENCE/project-before-restart.json"
```

Open Projects in the browser, confirm the exact name, and open it. Save the browser action and workspace state. If cloud authentication blocks this manual flow, report it; use the existing critical smoke's explicit mock boundary for local UI proof rather than inventing an account.

## Restart and read again

```sh
corepack pnpm tools-dev stop web --namespace "$OD_VERIFY_NAMESPACE" --json > "$OD_VERIFY_EVIDENCE/stop-for-restart.log"
OD_DATA_DIR="$OD_VERIFY_DATA_DIR" AMR_HOME="$OD_VERIFY_AMR_HOME" OD_RELEASE_CHANNEL=development corepack pnpm tools-dev start web --namespace "$OD_VERIFY_NAMESPACE" --daemon-port "$OD_VERIFY_DAEMON_PORT" --web-port "$OD_VERIFY_WEB_PORT" --json > "$OD_VERIFY_EVIDENCE/restart.log"
corepack pnpm tools-dev check --namespace "$OD_VERIFY_NAMESPACE" --json > "$OD_VERIFY_EVIDENCE/check-after-restart.log"
corepack pnpm exec od project info "$OD_VERIFY_PROJECT_ID" --daemon-url "$OD_VERIFY_DAEMON_URL" --json > "$OD_VERIFY_EVIDENCE/project-after-restart.json"
```

Require a new daemon PID and the same project ID and name. Do not compare the entire response byte for byte; timestamps can change. Record the new PIDs for final cleanup.

## Stop and retain evidence

```sh
corepack pnpm tools-dev logs --namespace "$OD_VERIFY_NAMESPACE" --json > "$OD_VERIFY_EVIDENCE/logs.log"
corepack pnpm tools-dev stop web --namespace "$OD_VERIFY_NAMESPACE" --json > "$OD_VERIFY_EVIDENCE/stop.log"
corepack pnpm tools-dev status --namespace "$OD_VERIFY_NAMESPACE" --json > "$OD_VERIFY_EVIDENCE/stopped-status.log"
```

Check that the recorded PIDs exited and status no longer reports running apps. Close the browser tab this run opened. Remove only the two scratch directories allocated above after shutdown is confirmed. Preserve `OD_VERIFY_EVIDENCE`, inspect its files, and include its path in the report. On failure, still stop owned processes, but retain diagnostic scratch until the cause is understood.
