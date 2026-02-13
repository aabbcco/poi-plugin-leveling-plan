const PLUGIN_KEY = 'plugin.poi-plugin-leveling-plan'
const KEY_PLANS = `${PLUGIN_KEY}.plans`
const KEY_SETTINGS = `${PLUGIN_KEY}.settings`
const KEY_STATS = `${PLUGIN_KEY}.stats`

const { config } = window

/**
 * 修改计划数据
 * @param {function} modify - 修改函数，接收旧的 plans 对象，返回新的 plans 对象
 */
export const modifyPlans = (modify) => {
  const oldPlans = config.get(KEY_PLANS, {})
  config.set(KEY_PLANS, modify(oldPlans))
}

/**
 * 修改设置数据
 * @param {function} modify - 修改函数，接收旧的 settings 对象，返回新的 settings 对象
 */
export const modifySettings = (modify) => {
  const oldSettings = config.get(KEY_SETTINGS, {
    defaultRank: 0,
    defaultIsFlagship: true,
    defaultIsMVP: false,
  })
  config.set(KEY_SETTINGS, modify(oldSettings))
}

/**
 * 修改统计数据
 * @param {function} modify - 修改函数，接收旧的 stats 对象，返回新的 stats 对象
 */
export const modifyStats = (modify) => {
  const oldStats = config.get(KEY_STATS, {})
  config.set(KEY_STATS, modify(oldStats))
}

/**
 * 添加计划
 * @param {object} plan - 计划对象
 */
export const addPlan = (plan) => {
  modifyPlans(plans => ({
    ...plans,
    [plan.id]: plan,
  }))
}

/**
 * 更新计划
 * @param {string} planId - 计划ID
 * @param {object} updates - 更新的字段
 */
export const updatePlan = (planId, updates) => {
  modifyPlans(plans => {
    const existingPlan = plans[planId]
    if (!existingPlan) return plans
    
    return {
      ...plans,
      [planId]: {
        ...existingPlan,
        ...updates,
        updatedAt: Date.now(),
      },
    }
  })
}

/**
 * 删除计划
 * @param {string} planId - 计划ID
 */
export const deletePlan = (planId) => {
  try {
    modifyPlans(plans => {
      if (!plans[planId]) {
        console.warn('[LevelingPlan] Plan not found:', planId)
        return plans
      }
      
      const newPlans = { ...plans }
      delete newPlans[planId]
      return newPlans
    })
  } catch (error) {
    console.error('[LevelingPlan] Error in deletePlan:', error)
    throw error
  }
}

/**
 * 完成计划
 * @param {string} planId - 计划ID
 */
export const completePlan = (planId) => {
  modifyPlans(plans => {
    const existingPlan = plans[planId]
    if (!existingPlan) return plans
    
    return {
      ...plans,
      [planId]: {
        ...existingPlan,
        completed: true,
        completedAt: Date.now(),
        updatedAt: Date.now(),
      },
    }
  })
}

/**
 * 更新设置
 * @param {object} settings - 设置对象
 */
export const updateSettings = (settings) => {
  modifySettings(oldSettings => ({
    ...oldSettings,
    ...settings,
  }))
}

/**
 * 记录海图经验数据
 * @param {string} mapId - 海图ID
 * @param {number} baseExp - 基础经验值
 */
export const recordMapExp = (mapId, baseExp) => {
  modifyStats(stats => {
    const currentStat = stats[mapId] || { count: 0, average: 0 }
    const newCount = currentStat.count + 1
    const newAverage = (currentStat.average * currentStat.count + baseExp) / newCount
    
    return {
      ...stats,
      [mapId]: {
        count: newCount,
        average: newAverage,
      },
    }
  })
}

export {
  PLUGIN_KEY,
  KEY_PLANS,
  KEY_SETTINGS,
  KEY_STATS,
}
