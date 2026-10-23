# Projects

## Sub-features

Local project creation, catalog listing, workspace entry, and persistence across a runtime restart.

## How to get to it (user POV)

For existing local projects, expand Home's navigation rail and open All projects. Select the named project to enter its workspace.

For the new-project modal, open `/projects` directly, use that view's new-project action, select Prototype, enter a name, and create the project. The workspace contains the chat composer and file workspace.

## Driving it with Playwright and od

```sh
corepack pnpm -C e2e exec playwright test -c playwright.config.ts ui/critical-smoke.test.ts --grep 'prototype project creation' --workers=1 --trace on
```

The existing case uses `new-project-tab-prototype`, `new-project-name`, and `create-project`. It requires a `/projects/` URL, `chat-composer`, `chat-composer-input`, and `file-workspace`.

For a CLI and browser readback on the same instance, follow [interactive verification](../references/interactive.md). Create a uniquely named project, read its exact returned ID with `od project info`, see the name in Projects, restart the owned runtime with the same data root, and read that ID again.

## Gotchas

The existing `e2e/lib/playwright/rail.ts` helper navigates directly to `/projects`: the modal's view has no current Home navigation entry. The critical case therefore proves modal creation and workspace entry, not discoverability from Home. Record that existing navigation gap instead of claiming the test covers it.

The critical UI case mocks agent and cloud metadata. It does not prove live agent generation. Signed-in Workspace projects use scoped listing; use the correct workspace and membership when testing that separate flow. Never rely on a shared default daemon or an existing user's project.
