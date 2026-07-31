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

const schedule = typeof setImmediate === 'function' ? setImmediate : fn => setTimeout(fn, 0)

function tryInit(path, fnName, label) {
  try {
    const mod = require(path)
    mod[fnName]()
  } catch (error) {
    console.error(`[LevelingPlan] Failed to load ${label}:`, error)
  }
}

schedule(() => {
  tryInit('./services/auto-complete-observer', 'initAutoCompleteObserver', 'auto-complete observer')
  tryInit('./services/battle-observer', 'initBattleObserver', 'battle observer')
})

schedule(() => {
  tryInit('./services/sync-service', 'initEquipSync', 'equip sync')
  tryInit('./services/sync-service', 'initKaisouSync', 'kaisou sync')
})
