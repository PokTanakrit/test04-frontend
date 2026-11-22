import { describe, expect, it } from 'vitest'
import { example, flagSchema, toJson } from './flag-model'

describe('feature flag output', () => {
  it('matches the assignment example', () => {
    expect(JSON.parse(toJson(flagSchema.parse(example)))).toEqual({
      flags: {
        'my-new-feature': {
          variations: { on: true, off: false },
          targeting: [
            { query: "group == 'beta'", percentage: 50, variation: 'on' },
          ],
          defaultRule: { variation: 'off' },
        },
      },
    })
  })

  it('preserves nested grouping and variation references after a rename', () => {
    const flag = structuredClone(example)
    flag.variations[0].name = 'show'
    flag.enabled = false
    flag.description = 'New checkout'
    flag.rules[0].group.children.push({
      kind: 'group',
      id: 'nested',
      operator: 'or',
      children: [
        { kind: 'condition', id: 'admin', attribute: 'role', value: 'admin' },
        { kind: 'condition', id: 'staff', attribute: 'role', value: 'staff' },
      ],
    })
    expect(
      JSON.parse(toJson(flagSchema.parse(flag))).flags['my-new-feature'],
    ).toMatchObject({
      disable: true,
      metadata: { description: 'New checkout' },
      targeting: [
        {
          query: "group == 'beta' && (role == 'admin' || role == 'staff')",
          variation: 'show',
        },
      ],
    })
  })

  it('points to invalid nested conditions and deleted variations', () => {
    const flag = structuredClone(example)
    flag.rules[0].group.children = [
      { kind: 'group', id: 'nested', operator: 'or', children: [] },
    ]
    expect(flagSchema.safeParse(flag).error?.issues[0].path).toEqual([
      'rules',
      0,
      'group',
      'children',
      0,
      'children',
    ])
    flag.rules[0].group = example.rules[0].group
    flag.variations.shift()
    expect(flagSchema.safeParse(flag).error?.issues[0].path).toEqual([
      'rules',
      0,
      'variation',
    ])
  })
})
