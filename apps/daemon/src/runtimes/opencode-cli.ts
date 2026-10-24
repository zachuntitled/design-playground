import os from 'node:os';
import path from 'node:path';
import { execAgentFile } from './invocation.js';
import type { RuntimeEnv } from './types.js';

export type OpenCodeCliProfile =
  | { dialect: 'legacy'; skipPermissions: boolean; pure: boolean }
  | { dialect: 'v2' };

export type OpenCodeInvocation = {
  profile: OpenCodeCliProfile;
  purpose: 'generation' | 'connection-test';
};

async function readHelp(launchPath: string, env: RuntimeEnv, command: string): Promise<string> {
  const cwd = os.tmpdir();
  try {
    const { stdout, stderr } = await execAgentFile(launchPath, [command, '--help'], {
      cwd,
      env: openCodeLaunchEnv(env, cwd),
      timeout: 5_000,
      maxBuffer: 4 * 1024 * 1024,
    });
    return `${stdout}\n${stderr}`;
  } catch {
    return '';
  }
}

function hasFlag(help: string, flag: string): boolean {
  return new RegExp(`(?:^|\\s)${flag}(?=[\\s,=]|$)`, 'm').test(help);
}

export async function probeOpenCodeCli(launchPath: string, env: RuntimeEnv): Promise<OpenCodeCliProfile> {
  const help = await readHelp(launchPath, env, 'run');
  if (hasFlag(help, '--standalone') && hasFlag(help, '--auto') && help.includes('provider/model#variant')) {
    return { dialect: 'v2' };
  }
  // Unknown help must retain legacy --dir; omitting it can adopt an enclosing Git workspace.
  return {
    dialect: 'legacy',
    skipPermissions: hasFlag(help, '--dangerously-skip-permissions'),
    pure: hasFlag(help, '--pure'),
  };
}

export async function readOpenCodeModelCatalog(launchPath: string, env: RuntimeEnv): Promise<string> {
  const help = await readHelp(launchPath, env, 'models');
  const cwd = os.tmpdir();
  const { stdout } = await execAgentFile(launchPath, [
    'models', hasFlag(help, '--standalone') ? '--standalone' : '--verbose',
  ], {
    cwd,
    env: openCodeLaunchEnv(env, cwd),
    timeout: 15_000,
    maxBuffer: 8 * 1024 * 1024,
  });
  return String(stdout);
}

export function openCodeLaunchEnv(env: RuntimeEnv, cwd: string): RuntimeEnv {
  // OpenCode uses PWD for Git discovery even when the child process cwd differs.
  return { ...env, PWD: path.resolve(cwd) };
}
