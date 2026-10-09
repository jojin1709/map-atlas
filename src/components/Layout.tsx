/* Layout: side panel with sections, mobile bottom sheet, coords display, hamburger. */

import { useAppStore } from '../store/useAppStore'
import SearchPanel from './SearchPanel'
import DirectionsPanel from './DirectionsPanel'
import ToolsPanel from './ToolsPanel'
import LayersPanel from './LayersPanel'
import PlacesPanel from './PlacesPanel'
import ContextMenu from './ContextMenu'
import Toast from './Toast'

export default function Layout() {
  const panelOpen = useAppStore(s => s.panelOpen)
  const togglePanel = useAppStore(s => s.togglePanel)
  const dark = useAppStore(s => s.dark)

  return (
    <div className={`app-layout ${panelOpen ? '' : 'panel-closed'} ${dark ? 'dark' : ''}`}>
      {/* Hamburger for mobile */}
      <button className="hamburger" onClick={togglePanel} title="Toggle panel">
        {panelOpen ? '✕' : '☰'}
      </button>

      <aside id="panel" className={panelOpen ? 'open' : ''}>
        <header className="panel-header">
          <h1>Map Atlas</h1>
          <span id="coords-display" className="coords" />
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

      <ContextMenu />
    </div>
  )
}
