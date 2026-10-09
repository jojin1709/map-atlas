import Layout from './components/Layout'
import MapView from './components/MapView'

export default function App() {
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <MapView />
      <Layout />
    </div>
  )
}
