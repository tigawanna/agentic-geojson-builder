import type { ErrorComponentProps } from '@tanstack/react-router'

export function ErrorPage({ error }: ErrorComponentProps) {
  const message = error instanceof Error ? error.message : String(error)

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-2 p-8 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="text-sm text-neutral-500">{message}</p>
    </div>
  )
}
