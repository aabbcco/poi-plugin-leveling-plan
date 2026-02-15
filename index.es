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

// Initialize auto-complete observer when plugin loads
// Import and initialize in next tick to ensure POI is ready
if (typeof setImmediate === 'function') {
  setImmediate(() => {
    try {
      const { initAutoCompleteObserver } = require('./services/auto-complete-observer')
      initAutoCompleteObserver()
    } catch (error) {
      console.error('[LevelingPlan] Failed to load auto-complete observer:', error)
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
  }, 0)
}
