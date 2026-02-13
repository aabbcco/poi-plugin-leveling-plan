import React, { Component } from 'react'
import { Panel, FormGroup, ControlLabel, FormControl, Button } from 'react-bootstrap'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'
import { planSettingsSelector } from '../../utils/selectors'
import { expLevel } from '../../utils/constants'

const { __ } = window.i18n['poi-plugin-leveling-plan']

// 计划设置组件
class PlanSettings extends Component {
  constructor(props) {
    super(props)
    
    const { settings } = props
    
    this.state = {
      defaultRank: settings.defaultRank || 0,
      defaultIsFlagship: settings.defaultIsFlagship !== false,
      defaultIsMVP: settings.defaultIsMVP || false,
    }
  }

  handleRankChange = (e) => {
    this.setState({ defaultRank: parseInt(e.target.value) })
  }

  handleFlagshipChange = (e) => {
    this.setState({ defaultIsFlagship: e.target.checked })
  }

  handleMVPChange = (e) => {
    this.setState({ defaultIsMVP: e.target.checked })
  }

  handleSave = () => {
    const { defaultRank, defaultIsFlagship, defaultIsMVP } = this.state
    const { onSave } = this.props
    
    onSave({
      defaultRank,
      defaultIsFlagship,
      defaultIsMVP,
    })
  }

  handleReset = () => {
    this.setState({
      defaultRank: 0,
      defaultIsFlagship: true,
      defaultIsMVP: false,
    })
  }

  render() {
    const { defaultRank, defaultIsFlagship, defaultIsMVP } = this.state

    return (
      <Panel className="plan-settings">
        <Panel.Heading>
          <Panel.Title>{__('Default Battle Conditions')}</Panel.Title>
        </Panel.Heading>
        <Panel.Body>
          <p className="help-block">
            {__('These settings affect sortie calculations for all plans')}
          </p>

          {/* 战斗结果等级 */}
          <FormGroup>
            <ControlLabel>{__('Battle Result')}</ControlLabel>
            <FormControl
              componentClass="select"
              value={defaultRank}
              onChange={this.handleRankChange}
            >
              {expLevel.map((level, index) => (
                <option key={index} value={index}>
                  {level}
                </option>
              ))}
            </FormControl>
          </FormGroup>

          {/* 旗舰位置 */}
          <FormGroup>
            <div className="checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={defaultIsFlagship}
                  onChange={this.handleFlagshipChange}
                />
                {__('Flagship Position')} (×1.5 EXP)
              </label>
            </div>
          </FormGroup>

          {/* MVP */}
          <FormGroup>
            <div className="checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={defaultIsMVP}
                  onChange={this.handleMVPChange}
                />
                {__('MVP')} (×2.0 EXP)
              </label>
            </div>
          </FormGroup>

          {/* 按钮 */}
          <div className="settings-actions">
            <Button onClick={this.handleReset}>
              {__('Reset to Default')}
            </Button>
            <Button bsStyle="primary" onClick={this.handleSave}>
              {__('Save Settings')}
            </Button>
          </div>
        </Panel.Body>
      </Panel>
    )
  }
}

// Redux 连接
const mapStateToProps = createSelector(
  [planSettingsSelector],
  (settings) => ({
    settings,
  })
)

export default connect(mapStateToProps)(PlanSettings)
