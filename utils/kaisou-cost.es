import _ from 'lodash'
import { MAX_LEVEL } from './constants'
import kaisouMaterials from '../assets/kaisou_materials.json'

const KAISOU_ITEM_ID = {
  devkit: 3,
  buildkit: 2,
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

export const getShipMaterials = (shipMasterId, remoteMaterials = undefined) => {
  if (remoteMaterials && remoteMaterials[String(shipMasterId)]) {
    return remoteMaterials[String(shipMasterId)]
  }
  if (remoteMaterials === undefined) {
    try {
      const remote = window.config.get('plugin.poi-plugin-leveling-plan.kaisouMaterials', null)
      if (remote && remote[String(shipMasterId)]) return remote[String(shipMasterId)]
    } catch (e) { /* fall through */ }
  }
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
  const startId = +shipMasterId
  if (!$ships || !$ships[startId]) return [startId]

  const chain = [startId]
  const visited = new Set([startId])
  let current = startId
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
  const startId = +shipMasterId
  if (!$ships || !$ships[startId]) return []

  const levelSet = new Set()
  const visited = new Set([startId])
  let current = startId
  let iterations = 0
  const MAX_ITERATIONS = 20 // 防止无限循环

  while (iterations < MAX_ITERATIONS) {
    iterations++

    const nextId = +($ships[current]?.api_aftershipid || 0)
    const nextLv = +($ships[current]?.api_afterlv || 0)
    if (nextId <= 0 || visited.has(nextId)) {
      if (nextId <= 0 && nextLv > 0 && nextLv < 200) {
        levelSet.add(nextLv)
      }
      break
    }

    if (nextLv > 0 && nextLv < 200) {
      levelSet.add(nextLv)
    }

    visited.add(nextId)
    current = nextId
  }

  if (levelSet.size === 0) return []

  const levels = Array.from(levelSet).sort((a, b) => a - b)
  const lastLv = levels[levels.length - 1]

  // 确保 MAX_LEVEL 是有效值
  const maxLvl = typeof MAX_LEVEL === 'number' && MAX_LEVEL > 0 ? MAX_LEVEL : 100

  if (lastLv < 100 && !levelSet.has(99)) {
    levels.push(99)
  }
  if (!levelSet.has(maxLvl)) {
    levels.push(maxLvl)
  }
  return levels
}

/**
 * 一次性构建全量改造链索引,供 selectors 与各消费方共享
 * @param {object} $ships - 舰船图鉴数据 { api_id: ship }
 * @returns {object} { parentMap, chains, uniqueIds }
 *  - parentMap: 改造后舰ID → 改造前舰ID(前驱映射)
 *  - chains:    舰ID → 从该舰向后的完整改造链
 *  - uniqueIds: 链头(基础形态)ID 列表,即没有其他舰船改造成它的舰船
 */
export const buildRemodelIndex = ($ships) => {
  const parentMap = {}
  const chains = {}
  const uniqueIds = []

  if (!$ships || typeof $ships !== 'object') {
    return { parentMap, chains, uniqueIds }
  }

  Object.values($ships).forEach(ship => {
    const afterId = +(ship?.api_aftershipid || 0)
    if (afterId > 0 && parentMap[afterId] === undefined) {
      parentMap[afterId] = ship.api_id
    }
  })

  Object.keys($ships).forEach(id => {
    chains[id] = getRemodelChainForShip(id, $ships)
  })

  const covered = new Set()

  Object.keys($ships).forEach(id => {
    if (parentMap[id] === undefined) {
      uniqueIds.push(id)
      chains[id].forEach(memberId => covered.add(String(memberId)))
    }
  })

  // 处理无入口的纯循环改造链（如宗谷：699 → 645 → 650 → 699）
  Object.keys($ships).forEach(id => {
    if (covered.has(String(id))) return
    const chain = chains[id] || [Number(id)]
    const canonicalId = String(Math.min(...chain))
    uniqueIds.push(canonicalId)
    chain.forEach(memberId => covered.add(String(memberId)))
  })

  return { parentMap, chains, uniqueIds }
}

export const getShipRemodelDetail = (shipMasterId, currentLv, targetLv, $ships, remoteMaterials = undefined) => {
  if (!shipMasterId || currentLv >= targetLv) {
    return { steps: [], totalCost: emptyCost() }
  }

  const chain = getRemodelChainForShip(shipMasterId, $ships)
  if (chain.length < 2) {
    return { steps: [], totalCost: emptyCost() }
  }

  // 检测链尾是否存在可逆/循环改造（如甲↔乙或三形态循环切换）
  const lastNext = +($ships[chain[chain.length - 1]]?.api_aftershipid || 0)
  const cycleStartIdx = lastNext > 0 ? chain.indexOf(lastNext) : -1

  const steps = []
  let totalCost = emptyCost()

  // 沿当前形态向后遍历改造链 [chain[i] → chain[i+1]]
  // 改造等级取改造前形态的 api_afterlv,消耗材料也按改造前形态计
  for (let i = 0; i < chain.length - 1; i++) {
    const fromId = chain[i]
    const toId = chain[i + 1]
    const level = +($ships[fromId]?.api_afterlv || 0)
    if (level <= 0 || level >= 200 || level > targetLv) continue

    const isPassedLevel = level <= currentLv
    const isReversibleStep = cycleStartIdx !== -1 && i >= cycleStartIdx
    if (isPassedLevel && isReversibleStep) continue

    steps.push({
      level,
      fromId,
      toId,
      toName: $ships[toId]?.api_name || `Ship#${toId}`,
      isDelayed: isPassedLevel,
    })

    const materials = getShipMaterials(fromId, remoteMaterials)
    if (materials) {
      totalCost = addCost(totalCost, parseShipMaterials(materials))
    }
  }

  return { steps, totalCost }
}

export const getShipRemodelCost = (shipMasterId, fromLevel, toLevel, $ships, remoteMaterials = undefined) => {
  return getShipRemodelDetail(shipMasterId, fromLevel, toLevel, $ships, remoteMaterials).totalCost
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
    const isMaterialItem = itemId === '1' || itemId === '2' || itemId === '3' || itemId === '4'
    const available = isMaterialItem
      ? (resourcesArr[RESOURCE_INDEX[{
          '1': 'bucket',
          '2': 'buildkit',
          '3': 'devmat',
          '4': 'screw',
        }[itemId]]] || 0)
      : _.get(useitems, [itemId, 'api_count'], 0)
    shortages.consumable[itemId] = calcShortage(required, available)
  })

  Object.entries(totalCost.equipment || {}).forEach(([equipId, required]) => {
    const available = _.get(equips, [equipId, 'length'], 0)
    shortages.equipment[equipId] = calcShortage(required, available)
  })

  return shortages
}
