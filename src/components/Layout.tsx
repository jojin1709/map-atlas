/* Layout: side panel with mobile bottom navigation bar, tab switcher, coords display. */

import { useEffect, useState } from 'react'
import { useAppStore, type PanelTab } from '../store/useAppStore'
import * as api from '../services/api'
import { getEngine } from '../services/mapRef'
import SearchPanel from './SearchPanel'
import DirectionsPanel from './DirectionsPanel'
import ToolsPanel from './ToolsPanel'
import LayersPanel from './LayersPanel'
import PlacesPanel from './PlacesPanel'
import ContextMenu from './ContextMenu'
import Toast from './Toast'
import NavOverlay from './NavOverlay'
import PlaceCard from './PlaceCard'
import StreetViewModal from './StreetViewModal'
import OfflineManagerModal from './OfflineManagerModal'
import {
  Menu,
  X,
  Download,
  Smartphone,
  Search,
  Navigation,
  Layers,
  Wrench,
  Bookmark,
  ChevronDown,
  Crosshair,
} from 'lucide-react'

function isEmbedMode(): boolean {
  const params = new URLSearchParams(location.search)
  return params.get('embed') === 'true'
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface TabDef {
  id: PanelTab
  label: string
  shortLabel: string
  icon: typeof Search
}

const TABS: TabDef[] = [
  { id: 'search', label: 'Search & Nearby', shortLabel: 'Search', icon: Search },
  { id: 'directions', label: 'Directions', shortLabel: 'Directions', icon: Navigation },
  { id: 'layers', label: 'Map Layers', shortLabel: 'Layers', icon: Layers },
  { id: 'tools', label: 'Measure & Tools', shortLabel: 'Tools', icon: Wrench },
  { id: 'places', label: 'Saved Places', shortLabel: 'Saved', icon: Bookmark },
]

export default function Layout() {
  const panelOpen = useAppStore(s => s.panelOpen)
  const togglePanel = useAppStore(s => s.togglePanel)
  const closePanel = useAppStore(s => s.closePanel)
  const activeTab = useAppStore(s => s.activeTab)
  const setActiveTab = useAppStore(s => s.setActiveTab)
  const dark = useAppStore(s => s.dark)
  const [embed] = useState(isEmbedMode)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)

  // Track PWA install prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    const installedHandler = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
      useAppStore.getState().showToast('Map Atlas installed on your home screen!')
    }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', installedHandler)
    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installedHandler)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    try {
      await deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice
      if (choice.outcome === 'accepted') {
        useAppStore.getState().showToast('Installing Map Atlas…')
        setDeferredPrompt(null)
      }
    } catch {
      // Prompt dismissed
    }
  }

  // In embed mode, start with panel closed
  useEffect(() => {
    if (embed) useAppStore.getState().closePanel()
  }, [embed])

  if (embed) {
    return (
      <div className={`app-layout panel-closed ${dark ? 'dark' : ''}`}>
        <NavOverlay />
        <ContextMenu />
        <Toast />
        <StreetViewModal />
      </div>
    )
  }

  const currentTabDef = TABS.find(t => t.id === activeTab) || TABS[0]

  return (
    <div className={`app-layout ${panelOpen ? '' : 'panel-closed'} ${dark ? 'dark' : ''}`}>
      {/* Desktop Hamburger (hidden on mobile) */}
      <button
        className="hamburger hidden sm:flex items-center justify-center"
        onClick={togglePanel}
        title="Toggle panel"
      >
        {panelOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Floating Locate Me button on mobile when sheet is closed */}
      {!panelOpen && (
        <button
          onClick={async () => {
            try {
              const loc = await api.locateUser()
              useAppStore.getState().setUserLocation(loc)
              getEngine()?.flyTo(loc.lat, loc.lng, 16)
              useAppStore.getState().showToast('Centered on your location')
            } catch {
              useAppStore.getState().showToast('Could not fetch location')
            }
          }}
          className="fixed bottom-18 right-3.5 z-30 p-3 bg-white/95 dark:bg-zinc-900/95 text-blue-600 dark:text-blue-400 rounded-2xl shadow-xl border border-gray-200 dark:border-zinc-800 sm:hidden active:scale-90 transition backdrop-blur-md"
          title="Locate me"
        >
          <Crosshair className="w-5 h-5" />
        </button>
      )}

      {/* Floating mobile PWA install button if installable and panel closed */}
      {deferredPrompt && !isInstalled && !panelOpen && (
        <div className="fixed top-3 left-3 z-30 sm:hidden">
          <button
            onClick={handleInstallClick}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-full text-xs font-bold shadow-lg flex items-center gap-1.5 transition animate-pulse"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Install App</span>
          </button>
        </div>
      )}

      {/* Side Panel / Mobile Bottom Sheet */}
      <aside id="panel" className={panelOpen ? 'open' : ''}>
        {/* Mobile drag handle button */}
        <button
          type="button"
          onClick={closePanel}
          className="w-full flex sm:hidden items-center justify-center pt-2 pb-1 focus:outline-none border-0 bg-transparent cursor-pointer"
          title="Swipe or tap to minimize"
        >
          <div className="w-10 h-1 bg-gray-300 dark:bg-zinc-700 rounded-full" />
        </button>

        {/* Panel Header */}
        <header className="panel-header flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-base sm:text-lg">
                <span className="sm:inline hidden">Map Atlas</span>
                <span className="sm:hidden">{currentTabDef.label}</span>
              </h1>
              {deferredPrompt && !isInstalled && (
                <button
                  onClick={handleInstallClick}
                  className="px-2 py-1 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-sm transition"
                  title="Install Map Atlas as native app"
                >
                  <Download className="w-3 h-3" />
                  <span>Install</span>
                </button>
              )}
            </div>
            <span id="coords-display" className="coords hidden sm:block" />
          </div>

          {/* Mobile minimize button */}
          <button
            type="button"
            onClick={closePanel}
            className="sm:hidden p-1.5 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 rounded-lg border-0 bg-transparent"
            title="Minimize to map"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </header>

        {/* Desktop Segmented Tab Switcher */}
        <div className="hidden sm:flex items-center gap-1 px-4 py-2 border-b border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50 overflow-x-auto shrink-0">
          {TABS.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shrink-0 border ${
                  isActive
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 border-gray-200 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-750'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.shortLabel}</span>
              </button>
            )
          })}
        </div>

        {/* Focused Panel Content */}
        <div className="panel-body">
          {activeTab === 'search' && <SearchPanel />}
          {activeTab === 'directions' && <DirectionsPanel />}
          {activeTab === 'layers' && <LayersPanel />}
          {activeTab === 'tools' && <ToolsPanel />}
          {activeTab === 'places' && <PlacesPanel />}
          {activeTab === 'all' && (
            <>
              <SearchPanel />
              <DirectionsPanel />
              <ToolsPanel />
              <LayersPanel />
              <PlacesPanel />
            </>
          )}
        </div>

        <Toast />
      </aside>

      {/* Mobile Bottom Navigation Bar (Persistent & Native Feeling) */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-t border-gray-200 dark:border-zinc-800 flex items-center justify-around py-1 px-2 shadow-2xl sm:hidden">
        {TABS.map(tab => {
          const Icon = tab.icon
          const isActive = panelOpen && activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => {
                if (panelOpen && activeTab === tab.id) {
                  closePanel()
                } else {
                  setActiveTab(tab.id)
                }
              }}
              className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition border-0 bg-transparent ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400 font-bold'
                  : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200'
              }`}
            >
              <div
                className={`p-1 rounded-xl transition ${
                  isActive ? 'bg-blue-50 dark:bg-blue-950/60' : ''
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''}`} />
              </div>
              <span className="text-[10px] tracking-tight">{tab.shortLabel}</span>
            </button>
          )
        })}
      </nav>

      <NavOverlay />
      <ContextMenu />
      <PlaceCard />
      <StreetViewModal />
      <OfflineManagerModal />
    </div>
  )
}
