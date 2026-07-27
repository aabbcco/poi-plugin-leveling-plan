import { LevelingPlanArea } from './views/leveling-plan-area'

const { config } = window

export const windowMode = true
export const reactClass = LevelingPlanArea
export const windowOptions = {
  x: config.get('poi.window.x', 0),
  y: config.get('poi.window.y', 0),
  width: 820,
  height: 650,
}

// Initialize observers when plugin loads
if (typeof setImmediate === 'function') {
  setImmediate(() => {
    try {
      const { initAutoCompleteObserver } = require('./services/auto-complete-observer')
      initAutoCompleteObserver()
    } catch (error) {
      console.error('[LevelingPlan] Failed to load auto-complete observer:', error)
    }
    try {
      const { initBattleObserver } = require('./services/battle-observer')
      initBattleObserver()
    } catch (error) {
      console.error('[LevelingPlan] Failed to load battle observer:', error)
    }
  })
} else {
  setTimeout(() => {
    try {
      const { initAutoCompleteObserver } = require('./services/auto-complete-observer')
      initAutoCompleteObserver()
    } catch (error) {
      console.error('[LevelingPlan] Failed to load auto-complete observer:', error)
    }
    try {
      const { initBattleObserver } = require('./services/battle-observer')
      initBattleObserver()
    } catch (error) {
      console.error('[LevelingPlan] Failed to load battle observer:', error)
    }
  }, 0)
}

// Initialize remote sync in background
if (typeof setImmediate === 'function') {
  setImmediate(() => {
    try {
      const { initEquipSync } = require('./services/equip-sync-service')
      initEquipSync()
    } catch (error) {
      console.error('[LevelingPlan] Failed to init equip sync:', error)
    }
    try {
      const { initKaisouSync } = require('./services/kaisou-sync-service')
      initKaisouSync()
    } catch (error) {
      console.error('[LevelingPlan] Failed to init kaisou sync:', error)
    }
  })
} else {
  setTimeout(() => {
    try {
      const { initEquipSync } = require('./services/equip-sync-service')
      initEquipSync()
    } catch (error) {
      console.error('[LevelingPlan] Failed to init equip sync:', error)
    }
    try {
      const { initKaisouSync } = require('./services/kaisou-sync-service')
      initKaisouSync()
    } catch (error) {
      console.error('[LevelingPlan] Failed to init kaisou sync:', error)
    }
  }, 0)
}
