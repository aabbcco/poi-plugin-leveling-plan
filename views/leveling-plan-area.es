import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import _ from 'lodash'
import { Nav, NavItem, Col, Grid, Button } from 'react-bootstrap'
import { join } from 'path-extra'
import PlanList from '../utils/components/plan-list'
import FarmingPlanList from '../utils/components/farming-plan-list'
import RemodelCosts from '../utils/components/remodel-costs'
import PlanForm from '../utils/components/plan-form'
import PlanSettings from '../utils/components/plan-settings'
import { plansSelector } from '../utils/selectors'
import { addPlan, updatePlan, deletePlan, completePlan, updateSettings } from '../utils/config-helper'

const { __ } = window.i18n['poi-plugin-leveling-plan']

export const LevelingPlanArea = connect(state => ({
  plans: plansSelector(state),
  serverIp: _.get(state, 'info.server.ip', ''),
}))(class levelingPlanArea extends Component {
  static propTypes = {
    plans: PropTypes.object,
    serverIp: PropTypes.string,
  }

  state = {
    activeTab: 0, // 0: Plans, 1: Farming, 2: Remodel Costs, 3: Settings
    showPlanForm: false,
    editingPlanId: null,
    planType: 'normal',
  }

  componentDidMount() {
    if (this.props.serverIp) {
      import('../services/useitem-icons').then(({ initUseitemIcons }) => {
        initUseitemIcons(this.props.serverIp)
      }).catch(() => {})
    }
  }

  componentDidUpdate(prevProps) {
    if (this.props.serverIp && !prevProps.serverIp) {
      import('../services/useitem-icons').then(({ initUseitemIcons }) => {
        initUseitemIcons(this.props.serverIp)
      }).catch(() => {})
    }
  }

  handleTabChange = key => {
    this.setState({
      activeTab: key,
    })
  }

  handleAddPlan = () => {
    this.setState({
      showPlanForm: true,
      editingPlanId: null,
      planType: 'normal',
    })
  }

  handleAddFarmingPlan = () => {
    this.setState({
      showPlanForm: true,
      editingPlanId: null,
      planType: 'farming',
    })
  }

  handleEditPlan = (planId) => {
    const { plans } = this.props
    const plan = plans[planId]
    this.setState({
      showPlanForm: true,
      editingPlanId: planId,
      planType: plan ? (plan.type || 'normal') : 'normal',
    })
  }

  handleClosePlanForm = () => {
    this.setState({
      showPlanForm: false,
      editingPlanId: null,
      planType: 'normal',
    })
  }

  handleSavePlan = (plan) => {
    const { editingPlanId } = this.state

    if (editingPlanId) {
      const updates = {
        maps: plan.maps,
        notes: plan.notes,
      }
      if (plan.targets) {
        updates.targets = plan.targets
      } else {
        updates.targets = null
        updates.targetLevel = plan.targetLevel
        updates.shipMasterId = plan.shipMasterId
        if (plan.startLevel !== undefined) {
          updates.startLevel = plan.startLevel
        }
      }
      updatePlan(editingPlanId, updates)
    } else {
      addPlan(plan)
    }

    this.handleClosePlanForm()
  }

  handleDeletePlan = (planId) => {
    if (confirm(__('Are you sure you want to delete this plan?'))) {
      try {
        deletePlan(planId)
      } catch (error) {
        console.error('[LevelingPlan] Error deleting plan:', error)
        alert(__('Failed to delete plan. Please try again.'))
      }
    }
  }

  handleCompletePlan = (planId) => {
    completePlan(planId)
  }

  handleSaveSettings = (settings) => {
    updateSettings(settings)
  }

  render() {
    const { activeTab, showPlanForm, editingPlanId, planType } = this.state
    const { plans } = this.props

    const editingPlan = editingPlanId ? plans[editingPlanId] : null

    return (
      <div id="leveling-plan">
        <div className="flex-column">
          <link rel="stylesheet" href={join(__dirname, '..', 'assets', 'main.css')} />
          
          <Grid className="vertical-center" style={{ minHeight: 45 }}>
            <Col xs={12} style={{ padding: 0 }}>
              <div className="header-container">
                <Nav className="main-nav" bsStyle="pills" activeKey={activeTab} onSelect={this.handleTabChange}>
                  <NavItem eventKey={0}>{__('Plans')}</NavItem>
                  <NavItem eventKey={1}>{__('Farming')}</NavItem>
                  <NavItem eventKey={2}>{__('Remodel Costs')}</NavItem>
                  <NavItem eventKey={3}>{__('Settings')}</NavItem>
                </Nav>
                {activeTab === 0 && (
                  <Button bsStyle="primary" onClick={this.handleAddPlan}>
                    {__('Add Plan')}
                  </Button>
                )}
                {activeTab === 1 && (
                  <Button bsStyle="primary" onClick={this.handleAddFarmingPlan}>
                    {__('Add Farming Plan')}
                  </Button>
                )}
              </div>
            </Col>
          </Grid>

          <div className="list-container">
            {activeTab === 0 && (
              <PlanList
                onEdit={this.handleEditPlan}
                onDelete={this.handleDeletePlan}
                onComplete={this.handleCompletePlan}
              />
            )}
            {activeTab === 1 && (
              <FarmingPlanList
                onEdit={this.handleEditPlan}
                onDelete={this.handleDeletePlan}
              />
            )}
            {activeTab === 2 && (
              <RemodelCosts />
            )}
            {activeTab === 3 && (
              <PlanSettings
                onSave={this.handleSaveSettings}
              />
            )}
          </div>

          <PlanForm
            key={editingPlanId || 'new'}
            show={showPlanForm}
            onHide={this.handleClosePlanForm}
            onSave={this.handleSavePlan}
            editingPlan={editingPlan}
            planType={planType}
          />
        </div>
      </div>
    )
  }
})
