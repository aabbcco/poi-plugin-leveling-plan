import React, { Component } from 'react'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'
import { Card, Button, InputGroup, Tag, Collapse, Classes, Icon } from '@blueprintjs/core'
import { SlotitemIcon } from 'views/components/etc/icon'
import Fuse from 'fuse.js'
import { equipListSelector, $equipTypesSelector } from '../../utils/selectors'
import { MAX_LEVEL } from '../../utils/constants'

const { __ } = window.i18n['poi-plugin-leveling-plan']

class EquipShipSelector extends Component {
  constructor(props) {
    super(props)
    const targetsMap = this.buildTargetsMap(props.selectedTargets, props.equipList)

    this.state = {
      search: '',
      selectedTypeIds: new Set(),
      expandedEquipIds: new Set(),
      targets: targetsMap,
      batchLevel: '',
    }

    const fuseOptions = {
      keys: ['name', 'typeName'],
      shouldSort: true,
      threshold: 0.4,
      ignoreLocation: true,
    }
    this.fuse = new Fuse([], fuseOptions)
    this._typesCache = null
    this._groupsCache = null
  }

  buildShipLookup(equipList) {
    const lookup = {}
    if (!equipList) return lookup
    equipList.forEach(eq => {
      eq.ships.forEach(s => {
        if (!lookup[s.shipId]) {
          lookup[s.shipId] = { shipName: s.shipName, providerId: s.providerId, providerName: s.providerName }
        }
      })
    })
    return lookup
  }

  buildTargetsMap(selectedTargets, equipList) {
    const map = {}
    if (!selectedTargets || !selectedTargets.length) return map
    const shipLookup = this.buildShipLookup(equipList)
    selectedTargets.forEach(t => {
      const s = shipLookup[t.shipMasterId]
      map[t.shipMasterId] = {
        shipMasterId: t.shipMasterId,
        shipName: s ? s.shipName : `Ship#${t.shipMasterId}`,
        providerId: s ? s.providerId : t.shipMasterId,
        providerName: s ? s.providerName : '',
        targetLevel: t.targetLevel || 50,
      }
    })
    return map
  }

  componentDidMount() {
    this.updateFuseCollection(this.props.equipList)
  }

  componentDidUpdate(prevProps) {
    if (this.props.equipList !== prevProps.equipList) {
      this.updateFuseCollection(this.props.equipList)
    }

    // 仅在 equipList 从空异步加载完成后回填已有目标的舰船名称
    const equipLoaded = this.props.equipList && this.props.equipList.length > 0
    const prevLoaded = prevProps.equipList && prevProps.equipList.length > 0

    if (!prevLoaded && equipLoaded) {
      const targetsMap = this.buildTargetsMap(this.props.selectedTargets, this.props.equipList)
      this.setState(prev => {
        const merged = { ...prev.targets }
        Object.entries(targetsMap).forEach(([id, t]) => {
          if (!merged[id]) {
            merged[id] = t
          } else {
            merged[id] = { ...merged[id], shipName: t.shipName, providerName: t.providerName }
          }
        })
        return { targets: merged }
      })
    }
  }

  updateFuseCollection = (equipList) => {
    this.fuse.setCollection(equipList || [])
  }

  getAvailableTypes(equipList, $equipTypes) {
    if (
      this._typesCache &&
      this._typesCache.equipList === equipList &&
      this._typesCache.$equipTypes === $equipTypes
    ) {
      return this._typesCache.result
    }

    const availableTypesMap = {}
    equipList.forEach(eq => {
      const tId = eq.typeId || 999
      if (!availableTypesMap[tId]) {
        const typeInfo = $equipTypes[tId]
        availableTypesMap[tId] = {
          id: tId,
          name: typeInfo ? typeInfo.api_name : 'Others',
          iconId: eq.iconId,
        }
      }
    })
    const result = Object.values(availableTypesMap).sort((a, b) => a.id - b.id)
    this._typesCache = { equipList, $equipTypes, result }
    return result
  }

  getGroupedEquipment(equipList, search, selectedTypeIds) {
    if (
      this._groupsCache &&
      this._groupsCache.equipList === equipList &&
      this._groupsCache.search === search &&
      this._groupsCache.selectedTypeIds === selectedTypeIds
    ) {
      return this._groupsCache.result
    }

    let filtered = equipList
    if (search) {
      const results = this.fuse.search(search)
      filtered = results.map(r => r.item)
    }

    if (selectedTypeIds.size > 0) {
      filtered = filtered.filter(eq => selectedTypeIds.has(eq.typeId || 999))
    }

    const groups = {}
    filtered.forEach(eq => {
      const typeId = eq.typeId || 999
      if (!groups[typeId]) groups[typeId] = []
      groups[typeId].push(eq)
    })
    const sortedTypeIds = Object.keys(groups).sort((a, b) => parseInt(a, 10) - parseInt(b, 10))

    const result = { groups, sortedTypeIds }
    this._groupsCache = { equipList, search, selectedTypeIds, result }
    return result
  }

  handleSearchChange = (e) => {
    this.setState({ search: e.target.value })
  }

  handleTypeToggle = (typeId) => {
    this.setState(prev => {
      const next = new Set(prev.selectedTypeIds)
      if (next.has(typeId)) {
        next.delete(typeId)
      } else {
        next.add(typeId)
      }
      return { selectedTypeIds: next }
    })
  }

  handleExpandToggle = (equipId) => {
    this.setState(prev => {
      const next = new Set(prev.expandedEquipIds)
      if (next.has(equipId)) {
        next.delete(equipId)
      } else {
        next.add(equipId)
      }
      return { expandedEquipIds: next }
    })
  }

  handleCheckShip = (shipMasterId, shipName, providerId, providerName) => {
    const { targets, batchLevel } = this.state
    const nextTargets = { ...targets }
    if (nextTargets[shipMasterId]) {
      delete nextTargets[shipMasterId]
    } else {
      nextTargets[shipMasterId] = {
        shipMasterId,
        shipName,
        providerId,
        providerName,
        targetLevel: parseInt(batchLevel, 10) || 50,
      }
    }
    this.setState({ targets: nextTargets })
    this.notifyChange(nextTargets)
  }

  handleTargetLevelChange = (shipMasterId, value) => {
    const { targets } = this.state
    if (!targets[shipMasterId]) return
    const level = parseInt(value, 10)
    const nextTargets = {
      ...targets,
      [shipMasterId]: {
        ...targets[shipMasterId],
        targetLevel: Number.isNaN(level) ? 0 : level,
      },
    }
    this.setState({ targets: nextTargets })
    this.notifyChange(nextTargets)
  }

  handleRemoveTarget = (shipMasterId) => {
    const { targets } = this.state
    if (!targets[shipMasterId]) return
    const nextTargets = { ...targets }
    delete nextTargets[shipMasterId]
    this.setState({ targets: nextTargets })
    this.notifyChange(nextTargets)
  }

  handleBatchLevelChange = (e) => {
    this.setState({ batchLevel: e.target.value })
  }

  handleApplyBatchLevel = () => {
    const { batchLevel, targets } = this.state
    const level = parseInt(batchLevel, 10)
    if (isNaN(level) || level < 1 || level > MAX_LEVEL) {
      this.setState({ batchLevel: '' })
      return
    }
    const nextTargets = {}
    Object.values(targets).forEach(t => {
      nextTargets[t.shipMasterId] = { ...t, targetLevel: level }
    })
    this.setState({ targets: nextTargets })
    this.notifyChange(nextTargets)
  }

  notifyChange = (targets) => {
    const { onChange } = this.props
    if (onChange) {
      onChange(Object.values(targets).map(t => ({
        shipMasterId: t.shipMasterId,
        targetLevel: t.targetLevel,
      })))
    }
  }

  render() {
    const { equipList, $equipTypes } = this.props
    const { search, selectedTypeIds, expandedEquipIds, targets, batchLevel } = this.state

    if (!equipList || equipList.length === 0) {
      return (
        <div className={Classes.TEXT_MUTED} style={{ padding: 10, textAlign: 'center' }}>
          {__('No equipment data. Try syncing in Settings.')}
        </div>
      )
    }

    const availableTypes = this.getAvailableTypes(equipList, $equipTypes)
    const { groups, sortedTypeIds } = this.getGroupedEquipment(equipList, search, selectedTypeIds)

    const selectedTargetList = Object.values(targets)

    return (
      <div className="equip-ship-selector" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Top: Search + Type Filter */}
        <div style={{ flexShrink: 0, marginBottom: 8 }}>
          <InputGroup
            leftIcon="search"
            placeholder={__('Search equipment...')}
            value={search}
            onChange={this.handleSearchChange}
            style={{ marginBottom: 8 }}
          />
          <div className="type-filter-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(56px, 1fr))',
            gap: 4,
            maxHeight: 100,
            overflowY: 'auto',
          }}>
            {availableTypes.map(t => {
              const isSelected = selectedTypeIds.has(t.id)
              return (
                <div
                  key={t.id}
                  onClick={() => this.handleTypeToggle(t.id)}
                  title={t.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    opacity: isSelected ? 1 : 0.45,
                    padding: '2px 2px',
                    borderRadius: 3,
                    background: isSelected ? 'rgba(33, 150, 243, 0.12)' : 'transparent',
                  }}
                >
                  <div style={{
                    width: 14, height: 14,
                    border: '1px solid rgba(255,255,255,0.3)',
                    background: isSelected ? '#2196F3' : 'transparent',
                    marginRight: 6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 2,
                    flexShrink: 0,
                  }}>
                    {isSelected && <span style={{ color: '#fff', fontSize: 10 }}>✓</span>}
                  </div>
                  <div className="equip-icon-wrapper" style={{ width: 32, height: 32 }}>
                    <SlotitemIcon slotitemId={t.iconId} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Middle: Equipment List */}
        <div className="equip-list-scroll" style={{
          flex: 1,
          overflowY: 'auto',
          minHeight: 0,
          marginBottom: 8,
        }}>
          {sortedTypeIds.map(typeId => (
            <div key={typeId} className="type-group">
              {groups[typeId].map(eq => {
                const isExpanded = expandedEquipIds.has(eq.id)
                return (
                  <Card key={eq.id} elevation={0} style={{
                    marginBottom: 4,
                    padding: 6,
                    borderRadius: 3,
                  }}>
                    <div
                      style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                      onClick={() => this.handleExpandToggle(eq.id)}
                    >
                      <div className="equip-icon-wrapper" style={{ width: 36, height: 36, marginRight: 8 }}>
                        <SlotitemIcon slotitemId={eq.iconId} />
                      </div>
                      <div style={{ flex: 1, fontSize: '0.9em' }}>
                        {eq.name}
                      </div>
                      <div style={{ fontSize: '0.75em', opacity: 0.5, marginRight: 4 }}>
                        {eq.ships.length}
                      </div>
                      <Icon icon={isExpanded ? 'chevron-up' : 'chevron-down'} />
                    </div>
                    <Collapse isOpen={isExpanded}>
                      <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                        {eq.ships.map((s) => {
                          const isChecked = !!targets[s.shipId]
                          const target = targets[s.shipId]
                          return (
                            <div
                              key={`${s.shipId}-${s.providerId}`}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '3px 6px',
                                marginBottom: 2,
                                background: isChecked ? 'rgba(33, 150, 243, 0.12)' : 'transparent',
                                borderRadius: 3,
                                gap: 6,
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => this.handleCheckShip(
                                  s.shipId, s.shipName, s.providerId, s.providerName
                                )}
                                style={{ flexShrink: 0 }}
                              />
                              <span style={{ flex: 1, fontSize: '0.85em' }}>
                                {s.shipName || s.providerName}
                              </span>
                              <Tag minimal style={{ fontSize: '0.7em' }}>
                                Lv.{s.level}
                              </Tag>
                              {isChecked && (
                                <input
                                  type="number"
                                  value={target ? target.targetLevel : ''}
                                  onChange={(e) => this.handleTargetLevelChange(s.shipId, e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  min={1}
                                  max={MAX_LEVEL}
                                  style={{
                                    width: 50,
                                    height: 22,
                                    fontSize: '0.8em',
                                    textAlign: 'center',
                                    borderRadius: 3,
                                  }}
                                />
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </Collapse>
                  </Card>
                )
              })}
            </div>
          ))}
          {sortedTypeIds.length === 0 && (
            <div className={Classes.TEXT_MUTED} style={{ textAlign: 'center', padding: 20 }}>
              {__('No equipment matches filter.')}
            </div>
          )}
        </div>

        {/* Bottom: Selected Targets Summary */}
        {selectedTargetList.length > 0 && (
          <div style={{
            flexShrink: 0,
            borderTop: '1px solid rgba(255,255,255,0.1)',
            paddingTop: 8,
            marginTop: 4,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6, gap: 6 }}>
              <span style={{ fontSize: '0.85em', fontWeight: 'bold' }}>
                {__('Selected')} ({selectedTargetList.length}):
              </span>
              <input
                type="number"
                value={batchLevel}
                onChange={this.handleBatchLevelChange}
                placeholder={__('Target Level')}
                min={1}
                max={MAX_LEVEL}
                style={{
                  width: 60,
                  height: 24,
                  fontSize: '0.8em',
                  textAlign: 'center',
                  borderRadius: 3,
                }}
              />
              <Button
                className={Classes.SMALL}
                onClick={this.handleApplyBatchLevel}
                disabled={!batchLevel}
              >
                {__('Apply All')}
              </Button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {selectedTargetList.map(t => (
                <Tag
                  key={t.shipMasterId}
                  onRemove={() => this.handleRemoveTarget(t.shipMasterId)}
                  style={{ fontSize: '0.8em' }}
                >
                  {t.shipName} → Lv.{t.targetLevel}
                </Tag>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }
}

const mapStateToProps = createSelector(
  [equipListSelector, $equipTypesSelector],
  (equipList, $equipTypes) => ({
    equipList,
    $equipTypes,
  })
)

export default connect(mapStateToProps)(EquipShipSelector)
