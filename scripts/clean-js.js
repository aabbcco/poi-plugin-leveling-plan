#!/usr/bin/env node

const fs = require('fs-extra')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const DIRS = ['views', 'utils', 'services']
const CLEAN_ALL = process.argv.includes('--all')

function deleteIfCompiled(dir) {
  const abs = path.join(ROOT, dir)
  if (!fs.existsSync(abs)) return

  const entries = fs.readdirSync(abs)
  for (const name of entries) {
    const full = path.join(abs, name)
    const stat = fs.statSync(full)
    if (stat.isDirectory()) {
      deleteIfCompiled(path.join(dir, name))
    } else if (name.endsWith('.js') && fs.existsSync(full.replace(/\.js$/, '.es'))) {
      fs.removeSync(full)
      console.log(`  ✕ ${path.relative(ROOT, full)}`)
    }
  }
}

// Root-level ./index.js
const rootJs = path.join(ROOT, 'index.js')
if (fs.existsSync(rootJs) && fs.existsSync(path.join(ROOT, 'index.es'))) {
  fs.removeSync(rootJs)
  console.log(`  ✕ index.js`)
}

DIRS.forEach(dir => deleteIfCompiled(dir))

if (CLEAN_ALL) {
  fs.removeSync(path.join(ROOT, 'dist'))
  for (const name of fs.readdirSync(ROOT)) {
    if (name.endsWith('.tgz') || name.endsWith('.zip')) {
      fs.removeSync(path.join(ROOT, name))
      console.log(`  ✕ ${name}`)
    }
  }
}
