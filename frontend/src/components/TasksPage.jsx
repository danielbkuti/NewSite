import { TaskList } from '@/components/TaskList'

// The full task manager, at /tasks. NavBar (logout, profile, nav links)
// now lives one level up in AuthenticatedLayout, so this is just a page
// container around the existing TaskList.
export function TasksPage() {
  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <h1 className="mb-4 text-2xl font-semibold tracking-tight">Tasks</h1>
      <TaskList />
    </div>
  )
}
