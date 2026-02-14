import React, { Component } from 'react'
import { Modal, Button, FormGroup, FormControl, ControlLabel } from 'react-bootstrap'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'
import _ from 'lodash'
import ShipSelector from './ship-selector'
import MapSelector from './map-selector'
import { ourShipsSelector, $shipsSelector, plansSelector } from '../../utils/selectors'
import { createPlan, updatePlan, validatePlan } from '../../utils/plan-helpers'

const { __ } = window.i18n['poi-plugin-leveling-plan']

// 计划表单组件
class PlanForm extends Component {
  constructor(props) {
    super(props)

    const { editingPlan } = props

    this.state = {
      shipId: editingPlan ? editingPlan.shipId : '',
      startLevel: editingPlan ? editingPlan.startLevel : "1",
      targetLevel: editingPlan ? editingPlan.targetLevel : '',
      maps: editingPlan ? editingPlan.maps : [],
      notes: editingPlan ? editingPlan.notes : '',
      errors: [],
    }
  }

  handleShipChange = (shipId) => {
    this.setState({ shipId })
    const {ships} = this.props
    this.setState({startLevel:shipId ? _.find(ships, s => s.api_id === parseInt(shipId)).api_lv : "1"})
  }

  handleTargetLevelChange = (e) => {
    const value = e.target.value
    this.setState({ targetLevel: value })
  }


  handleStarttLevelChange = (e) => {
    const value = e.target.value
    this.setState({ startLevel: value })
  }

  handleMapsChange = (maps) => {
    this.setState({ maps })
  }

  handleNotesChange = (e) => {
    this.setState({ notes: e.target.value })
  }

  handleSubmit = () => {
    const { shipId, targetLevel,startLevel, maps, notes } = this.state
    const { editingPlan, ships, $ships, onSave } = this.props

    // 查找舰娘数据
    const ship = _.find(ships, s => s.api_id === parseInt(shipId))
    if (!ship) {
      this.setState({ errors: ['Ship not found'] })
      return
    }

    const $ship = $ships[ship.api_ship_id]
    if (!$ship) {
      this.setState({ errors: ['Ship master data not found'] })
      return
    }

    // 构建计划对象
    let plan
    if (editingPlan) {
      // 更新现有计划
      plan = updatePlan(editingPlan, {
        targetLevel: parseInt(targetLevel),
        startLevel:parseInt(startLevel),
        maps,
        notes,
      })
    } else {
      // 创建新计划
      plan = createPlan(
        ship.api_id,
        ship.api_ship_id,
        parseInt(startLevel),
        parseInt(targetLevel),
        maps,
        notes
      )
    }

    // 验证计划
    const validation = validatePlan(plan, ship)
    console.log(plan)
    if (!validation.valid) {
      this.setState({ errors: validation.errors })
      return
    }

    // 保存计划
    onSave(plan)
  }

  render() {
    const { show, onHide, editingPlan, ships } = this.props
    const { shipId,startLevel,targetLevel, maps, notes, errors } = this.state

    // 获取当前选中的舰娘
    const selectedShip = shipId ? _.find(ships, s => s.api_id === parseInt(shipId)) : null
    const currentLevel = selectedShip ? selectedShip.api_lv : 0

    return (
      <Modal show={show} onHide={onHide} bsSize="large">
        <Modal.Header closeButton>
          <Modal.Title>
            {editingPlan ? __('Edit Plan') : __('Add Plan')}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {/* 错误提示 */}
          {errors.length > 0 && (
            <div className="alert alert-danger">
              <ul>
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* 舰娘选择 */}
          <FormGroup>
            <ControlLabel>{__('Ship')}</ControlLabel>
            <ShipSelector
              value={shipId}
              onChange={this.handleShipChange}
              //disabled={!!editingPlan}
            />
            {editingPlan && (
              <p className="help-block">
                {__('Cannot change ship in existing plan')}
              </p>
            )}
          </FormGroup>

          {/* 初始等级 */}
          <FormGroup>
            <ControlLabel>{__('Start Level')}</ControlLabel>
            <FormControl
              type="number"
              value={startLevel}
              onChange={this.handleStarttLevelChange}
              min={currentLevel + 1}
              max={185}
              placeholder={__('Enter Start level')}
            />
          </FormGroup>

          {/* 目标等级 */}
          <FormGroup>
            <ControlLabel>{__('Target Level')}</ControlLabel>
            <FormControl
              type="number"
              value={targetLevel}
              onChange={this.handleTargetLevelChange}
              min={currentLevel + 1}
              max={185}
              placeholder={__('Enter target level')}
            />
            {selectedShip && (
              <p className="help-block">
                {__('Current level')}: {currentLevel}
              </p>
            )}
          </FormGroup>

          {/* 海图选择 */}
          <FormGroup>
            <ControlLabel>{__('Maps')}</ControlLabel>
            <MapSelector
              value={maps}
              onChange={this.handleMapsChange}
            />
          </FormGroup>

          {/* 备注 */}
          <FormGroup>
            <ControlLabel>{__('Notes')} ({__('Optional')})</ControlLabel>
            <FormControl
              componentClass="textarea"
              value={notes}
              onChange={this.handleNotesChange}
              rows={3}
              placeholder={__('Enter notes')}
            />
          </FormGroup>
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={onHide}>{__('Cancel')}</Button>
          <Button bsStyle="primary" onClick={this.handleSubmit}>
            {__('Save')}
          </Button>
        </Modal.Footer>
      </Modal>
    )
  }
}

// Redux 连接
const mapStateToProps = createSelector(
  [ourShipsSelector, $shipsSelector, plansSelector],
  (ships, $ships, plans) => ({
    ships: _.values(ships),
    $ships,
    plans,
  })
)

export default connect(mapStateToProps)(PlanForm)
