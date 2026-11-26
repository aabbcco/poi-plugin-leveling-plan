const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')

describe('bundled assets & i18n integrity', () => {
  it('validates assets/kaisou_materials.json schema', () => {
    const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/kaisou_materials.json'), 'utf8'))
    const entries = Object.entries(data)
    assert.ok(entries.length > 0)

    for (const [shipId, mat] of entries) {
      assert.match(shipId, /^\d+$/)
      assert.equal(typeof mat.ammo, 'number')
      assert.equal(typeof mat.steel, 'number')
      assert.ok(Array.isArray(mat.consumable))
      assert.ok(Array.isArray(mat.equipment))
      for (const pair of mat.consumable) {
        assert.equal(pair.length, 2)
        assert.equal(typeof pair[0], 'number')
        assert.ok(typeof pair[1] === 'number' && pair[1] > 0)
      }
    }
  })

  it('validates assets/initial_equip_ships.json schema', () => {
    const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/initial_equip_ships.json'), 'utf8'))
    const entries = Object.entries(data)
    assert.ok(entries.length > 0)

    for (const [equipId, providers] of entries) {
      assert.match(equipId, /^\d+$/)
      assert.ok(Array.isArray(providers))
      for (const item of providers) {
        assert.equal(typeof item.name, 'string')
        assert.ok(item.name.length > 0)
        assert.ok(typeof item.level === 'number' && item.level >= 1)
      }
    }
  })

  it('keeps all i18n locale files in sync with identical key sets', () => {
    const locales = ['en-US', 'zh-CN', 'zh-TW', 'ja-JP']
    const keySets = locales.map(locale => {
      const content = JSON.parse(fs.readFileSync(path.join(ROOT, 'i18n', `${locale}.json`), 'utf8'))
      return { locale, keys: Object.keys(content).sort(), content }
    })

    const base = keySets[0]
    for (const entry of keySets.slice(1)) {
      assert.deepEqual(entry.keys, base.keys, `i18n keys mismatch between ${base.locale} and ${entry.locale}`)
      for (const k of entry.keys) {
        assert.ok(typeof entry.content[k] === 'string' && entry.content[k].length > 0, `empty translation for ${entry.locale}.${k}`)
      }
    }
  })
})
