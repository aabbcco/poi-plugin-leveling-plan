import { createSelector } from 'reselect'
import _ from 'lodash'
import {
  constSelector,
  shipsSelector,
  basicSelector,
  shipDataSelectorFactory,
} from 'views/utils/selectors'
import { exp, MAX_LEVEL, EXP_BY_POI_DB } from './constants'
import { getMapExp, getMapExpBatch } from './exp-calculator'
import { calcPlanDetail } from './plan-helpers'
import { KEY_PLANS, KEY_SETTINGS, KEY_STATS } from './config-helper'

// ============ 1. 基础数据 Selectors ============

// 舰船图鉴数据（静态）
export const $shipsSelector = createSelector(
  [constSelector],
  $const => _.get($const, '$ships', {})
)

// 海图数据
export const $mapsSelector = createSelector(
  [constSelector],
  $const => _.get($const, '$maps', {})
)

// 玩家拥有的舰船（动态）
export const ourShipsSelector = createSelector(
  [shipsSelector],
  ships => {
    // shipsSelector 可能返回数组或对象，统一转换为对象
    if (!ships) return {}
    if (Array.isArray(ships)) {
      // 如果是数组，转换为以 api_id 为 key 的对象
      return _.keyBy(ships, 'api_id')
    }
    return ships
  }
)

// 资源数据（油弹钢铝）
export const resourcesSelector = createSelector(
  [basicSelector],
  basic => {
    if (!basic) {
      return {
        fuel: 0,
        ammo: 0,
        steel: 0,
        bauxite: 0,
      }
    }
    return {
      fuel: basic.api_fuel || 0,
      ammo: basic.api_ammo || 0,
      steel: basic.api_steel || 0,
      bauxite: basic.api_bauxite || 0,
    }
  }
)

// 开发资材
export const materialsSelector = createSelector(
  [basicSelector],
  basic => {
    if (!basic || !basic.api_material) {
      return {
        devmat: 0,
      }
    }
    // api_material 数组: [bucket, devmat, screw, ...]
    return {
      devmat: basic.api_material[1] || 0,
    }
  }
)

// ============ 2. 改造链 Selectors ============

// 改造前置舰船映射（用于找到改造链的起点）
const beforeShipMapSelector = createSelector(
  [$shipsSelector],
  $ships => _($ships)
    .filter(ship => +(ship.api_aftershipid || 0) > 0)
    .map(ship => [ship.api_aftershipid, ship.api_id])
    .fromPairs()
    .value()
)

// 每艘舰船的改造链（从当前舰船开始，可能不完整）
const remodelChainsSelector = createSelector(
  [$shipsSelector],
  $ships => _($ships)
    .mapValues(({ api_id: shipId }) => {
      let current = $ships[shipId]
      if (!current) return [shipId]
      
      let next = +(current.api_aftershipid || 0)
      let chain = [shipId]
      
      // 遍历改造链，直到没有下一个或遇到循环
      while (!chain.includes(next) && next > 0) {
        chain = [...chain, next]
        current = $ships[next] || {}
        next = +(current.api_aftershipid || 0)
      }
      return chain
    })
    .value()
)

// 改造链起点舰船ID列表（没有其他舰船改造成它的舰船）
export const uniqueShipIdsSelector = createSelector(
  [$shipsSelector, beforeShipMapSelector],
  ($ships, beforeShipMap) => _($ships)
    .filter(({ api_id }) => !(api_id in beforeShipMap))
    .map(({ api_id }) => api_id)
    .value()
)

// 舰船ID到改造链起点的映射
export const shipUniqueMapSelector = createSelector(
  [uniqueShipIdsSelector, remodelChainsSelector],
  (uniqueIds, chains) => _(uniqueIds)
    .flatMap(uniqueId =>
      _(chains[uniqueId])
        .map(id => [id, uniqueId])
        .value()
    )
    .fromPairs()
    .value()
)

// 完整的改造链（从起点开始）
export const adjustedRemodelChainsSelector = createSelector(
  [uniqueShipIdsSelector, remodelChainsSelector],
  (uniqueIds, chains) => _(uniqueIds)
    .map(uniqueId => [uniqueId, chains[uniqueId]])
    .fromPairs()
    .value()
)

// 改造等级链（每艘舰船的改造等级列表）
export const remodelLevelSelector = createSelector(
  [$shipsSelector],
  $ships => _($ships)
    .filter(ship => typeof ship.api_aftershipid !== 'undefined')
    .map(ship => {
      let remodelLvs = [ship.api_afterlv || 0]
      let nextShipId = +ship.api_aftershipid
      
      // 遍历改造链，收集所有改造等级
      while (nextShipId !== 0 && $ships[nextShipId]) {
        const nextShip = $ships[nextShipId]
        const nextLv = nextShip.api_afterlv || 0
        
        // 如果下一个改造等级小于等于当前最后一个，说明到达终点
        if (nextLv <= _.last(remodelLvs)) break
        
        remodelLvs = [...remodelLvs, nextLv]
        nextShipId = +_.get($ships, [nextShipId, 'api_aftershipid'], 0)
      }
      
      // 添加99级和最大等级作为练级目标
      const lastLv = _.last(remodelLvs) || 0
      if (lastLv < 100) {
        remodelLvs = [...remodelLvs, 99, MAX_LEVEL]
      } else {
        remodelLvs = [...remodelLvs, MAX_LEVEL]
      }
      
      return [ship.api_id, remodelLvs]
    })
    .fromPairs()
    .value()
)

// ============ 3. 经验数据 Selectors ============

// 等级经验表
export const expTableSelector = () => exp

// 海图经验数据
export const mapExpSelector = () => EXP_BY_POI_DB

// 海图列表（带经验值）
export const mapsWithExpSelector = createSelector(
  [$mapsSelector],
  $maps => _($maps)
    .map(map => {
      const mapId = `${map.api_maparea_id}${map.api_no}`
      return {
        ...map,
        mapId,
        baseExp: EXP_BY_POI_DB[mapId] || 0,
      }
    })
    .value()
)

// ============ 4. 组合数据 Selectors ============

// 舰船完整数据（实例 + 图鉴 + 改造链）
export const shipsWithDetailsSelector = createSelector(
  [ourShipsSelector, $shipsSelector, remodelChainsSelector, remodelLevelSelector],
  (ships, $ships, chains, remodelLvs) => _.map(ships, ship => {
    const $ship = $ships[ship.api_ship_id]
    return {
      ...ship,
      $ship,
      remodelChain: chains[ship.api_ship_id] || [],
      remodelLevels: remodelLvs[ship.api_ship_id] || [],
    }
  })
)

// 按舰船ID分组（统计拥有数量）
export const shipsByIdSelector = createSelector(
  [ourShipsSelector],
  ships => _(ships)
    .groupBy('api_ship_id')
    .value()
)

// 按舰种分组
export const shipsByTypeSelector = createSelector(
  [ourShipsSelector, $shipsSelector],
  (ships, $ships) => _(ships)
    .groupBy(ship => _.get($ships, [ship.api_ship_id, 'api_stype'], 0))
    .value()
)

// ============ 5. 经验计算辅助函数 ============

// 计算从当前等级到目标等级所需经验
export const calcExpToLevel = (currentLv, currentExp, targetLv) => {
  if (targetLv <= currentLv) return 0
  
  const currentLevelTotalExp = exp[currentLv] || 0
  const targetLevelTotalExp = exp[targetLv] || 0
  
  // 当前等级已获得的经验
  const expInCurrentLevel = currentExp - currentLevelTotalExp
  
  // 还需要的经验 = 目标等级总经验 - 当前等级总经验 - 当前等级内已获得的经验
  return targetLevelTotalExp - currentLevelTotalExp - expInCurrentLevel
}

// 计算出击次数（基于海图经验）
export const calcSortieCount = (requiredExp, mapExp, resultMultiplier = 1.0, isFlagship = false, isMVP = false) => {
  if (mapExp <= 0) return 0
  
  let expPerSortie = mapExp * resultMultiplier
  
  // 旗舰加成
  if (isFlagship) {
    expPerSortie *= 1.5
  }
  
  // MVP加成
  if (isMVP) {
    expPerSortie *= 2
  }
  
  return Math.ceil(requiredExp / expPerSortie)
}

// ============ 6. 个人统计数据 Selectors ============

// 个人统计数据 selector
export const personalStatsSelector = createSelector(
  [state => state.config],
  config => _.get(config, KEY_STATS, {})
)

// ============ 7. 练级计划 Selectors ============

// 所有计划（字典）
export const plansSelector = createSelector(
  [state => state.config],
  config => _.get(config, KEY_PLANS, {})
)

// 计划设置
export const planSettingsSelector = createSelector(
  [state => state.config],
  config => _.get(config, KEY_SETTINGS, {
    defaultRank: 0,
    defaultIsFlagship: true,
    defaultIsMVP: false,
  })
)

// 所有计划（数组，按创建时间倒序）
export const plansArraySelector = createSelector(
  [plansSelector],
  plans => _(plans)
    .values()
    .orderBy(['createdAt'], ['desc'])
    .value()
)

// 未完成的计划
export const activePlansSelector = createSelector(
  [plansArraySelector],
  plans => plans.filter(plan => !plan.completed)
)

// 已完成的计划
export const completedPlansSelector = createSelector(
  [plansArraySelector],
  plans => plans.filter(plan => plan.completed)
)

// 根据计划ID获取计划详情（带计算数据）
export const planDetailSelectorFactory = planId => createSelector(
  [plansSelector, ourShipsSelector, $shipsSelector, personalStatsSelector, planSettingsSelector],
  (plans, ships, $ships, personalStats, settings) => {
    const plan = plans[planId]
    if (!plan) return null
    
    // 查找对应的舰娘实例
    const ship = _.find(ships, s => s.api_id === plan.shipId)
    if (!ship) return null
    
    // 查找舰娘图鉴数据
    const $ship = $ships[plan.shipMasterId]
    if (!$ship) return null
    
    return calcPlanDetail(plan, ship, $ship, personalStats, settings)
  }
)

// 根据舰娘ID查找计划
export const planByShipIdSelectorFactory = shipId => createSelector(
  [plansArraySelector],
  plans => plans.find(plan => plan.shipId === shipId && !plan.completed)
)

// 所有计划的详情（数组）
export const allPlanDetailsSelector = createSelector(
  [plansArraySelector, ourShipsSelector, $shipsSelector, personalStatsSelector, planSettingsSelector],
  (plans, ships, $ships, personalStats, settings) => {
    return plans
      .map(plan => {
        try {
          const ship = _.find(ships, s => s.api_id === plan.shipId)
          if (!ship) {
            console.warn('[LevelingPlan] Ship not found for plan:', plan.id, 'shipId:', plan.shipId)
            return null
          }
          
          const $ship = $ships[plan.shipMasterId]
          if (!$ship) {
            console.warn('[LevelingPlan] Ship master data not found for plan:', plan.id, 'shipMasterId:', plan.shipMasterId)
            return null
          }
          
          return calcPlanDetail(plan, ship, $ship, personalStats, settings)
        } catch (error) {
          console.error('[LevelingPlan] Error calculating plan detail for plan:', plan.id, error)
          return null
        }
      })
      .filter(detail => detail !== null)
  }
)

// 未完成计划的详情
export const activePlanDetailsSelector = createSelector(
  [allPlanDetailsSelector],
  details => details.filter(detail => !detail.completed)
)

// 已完成计划的详情
export const completedPlanDetailsSelector = createSelector(
  [allPlanDetailsSelector],
  details => details.filter(detail => detail.completed)
)

// ============ 6. 舰船选择器数据 Selectors ============

// 舰船菜单数据选择器（用于舰船选择器组件）
export const shipMenuDataSelector = createSelector(
  [ourShipsSelector, $shipsSelector],
  (ourShips, $ships) => {
    return _.chain(ourShips)
      .map(ship => {
        const $ship = $ships[ship.api_ship_id]
        if (!$ship) return null
        
        return {
          api_id: ship.api_id,
          api_ship_id: ship.api_ship_id,
          api_lv: ship.api_lv,
          api_exp: ship.api_exp?.[0] || 0,
          api_name: $ship.api_name,
          api_yomi: $ship.api_yomi || $ship.api_name,
          api_stype: $ship.api_stype,
        }
      })
      .filter(Boolean)
      .value()
  }
)


