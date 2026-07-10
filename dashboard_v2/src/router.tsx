import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { DomesticReitsPage } from './pages/DomesticReitsPage'
import { MarketPage } from './pages/MarketPage'
import { InvitsPage } from './pages/InvitsPage'
import { GlobalPage } from './pages/GlobalPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    HydrateFallback: () => null,
    children: [
      { index: true, element: <GlobalPage /> },
      { path: 'domestic', element: <DomesticReitsPage /> },
      { path: 'market', element: <MarketPage /> },
      { path: 'invits', element: <InvitsPage /> },
      { path: 'global', element: <Navigate to="/" replace /> }, // old URL, pre-landing-redesign
      { path: 'map', lazy: async () => ({ Component: (await import('./pages/MapPage')).MapPage }) },
    ],
  },
])
