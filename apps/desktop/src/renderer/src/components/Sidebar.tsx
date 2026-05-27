import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

const items = [
  { to: '/', labelKey: 'nav.home' },
  { to: '/posts', labelKey: 'nav.posts' },
  { to: '/settings', labelKey: 'nav.settings' },
  { to: '/about', labelKey: 'nav.about' },
] as const

const base = 'rounded-md px-3 py-2 text-sm font-medium transition-colors'
const inactive =
  'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
const active = 'bg-brand-500/10 text-brand-600 dark:text-brand-400'

export function Sidebar() {
  const { t } = useTranslation()
  return (
    <aside className="flex h-full w-56 flex-col border-r border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="drag-region mb-6 px-2 pt-2">
        <h1 className="text-lg font-semibold">
          {t('app.title', { projectName: 'desktop' })}
        </h1>
        <p className="text-xs text-neutral-500">{t('app.tagline')}</p>
      </div>
      <nav className="no-drag flex flex-col gap-1">
        {items.map((i) => (
          <Link
            key={i.to}
            to={i.to}
            activeOptions={i.to === '/' ? { exact: true } : undefined}
            inactiveProps={{ className: `${base} ${inactive}` }}
            activeProps={{ className: `${base} ${active}` }}
          >
            {t(i.labelKey)}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
