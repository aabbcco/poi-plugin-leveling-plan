const path = require('path')
const Module = require('module')

const DIST_DIR = path.resolve(__dirname, '..', 'dist')

const mockedModules = new Map()
const originalResolveFilename = Module._resolveFilename

Module._resolveFilename = function patchedResolve(request, parent, isMain, options) {
  if (mockedModules.has(request)) {
    return request
  }
  return originalResolveFilename.call(this, request, parent, isMain, options)
}

function mockModule(id, exportsObj) {
  mockedModules.set(id, true)
  require.cache[id] = {
    id,
    filename: id,
    loaded: true,
    exports: exportsObj,
  }
}

function getByPath(obj, dotPath, fallback) {
  if (!dotPath) return obj === undefined ? fallback : obj
  const parts = dotPath.split('.')
  let cur = obj
  for (const part of parts) {
    if (cur == null || typeof cur !== 'object' || !(part in cur)) {
      return fallback
    }
    cur = cur[part]
  }
  return cur === undefined ? fallback : cur
}

function setByPath(obj, dotPath, value) {
  const parts = dotPath.split('.')
  let cur = obj
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]
    if (!cur[part] || typeof cur[part] !== 'object') {
      cur[part] = {}
    }
    cur = cur[part]
  }
  cur[parts[parts.length - 1]] = value
}

function createWindowMock() {
  const configStore = {}
  const reduxStoreState = {}
  const listeners = new Map()
  const notifications = []

  return {
    _configStore: configStore,
    _reduxStoreState: reduxStoreState,
    _notifications: notifications,
    config: {
      get(key, defaultValue) {
        return getByPath(configStore, key, defaultValue)
      },
      set(key, value) {
        setByPath(configStore, key, value)
      },
    },
    getStore(dotPath) {
      if (dotPath && dotPath.startsWith('config.')) {
        return getByPath(configStore, dotPath.slice('config.'.length))
      }
      return getByPath(reduxStoreState, dotPath)
    },
    notify(title, message) {
      notifications.push({ title, message })
    },
    i18n: {
      'poi-plugin-leveling-plan': {
        __: key => key,
      },
    },
    addEventListener(event, handler) {
      if (!listeners.has(event)) listeners.set(event, new Set())
      listeners.get(event).add(handler)
    },
    removeEventListener(event, handler) {
      if (listeners.has(event)) listeners.get(event).delete(handler)
    },
    dispatchEvent(event, payload) {
      if (!listeners.has(event)) return
      for (const handler of listeners.get(event)) {
        handler(payload)
      }
    },
  }
}

function resetWindow() {
  const mock = createWindowMock()
  global.window = mock
  return mock
}

function loadDist(relPath, { fresh = false } = {}) {
  const fullPath = require.resolve(path.join(DIST_DIR, relPath))
  if (fresh) {
    delete require.cache[fullPath]
  }
  return require(fullPath)
}

function clearDistCache() {
  for (const key of Object.keys(require.cache)) {
    if (key.startsWith(DIST_DIR)) {
      delete require.cache[key]
    }
  }
}

module.exports = {
  DIST_DIR,
  mockModule,
  resetWindow,
  loadDist,
  clearDistCache,
}
