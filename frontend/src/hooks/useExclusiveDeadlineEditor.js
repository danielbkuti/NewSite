import { useState } from 'react'

// Page-wide "only one open at a time" for every DeadlineEditor popover —
// a task's own, a subtask's (cascade row or promoted card), the
// add-subtask form's, the task detail page's. Deliberately a plain
// module-level variable rather than React context: there's exactly one
// thing to coordinate (which popover, if any, is currently open) and no
// component actually needs to *read* whose turn it is, just to be told
// to close when someone else's turn starts. A context provider wrapping
// the whole task tree would be a lot of plumbing for that.
let activeCloser = null

// Drop-in replacement for `useState(false)` at every "editingDeadline"
// call site: same `[isOpen, ...]` shape, but `open()` first closes
// whichever other popover was last opened through this same hook,
// anywhere else on the page. `close()` also clears the registry so a
// stale reference left over from a since-closed popover never gets
// invoked (harmless if it did — a stale setter on an unmounted
// component is just a no-op — but there's no reason to keep it around).
export function useExclusiveDeadlineEditor() {
  const [isOpen, setIsOpen] = useState(false)

  function open() {
    activeCloser?.()
    activeCloser = () => setIsOpen(false)
    setIsOpen(true)
  }

  function close() {
    activeCloser = null
    setIsOpen(false)
  }

  return [isOpen, open, close]
}
