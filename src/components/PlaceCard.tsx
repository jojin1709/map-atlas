import { useAppStore } from '../store/useAppStore'
import { getEngine } from '../services/mapRef'

export default function PlaceCard() {
  const selectedPlace = useAppStore(s => s.selectedPlace)
  const setSelectedPlace = useAppStore(s => s.setSelectedPlace)

  if (!selectedPlace) return null

  return (
    <div className="absolute bottom-6 right-4 z-30 w-80 max-w-[calc(100vw-2rem)] bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
      {selectedPlace.thumbnail && (
        <div className="w-full h-36 overflow-hidden relative bg-gray-100 dark:bg-gray-800">
          <img
            src={selectedPlace.thumbnail}
            alt={selectedPlace.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-bold text-base text-gray-900 dark:text-gray-100 leading-snug">
              {selectedPlace.title}
            </h3>
            {selectedPlace.description && (
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-0.5">
                {selectedPlace.description}
              </p>
            )}
          </div>
          <button
            onClick={() => setSelectedPlace(null)}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition text-sm"
            title="Close"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-gray-600 dark:text-gray-300 mt-2 line-clamp-4 leading-relaxed">
          {selectedPlace.extract}
        </p>

        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
          {selectedPlace.lat != null && selectedPlace.lng != null && (
            <button
              onClick={() => {
                if (selectedPlace.lat != null && selectedPlace.lng != null) {
                  useAppStore.getState().setTo({ lat: selectedPlace.lat, lng: selectedPlace.lng })
                  useAppStore.getState().showToast(`Route to ${selectedPlace.title}`)
                  getEngine()?.flyTo(selectedPlace.lat, selectedPlace.lng, 14)
                }
              }}
              className="flex-1 py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg transition text-center"
            >
              Directions
            </button>
          )}

          {selectedPlace.lat != null && selectedPlace.lng != null && (
            <button
              onClick={() => {
                if (selectedPlace.lat != null && selectedPlace.lng != null) {
                  useAppStore.getState().addPlace({
                    id: Date.now(),
                    name: selectedPlace.title,
                    lat: selectedPlace.lat,
                    lng: selectedPlace.lng,
                  })
                  useAppStore.getState().showToast(`Saved "${selectedPlace.title}"`)
                }
              }}
              className="py-1.5 px-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs rounded-lg transition"
            >
              Save
            </button>
          )}

          {selectedPlace.url && (
            <a
              href={selectedPlace.url}
              target="_blank"
              rel="noopener noreferrer"
              className="py-1.5 px-2 text-xs text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition"
              title="Read on Wikipedia"
            >
              Wiki ↗
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
