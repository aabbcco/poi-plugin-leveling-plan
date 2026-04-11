import React, { Component } from 'react'
import { Button as BpButton, MenuItem, Tab, Tabs } from '@blueprintjs/core'
import { MultiSelect } from '@blueprintjs/select'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'
import _ from 'lodash'
import { EXP_BY_POI_DB } from '../../utils/constants'
import { personalStatsSelector } from '../../utils/selectors'
import { getMapExp } from '../../utils/exp-calculator'
import { formatMapName } from '../../utils/plan-helpers'

const { __ } = window.i18n['poi-plugin-leveling-plan']

const MapMultiSelect = MultiSelect.ofType()

// 按世界分组
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
      activeWorld: null,
    }
    this.worldGroups = getWorldGroups()
    const worlds = Object.keys(this.worldGroups).sort((a, b) => Number(a) - Number(b))
    this.state.activeWorld = worlds[0] || null
  }

  toggleMap = (mapId) => {
    const { value = [], onChange } = this.props
    if (value.includes(mapId)) {
      onChange(value.filter(id => id !== mapId))
    } else {
      onChange([...value, mapId])
    }
  }

  handleItemSelect = (mapId) => {
    this.toggleMap(mapId)
  }

  handleTagRemove = (mapId) => {
    const { value = [], onChange } = this.props
    onChange(value.filter(id => id !== mapId))
  }

  renderTag = (mapId) => {
    return formatMapName(mapId)
  }

  renderPopoverContent = () => {
    const { value = [] } = this.props
    const { activeWorld } = this.state
    const worlds = Object.keys(this.worldGroups).sort((a, b) => Number(a) - Number(b))

    return (
      <div className="map-selector-tabs">
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
              title={`${world}`}
              panel={
                <div className="map-selector-tab-panel">
                  {this.worldGroups[world].map(mapId => {
                    const isSelected = value.includes(mapId)
                    return (
                      <MenuItem
                        key={mapId}
                        text={formatMapName(mapId)}
                        icon={isSelected ? 'tick' : 'blank'}
                        onClick={() => this.toggleMap(mapId)}
                        shouldDismissPopover={false}
                      />
                    )
                  })}
                </div>
              }
            />
          ))}
        </Tabs>
      </div>
    )
  }

  render() {
    const { value = [] } = this.props
    const allMapIds = Object.keys(EXP_BY_POI_DB)

    return (
      <div className="map-selector">
        <div className="quick-select-buttons">
          <MapMultiSelect
            items={allMapIds}
            selectedItems={value.filter(id => allMapIds.includes(id))}
            onItemSelect={this.handleItemSelect}
            itemRenderer={() => null}
            itemListRenderer={() => this.renderPopoverContent()}
            tagRenderer={this.renderTag}
            tagInputProps={{
              onRemove: this.handleTagRemove,
              placeholder: __('More maps'),
              rightElement: (
                <BpButton
                  minimal
                  icon="caret-down"
                  onClick={() => this.setState({ isOpen: !this.state.isOpen })}
                />
              ),
            }}
            popoverProps={{
              minimal: true,
              usePortal: false,
              isOpen: this.state.isOpen,
              onClose: () => this.setState({ isOpen: false }),
              popoverClassName: 'map-selector-popover',
            }}
          />
        </div>
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
