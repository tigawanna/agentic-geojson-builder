import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { RouterProvider } from '@tanstack/react-router'
import { I18nextProvider } from 'react-i18next'
import { queryClient } from './lib/query-client'
import { router } from './router'
import { i18n } from './i18n'
import { ThemeProvider } from './features/theme/ThemeProvider'
import './styles/globals.css'

const root = document.getElementById('root')
if (!root) throw new Error('#root element not found in index.html')

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <RouterProvider router={router} />
        </ThemeProvider>
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </I18nextProvider>
  </React.StrictMode>,
)
