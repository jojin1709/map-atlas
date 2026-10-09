import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// When --mode lib is passed, build the library bundle instead of the SPA.
export default defineConfig(({ mode }) => {
  if (mode === 'lib') {
    return {
      plugins: [react()],
      build: {
        lib: {
          entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
          name: 'MapAtlas',
          formats: ['es', 'cjs'],
          fileName: (format) => `map-atlas.${format === 'es' ? 'js' : 'cjs'}`,
        },
        rollupOptions: {
          external: ['react', 'react-dom', 'react/jsx-runtime', 'zustand'],
          output: {
            globals: {
              react: 'React',
              'react-dom': 'ReactDOM',
              'react/jsx-runtime': 'jsxRuntime',
              zustand: 'zustand',
            },
            assetFileNames: 'map-atlas.[ext]',
          },
        },
        cssCodeSplit: false,
        sourcemap: true,
        emptyOutDir: true,
      },
    }
  }

  // Default: SPA build for demo / deployment
  return {
    plugins: [react()],
  }
})
