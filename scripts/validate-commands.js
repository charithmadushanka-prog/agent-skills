#!/usr/bin/env node
/**
 * validate-commands.js
 *
 * Guards the Claude Code slash commands in .claude/commands/.
 *
 * Checks (errors block CI):
 *   - Every command has a non-empty 'description' in its frontmatter
 *   - Command frontmatter is valid YAML, not merely splittable
 *
 * Exit codes: 0 = all clear, 1 = one or more errors
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// The same frontmatter-validity rules validate-skills applies to SKILL.md.
// `descriptionFromMd` below splits each line on its first colon, exactly as the
// skill reader used to, so a command whose frontmatter is not valid YAML passes
// the description check — and Claude Code parses that frontmatter when the
// command is loaded. The #494 thread verified all 25 SKILL.md files AND the
// command files by hand; this makes the second half a check too.
const { frontmatterYamlErrors } = require(path.join(__dirname, 'lib', 'skill-lint.js'));

// ─── Config ───────────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '..');
const COMMANDS_DIR = path.join(ROOT, '.claude', 'commands');
const EXT = '.md';

// ─── Parser ───────────────────────────────────────────────────────────────────

function descriptionFromMd(content) {
  const match = content.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n/);
  if (!match) return null;
  for (const line of match[1].split(/\r?\n/)) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    if (line.slice(0, colonIdx).trim() === 'description') {
      return line.slice(colonIdx + 1).trim().replace(/^['"]|['"]$/g, '') || null;
    }
  }
  return null;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const stems = fs.existsSync(COMMANDS_DIR)
    ? fs.readdirSync(COMMANDS_DIR).filter(f => f.endsWith(EXT)).map(f => path.basename(f, EXT)).sort()
    : [];

  let errors = 0;
  console.log('Checking Claude commands...');

  for (const stem of stems) {
    const full = path.join(COMMANDS_DIR, `${stem}${EXT}`);
    let content;
    try {
      content = fs.readFileSync(full, 'utf8');
    } catch (e) {
      console.log(`  ✗  ${stem} — cannot read file: ${e.message}`);
      errors++;
      continue;
    }

    const problems = [];
    if (descriptionFromMd(content) == null) {
      problems.push('missing or malformed description');
    }
    problems.push(...frontmatterYamlErrors(content));

    if (problems.length === 0) {
      console.log(`  ✓  ${stem}`);
      continue;
    }
    console.log(`  ✗  ${stem}`);
    for (const message of problems) {
      console.log(`       ${message}`);
      errors++;
    }
  }

  const status = errors > 0 ? 'FAILED' : 'PASSED';
  console.log(`\n${stems.length} commands checked — ${errors} error(s) — ${status}`);

  if (errors > 0) process.exit(1);
}

main();
