import { Button } from '@/components/ui/button'
import { TaskList } from '@/components/TaskList'

// The authenticated view, rendered at /tasks. Split out of App.jsx so
// that file can stay focused on auth state + routing.
export function AppShell({ username, onLogout }) {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto flex max-w-md flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">FlexMaster</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{username}</span>
            <Button variant="outline" size="sm" onClick={onLogout}>
              Log out
            </Button>
          </div>
        </div>

        <TaskList />
      </div>
    </div>
  )
}
