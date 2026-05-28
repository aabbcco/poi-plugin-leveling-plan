import React, { Component } from 'react'
import { Button, InputGroup, MenuItem, Tag, Tab, Tabs, Popover } from '@blueprintjs/core'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'
import { EXP_BY_POI_DB, frequentMaps, WORLD_NAMES } from '../../utils/constants'
import { personalStatsSelector } from '../../utils/selectors'
import { getMapExp } from '../../utils/exp-calculator'
import { formatMapName } from '../../utils/plan-helpers'

const { __ } = window.i18n['poi-plugin-leveling-plan']

const getWorldGroups = () => {
  const groups = {}
  Object.keys(EXP_BY_POI_DB).sort((a, b) => Number(a) - Number(b)).forEach(id => {
    const world = Math.floor(Number(id) / 10)
    if (!groups[world]) groups[world] = []
    groups[world].push(id)
  })
  return groups
}

class MapSelector extends Component {
  constructor(props) {
    super(props)
    this.state = {
      isOpen: false,
      searchQuery: '',
      activeWorld: null,
    }
    this.worldGroups = getWorldGroups()
    const worlds = Object.keys(this.worldGroups).sort((a, b) => Number(a) - Number(b))
    this.state.activeWorld = worlds[0] || null
  }

  toggleMap = (mapId) => {
    const { value = [], onChange } = this.props
    const mapIdStr = String(mapId)
    if (value.map(String).includes(mapIdStr)) {
      onChange(value.filter(id => String(id) !== mapIdStr))
    } else {
      onChange([...value, mapIdStr])
    }
  }

  handleTagRemove = (mapId) => {
    const { value = [], onChange } = this.props
    onChange(value.filter(id => String(id) !== String(mapId)))
  }

  closePopover = () => {
    this.setState({ isOpen: false, searchQuery: '' })
  }

  renderPopoverContent = () => {
    const { value = [] } = this.props
    const { activeWorld, searchQuery } = this.state
    const worlds = Object.keys(this.worldGroups).sort((a, b) => Number(a) - Number(b))

    const valueStrings = value.map(String)

    const filteredMaps = searchQuery
      ? Object.keys(EXP_BY_POI_DB).filter(id => formatMapName(id).includes(searchQuery))
      : null

    return (
      <div className="map-selector-tabs">
        <div className="map-selector-popover-header">
          <span className="map-selector-popover-title">{__('Select maps')}</span>
          <button
            type="button"
            className="bp5-button bp5-minimal bp5-small bp5-icon-cross"
            onClick={this.closePopover}
          />
        </div>
        <div className="map-selector-popover-search">
          <InputGroup
            leftIcon="search"
            placeholder={__('Search map')}
            value={searchQuery}
            onChange={(e) => this.setState({ searchQuery: e.target.value })}
          />
        </div>
        {filteredMaps ? (
          <div className="map-selector-tab-panel">
            {filteredMaps.map(mapId => (
              <MenuItem
                key={mapId}
                text={formatMapName(mapId)}
                icon={valueStrings.includes(mapId) ? 'tick' : 'blank'}
                onClick={() => this.toggleMap(mapId)}
                shouldDismissPopover={false}
              />
            ))}
            {filteredMaps.length === 0 && (
              <div style={{ padding: 8, color: '#888' }}>{__('No results')}</div>
            )}
          </div>
        ) : (
          <Tabs
            id="map-world-tabs"
            selectedTabId={activeWorld}
            onChange={(id) => this.setState({ activeWorld: id })}
            renderActiveTabPanelOnly
            vertical
          >
            {worlds.map(world => (
              <Tab
                key={world}
                id={world}
                title={`${world} · ${WORLD_NAMES[world] || ''}`}
                panel={
                  <div className="map-selector-tab-panel">
                    {this.worldGroups[world].map(mapId => (
                      <MenuItem
                        key={mapId}
                        text={formatMapName(mapId)}
                        icon={valueStrings.includes(mapId) ? 'tick' : 'blank'}
                        onClick={() => this.toggleMap(mapId)}
                        shouldDismissPopover={false}
                      />
                    ))}
                  </div>
                }
              />
            ))}
          </Tabs>
        )}
      </div>
    )
  }

  render() {
    const { value = [] } = this.props
    const valueStrings = value.map(String)
    const selectedMaps = valueStrings.filter(id => EXP_BY_POI_DB[id] !== undefined)

    return (
      <div className="map-selector">
        <div className="quick-select-buttons" style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
          {frequentMaps.map(mapId => {
            const idStr = String(mapId)
            const isSelected = valueStrings.includes(idStr)
            return (
              <button
                key={mapId}
                type="button"
                onClick={() => this.toggleMap(mapId)}
                style={{
                  padding: '2px 8px',
                  fontSize: 12,
                  cursor: 'pointer',
                  background: isSelected ? '#137cbd' : '#f5f5f5',
                  color: isSelected ? '#fff' : '#333',
                  border: '1px solid',
                  borderColor: isSelected ? '#137cbd' : '#ccc',
                  borderRadius: 3,
                }}
              >
                {formatMapName(idStr)}
              </button>
            )
          })}
        </div>
        <Popover
          isOpen={this.state.isOpen}
          onClose={() => this.setState({ isOpen: false, searchQuery: '' })}
          popoverClassName="map-selector-popover"
          usePortal={false}
          minimal
          content={this.renderPopoverContent()}
        >
          <div
            className="map-selector-trigger"
            onClick={() => this.setState({ isOpen: !this.state.isOpen })}
          >
            {selectedMaps.length > 0 ? (
              <div className="map-selector-trigger-tags">
                {selectedMaps.map(mapId => (
                  <Tag
                    key={mapId}
                    onRemove={(e) => { e.stopPropagation(); this.handleTagRemove(mapId) }}
                    minimal
                  >
                    {formatMapName(mapId)}
                  </Tag>
                ))}
              </div>
            ) : (
              <span className="map-selector-trigger-placeholder">{__('Click to select maps')}</span>
            )}
            <Button minimal icon="double-caret-vertical" style={{ minHeight: 24, flexShrink: 0 }} />
          </div>
        </Popover>
      </div>
    )
  }
}

const mapStateToProps = createSelector(
  [personalStatsSelector],
  (personalStats) => {
    const allMapIds = Object.keys(EXP_BY_POI_DB)
    const mapExpData = {}
    allMapIds.forEach(mapId => {
      const result = getMapExp(mapId, personalStats, 30)
      mapExpData[mapId] = result.exp || 0
    })
    return { mapExpData }
  }
)

export default connect(mapStateToProps)(MapSelector)
