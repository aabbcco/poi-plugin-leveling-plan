const { describe, it, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const { resetWindow, loadDist } = require('./test-helper')

resetWindow()

const { exp, MAX_LEVEL, EXP_BY_POI_DB } = loadDist('utils/constants')
const {
  calcBattleExp,
  calcSortiesNeeded,
  getMapExp,
  calcExpToLevel,
} = loadDist('utils/exp-calculator')
const {
  generatePlanId,
  validatePlan,
  calcPlanDetail,
  shouldAutoComplete,
  formatMapName,
  createPlan,
  updatePlan,
} = loadDist('utils/plan-helpers')

describe('exp-calculator', () => {
  it('calculates battle exp with rank, flagship, and MVP multipliers', () => {
    assert.equal(calcBattleExp(0, 0, true, true), 0)
    assert.equal(calcBattleExp(-100, 0, false, false), 0)
    assert.equal(calcBattleExp(220, 0, false, false), 264) // 220 * 1.2
    assert.equal(calcBattleExp(220, 1, false, false), 220) // 220 * 1.0
    assert.equal(calcBattleExp(220, 0, true, false), 396) // 220 * 1.2 * 1.5
    assert.equal(calcBattleExp(220, 0, true, true), 792) // 220 * 1.2 * 1.5 * 2.0
    assert.equal(calcBattleExp(157, 3, false, false), Math.floor(157 * 0.8)) // C rank
    assert.equal(calcBattleExp(157, 4, false, false), Math.floor(157 * 0.7)) // D rank
  })

  it('calculates sorties needed with ceiling and handles zero exp', () => {
    assert.equal(calcSortiesNeeded(1000, 100, 1, false, false), 10)
    assert.equal(calcSortiesNeeded(1001, 100, 1, false, false), 11)
    assert.equal(calcSortiesNeeded(0, 100, 0, true, false), 0)
    assert.equal(calcSortiesNeeded(1000, 0, 0, true, false), 0)
  })

  it('selects personal stats only when sample count >= minSamples and supports 7-3/7-4/7-5', () => {
    assert.ok(EXP_BY_POI_DB[73] > 0)
    assert.ok(EXP_BY_POI_DB[74] > 0)
    assert.ok(EXP_BY_POI_DB[75] > 0)

    const stats = {
      74: { count: 29, average: 250.9 },
      53: { count: 30, average: 412.8 },
    }
    assert.deepEqual(getMapExp('74', stats, 30), {
      exp: EXP_BY_POI_DB[74],
      source: 'poi-db',
      count: 29,
    })
    assert.deepEqual(getMapExp('53', stats, 30), {
      exp: 412,
      source: 'personal',
      count: 30,
    })
  })

  it('computes exp to target level and clamps Lv99 overflow to 0', () => {
    assert.equal(calcExpToLevel(1, 0, 2, exp), 100)
    assert.equal(calcExpToLevel(50, exp[50], 50, exp), 0)
    assert.equal(calcExpToLevel(60, exp[60], 50, exp), 0)
    // Lv99 ship with stored overflow exp already past Lv100 threshold
    assert.equal(calcExpToLevel(99, exp[100] + 5000, 100, exp), 0)
  })
})

describe('plan-helpers', () => {
  it('creates normal, single-ship farming, and multi-target farming plans without notes', () => {
    const id1 = generatePlanId()
    const id2 = generatePlanId()
    assert.notEqual(id1, id2)

    const normal = createPlan(101, 11, 1, 70, ['74'])
    assert.equal(normal.type, 'normal')
    assert.equal(normal.shipId, 101)
    assert.equal(normal.startLevel, 1)
    assert.equal(normal.completed, false)
    assert.equal('notes' in normal, false)

    const farmingSingle = createPlan(null, 11, null, 70, ['71'], 'farming')
    assert.equal(farmingSingle.type, 'farming')
    assert.equal(farmingSingle.shipMasterId, 11)
    assert.equal(farmingSingle.targetLevel, 70)

    const farmingMulti = createPlan(null, null, null, null, ['71'], 'farming', [
      { shipMasterId: 11, targetLevel: 70 },
    ])
    assert.equal(farmingMulti.type, 'farming')
    assert.equal(farmingMulti.targets.length, 1)

    const updated = updatePlan(normal, { targetLevel: 80 })
    assert.equal(updated.targetLevel, 80)
    assert.equal(updated.shipId, 101)
  })

  it('validates normal and farming plans including startLevel bounds', () => {
    const ship = { api_id: 101, api_ship_id: 11, api_lv: 20 }
    assert.equal(validatePlan({ type: 'normal', shipId: 101, shipMasterId: 11, startLevel: 1, targetLevel: 70, maps: ['74'] }, ship).valid, true)
    assert.equal(validatePlan({ type: 'normal', shipId: 101, shipMasterId: 11, startLevel: 0, targetLevel: 70, maps: ['74'] }, ship).valid, false)
    assert.equal(validatePlan({ type: 'normal', shipId: 101, shipMasterId: 11, startLevel: MAX_LEVEL + 1, targetLevel: 70, maps: ['74'] }, ship).valid, false)
    assert.equal(validatePlan({ type: 'normal', shipId: 101, shipMasterId: 11, startLevel: 1, targetLevel: 20, maps: ['74'] }, ship).valid, false)
    assert.equal(validatePlan({ type: 'normal', shipId: 101, shipMasterId: 11, startLevel: 1, targetLevel: 70, maps: [] }, ship).valid, false)

    assert.equal(validatePlan({ type: 'farming', targets: [{ shipMasterId: 11, targetLevel: 70 }], maps: ['71'] }).valid, true)
    assert.equal(validatePlan({ type: 'farming', targets: [], maps: ['71'] }).valid, false)
    assert.equal(validatePlan({ type: 'farming', targets: null, shipMasterId: 11, targetLevel: 70, maps: ['71'] }).valid, true)
  })

  it('calculates plan detail with live shipMasterId, clamped progress, and legacy notes tolerance', () => {
    const legacyPlan = {
      id: 'legacy-1',
      shipId: 101,
      shipMasterId: 11,
      startLevel: 50,
      targetLevel: 70,
      maps: ['74'],
      notes: 'leftover from old version',
      createdAt: 1,
      updatedAt: 1,
    }
    const ship = { api_id: 101, api_ship_id: 201, api_lv: 25, api_exp: [exp[25], 0, 0] }
    const $ship = { api_id: 201, api_name: '吹雪改' }

    const detail = calcPlanDetail(legacyPlan, ship, $ship, {}, {})
    assert.equal(detail.shipMasterId, 201)
    assert.equal(detail.shipName, '吹雪改')
    assert.equal(detail.progress, 0)
    assert.equal('notes' in detail, false)
    assert.equal(detail.mapDetails[0].mapName, '7-4')

    const nanStart = calcPlanDetail({ ...legacyPlan, startLevel: NaN }, ship, $ship, {}, {})
    assert.equal(nanStart.startLv, 25)
  })

  it('checks auto-complete and formats map names', () => {
    assert.equal(shouldAutoComplete({ targetLevel: 70, completed: false }, { api_lv: 69 }), false)
    assert.equal(shouldAutoComplete({ targetLevel: 70, completed: false }, { api_lv: 70 }), true)
    assert.equal(shouldAutoComplete({ targetLevel: 70, completed: true }, { api_lv: 75 }), false)
    assert.equal(formatMapName('74'), '7-4')
    assert.equal(formatMapName('531'), '531')
    assert.equal(formatMapName(''), '')
  })
})

describe('config-helper', () => {
  beforeEach(() => {
    resetWindow()
  })

  it('performs CRUD on plans, settings, and running-average map stats', () => {
    const configHelper = loadDist('utils/config-helper', { fresh: true })
    const plan = { id: 'p1', shipId: 10, shipMasterId: 11, targetLevel: 50, maps: ['71'], completed: false }

    configHelper.addPlan(plan)
    assert.equal(window.config.get(configHelper.KEY_PLANS).p1.targetLevel, 50)

    configHelper.updatePlan('p1', { targetLevel: 70 })
    assert.equal(window.config.get(configHelper.KEY_PLANS).p1.targetLevel, 70)

    configHelper.completePlan('p1')
    assert.equal(window.config.get(configHelper.KEY_PLANS).p1.completed, true)
    assert.ok(window.config.get(configHelper.KEY_PLANS).p1.completedAt > 0)

    configHelper.deletePlan('p1')
    assert.equal(window.config.get(configHelper.KEY_PLANS).p1, undefined)

    configHelper.updateSettings({ defaultIsMVP: true })
    assert.equal(window.config.get(configHelper.KEY_SETTINGS).defaultIsMVP, true)
    assert.equal(window.config.get(configHelper.KEY_SETTINGS).defaultIsFlagship, true)

    configHelper.recordMapExp('74', 200)
    configHelper.recordMapExp('74', 240)
    assert.deepEqual(window.config.get(configHelper.KEY_STATS)['74'], { count: 2, average: 220 })
  })
})
