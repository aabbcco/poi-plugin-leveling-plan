import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'
import { Button, InputGroup, Tab, Tabs, Classes, Intent } from '@blueprintjs/core'
import { Popover } from 'views/components/etc/overlay'
import classnames from 'classnames'
import _ from 'lodash'
import Fuse from 'fuse.js'
import FA from 'react-fontawesome'
import styled from 'styled-components'
import { shipMenuDataSelector } from '../../utils/selectors'
import { catMap, searchOptions } from '../../utils/constants'

const { __ } = window.i18n['poi-plugin-leveling-plan']

// Styled Components
const Wrapper = styled.div`
  .bp3-tab-panel {
    margin-top: 0;
  }
`

const ShipList = styled.ul`
  padding: 0;
  margin: 0;
  height: 30em;
  overflow-y: scroll;
  width: 20em;
  
  span {
    cursor: pointer;
  }
`

const ShipItem = styled.li`
  display: flex;
  padding: 0.5em 1em;
`

const ShipLv = styled.span`
  width: 4em;
`

const ShipName = styled.span`
  flex: 1;
`

// 舰船选择菜单组件
class ShipSelectorMenu extends Component {
  static propTypes = {
    ships: PropTypes.array.isRequired,
    onSelect: PropTypes.func.isRequired,
  }

  constructor(props) {
    super(props)
    
    this.state = {
      query: '',
    }
    
    // 初始化 Fuse.js
    const fuseOptions = {
      keys: ['api_name', 'api_yomi'],
      shouldSort: true,
      threshold: 0.3,
      ignoreLocation: true,
    }
    this.fuse = new Fuse(props.ships, fuseOptions)
  }

  componentDidUpdate(prevProps) {
    if (this.props.ships.length !== prevProps.ships.length) {
      this.fuse.setCollection(this.props.ships)
    }
  }

  handleQueryChange = (e) => {
    this.setState({ query: e.target.value })
  }

  handleClear = () => {
    this.setState({ query: '' })
  }

  handleSelect = (shipId) => () => {
    this.props.onSelect(shipId)
  }

  render() {
    const { query } = this.state
    const { ships } = this.props

    // 搜索过滤
    const filtered = query 
      ? _.map(this.fuse.search(query), result => result.item.api_id)
      : []

    return (
      <Wrapper>
        <InputGroup
          value={query}
          placeholder={__('Search')}
          onChange={this.handleQueryChange}
          rightElement={
            <Button
              minimal
              onClick={this.handleClear}
              intent={Intent.WARNING}
            >
              <FA name="times" />
            </Button>
          }
        />
        
        <Tabs vertical id="ship-selection" renderActiveTabPanelOnly>
          {searchOptions.map(({ name, value: type }) => (
            <Tab
              key={type}
              id={type}
              title={__(name)}
              panel={
                <ShipList>
                  {_(ships)
                    .filter(ship => 
                      type === 'all' || (catMap[type] || []).includes(ship.api_stype)
                    )
                    .filter(ship => 
                      !query || filtered.includes(ship.api_id)
                    )
                    .sortBy([
                      ship => query ? filtered.indexOf(ship.api_id) : 0,
                      ship => -ship.api_lv,
                      ship => -ship.api_exp,
                    ])
                    .map(ship => (
                      <ShipItem
                        key={ship.api_id}
                        onClick={this.handleSelect(ship.api_id)}
                        className={classnames(
                          Classes.POPOVER_DISMISS,
                          Classes.MENU_ITEM
                        )}
                      >
                        <ShipLv>Lv.{ship.api_lv}</ShipLv>
                        <ShipName>{ship.api_name}</ShipName>
                      </ShipItem>
                    ))
                    .value()}
                </ShipList>
              }
            />
          ))}
        </Tabs>
      </Wrapper>
    )
  }
}

// 舰船选择器主组件
class ShipSelector extends Component {
  static propTypes = {
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    onChange: PropTypes.func.isRequired,
    disabled: PropTypes.bool,
    placeholder: PropTypes.string,
    ships: PropTypes.array.isRequired,
  }

  handleSelect = (shipId) => {
    this.props.onChange(shipId)
  }

  render() {
    const { value, disabled, placeholder, ships } = this.props

    // 查找当前选中的舰船
    const selectedShip = value 
      ? _.find(ships, s => s.api_id === parseInt(value))
      : null

    const buttonText = selectedShip
      ? `${selectedShip.api_name} (Lv.${selectedShip.api_lv})`
      : (placeholder || __('Select a ship'))

    return (
      <Popover
        content={<ShipSelectorMenu ships={ships} onSelect={this.handleSelect} />}
        disabled={disabled}
        usePortal={true}
        portalClassName="ship-selector-portal"
      >
        <Button
          disabled={disabled}
          text={buttonText}
          rightIcon="caret-down"
          fill
        />
      </Popover>
    )
  }
}

// Redux 连接
const mapStateToProps = createSelector(
  [shipMenuDataSelector],
  (ships) => ({
    ships,
  })
)

export default connect(mapStateToProps)(ShipSelector)
