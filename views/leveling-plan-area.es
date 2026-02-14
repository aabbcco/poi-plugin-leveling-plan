import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { Nav, NavItem, Col, Grid, Button } from 'react-bootstrap'
import { join } from 'path-extra'
import PlanList from './components/plan-list'
import PlanForm from './components/plan-form'
import PlanSettings from './components/plan-settings'
import { plansSelector } from '../utils/selectors'
import { addPlan, updatePlan, deletePlan, completePlan, updateSettings } from '../utils/config-helper'

const { __ } = window.i18n['poi-plugin-leveling-plan']

export const LevelingPlanArea = connect(state => ({
  plans: plansSelector(state),
}))(class levelingPlanArea extends Component {
  static propTypes = {
    plans: PropTypes.object,
  }

  state = {
    activeTab: 0, // 0: Plans, 1: Settings
    showPlanForm: false,
    editingPlanId: null,
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
    })
  }

  handleEditPlan = (planId) => {
    this.setState({
      showPlanForm: true,
      editingPlanId: planId,
    })
  }

  handleClosePlanForm = () => {
    this.setState({
      showPlanForm: false,
      editingPlanId: null,
    })
  }

  handleSavePlan = (plan) => {
    const { editingPlanId } = this.state

    if (editingPlanId) {
      // 更新计划
      updatePlan(editingPlanId, {
        targetLevel: plan.targetLevel,
        startLevel:plan.startLevel,
        maps: plan.maps,
        notes: plan.notes,
      })
    } else {
      // 添加计划
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
    const { activeTab, showPlanForm, editingPlanId } = this.state
    const { plans } = this.props

    const editingPlan = editingPlanId ? plans[editingPlanId] : null

    return (
      <div id="leveling-plan">
        <div className="flex-column">
          <link rel="stylesheet" href={join(__dirname, '..', 'assets', 'main.css')} />
          
          {/* 顶部导航 */}
          <Grid className="vertical-center" style={{ minHeight: 45 }}>
            <Col xs={12} style={{ padding: 0 }}>
              <div className="header-container">
                <Nav className="main-nav" bsStyle="pills" activeKey={activeTab} onSelect={this.handleTabChange}>
                  <NavItem eventKey={0}>{__('Plans')}</NavItem>
                  <NavItem eventKey={1}>{__('Settings')}</NavItem>
                </Nav>
                {activeTab === 0 && (
                  <Button bsStyle="primary" onClick={this.handleAddPlan}>
                    {__('Add Plan')}
                  </Button>
                )}
              </div>
            </Col>
          </Grid>

          {/* 内容区域 */}
          <div className="list-container">
            {activeTab === 0 && (
              <PlanList
                onEdit={this.handleEditPlan}
                onDelete={this.handleDeletePlan}
                onComplete={this.handleCompletePlan}
              />
            )}
            {activeTab === 1 && (
              <PlanSettings
                onSave={this.handleSaveSettings}
              />
            )}
          </div>

          {/* 计划表单模态框 */}
          <PlanForm
            key={editingPlanId || 'new'}
            show={showPlanForm}
            onHide={this.handleClosePlanForm}
            onSave={this.handleSavePlan}
            editingPlan={editingPlan}
          />
        </div>
      </div>
    )
  }
})
