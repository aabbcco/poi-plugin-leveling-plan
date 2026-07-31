import classnames from 'classnames'
import PropTypes from 'prop-types'
import React, { Component } from 'react'
import { resolve } from 'path'
import { connect } from 'react-redux'
import { configSelector } from 'views/utils/selectors'
import { MaterialIcon } from 'views/components/etc/icon'
import _ from 'lodash'

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
    useSVGIcon: PropTypes.bool.isRequired,
  }

  static defaultProps = {
    className: '',
  }

  shouldComponentUpdate = nextProps => {
    if (!_.isEqual(nextProps, this.props)) return true
    const cachedVersion = window.config.get('plugin.poi-plugin-leveling-plan.useitemIconsMeta', 0)
    if (cachedVersion !== this._spritesheetVersion) {
      this._spritesheetVersion = cachedVersion
      return true
    }
    return false
  }

  getSpritesheetSrc = () => {
    try {
      return window.config.get('plugin.poi-plugin-leveling-plan.useitemIcons', null)?.[`common_itemicons_id_${this.props.useitemId}`]
    } catch (e) {
      return null
    }
  }

  render() {
    const { useitemId, className, useSVGIcon } = this.props
    const classNames = classnames(useSVGIcon ? 'svg' : 'png', className)

    const spritesheetSrc = this.getSpritesheetSrc()
    if (spritesheetSrc) {
      return (
        <img
          src={spritesheetSrc}
          alt={`useitem #${useitemId}`}
          className={classnames(classNames, 'useitem-icon')}
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
          className={classnames(classNames, 'useitem-icon', 'useitem-label')}
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
        className={classnames(classNames, 'useitem-icon')}
      />
    )
  }
}

const UseitemIcon = connect(
  state => ({
    useSVGIcon: _.get(configSelector(state), 'poi.useSVGIcon'),
  })
)(StaticUseitemIcon)

export { UseitemIcon }
