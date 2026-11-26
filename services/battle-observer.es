import { recordMapExp } from '../utils/config-helper'

let currentMapId = ''

const handleResponse = (e) => {
  const { path, body } = e.detail

  if (path === '/kcsapi/api_req_sortie/battleresult' ||
      path === '/kcsapi/api_req_combined_battle/battleresult' ||
      path === '/kcsapi/api_req_battle/battleresult') {
    if (!currentMapId) {
      return
    }

    const baseExp = body?.api_get_base_exp
    if (baseExp && baseExp > 0) {
      recordMapExp(currentMapId, baseExp)
    }
  }

  if (path === '/kcsapi/api_req_map/start') {
    const worldId = Number(body?.api_maparea_id)
    const mapNo = Number(body?.api_mapinfo_no)
    // 仅统计常规海域 (1-1 ~ 7-x)，过滤活动海域避免长期堆积无效统计
    if (worldId >= 1 && worldId <= 7 && mapNo >= 1) {
      currentMapId = `${worldId}${mapNo}`
    } else {
      currentMapId = ''
    }
  }

  if (path === '/kcsapi/api_port/port') {
    currentMapId = ''
  }
}

export const initBattleObserver = () => {
  window.addEventListener('game.response', handleResponse)
}

export const stopBattleObserver = () => {
  window.removeEventListener('game.response', handleResponse)
}
