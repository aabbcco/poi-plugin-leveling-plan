const PAGES_BASE = 'https://aabbcco.github.io/poi-equip-ships-data'
const CONFIG_KEY = 'plugin.poi-plugin-leveling-plan'
const META_KEY = `${CONFIG_KEY}.kaisouMeta`
const DATA_KEY = `${CONFIG_KEY}.kaisouMaterials`

async function fetchJSON(url) {
  const resp = await fetch(url, {
    cache: 'no-cache',
    headers: { Accept: 'application/json' },
  })
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  return resp.json()
}

export async function initKaisouSync() {
  try {
    const meta = await fetchJSON(`${PAGES_BASE}/index.json`)
    if (!meta || !meta.updated_at) return

    const cachedMeta = window.config.get(META_KEY, {})
    if (meta.updated_at === cachedMeta.updated_at && meta.kaisou_count === cachedMeta.kaisou_count) {
      return
    }

    const data = await fetchJSON(`${PAGES_BASE}/kaisou_materials.json`)
    if (!data || Object.keys(data).length === 0) return

    window.config.set(DATA_KEY, data)
    window.config.set(META_KEY, { updated_at: meta.updated_at, kaisou_count: meta.kaisou_count })
  } catch (e) {
    // silent fallback, getShipMaterials will use bundled data
  }
}

export async function manualKaisouSync() {
  try {
    const meta = await fetchJSON(`${PAGES_BASE}/index.json`)
    if (!meta || !meta.updated_at) {
      return { success: false, error: 'Invalid metadata response' }
    }

    const cachedMeta = window.config.get(META_KEY, {})

    if (meta.updated_at === cachedMeta.updated_at && meta.kaisou_count === cachedMeta.kaisou_count) {
      return { success: true, meta, unchanged: true }
    }

    const data = await fetchJSON(`${PAGES_BASE}/kaisou_materials.json`)
    if (!data || Object.keys(data).length === 0) {
      return { success: false, error: 'Empty data response' }
    }

    window.config.set(DATA_KEY, data)
    window.config.set(META_KEY, { updated_at: meta.updated_at, kaisou_count: meta.kaisou_count })

    return { success: true, meta, unchanged: false }
  } catch (e) {
    return { success: false, error: e.message || 'Network error' }
  }
}
