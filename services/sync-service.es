const PAGES_BASE = 'https://aabbcco.github.io/poi-equip-ships-data'
const CONFIG_KEY = 'plugin.poi-plugin-leveling-plan'

async function fetchJSON(url) {
  const resp = await fetch(url, {
    cache: 'no-cache',
    headers: { Accept: 'application/json' },
  })
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  return resp.json()
}

async function doSync({ metaSuffix, dataSuffix, dataFile, metaFields, compareFields }) {
  const metaKey = `${CONFIG_KEY}.${metaSuffix}`
  const dataKey = `${CONFIG_KEY}.${dataSuffix}`
  const meta = await fetchJSON(`${PAGES_BASE}/index.json`)
  if (!meta || !meta.updated_at) return null
  const cachedMeta = window.config.get(metaKey, {})
  if (compareFields.every(f => meta[f] === cachedMeta[f])) return { unchanged: true, meta }
  const data = await fetchJSON(`${PAGES_BASE}/${dataFile}`)
  if (!data || Object.keys(data).length === 0) return null
  window.config.set(dataKey, data)
  window.config.set(metaKey, metaFields.reduce((o, f) => { o[f] = meta[f]; return o }, { updated_at: meta.updated_at }))
  return { unchanged: false, meta }
}

const EQUIP_CFG = {
  metaSuffix: 'equipSyncMeta',
  dataSuffix: 'equipShipsData',
  dataFile: 'initial_equip_ships.json',
  metaFields: ['equip_count', 'ship_entry_count'],
  compareFields: ['updated_at'],
}

const KAISOU_CFG = {
  metaSuffix: 'kaisouMeta',
  dataSuffix: 'kaisouMaterials',
  dataFile: 'kaisou_materials.json',
  metaFields: ['kaisou_count'],
  compareFields: ['updated_at', 'kaisou_count'],
}

export async function initEquipSync() {
  try { await doSync(EQUIP_CFG) } catch (e) { /* silent */ }
}

export async function initKaisouSync() {
  try { await doSync(KAISOU_CFG) } catch (e) { /* silent */ }
}

export async function manualEquipSync() {
  try {
    const result = await doSync(EQUIP_CFG)
    if (!result) return { success: false, error: 'Error during sync' }
    return { success: true, meta: result.meta, unchanged: result.unchanged }
  } catch (e) {
    return { success: false, error: e.message || 'Network error' }
  }
}

export async function manualKaisouSync() {
  try {
    const result = await doSync(KAISOU_CFG)
    if (!result) return { success: false, error: 'Error during sync' }
    return { success: true, meta: result.meta, unchanged: result.unchanged }
  } catch (e) {
    return { success: false, error: e.message || 'Network error' }
  }
}
