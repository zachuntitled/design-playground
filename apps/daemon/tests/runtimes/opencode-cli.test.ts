import { mkdtemp, mkdir, readFile, writeFile, chmod, rm, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { once } from 'node:events';
import { expect, it } from 'vitest';
import { testAgentConnection } from '../../src/connectionTest.js';
import { probeOpenCodeCli, readOpenCodeModelCatalog, openCodeLaunchEnv } from '../../src/runtimes/opencode-cli.js';
import { opencodeAgentDef } from '../../src/runtimes/defs/opencode.js';
import { byokOpenCodeAgentDef } from '../../src/runtimes/defs/byok-opencode.js';
import { spawnEnvForAgent } from '../../src/runtimes/env.js';
import { spawnAgentProcess } from '../../src/runtimes/agent-process.js';
import { agentCapabilities } from '../../src/runtimes/capabilities.js';

it.skipIf(process.platform === 'win32')('connection testing selects the actual V2 executable despite stale legacy capabilities', async () => {
  const root = await mkdtemp(join(tmpdir(), 'od-opencode-v2-'));
  const bin = join(root, 'opencode-v2');
  const record = join(root, 'invocation.json');
  const runHelp = await readFile(new URL('../fixtures/opencode-v2/opencode-run-help.txt', import.meta.url), 'utf8');
  agentCapabilities.set('opencode', { skipPermissions: true });
  try {
    await writeFile(bin, `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
if (args.includes('--help')) { console.error(${JSON.stringify(runHelp)}); process.exit(0); }
let stdin = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { stdin += chunk; });
process.stdin.on('end', () => {
  fs.writeFileSync(${JSON.stringify(record)}, JSON.stringify({ args, stdin, cwd: process.cwd(), pwd: process.env.PWD, resolvedPwd: fs.realpathSync(process.env.PWD) }));
  if (args.includes('--dir') || args.includes('--pure') || !args.includes('--standalone') || !args.includes('--auto')) {
    console.error('unsupported V2 invocation'); process.exitCode = 1; return;
  }
  console.log(JSON.stringify({ type: 'text', part: { text: 'ok' } }));
});
`);
    await chmod(bin, 0o755);
    const result = await testAgentConnection({ agentId: 'opencode', model: 'openrouter/anthropic/claude-opus-5.5', agentCliEnv: { opencode: { OPENCODE_BIN: bin, PWD: root } } });
    const invocation = JSON.parse(await readFile(record, 'utf8'));
    expect(invocation.args).toEqual(['run', '--format', 'json', '--standalone', '--auto', '-m', 'openrouter/anthropic/claude-opus-5.5', '--title', 'Connection test']);
    expect(invocation.stdin).toBe('Reply with only: ok');
    expect(invocation.cwd).not.toBe(process.cwd());
    expect(invocation.resolvedPwd).toBe(invocation.cwd);
    expect(result).toMatchObject({ ok: true, kind: 'success', sample: 'ok' });
  } finally {
    agentCapabilities.delete('opencode');
    await rm(root, { recursive: true, force: true });
  }
});


it.skipIf(process.platform === 'win32')('profiles follow executable and environment changes and retain legacy cwd when help fails', async () => {
  const root = await mkdtemp(join(tmpdir(), 'od-opencode-profile-'));
  const bin = join(root, 'profile.cjs');
  try {
    await writeFile(bin, `#!/usr/bin/env node
if (process.env.PROFILE === 'v2') console.error('--standalone --auto provider/model#variant');
else if (process.env.PROFILE === 'legacy') console.log('--dir --pure --dangerously-skip-permissions --variant');
else if (process.env.PROFILE === 'unreadable') { console.error('--standalone --auto provider/model#variant'); process.exit(1); }
else console.log('unknown help');
`);
    await chmod(bin, 0o755);
    for (const profile of ['v2', 'legacy', 'unreadable', 'unknown', 'v2']) {
      const probed = await probeOpenCodeCli(bin, { ...process.env, PROFILE: profile });
      const args = opencodeAgentDef.buildArgs('never in argv', [], [], {}, {
        cwd: '/nested/project', openCode: { profile: probed, purpose: 'connection-test' },
      });
      if (profile === 'v2') {
        expect(args).toEqual(['run', '--format', 'json', '--standalone', '--auto']);
      } else if (profile === 'legacy') {
        expect(args).toEqual(['run', '--format', 'json', '--dangerously-skip-permissions', '--dir', '/nested/project', '--pure']);
      } else {
        expect(args).toEqual(['run', '--format', 'json', '--dir', '/nested/project']);
      }
    }
    await writeFile(bin, '#!/usr/bin/env node\nconsole.log("--dir");\n');
    expect(await probeOpenCodeCli(bin, process.env)).toEqual({ dialect: 'legacy', skipPermissions: false, pure: false });
    const missing = await probeOpenCodeCli(join(root, 'missing'), process.env);
    expect(opencodeAgentDef.buildArgs('', [], [], {}, { cwd: '/nested/project', openCode: { profile: missing, purpose: 'generation' } }))
      .toEqual(['run', '--format', 'json', '--dir', '/nested/project']);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

it('bundled BYOK keeps its exact legacy argv even with a V2 native context', () => {
  agentCapabilities.set('byok-opencode', { skipPermissions: true });
  try {
    expect(byokOpenCodeAgentDef.buildArgs('', [], [], { model: 'custom/model' }, {
      cwd: '/nested/project', openCode: { profile: { dialect: 'v2' }, purpose: 'connection-test' },
    })).toEqual(['run', '--format', 'json', '--dir', '/nested/project', '--dangerously-skip-permissions', '-m', 'open-design-byok/custom/model']);
  } finally {
    agentCapabilities.delete('byok-opencode');
  }
});


it.skipIf(process.platform === 'win32')('MiMo connection tests retain pure mode and their original model flag', async () => {
  const root = await mkdtemp(join(tmpdir(), 'od-mimo-connection-'));
  const bin = join(root, 'mimo.cjs');
  const record = join(root, 'argv.json');
  try {
    await writeFile(bin, `#!/usr/bin/env node
const fs = require('node:fs');
fs.writeFileSync(${JSON.stringify(record)}, JSON.stringify(process.argv.slice(2)));
process.stdin.resume();
process.stdin.on('end', () => console.log(JSON.stringify({ type: 'text', part: { text: 'ok' } })));
`);
    await chmod(bin, 0o755);
    const result = await testAgentConnection({ agentId: 'mimo', model: 'mimo-model', agentCliEnv: { mimo: { MIMO_BIN: bin } } });
    expect(result).toMatchObject({ ok: true, sample: 'ok' });
    expect(JSON.parse(await readFile(record, 'utf8'))).toEqual([
      'run', '--format', 'json', '--model', 'mimo-model', '--pure', '--title', 'Connection test',
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});


it.skipIf(process.platform === 'win32').each([false, true])('native OpenCode generation aligns PWD and delivers complete stdin with resume=%s', async (resume) => {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'od-opencode-generation-')));
  const cwd = join(root, 'managed-project');
  const bin = join(root, 'opencode.cjs');
  const prompt = 'Write in the managed project.\n'.repeat(10_000);
  try {
    await mkdir(cwd);
    await writeFile(bin, `const fs = require('node:fs');
const stdin = fs.readFileSync(0, 'utf8');
console.log(JSON.stringify({ cwd: process.cwd(), pwd: process.env.PWD, args: process.argv.slice(2), stdin }));
`);
    const args = opencodeAgentDef.buildArgs('', [], [], {}, {
      cwd,
      ...(resume ? { resumeSessionId: 'ses_existing' } : {}),
      openCode: { profile: { dialect: 'v2' }, purpose: 'generation' },
    });
    const env = openCodeLaunchEnv(
      spawnEnvForAgent('opencode', { ...process.env, PWD: root }, { PWD: root }, {}),
      relative(process.cwd(), cwd),
    );
    const { child, promptDeliveredAtSpawn } = spawnAgentProcess({
      command: process.execPath,
      args: [bin, ...args],
      env,
      cwd,
      stdin: { prompt },
      runDir: join(root, 'run'),
      runId: 'pwd-proof',
    });
    let stdout = '';
    let stderr = '';
    child.stdout!.setEncoding('utf8').on('data', (chunk) => { stdout += chunk; });
    child.stderr!.setEncoding('utf8').on('data', (chunk) => { stderr += chunk; });
    const [code] = await once(child, 'close');
    expect({ code, stderr }).toEqual({ code: 0, stderr: '' });
    expect(promptDeliveredAtSpawn).toBe(true);
    expect(JSON.parse(stdout)).toEqual({
      cwd,
      pwd: cwd,
      args: ['run', '--format', 'json', '--standalone', '--auto', ...(resume ? ['-s', 'ses_existing'] : [])],
      stdin: prompt,
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

it.each(['opencode', 'byok-opencode', 'mimo', 'codex'])('keeps %s probe PWD and other providers unchanged', (agentId) => {
  const base = { PWD: '/inherited' };
  const configured = { PWD: '/configured' };
  expect(spawnEnvForAgent(agentId, base, configured, {}).PWD).toBe('/configured');
  expect(base).toEqual({ PWD: '/inherited' });
  expect(configured).toEqual({ PWD: '/configured' });
});


it.skipIf(process.platform === 'win32')('OpenCode help and catalog probes align PWD to their neutral cwd', async () => {
  const root = await mkdtemp(join(tmpdir(), 'od-opencode-probe-pwd-'));
  const bin = join(root, 'opencode.cjs');
  const record = join(root, 'probes.jsonl');
  try {
    await writeFile(bin, `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
fs.appendFileSync(${JSON.stringify(record)}, JSON.stringify({ args, cwd: process.cwd(), pwd: process.env.PWD }) + '\\n');
if (args.includes('--help')) console.log('--standalone --auto provider/model#variant');
else console.log('openrouter/anthropic/claude-opus-5.5');
`);
    await chmod(bin, 0o755);
    const env = { ...process.env, PWD: root };
    expect(await probeOpenCodeCli(bin, env)).toEqual({ dialect: 'v2' });
    expect(await readOpenCodeModelCatalog(bin, env)).toBe('openrouter/anthropic/claude-opus-5.5\n');
    const probes = (await readFile(record, 'utf8')).trim().split('\n').map((line) => JSON.parse(line));
    const cwd = await realpath(tmpdir());
    expect(probes).toEqual([
      ['run', '--help'], ['models', '--help'], ['models', '--standalone'],
    ].map((args) => ({ args, cwd, pwd: tmpdir() })));
    expect(env.PWD).toBe(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
