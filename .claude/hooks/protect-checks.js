#!/usr/bin/env node
// PreToolUse guard for the checks an agent must not bypass.
// - Bash/PowerShell: denies `--no-verify` and pointing `core.hooksPath` anywhere but `.githooks`;
//   asks the human before a command that names lint configuration.
// - Edit/Write: asks the human before touching lint configuration.
// Contract (https://code.claude.com/docs/en/hooks): JSON on stdin with `tool_name` and `tool_input`;
// exit 0 with `hookSpecificOutput.permissionDecision` ("deny" or "ask"); no output lets the normal flow continue.

const LINT_CONFIG = /eslint\.config\.|\.oxlintrc\.json/;
// True when the command unsets core.hooksPath or gives it any value but exactly .githooks (quoted or not).
// Reading it (`git config core.hooksPath`, no value after it) is fine.
function overridesHooksPath(command) {
  if (/--unset(-all)?\s+core\.hookspath|--remove-section\s+core(\s|$)/i.test(command)) return true;
  const name = /core\.hookspath/gi;
  for (let m; (m = name.exec(command)); ) {
    const rest = command.slice(m.index + m[0].length);
    const separator = /^[\s=]*/.exec(rest)[0];
    const after = rest.slice(separator.length);
    const quote = after[0] === '"' || after[0] === "'" ? after[0] : null;
    let value;
    if (quote) {
      const end = after.indexOf(quote, 1);
      value = after.slice(1, end === -1 ? undefined : end);
    } else {
      value = /^[^\s;&|)`]*/.exec(after)[0];
      if (value === '' && !separator.includes('=')) continue;
    }
    if (value !== '.githooks') return true;
  }
  return false;
}
// git takes any unambiguous prefix of a long option: --no-veri and --no-verif skip the hook as --no-verify does.
const NO_VERIFY = /--no-veri(fy?)?(?![\w-])/;

const askForLintConfig = (target) => ({
  permissionDecision: 'ask',
  permissionDecisionReason: `${target} touches lint configuration: that needs the human's approval. Fix the code instead of relaxing the rule.`,
});

function decide({ tool_name: tool, tool_input: input = {} }) {
  if (tool === 'Bash' || tool === 'PowerShell') {
    const command = String(input.command || '');
    if (NO_VERIFY.test(command) || overridesHooksPath(command))
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
