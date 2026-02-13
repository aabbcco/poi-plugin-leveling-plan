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
