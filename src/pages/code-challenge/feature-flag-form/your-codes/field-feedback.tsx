import { useId, useState } from 'react'
import type { ReactNode } from 'react'

export function FieldFeedback({
  title,
  error,
  immediate = false,
  children,
  className = 'grid min-w-0 gap-1.5 text-sm font-medium',
}: {
  title: string
  error?: string
  immediate?: boolean
  children: (props: {
    id: string
    'aria-invalid': boolean
    'aria-describedby'?: string
  }) => ReactNode
  className?: string
}) {
  const [blurred, setBlurred] = useState(false)
  const id = useId()
  const message = blurred || immediate ? error : undefined
  return (
    <div className={className} onBlur={() => setBlurred(true)}>
      <label htmlFor={id}>{title}</label>
      {children({
        id,
        'aria-invalid': !!message,
        'aria-describedby': message ? id + '-error' : undefined,
      })}
      {message && (
        <span id={id + '-error'} role="alert" className="text-sm text-destructive">
          {message}
        </span>
      )}
    </div>
  )
}
