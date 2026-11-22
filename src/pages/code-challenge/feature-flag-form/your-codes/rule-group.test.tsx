// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import type { ComponentType } from 'react'
import type * as React from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { RuleGroup } from './rule-group'
import type { Group } from './flag-model'

const { commits } = vi.hoisted(() => ({ commits: vi.fn() }))

// Profile each recursive editor without adding profiling code to production.
vi.mock('react', async (importOriginal) => {
  const react = await importOriginal<typeof React>()
  return {
    ...react,
    memo: (component: ComponentType<{ group: Group }>) => {
      if (component.name !== 'RuleGroupEditor') return react.memo(component)
      return react.memo((props: { group: Group }) => (
        <react.Profiler id={props.group.id} onRender={commits}>
          {react.createElement(component, props)}
        </react.Profiler>
      ))
    },
  }
})

afterEach(cleanup)

it('does not render an unchanged sibling group when another group changes', () => {
  const child = (id: string): Group => ({
    kind: 'group',
    id,
    operator: 'and',
    children: [
      {
        kind: 'condition',
        id: `${id}-condition`,
        attribute: 'role',
        value: id,
      },
    ],
  })
  function Harness() {
    const [group, setGroup] = useState<Group>({
      kind: 'group',
      id: 'root',
      operator: 'and',
      children: [child('first'), child('sibling')],
    })
    return <RuleGroup group={group} onChange={setGroup} />
  }
  render(<Harness />)
  commits.mockClear()
  fireEvent.change(screen.getAllByLabelText('Role name')[0], {
    target: { value: 'admin' },
  })
  expect(commits.mock.calls.some(([id]) => id === 'first')).toBe(true)
  expect(commits.mock.calls.filter(([id]) => id === 'sibling')).toHaveLength(0)
  fireEvent.change(screen.getAllByLabelText('Role name')[1], {
    target: { value: 'staff' },
  })
  expect(
    screen
      .getAllByLabelText<HTMLInputElement>('Role name')
      .map((input) => input.value),
  ).toEqual(['admin', 'staff'])
})
