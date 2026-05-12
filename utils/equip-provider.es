import initialEquipData from '../assets/initial_equip_ships.json'

let cachedFarmingMap = null
let cached$Ships = null
let cachedDataVersion = null

const getDataVersion = () => {
  try {
    const meta = window.config.get('plugin.poi-plugin-leveling-plan.equipSyncMeta', {})
    return meta.updated_at || 'bundled'
  } catch (e) {
    return 'bundled'
  }
}
let cachedParentMap = {}

const findRoot = (id, parentMap) => {
  let curr = id
  let steps = 0
  while (parentMap[curr] && steps < 20) {
    curr = parentMap[curr]
    steps++
  }
  return curr
}

export function loadSyncedData() {
  try {
    const data = window.config.get('plugin.poi-plugin-leveling-plan.equipShipsData', null)
    if (data && typeof data === 'object' && Object.keys(data).length > 0) {
      return data
    }
  } catch (e) {
    // ignore
  }
  return null
}

export function getFarmingMap($ships) {
  if (!$ships || Object.keys($ships).length === 0) return {}

  if (cachedFarmingMap && cached$Ships === $ships && cachedDataVersion === getDataVersion()) return cachedFarmingMap

  const parentMap = {}
  const nameToId = {}

  Object.values($ships).forEach(s => {
    const afterId = parseInt(s.api_aftershipid, 10)
    if (afterId > 0 && !parentMap[afterId]) {
      parentMap[afterId] = s.api_id
    }
    if (s.api_name) {
      nameToId[s.api_name] = s.api_id
    }
  })

  cachedParentMap = parentMap

  const activeData = loadSyncedData() || initialEquipData
  const map = {}

  Object.entries(activeData).forEach(([eqIdStr, providers]) => {
    const equipId = parseInt(eqIdStr, 10)
    if (!Array.isArray(providers)) return

    providers.forEach(({ name, level }) => {
      const shipId = nameToId[name]
      if (!shipId) return

      const rootId = findRoot(shipId, parentMap)

      if (!map[rootId]) {
        map[rootId] = { baseId: rootId, provides: [] }
      }

      const exists = map[rootId].provides.some(
        p => p.equipId === equipId && p.providerId === shipId && p.level === level
      )
      if (!exists) {
        map[rootId].provides.push({
          equipId,
          providerId: shipId,
          level,
        })
      }
    })
  })

  cachedFarmingMap = map
  cached$Ships = $ships
  cachedDataVersion = getDataVersion()
  return map
}

export function composeEquipmentList(farmingMap, $ships, $equipments, $equipTypes) {
  const equipmentMap = {}

  Object.entries(farmingMap).forEach(([baseShipIdStr, info]) => {
    const baseShipId = parseInt(baseShipIdStr, 10)
    const baseShipMaster = $ships[baseShipId] || {}
    const baseShipName = baseShipMaster.api_name || `Ship#${baseShipId}`

    info.provides.forEach(p => {
      const equipId = p.equipId

      if (!equipmentMap[equipId]) {
        const masterEquip = $equipments[equipId] || {}
        const typeId = (masterEquip.api_type && masterEquip.api_type[2]) || 0

        equipmentMap[equipId] = {
          id: equipId,
          name: masterEquip.api_name || `Equip#${equipId}`,
          iconId: (masterEquip.api_type && masterEquip.api_type[3]) || 0,
          typeName: ($equipTypes[typeId] || {}).api_name || 'Unknown',
          typeId,
          ships: [],
        }
      }

      const providerMaster = $ships[p.providerId] || {}
      const providerName = providerMaster.api_name || `Form#${p.providerId}`

      equipmentMap[equipId].ships.push({
        shipId: baseShipId,
        shipName: baseShipName,
        providerId: p.providerId,
        providerName,
        level: p.level,
      })
    })
  })

  const equipmentList = Object.values(equipmentMap)
  equipmentList.forEach(eq => {
    eq.ships.sort((a, b) => a.level - b.level)
  })

  return equipmentList.sort((a, b) => {
    if (a.typeId !== b.typeId) return a.typeId - b.typeId
    return a.id - b.id
  })
}
