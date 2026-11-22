import { memo, useCallback, useLayoutEffect, useRef } from 'react'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { conditionSchema, createGroup } from './flag-model'
import type { Group } from './flag-model'
import { FieldFeedback } from './field-feedback'

export const selectStyle =
  'h-8 w-full min-w-0 rounded-lg border border-input bg-background px-2.5 text-sm aria-invalid:border-destructive'

export const RuleGroup = memo(function RuleGroupEditor({
  group,
  onChange,
}: {
  group: Group
  onChange: (group: Group) => void
}) {
  // Dispatch through the latest committed group so every child can retain a
  // stable callback while immutable updates preserve untouched siblings.
  const latest = useRef({ group, onChange })
  useLayoutEffect(() => {
    latest.current = { group, onChange }
  }, [group, onChange])
  const replaceChild = useCallback(
    (id: string, next?: Group['children'][number]) => {
      const current = latest.current
      current.onChange({
        ...current.group,
        children: next
          ? current.group.children.map((item) => (item.id === id ? next : item))
          : current.group.children.filter((item) => item.id !== id),
      })
    },
    [],
  )
  return (
    <fieldset className="min-w-0 space-y-3 rounded-md border p-3">
      <legend className="px-1 text-sm font-medium">Condition group</legend>
      {group.children.length === 0 && (
        <p role="alert" className="text-sm text-destructive">
          Add at least one condition or group
        </p>
      )}
      <select
        aria-label="Match conditions"
        className={selectStyle}
        value={group.operator}
        onChange={(event) =>
          onChange({
            ...group,
            operator: event.target.value === 'and' ? 'and' : 'or',
          })
        }
      >
        <option value="and">Match all (AND)</option>
        <option value="or">Match any (OR)</option>
      </select>
      {group.children.map((child) => (
        <RuleChild key={child.id} child={child} replaceChild={replaceChild} />
      ))}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() =>
            onChange({
              ...group,
              children: [
                ...group.children,
                {
                  kind: 'condition',
                  id: crypto.randomUUID(),
                  attribute: 'group',
                  value: '',
                },
              ],
            })
          }
        >
          Add condition
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() =>
            onChange({ ...group, children: [...group.children, createGroup()] })
          }
        >
          Add nested group
        </Button>
      </div>
    </fieldset>
  )
})

const RuleChild = memo(function RuleChildEditor({
  child,
  replaceChild,
}: {
  child: Group['children'][number]
  replaceChild: (id: string, next?: Group['children'][number]) => void
}) {
  const replace = useCallback(
    (next: Group['children'][number]) => replaceChild(child.id, next),
    [child.id, replaceChild],
  )
  return (
    <div
      key={child.id}
      className="@container min-w-0 space-y-2 rounded-md bg-muted/40 p-2"
    >
      {child.kind === 'group' ? (
        <RuleGroup group={child} onChange={replace} />
      ) : (
        <div className="grid items-start gap-2 @min-[18rem]:grid-cols-2">
          <label className="grid min-w-0 gap-1.5 text-sm font-medium">
            Attribute
            <select
              aria-label="Condition attribute"
              className={selectStyle}
              value={child.attribute}
              onChange={(event) =>
                replace({
                  ...child,
                  attribute: event.target.value === 'group' ? 'group' : 'role',
                })
              }
            >
              <option value="group">Group equals</option>
              <option value="role">Role equals</option>
            </select>
          </label>
          <FieldFeedback
            title={child.attribute === 'group' ? 'Group name' : 'Role name'}
            error={
              conditionSchema
                .safeParse(child)
                .error?.issues.find((issue) => issue.path[0] === 'value')
                ?.message
            }
          >
            {(feedback) => (
              <Input
                {...feedback}
                aria-label={
                  child.attribute === 'group' ? 'Group name' : 'Role name'
                }
                value={child.value}
                onChange={(event) =>
                  replace({ ...child, value: event.target.value })
                }
              />
            )}
          </FieldFeedback>
        </div>
      )}
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => replaceChild(child.id)}
      >
        Remove {child.kind}
      </Button>
    </div>
  )
})
