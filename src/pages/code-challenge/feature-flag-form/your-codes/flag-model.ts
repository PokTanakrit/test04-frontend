import { z } from 'zod'

export const conditionSchema = z.object({
  kind: z.literal('condition'),
  id: z.string(),
  attribute: z.enum(['group', 'role']),
  value: z
    .string()
    .trim()
    .regex(
      /^[a-zA-Z0-9_ .@-]+$/,
      'Enter a group or role name using letters, numbers, spaces, or . @ _ -',
    ),
})

export type Condition = z.input<typeof conditionSchema>
export type Group = {
  kind: 'group'
  id: string
  operator: 'and' | 'or'
  children: Array<Condition | Group>
}

const groupSchema = z.object({
  kind: z.literal('group'),
  id: z.string(),
  operator: z.enum(['and', 'or']),
  get children(): z.ZodType<Group['children'], Group['children']> {
    return z
      .array(z.discriminatedUnion('kind', [conditionSchema, groupSchema]))
      .min(1, 'Add at least one condition or group')
  },
})

const variationSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1, 'Enter a variation name'),
  value: z.boolean(),
})

export const flagSchema = z
  .object({
    name: z.string().trim().min(1, 'Enter a flag name'),
    description: z.string().trim(),
    enabled: z.boolean(),
    variations: z.array(variationSchema).min(1, 'Add a variation'),
    defaultVariation: z.string(),
    rules: z.array(
      z.object({
        id: z.string(),
        group: groupSchema,
        percentage: z
          .string()
          .trim()
          .min(1, 'Enter a rollout percentage')
          .refine(
            (value) => Number(value) >= 0 && Number(value) <= 100,
            'Enter a percentage from 0 to 100',
          ),
        variation: z.string(),
      }),
    ),
  })
  .superRefine((flag, ctx) => {
    const names = new Set<string>()
    const ids = new Set(flag.variations.map(({ id }) => id))
    flag.variations.forEach(({ name }, index) => {
      if (names.has(name)) {
        ctx.addIssue({
          code: 'custom',
          path: ['variations', index, 'name'],
          message: 'Use a unique variation name',
        })
      }
      names.add(name)
    })
    if (!ids.has(flag.defaultVariation)) {
      ctx.addIssue({
        code: 'custom',
        path: ['defaultVariation'],
        message: 'Choose a default variation',
      })
    }
    flag.rules.forEach(({ variation }, index) => {
      if (!ids.has(variation)) {
        ctx.addIssue({
          code: 'custom',
          path: ['rules', index, 'variation'],
          message: 'Choose a variation for this rule',
        })
      }
    })
  })

export type Flag = z.input<typeof flagSchema>

export const example: Flag = {
  name: 'my-new-feature',
  description: '',
  enabled: true,
  variations: [
    { id: 'on', name: 'on', value: true },
    { id: 'off', name: 'off', value: false },
  ],
  defaultVariation: 'off',
  rules: [
    {
      id: 'beta-rule',
      group: {
        kind: 'group',
        id: 'beta-group',
        operator: 'and',
        children: [
          {
            kind: 'condition',
            id: 'beta-condition',
            attribute: 'group',
            value: 'beta',
          },
        ],
      },
      percentage: '50',
      variation: 'on',
    },
  ],
}

export function createGroup(): Group {
  return {
    kind: 'group',
    id: crypto.randomUUID(),
    operator: 'and',
    children: [],
  }
}

function toQuery(group: Group): string {
  return group.children
    .map((child) =>
      child.kind === 'group'
        ? `(${toQuery(child)})`
        : `${child.attribute} == '${child.value}'`,
    )
    .join(group.operator === 'and' ? ' && ' : ' || ')
}

export function toJson(flag: z.output<typeof flagSchema>) {
  const variationName = new Map(
    flag.variations.map(({ id, name }) => [id, name]),
  )
  return JSON.stringify(
    {
      flags: {
        [flag.name]: {
          ...(!flag.enabled && { disable: true }),
          ...(flag.description && {
            metadata: { description: flag.description },
          }),
          variations: Object.fromEntries(
            flag.variations.map(({ name, value }) => [name, value]),
          ),
          targeting: flag.rules.map(({ group, percentage, variation }) => ({
            query: toQuery(group),
            percentage: Number(percentage),
            variation: variationName.get(variation),
          })),
          defaultRule: { variation: variationName.get(flag.defaultVariation) },
        },
      },
    },
    null,
    2,
  )
}
