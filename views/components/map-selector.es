import React, { Component } from 'react'
import { Button } from 'react-bootstrap'
import { Button as BpButton, MenuItem } from '@blueprintjs/core'
import { MultiSelect } from '@blueprintjs/select'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'
import _ from 'lodash'
import { frequentMaps, EXP_BY_POI_DB } from '../../utils/constants'
import { personalStatsSelector } from '../../utils/selectors'
import { getMapExp } from '../../utils/exp-calculator'
import { formatMapName } from '../../utils/plan-helpers'

const { __ } = window.i18n['poi-plugin-leveling-plan']

const MapMultiSelect = MultiSelect.ofType()

// 海图选择器组件
class MapSelector extends Component {
  constructor(props) {
    super(props)
    this.state = {
      isOpen: false
    }
  }

  toggleMap = (mapId) => {
    const { value = [], onChange } = this.props

    if (value.includes(mapId)) {
      // 取消选择
      onChange(value.filter(id => id !== mapId))
    } else {
      // 添加选择
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


  renderMap = (mapId, { handleClick, modifiers }) => {
    const { value = [] } = this.props
    const isSelected = value.includes(mapId)

    return (
      <MenuItem
        key={mapId}
        text={formatMapName(mapId)}
        onClick={handleClick}
        active={modifiers.active}
        shouldDismissPopover={false}
        icon={isSelected ? 'tick' : 'blank'}
      />
    )
  }

  renderTag = (mapId) => {
    return formatMapName(mapId)
  }

  render() {
    const { value = [], mapExpData } = this.props

    // 所有海图
    const allMapIds = Object.keys(EXP_BY_POI_DB)

    return (
      <div className="map-selector">
        {/* 快速选择按钮 */}
        <div className="quick-select-buttons">
          {/* 更多海图多选下拉框 */}
          <MapMultiSelect
            items={allMapIds}
            selectedItems={value.filter(id => allMapIds.includes(id))}
            onItemSelect={this.handleItemSelect}
            itemRenderer={this.renderMap}
            onClick={()=>this.setState({isOpen:!this.state.isOpen})}
            tagRenderer={this.renderTag}
            tagInputProps={{
              onRemove: this.handleTagRemove,
              placeholder: __('More maps'),
              rightElement: <BpButton minimal icon="caret-down" onClick={()=>this.setState({isOpen:!this.state.isOpen})}/>
            }}

            popoverProps={{
              minimal: true,
              usePortal: false,
              isOpen: this.state.isOpen,
            }}
          />
        </div>
      </div>
    )
  }
}

// Redux 连接
const mapStateToProps = createSelector(
  [personalStatsSelector],
  (personalStats) => {
    // 获取所有海图的经验数据
    const allMapIds = Object.keys(EXP_BY_POI_DB)
    const mapExpData = {}

    allMapIds.forEach(mapId => {
      mapExpData[mapId] = getMapExp(mapId, personalStats, 30)
    })

    return {
      mapExpData,
    }
  }
)

export default connect(mapStateToProps)(MapSelector)
