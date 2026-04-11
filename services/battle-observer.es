import { recordMapExp } from '../utils/config-helper'

let currentMapId = ''

const handleResponse = (e) => {
  const { path, body } = e.detail

  if (path === '/kcsapi/api_req_sortie/battleresult' ||
      path === '/kcsapi/api_req_combined_battle/battleresult' ||
      path === '/kcsapi/api_req_battle/battleresult' ||
      path === '/kcsapi/api_req_practice/battle_result') {
    console.log('[LevelingPlan] Battle result event:', path, 'currentMapId:', currentMapId)
    
    if (!currentMapId) {
      console.warn('[LevelingPlan] Battle result received but no mapId set')
      return
    }

    const baseExp = body?.api_get_base_exp
    if (baseExp && baseExp > 0) {
      recordMapExp(currentMapId, baseExp)
      console.log(`[LevelingPlan] Recorded map exp: ${currentMapId} = ${baseExp}`)
    }
  }

  if (path === '/kcsapi/api_req_map/start') {
    const worldId = body?.api_maparea_id
    const mapNo = body?.api_mapinfo_no
    if (worldId !== undefined && mapNo !== undefined) {
      currentMapId = `${worldId}${mapNo}`
      console.log(`[LevelingPlan] Entered map: ${currentMapId}`)
    }
  }

  if (path && path.includes('port')) {
    currentMapId = ''
  }
}

export const initBattleObserver = () => {
  window.addEventListener('game.response', handleResponse)
  console.log('[LevelingPlan] Battle observer initialized')
}

export const stopBattleObserver = () => {
  window.removeEventListener('game.response', handleResponse)
  console.log('[LevelingPlan] Battle observer stopped')
}