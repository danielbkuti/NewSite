# Graph Report - flexmaster  (2026-08-27)

## Corpus Check
- 144 files · ~167,207 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 784 nodes · 1375 edges · 89 communities (55 shown, 34 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 40 edges (avg confidence: 0.8)
- Token cost: 506,073 input · 0 output

## Community Hubs (Navigation)
- Task REST API Layer
- React Dashboard Components
- Frontend NPM Dependencies
- Auth Form Components
- Legacy Django Templates
- Deadline Wheel Picker
- React App Auth Flow
- Task API Tests
- shadcn Component Config
- Legacy Web Forms/Views
- Task Detail Activity Log
- App Layout Shells
- Task Model Tests
- Confetti Celebration Effects
- Multi-step Signup API
- Task Card Styling Constants
- Task Card Interactions
- Login/Password Reset API
- Password Reset Forms
- New Task Creation Flow
- Landing Page Demo
- Task Detail Celebrations
- Custom User Model
- Account Auth Views
- Deployment & Docker Setup
- Legacy Static JS App
- Subtask Completion Cascade
- Signup/Activation Pages
- Deadline Status Hook
- Add Subtask Form
- Dashboard Action Cards
- Oxlint Config
- Signup Form
- Task Detail Subtask Rows
- Project URL Routing
- Signup Pending API
- Custom Auth Backend
- Auth Tests
- API Root Screenshot
- Timezone Middleware
- Password Reset Tokens
- JS Path Aliases Config
- Social Icon Symbols
- Task Detail Primary Action
- Django Settings
- Django Manage Entrypoint
- Pages App Config
- Tasks App Config
- CSRF Auth Check
- User App Config
- Vite Plugin Docs
- Card State Theming
- ASGI Config
- WSGI Config
- Pages Migration (initial)
- Pages Migration (cleanup)
- Tasks Migration (initial)
- Tasks Migration (relations)
- Tasks Migration (field removal)
- Tasks Migration (indexing)
- Tasks Migration (options)
- Tasks Migration (dateCompleted)
- Subtask Migration (dateCompleted)
- TaskActivity Migration
- User Migration (initial)
- User Migration (is_active)
- Docs/GitHub Icon Symbols
- Celebrations Handoff Spec
- Postgres Driver Deps
- App Favicon Asset
- Hero Graphic Asset
- React Logo Asset
- Vite Logo Asset
- Coverage Dependency
- CORS Headers Dependency
- Starfield Texture Asset

## God Nodes (most connected - your core abstractions)
1. `cn()` - 65 edges
2. `TaskDetailPage()` - 35 edges
3. `react` - 30 edges
4. `TaskList()` - 27 edges
5. `TaskCard()` - 23 edges
6. `apiFetch()` - 23 edges
7. `DeadlineEditor()` - 22 edges
8. `formatDeadline()` - 17 edges
9. `SubtaskStackCard()` - 15 edges
10. `Button()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `FlexMaster Session Handoff (Aug 26 2026)` --references--> `TaskActivity`  [EXTRACTED]
  HANDOFF.md → backend/tasks/models.py
- `TaskActivity migration marked applied but table missing from DB` --rationale_for--> `TaskActivity`  [EXTRACTED]
  HANDOFF.md → backend/tasks/models.py
- `AddTaskFab()` --references--> `.fab-starfield CSS texture layer`  [EXTRACTED]
  frontend/src/components/AddTaskFab.jsx → fab-motion-handoff.md
- `AddTaskFab()` --references--> `fabGrad SVG gradient definition`  [EXTRACTED]
  frontend/src/components/AddTaskFab.jsx → fab-motion-handoff.md
- `AddTaskFab()` --references--> `ringGrad SVG gradient definition`  [EXTRACTED]
  frontend/src/components/AddTaskFab.jsx → fab-motion-handoff.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Django templates implementing the shared base.html layout** — backend_templates_base_base_layout, backend_tasks_templates_tasks_completed_detail_view_completed_detail_view, backend_tasks_templates_tasks_completed_tasks_completed_tasks_list, backend_tasks_templates_tasks_subtasks_subtask_create_subtask_create_form, backend_tasks_templates_tasks_subtasks_subtask_edit_subtask_edit_form, backend_tasks_templates_tasks_task_create_task_create_form, backend_tasks_templates_tasks_task_delete_task_delete_confirm, backend_tasks_templates_tasks_task_detail_task_detail_view, backend_tasks_templates_tasks_task_edit_task_edit_form, backend_tasks_templates_tasks_task_list_task_list_view, backend_templates_home_home_view [EXTRACTED 1.00]
- **Four-state (progress/urgent/overdue/done) theming pattern shared across card and page scale** — frontend_src_components_taskcard_state_chrome, frontend_src_components_taskdetailpage_state_theme, handoff_four_state_card_system [INFERRED 0.85]
- **Core Django REST backend dependency stack** — requirements_django, requirements_djangorestframework, requirements_django_allauth, requirements_psycopg, requirements_django_cors_headers, requirements_django_filter [EXTRACTED 1.00]
- **User Signup and Account Activation Flow** — backend_user_templates_account_signup, backend_user_templates_account_acc_active_email, backend_user_templates_account_account_activation_sent, backend_user_templates_account_activation_invalid, backend_user_views_activate_view [INFERRED 0.85]
- **Transactional Plaintext Email Templates** — backend_user_templates_account_acc_active_email, backend_user_templates_account_password_reset_email, backend_user_templates_account_signup_verification_email [INFERRED 0.75]

## Communities (89 total, 34 thin omitted)

### Community 0 - "Task REST API Layer"
Cohesion: 0.06
Nodes (29): Meta, SubTaskSerializer, TaskActivitySerializer, TaskSerializer, REST API endpoint for managing subtasks., REST API endpoint for managing user tasks., SubTaskViewSet, TaskViewSet (+21 more)

### Community 1 - "React Dashboard Components"
Cohesion: 0.06
Nodes (45): Dashboard(), handleToggle(), HoverFillButton(), collectOverdueItems(), OverdueGateModal(), handleAddSubtask(), handleDeadlineSave(), handleDeleteConfirm() (+37 more)

### Community 2 - "Frontend NPM Dependencies"
Cohesion: 0.04
Nodes (45): @base-ui/react, class-variance-authority, clsx, dependencies, @base-ui/react, class-variance-authority, clsx, lucide-react (+37 more)

### Community 3 - "Auth Form Components"
Cohesion: 0.16
Nodes (20): LOGO_GRADIENT_STYLE, InlineEditableName(), LoginForm(), AuthField(), SignupProgress(), STEPS, AuthField(), Button() (+12 more)

### Community 4 - "Legacy Django Templates"
Cohesion: 0.09
Nodes (32): completed_detail_view.html template, completed_tasks.html template, subtask_create.html template, subtask_edit.html template, task_create.html template, task_delete.html template, task_detail.html template, task_edit.html template (+24 more)

### Community 5 - "Deadline Wheel Picker"
Cohesion: 0.09
Nodes (19): addDays(), clamp(), daysInMonth(), DeadlineEditor(), buildDayItems(), HOUR_ITEMS, MINUTE_ITEMS, MONTH_LABELS (+11 more)

### Community 6 - "React App Auth Flow"
Cohesion: 0.14
Nodes (22): App(), handleLogout(), handleSubmit(), ResetPasswordForm(), handleSubmit(), splitErrors(), SignupVerify(), handleDetailsSubmit() (+14 more)

### Community 7 - "Task API Tests"
Cohesion: 0.11
Nodes (12): APITestCase, Creating a subtask on a task you own should succeed., Attaching a subtask to someone else's task must be rejected — not silently…, Same non-propagation behavior as test_models, but driven through the actual API…, API should reject unauthenticated access., Users should only see their own tasks., Task created via API should automatically assign request.user., Filtering by completed should work. (+4 more)

### Community 8 - "shadcn Component Config"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 9 - "Legacy Web Forms/Views"
Cohesion: 0.21
Nodes (14): Meta, SubTaskForm, TaskForm, completed_tasks_detail_view(), completed_tasks_view(), login_required, require_http_methods, subtask_create_view() (+6 more)

### Community 10 - "Task Detail Activity Log"
Cohesion: 0.15
Nodes (14): ActivityLog(), classifyActivity(), collapseActivity(), collapsedLabel(), COLLAPSIBLE_KINDS, completionBannerCopy(), deadlineOutcomeClause(), DescriptionPanel() (+6 more)

### Community 11 - "App Layout Shells"
Cohesion: 0.13
Nodes (9): Google Fonts: Lato, Frontend index.html, ComingSoonPage(), COLUMNS, Footer(), ForgotPasswordForm(), handleSubmit(), NAV_LINKS (+1 more)

### Community 12 - "Task Model Tests"
Cohesion: 0.12
Nodes (9): TestCase, Computed property should return integer., A user should not be able to create duplicate task names if the unique…, Finishing every subtask does not, by itself, mark the parent task completed —…, A task can't validly stay marked completed once one of its subtasks isn't —…, dateCompleted is set automatically when completed flips to True, and cleared…, The update_fields=["completed"] path (subtask-triggered auto-reopen) still…, SubTask.dateCompleted follows the same rules as Task.dateCompleted — set on… (+1 more)

### Community 13 - "Confetti Celebration Effects"
Cohesion: 0.15
Nodes (14): ConfettiBurst(), degToRad(), FW_COLORS, FW_EMITTERS, innerSparkStyle(), outerSparkStyle(), Shell(), CASCADE_ITEMS (+6 more)

### Community 14 - "Multi-step Signup API"
Cohesion: 0.18
Nodes (13): Step 1 of the new multi-step signup flow: takes just an email, rejects it if a…, Step 4 (final) — takes the password and is what actually creates the real…, signup_complete_api(), signup_start_api(), Step 1 of the multi-step signup flow — just an email., SignupStartForm, generate_signup_token(), generate_username_from_name() (+5 more)

### Community 15 - "Task Card Styling Constants"
Cohesion: 0.12
Nodes (15): BADGE_CLASS, BANNER_ACTION_HOVER_TEXT, CHECKBOX_BORDER_CLASS, CHIP_CLASS, DELETE_CLASS, EMPTY_SET, FILL_CLASS, formatDueInDays() (+7 more)

### Community 16 - "Task Card Interactions"
Cohesion: 0.15
Nodes (5): formatOverdueElapsed(), isSameLocalDay(), SubtaskStackCard(), TaskCard(), toggleDeadlineEditor()

### Community 17 - "Login/Password Reset API"
Cohesion: 0.20
Nodes (14): check_email_exists(), login_api(), logout_api(), password_reset_request_api(), require_http_methods, Lets the landing page's single email box route to login vs. signup without the…, Step 1 of forgot-password. Always responds the same way whether or not the…, JSON counterpart to the existing template-based login_view. Reuses… (+6 more)

### Community 18 - "Password Reset Forms"
Cohesion: 0.14
Nodes (8): password_reset_confirm_api(), One resource, two actions on it — same shape as signup_pending_api: - GET: hit…, PasswordResetConfirmForm, PasswordResetRequestForm, Step 4 (final) — sets the password and, on success, is what triggers the real…, Step 1 of forgot-password — just an email, same shape as signup's., Sets a new password for an already-identified, already-token- verified user —…, SignupCompleteForm

### Community 19 - "New Task Creation Flow"
Cohesion: 0.18
Nodes (8): NewTaskPage(), handleSubmit(), ProgressPage(), TaskStoreContext, TaskStoreProvider(), createTask(), fetchTask(), fetchTasks()

### Community 20 - "Landing Page Demo"
Cohesion: 0.19
Nodes (13): DEMO_FRAMES, DEMO_TASKS, DemoTaskCard(), FEATURES, formatDeadline(), LandingPage(), handleStart(), prefersReducedMotion() (+5 more)

### Community 21 - "Task Detail Celebrations"
Cohesion: 0.21
Nodes (14): CompletionWash(), CONF_COLORS, CONF_EMITTERS, ConfettiPiece(), confPieceGeometry(), degToRad(), FireworkShell(), FW_COLORS (+6 more)

### Community 22 - "Custom User Model"
Cohesion: 0.18
Nodes (9): AbstractUser, CustomUserAdmin, PendingSignupAdmin, Migration, CustomUser, PendingSignup, Tracks a multi-step signup in progress, before a real CustomUser exists.…, Custom user model. - Enforces unique email addresses. - Defaults accounts to… (+1 more)

### Community 23 - "Account Auth Views"
Cohesion: 0.21
Nodes (12): AuthenticationForm, CustomLoginForm, Account Activation Email Template, Password Reset Email Template, Signup Verification Email Template, User Profile Page Template, account_activation_sent_view(), activate_view() (+4 more)

### Community 24 - "Deployment & Docker Setup"
Cohesion: 0.18
Nodes (14): db service (Postgres 16 container), flexmaster_network, postgres_data volume, web service (Django app container), Custom Django user model, Dockerized development environment, FlexMaster README, REST API (Django REST Framework) (+6 more)

### Community 25 - "Legacy Static JS App"
Cohesion: 0.27
Nodes (6): createTask(), deleteTask(), fetchTasks(), getCSRFToken(), renderTasks(), toggleComplete()

### Community 26 - "Subtask Completion Cascade"
Cohesion: 0.20
Nodes (9): SubtaskFlipList(), TaskDetailPage(), fireFireworks(), fireWash(), handleToggleTaskComplete(), calculateProgress(), Completion gated on list view, cascaded on detail page (deliberate), handoff/TaskDetailPage-5b.md spec (+1 more)

### Community 27 - "Signup/Activation Pages"
Cohesion: 0.20
Nodes (10): CustomSignupForm, Meta, Generates a fresh activation token + uid for the user and emails the activation…, send_activation_email(), Account Activation Sent Page, Activation Link Invalid Page, Login Page Template, Signup Page Template (+2 more)

### Community 28 - "Deadline Status Hook"
Cohesion: 0.29
Nodes (7): PendingCompleteButton(), formatClock(), formatElapsed(), pad(), useDeadlineStatus(), isDeadlineUrgent(), URGENT_WINDOW_MS

### Community 29 - "Add Subtask Form"
Cohesion: 0.31
Nodes (3): AddSubtaskForm(), useExclusiveDeadlineEditor(), formatDeadline()

### Community 30 - "Dashboard Action Cards"
Cohesion: 0.31
Nodes (5): ActionCard(), formatDeadline(), UpcomingRow(), PulseRing(), Checkbox()

### Community 31 - "Oxlint Config"
Cohesion: 0.25
Nodes (7): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, oxc, warn

### Community 32 - "Signup Form"
Cohesion: 0.47
Nodes (5): LOGO_GRADIENT_STYLE, SignupForm(), handleSubmit(), checkEmailExists(), startSignup()

### Community 35 - "Signup Pending API"
Cohesion: 0.40
Nodes (4): One resource, two actions on it: - GET: hit when the emailed verification link…, signup_pending_api(), Step 3 — first/last name + an optional username. If left blank here, a username…, SignupDetailsForm

### Community 36 - "Custom Auth Backend"
Cohesion: 0.40
Nodes (3): EmailOrUsernameBackend, Custom authentication backend that allows users to log in using either their…, ModelBackend

### Community 37 - "Auth Tests"
Cohesion: 0.40
Nodes (3): AuthTestCase, TestCase, Newly created users should default to inactive.

### Community 38 - "API Root Screenshot"
Cohesion: 0.50
Nodes (5): Api Root View (DefaultRouter default root view), Flexyy (project/app name shown in DRF browsable API header), API Root Screenshot (Django REST Framework), GET /api/subtasks/ endpoint, GET /api/tasks/ endpoint

### Community 41 - "JS Path Aliases Config"
Cohesion: 0.50
Nodes (3): compilerOptions, baseUrl, paths

### Community 42 - "Social Icon Symbols"
Cohesion: 0.67
Nodes (4): Bluesky Icon (SVG Symbol), Discord Icon (SVG Symbol), Social/Community Icon (SVG Symbol), X (Twitter) Icon (SVG Symbol)

### Community 48 - "CSRF Auth Check"
Cohesion: 0.67
Nodes (3): check_auth(), Reports auth status, and (via @ensure_csrf_cookie) hands the frontend a…, ensure_csrf_cookie

### Community 50 - "Vite Plugin Docs"
Cohesion: 0.67
Nodes (3): @vitejs/plugin-react, @vitejs/plugin-react-swc, Frontend README

### Community 51 - "Card State Theming"
Cohesion: 0.67
Nodes (3): STATE_CHROME, STATE_THEME, handoff/Card-states.md spec

## Ambiguous Edges - Review These
- `Legacy pre-React task system (backend/tasks/web/)` → `task_detail.html template`  [AMBIGUOUS]
  HANDOFF.md · relation: conceptually_related_to
- `Legacy pre-React task system (backend/tasks/web/)` → `navbar.html (legacy server-rendered nav)`  [AMBIGUOUS]
  HANDOFF.md · relation: conceptually_related_to
- `NavBar component (React)` → `base.html layout`  [AMBIGUOUS]
  backend/templates/base.html · relation: conceptually_related_to
- `psycopg==3.3.2` → `psycopg2-binary==2.9.11`  [AMBIGUOUS]
  requirements.txt · relation: semantically_similar_to

## Knowledge Gaps
- **141 isolated node(s):** `Migration`, `Migration`, `Migration`, `Migration`, `Migration` (+136 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **34 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Legacy pre-React task system (backend/tasks/web/)` and `task_detail.html template`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Legacy pre-React task system (backend/tasks/web/)` and `navbar.html (legacy server-rendered nav)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `NavBar component (React)` and `base.html layout`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `psycopg==3.3.2` and `psycopg2-binary==2.9.11`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._
- **Why does `FlexMaster Session Handoff (Aug 26 2026)` connect `Deadline Wheel Picker` to `Task REST API Layer`, `Task Card Interactions`, `Subtask Completion Cascade`, `Legacy Django Templates`?**
  _High betweenness centrality (0.164) - this node is a cross-community bridge._
- **Why does `TaskActivity` connect `Task REST API Layer` to `Deadline Wheel Picker`?**
  _High betweenness centrality (0.146) - this node is a cross-community bridge._
- **Why does `cn()` connect `Auth Form Components` to `Signup Form`, `React Dashboard Components`, `Task Detail Subtask Rows`, `Legacy Django Templates`, `Deadline Wheel Picker`, `Task Detail Activity Log`, `App Layout Shells`, `Task Detail Primary Action`, `Confetti Celebration Effects`, `Task Card Styling Constants`, `Task Card Interactions`, `New Task Creation Flow`, `Landing Page Demo`, `Subtask Completion Cascade`, `Deadline Status Hook`, `Dashboard Action Cards`?**
  _High betweenness centrality (0.113) - this node is a cross-community bridge._