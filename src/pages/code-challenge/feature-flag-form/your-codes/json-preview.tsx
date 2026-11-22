import { Editor } from '@monaco-editor/react'

export function JsonPreview({ json }: { json: string | null }) {
  return (
    <section
      aria-labelledby="json-preview-title"
      className="min-w-0 space-y-3 rounded-2xl border bg-card p-5 shadow-sm sm:p-6"
    >
      <h2 id="json-preview-title" className="font-semibold">
        JSON Preview
      </h2>
      <p role="status" className="text-sm text-muted-foreground">
        {json === null
          ? 'Preview unavailable. Fix invalid fields to preview and export JSON.'
          : 'Valid configuration. Preview updates as you edit.'}
      </p>
      {json !== null && (
        <Editor
          height="420px"
          language="json"
          value={json}
          loading={
            <pre
              className="h-[420px] overflow-auto text-xs"
              aria-label="JSON preview"
            >
              {json}
            </pre>
          }
          options={{
            readOnly: true,
            domReadOnly: true,
            minimap: { enabled: false },
            automaticLayout: true,
            scrollBeyondLastLine: false,
            ariaLabel: 'JSON preview',
            fontSize: 13,
            tabSize: 2,
          }}
        />
      )}
    </section>
  )
}
