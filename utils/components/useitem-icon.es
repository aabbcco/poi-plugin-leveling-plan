import classnames from 'classnames'
import PropTypes from 'prop-types'
import React, { Component } from 'react'
import { resolve } from 'path'
import { connect } from 'react-redux'
import { MaterialIcon } from 'views/components/etc/icon'
import _ from 'lodash'
import { getUseitemIcon, initUseitemIcons } from '../../services/useitem-icons'

const fallback = resolve(__dirname, '../../assets/icon/useitem.svg')

const MATERIAL_MAP = {
  1: 6,
  2: 5,
  3: 7,
  4: 8,
}

const LABEL_MAP = {
  58: '図',
  65: '甲',
  100: '技',
  899: '缶',
}

class StaticUseitemIcon extends Component {
  static propTypes = {
    useitemId: PropTypes.number.isRequired,
    className: PropTypes.string,
    serverIp: PropTypes.string,
  }

  static defaultProps = {
    className: '',
  }

  state = {
    spritesheetLoaded: false,
  }

  componentDidMount() {
    this.loadSpritesheet()
  }

  componentDidUpdate(prevProps) {
    if (!_.isEqual(prevProps, this.props)) {
      this.loadSpritesheet()
    }
  }

  componentWillUnmount() {
    this.unmounted = true
  }

  loadSpritesheet = () => {
    const { serverIp } = this.props
    if (!serverIp || MATERIAL_MAP[this.props.useitemId] !== undefined) return

    const loadKey = `${serverIp}:${this.props.useitemId}`
    if (this.loadKey === loadKey) return
    this.loadKey = loadKey

    initUseitemIcons(serverIp).then(() => {
      if (!this.unmounted && this.loadKey === loadKey) {
        this.setState({ spritesheetLoaded: true })
      }
    })
  }

  getSpritesheetSrc = () => {
    return getUseitemIcon(this.props.useitemId)
  }

  render() {
    const { useitemId, className } = this.props
    const spritesheetSrc = this.getSpritesheetSrc()
    if (spritesheetSrc) {
      return (
        <img
          src={spritesheetSrc}
          alt={`useitem #${useitemId}`}
          className={classnames('png', className, 'useitem-icon')}
        />
      )
    }

    if (MATERIAL_MAP[useitemId] !== undefined) {
      return (
        <MaterialIcon
          materialId={MATERIAL_MAP[useitemId]}
          className={className}
        />
      )
    }

    if (LABEL_MAP[useitemId]) {
      return (
        <span
          className={classnames('png', className, 'useitem-icon', 'useitem-label')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 18,
            height: 18,
            fontSize: 10,
            fontWeight: 'bold',
            color: '#888',
            border: '1px solid #888',
            borderRadius: 3,
            opacity: 0.7,
          }}
        >
          {LABEL_MAP[useitemId]}
        </span>
      )
    }

    return (
      <img
        src={fallback}
        alt={`useitem #${useitemId}`}
        className={classnames('svg', className, 'useitem-icon')}
      />
    )
  }
}

const UseitemIcon = connect(
  state => ({
    serverIp: _.get(state, 'info.server.ip', ''),
  })
)(StaticUseitemIcon)

export { UseitemIcon }
