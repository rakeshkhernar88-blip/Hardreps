import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { LocalNotifications } from '@capacitor/local-notifications'

async function requestNotificationPermission() {
  const { display } = await LocalNotifications.checkPermissions()
  if (display !== 'granted') {
    await LocalNotifications.requestPermissions()
  }
}

requestNotificationPermission()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)