import React, { Component } from 'react'
import { Panel, FormGroup, ControlLabel, FormControl, Button } from 'react-bootstrap'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'
import { planSettingsSelector, personalStatsSelector, equipSyncMetaSelector } from '../../utils/selectors'
import { expLevel, EXP_BY_POI_DB } from '../../utils/constants'
import { getMapExp } from '../../utils/exp-calculator'
import { formatMapName } from '../../utils/plan-helpers'

const { __ } = window.i18n['poi-plugin-leveling-plan']

const MapExperienceOverview = ({ personalStats }) => {
  const mapIds = Object.keys(EXP_BY_POI_DB).sort((a, b) => Number(a) - Number(b))

  return (
    <div className="map-exp-table-container">
      <table className="map-exp-table">
        <thead>
          <tr>
            <th>{__('Map')}</th>
            <th>{__('Preset Value')}</th>
            <th>{__('Personal Value')}</th>
            <th>{__('Sample Count')}</th>
            <th>{__('Currently Used')}</th>
          </tr>
        </thead>
        <tbody>
          {mapIds.map(mapId => {
            const mapExpData = getMapExp(mapId, personalStats, 30)
            const presetExp = EXP_BY_POI_DB[mapId] || 0
            const isPersonal = mapExpData.source === 'personal'
            const hasPersonalData = mapExpData.count > 0
            const samplesInsufficient = hasPersonalData && !isPersonal

            return (
              <tr key={mapId}>
                <td className="map-id">{formatMapName(mapId)}</td>
                <td className="preset-exp">{presetExp}</td>
                <td className={`personal-exp ${isPersonal ? 'active' : ''}`}>
                  {hasPersonalData ? mapExpData.exp : __('No personal data')}
                </td>
                <td className={`sample-count ${samplesInsufficient ? 'insufficient' : ''}`}>
                  {mapExpData.count}
                  {samplesInsufficient && <span className="insufficient-note"> ({__('Samples Insufficient')})</span>}
                </td>
                <td className="current-source">
                  {isPersonal ? (
                    <span className="source-badge personal">{__('Personal')} ★</span>
                  ) : (
                    <span className="source-badge preset">{__('Preset')}</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// 装备数据同步面板
const EquipSyncPanel = ({ meta: propsMeta }) => {
  const [syncing, setSyncing] = React.useState(false)
  const [meta, setMeta] = React.useState(propsMeta)
  const [result, setResult] = React.useState(null)

  React.useEffect(() => {
    setMeta(propsMeta)
  }, [propsMeta])

  const handleSync = async () => {
    setSyncing(true)
    setResult(null)
    try {
      const { manualSync } = await import('../../services/equip-sync-service')
      const res = await manualSync()
      setResult(res)
      if (res.success && res.meta) {
        setMeta(res.meta)
      }
    } catch (e) {
      setResult({ success: false, error: e.message })
    }
    setSyncing(false)
  }

  const formatTime = (ts) => {
    if (!ts) return __('No data yet')
    try {
      return new Date(ts).toLocaleString()
    } catch (e) {
      return ts
    }
  }

  return (
    <div>
      <p>{__('Last sync')}: {formatTime(meta ? meta.updated_at : null)}</p>
      <p>{__('Equipment entries')}: {meta && meta.equip_count ? meta.equip_count : '-'}</p>
      <p>{__('Ship entries')}: {meta && meta.ship_entry_count ? meta.ship_entry_count : '-'}</p>
      <div className="settings-actions">
        <Button bsStyle="primary" onClick={handleSync} disabled={syncing}>
          {syncing ? __('Syncing...') : __('Sync Now')}
        </Button>
      </div>
      {result && result.success && result.unchanged && (
        <p className="text-success" style={{ marginTop: 6 }}>{__('Already up to date')}</p>
      )}
      {result && result.success && !result.unchanged && (
        <p className="text-success" style={{ marginTop: 6 }}>{__('Sync completed')}</p>
      )}
      {result && !result.success && (
        <p className="text-danger" style={{ marginTop: 6 }}>{__('Sync failed')}: {result.error}</p>
      )}
    </div>
  )
}

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
    const { personalStats, equipSyncMeta } = this.props

    return (
      <>
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

      {/* 海图经验纵览 - 独立卡片 */}
      <Panel className="map-exp-overview-panel">
        <Panel.Heading>
          <Panel.Title>{__('Map Experience Overview')}</Panel.Title>
        </Panel.Heading>
        <Panel.Body>
          <MapExperienceOverview personalStats={personalStats} />
        </Panel.Body>
      </Panel>
      {/* 装备数据同步 */}
      <Panel className="equip-sync-panel">
        <Panel.Heading>
          <Panel.Title>{__('Equipment-Ship Data Sync')}</Panel.Title>
        </Panel.Heading>
        <Panel.Body>
          <EquipSyncPanel meta={equipSyncMeta} />
        </Panel.Body>
      </Panel>
      </>
    )
  }
}

// Redux 连接
const mapStateToProps = createSelector(
  [planSettingsSelector, personalStatsSelector, equipSyncMetaSelector],
  (settings, personalStats, equipSyncMeta) => ({
    settings,
    personalStats,
    equipSyncMeta,
  })
)

export default connect(mapStateToProps)(PlanSettings)
