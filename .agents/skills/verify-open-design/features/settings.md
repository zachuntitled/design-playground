# Settings

## Sub-features

Navigate from signed-out Home to the execution settings section.

## How to get to it (user POV)

Expand the Home navigation rail, open Settings, and inspect the execution section navigation.

## Driving it with Playwright

```sh
corepack pnpm -C e2e exec playwright test -c playwright.config.ts ui/critical-smoke.test.ts --grep 'settings dialog' --workers=1 --trace on
```

The historical case name says dialog. Entry settings now render as a routed region. The case uses `entry-settings-button`, the shared `settingsSurface` helper, and `settings-nav-execution`.

For a T3 browser witness, expand the rail and click the visible Settings item through snapshot locators. Confirm the actual settings region opens. API configuration readback uses `/api/app-config`; reachability alone proves no configuration write.

## Gotchas

Collapsed rail content is inert. Visibility alone is not actionability. The existing case uses a DOM click for the settings button; use a normal user click for a separate actionability witness. This recipe covers navigation only. Provider settings, credential handling, and persistence require their own affected tests.

The [live-agent procedure](../references/live-agent.md) covers Local AI onboarding and an installed CLI/model. Onboarding can automatically spawn a real connection probe; count it separately from generation. Settings autosave is delayed, so verify the selected model survives reload before restarting. Do not export unfiltered app configuration or credential files into evidence.
