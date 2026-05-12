const PAGES_BASE = 'https://yuki.github.io/poi-equip-ships-data'
const CONFIG_KEY = 'plugin.poi-plugin-leveling-plan'
const META_KEY = `${CONFIG_KEY}.equipSyncMeta`
const DATA_KEY = `${CONFIG_KEY}.equipShipsData`

async function fetchJSON(url) {
  const resp = await fetch(url, {
    cache: 'no-cache',
    headers: { Accept: 'application/json' },
  })
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  return resp.json()
}

export async function initEquipSync() {
  try {
    const meta = await fetchJSON(`${PAGES_BASE}/index.json`)
    if (!meta || !meta.updated_at) return

    const cachedMeta = window.config.get(META_KEY, {})

    if (meta.updated_at === cachedMeta.updated_at) {
      return
    }

    const data = await fetchJSON(`${PAGES_BASE}/initial_equip_ships.json`)
    if (!data || Object.keys(data).length === 0) return

    window.config.set(DATA_KEY, data)
    window.config.set(META_KEY, meta)
  } catch (e) {
    // 静默失败，由 equip-provider 的 loadSyncedData 降级
  }
}

export async function manualSync() {
  try {
    const meta = await fetchJSON(`${PAGES_BASE}/index.json`)
    if (!meta || !meta.updated_at) {
      return { success: false, error: 'Invalid metadata response' }
    }

    const cachedMeta = window.config.get(META_KEY, {})

    if (meta.updated_at === cachedMeta.updated_at) {
      return { success: true, meta, unchanged: true }
    }

    const data = await fetchJSON(`${PAGES_BASE}/initial_equip_ships.json`)
    if (!data || Object.keys(data).length === 0) {
      return { success: false, error: 'Empty data response' }
    }

    window.config.set(DATA_KEY, data)
    window.config.set(META_KEY, meta)

    return { success: true, meta, unchanged: false }
  } catch (e) {
    return { success: false, error: e.message || 'Network error' }
  }
}
