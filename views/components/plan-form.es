import React, { Component } from 'react'
import { Modal, Button, FormGroup, FormControl, ControlLabel } from 'react-bootstrap'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'
import _ from 'lodash'
import ShipSelector, { MasterShipSelector } from './ship-selector'
import MapSelector from './map-selector'
import { ourShipsSelector, $shipsSelector, plansSelector } from '../../utils/selectors'
import { createPlan, updatePlan, validatePlan } from '../../utils/plan-helpers'
import { getRemodelLevelsForShip } from '../../utils/kaisou-cost'

const { __ } = window.i18n['poi-plugin-leveling-plan']

class PlanForm extends Component {
  constructor(props) {
    super(props)

    const { editingPlan } = props
    const isFarming = props.planType === 'farming' || (editingPlan && editingPlan.type === 'farming')

    this.state = {
      shipId: editingPlan ? (isFarming ? editingPlan.shipMasterId : editingPlan.shipId) : '',
      startLevel: editingPlan ? editingPlan.startLevel : "1",
      targetLevel: editingPlan ? editingPlan.targetLevel : '',
      maps: editingPlan ? editingPlan.maps : [],
      notes: editingPlan ? editingPlan.notes : '',
      errors: [],
    }
  }

  handleShipChange = (shipId) => {
    this.setState({ shipId })
    const { planType, editingPlan, ships } = this.props
    const isFarming = planType === 'farming' || (editingPlan && editingPlan.type === 'farming')
    if (!isFarming && shipId) {
      const found = _.find(ships, s => s.api_id === parseInt(shipId))
      this.setState({ startLevel: found ? found.api_lv : "1" })
    }
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
    const { shipId, targetLevel, startLevel, maps, notes } = this.state
    const { editingPlan, ships, $ships, onSave, planType } = this.props
    const isFarming = planType === 'farming' || (editingPlan && editingPlan.type === 'farming')

    if (isFarming) {
      const masterShipId = parseInt(shipId)
      const $ship = $ships[masterShipId]
      if (!$ship) {
        this.setState({ errors: ['Ship master data not found'] })
        return
      }

      let plan
      if (editingPlan) {
        plan = updatePlan(editingPlan, {
          targetLevel: parseInt(targetLevel),
          maps,
          notes,
        })
      } else {
        plan = createPlan(
          null,
          masterShipId,
          null,
          parseInt(targetLevel),
          maps,
          notes,
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

    let plan
    if (editingPlan) {
      plan = updatePlan(editingPlan, {
        targetLevel: parseInt(targetLevel),
        startLevel: parseInt(startLevel),
        maps,
        notes,
      })
    } else {
      plan = createPlan(
        ship.api_id,
        ship.api_ship_id,
        parseInt(startLevel),
        parseInt(targetLevel),
        maps,
        notes,
        'normal'
      )
    }

    const validation = validatePlan(plan, ship)
    console.log(plan)
    if (!validation.valid) {
      this.setState({ errors: validation.errors })
      return
    }

    onSave(plan)
  }

  render() {
    const { show, onHide, editingPlan, ships, planType } = this.props
    const { shipId, startLevel, targetLevel, maps, notes, errors } = this.state
    const isFarming = planType === 'farming' || (editingPlan && editingPlan.type === 'farming')

    const selectedShip = shipId ? _.find(ships, s => s.api_id === parseInt(shipId)) : null
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
            {isFarming ? (
              <MasterShipSelector
                value={shipId}
                onChange={this.handleShipChange}
              />
            ) : (
              <ShipSelector
                value={shipId}
                onChange={this.handleShipChange}
              />
            )}
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
                onChange={this.handleStarttLevelChange}
                min={currentLevel + 1}
                max={185}
                placeholder={__('Enter Start level')}
              />
            </FormGroup>
          )}

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
                <div className="remodel-level-tags" style={{ marginBottom: 8, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {filteredLevels.map(lv => (
                    <span
                      key={lv}
                      onClick={() => this.setState({ targetLevel: String(lv) })}
                      style={{
                        cursor: 'pointer',
                        padding: '2px 8px',
                        backgroundColor: parseInt(targetLevel) === lv ? '#337ab7' : '#f0f0f0',
                        color: parseInt(targetLevel) === lv ? 'white' : '#333',
                        borderRadius: 3,
                        fontSize: 12,
                      }}
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

          <FormGroup>
            <ControlLabel>{__('Maps')}</ControlLabel>
            <MapSelector
              value={maps}
              onChange={this.handleMapsChange}
            />
          </FormGroup>

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

const mapStateToProps = createSelector(
  [ourShipsSelector, $shipsSelector, plansSelector],
  (ships, $ships, plans) => ({
    ships: _.values(ships),
    $ships,
    plans,
  })
)

export default connect(mapStateToProps)(PlanForm)
