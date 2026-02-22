#!/usr/bin/env node

/**
 * Build script for poi-plugin-leveling-plan
 * Creates dist/ directory with production-ready files
 */

const fs = require('fs-extra')
const path = require('path')

const ROOT_DIR = path.join(__dirname, '..')
const DIST_DIR = path.join(ROOT_DIR, 'dist')

// Files and directories to copy
const COPY_ITEMS = [
  { src: 'index.js', required: true },
  { src: 'views', type: 'dir', required: true },
  { src: 'utils', type: 'dir', required: true },
  { src: 'services', type: 'dir', required: true },
  { src: 'i18n', type: 'dir', required: true },
  { src: 'assets', type: 'dir', required: true },
  { src: 'package.json', required: true },
]

// Files to exclude (glob patterns)
const EXCLUDE_PATTERNS = [
  '.es',              // Source files (*.es)
  '.DS_Store',        // macOS files
  'node_modules',     // Dependencies
]

/**
 * Check if a file should be excluded
 */
function shouldExclude(filePath) {
  // Get the filename from the path
  const fileName = path.basename(filePath)
  
  return EXCLUDE_PATTERNS.some(pattern => {
    // Check if it's a file extension pattern
    if (pattern.startsWith('.')) {
      return fileName.endsWith(pattern)
    }
    // Check if it's a directory/file name
    return filePath.includes(pattern)
  })
}

/**
 * Copy a file or directory with filtering
 */
async function copyWithFilter(src, dest) {
  const srcPath = path.join(ROOT_DIR, src)
  const destPath = path.join(DIST_DIR, src)

  const stats = await fs.stat(srcPath)
  
  if (stats.isDirectory()) {
    // Copy directory with filtering
    await fs.copy(srcPath, destPath, {
      filter: (src) => {
        const relativePath = path.relative(ROOT_DIR, src)
        return !shouldExclude(relativePath)
      }
    })
    console.log(`  ✓ Copied directory: ${src}/`)
  } else {
    // Copy single file
    await fs.copy(srcPath, destPath)
    console.log(`  ✓ Copied file: ${src}`)
  }
}

/**
 * Main build function
 */
async function build() {
  console.log('🔨 Building poi-plugin-leveling-plan...\n')

  try {
    // Step 1: Clean dist directory
    console.log('📁 Cleaning dist directory...')
    await fs.remove(DIST_DIR)
    await fs.ensureDir(DIST_DIR)
    console.log('  ✓ Cleaned\n')

    // Step 2: Check if .js files exist (transpiled)
    const indexJsPath = path.join(ROOT_DIR, 'index.js')
    if (!await fs.pathExists(indexJsPath)) {
      console.error('❌ Error: index.js not found!')
      console.error('   Please run "npm run build:transpile" first to transpile .es files')
      process.exit(1)
    }

    // Step 3: Copy files to dist
    console.log('📦 Copying files to dist/...')
    for (const item of COPY_ITEMS) {
      const srcPath = path.join(ROOT_DIR, item.src)
      
      // Check if source exists
      const exists = await fs.pathExists(srcPath)
      
      if (!exists) {
        if (item.required) {
          console.error(`❌ Error: Required ${item.type || 'file'} not found: ${item.src}`)
          process.exit(1)
        } else {
          console.log(`  ⚠ Skipped (not found): ${item.src}`)
          continue
        }
      }

      await copyWithFilter(item.src, item.src)
    }
    console.log()

    // Step 4: Create a minimal package.json for dist
    console.log('📝 Creating dist package.json...')
    const pkgPath = path.join(ROOT_DIR, 'package.json')
    const pkg = await fs.readJSON(pkgPath)
    
    // Remove dev-only fields
    const distPkg = {
      name: pkg.name,
      version: pkg.version,
      description: pkg.description,
      main: pkg.main,
      author: pkg.author,
      license: pkg.license,
      repository: pkg.repository,
      peerDependencies: pkg.peerDependencies,
      poiPlugin: pkg.poiPlugin,
    }

    await fs.writeJSON(path.join(DIST_DIR, 'package.json'), distPkg, { spaces: 2 })
    console.log('  ✓ Created\n')

    // Step 5: Show summary
    console.log('✅ Build completed successfully!\n')
    console.log('📊 Build summary:')
    
    const distStats = await getDirectorySize(DIST_DIR)
    console.log(`   Size: ${formatBytes(distStats.size)}`)
    console.log(`   Files: ${distStats.files}`)
    console.log(`   Location: ${DIST_DIR}`)
    console.log()
    console.log('💡 Next steps:')
    console.log('   - Run "npm run build:npm" to create .tgz package')
    console.log('   - Run "npm run build:zip" to create .zip package')
    console.log('   - Or run "npm run build:all" to create both')
    
  } catch (error) {
    console.error('❌ Build failed:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

/**
 * Get directory size and file count
 */
async function getDirectorySize(dir) {
  let size = 0
  let files = 0

  async function walk(directory) {
    const items = await fs.readdir(directory)
    
    for (const item of items) {
      const itemPath = path.join(directory, item)
      const stats = await fs.stat(itemPath)
      
      if (stats.isDirectory()) {
        await walk(itemPath)
      } else {
        size += stats.size
        files++
      }
    }
  }

  await walk(dir)
  return { size, files }
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Run build
if (require.main === module) {
  build()
}

module.exports = build
