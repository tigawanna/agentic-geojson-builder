import { Outlet } from '@tanstack/react-router'
import { Sidebar } from './Sidebar'
import { UpdateToast } from './UpdateToast'

export function AppLayout() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="drag-region h-10 w-full" />
        <div className="no-drag mx-auto max-w-4xl px-8 pb-12">
          <Outlet />
        </div>
      </main>
      <UpdateToast />
    </div>
  )
}
