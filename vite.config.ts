import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_GOOGLE_CLIENT_ID': JSON.stringify('694824460681-j7f0r0gq9n0i5008ct53sna203fqnrkn.apps.googleusercontent.com')
  }
})