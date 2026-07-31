import React, { Component } from 'react'
import { Panel } from 'react-bootstrap'
import { connect } from 'react-redux'
import { Tag } from '@blueprintjs/core'
import _ from 'lodash'
import { activePlanDetailsSelector, $shipsSelector } from '../../utils/selectors'
import { getRemodelChainForShip, getShipMaterials, parseShipMaterials, addCost, emptyCost } from '../../utils/kaisou-cost'
import { RemodelCostDisplay } from './plan-item'

const { __ } = window.i18n['poi-plugin-leveling-plan']

function calcPlanRemodelCost(shipMasterId, currentLv, targetLv, $ships) {
  const chain = getRemodelChainForShip(shipMasterId, $ships)

  const steps = []
  for (let i = 0; i < chain.length - 1; i++) {
    const fromId = chain[i]
    const toId = chain[i + 1]
    const level = +($ships[fromId]?.api_afterlv || 0)
    if (level <= 0 || level >= 200) continue

    const isPassedLevel = level <= currentLv
    const isStillInForm = fromId === shipMasterId

    if (level <= targetLv && (level > currentLv || isStillInForm)) {
      steps.push({
        level,
        fromId,
        toId,
        toName: $ships[toId]?.api_name || `Ship#${toId}`,
        isDelayed: isPassedLevel && isStillInForm,
      })
    }
  }

  let totalCost = emptyCost()
  steps.forEach(step => {
    const materials = getShipMaterials(step.fromId)
    if (materials) {
      totalCost = addCost(totalCost, parseShipMaterials(materials))
    }
  })

  return { steps, totalCost }
}

class RemodelCosts extends Component {
  render() {
    const { plans, $ships, resources, useitems } = this.props

    if (!plans || plans.length === 0) {
      return (
        <div className="empty-message" style={{ padding: 20, textAlign: 'center' }}>
          {__('No active plans')}
        </div>
      )
    }

    const planCosts = plans.map(plan => {
      const fromLevel = plan.startLv !== undefined ? plan.startLv : plan.currentLv
      const costData = calcPlanRemodelCost(plan.shipMasterId, fromLevel, plan.targetLv, $ships)
      return {
        id: plan.id,
        shipName: plan.shipName,
        fromLevel,
        targetLv: plan.targetLv,
        ...costData,
      }
    }).filter(pc => pc.steps.length > 0)

    const totalCost = planCosts.reduce((acc, pc) => addCost(acc, pc.totalCost), emptyCost())
    const hasAnyCost = totalCost.ammo > 0 || totalCost.steel > 0 || Object.keys(totalCost.consumable).length > 0

    return (
      <div className="remodel-costs">
        <Panel className="remodel-costs-summary">
          <Panel.Heading>
            <Panel.Title>{__('Total Remodel Cost')}</Panel.Title>
          </Panel.Heading>
          <Panel.Body>
            {hasAnyCost ? (
              <RemodelCostDisplay cost={totalCost} resources={resources} useitems={useitems} />
            ) : (
              <span style={{ opacity: 0.5 }}>{__('No remodel required')}</span>
            )}
          </Panel.Body>
        </Panel>

        {planCosts.map(pc => (
          <Panel key={pc.id} className="remodel-costs-item">
            <Panel.Heading>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <span>
                  <strong>{pc.shipName}</strong>
                  <span style={{ marginLeft: 12, opacity: 0.7 }}>
                    Lv.{pc.fromLevel} → Lv.{pc.targetLv}
                  </span>
                </span>
                <span style={{ textAlign: 'right' }}>
                  <RemodelCostDisplay cost={pc.totalCost} resources={resources} useitems={useitems} />
                </span>
              </div>
            </Panel.Heading>
            {pc.steps.length > 0 && (
              <Panel.Body>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {pc.steps.map((step, i) => (
                    <Tag key={i} style={{ fontSize: '0.85em' }}>
                      Lv.{step.level} → {step.toName}
                      {step.isDelayed && <span style={{ color: '#f0ad4e', marginLeft: 2 }}>*</span>}
                    </Tag>
                  ))}
                </div>
              </Panel.Body>
            )}
          </Panel>
        ))}
      </div>
    )
  }
}

const mapStateToProps = (state) => {
  return {
    plans: activePlanDetailsSelector(state),
    $ships: $shipsSelector(state),
    resources: _.get(state, 'info.resources', []),
    useitems: _.get(state, 'info.useitems', {}),
  }
}

export default connect(mapStateToProps)(RemodelCosts)
