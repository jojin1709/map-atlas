/* Layout: side panel with sections, mobile bottom sheet, coords display, hamburger. */

import { useEffect, useState } from 'react'
import { useAppStore } from '../store/useAppStore'
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
import { Menu, X, Download, Smartphone } from 'lucide-react'

function isEmbedMode(): boolean {
  const params = new URLSearchParams(location.search)
  return params.get('embed') === 'true'
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function Layout() {
  const panelOpen = useAppStore(s => s.panelOpen)
  const togglePanel = useAppStore(s => s.togglePanel)
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
      // Prompt dismissed or unsupported
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

  return (
    <div className={`app-layout ${panelOpen ? '' : 'panel-closed'} ${dark ? 'dark' : ''}`}>
      {/* Hamburger for mobile */}
      <button className="hamburger flex items-center justify-center" onClick={togglePanel} title="Toggle panel">
        {panelOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Floating mobile PWA install pill if installable and panel closed */}
      {deferredPrompt && !isInstalled && !panelOpen && (
        <div className="fixed top-3 right-14 z-30 sm:hidden">
          <button
            onClick={handleInstallClick}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-full text-xs font-bold shadow-lg flex items-center gap-1.5 transition"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Install App</span>
          </button>
        </div>
      )}

      <aside id="panel" className={panelOpen ? 'open' : ''}>
        <header className="panel-header flex items-center justify-between">
          <div>
            <h1>Map Atlas</h1>
            <span id="coords-display" className="coords" />
          </div>
          {deferredPrompt && !isInstalled && (
            <button
              onClick={handleInstallClick}
              className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition"
              title="Install Map Atlas as native web app"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install</span>
            </button>
          )}
        </header>

        <div className="panel-body">
          <SearchPanel />
          <DirectionsPanel />
          <ToolsPanel />
          <LayersPanel />
          <PlacesPanel />
        </div>

        <Toast />
      </aside>

      <NavOverlay />
      <ContextMenu />
      <PlaceCard />
      <StreetViewModal />
    </div>
  )
}
