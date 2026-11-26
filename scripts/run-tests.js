#!/usr/bin/env node

/**
 * Test runner for poi-plugin-leveling-plan
 * Builds transpiled artifacts into dist/ and executes node:test suites against them.
 */

const { spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const TEST_DIR = path.join(ROOT, 'test')

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: 'inherit',
  })
  if (result.error) {
    throw result.error
  }
  return result.status || 0
}

const buildCode = run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'])
if (buildCode !== 0) {
  process.exit(buildCode)
}

const testFiles = fs.readdirSync(TEST_DIR)
  .filter(name => name.endsWith('.test.js'))
  .sort()
  .map(name => path.join(TEST_DIR, name))

const testCode = run(process.execPath, ['--test', ...testFiles])
process.exit(testCode)
