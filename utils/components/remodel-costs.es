import React, { Component } from 'react'
import { Panel } from 'react-bootstrap'
import { connect } from 'react-redux'
import { Tag } from '@blueprintjs/core'
import _ from 'lodash'
import { activePlanDetailsSelector, remodelCostsSummarySelector } from '../../utils/selectors'
import { RemodelCostDisplay } from './plan-item'

const { __ } = window.i18n['poi-plugin-leveling-plan']
const EMPTY_ARRAY = []
const EMPTY_OBJECT = {}

class RemodelCosts extends Component {
  render() {
    const { hasActivePlans, planCosts, totalCost, hasAnyCost, resources, useitems } = this.props

    if (!hasActivePlans) {
      return (
        <div className="empty-message" style={{ padding: 20, textAlign: 'center' }}>
          {__('No active plans')}
        </div>
      )
    }

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
                    Lv.{pc.currentLv} → Lv.{pc.targetLv}
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
  const activePlans = activePlanDetailsSelector(state)
  const { planCosts, totalCost, hasAnyCost } = remodelCostsSummarySelector(state)
  return {
    hasActivePlans: activePlans.length > 0,
    planCosts,
    totalCost,
    hasAnyCost,
    resources: _.get(state, 'info.resources', EMPTY_ARRAY),
    useitems: _.get(state, 'info.useitems', EMPTY_OBJECT),
  }
}

export default connect(mapStateToProps)(RemodelCosts)
