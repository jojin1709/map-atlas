import { useState, useEffect } from 'react'
import Layout from './components/Layout'
import MapView from './components/MapView'
import DocsView from './components/DocsView'

export default function App() {
  const [isDocs, setIsDocs] = useState(() => {
    return typeof window !== 'undefined' && window.location.pathname.startsWith('/docs')
  })

  useEffect(() => {
    const handleLocationChange = () => {
      setIsDocs(window.location.pathname.startsWith('/docs'))
    }
    window.addEventListener('popstate', handleLocationChange)
    return () => window.removeEventListener('popstate', handleLocationChange)
  }, [])

  if (isDocs) {
    return <DocsView />
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <MapView />
      <Layout />
    </div>
  )
}
