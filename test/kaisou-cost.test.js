const { describe, it, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const { resetWindow, loadDist } = require('./test-helper')

resetWindow()

const {
  RESOURCE_INDEX,
  emptyCost,
  addCost,
  getShipMaterials,
  parseShipMaterials,
  getRemodelChainForShip,
  getRemodelLevelsForShip,
  buildRemodelIndex,
  getShipRemodelDetail,
  getShipRemodelCost,
  calcShortage,
  calcAllShortages,
} = loadDist('utils/kaisou-cost')
const { MAX_LEVEL } = loadDist('utils/constants')

const sample$Ships = {
  // 普通单线三阶段：吹雪(11) -> 吹雪改(201, Lv20) -> 吹雪改二(426, Lv70)
  11: { api_id: 11, api_name: '吹雪', api_aftershipid: '201', api_afterlv: 20 },
  201: { api_id: 201, api_name: '吹雪改', api_aftershipid: '426', api_afterlv: 70 },
  426: { api_id: 426, api_name: '吹雪改二', api_aftershipid: '0', api_afterlv: 0 },

  // 二元可逆循环改造：翔鶴(110) -> 翔鶴改(288) -> 翔鶴改二(461) <-> 翔鶴改二甲(466)
  110: { api_id: 110, api_name: '翔鶴', api_aftershipid: '288', api_afterlv: 30 },
  288: { api_id: 288, api_name: '翔鶴改', api_aftershipid: '461', api_afterlv: 80 },
  461: { api_id: 461, api_name: '翔鶴改二', api_aftershipid: '466', api_afterlv: 88 },
  466: { api_id: 466, api_name: '翔鶴改二甲', api_aftershipid: '461', api_afterlv: 88 },

  // 三元可逆循环改造：加賀(83) -> 加賀改(278) -> 加賀改二(698) -> 加賀改二戊(646) -> 加賀改二護(610) -> 加賀改二(698)
  83: { api_id: 83, api_name: '加賀', api_aftershipid: '278', api_afterlv: 30 },
  278: { api_id: 278, api_name: '加賀改', api_aftershipid: '698', api_afterlv: 82 },
  698: { api_id: 698, api_name: '加賀改二', api_aftershipid: '646', api_afterlv: 84 },
  646: { api_id: 646, api_name: '加賀改二戊', api_aftershipid: '610', api_afterlv: 84 },
  610: { api_id: 610, api_name: '加賀改二護', api_aftershipid: '698', api_afterlv: 82 },

  // 无入口纯三元循环改造：宗谷 特務艦(699) -> 灯台補給船(645) -> 南極観測船(650) -> 特務艦(699)
  699: { api_id: 699, api_name: '宗谷', api_aftershipid: '645', api_afterlv: 60 },
  645: { api_id: 645, api_name: '宗谷', api_aftershipid: '650', api_afterlv: 60 },
  650: { api_id: 650, api_name: '宗谷', api_aftershipid: '699', api_afterlv: 60 },

  // 跨舰种改名 + 不等等级二元可逆循环：大鯨(184) -> 龍鳳(185) -> 龍鳳改(318) -> 龍鳳改二戊(883, Lv88) <-> 龍鳳改二(888, Lv80)
  184: { api_id: 184, api_name: '大鯨', api_aftershipid: '185', api_afterlv: 25 },
  185: { api_id: 185, api_name: '龍鳳', api_aftershipid: '318', api_afterlv: 50 },
  318: { api_id: 318, api_name: '龍鳳改', api_aftershipid: '883', api_afterlv: 80 },
  883: { api_id: 883, api_name: '龍鳳改二戊', api_aftershipid: '888', api_afterlv: 88 },
  888: { api_id: 888, api_name: '龍鳳改二', api_aftershipid: '883', api_afterlv: 80 },

  // 6 形态 5 次改造超长单向链：千歳(102) -> 改(104) -> 甲(106) -> 航(108) -> 航改(291) -> 航改二(296)
  102: { api_id: 102, api_name: '千歳', api_aftershipid: '104', api_afterlv: 10 },
  104: { api_id: 104, api_name: '千歳改', api_aftershipid: '106', api_afterlv: 12 },
  106: { api_id: 106, api_name: '千歳甲', api_aftershipid: '108', api_afterlv: 15 },
  108: { api_id: 108, api_name: '千歳航', api_aftershipid: '291', api_afterlv: 35 },
  291: { api_id: 291, api_name: '千歳航改', api_aftershipid: '296', api_afterlv: 50 },
  296: { api_id: 296, api_name: '千歳航改二', api_aftershipid: '0', api_afterlv: 0 },

  // 改名再改回四阶段单向链：雪風(20) -> 雪風改(228) -> 丹陽(651) -> 雪風改二(656)
  20: { api_id: 20, api_name: '雪風', api_aftershipid: '228', api_afterlv: 20 },
  228: { api_id: 228, api_name: '雪風改', api_aftershipid: '651', api_afterlv: 71 },
  651: { api_id: 651, api_name: '丹陽', api_aftershipid: '656', api_afterlv: 88 },
  656: { api_id: 656, api_name: '雪風改二', api_aftershipid: '0', api_afterlv: 0 },

  // 循环入口双前驱（循环节点 ID 900/901 小于尾巴节点 ID 9500，确保 JS 遍历先访问循环节点）
  900: { api_id: 900, api_name: 'LoopEntryA', api_aftershipid: '901', api_afterlv: 80 },
  901: { api_id: 901, api_name: 'LoopEntryB', api_aftershipid: '900', api_afterlv: 80 },
  9500: { api_id: 9500, api_name: 'TailBase', api_aftershipid: '900', api_afterlv: 50 },

  // 超过 Lv99 才改造的特殊情况（验证不会额外塞入重复 99）
  9001: { api_id: 9001, api_name: 'TestA', api_aftershipid: '9002', api_afterlv: 99 },
  9002: { api_id: 9002, api_name: 'TestB', api_aftershipid: '9003', api_afterlv: 105 },
  9003: { api_id: 9003, api_name: 'TestC', api_aftershipid: '0', api_afterlv: 0 },

  // 无改造舰船
  9999: { api_id: 9999, api_name: 'SingleForm', api_aftershipid: '0', api_afterlv: 0 },
}

const sampleRemoteMaterials = {
  11: { ammo: 100, steel: 100, consumable: [], equipment: [] },
  201: { ammo: 380, steel: 270, consumable: [[58, 1], [3, 20], [2, 5]], equipment: [] },
  110: { ammo: 350, steel: 750, consumable: [], equipment: [] },
  288: { ammo: 1200, steel: 3700, consumable: [[58, 1], [65, 1]], equipment: [] },
  461: { ammo: 1700, steel: 5700, consumable: [[3, 15]], equipment: [] },
  466: { ammo: 1700, steel: 5750, consumable: [[3, 15]], equipment: [] },
  698: { ammo: 1900, steel: 2900, consumable: [[3, 88], [2, 30]], equipment: [] },
  646: { ammo: 2000, steel: 2900, consumable: [[3, 60], [2, 30]], equipment: [] },
  610: { ammo: 1840, steel: 5700, consumable: [[3, 84], [2, 84]], equipment: [] },
  699: { ammo: 0, steel: 380, consumable: [[3, 5], [2, 5]], equipment: [] },
  645: { ammo: 0, steel: 700, consumable: [[3, 20], [2, 10]], equipment: [] },
  650: { ammo: 130, steel: 280, consumable: [[2, 5]], equipment: [] },
}

describe('kaisou-cost: remodel chains & levels', () => {
  beforeEach(() => {
    resetWindow()
  })

  it('traverses linear remodel chains from base or intermediate forms', () => {
    assert.deepEqual(getRemodelChainForShip(11, sample$Ships), [11, 201, 426])
    assert.deepEqual(getRemodelChainForShip('201', sample$Ships), [201, 426])
    assert.deepEqual(getRemodelChainForShip(426, sample$Ships), [426])
    assert.deepEqual(getRemodelChainForShip(9999, sample$Ships), [9999])
  })

  it('handles 2-way and 3-way reversible cycles without repeating nodes', () => {
    assert.deepEqual(getRemodelChainForShip(110, sample$Ships), [110, 288, 461, 466])
    assert.deepEqual(getRemodelChainForShip(461, sample$Ships), [461, 466])
    assert.deepEqual(getRemodelChainForShip('466', sample$Ships), [466, 461])
    assert.deepEqual(getRemodelChainForShip(83, sample$Ships), [83, 278, 698, 646, 610])
    assert.deepEqual(getRemodelChainForShip('610', sample$Ships), [610, 698, 646])
    // 宗谷：无入口纯三元循环，从任一形态出发均覆盖全部三形态且不重复
    assert.deepEqual(getRemodelChainForShip(699, sample$Ships), [699, 645, 650])
    assert.deepEqual(getRemodelChainForShip('645', sample$Ships), [645, 650, 699])
    assert.deepEqual(getRemodelChainForShip(650, sample$Ships), [650, 699, 645])
  })

  it('deduplicates remodel levels for cyclic and high-level chains', () => {
    assert.deepEqual(getRemodelLevelsForShip(11, sample$Ships), [20, 70, 99, MAX_LEVEL])
    assert.deepEqual(getRemodelLevelsForShip(461, sample$Ships), [88, 99, MAX_LEVEL])
    assert.deepEqual(getRemodelLevelsForShip(698, sample$Ships), [84, 99, MAX_LEVEL])
    assert.deepEqual(getRemodelLevelsForShip(699, sample$Ships), [60, 99, MAX_LEVEL])
    assert.deepEqual(getRemodelLevelsForShip(645, sample$Ships), [60, 99, MAX_LEVEL])
    assert.deepEqual(getRemodelLevelsForShip(9001, sample$Ships), [99, 105, MAX_LEVEL])
    assert.deepEqual(getRemodelLevelsForShip(426, sample$Ships), [])
    assert.deepEqual(getRemodelLevelsForShip(123456, sample$Ships), [])
  })

  it('builds complete remodel index (parentMap, chains, uniqueIds) including pure cycles like Soya', () => {
    const index = buildRemodelIndex(sample$Ships)
    assert.equal(index.parentMap[201], 11)
    assert.equal(index.parentMap[426], 201)
    assert.equal(index.parentMap[11], undefined)
    assert.deepEqual(index.chains['461'], [461, 466])
    assert.deepEqual(index.chains['699'], [699, 645, 650])
    assert.ok(index.uniqueIds.includes('11'))
    assert.ok(index.uniqueIds.includes('110'))
    assert.ok(index.uniqueIds.includes('83'))
    assert.ok(index.uniqueIds.includes('9999'))
    assert.ok(!index.uniqueIds.includes('201'))
    assert.ok(!index.uniqueIds.includes('426'))
    // 宗谷纯循环只收录一个规范代表 ID ('645')，不会丢失也不会重复收录
    const soyaUniqueIds = index.uniqueIds.filter(id => ['645', '650', '699'].includes(id))
    assert.deepEqual(soyaUniqueIds, ['645'])
    // 循环入口双前驱（900 先被回边 901 占掉 parentMap）：仍应只收录尾巴起点 '9500'，不误收循环节点
    const dualPredIds = index.uniqueIds.filter(id => ['900', '901', '9500'].includes(id))
    assert.deepEqual(dualPredIds, ['9500'])
    assert.deepEqual(index.chains['9500'], [9500, 900, 901])
    assert.deepEqual(buildRemodelIndex(null), { parentMap: {}, chains: {}, uniqueIds: [] })
  })

  it('handles 6-stage Chitose, rename-and-back Yukikaze/DanYang, and asymmetric-level Ryuuhou chains', () => {
    // 千歳 6 形态 5 改
    assert.deepEqual(getRemodelChainForShip(102, sample$Ships), [102, 104, 106, 108, 291, 296])
    assert.deepEqual(getRemodelLevelsForShip(102, sample$Ships), [10, 12, 15, 35, 50, 99, MAX_LEVEL])
    const chitoseFull = getShipRemodelDetail(102, 1, 50, sample$Ships, null)
    assert.equal(chitoseFull.steps.length, 5)
    assert.equal(chitoseFull.totalCost.ammo, 800)
    assert.equal(chitoseFull.totalCost.steel, 1220)

    // 雪風 -> 雪風改 -> 丹陽 -> 雪風改二（使用内置 kaisou_materials.json 验证）
    assert.deepEqual(getRemodelChainForShip(20, sample$Ships), [20, 228, 651, 656])
    assert.deepEqual(getRemodelLevelsForShip(20, sample$Ships), [20, 71, 88, 99, MAX_LEVEL])
    const yukikazeFull = getShipRemodelDetail(20, 1, 88, sample$Ships, null)
    assert.deepEqual(yukikazeFull.steps.map(s => s.toName), ['雪風改', '丹陽', '雪風改二'])
    assert.equal(yukikazeFull.totalCost.consumable['58'], 3) // 改→丹陽 1张 + 丹陽→改二 2张

    // 大鯨 -> 龍鳳 -> 龍鳳改 -> 龍鳳改二戊(88) <-> 龍鳳改二(80)（不等等级二元循环）
    assert.deepEqual(getRemodelChainForShip(184, sample$Ships), [184, 185, 318, 883, 888])
    assert.deepEqual(getRemodelLevelsForShip(184, sample$Ships), [25, 50, 80, 88, 99, MAX_LEVEL])
    // 龍鳳改二戊(883) Lv.85 -> Lv.90：尚未达到改二等级 88，应计入 883 -> 888
    const ryuuhouToKai2 = getShipRemodelDetail(883, 85, 90, sample$Ships, null)
    assert.equal(ryuuhouToKai2.steps.length, 1)
    assert.equal(ryuuhouToKai2.steps[0].toId, 888)
    assert.equal(ryuuhouToKai2.totalCost.ammo, 980)
    // 龍鳳改二(888) Lv.88 -> Lv.99：已高于回转等级 80，应跳过回转改二戊
    assert.equal(getShipRemodelDetail(888, 88, 99, sample$Ships, null).steps.length, 0)
  })
})

describe('kaisou-cost: remodel cost calculation & shortages', () => {
  beforeEach(() => {
    resetWindow()
  })

  it('calculates remaining remodel steps accurately before and after mid-plan remodel', () => {
    const fromBase = getShipRemodelDetail(11, 1, 70, sample$Ships, sampleRemoteMaterials)
    assert.equal(fromBase.steps.length, 2)
    assert.equal(fromBase.steps[0].level, 20)
    assert.equal(fromBase.steps[1].level, 70)
    assert.equal(fromBase.totalCost.ammo, 480)
    assert.equal(fromBase.totalCost.steel, 370)
    assert.equal(fromBase.totalCost.consumable['58'], 1)
    assert.equal(fromBase.totalCost.consumable['3'], 20)

    // Already remodeled to 吹雪改 (201) at Lv.25 -> should NOT re-count Lv.20 cost
    const afterKai = getShipRemodelDetail(201, 25, 70, sample$Ships, sampleRemoteMaterials)
    assert.equal(afterKai.steps.length, 1)
    assert.equal(afterKai.steps[0].fromId, 201)
    assert.equal(afterKai.totalCost.ammo, 380)
    assert.equal(afterKai.totalCost.steel, 270)
  })

  it('marks delayed remodels (single and multi-stage) as isDelayed and matches getShipRemodelCost', () => {
    // Lv.25 but still base 吹雪 (11)
    const delayedOne = getShipRemodelDetail(11, 25, 70, sample$Ships, sampleRemoteMaterials)
    assert.equal(delayedOne.steps.length, 2)
    assert.equal(delayedOne.steps[0].isDelayed, true)
    assert.equal(delayedOne.steps[1].isDelayed, false)
    assert.deepEqual(
      getShipRemodelCost(11, 25, 70, sample$Ships, sampleRemoteMaterials),
      delayedOne.totalCost
    )

    // Lv.75 but still base 吹雪 (11), leveling to 80 -> both Lv.20 and Lv.70 are delayed
    const delayedTwo = getShipRemodelDetail(11, 75, 80, sample$Ships, sampleRemoteMaterials)
    assert.equal(delayedTwo.steps.length, 2)
    assert.equal(delayedTwo.steps[0].isDelayed, true)
    assert.equal(delayedTwo.steps[1].isDelayed, true)
  })

  it('skips reversible cycle conversions once past remodel level, but includes them when leveling up', () => {
    // 翔鶴改二 (461) Lv.90 -> Lv.99: skip reversible swap to 改二甲
    assert.equal(getShipRemodelDetail(461, 90, 99, sample$Ships, sampleRemoteMaterials).steps.length, 0)
    // 加賀改二護 (610) Lv.90 -> Lv.99: skip 3-way reversible swaps
    assert.equal(getShipRemodelDetail(610, 90, 99, sample$Ships, sampleRemoteMaterials).steps.length, 0)
    // 宗谷 特務艦 (699) Lv.60 -> Lv.99: 已达转换等级，跳过纯循环相互切换消耗
    assert.equal(getShipRemodelDetail(699, 60, 99, sample$Ships, sampleRemoteMaterials).steps.length, 0)
    // 宗谷 特務艦 (699) Lv.1 -> Lv.60: 练级至 60 级解锁灯台/南极形态时计入正向转换消耗
    const soyaTo60 = getShipRemodelDetail(699, 1, 60, sample$Ships, sampleRemoteMaterials)
    assert.deepEqual(soyaTo60.steps.map(s => [s.fromId, s.toId]), [[699, 645], [645, 650]])
    assert.equal(soyaTo60.totalCost.steel, 1080)
    assert.equal(soyaTo60.totalCost.consumable['3'], 25)
    assert.equal(soyaTo60.totalCost.consumable['2'], 15)
    // 翔鶴 (110) Lv.1 -> Lv.88: include all 3 forward remodels up to 改二甲
    const fromBase = getShipRemodelDetail(110, 1, 88, sample$Ships, sampleRemoteMaterials)
    assert.deepEqual(fromBase.steps.map(s => s.level), [30, 80, 88])
  })

  it('returns empty cost when targetLevel <= currentLevel or no further remodels exist', () => {
    assert.deepEqual(getShipRemodelDetail(11, 70, 70, sample$Ships, sampleRemoteMaterials), {
      steps: [],
      totalCost: emptyCost(),
    })
    assert.deepEqual(getShipRemodelDetail(426, 70, 99, sample$Ships, sampleRemoteMaterials), {
      steps: [],
      totalCost: emptyCost(),
    })
  })

  it('prefers passed remoteMaterials over bundled data and falls back cleanly', () => {
    const override = { 11: { ammo: 777, steel: 888, consumable: [[58, 3]], equipment: [] } }
    assert.equal(getShipMaterials(11, override).ammo, 777)
    // Falls back to bundled kaisou_materials.json when key missing in remote
    assert.ok(getShipMaterials(1, override) !== null)
    // Also reads from window.config when remoteMaterials omitted
    window.config.set('plugin.poi-plugin-leveling-plan.kaisouMaterials', override)
    assert.equal(getShipMaterials(11).ammo, 777)
  })

  it('parses materials, sums costs, and computes resource/useitem/equipment shortages', () => {
    const c1 = parseShipMaterials({ ammo: 500, steel: 1000, consumable: [[58, 1], [3, 20]], equipment: [[42, 1]] })
    const c2 = parseShipMaterials({ ammo: 200, steel: 300, consumable: [[58, 2], [2, 10]], equipment: [[42, 2]] })
    const total = addCost(c1, c2)
    assert.equal(total.ammo, 700)
    assert.equal(total.steel, 1300)
    assert.equal(total.consumable['58'], 3)
    assert.equal(total.consumable['3'], 20)
    assert.equal(total.consumable['2'], 10)
    assert.equal(total.equipment['42'], 3)

    const resources = []
    resources[RESOURCE_INDEX.ammo] = 600
    resources[RESOURCE_INDEX.steel] = 2000
    resources[RESOURCE_INDEX.buildkit] = 4
    resources[RESOURCE_INDEX.devmat] = 15

    const shortages = calcAllShortages(
      total,
      resources,
      { 58: { api_count: 1 } },
      { 42: [{}, {}] }
    )
    assert.deepEqual(shortages.ammo, calcShortage(700, 600))
    assert.equal(shortages.ammo.gap, 100)
    assert.equal(shortages.steel.gap, 0)
    assert.equal(shortages.devmat.gap, 5)
    assert.equal(shortages.buildkit.gap, 6)
    assert.equal(shortages.consumable['58'].gap, 2)
    assert.equal(shortages.consumable['3'].gap, 5)
    assert.equal(shortages.equipment['42'].gap, 1)
  })
})
