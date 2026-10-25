# Artifacts and runs

## Sub-features

Write and read project files through the daemon. Run a fake agent, consume its events, persist its artifact, and read the saved message and HTML.

## How to get to it (user POV)

Open a project and use its chat composer to request an artifact. Generated files appear in the file workspace. Open the HTML file to inspect its rendered result.

## Driving it with the e2e Vitest harness

```sh
corepack pnpm --filter @open-design/e2e test tests/tools-dev/inspect.test.ts
corepack pnpm --filter @open-design/e2e test specs/dialog/main.spec.ts
```

The inspect case creates a project and writes `index.html` through production HTTP endpoints. It asserts the manifest and raw content, then checks a local mock provider's requests.

The dialog case launches a fake Codex process through the real daemon run path. It asserts a succeeded run, SSE usage and status events, artifact extraction, file listing and raw HTML, and the persisted assistant message. Its report includes the resulting artifact and run.

## Gotchas

The dialog harness persists the extracted artifact and assistant message through production APIs. This is daemon integration evidence, not proof that the browser's artifact persistence pipeline ran. Use an affected UI case when that pipeline changes. Fake CLI output proves no real model quality, authentication, or provider transport behavior.

## Browser pipeline with a fake native agent

```sh
corepack pnpm -C e2e exec playwright test -c playwright.config.ts ui/real-daemon-run.test.ts --grep 'real daemon run previews an artifact from a fake OpenCode runtime' --workers=1 --trace on
```

This case drives the browser against a real daemon and a fake OpenCode executable. It is stronger browser integration evidence than manually persisting fake output, but still makes no real-provider claim. Keep the trace and confirm a nonzero test count. Use `e2e/lib/playwright/artifact-preview.ts` when extending browser assertions: a mounted iframe may be a hidden or pending preview, not the active document.

For installed-provider generation, native continuation, file readback, interaction, and restart, use the [live procedure](../references/live-agent.md). If a preview needs Reload Preview to render, retain the initial failure and report the recovery separately; raw HTTP 200 and a successful run do not prove first-open rendering.
