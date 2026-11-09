import test from 'node:test'
import assert from 'node:assert/strict'
import {
  emojiGroups,
  emojiSymbols,
  isEmojiSymbol,
  normalizeEmojiSearch,
} from '../types/emojis.ts'
import {
  backgrounds,
  appearancePalette,
  defaultAppearance,
  validAppearance,
  isDarkAppearance,
} from '../types/appearance.ts'
test('the expanded catalog contains unique, valid emoji and searchable Spanish labels', () => {
  assert.ok(emojiSymbols.length >= 200)
  assert.equal(new Set(emojiSymbols).size, emojiSymbols.length)
  for (const group of emojiGroups)
    for (const entry of group.items) {
      assert.ok(isEmojiSymbol(entry.emoji), entry.emoji)
      assert.ok(entry.label.trim())
    }
  assert.equal(normalizeEmojiSearch('  Graduación  '), 'graduacion')
})
test('custom emoji supports joined sequences, modifiers, flags and keycaps, rejecting ordinary text', () => {
  for (const symbol of ['🎂', '👩🏽‍💻', '👨‍👩‍👧‍👦', '🇪🇸', '1️⃣', '❤️‍🔥'])
    assert.ok(isEmojiSymbol(symbol), symbol)
  for (const symbol of [
    'work',
    'Trabajo',
    '<svg/>',
    '🎂🎉',
    'hola 🎂',
    '',
    '🎂 ',
  ])
    assert.equal(isEmojiSymbol(symbol), false, symbol)
})
test('appearance accepts only known choices and valid hex colors', () => {
  assert.ok(validAppearance(defaultAppearance))
  for (const bg of backgrounds)
    assert.ok(validAppearance({ ...defaultAppearance, background: bg.id }))
  assert.equal(
    validAppearance({ ...defaultAppearance, color: 'url(example.com)' }),
    false,
  )
  assert.equal(validAppearance({ ...defaultAppearance, motion: 'spin' }), false)
  assert.equal(
    isDarkAppearance({ ...defaultAppearance, background: 'night' }),
    true,
  )
  assert.equal(
    isDarkAppearance({
      ...defaultAppearance,
      background: 'custom',
      color: '#000000',
    }),
    true,
  )
  assert.equal(
    isDarkAppearance({
      ...defaultAppearance,
      background: 'custom',
      color: '#ffffff',
    }),
    false,
  )
})

test('each background supplies a matching card palette, including custom colors', () => {
  const ocean = appearancePalette({ ...defaultAppearance, background: 'ocean' })
  const sunrise = appearancePalette({
    ...defaultAppearance,
    background: 'sunrise',
  })
  assert.notEqual(ocean['--theme-card-start'], sunrise['--theme-card-start'])
  const custom = appearancePalette({
    ...defaultAppearance,
    background: 'custom',
    color: '#4a79b1',
  })
  assert.notEqual(custom['--theme-card-start'], ocean['--theme-card-start'])
  for (const color of ['#000000', '#ffffff', '#ff0000', '#2b3947']) {
    const palette = appearancePalette({
      ...defaultAppearance,
      background: 'custom',
      color,
    })
    for (const name of [
      '--theme-card-start',
      '--theme-card-end',
      '--theme-accent',
    ])
      assert.match(palette[name], /^#[0-9a-f]{6}$/i)
  }
})
