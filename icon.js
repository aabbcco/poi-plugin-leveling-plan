"use strict";

exports.__esModule = true;
exports.SlotitemIcon = exports.MaterialIcon = void 0;
var _fsExtra = _interopRequireDefault(require("fs-extra"));
var _classnames = _interopRequireDefault(require("classnames"));
var _react = _interopRequireWildcard(require("react"));
var _propTypes = _interopRequireDefault(require("prop-types"));
var _lodash = require("lodash");
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
/* global ROOT, config */

const getClassName = (props, isSVG) => {
  const type = isSVG ? 'svg' : 'png';
  return (0, _classnames.default)(type, props);
};
class iconConf {
  constructor() {
    this.callbacks = new Map();
    this.unassignedKey = 1;
  }
  setConf = val => this.callbacks.forEach(f => f(val));
  reg = func => {
    const key = this.unassignedKey;
    ++this.unassignedKey;
    this.callbacks.set(key, func);
    return key;
  };
  unreg = key => this.callbacks.delete(key);
}
const iconConfSetter = new iconConf();
const setIcon = (path, val) => {
  if (path === 'poi.appearance.svgicon') {
    iconConfSetter.setConf(val);
  }
};
config.addListener('config.set', setIcon);
window.addEventListener('unload', e => {
  config.removeListener('config.set', setIcon);
});

/*
   getAvailableSlotitemIconPath(slotitemId : int)(useSVGIcon : bool) : string | null

   check availability of a slotitem path, return the path if it's available, or null if not.
 */
const getAvailableSlotitemIconPath = (0, _lodash.memoize)(slotitemId => (0, _lodash.memoize)(useSVGIcon => {
  try {
    const path = useSVGIcon ? /* SVG path */
    `${ROOT}/assets/svg/slotitem/${slotitemId}.svg` : /* PNG path */
    `${ROOT}/assets/img/slotitem/${slotitemId + 100}.png`;
    _fsExtra.default.statSync(path);
    return path;
  } catch (_e) {
    return null;
  }
}));
class SlotitemIcon extends _react.PureComponent {
  static propTypes = {
    slotitemId: _propTypes.default.number,
    className: _propTypes.default.string,
    alt: _propTypes.default.string
  };
  state = {
    useSVGIcon: config.get('poi.appearance.svgicon', false)
  };
  name = 'SlotitemIcon';
  setUseSvg = useSVGIcon => this.setState({
    useSVGIcon
  });
  componentDidMount = () => {
    this.key = iconConfSetter.reg(this.setUseSvg);
  };
  componentWillUnmount = () => iconConfSetter.unreg(this.key);
  render() {
    const {
      alt,
      slotitemId,
      className
    } = this.props;
    const {
      useSVGIcon
    } = this.state;
    const maybeIconPath = getAvailableSlotitemIconPath(slotitemId)(useSVGIcon);
    const path = maybeIconPath || (/* icon path not available, using fallback img */
    useSVGIcon ? `${ROOT}/assets/svg/slotitem/-1.svg` : `${ROOT}/assets/img/slotitem/-1.png`);
    return /*#__PURE__*/_react.default.createElement("img", {
      alt: alt,
      src: `file://${path}`,
      className: getClassName(className, useSVGIcon)
    });
  }
}
exports.SlotitemIcon = SlotitemIcon;
class MaterialIcon extends _react.PureComponent {
  static propTypes = {
    materialId: _propTypes.default.number,
    className: _propTypes.default.string,
    alt: _propTypes.default.string
  };
  state = {
    useSVGIcon: config.get('poi.appearance.svgicon', false)
  };
  name = 'MaterialIcon';
  setUseSvg = useSVGIcon => this.setState({
    useSVGIcon
  });
  componentDidMount = () => {
    this.key = iconConfSetter.reg(this.setUseSvg);
  };
  componentWillUnmount = () => iconConfSetter.unreg(this.key);
  render() {
    const {
      className,
      alt
    } = this.props;
    const {
      useSVGIcon
    } = this.state;
    return /*#__PURE__*/_react.default.createElement("img", {
      alt: alt,
      src: useSVGIcon ? /* SVG URI */`file://${ROOT}/assets/svg/material/${this.props.materialId}.svg` : /* PNG URI */`file://${ROOT}/assets/img/material/0${this.props.materialId}.png`,
      className: getClassName(className, useSVGIcon)
    });
  }
}
exports.MaterialIcon = MaterialIcon;