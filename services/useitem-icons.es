const CONFIG_KEY = 'plugin.poi-plugin-leveling-plan.useitemIcons'
const META_KEY = 'plugin.poi-plugin-leveling-plan.useitemIconsMeta'
const SPRITESHEET_PATH = '/kcs2/img/common/common_itemicons'

async function fetchAndUnpack(serverIp) {
  const pngUrl = `http://${serverIp}${SPRITESHEET_PATH}.png`
  const jsonUrl = `http://${serverIp}${SPRITESHEET_PATH}.json`

  const [pngBlob, configJSON] = await Promise.all([
    fetch(pngUrl).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.blob() }),
    fetch(jsonUrl).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() }),
  ])

  const textureBlobURL = URL.createObjectURL(pngBlob)
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      const icons = {}
      for (const [key, item] of Object.entries(configJSON.frames)) {
        const { x, y, w, h } = item.frame
        canvas.width = w
        canvas.height = h
        ctx.clearRect(0, 0, w, h)
        ctx.drawImage(img, x, y, w, h, 0, 0, w, h)
        icons[key] = canvas.toDataURL('image/webp')
      }
      URL.revokeObjectURL(textureBlobURL)
      resolve(icons)
    }

    img.onerror = () => {
      URL.revokeObjectURL(textureBlobURL)
      reject(new Error('Failed to load spritesheet image'))
    }

    img.src = textureBlobURL
  })
}

export async function initUseitemIcons(serverIp) {
  try {
    if (!serverIp) return

    const cached = window.config.get(CONFIG_KEY, null)
    if (cached) return

    const icons = await fetchAndUnpack(serverIp)
    window.config.set(CONFIG_KEY, icons)
    window.config.set(META_KEY, Date.now())
    console.log(`[LevelingPlan] Useitem icons loaded: ${Object.keys(icons).length} frames`)
  } catch (e) {
    console.error('[LevelingPlan] Failed to init useitem icons:', e)
  }
}

export function getUseitemIcon(itemId) {
  try {
    const icons = window.config.get(CONFIG_KEY, null)
    if (!icons) return null
    return icons[`common_itemicons_id_${itemId}`] || null
  } catch (e) {
    return null
  }
}
