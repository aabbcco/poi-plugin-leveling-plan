const { describe, it, beforeEach, afterEach } = require('node:test')
const assert = require('node:assert/strict')
const { resetWindow, loadDist, clearDistCache } = require('./test-helper')

describe('services/auto-complete-observer', () => {
  beforeEach(() => {
    clearDistCache()
    resetWindow()
  })

  it('builds ship level map and completes plans only when level increases to >= targetLevel', () => {
    const {
      createShipLevelMap,
      handleShipLevelChange,
    } = loadDist('services/auto-complete-observer')
    const { KEY_PLANS } = loadDist('utils/config-helper')

    assert.deepEqual(createShipLevelMap({
      10: { api_lv: 20 },
      11: { api_lv: 50 },
      12: {},
    }), { 10: 20, 11: 50 })
    assert.deepEqual(createShipLevelMap(null), {})

    window.config.set(KEY_PLANS, {
      p1: { id: 'p1', shipId: 10, targetLevel: 20, completed: false },
      p2: { id: 'p2', shipId: 11, targetLevel: 60, completed: false },
    })
    window._reduxStoreState.info = {
      ships: {
        10: { api_id: 10, api_ship_id: 201, api_lv: 20 },
        11: { api_id: 11, api_ship_id: 12, api_lv: 55 },
      },
    }
    window._reduxStoreState.const = {
      $ships: { 201: { api_name: '吹雪改' } },
    }

    // Initial load (empty previous map) should do nothing
    handleShipLevelChange(null, { 10: 20, 11: 55 }, {})
    assert.equal(window.config.get(KEY_PLANS).p1.completed, false)

    // New ship appearing or level decreasing should not trigger completion
    handleShipLevelChange(null, { 10: 20, 11: 55, 12: 99 }, { 10: 20, 11: 56 })
    assert.equal(window.config.get(KEY_PLANS).p1.completed, false)

    // Level increase triggers completion for p1 (20 >= 20), not p2 (55 < 60)
    handleShipLevelChange(null, { 10: 20, 11: 55 }, { 10: 19, 11: 54 })
    assert.equal(window.config.get(KEY_PLANS).p1.completed, true)
    assert.equal(window.config.get(KEY_PLANS).p2.completed, false)
    assert.equal(window._notifications.length, 1)
    assert.match(window._notifications[0].message, /吹雪改/)
  })

  it('memoizes selector on store updates and supports unsubscribe', () => {
    const { initAutoCompleteObserver } = loadDist('services/auto-complete-observer')
    const { KEY_PLANS } = loadDist('utils/config-helper')

    const initialShips = { 10: { api_id: 10, api_ship_id: 11, api_lv: 19 } }
    let state = { info: { ships: initialShips }, unrelated: 0 }
    const subscribers = new Set()
    const fakeStore = {
      getState: () => state,
      dispatch: () => {},
      subscribe: fn => {
        subscribers.add(fn)
        return () => subscribers.delete(fn)
      },
    }
    const notifyStore = () => subscribers.forEach(fn => fn())

    window.config.set(KEY_PLANS, {
      p1: { id: 'p1', shipId: 10, targetLevel: 20, completed: false },
    })
    window._reduxStoreState.info = state.info
    window._reduxStoreState.const = { $ships: { 11: { api_name: '吹雪' } } }

    const unsubscribe = initAutoCompleteObserver(fakeStore)
    assert.equal(typeof unsubscribe, 'function')

    // Prime observer initial state
    notifyStore()
    // Unrelated update (same ships reference) should not complete
    state = { ...state, unrelated: 1 }
    notifyStore()
    assert.equal(window.config.get(KEY_PLANS).p1.completed, false)

    // Ship levels up to 20 -> auto-completes
    state = { ...state, info: { ships: { 10: { api_id: 10, api_ship_id: 11, api_lv: 20 } } } }
    window._reduxStoreState.info = state.info
    notifyStore()
    assert.equal(window.config.get(KEY_PLANS).p1.completed, true)

    // After unsubscribe, subsequent level ups should not trigger
    unsubscribe()
    assert.equal(subscribers.size, 0)
  })
})

describe('services/battle-observer', () => {
  beforeEach(() => {
    clearDistCache()
    resetWindow()
  })

  it('records map base EXP between map start and port return, and stops after cleanup', () => {
    const { initBattleObserver, stopBattleObserver } = loadDist('services/battle-observer')
    const { KEY_STATS } = loadDist('utils/config-helper')

    initBattleObserver()

    // Enter map 7-4
    window.dispatchEvent('game.response', {
      detail: { path: '/kcsapi/api_req_map/start', body: { api_maparea_id: 7, api_mapinfo_no: 4 } },
    })
    // Unrelated path containing "port" substring must NOT clear currentMapId
    window.dispatchEvent('game.response', {
      detail: { path: '/kcsapi/api_req_support/dummy', body: {} },
    })
    window.dispatchEvent('game.response', {
      detail: { path: '/kcsapi/api_req_sortie/battleresult', body: { api_get_base_exp: 200 } },
    })
    window.dispatchEvent('game.response', {
      detail: { path: '/kcsapi/api_req_combined_battle/battleresult', body: { api_get_base_exp: 240 } },
    })
    // Practice battle result must be ignored
    window.dispatchEvent('game.response', {
      detail: { path: '/kcsapi/api_req_practice/battle_result', body: { api_get_base_exp: 999 } },
    })
    assert.deepEqual(window.config.get(KEY_STATS)['74'], { count: 2, average: 220 })

    // Event map (worldId > 7) must NOT be recorded and clears currentMapId
    window.dispatchEvent('game.response', {
      detail: { path: '/kcsapi/api_req_map/start', body: { api_maparea_id: 59, api_mapinfo_no: 1 } },
    })
    window.dispatchEvent('game.response', {
      detail: { path: '/kcsapi/api_req_sortie/battleresult', body: { api_get_base_exp: 500 } },
    })
    assert.equal(window.config.get(KEY_STATS)['591'], undefined)
    assert.deepEqual(window.config.get(KEY_STATS)['74'], { count: 2, average: 220 })

    // Return to port clears currentMapId
    window.dispatchEvent('game.response', {
      detail: { path: '/kcsapi/api_req_map/start', body: { api_maparea_id: 7, api_mapinfo_no: 4 } },
    })
    window.dispatchEvent('game.response', {
      detail: { path: '/kcsapi/api_port/port', body: {} },
    })
    window.dispatchEvent('game.response', {
      detail: { path: '/kcsapi/api_req_sortie/battleresult', body: { api_get_base_exp: 999 } },
    })
    assert.deepEqual(window.config.get(KEY_STATS)['74'], { count: 2, average: 220 })

    // Stopping observer prevents further recording
    stopBattleObserver()
    window.dispatchEvent('game.response', {
      detail: { path: '/kcsapi/api_req_map/start', body: { api_maparea_id: 7, api_mapinfo_no: 4 } },
    })
    window.dispatchEvent('game.response', {
      detail: { path: '/kcsapi/api_req_sortie/battleresult', body: { api_get_base_exp: 300 } },
    })
    assert.deepEqual(window.config.get(KEY_STATS)['74'], { count: 2, average: 220 })
  })
})

describe('services/sync-service', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    clearDistCache()
    resetWindow()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('downloads updated equip/kaisou data and skips unchanged payloads', async () => {
    const fetchedUrls = []
    global.fetch = async url => {
      fetchedUrls.push(url)
      if (url.endsWith('/index.json')) {
        return {
          ok: true,
          json: async () => ({
            updated_at: '2026-09-20T00:00:00Z',
            equip_count: 120,
            ship_entry_count: 450,
            kaisou_count: 300,
          }),
        }
      }
      if (url.endsWith('/initial_equip_ships.json')) {
        return { ok: true, json: async () => ({ 1: [{ name: '吹雪', level: 1 }] }) }
      }
      if (url.endsWith('/kaisou_materials.json')) {
        return { ok: true, json: async () => ({ 11: { ammo: 100, steel: 100, consumable: [], equipment: [] } }) }
      }
      return { ok: false, status: 404 }
    }

    const { manualEquipSync, manualKaisouSync } = loadDist('services/sync-service')

    const res1 = await manualEquipSync()
    assert.equal(res1.success, true)
    assert.equal(res1.unchanged, false)
    assert.equal(window.config.get('plugin.poi-plugin-leveling-plan.equipSyncMeta').equip_count, 120)

    // Second call should see unchanged meta and NOT fetch initial_equip_ships.json again
    fetchedUrls.length = 0
    const res2 = await manualEquipSync()
    assert.equal(res2.success, true)
    assert.equal(res2.unchanged, true)
    assert.equal(fetchedUrls.length, 1)

    const kaisouRes = await manualKaisouSync()
    assert.equal(kaisouRes.success, true)
    assert.equal(kaisouRes.unchanged, false)
    assert.equal(window.config.get('plugin.poi-plugin-leveling-plan.kaisouMeta').kaisou_count, 300)
  })

  it('deduplicates concurrent index.json fetches on parallel startup init', async () => {
    let indexFetchCount = 0
    global.fetch = async url => {
      if (url.endsWith('/index.json')) {
        indexFetchCount++
        await new Promise(resolve => setTimeout(resolve, 10))
        return {
          ok: true,
          json: async () => ({
            updated_at: '2026-09-20T00:00:00Z',
            equip_count: 10,
            ship_entry_count: 20,
            kaisou_count: 30,
          }),
        }
      }
      if (url.endsWith('/initial_equip_ships.json')) {
        return { ok: true, json: async () => ({ 1: [{ name: '吹雪', level: 1 }] }) }
      }
      if (url.endsWith('/kaisou_materials.json')) {
        return { ok: true, json: async () => ({ 11: { ammo: 100, steel: 100, consumable: [], equipment: [] } }) }
      }
      return { ok: false, status: 404 }
    }

    const { initEquipSync, initKaisouSync, manualEquipSync } = loadDist('services/sync-service')
    await Promise.all([initEquipSync(), initKaisouSync()])
    assert.equal(indexFetchCount, 1, 'concurrent startup syncs should share one index.json request')

    // Subsequent manual sync must trigger a fresh index.json fetch
    await manualEquipSync()
    assert.equal(indexFetchCount, 2)
  })

  it('handles HTTP/network errors cleanly', async () => {
    global.fetch = async () => ({ ok: false, status: 503 })
    const { manualEquipSync, initEquipSync } = loadDist('services/sync-service')

    const res = await manualEquipSync()
    assert.equal(res.success, false)
    assert.match(res.error, /503/)

    // Silent background init must not throw
    await assert.doesNotReject(() => initEquipSync())
  })
})
