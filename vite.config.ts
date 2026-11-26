import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// Vercel and local dev serve from "/". GitHub Pages serves from "/<repo>/", so the deploy workflow
// sets VITE_BASE=/Food-waste-management-system/ for its build only.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
})
