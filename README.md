# poi-plugin-leveling-plan

Ship leveling plan management plugin for poi.

## Features

- Create and manage ship leveling plans
- Track experience requirements and progress
- Support multiple maps and experience calculations
- Auto-complete plans when ships reach target level
- Personal stats tracking for map experience
- Fuzzy search for ship selection
- Multi-language support (EN, JA, ZH-CN, ZH-TW)

## Installation

### Method 1: npm Package (Recommended)

```bash
# Download the .tgz file, then install it in poi directory
cd /path/to/poi
npm install /path/to/poi-plugin-leveling-plan-x.x.x.tgz
```

### Method 2: Manual Installation (ZIP)

1. Download and extract the `.zip` file
2. Copy the contents of `dist/` directory to poi plugins directory:

```bash
# macOS / Linux
cp -r dist/* /path/to/poi/node_modules/poi-plugin-leveling-plan/

# Windows
xcopy dist\* \path\to\poi\node_modules\poi-plugin-leveling-plan\ /E /I
```

3. Restart poi

### Method 3: Development (Source)

```bash
# Clone or copy this repository to poi plugins directory
cp -r poi-plugin-leveling-plan /path/to/poi/node_modules/

# Install dependencies
cd /path/to/poi/node_modules/poi-plugin-leveling-plan
npm install
```

## Development

### Prerequisites

- Node.js >= 14
- npm >= 6
- poi development environment

### Setup

```bash
# Install dependencies
npm install

# Build the plugin
npm run build

# Or build everything (transpile + dist + packages)
npm run build:all
```

### Build Scripts

- `npm run build` - Full build (transpile + dist)
- `npm run build:transpile` - Transpile .es files to .js
- `npm run build:dist` - Create dist/ directory
- `npm run build:npm` - Create .tgz package
- `npm run build:zip` - Create .zip package
- `npm run build:all` - Build everything
- `npm run clean` - Remove build artifacts

### Project Structure

```
poi-plugin-leveling-plan/
├── index.es                 # Plugin entry point
├── views/                   # React components
│   ├── leveling-plan-area.es
│   └── components/
├── utils/                   # Utility functions
├── services/                # Business logic
├── i18n/                    # Translations
├── assets/                  # Static assets
└── scripts/                 # Build scripts
```

## Building for Distribution

To create distribution packages:

```bash
# Install build dependencies
npm install

# Create both .tgz and .zip packages
npm run build:all
```

This will generate:
- `poi-plugin-leveling-plan-x.x.x.tgz` - npm package
- `poi-plugin-leveling-plan-x.x.x.zip` - Manual installation package
- `dist/` - Transpiled files ready for use

## Dependencies

This plugin uses the following dependencies provided by poi:
- `@blueprintjs/core` - UI components
- `react` / `react-dom` - UI framework
- `redux` / `react-redux` - State management
- `redux-observers` - Redux observers
- `styled-components` - CSS-in-JS
- `classnames` - Class name utilities
- `fuse.js` - Fuzzy search
- `react-fontawesome` - Icons

These dependencies are marked as `peerDependencies` and will not be bundled with the plugin.

## License

MIT
