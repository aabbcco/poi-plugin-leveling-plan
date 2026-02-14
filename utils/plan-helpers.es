import { exp as expTable } from './constants'
import { calcExpToLevel, calcBattleExp, calcSortiesNeeded, getMapExp } from './exp-calculator'

/**
 * 生成唯一的计划ID
 * @returns {string} 唯一ID
 */
export const generatePlanId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 验证计划数据
 * @param {object} plan - 计划对象
 * @param {object} ship - 舰娘数据（可选，用于验证目标等级）
 * @returns {object} { valid: boolean, errors: array }
 */
export const validatePlan = (plan, ship = null) => {
  const errors = []

  if (!plan.shipId) {
    errors.push('shipId is required')
  }

  if (!plan.shipMasterId) {
    errors.push('shipMasterId is required')
  }

  if (!plan.targetLevel || plan.targetLevel < 1 || plan.targetLevel > 185) {
    errors.push('targetLevel must be between 1 and 185')
  }

  if (ship && plan.targetLevel <= ship.api_lv) {
    errors.push('targetLevel must be greater than current level')
  }

  if (!plan.maps || !Array.isArray(plan.maps) || plan.maps.length === 0) {
    errors.push('maps array cannot be empty')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * 计算计划详情（包括每个海图的出击次数）
 * @param {object} plan - 计划对象
 * @param {object} ship - 舰娘数据 (api_id, api_lv, api_exp)
 * @param {object} $ship - 舰娘图鉴数据 (api_name等)
 * @param {object} personalStats - 个人统计数据
 * @param {object} settings - 计算设置 { defaultRank, defaultIsFlagship, defaultIsMVP }
 * @returns {object} 计划详情
 */
export const calcPlanDetail = (plan, ship, $ship, personalStats = {}, settings = {}) => {
  // 严格的空值检查
  if (!plan || !ship || !$ship) {
    console.warn('[LevelingPlan] calcPlanDetail: Missing required data', { plan: !!plan, ship: !!ship, $ship: !!$ship })
    return null
  }

  // 检查必要的数据字段
  if (!ship.api_lv || !ship.api_exp || !Array.isArray(ship.api_exp)) {
    console.warn('[LevelingPlan] calcPlanDetail: Invalid ship data', ship)
    return null
  }

  const {
    defaultRank = 0,
    defaultIsFlagship = true,
    defaultIsMVP = false,
  } = settings

  try {
    // 基础信息
    const currentLv = ship.api_lv
    const startLv = plan.startLevel==undefined?ship.api_lv:plan.startLevel
    const currentExp = ship.api_exp[0] // 累计经验
    const targetLv = plan.targetLevel

    // 计算需要的经验
    const requiredExp = calcExpToLevel(currentLv, currentExp, targetLv, expTable)

    // 计算进度百分比
    const targetTotalExp = expTable[targetLv] || 0
    const startExp = expTable[startLv] || 0
    const progress = targetTotalExp > startExp 
      ? Math.min(100.0, 100.0*((currentExp - startExp) / (targetTotalExp - startExp)))
      : 100.0

    // 计算每个海图的详情
    const mapDetails = (plan.maps || []).map(mapId => {
      const mapExpData = getMapExp(mapId, personalStats, 30)
      const expPerSortie = calcBattleExp(mapExpData.exp, defaultRank, defaultIsFlagship, defaultIsMVP)
      const sortiesNeeded = calcSortiesNeeded(requiredExp, mapExpData.exp, defaultRank, defaultIsFlagship, defaultIsMVP)

      return {
        mapId,
        mapName: formatMapName(mapId),
        mapExp: mapExpData.exp,
        mapExpSource: mapExpData.source,
        mapExpCount: mapExpData.count,
        expPerSortie,
        sortiesNeeded,
      }
    })

    return {
      id: plan.id,
      shipId: plan.shipId,
      shipMasterId: plan.shipMasterId,
      shipName: $ship.api_name || '',
      startLv,
      currentLv,
      currentExp,
      targetLv,
      targetTotalExp,
      requiredExp,
      progress: progress,
      mapDetails,
      notes: plan.notes || '',
      completed: plan.completed || false,
      completedAt: plan.completedAt || null,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    }
  } catch (error) {
    console.error('[LevelingPlan] calcPlanDetail: Error calculating plan detail', error, { plan, ship, $ship })
    return null
  }
}

/**
 * 检查计划是否应该自动完成
 * @param {object} plan - 计划对象
 * @param {object} ship - 舰娘数据
 * @returns {boolean} 是否应该完成
 */
export const shouldAutoComplete = (plan, ship) => {
  if (!plan || !ship) return false
  if (plan.completed) return false
  return ship.api_lv >= plan.targetLevel
}

/**
 * 格式化海图名称
 * @param {string} mapId - 海图ID (如 '53')
 * @returns {string} 格式化后的名称 (如 '5-3')
 */
export const formatMapName = (mapId) => {
  if (!mapId || typeof mapId !== 'string') return ''
  
  // '53' -> '5-3'
  if (mapId.length === 2) {
    return `${mapId[0]}-${mapId[1]}`
  }
  
  // '11' -> '1-1'
  if (mapId.length === 2) {
    return `${mapId[0]}-${mapId[1]}`
  }
  
  return mapId
}

/**
 * 创建新计划对象
 * @param {number} shipId - 舰娘实例ID
 * @param {number} shipMasterId - 舰娘图鉴ID
 * @param {number} targetLevel - 目标等级
 * @param {array} maps - 海图ID数组
 * @param {string} notes - 备注
 * @returns {object} 新计划对象
 */
export const createPlan = (shipId, shipMasterId,startLevel, targetLevel, maps, notes = '') => {
  const now = Date.now()
  
  return {
    id: generatePlanId(),
    shipId,
    shipMasterId,
    startLevel,
    targetLevel,
    maps,
    notes,
    completed: false,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * 更新计划对象
 * @param {object} plan - 原计划对象
 * @param {object} updates - 更新的字段 { targetLevel, maps, notes }
 * @returns {object} 更新后的计划对象
 */
export const updatePlan = (plan, updates) => {
  return {
    ...plan,
    ...updates,
    updatedAt: Date.now(),
  }
}

/**
 * 完成计划
 * @param {object} plan - 计划对象
 * @returns {object} 完成后的计划对象
 */
export const completePlan = (plan) => {
  return {
    ...plan,
    completed: true,
    completedAt: Date.now(),
    updatedAt: Date.now(),
  }
}
