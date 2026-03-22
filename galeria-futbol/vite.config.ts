import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'

const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1]
const defaultPagesBase = repoName ? `/${repoName}/` : '/'
const base = process.env.VITE_BASE_PATH ?? (process.env.GITHUB_ACTIONS === 'true' ? defaultPagesBase : '/')

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_BASE_URL

  return {
    base,
    plugins: [react()],
    server: apiTarget
      ? {
          proxy: {
            '/api': {
              target: apiTarget,
              changeOrigin: true,
              secure: true,
              rewrite: (path) => path.replace(/^\/api/, ''),
            },
          },
        }
      : undefined,
  }
})