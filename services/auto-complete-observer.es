/**
 * Auto-complete observer for leveling plans
 * Monitors ship level changes and automatically completes plans when target level is reached
 */

import { observer, observe } from 'redux-observers'
import { completePlan } from '../utils/config-helper'
import { shouldAutoComplete } from '../utils/plan-helpers'

const { __ } = window.i18n['poi-plugin-leveling-plan']

/**
 * Create a map of ship levels for efficient comparison
 * @param {Object} ships - Ships state from Redux
 * @returns {Object} Map of { shipId: level }
 */
function createShipLevelMap(ships) {
  if (!ships || typeof ships !== 'object') return {}
  
  const levelMap = {}
  Object.keys(ships).forEach(shipId => {
    const ship = ships[shipId]
    if (ship && typeof ship.api_lv === 'number') {
      levelMap[shipId] = ship.api_lv
    }
  })
  
  return levelMap
}

/**
 * Check and auto-complete plans for ships that reached target level
 * @param {Array} changedShips - Array of ships with level changes
 */
function checkAndCompletePlans(changedShips) {
  if (!changedShips || changedShips.length === 0) return
  
  // Get all plans from config
  const plans = window.getStore('config.plugin.poi-plugin-leveling-plan.plans') || {}
  
  // Get current ships data for validation
  const ships = window.getStore('info.ships') || {}
  
  changedShips.forEach(({ shipId, oldLv, newLv }) => {
    // Find active plans for this ship
    const activePlans = Object.values(plans).filter(plan => 
      plan.shipId === shipId && 
      !plan.completed
    )
    
    activePlans.forEach(plan => {
      const ship = ships[shipId]
      
      if (!ship) {
        console.warn(`[LevelingPlan] Ship not found for plan ${plan.id}, shipId: ${shipId}`)
        return
      }
      
      // Check if plan should be auto-completed
      if (shouldAutoComplete(plan, ship)) {
        console.log(
          `[LevelingPlan] Auto-completing plan: ${plan.id} ` +
          `(Ship ${shipId}: Lv.${oldLv} → Lv.${newLv} >= Target Lv.${plan.targetLevel})`
        )
        
        // Complete the plan
        try {
          completePlan(plan.id)
          
          // Show notification if available
          if (window.notify && typeof window.notify === 'function') {
            const $ship = window.getStore(`const.$ships.${ship.api_ship_id}`)
            const shipName = $ship ? $ship.api_name : `Ship ${shipId}`
            
            window.notify(
              __('Plan Completed'),
              `${shipName} ${__('has reached')} Lv.${plan.targetLevel}`
            )
          }
        } catch (error) {
          console.error(`[LevelingPlan] Error auto-completing plan ${plan.id}:`, error)
        }
      }
    })
  })
}

/**
 * Observer callback - called when ship level map changes
 * @param {Function} dispatch - Redux dispatch function
 * @param {Object} currentLevelMap - Current ship level map
 * @param {Object} previousLevelMap - Previous ship level map
 */
function handleShipLevelChange(dispatch, currentLevelMap, previousLevelMap) {
  // Skip initial load (no previous state)
  if (!previousLevelMap || Object.keys(previousLevelMap).length === 0) {
    console.log('[LevelingPlan] Observer initialized, skipping initial check')
    return
  }
  
  // Find ships with level changes (only level increases)
  const changedShips = []
  
  Object.keys(currentLevelMap).forEach(shipId => {
    const oldLv = previousLevelMap[shipId]
    const newLv = currentLevelMap[shipId]
    
    // Only process level increases (not decreases or new ships)
    if (oldLv !== undefined && newLv > oldLv) {
      changedShips.push({
        shipId: parseInt(shipId, 10),
        oldLv,
        newLv
      })
    }
  })
  
  if (changedShips.length > 0) {
    console.log(`[LevelingPlan] Detected ${changedShips.length} ship(s) with level changes:`, 
      changedShips.map(s => `Ship ${s.shipId}: Lv.${s.oldLv} → Lv.${s.newLv}`).join(', ')
    )
    
    checkAndCompletePlans(changedShips)
  }
}

/**
 * Create the ship level observer
 */
export const shipLevelObserver = observer(
  // Selector: Extract ship level map
  (state) => createShipLevelMap(state.info?.ships),
  
  // Callback: Handle level changes
  handleShipLevelChange
)

/**
 * Initialize the auto-complete observer
 * Should be called once when plugin loads
 * @param {Object} store - Redux store object (optional, will try to get from window)
 */
export function initAutoCompleteObserver(store = null) {
  try {
    // Try to get store from parameter or find it globally
    let reduxStore = store
    
    if (!reduxStore) {
      // POI doesn't expose the store directly to plugins
      // We need to hook into the dispatch to monitor state changes
      // Or wait for store to be passed in
      console.warn('[LevelingPlan] No store provided, attempting to find Redux store...')
      
      // Check if we can access the store through any global reference
      if (window._reactInternalInstance) {
        // Try to find store through React DevTools
        console.warn('[LevelingPlan] Attempting to access store through React internals')
      }
      
      // Fallback: Try to import it (this might work in POI environment)
      try {
        const createStoreModule = require('views/create-store')
        if (createStoreModule && createStoreModule.store) {
          reduxStore = createStoreModule.store
          console.log('[LevelingPlan] Successfully imported store from views/create-store')
        }
      } catch (requireError) {
        console.warn('[LevelingPlan] Cannot require views/create-store:', requireError.message)
      }
    }
    
    if (!reduxStore) {
      console.error('[LevelingPlan] Cannot initialize observer: Redux store not available')
      console.info('[LevelingPlan] Try passing store to initAutoCompleteObserver(store)')
      return
    }
    
    // Verify store has required methods
    if (typeof reduxStore.getState !== 'function' || typeof reduxStore.subscribe !== 'function') {
      console.error('[LevelingPlan] Invalid store object:', reduxStore)
      return
    }
    
    // Register the observer
    observe(reduxStore, [shipLevelObserver])
    
    console.log('[LevelingPlan] Auto-complete observer initialized successfully')
  } catch (error) {
    console.error('[LevelingPlan] Failed to initialize auto-complete observer:', error)
  }
}
