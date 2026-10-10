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
import { Menu, X } from 'lucide-react'

function isEmbedMode(): boolean {
  const params = new URLSearchParams(location.search)
  return params.get('embed') === 'true'
}

export default function Layout() {
  const panelOpen = useAppStore(s => s.panelOpen)
  const togglePanel = useAppStore(s => s.togglePanel)
  const dark = useAppStore(s => s.dark)
  const [embed] = useState(isEmbedMode)

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

      <aside id="panel" className={panelOpen ? 'open' : ''}>
        <header className="panel-header">
          <h1>Map Atlas</h1>
          <span id="coords-display" className="coords" />
        </header>

        <div className="panel-body">
          <SearchPanel />
          <DirectionsPanel />
          <NavOverlay />
          <ToolsPanel />
          <LayersPanel />
          <PlacesPanel />
        </div>

        <Toast />
      </aside>

      <ContextMenu />
      <PlaceCard />
      <StreetViewModal />
    </div>
  )
}
