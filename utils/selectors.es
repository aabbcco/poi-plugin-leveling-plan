import { createSelector } from 'reselect'
import _ from 'lodash'
import {
  constSelector,
  shipsSelector,
} from 'views/utils/selectors'
import { exp } from './constants'
import { getMapExp, calcBattleExp } from './exp-calculator'
import { calcPlanDetail, formatMapName } from './plan-helpers'
import { PLUGIN_KEY, KEY_PLANS, KEY_SETTINGS, KEY_STATS } from './config-helper'
import { getFarmingMap, composeEquipmentList } from './equip-provider'
import { buildRemodelIndex, getShipRemodelDetail, addCost, emptyCost } from './kaisou-cost'

// ============ 1. 基础数据 Selectors ============

// 舰船图鉴数据（静态）
export const $shipsSelector = createSelector(
  [constSelector],
  $const => _.get($const, '$ships', {})
)

// 装备数据
export const $equipmentsSelector = createSelector(
  [constSelector],
  $const => $const.$equips || $const.$equipments || $const.$slotitems || {}
)

// 装备类型数据
export const $equipTypesSelector = createSelector(
  [constSelector],
  $const => $const.$equipTypes || {}
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

// ============ 2. 改造链 Selectors ============

// 全量改造链索引($ships 是稳定引用,索引只构建一次)
export const remodelIndexSelector = createSelector(
  [$shipsSelector],
  $ships => buildRemodelIndex($ships)
)

// 每艘舰船的改造链（从当前舰船开始）
const remodelChainsSelector = createSelector(
  [remodelIndexSelector],
  index => index.chains
)

// 改造链起点舰船ID列表（没有其他舰船改造成它的舰船）
export const uniqueShipIdsSelector = createSelector(
  [remodelIndexSelector],
  index => index.uniqueIds
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

// ============ 3. 个人统计数据 Selectors ============

// 个人统计数据 selector
export const personalStatsSelector = createSelector(
  [state => state.config],
  config => _.get(config, KEY_STATS, {})
)

// ============ 6. 练级计划 Selectors ============

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

// 所有正常计划（非养殖）
export const normalPlansArraySelector = createSelector(
  [plansArraySelector],
  plans => plans.filter(plan => plan.type !== 'farming')
)

// 所有计划的详情（数组）
export const allPlanDetailsSelector = createSelector(
  [normalPlansArraySelector, ourShipsSelector, $shipsSelector, personalStatsSelector, planSettingsSelector],
  (plans, ships, $ships, personalStats, settings) => {
    return plans
      .map(plan => {
        try {
          const ship = ships[plan.shipId]
          if (!ship) {
            console.warn('[LevelingPlan] Ship not found for plan:', plan.id, 'shipId:', plan.shipId)
            return null
          }

          const currentMasterId = ship.api_ship_id || plan.shipMasterId
          const $ship = $ships[currentMasterId] || $ships[plan.shipMasterId]
          if (!$ship) {
            console.warn('[LevelingPlan] Ship master data not found for plan:', plan.id, 'shipMasterId:', currentMasterId)
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

// ============ 8. 养殖计划 Selectors ============

// 船型选择器数据（用于养殖模式的舰船选择器）
export const masterShipMenuDataSelector = createSelector(
  [uniqueShipIdsSelector, $shipsSelector],
  (uniqueIds, $ships) => {
    return _(uniqueIds)
      .map(id => {
        const $ship = $ships[id]
        if (!$ship) return null
        const stype = Number($ship.api_stype)
        if (!stype || stype > 22) return null
        return {
          api_id: Number(id),
          api_name: $ship.api_name,
          api_yomi: $ship.api_yomi || $ship.api_name,
          api_stype: stype,
        }
      })
      .filter(Boolean)
      .sortBy(['api_name'])
      .value()
  }
)

// ============ 4. 装备→舰娘映射 Selectors ============

export const equipShipsDataSelector = createSelector(
  [state => state.config],
  config => _.get(config, `${PLUGIN_KEY}.equipShipsData`, null)
)

export const kaisouMaterialsSelector = createSelector(
  [state => state.config],
  config => _.get(config, `${PLUGIN_KEY}.kaisouMaterials`, null)
)

// 进行中计划的改造消耗汇总（资源变动时不重算改造链）
export const remodelCostsSummarySelector = createSelector(
  [activePlanDetailsSelector, $shipsSelector, kaisouMaterialsSelector],
  (plans, $ships, kaisouMaterials) => {
    const planCosts = (plans || []).map(plan => {
      const costData = getShipRemodelDetail(
        plan.shipMasterId,
        plan.currentLv,
        plan.targetLv,
        $ships,
        kaisouMaterials
      )
      return {
        id: plan.id,
        shipName: plan.shipName,
        currentLv: plan.currentLv,
        targetLv: plan.targetLv,
        ...costData,
      }
    }).filter(pc => pc.steps.length > 0)

    const totalCost = planCosts.reduce((acc, pc) => addCost(acc, pc.totalCost), emptyCost())
    const hasAnyCost = (
      totalCost.ammo > 0 ||
      totalCost.steel > 0 ||
      Object.keys(totalCost.consumable).length > 0
    )

    return { planCosts, totalCost, hasAnyCost }
  }
)

export const equipFarmingMapSelector = createSelector(
  [$shipsSelector, equipShipsDataSelector],
  ($ships, syncedData) => getFarmingMap($ships, syncedData)
)

export const equipListSelector = createSelector(
  [equipFarmingMapSelector, $shipsSelector, $equipmentsSelector, $equipTypesSelector],
  (farmingMap, $ships, $equipments, $equipTypes) =>
    composeEquipmentList(farmingMap, $ships, $equipments, $equipTypes)
)

export const equipSyncMetaSelector = createSelector(
  [state => state.config],
  config => _.get(config, `${PLUGIN_KEY}.equipSyncMeta`, {})
)

export const kaisouSyncMetaSelector = createSelector(
  [state => state.config],
  config => _.get(config, `${PLUGIN_KEY}.kaisouMeta`, {})
)

// ============ 5. 养殖计划 Selectors ============

// 养殖计划（type === 'farming'）
export const farmingPlansSelector = createSelector(
  [plansSelector],
  plans => _(plans)
    .filter(plan => plan.type === 'farming')
    .values()
    .orderBy(['createdAt'], ['desc'])
    .value()
)

// 改造链起点 → 实例列表（倒排索引）
export const instancesByUniqueIdSelector = createSelector(
  [ourShipsSelector, shipUniqueMapSelector],
  (ourShips, shipUniqueMap) => {
    const index = {}
    Object.values(ourShips).forEach(ship => {
      const uniqueId = shipUniqueMap[ship.api_ship_id]
      if (uniqueId === undefined) return
      if (!index[uniqueId]) index[uniqueId] = []
      index[uniqueId].push(ship)
    })
    return index
  }
)

// 养殖计划详情
export const farmingPlanDetailsSelector = createSelector(
  [
    farmingPlansSelector,
    $shipsSelector,
    personalStatsSelector,
    planSettingsSelector,
    instancesByUniqueIdSelector,
  ],
  (plans, $ships, personalStats, settings, instancesByUniqueId) => {
    const {
      defaultRank = 0,
      defaultIsFlagship = true,
      defaultIsMVP = false,
    } = settings

    // 单次执行内缓存海图经验，避免每个实例重复计算
    const mapExpCache = {}
    const getCachedMapExp = mapId => {
      if (!mapExpCache[mapId]) {
        const mapExpData = getMapExp(mapId, personalStats, 30)
        mapExpCache[mapId] = {
          ...mapExpData,
          expPerSortie: calcBattleExp(mapExpData.exp, defaultRank, defaultIsFlagship, defaultIsMVP),
        }
      }
      return mapExpCache[mapId]
    }

    return plans.map(plan => {
      try {
        const targets = plan.targets
          || [{ shipMasterId: plan.shipMasterId, targetLevel: plan.targetLevel }]

        const targetDetails = targets.map(({ shipMasterId, targetLevel }) => {
          const shipUniqueId = shipMasterId
          const $baseShip = $ships[shipUniqueId]
          if (!$baseShip) return null

          const targetLv = targetLevel

          const instances = _(instancesByUniqueId[shipUniqueId] || [])
            .filter(ship => ship.api_lv < targetLv)
            .map(ship => {
              const currentLv = ship.api_lv
              const currentExp = ship.api_exp?.[0] || 0
              const targetTotalExp = exp[targetLv] || 0
              const requiredExp = Math.max(0, targetTotalExp - currentExp)
              const progress = targetTotalExp > 0
                ? Math.min(100.0, 100.0 * (currentExp / targetTotalExp))
                : 0

              const mapDetails = (plan.maps || []).map(mapId => {
                const cached = getCachedMapExp(mapId)
                const sortiesNeeded = cached.expPerSortie > 0
                  ? Math.ceil(requiredExp / cached.expPerSortie)
                  : 0
                return {
                  mapId,
                  mapName: formatMapName(mapId),
                  mapExp: cached.exp,
                  mapExpSource: cached.source,
                  mapExpCount: cached.count,
                  expPerSortie: cached.expPerSortie,
                  sortiesNeeded,
                }
              })

              return {
                shipId: ship.api_id,
                currentLv,
                currentExp,
                requiredExp,
                progress,
                mapDetails,
              }
            })
            .orderBy(['currentLv'], ['desc'])
            .value()

          const totalInstancesOwned = (instancesByUniqueId[shipUniqueId] || []).length

          return {
            shipMasterId,
            shipName: $baseShip.api_name,
            $baseShip,
            targetLv,
            instances,
            totalInstancesOwned,
            totalInstancesBelowTarget: instances.length,
          }
        }).filter(Boolean)

        if (targetDetails.length === 0) return null

        const displayTitle = targetDetails.length === 1
          ? `${targetDetails[0].shipName} → Lv.${targetDetails[0].targetLv}`
          : targetDetails.map(t => t.shipName).join('+')
            + ' → '
            + targetDetails.map(t => `Lv.${t.targetLv}`).join(' / ')

        return {
          id: plan.id,
          type: 'farming',
          displayTitle,
          targets: targetDetails,
          maps: plan.maps,
          createdAt: plan.createdAt,
          updatedAt: plan.updatedAt,
        }
      } catch (error) {
        console.error('[LevelingPlan] Error calculating farming plan detail:', plan.id, error)
        return null
      }
    }).filter(Boolean)
  }
)
