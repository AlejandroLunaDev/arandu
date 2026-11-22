#!/usr/bin/env node
// PostToolUse hook: lints the file the agent just wrote and shows it the errors.
// Contract (https://code.claude.com/docs/en/hooks): `tool_input.file_path` is absolute; exit 2 shows stderr to the agent.
const { spawnSync } = require('node:child_process');
const { existsSync } = require('node:fs');
const { dirname, join, parse } = require('node:path');

const LINTED = /\.(ts|tsx|js|mjs|cjs)$/;
// Each app lints with its own tool: the web with ESLint, the API with oxlint.
const LINTERS = [
  ['eslint.config.mjs', (file) => `npx --no-install eslint "${file}"`],
  ['.oxlintrc.json', (file) => `npx --no-install oxlint --type-aware "${file}"`],
];

// The app or package that owns the file: the nearest folder with a lint config, and its command.
function linterOf(file) {
  for (let dir = dirname(file); dir !== parse(dir).root; dir = dirname(dir))
    for (const [config, command] of LINTERS) if (existsSync(join(dir, config))) return { cwd: dir, command: command(file) };
  return null;
}

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => (raw += chunk));
process.stdin.on('end', () => {
  let file;
  try {
    file = JSON.parse(raw).tool_input.file_path;
  } catch {
    process.exit(0);
  }
  if (!file || !LINTED.test(file)) process.exit(0);
  const linter = linterOf(file);
  if (!linter) process.exit(0);
  const result = spawnSync(linter.command, { cwd: linter.cwd, shell: true, encoding: 'utf8' });
  if (result.status === 0) process.exit(0);
  process.stderr.write(`Lint failed on ${file}. Fix the code, not the rule:\n${result.stdout}${result.stderr}`);
  process.exit(2);
});
