const { describe, it, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const { resetWindow, mockModule, loadDist } = require('./test-helper')

resetWindow()

// Mock poi host selectors before loading utils/selectors
mockModule('views/utils/selectors', {
  constSelector: state => state.const || {},
  shipsSelector: state => state.info?.ships || {},
})

const { getFarmingMap, composeEquipmentList } = loadDist('utils/equip-provider')
const {
  remodelIndexSelector,
  uniqueShipIdsSelector,
  shipUniqueMapSelector,
  allPlanDetailsSelector,
  activePlanDetailsSelector,
  completedPlanDetailsSelector,
  remodelCostsSummarySelector,
  farmingPlanDetailsSelector,
  equipFarmingMapSelector,
  equipSyncMetaSelector,
  kaisouSyncMetaSelector,
  kaisouMaterialsSelector,
} = loadDist('utils/selectors')
const { exp } = loadDist('utils/constants')

const $ships = {
  11: { api_id: 11, api_name: '吹雪', api_aftershipid: '201', api_afterlv: 20, api_stype: 2 },
  201: { api_id: 201, api_name: '吹雪改', api_aftershipid: '426', api_afterlv: 70, api_stype: 2 },
  426: { api_id: 426, api_name: '吹雪改二', api_aftershipid: '0', api_afterlv: 0, api_stype: 2 },
  12: { api_id: 12, api_name: '白雪', api_aftershipid: '202', api_afterlv: 20, api_stype: 2 },
  202: { api_id: 202, api_name: '白雪改', api_aftershipid: '0', api_afterlv: 0, api_stype: 2 },
  // 宗谷纯三元循环改造链
  699: { api_id: 699, api_name: '宗谷', api_aftershipid: '645', api_afterlv: 60, api_stype: 22 },
  645: { api_id: 645, api_name: '宗谷', api_aftershipid: '650', api_afterlv: 60, api_stype: 22 },
  650: { api_id: 650, api_name: '宗谷', api_aftershipid: '699', api_afterlv: 60, api_stype: 22 },
  // 改名再改回：雪風(20) -> 雪風改(228) -> 丹陽(651) -> 雪風改二(656)
  20: { api_id: 20, api_name: '雪風', api_aftershipid: '228', api_afterlv: 20, api_stype: 2 },
  228: { api_id: 228, api_name: '雪風改', api_aftershipid: '651', api_afterlv: 71, api_stype: 2 },
  651: { api_id: 651, api_name: '丹陽', api_aftershipid: '656', api_afterlv: 88, api_stype: 2 },
  656: { api_id: 656, api_name: '雪風改二', api_aftershipid: '0', api_afterlv: 0, api_stype: 2 },
  // 双前驱乱序循环入口：900/901 先于尾巴 9500 被遍历
  900: { api_id: 900, api_name: 'LoopEntryA', api_aftershipid: '901', api_afterlv: 80, api_stype: 11 },
  901: { api_id: 901, api_name: 'LoopEntryB', api_aftershipid: '900', api_afterlv: 80, api_stype: 18 },
  9500: { api_id: 9500, api_name: 'TailBase', api_aftershipid: '900', api_afterlv: 50, api_stype: 11 },
}

const $equipments = {
  101: { api_id: 101, api_name: '12.7cm連装砲', api_type: [0, 0, 1, 1] },
  202: { api_id: 202, api_name: '94式高射装置', api_type: [0, 0, 36, 30] },
}

const $equipTypes = {
  1: { api_id: 1, api_name: '小口径主砲' },
  36: { api_id: 36, api_name: '高射装置' },
}

describe('equip-provider', () => {
  beforeEach(() => {
    resetWindow()
  })

  it('maps remodeled equipment providers back to root ship and invalidates cache on syncedData change', () => {
    const dataV1 = {
      202: [{ name: '吹雪改二', level: 70 }],
    }
    const map1 = getFarmingMap($ships, dataV1)
    assert.equal(map1[11].baseId, 11)
    assert.deepEqual(map1[11].provides, [{ equipId: 202, providerId: 426, level: 70 }])

    const dataV2 = {
      101: [
        { name: '吹雪改', level: 20 },
        { name: '白雪改', level: 20 },
      ],
      202: [{ name: '吹雪改二', level: 70 }],
      49: [{ name: '宗谷', level: 1 }],
      301: [{ name: '丹陽', level: 71 }, { name: '雪風改二', level: 88 }],
      302: [{ name: 'LoopEntryB', level: 80 }],
    }
    const map2 = getFarmingMap($ships, dataV2)
    assert.equal(map2[11].provides.length, 2)
    assert.equal(map2[12].provides.length, 1)
    // 宗谷纯循环也映射到唯一规范根 645
    assert.equal(map2[645].baseId, 645)
    assert.equal(map2[645].provides[0].equipId, 49)
    // 丹陽与雪風改二均正确归并到基础舰 雪風(20)
    assert.equal(map2[20].baseId, 20)
    assert.deepEqual(map2[20].provides.map(p => p.providerId), [651, 656])
    // 双前驱乱序循环中的 LoopEntryB(901) 正确追溯回尾巴起点 TailBase(9500)
    assert.equal(map2[9500].baseId, 9500)
    assert.equal(map2[9500].provides[0].providerId, 901)

    const list = composeEquipmentList(map2, $ships, $equipments, $equipTypes)
    assert.equal(list.length, 5)
    const eq101 = list.find(e => e.id === 101)
    const eq202 = list.find(e => e.id === 202)
    assert.equal(eq101.ships.length, 2)
    assert.equal(eq202.ships[0].shipName, '吹雪')
    assert.equal(eq202.ships[0].providerName, '吹雪改二')
  })
})

describe('selectors', () => {
  beforeEach(() => {
    resetWindow()
  })

  function makeState(overrides = {}) {
    return {
      const: {
        $ships,
        $equips: $equipments,
        $equipTypes,
      },
      info: {
        ships: {
          1001: { api_id: 1001, api_ship_id: 201, api_lv: 30, api_exp: [exp[30], 0, 0] },
          1002: { api_id: 1002, api_ship_id: 11, api_lv: 10, api_exp: [exp[10], 0, 0] },
          1003: { api_id: 1003, api_ship_id: 426, api_lv: 80, api_exp: [exp[80], 0, 0] },
          1004: { api_id: 1004, api_ship_id: 12, api_lv: 5, api_exp: [exp[5], 0, 0] },
        },
      },
      config: {
        plugin: {
          'poi-plugin-leveling-plan': {
            plans: {
              pActive: {
                id: 'pActive',
                type: 'normal',
                shipId: 1001,
                shipMasterId: 11, // stale pre-remodel ID
                startLevel: 1,
                targetLevel: 70,
                maps: ['74'],
                completed: false,
                createdAt: 200,
              },
              pDone: {
                id: 'pDone',
                type: 'normal',
                shipId: 1003,
                shipMasterId: 426,
                startLevel: 70,
                targetLevel: 80,
                maps: ['71'],
                completed: true,
                createdAt: 100,
              },
              pFarm: {
                id: 'pFarm',
                type: 'farming',
                targets: [
                  { shipMasterId: 11, targetLevel: 70 },
                  { shipMasterId: 12, targetLevel: 20 },
                ],
                maps: ['71', '74'],
                createdAt: 300,
              },
            },
            settings: { defaultRank: 0, defaultIsFlagship: true, defaultIsMVP: false },
            stats: {},
            equipSyncMeta: { updated_at: '2026-01-01T00:00:00Z', equip_count: 1 },
            equipShipsData: { 202: [{ name: '吹雪改二', level: 70 }] },
            kaisouMeta: { updated_at: '2026-01-01T00:00:00Z', kaisou_count: 1 },
            kaisouMaterials: { 201: { ammo: 555, steel: 666, consumable: [], equipment: [] } },
          },
        },
      },
      ...overrides,
    }
  }

  it('computes remodel index, unique IDs, and unique-ID mapping including pure cycle Soya', () => {
    const state = makeState()
    const index = remodelIndexSelector(state)
    assert.deepEqual(index.chains['11'], [11, 201, 426])
    assert.deepEqual(uniqueShipIdsSelector(state).sort(), ['11', '12', '20', '645', '9500'])
    const uniqueMap = shipUniqueMapSelector(state)
    assert.equal(uniqueMap[11], '11')
    assert.equal(uniqueMap[201], '11')
    assert.equal(uniqueMap[426], '11')
    assert.equal(uniqueMap[202], '12')
    // 宗谷三种形态全部归入同一个规范起点 '645'
    assert.equal(uniqueMap[699], '645')
    assert.equal(uniqueMap[645], '645')
    assert.equal(uniqueMap[650], '645')
    // 丹陽/雪風改二归入雪風('20')，双前驱循环 900/901 归入尾巴起点('9500')
    assert.equal(uniqueMap[651], '20')
    assert.equal(uniqueMap[656], '20')
    assert.equal(uniqueMap[900], '9500')
    assert.equal(uniqueMap[901], '9500')
  })

  it('resolves live ship form for active plans and separates active/completed', () => {
    const state = makeState()
    const all = allPlanDetailsSelector(state)
    assert.equal(all.length, 2)
    const active = activePlanDetailsSelector(state)
    const completed = completedPlanDetailsSelector(state)
    assert.equal(active.length, 1)
    assert.equal(completed.length, 1)
    // Live form 201 (吹雪改) instead of stale 11 (吹雪)
    assert.equal(active[0].shipMasterId, 201)
    assert.equal(active[0].shipName, '吹雪改')
  })

  it('aggregates farming plan instances across remodel stages and excludes ships >= targetLv', () => {
    const state = makeState()
    const farming = farmingPlanDetailsSelector(state)
    assert.equal(farming.length, 1)
    assert.equal(farming[0].displayTitle, '吹雪+白雪 → Lv.70 / Lv.20')

    // Fubuki family: 3 owned (Lv10 base, Lv30 kai, Lv80 kai2), 2 below Lv70 ordered desc
    const fubukiTarget = farming[0].targets[0]
    assert.equal(fubukiTarget.totalInstancesOwned, 3)
    assert.equal(fubukiTarget.totalInstancesBelowTarget, 2)
    assert.deepEqual(fubukiTarget.instances.map(i => i.currentLv), [30, 10])
  })

  it('reacts immediately when synced equip or kaisou config changes in Redux state', () => {
    const state1 = makeState()
    assert.equal(equipSyncMetaSelector(state1).equip_count, 1)
    assert.equal(kaisouSyncMetaSelector(state1).kaisou_count, 1)
    assert.equal(kaisouMaterialsSelector(state1)[201].ammo, 555)
    assert.equal(equipFarmingMapSelector(state1)[11].provides[0].equipId, 202)

    const state2 = makeState()
    state2.config.plugin['poi-plugin-leveling-plan'].equipShipsData = {
      101: [{ name: '吹雪', level: 1 }],
    }
    assert.equal(equipFarmingMapSelector(state2)[11].provides[0].equipId, 101)
  })

  it('memoizes remodelCostsSummarySelector across resource ticks and skips orphaned plans', () => {
    const state1 = makeState()
    // Add an orphaned plan pointing to a scrapped ship ID
    state1.config.plugin['poi-plugin-leveling-plan'].plans.pOrphan = {
      id: 'pOrphan',
      type: 'normal',
      shipId: 999999,
      shipMasterId: 11,
      startLevel: 1,
      targetLevel: 70,
      maps: ['74'],
      completed: false,
      createdAt: 50,
    }

    const summary1 = remodelCostsSummarySelector(state1)
    assert.equal(summary1.planCosts.length, 1)
    assert.equal(summary1.hasAnyCost, true)
    // Uses live form 201 (吹雪改) with synced kaisouMaterials[201].ammo === 555
    assert.equal(summary1.totalCost.ammo, 555)
    assert.equal(summary1.totalCost.steel, 666)

    // Unrelated resource tick (new info.resources array) must keep exact memoized reference
    const state2 = {
      ...state1,
      info: {
        ...state1.info,
        resources: [1000, 2000, 3000, 4000, 10, 20, 30, 40],
      },
    }
    const summary2 = remodelCostsSummarySelector(state2)
    assert.strictEqual(summary2, summary1)

    // Updating kaisouMaterials invalidates memoization immediately
    const state3 = {
      ...state1,
      config: {
        plugin: {
          'poi-plugin-leveling-plan': {
            ...state1.config.plugin['poi-plugin-leveling-plan'],
            kaisouMaterials: {
              201: { ammo: 888, steel: 999, consumable: [], equipment: [] },
            },
          },
        },
      },
    }
    const summary3 = remodelCostsSummarySelector(state3)
    assert.notStrictEqual(summary3, summary1)
    assert.equal(summary3.totalCost.ammo, 888)
  })
})
