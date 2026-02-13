import { EXP_BY_POI_DB, expPercent } from './constants'

/**
 * 计算单次战斗获得的经验
 * @param {number} mapBaseExp - 海图基础经验值
 * @param {number} rank - 战斗结果等级 (0=S, 1=A, 2=B, 3=C, 4=D)
 * @param {boolean} isFlagship - 是否旗舰位置
 * @param {boolean} isMVP - 是否获得MVP
 * @returns {number} 获得的经验值
 */
export const calcBattleExp = (mapBaseExp, rank = 0, isFlagship = false, isMVP = false) => {
  if (!mapBaseExp || mapBaseExp <= 0) return 0

  // 基础经验 = 海图经验 × 战斗结果加成
  let exp = mapBaseExp * (expPercent[rank] || 1.0)

  // 旗舰加成 1.5倍
  if (isFlagship) {
    exp *= 1.5
  }

  // MVP加成 2倍
  if (isMVP) {
    exp *= 2.0
  }

  return Math.floor(exp)
}

/**
 * 计算需要的出击次数
 * @param {number} requiredExp - 需要的经验值
 * @param {number} mapBaseExp - 海图基础经验值
 * @param {number} rank - 战斗结果等级 (0=S, 1=A, 2=B, 3=C, 4=D)
 * @param {boolean} isFlagship - 是否旗舰位置
 * @param {boolean} isMVP - 是否获得MVP
 * @returns {number} 需要的出击次数（向上取整）
 */
export const calcSortiesNeeded = (
  requiredExp,
  mapBaseExp,
  rank = 0,
  isFlagship = false,
  isMVP = false
) => {
  const expPerSortie = calcBattleExp(mapBaseExp, rank, isFlagship, isMVP)
  
  if (expPerSortie <= 0) return 0
  
  return Math.ceil(requiredExp / expPerSortie)
}

/**
 * 获取海图经验值（优先级：个人统计 > Poi DB）
 * @param {string} mapId - 海图ID (如 '11', '53')
 * @param {object} personalStats - 个人统计数据 { '11': { count: 50, average: 35 }, ... }
 * @param {number} minSamples - 最小样本数，低于此数量不使用个人统计（默认30）
 * @returns {object} { exp: number, source: 'personal'|'poi-db', count: number }
 */
export const getMapExp = (mapId, personalStats = {}, minSamples = 30) => {
  const personalStat = personalStats[mapId]
  const poiDbExp = EXP_BY_POI_DB[mapId] || 0

  // 如果个人统计样本数足够，使用个人统计
  if (personalStat && personalStat.count >= minSamples) {
    return {
      exp: Math.floor(personalStat.average),
      source: 'personal',
      count: personalStat.count,
    }
  }

  // 否则使用 Poi DB 数据
  return {
    exp: poiDbExp,
    source: 'poi-db',
    count: personalStat ? personalStat.count : 0,
  }
}

/**
 * 批量获取多个海图的经验值
 * @param {array} mapIds - 海图ID数组
 * @param {object} personalStats - 个人统计数据
 * @param {number} minSamples - 最小样本数
 * @returns {object} { '11': { exp: 35, source: 'personal', count: 50 }, ... }
 */
export const getMapExpBatch = (mapIds, personalStats = {}, minSamples = 30) => {
  return mapIds.reduce((result, mapId) => {
    result[mapId] = getMapExp(mapId, personalStats, minSamples)
    return result
  }, {})
}

/**
 * 计算从当前等级到目标等级所需的经验值
 * @param {number} currentLv - 当前等级
 * @param {number} currentExp - 当前累计经验
 * @param {number} targetLv - 目标等级
 * @param {object} expTable - 等级经验表
 * @returns {number} 还需要的经验值
 */
export const calcExpToLevel = (currentLv, currentExp, targetLv, expTable) => {
  if (targetLv <= currentLv) return 0

  const targetLevelTotalExp = expTable[targetLv] || 0

  // 还需要的经验 = 目标等级总经验 - 当前累计经验
  return targetLevelTotalExp - currentExp
}

/**
 * 计算练级计划（从当前等级到目标等级，在指定海图练级）
 * @param {number} currentLv - 当前等级
 * @param {number} currentExp - 当前累计经验
 * @param {number} targetLv - 目标等级
 * @param {string} mapId - 海图ID
 * @param {object} expTable - 等级经验表
 * @param {object} personalStats - 个人统计数据
 * @param {object} options - 计算选项 { rank, isFlagship, isMVP, minSamples }
 * @returns {object} 练级计划详情
 */
export const calcLevelingPlan = (
  currentLv,
  currentExp,
  targetLv,
  mapId,
  expTable,
  personalStats = {},
  options = {}
) => {
  const {
    rank = 0, // 默认S胜
    isFlagship = true, // 默认旗舰
    isMVP = false, // 默认不考虑MVP
    minSamples = 30,
  } = options

  // 计算需要的经验
  const requiredExp = calcExpToLevel(currentLv, currentExp, targetLv, expTable)

  // 获取海图经验
  const mapExpData = getMapExp(mapId, personalStats, minSamples)

  // 计算单次获得的经验
  const expPerSortie = calcBattleExp(mapExpData.exp, rank, isFlagship, isMVP)

  // 计算需要的出击次数
  const sortiesNeeded = calcSortiesNeeded(requiredExp, mapExpData.exp, rank, isFlagship, isMVP)

  return {
    currentLv,
    currentExp,
    targetLv,
    requiredExp,
    mapId,
    mapExp: mapExpData.exp,
    mapExpSource: mapExpData.source,
    mapExpCount: mapExpData.count,
    expPerSortie,
    sortiesNeeded,
    conditions: {
      rank,
      isFlagship,
      isMVP,
    },
  }
}
