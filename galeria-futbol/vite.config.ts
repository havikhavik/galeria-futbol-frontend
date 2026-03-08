import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1]
const defaultPagesBase = repoName ? `/${repoName}/` : '/'
const base = process.env.VITE_BASE_PATH ?? (process.env.GITHUB_ACTIONS === 'true' ? defaultPagesBase : '/')

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [react()],
});