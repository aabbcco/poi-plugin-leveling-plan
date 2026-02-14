import React from 'react'
import { Panel, Button, ProgressBar } from 'react-bootstrap'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'

const { __ } = window.i18n['poi-plugin-leveling-plan']

// 单个计划卡片组件
export const PlanItem = ({ planDetail, onEdit, onDelete, onComplete }) => {
  if (!planDetail) return null

  const {
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

  console.log(planDetail)

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
