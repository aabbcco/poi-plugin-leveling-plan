import React, { Component } from 'react'
import { Nav, NavItem } from 'react-bootstrap'
import { connect } from 'react-redux'
import _ from 'lodash'
import PlanItem from './plan-item'
import { constSelector } from 'views/utils/selectors'
import { allPlanDetailsSelector, activePlanDetailsSelector, completedPlanDetailsSelector, $shipsSelector } from '../../utils/selectors'

const { __ } = window.i18n['poi-plugin-leveling-plan']

// 计划列表组件
class PlanList extends Component {
  constructor(props) {
    super(props)
    this.state = {
      activeTab: 'active', // 'all' | 'active' | 'completed'
    }
  }

  handleTabSelect = (activeTab) => {
    this.setState({ activeTab })
  }

  render() {
    const { activeTab } = this.state
    const { allPlans, activePlans, completedPlans, onEdit, onDelete, onComplete, $ships, resources, useitems, $useitems } = this.props

    // 根据当前标签页选择要显示的计划
    let displayPlans = []
    if (activeTab === 'all') {
      displayPlans = allPlans
    } else if (activeTab === 'active') {
      displayPlans = activePlans
    } else if (activeTab === 'completed') {
      displayPlans = completedPlans
    }

    return (
      <div className="plan-list">
        {/* 标签页导航 */}
        <Nav bsStyle="tabs" activeKey={activeTab} onSelect={this.handleTabSelect}>
          <NavItem eventKey="active">
            {__('Active')} ({activePlans.length})
          </NavItem>
          <NavItem eventKey="completed">
            {__('Completed')} ({completedPlans.length})
          </NavItem>
          <NavItem eventKey="all">
            {__('All')} ({allPlans.length})
          </NavItem>
        </Nav>

        {/* 计划列表 */}
        <div className="plan-list-content">
          {displayPlans.length === 0 ? (
            <div className="empty-message">
              {__('No plans yet')}
            </div>
          ) : (
            displayPlans.map(plan => (
              <PlanItem
                key={plan.id}
                planDetail={plan}
                onEdit={() => onEdit(plan.id)}
                onDelete={() => onDelete(plan.id)}
                onComplete={() => onComplete(plan.id)}
                $ships={$ships}
                resources={resources}
                useitems={useitems}
                $useitems={$useitems}
              />
            ))
          )}
        </div>
      </div>
    )
  }
}

// Redux 连接（不处理equips，避免大量计算）
const mapStateToProps = (state) => {
  const $const = constSelector(state) || {}
  return {
    allPlans: allPlanDetailsSelector(state),
    activePlans: activePlanDetailsSelector(state),
    completedPlans: completedPlanDetailsSelector(state),
    $ships: $shipsSelector(state),
    resources: _.get(state, 'info.resources', []),
    useitems: _.get(state, 'info.useitems', {}),
    $useitems: _.get($const, '$useitems', {}),
  }
}

export default connect(mapStateToProps)(PlanList)
