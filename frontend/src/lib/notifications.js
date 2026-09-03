import { apiFetch } from './api'

// Unlike fetchTasks (which walks every pagination page for a full list
// view), this just reads the first page — DRF's default PAGE_SIZE (10),
// newest first (Notification.Meta.ordering). The bell dropdown only
// ever shows the most recent handful anyway, so there's nothing to gain
// from paging through the rest.
export function fetchNotifications() {
  return apiFetch('/api/notifications/').then((data) => data.results)
}

export function markNotificationRead(id) {
  return apiFetch(`/api/notifications/${id}/`, {
    method: 'PATCH',
    body: { read: true },
  })
}

export function markAllNotificationsRead() {
  return apiFetch('/api/notifications/mark_all_read/', { method: 'POST' })
}
