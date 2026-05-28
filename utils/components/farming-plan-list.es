import React, { Component } from 'react'
import { connect } from 'react-redux'
import { FarmingPlanItem } from './plan-item'
import { farmingPlanDetailsSelector } from '../../utils/selectors'

const { __ } = window.i18n['poi-plugin-leveling-plan']

class FarmingPlanList extends Component {
  render() {
    const { plans, onEdit, onDelete } = this.props

    return (
      <div className="plan-list">
        <div className="plan-list-content">
          {plans.length === 0 ? (
            <div className="empty-message">
              {__('No farming plans yet')}
            </div>
          ) : (
            plans.map(plan => (
              <FarmingPlanItem
                key={plan.id}
                planDetail={plan}
                onEdit={() => onEdit(plan.id)}
                onDelete={() => onDelete(plan.id)}
              />
            ))
          )}
        </div>
      </div>
    )
  }
}

const mapStateToProps = (state) => ({
  plans: farmingPlanDetailsSelector(state),
})

export default connect(mapStateToProps)(FarmingPlanList)
