import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'
import { Button, InputGroup, Tab, Tabs, Classes, Intent, Icon } from '@blueprintjs/core'
import { Popover } from 'views/components/etc/overlay'
import classnames from 'classnames'
import _ from 'lodash'
import Fuse from 'fuse.js'
import styled from 'styled-components'
import { shipMenuDataSelector, masterShipMenuDataSelector } from '../../utils/selectors'
import { catMap, searchOptions } from '../../utils/constants'

const { __ } = window.i18n['poi-plugin-leveling-plan']

// Styled Components
const Wrapper = styled.div`
  .bp5-tab-panel,
  .bp6-tab-panel {
    margin-top: 0;
  }
`

const ShipList = styled.ul`
  padding: 0;
  margin: 0;
  height: 30em;
  max-height: calc(100vh - 12em);
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
    mode: PropTypes.string,
  }

  constructor(props) {
    super(props)

    this.state = {
      query: '',
      selectedTab: 'all',
    }

    const fuseOptions = {
      keys: ['api_name', 'api_yomi'],
      shouldSort: true,
      threshold: 0.3,
      ignoreLocation: true,
    }
    this.fuse = new Fuse(props.ships, fuseOptions)
  }

  componentDidUpdate(prevProps) {
    if (this.props.ships !== prevProps.ships) {
      this.fuse.setCollection(this.props.ships)
    }
  }

  handleQueryChange = (e) => {
    this.setState({ query: e.target.value })
  }

  handleClear = () => {
    this.setState({ query: '' })
  }

  handleTabChange = (selectedTab) => {
    this.setState({ selectedTab })
  }

  handleSelect = (shipId) => () => {
    this.props.onSelect(shipId)
  }

  renderShipList(type, rankMap) {
    const { ships, mode } = this.props
    const isMaster = mode === 'master'
    const allowedStypes = type === 'all' ? null : (catMap[type] || [])

    const sortOrders = isMaster
      ? [
          ship => (rankMap ? rankMap.get(ship.api_id) : 0),
          ship => ship.api_name,
        ]
      : [
          ship => (rankMap ? rankMap.get(ship.api_id) : 0),
          ship => -ship.api_lv,
          ship => -ship.api_exp,
        ]

    return (
      <ShipList>
        {_(ships)
          .filter(ship => !allowedStypes || allowedStypes.includes(ship.api_stype))
          .filter(ship => !rankMap || rankMap.has(ship.api_id))
          .sortBy(sortOrders)
          .map(ship => (
            <ShipItem
              key={ship.api_id}
              onClick={this.handleSelect(ship.api_id)}
              className={classnames(
                Classes.POPOVER_DISMISS,
                Classes.MENU_ITEM
              )}
            >
              {!isMaster && <ShipLv>Lv.{ship.api_lv}</ShipLv>}
              <ShipName>{ship.api_name}</ShipName>
            </ShipItem>
          ))
          .value()}
      </ShipList>
    )
  }

  render() {
    const { query, selectedTab } = this.state

    let rankMap = null
    if (query) {
      rankMap = new Map()
      this.fuse.search(query).forEach((result, idx) => {
        rankMap.set(result.item.api_id, idx)
      })
    }

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
              <Icon icon="cross" />
            </Button>
          }
        />

        <Tabs
          vertical
          id="ship-selection"
          selectedTabId={selectedTab}
          onChange={this.handleTabChange}
          renderActiveTabPanelOnly
        >
          {searchOptions.map(({ name, value: type }) => (
            <Tab
              key={type}
              id={type}
              title={__(name)}
              panel={type === selectedTab ? this.renderShipList(type, rankMap) : null}
            />
          ))}
        </Tabs>
      </Wrapper>
    )
  }
}

// 舰船选择器主组件
class ShipSelectorImpl extends Component {
  static propTypes = {
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    onChange: PropTypes.func.isRequired,
    disabled: PropTypes.bool,
    placeholder: PropTypes.string,
    ships: PropTypes.array.isRequired,
    mode: PropTypes.string,
    portalContainer: PropTypes.object,
  }

  handleSelect = (shipId) => {
    this.props.onChange(shipId)
  }

  render() {
    const { value, disabled, placeholder, ships, mode, portalContainer } = this.props
    const isMaster = mode === 'master'

    const selectedShip = value 
      ? _.find(ships, s => s.api_id === parseInt(value))
      : null

    const buttonText = selectedShip
      ? (isMaster ? selectedShip.api_name : `${selectedShip.api_name} (Lv.${selectedShip.api_lv})`)
      : (placeholder || __('Select a ship'))

    return (
      <Popover
        content={<ShipSelectorMenu ships={ships} onSelect={this.handleSelect} mode={mode} />}
        disabled={disabled}
        usePortal={true}
        portalContainer={portalContainer}
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
    mode: 'instance',
  })
)

const mapStateToPropsMaster = createSelector(
  [masterShipMenuDataSelector],
  (ships) => ({
    ships,
    mode: 'master',
  })
)

const ShipSelector = connect(mapStateToProps)(ShipSelectorImpl)
const MasterShipSelector = connect(mapStateToPropsMaster)(ShipSelectorImpl)

export { ShipSelector as default, MasterShipSelector }
