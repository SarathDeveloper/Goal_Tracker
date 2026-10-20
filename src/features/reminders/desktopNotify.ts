import type { DueReminder } from '@shared/types'

export async function notifyDesktop(items: DueReminder[]): Promise<void> {
  if (items.length === 0 || !window.__TAURI_INTERNALS__) {
    return
  }
  try {
    const { isPermissionGranted, requestPermission, sendNotification } = await import('@tauri-apps/plugin-notification')
    let granted = await isPermissionGranted()
    if (!granted) {
      granted = (await requestPermission()) === 'granted'
    }
    if (!granted) {
      return
    }
    sendNotification({ title: 'Goal Tracker', body: items.map((item) => item.detail).join('\n') })
  } catch {
    // The browser build has no desktop notification host.
  }
}
