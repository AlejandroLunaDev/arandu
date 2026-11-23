#!/usr/bin/env node
// PreToolUse guard for the checks an agent must not bypass.
// - Bash/PowerShell: denies `--no-verify` and pointing `core.hooksPath` anywhere but `.githooks`;
//   asks the human before a command that names lint configuration.
// - Edit/Write: asks the human before touching lint configuration.
// Contract (https://code.claude.com/docs/en/hooks): JSON on stdin with `tool_name` and `tool_input`;
// exit 0 with `hookSpecificOutput.permissionDecision` ("deny" or "ask"); no output lets the normal flow continue.

const LINT_CONFIG = /eslint\.config\.|\.oxlintrc\.json/;
// Setting it to anything but .githooks, or unsetting it; reading it (`git config core.hooksPath`) is fine.
const HOOKS_PATH_OVERRIDE =
  /--unset(-all)?\s+core\.hookspath|core\.hookspath[\s=]+(""|''|["']?(?!\.githooks(?![\w./-]))[^\s;&|)`"'])/i;
// git takes any unambiguous prefix of a long option: --no-veri and --no-verif skip the hook as --no-verify does.
const NO_VERIFY = /--no-veri(fy?)?(?![\w-])/;

const askForLintConfig = (target) => ({
  permissionDecision: 'ask',
  permissionDecisionReason: `${target} touches lint configuration: that needs the human's approval. Fix the code instead of relaxing the rule.`,
});

function decide({ tool_name: tool, tool_input: input = {} }) {
  if (tool === 'Bash' || tool === 'PowerShell') {
    const command = String(input.command || '');
    if (NO_VERIFY.test(command) || HOOKS_PATH_OVERRIDE.test(command))
      return {
        permissionDecision: 'deny',
        permissionDecisionReason:
          'This skips the pre-push check, the only verification this repository has. Fix the failing typecheck or lint instead.',
      };
    if (LINT_CONFIG.test(command)) return askForLintConfig('This command');
  }
  if (tool === 'Edit' || tool === 'Write') {
    // file_path is absolute, with backslashes on Windows.
    const path = String(input.file_path || '').replace(/\\/g, '/');
    if (LINT_CONFIG.test(path.split('/').pop())) return askForLintConfig(path);
  }
  return null;
}

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => (raw += chunk));
process.stdin.on('end', () => {
  let decision = null;
  try {
    decision = decide(JSON.parse(raw));
  } catch {
    process.exit(0);
  }
  if (decision) process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', ...decision } }));
  process.exit(0);
});
