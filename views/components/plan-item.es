import React from 'react'
import { Panel, Button, ProgressBar } from 'react-bootstrap'
import { MaterialIcon, SlotitemIcon } from 'views/components/etc/icon'
import { UseitemIcon } from './useitem-icon'
import { getShipRemodelCost, calcAllShortages } from '../../utils/kaisou-cost'
import _ from 'lodash'

const { __ } = window.i18n['poi-plugin-leveling-plan']
const { __: __r } = window.i18n.resources

const RemodelCostDisplay = ({ cost, resources, useitems, $useitems }) => {
  if (!cost || (cost.ammo === 0 && cost.steel === 0 && Object.keys(cost.consumable).length === 0)) {
    return <span style={{ opacity: 0.5 }}>{__('No remodel required')}</span>
  }

  const shortages = calcAllShortages(cost, resources, useitems || {}, {})

  return (
    <span style={{ textAlign: 'right', fontSize: '0.9em' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
        {cost.ammo > 0 && (
          <span>
            <MaterialIcon materialId={2} className="material-icon-sm" />
            {cost.ammo.toLocaleString()}
            {shortages.ammo?.gap > 0 && (
              <span style={{ color: '#d9534f' }}>(-{shortages.ammo.gap.toLocaleString()})</span>
            )}
          </span>
        )}
        {cost.steel > 0 && (
          <span>
            <MaterialIcon materialId={3} className="material-icon-sm" />
            {cost.steel.toLocaleString()}
            {shortages.steel?.gap > 0 && (
              <span style={{ color: '#d9534f' }}>(-{shortages.steel.gap.toLocaleString()})</span>
            )}
          </span>
        )}
        {Object.keys(cost.consumable || {}).length > 0 && (
          Object.entries(cost.consumable).map(([itemId, count]) => {
            const shortage = _.get(shortages, ['consumable', itemId, 'gap'], 0)
            const numId = Number(itemId)
            // 建造资材(2) materialId=4，开发资材(3) materialId=6
            const isMaterial = numId === 2 || numId === 3
            const materialId = numId === 2 ? 4 : 6
            return (
              <span key={itemId} style={{ fontSize: '0.85em', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                {isMaterial
                  ? <MaterialIcon materialId={materialId} className="material-icon-sm" />
                  : <UseitemIcon useitemId={numId} className="useitem-icon-sm" />
                }
                {count}
                {shortage > 0 && (
                  <span style={{ color: '#d9534f' }}>(-{shortage})</span>
                )}
              </span>
            )
          })
        )}
      </span>
    </span>
  )
}

// 单个计划卡片组件
export const PlanItem = ({ planDetail, onEdit, onDelete, onComplete, $ships, resources, useitems, $useitems }) => {
  if (!planDetail) return null

  const {
    shipMasterId,
    shipName,
    startLv,
    currentLv,
    currentExp,
    targetLv,
    targetTotalExp,
    requiredExp,
    progress,
    mapDetails,
    notes,
    completed,
  } = planDetail

  const fromLevel = startLv === undefined ? currentLv : startLv

  const remodelCost = ($ships && shipMasterId && fromLevel && targetLv)
    ? getShipRemodelCost(shipMasterId, fromLevel, targetLv, $ships)
    : null

  return (
    <Panel className="plan-item">
      <Panel.Heading>
        <div className="plan-item-header">
          <div className="plan-item-title">
            <span className="ship-name">{shipName}</span>
            <span className="level-info">
              Lv.{startLv==undefined?currentLv:startLv} → Lv.{targetLv}
            </span>
            {completed && (
              <span className="completed-badge">{__(completed ? 'Completed' : '')}</span>
            )}
          </div>
          <div className="plan-item-actions">
            {!completed && (
              <>
                <Button bsSize="xsmall" onClick={onEdit}>
                  {__('Edit')}
                </Button>
                <Button bsSize="xsmall" onClick={onComplete}>
                  {__('Complete')}
                </Button>
              </>
            )}
            <Button bsSize="xsmall" bsStyle="danger" onClick={onDelete}>
              {__('Delete')}
            </Button>
          </div>
        </div>
      </Panel.Heading>
      <Panel.Body>
        <div className="plan-item-body">
          {/* 进度条 */}
          <div className="progress-section">
            <div className="progress-label">
              {__('Progress')}: {progress.toFixed(3)}%
            </div>
            <ProgressBar now={progress} />
            <div className="exp-info">
              {__('Current EXP')}: {currentExp.toLocaleString()} / {targetTotalExp.toLocaleString()}
            </div>
            <div className="exp-info">
              {__('Required EXP')}: {requiredExp.toLocaleString()}
              {remodelCost && (
                <span style={{ marginLeft: 15 }}>
                  <RemodelCostDisplay cost={remodelCost} resources={resources} useitems={useitems} $useitems={$useitems} />
                </span>
              )}
            </div>
          </div>

          {/* 海图详情 */}
          <div className="maps-section">
            <div className="maps-label">{__('Maps')}:</div>
            <div className="maps-list">
              {mapDetails.map(map => (
                <div key={map.mapId} className="map-item">
                  <span className="map-name">{map.mapName}</span>
                  <span className="map-exp">
                    {map.expPerSortie} exp
                    {map.mapExpSource === 'personal' && (
                      <span className="personal-badge" title={`${__('Personal Stats')}: ${map.mapExpCount} ${__('sorties')}`}>
                        ★
                      </span>
                    )}
                  </span>
                  <span className="map-sorties">
                    × {map.sortiesNeeded.toLocaleString()} {__('sorties')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 备注 */}
          {notes && (
            <div className="notes-section">
              <div className="notes-label">{__('Notes')}:</div>
              <div className="notes-content">{notes}</div>
            </div>
          )}
        </div>
      </Panel.Body>
    </Panel>
  )
}

export default PlanItem
