// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import YourCode from './index'

// Monaco's worker and layout APIs need a browser. Keep its value contract here;
// the editor's real loading and rendering are checked separately in the browser.
vi.mock('@monaco-editor/react', () => ({
  Editor: ({ value }: { value: string }) => (
    <pre aria-label="JSON preview">{value}</pre>
  ),
}))

afterEach(cleanup)

function preview() {
  return JSON.parse(screen.getByLabelText('JSON preview').textContent)
}

describe('feature flag editor', () => {
  it('keeps the status switch actionable in both states and updates the preview', () => {
    render(<YourCode />)
    const toggle = screen.getByRole('switch', { name: 'Enable flag' })
    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-checked')).toBe('false')
    expect(within(toggle).getByText('Disabled')).toBeDefined()
    expect(preview().flags['my-new-feature'].disable).toBe(true)
    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-checked')).toBe('true')
    expect(within(toggle).getByText('Enabled')).toBeDefined()
    expect(preview().flags['my-new-feature'].disable).toBeUndefined()
  })

  it('updates nested roles immediately, validates on blur, and recovers while typing', () => {
    render(<YourCode />)
    fireEvent.click(screen.getByRole('button', { name: 'Add nested group' }))
    const nested = screen.getAllByRole('group', { name: 'Condition group' })[1]
    fireEvent.change(within(nested).getByLabelText('Match conditions'), {
      target: { value: 'or' },
    })
    fireEvent.click(
      within(nested).getByRole('button', { name: 'Add condition' }),
    )
    fireEvent.change(within(nested).getByLabelText('Condition attribute'), {
      target: { value: 'role' },
    })
    const role = within(nested).getByLabelText('Role name')
    fireEvent.change(role, { target: { value: 'admin' } })
    expect(preview().flags['my-new-feature'].targeting[0].query).toBe(
      "group == 'beta' && (role == 'admin')",
    )
    fireEvent.change(role, { target: { value: '' } })
    expect(within(nested).queryByRole('alert')).toBeNull()
    expect(screen.getByRole('status').textContent).toContain(
      'Preview unavailable',
    )
    expect(
      screen
        .getByRole('button', { name: 'Export JSON' })
        .hasAttribute('disabled'),
    ).toBe(true)
    fireEvent.blur(role)
    const error = within(nested).getByRole('alert')
    expect(role.getAttribute('aria-describedby')).toBe(error.id)
    expect(role.getAttribute('aria-invalid')).toBe('true')
    fireEvent.change(role, { target: { value: 'staff' } })
    expect(within(nested).queryByRole('alert')).toBeNull()
    expect(preview().flags['my-new-feature'].targeting[0].query).toContain(
      "role == 'staff'",
    )
  })

  it('uses the same normalized JSON for preview and download after renaming', async () => {
    render(<YourCode />)
    fireEvent.change(screen.getByLabelText('Flag name'), {
      target: { value: ' checkout ' },
    })
    fireEvent.change(screen.getAllByLabelText('Name')[0], {
      target: { value: ' show ' },
    })
    const create = vi.fn((_blob: Blob) => 'blob:flag')
    const revoke = vi.fn()
    vi.stubGlobal(
      'URL',
      Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke }),
    )
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {})
    fireEvent.click(screen.getByRole('button', { name: 'Export JSON' }))
    const blob = create.mock.calls[0][0]
    expect(blob).toBeDefined()
    const downloaded = await new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.readAsText(blob)
    })
    expect(downloaded).toBe(screen.getByLabelText('JSON preview').textContent)
    expect(preview().flags.checkout.targeting[0].variation).toBe('show')
    click.mockRestore()
    vi.unstubAllGlobals()
  })

  it('shows errors by the name, rollout and removed variation selections', () => {
    render(<YourCode />)
    const name = screen.getByLabelText('Flag name')
    fireEvent.change(name, { target: { value: '' } })
    fireEvent.blur(name)
    expect(screen.getByText('Enter a flag name')).toBeDefined()
    fireEvent.change(name, { target: { value: 'valid' } })
    expect(screen.queryByText('Enter a flag name')).toBeNull()
    const rollout = screen.getByLabelText('Rollout (%)')
    fireEvent.change(rollout, { target: { value: '101' } })
    fireEvent.blur(rollout)
    expect(screen.getByText('Enter a percentage from 0 to 100')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Remove variation 2' }))
    const fallback = screen.getByLabelText('Default variation')
    expect(fallback.getAttribute('aria-invalid')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: 'Remove variation 1' }))
    expect(screen.getByText('Choose a variation for this rule')).toBeDefined()
    expect(screen.getByText('Choose a default variation')).toBeDefined()
  })
})
