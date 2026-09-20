const SPRITESHEET_PATH = '/kcs2/img/common/common_itemicons'

let icons = null
let loadedServerIp = null
let loadingPromise = null
let loadingServerIp = null

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

export function initUseitemIcons(serverIp) {
  if (!serverIp) return Promise.resolve(null)

  if (icons && loadedServerIp === serverIp) return Promise.resolve(icons)
  if (loadingPromise && loadingServerIp === serverIp) return loadingPromise

  loadingServerIp = serverIp
  loadingPromise = fetchAndUnpack(serverIp)
    .then(nextIcons => {
      if (loadingServerIp === serverIp) {
        icons = nextIcons
        loadedServerIp = serverIp
      }
      return nextIcons
    })
    .catch(e => {
      console.error('[LevelingPlan] Failed to init useitem icons:', e)
      return null
    })
    .finally(() => {
      if (loadingServerIp === serverIp) {
        loadingPromise = null
        loadingServerIp = null
      }
    })

  return loadingPromise
}

export function getUseitemIcon(itemId) {
  if (!icons) return null
  return icons[`common_itemicons_id_${itemId}`] || null
}
