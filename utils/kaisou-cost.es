import _ from 'lodash'
import { MAX_LEVEL } from './constants'
import kaisouMaterials from '../assets/kaisou_materials.json'

const KAISOU_ITEM_ID = {
  drawing: 58,
  catapult: 65,
  report: 78,
  devkit: 3,
  buildkit: 2,
  aviation: 77,
  hokoheso: 75,
  arms: 94,
}

export const RESOURCE_INDEX = {
  fuel: 0,
  ammo: 1,
  steel: 2,
  bauxite: 3,
  buildkit: 4,
  bucket: 5,
  devmat: 6,
  screw: 7,
}

export const emptyCost = () => ({
  ammo: 0,
  steel: 0,
  consumable: {},
  equipment: {},
})

export const addCost = (a, b) => {
  const addMap = (mapA, mapB) => {
    const result = { ...mapA }
    Object.keys(mapB).forEach(key => {
      result[key] = (result[key] || 0) + mapB[key]
    })
    return result
  }

  return {
    ammo: (a.ammo || 0) + (b.ammo || 0),
    steel: (a.steel || 0) + (b.steel || 0),
    consumable: addMap(a.consumable || {}, b.consumable || {}),
    equipment: addMap(a.equipment || {}, b.equipment || {}),
  }
}

export const multiplyCost = (cost, multiplier) => {
  const m = Number(multiplier || 0)
  if (m <= 0) return emptyCost()

  const multiplyMap = map => {
    const result = {}
    Object.keys(map).forEach(key => {
      result[key] = map[key] * m
    })
    return result
  }

  return {
    ammo: (cost.ammo || 0) * m,
    steel: (cost.steel || 0) * m,
    consumable: multiplyMap(cost.consumable || {}),
    equipment: multiplyMap(cost.equipment || {}),
  }
}

export const getShipMaterials = shipMasterId => {
  return kaisouMaterials[String(shipMasterId)] || null
}

export const parseShipMaterials = materialsData => {
  if (!materialsData) return emptyCost()

  const result = emptyCost()
  result.ammo = Number(materialsData.ammo || 0)
  result.steel = Number(materialsData.steel || 0)

  if (Array.isArray(materialsData.consumable)) {
    materialsData.consumable.forEach(([itemId, count]) => {
      result.consumable[String(itemId)] = (result.consumable[String(itemId)] || 0) + count
    })
  }

  if (Array.isArray(materialsData.equipment)) {
    materialsData.equipment.forEach(([equipId, count]) => {
      result.equipment[String(equipId)] = (result.equipment[String(equipId)] || 0) + count
    })
  }

  return result
}

// 直接从当前舰船往后遍历，不需要往前找起点
export const getRemodelChainForShip = (shipMasterId, $ships) => {
  if (!$ships || !$ships[shipMasterId]) return [shipMasterId]

  const chain = [shipMasterId]
  const visited = new Set([shipMasterId])
  let current = shipMasterId
  let iterations = 0
  const MAX_ITERATIONS = 20 // 防止无限循环

  while (iterations < MAX_ITERATIONS) {
    iterations++

    const next = +($ships[current]?.api_aftershipid || 0)
    if (next <= 0 || visited.has(next)) break
    visited.add(next)
    chain.push(next)
    current = next
  }

  return chain
}

// 直接往后遍历获取改造等级
export const getRemodelLevelsForShip = (shipMasterId, $ships) => {
  if (!$ships || !$ships[shipMasterId]) return []

  const levels = []
  const visited = new Set()
  let current = shipMasterId
  let iterations = 0
  const MAX_ITERATIONS = 20 // 防止无限循环

  while (iterations < MAX_ITERATIONS) {
    iterations++

    const nextId = +($ships[current]?.api_aftershipid || 0)
    if (nextId <= 0 || visited.has(nextId)) break
    visited.add(nextId)

    const nextLv = +($ships[nextId]?.api_afterlv || 0)
    if (nextLv > 0 && nextLv < 200) { // 过滤异常值
      levels.push(nextLv)
    }

    current = nextId
  }

  if (levels.length === 0) return []

  levels.sort((a, b) => a - b)
  const lastLv = levels[levels.length - 1]

  // 确保 MAX_LEVEL 是有效值
  const maxLvl = typeof MAX_LEVEL === 'number' && MAX_LEVEL > 0 ? MAX_LEVEL : 100

  if (lastLv < 100) {
    return [...levels, 99, maxLvl]
  }
  return [...levels, maxLvl]
}

export const countRemodelNodesInRange = (shipMasterId, fromLevel, toLevel, $ships) => {
  if (fromLevel >= toLevel) return 0

  const levels = getRemodelLevelsForShip(shipMasterId, $ships)
  if (levels.length === 0) return 0

  return levels.filter(lv => lv > fromLevel && lv <= toLevel).length
}

export const getShipRemodelCost = (shipMasterId, fromLevel, toLevel, $ships) => {
  if (!shipMasterId || fromLevel >= toLevel) return emptyCost()

  const chain = getRemodelChainForShip(shipMasterId, $ships)
  const levels = getRemodelLevelsForShip(shipMasterId, $ships)

  if (levels.length === 0) return emptyCost()

  let totalCost = emptyCost()

  // 遍历改造等级，找出需要改造的节点
  for (let i = 0; i < levels.length; i++) {
    const targetLv = levels[i]
    if (targetLv <= fromLevel || targetLv > toLevel) continue

    // 改造前的舰船是 chain[i]
    const shipIdBeforeRemodel = chain[i]
    const materials = getShipMaterials(shipIdBeforeRemodel)

    if (materials) {
      const parsed = parseShipMaterials(materials)
      totalCost = addCost(totalCost, parsed)
    }
  }

  return totalCost
}

export const calcShortage = (required, available) => {
  const req = Number(required || 0)
  const avail = Number(available || 0)
  return {
    required: req,
    available: avail,
    gap: Math.max(0, req - avail),
  }
}

export const calcAllShortages = (totalCost, resources, useitems, equips) => {
  const resourcesArr = Array.isArray(resources) ? resources : []

  const shortages = {
    ammo: calcShortage(totalCost.ammo, resourcesArr[RESOURCE_INDEX.ammo]),
    steel: calcShortage(totalCost.steel, resourcesArr[RESOURCE_INDEX.steel]),
    devmat: calcShortage(
      totalCost.consumable[KAISOU_ITEM_ID.devkit] || 0,
      resourcesArr[RESOURCE_INDEX.devmat]
    ),
    buildkit: calcShortage(
      totalCost.consumable[KAISOU_ITEM_ID.buildkit] || 0,
      resourcesArr[RESOURCE_INDEX.buildkit]
    ),
    consumable: {},
    equipment: {},
  }

  Object.entries(totalCost.consumable || {}).forEach(([itemId, required]) => {
    const available = _.get(useitems, [itemId, 'api_count'], 0)
    shortages.consumable[itemId] = calcShortage(required, available)
  })

  Object.entries(totalCost.equipment || {}).forEach(([equipId, required]) => {
    const available = _.get(equips, [equipId, 'length'], 0)
    shortages.equipment[equipId] = calcShortage(required, available)
  })

  return shortages
}

export const getTotalShortageCount = shortages => {
  let count = 0

  if (shortages.ammo?.gap > 0) count++
  if (shortages.steel?.gap > 0) count++
  if (shortages.devmat?.gap > 0) count++
  if (shortages.buildkit?.gap > 0) count++

  Object.values(shortages.consumable || {}).forEach(s => {
    if (s.gap > 0) count++
  })

  return count
}
