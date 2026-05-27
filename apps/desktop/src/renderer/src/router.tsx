import {
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { AppLayout } from './components/AppLayout'
import { HomePage } from './features/home/HomePage'
import { PostsPage } from './features/posts/PostsPage'
import { SettingsPage } from './features/settings/SettingsPage'
import { AboutPage } from './features/about/AboutPage'
import { ErrorPage } from './components/ErrorPage'

/**
 * Hash history keeps routing working under Electron `file://` in production
 * (same reason we avoided browser history + BrowserRouter in SPA-on-disk).
 */
const rootRoute = createRootRoute({
  component: AppLayout,
  errorComponent: ErrorPage,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
})

const postsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'posts',
  component: PostsPage,
})

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'settings',
  component: SettingsPage,
})

const aboutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'about',
  component: AboutPage,
})

const routeTree = rootRoute.addChildren([indexRoute, postsRoute, settingsRoute, aboutRoute])

const hashHistory = createHashHistory()

export const router = createRouter({
  routeTree,
  history: hashHistory,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
