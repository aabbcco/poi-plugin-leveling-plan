#!/usr/bin/env node

/**
 * Create ZIP package for poi-plugin-leveling-plan
 * Packages the dist/ directory into a .zip file for manual installation
 */

const archiver = require('archiver')
const fs = require('fs-extra')
const path = require('path')

const ROOT_DIR = path.join(__dirname, '..')
const DIST_DIR = path.join(ROOT_DIR, 'dist')

/**
 * Get package version from package.json
 */
async function getPackageInfo() {
  const pkgPath = path.join(ROOT_DIR, 'package.json')
  const pkg = await fs.readJSON(pkgPath)
  return {
    name: pkg.name,
    version: pkg.version,
  }
}

/**
 * Create ZIP archive
 */
async function createZip() {
  console.log('📦 Creating ZIP package...\n')

  try {
    // Step 1: Check if dist exists
    const distExists = await fs.pathExists(DIST_DIR)
    if (!distExists) {
      console.error('❌ Error: dist/ directory not found!')
      console.error('   Please run "npm run build" first')
      process.exit(1)
    }

    // Step 2: Get package info
    const { name, version } = await getPackageInfo()
    const zipFileName = `${name}-${version}.zip`
    const zipFilePath = path.join(ROOT_DIR, zipFileName)

    // Remove old zip if exists
    if (await fs.pathExists(zipFilePath)) {
      await fs.remove(zipFilePath)
      console.log(`🗑️  Removed old: ${zipFileName}`)
    }

    // Step 3: Create archive
    console.log(`📦 Creating: ${zipFileName}`)
    
    const output = fs.createWriteStream(zipFilePath)
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    })

    // Listen for archive events
    output.on('close', () => {
      const sizeInBytes = archive.pointer()
      const sizeInKB = (sizeInBytes / 1024).toFixed(2)
      console.log()
      console.log('✅ ZIP package created successfully!\n')
      console.log('📊 Package summary:')
      console.log(`   File: ${zipFileName}`)
      console.log(`   Size: ${sizeInKB} KB (${sizeInBytes} bytes)`)
      console.log(`   Location: ${zipFilePath}`)
      console.log()
      console.log('💡 Installation:')
      console.log('   1. Unzip the package')
      console.log('   2. Copy dist/ contents to poi plugins directory:')
      console.log('      cp -r dist/* /path/to/poi/node_modules/poi-plugin-leveling-plan/')
    })

    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        console.warn('⚠️  Warning:', err.message)
      } else {
        throw err
      }
    })

    archive.on('error', (err) => {
      throw err
    })

    // Pipe archive data to file
    archive.pipe(output)

    // Add dist directory to archive
    // The directory structure in the ZIP will be: dist/...
    archive.directory(DIST_DIR, 'dist')

    // Add a README for installation
    const installReadme = `# ${name} v${version}

## Installation

### Manual Installation

1. Extract this ZIP file
2. Copy the contents of the \`dist/\` directory to your poi plugins directory:

\`\`\`bash
# macOS / Linux
cp -r dist/* /path/to/poi/node_modules/poi-plugin-leveling-plan/

# Windows
xcopy dist\\* \\path\\to\\poi\\node_modules\\poi-plugin-leveling-plan\\ /E /I
\`\`\`

3. Restart poi

### Finding poi plugins directory

The plugins directory is typically located at:
- **Windows**: \`C:\\Users\\[YourName]\\AppData\\Local\\Programs\\poi\\resources\\app.asar.unpacked\\node_modules\`
- **macOS**: \`/Applications/poi.app/Contents/Resources/app.asar.unpacked/node_modules\`
- **Linux**: \`/opt/poi/resources/app.asar.unpacked/node_modules\`

If you installed poi from source or npm, the path might be different.

## Alternative: npm Installation

If you have the .tgz file instead, you can install via npm:

\`\`\`bash
cd /path/to/poi
npm install /path/to/${name}-${version}.tgz
\`\`\`

---

For more information, visit: https://github.com/poooi/poi
`

    archive.append(installReadme, { name: 'README.txt' })

    // Finalize the archive
    await archive.finalize()

  } catch (error) {
    console.error('❌ Failed to create ZIP:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

// Run
if (require.main === module) {
  createZip()
}

module.exports = createZip
