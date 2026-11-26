import React, { Component } from 'react'
import { Modal, Button, FormGroup, FormControl, ControlLabel } from 'react-bootstrap'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'
import ShipSelector, { MasterShipSelector } from './ship-selector'
import MapSelector from './map-selector'
import EquipShipSelector from './equip-ship-selector'
import { ourShipsSelector, $shipsSelector } from '../../utils/selectors'
import { createPlan, updatePlan, validatePlan } from '../../utils/plan-helpers'
import { getRemodelLevelsForShip } from '../../utils/kaisou-cost'
import { MAX_LEVEL } from '../../utils/constants'

const { __ } = window.i18n['poi-plugin-leveling-plan']

class PlanForm extends Component {
  constructor(props) {
    super(props)
    this.state = {
      ...this.buildInitialState(props),
      shipPortalContainer: null,
    }
  }

  buildInitialState = (props) => {
    const { editingPlan } = props
    const isFarming = props.planType === 'farming' || (editingPlan && editingPlan.type === 'farming')

    let selectionMode = 'shipName'
    let selectedTargets = []
    if (editingPlan && editingPlan.type === 'farming' && editingPlan.targets) {
      selectionMode = 'equipment'
      selectedTargets = editingPlan.targets
    }

    return {
      shipId: editingPlan ? (isFarming ? (editingPlan.targets ? '' : editingPlan.shipMasterId) : editingPlan.shipId) : '',
      startLevel: editingPlan ? (editingPlan.startLevel !== undefined && editingPlan.startLevel !== null ? editingPlan.startLevel : '') : '1',
      targetLevel: editingPlan ? (editingPlan.targets ? '' : editingPlan.targetLevel) : '',
      maps: editingPlan ? editingPlan.maps : [],
      errors: [],
      selectionMode,
      selectedTargets,
    }
  }

  shouldComponentUpdate(nextProps) {
    // 弹窗关闭期间跳过所有来自 Redux 的无效重渲染，同时保留 Modal 实例以维持关闭动画
    if (!this.props.show && !nextProps.show) {
      return false
    }
    return true
  }

  componentDidUpdate(prevProps) {
    if (!prevProps.show && this.props.show) {
      this.setState(this.buildInitialState(this.props))
    }
  }

  setShipSelectorAnchor = (node) => {
    const container = node ? node.closest('.modal-dialog') : null
    if (this.state.shipPortalContainer !== container) {
      this.setState({ shipPortalContainer: container })
    }
  }

  handleShipChange = (shipId) => {
    this.setState({ shipId })
    const { planType, editingPlan, ships } = this.props
    const isFarming = planType === 'farming' || (editingPlan && editingPlan.type === 'farming')
    if (!isFarming && shipId) {
      const found = ships[parseInt(shipId, 10)]
      this.setState({ startLevel: found ? found.api_lv : '1' })
    }
  }

  handleTargetLevelChange = (e) => {
    const value = e.target.value
    this.setState({ targetLevel: value })
  }


  handleStartLevelChange = (e) => {
    const value = e.target.value
    this.setState({ startLevel: value })
  }

  handleMapsChange = (maps) => {
    this.setState({ maps })
  }

  handleSubmit = () => {
    const { shipId, targetLevel, startLevel, maps } = this.state
    const { editingPlan, ships, $ships, onSave, planType } = this.props
    const isFarming = planType === 'farming' || (editingPlan && editingPlan.type === 'farming')

    if (isFarming) {
      if (this.state.selectionMode === 'equipment') {
        if (this.state.selectedTargets.length === 0) {
          this.setState({ errors: ['Please select at least one ship'] })
          return
        }
        let plan
        if (editingPlan) {
          plan = updatePlan(editingPlan, {
            targets: this.state.selectedTargets,
            shipMasterId: null,
            targetLevel: null,
            maps,
          })
        } else {
          plan = createPlan(
            null, null, null, null, maps, 'farming', this.state.selectedTargets
          )
        }
        const validation = validatePlan(plan)
        if (!validation.valid) {
          this.setState({ errors: validation.errors })
          return
        }
        onSave(plan)
        return
      }

      const masterShipId = parseInt(shipId, 10)
      const $ship = $ships[masterShipId]
      if (!$ship) {
        this.setState({ errors: ['Ship master data not found'] })
        return
      }

      let plan
      if (editingPlan) {
        plan = updatePlan(editingPlan, {
          targets: null,
          shipMasterId: masterShipId,
          targetLevel: parseInt(targetLevel, 10),
          maps,
        })
      } else {
        plan = createPlan(
          null,
          masterShipId,
          null,
          parseInt(targetLevel, 10),
          maps,
          'farming'
        )
      }

      const validation = validatePlan(plan)
      if (!validation.valid) {
        this.setState({ errors: validation.errors })
        return
      }

      onSave(plan)
      return
    }

    const effectiveShipId = editingPlan ? editingPlan.shipId : parseInt(shipId, 10)
    const ship = ships[effectiveShipId]
    if (!ship) {
      this.setState({ errors: ['Ship not found'] })
      return
    }

    const $ship = $ships[ship.api_ship_id]
    if (!$ship) {
      this.setState({ errors: ['Ship master data not found'] })
      return
    }

    const parsedStartLevel = startLevel === '' || startLevel === null || startLevel === undefined
      ? ship.api_lv
      : parseInt(startLevel, 10)
    const parsedTargetLevel = parseInt(targetLevel, 10)

    let plan
    if (editingPlan) {
      plan = updatePlan(editingPlan, {
        shipMasterId: ship.api_ship_id,
        targetLevel: parsedTargetLevel,
        startLevel: parsedStartLevel,
        maps,
      })
    } else {
      plan = createPlan(
        ship.api_id,
        ship.api_ship_id,
        parsedStartLevel,
        parsedTargetLevel,
        maps,
        'normal'
      )
    }

    const validation = validatePlan(plan, ship)
    if (!validation.valid) {
      this.setState({ errors: validation.errors })
      return
    }

    onSave(plan)
  }

  render() {
    const { show, onHide, editingPlan, ships, $ships, planType } = this.props
    const {
      shipId, startLevel, targetLevel, maps, errors, selectionMode, selectedTargets, shipPortalContainer,
    } = this.state
    const isFarming = planType === 'farming' || (editingPlan && editingPlan.type === 'farming')

    const selectedShip = !isFarming && shipId ? ships[parseInt(shipId, 10)] : null
    const currentLevel = selectedShip ? selectedShip.api_lv : 0

    const title = isFarming
      ? (editingPlan ? __('Edit Farming Plan') : __('Add Farming Plan'))
      : (editingPlan ? __('Edit Plan') : __('Add Plan'))

    return (
      <Modal show={show} onHide={onHide} bsSize="large">
        <Modal.Header closeButton>
          <Modal.Title>
            {title}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {errors.length > 0 && (
            <div className="alert alert-danger">
              <ul>
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          <FormGroup>
            <ControlLabel>{isFarming ? __('Ship Type') : __('Ship')}</ControlLabel>
            {isFarming && (
              <div className="btn-group" style={{ marginBottom: 8 }}>
                <Button
                  bsSize="small"
                  bsStyle={selectionMode === 'shipName' ? 'primary' : 'default'}
                  onClick={() => this.setState({ selectionMode: 'shipName' })}
                >
                  {__('By Ship Name')}
                </Button>
                <Button
                  bsSize="small"
                  bsStyle={selectionMode === 'equipment' ? 'primary' : 'default'}
                  onClick={() => this.setState({ selectionMode: 'equipment' })}
                >
                  {__('By Equipment')}
                </Button>
              </div>
            )}
            <div ref={this.setShipSelectorAnchor}>
              {isFarming && selectionMode === 'shipName' && (
                <MasterShipSelector
                  value={shipId}
                  onChange={this.handleShipChange}
                  portalContainer={shipPortalContainer}
                />
              )}
              {isFarming && selectionMode === 'equipment' && (
                <div style={{ height: 360 }}>
                  <EquipShipSelector
                    selectedTargets={selectedTargets}
                    onChange={(targets) => this.setState({ selectedTargets: targets })}
                  />
                </div>
              )}
              {!isFarming && (
                <ShipSelector
                  value={shipId}
                  onChange={this.handleShipChange}
                  disabled={Boolean(editingPlan)}
                  portalContainer={shipPortalContainer}
                />
              )}
            </div>
            {editingPlan && !isFarming && (
              <p className="help-block">
                {__('Cannot change ship in existing plan')}
              </p>
            )}
          </FormGroup>

          {!isFarming && (
            <FormGroup>
              <ControlLabel>{__('Start Level')}</ControlLabel>
              <FormControl
                type="number"
                value={startLevel}
                onChange={this.handleStartLevelChange}
                min={1}
                max={MAX_LEVEL}
                placeholder={__('Enter Start level')}
              />
            </FormGroup>
          )}

          {(!isFarming || selectionMode === 'shipName') && (
            <FormGroup>
              <ControlLabel>{__('Target Level')}</ControlLabel>
              <FormControl
                type="number"
                value={targetLevel}
                onChange={this.handleTargetLevelChange}
                min={currentLevel + 1}
                max={MAX_LEVEL}
                placeholder={__('Enter target level')}
              />
              {(() => {
                const shipMasterId = isFarming
                  ? parseInt(shipId)
                  : (selectedShip ? selectedShip.api_ship_id : null)
                if (!shipMasterId || !$ships) return null
                const remodelLevels = getRemodelLevelsForShip(shipMasterId, $ships)
                const startLv = isFarming ? 0 : (parseInt(startLevel) || 0)
                const filteredLevels = remodelLevels.filter(lv => lv > startLv)
                if (filteredLevels.length === 0) return null
                return (
                  <div className="remodel-level-tags" style={{ marginTop: 6, marginBottom: 8, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {filteredLevels.map(lv => (
                      <span
                        key={lv}
                        className={`remodel-level-tag ${parseInt(targetLevel, 10) === lv ? 'active' : ''}`}
                        onClick={() => this.setState({ targetLevel: String(lv) })}
                      >
                        lv{lv}
                      </span>
                    ))}
                  </div>
                )
              })()}
              {selectedShip && !isFarming && (
                <p className="help-block">
                  {__('Current level')}: {currentLevel}
                </p>
              )}
            </FormGroup>
          )}

          <FormGroup>
            <ControlLabel>{__('Maps')}</ControlLabel>
            <MapSelector
              value={maps}
              onChange={this.handleMapsChange}
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

const mapStateToProps = createSelector(
  [ourShipsSelector, $shipsSelector],
  (ships, $ships) => ({
    ships,
    $ships,
  })
)

export default connect(mapStateToProps)(PlanForm)
