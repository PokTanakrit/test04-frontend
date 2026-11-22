import { useForm, useStore } from '@tanstack/react-form'
import { Download, Layers, Plus, Settings2, Workflow } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { createGroup, example, flagSchema, toJson } from './flag-model'
import type { Flag, Group } from './flag-model'
import { RuleGroup, selectStyle } from './rule-group'
import { FieldFeedback } from './field-feedback'
import { JsonPreview } from './json-preview'

const panel =
  'min-w-0 scroll-mt-6 space-y-5 rounded-2xl border bg-card p-5 shadow-sm sm:p-6'
const label = 'grid min-w-0 gap-1.5 text-sm font-medium'

// Each recursive tree is edited as one field so TanStack Form only types the
// finite path to the tree root. Zod checks the tree before export.
type EditorValues = Omit<Flag, 'rules'> & {
  rules: Array<Omit<Flag['rules'][number], 'group'> & { group: unknown }>
}

// Form values are immutable snapshots shared by the field selectors and preview.
const validations = new WeakMap<
  EditorValues,
  ReturnType<typeof flagSchema.safeParse>
>()

function validate(values: EditorValues) {
  const cached = validations.get(values)
  if (cached) return cached
  const result = flagSchema.safeParse(values)
  validations.set(values, result)
  return result
}

function useFlagForm() {
  const defaultValues: EditorValues = example
  return useForm({ defaultValues })
}

function ValidatedField({
  form,
  path,
  title,
  children,
  className,
  immediate,
}: {
  form: ReturnType<typeof useFlagForm>
  path: Array<string | number>
  title: string
  children: Parameters<typeof FieldFeedback>[0]['children']
  className?: string
  immediate?: boolean
}) {
  const error = useStore(form.store, (state) => {
    const result = validate(state.values)
    return result.success
      ? undefined
      : result.error.issues.find(
          (issue) => JSON.stringify(issue.path) === JSON.stringify(path),
        )?.message
  })
  return (
    <FieldFeedback
      title={title}
      error={error}
      immediate={immediate}
      className={className}
    >
      {children}
    </FieldFeedback>
  )
}

function VariationSelect({
  variations,
  value,
  onChange,
  ...feedback
}: {
  variations: Flag['variations']
  value: string
  onChange: (id: string) => void
  'aria-invalid'?: boolean
  'aria-describedby'?: string
}) {
  return (
    <select
      {...feedback}
      className={selectStyle}
      value={variations.some((item) => item.id === value) ? value : ''}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">Choose a variation</option>
      {variations.map((item, index) => (
        <option key={item.id} value={item.id}>
          {item.name.trim() || `Unnamed variation ${index + 1}`}
        </option>
      ))}
    </select>
  )
}

export default function YourCode() {
  const form = useFlagForm()
  const variations = useStore(form.store, (state) => state.values.variations)
  const ruleOrder = useStore(form.store, (state) =>
    state.values.rules.map(({ id }) => id).join(' '),
  )
  const ruleIds = ruleOrder ? ruleOrder.split(' ') : []

  function downloadConfiguration() {
    const result = validate(form.state.values)
    if (!result.success) return

    const url = URL.createObjectURL(
      new Blob([toJson(result.data)], { type: 'application/json' }),
    )
    const link = document.createElement('a')
    link.href = url
    link.download = 'feature-flag.json'
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <section aria-labelledby="flag-editor-title" className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-5 border-b pb-7">
        <div className="space-y-2">
          <h1
            id="flag-editor-title"
            className="text-3xl font-semibold tracking-tight sm:text-4xl"
          >
            Feature Flag Editor
          </h1>
          <p className="text-sm text-muted-foreground">
            Set the default experience and choose who gets each variation.
          </p>
        </div>
        <form.Subscribe selector={(state) => state.values}>
          {(values) => (
            <Button
              type="button"
              onClick={downloadConfiguration}
              disabled={!validate(values).success}
              className="bg-teal-700 text-white hover:bg-teal-800 dark:bg-teal-400 dark:text-teal-950 dark:hover:bg-teal-300"
            >
              <Download aria-hidden="true" /> Export JSON
            </Button>
          )}
        </form.Subscribe>
      </header>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,4fr)_minmax(0,6fr)] lg:gap-6">
        <div className="min-w-0 space-y-5 lg:space-y-6">
          <section className={panel}>
            <h2 className="flex items-center gap-2.5 font-semibold">
              <Settings2
                className="size-4 text-teal-700 dark:text-teal-300"
                aria-hidden="true"
              />{' '}
              Flag details
            </h2>
            <form.Field name="name">
              {(field) => (
                <ValidatedField form={form} path={['name']} title="Flag name">
                  {(feedback) => (
                    <Input
                      {...feedback}
                      required
                      value={field.state.value}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                    />
                  )}
                </ValidatedField>
              )}
            </form.Field>
            <form.Field name="description">
              {(field) => (
                <label className={label}>
                  Description
                  <Input
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                  />
                </label>
              )}
            </form.Field>
            <form.Field name="enabled">
              {(field) => (
                <button
                  type="button"
                  role="switch"
                  aria-label="Enable flag"
                  aria-checked={field.state.value}
                  onClick={() => field.handleChange(!field.state.value)}
                  className="flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-400 px-3 text-sm font-medium hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
                >
                  <span>Flag status</span>
                  <span className="flex items-center gap-2">
                    {field.state.value ? 'Enabled' : 'Disabled'}
                    <span
                      aria-hidden="true"
                      className={`flex h-6 w-11 items-center rounded-full border px-0.5 ${field.state.value ? 'justify-end border-teal-700 bg-teal-700' : 'justify-start border-slate-600 bg-slate-500'}`}
                    >
                      <span className="size-4 rounded-full bg-white shadow-sm" />
                    </span>
                  </span>
                </button>
              )}
            </form.Field>
          </section>

          <section className={panel}>
            <h2 className="flex items-center gap-2.5 font-semibold">
              <Layers
                className="size-4 text-teal-700 dark:text-teal-300"
                aria-hidden="true"
              />{' '}
              Variations
            </h2>
            <form.Field name="variations" mode="array">
              {(field) => (
                <div className="@container space-y-3">
                  {variations.map((variation, index) => (
                    <div
                      key={variation.id}
                      className="grid grid-cols-2 items-start gap-2 rounded-md border p-3 @min-[23rem]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
                    >
                      <form.Field name={`variations[${index}].name`}>
                        {(name) => (
                          <ValidatedField
                            form={form}
                            path={['variations', index, 'name']}
                            title="Name"
                            className={label}
                          >
                            {(feedback) => (
                              <Input
                                {...feedback}
                                value={name.state.value}
                                onChange={(event) =>
                                  name.handleChange(event.target.value)
                                }
                              />
                            )}
                          </ValidatedField>
                        )}
                      </form.Field>
                      <form.Field name={`variations[${index}].value`}>
                        {(value) => (
                          <label className={label}>
                            Value
                            <select
                              className={selectStyle}
                              value={String(value.state.value)}
                              onChange={(event) =>
                                value.handleChange(
                                  event.target.value === 'true',
                                )
                              }
                            >
                              <option value="true">true</option>
                              <option value="false">false</option>
                            </select>
                          </label>
                        )}
                      </form.Field>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => void field.removeValue(index)}
                        className="col-span-2 justify-self-end @min-[23rem]:col-span-1 @min-[23rem]:mt-[1.625rem]"
                        aria-label={`Remove variation ${index + 1}`}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  {variations.length === 0 && (
                    <p role="alert" className="text-sm text-destructive">
                      Add a variation
                    </p>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      void field.pushValue({
                        id: crypto.randomUUID(),
                        name: '',
                        value: false,
                      })
                    }
                  >
                    <Plus aria-hidden="true" /> Add variation
                  </Button>
                </div>
              )}
            </form.Field>
            <form.Field name="defaultVariation">
              {(field) => (
                <ValidatedField
                  form={form}
                  path={['defaultVariation']}
                  title="Default variation"
                  immediate
                >
                  {(feedback) => (
                    <VariationSelect
                      {...feedback}
                      variations={variations}
                      value={field.state.value}
                      onChange={field.handleChange}
                    />
                  )}
                </ValidatedField>
              )}
            </form.Field>
          </section>
        </div>
        <section className={panel}>
          <div className="space-y-1.5">
            <h2 className="flex items-center gap-2.5 font-semibold">
              <Workflow
                className="size-4 text-teal-700 dark:text-teal-300"
                aria-hidden="true"
              />{' '}
              Targeting rules
            </h2>
            <p className="text-sm text-muted-foreground">
              Rules are evaluated in order. If none apply, the default variation
              is used.
            </p>
          </div>
          <form.Field name="rules" mode="array">
            {(rules) => (
              <div className="space-y-4">
                {ruleIds.map((id, index) => (
                  <fieldset
                    key={id}
                    className="min-w-0 space-y-4 rounded-xl border bg-muted/25 p-3 sm:p-4"
                  >
                    <legend className="px-1 text-sm font-medium">
                      Rule {index + 1}
                    </legend>
                    <div className="grid grid-cols-2 items-start gap-2">
                      <form.Field name={`rules[${index}].percentage`}>
                        {(field) => (
                          <ValidatedField
                            form={form}
                            path={['rules', index, 'percentage']}
                            title="Rollout (%)"
                          >
                            {(feedback) => (
                              <Input
                                {...feedback}
                                type="number"
                                min={0}
                                max={100}
                                step="any"
                                value={field.state.value}
                                onChange={(event) =>
                                  field.handleChange(event.target.value)
                                }
                              />
                            )}
                          </ValidatedField>
                        )}
                      </form.Field>
                      <form.Field name={`rules[${index}].variation`}>
                        {(field) => (
                          <ValidatedField
                            form={form}
                            path={['rules', index, 'variation']}
                            title="Variation"
                            immediate
                          >
                            {(feedback) => (
                              <VariationSelect
                                {...feedback}
                                variations={variations}
                                value={field.state.value}
                                onChange={field.handleChange}
                              />
                            )}
                          </ValidatedField>
                        )}
                      </form.Field>
                    </div>
                    <form.Field name={`rules[${index}].group`}>
                      {(field) => (
                        <RuleGroup
                          group={field.state.value as Group}
                          onChange={field.handleChange}
                        />
                      )}
                    </form.Field>
                    <div className="flex flex-wrap gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={index === 0}
                        onClick={() => void rules.moveValue(index, index - 1)}
                      >
                        Move up
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={index === rules.state.value.length - 1}
                        onClick={() => void rules.moveValue(index, index + 1)}
                      >
                        Move down
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => void rules.removeValue(index)}
                      >
                        Remove rule
                      </Button>
                    </div>
                  </fieldset>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    void rules.pushValue({
                      id: crypto.randomUUID(),
                      group: createGroup(),
                      percentage: '100',
                      variation: variations[0]?.id ?? '',
                    })
                  }
                >
                  <Plus aria-hidden="true" /> Add rule
                </Button>
              </div>
            )}
          </form.Field>
        </section>
      </div>
      <form.Subscribe selector={(state) => state.values}>
        {(values) => {
          const result = validate(values)
          return (
            <JsonPreview json={result.success ? toJson(result.data) : null} />
          )
        }}
      </form.Subscribe>
    </section>
  )
}
