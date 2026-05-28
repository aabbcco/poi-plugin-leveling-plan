import classnames from 'classnames'
import PropTypes from 'prop-types'
import React, { Component } from 'react'
import { resolve } from 'path'
import { connect } from 'react-redux'
import { configSelector } from 'views/utils/selectors'
import _ from 'lodash'

const fallback = resolve(__dirname, '../../assets/icon/useitem.svg')

// 有图标文件的 useitem id 集合（75/77/78/94 命名正确，其余 fallback）
const AVAILABLE_ICONS = new Set([75, 77, 78, 94])

class StaticUseitemIcon extends Component {
  static propTypes = {
    useitemId: PropTypes.number.isRequired,
    className: PropTypes.string,
    useSVGIcon: PropTypes.bool.isRequired,
  }

  static defaultProps = {
    className: '',
  }

  shouldComponentUpdate = nextProps =>
    !_.isEqual(nextProps, this.props)

  render() {
    const { useitemId, className, useSVGIcon } = this.props
    const classNames = classnames(
      useSVGIcon ? 'svg' : 'png',
      className
    )
    let _src = fallback

    try {
      if (AVAILABLE_ICONS.has(useitemId)) {
        _src = resolve(__dirname, `../../assets/icon/${useitemId}.png`)
      }
    } catch (e) {
      _src = fallback
    }
    return (
      <img
        src={_src}
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
