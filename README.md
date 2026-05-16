# Team Task Manager 🚀

A full-stack team collaboration tool with role-based access control, Kanban boards, and real-time dashboard analytics.

## 🔗 Live URLs
- **Frontend:** https://frontend-production-45e2.up.railway.app
- **Backend API:** https://backend-production-e5dc6.up.railway.app
- **GitHub:** https://github.com/90sumit99/team-task-manager

*Note: Global Admins now have full cross-project visibility in the dashboard.*

## 🧰 Tech Stack

| Layer      | Technology                             |
|------------|----------------------------------------|
| Frontend   | React (Vite), Tailwind CSS, Recharts   |
| Backend    | Node.js, Express.js                    |
| Database   | PostgreSQL (Prisma ORM)                |
| Auth       | JWT (15 min) + Refresh Tokens (7 days) |
| Deployment | Railway                                |

## ✨ Features

- **JWT Authentication** — Signup/Login with bcrypt password hashing (12 rounds)
- **Password rules** — min 8 chars, 1 uppercase, 1 number enforced on backend
- **Role-based access** — Global (Admin/Member) + Project-level (Admin/Member) roles
- **Only Project Admins can** promote/demote member roles ← CRITICAL
- **Project management** — Create, update, delete projects; manage members by email
- **Task management** — Full CRUD with status/priority/assignee/due date
- **Kanban board** — Drag-and-drop columns (TODO / IN_PROGRESS / DONE)
  - Admins can drag any task; members can only drag their own
- **Dashboard** — Live stats, bar chart, overdue tasks list, admin-only tasks-per-user table
- **Comments** — Any project member can comment; authors/admins can delete

## 🚀 Local Setup

```bash
# 1. Clone repo
git clone <repo-url>
cd team-task-manager

# 2. Backend setup
cd backend
npm install
cp .env.example .env          # fill in your values

# 3. Run migrations & seed
npx prisma migrate dev --name init
npx prisma db seed

# 4. Start backend (port 5000)
npm run dev

# 5. Frontend setup (new terminal)
cd ../frontend
npm install
cp .env.example .env          # set VITE_API_URL=http://localhost:5000

# 6. Start frontend (port 5173)
npm run dev
```

## 🔑 Demo Credentials

| Role   | Email             | Password      |
|--------|-------------------|---------------|
| Admin  | admin@demo.com    | Admin@1234    |
| Member | member@demo.com   | Member@1234   |

## 📡 API Endpoints

| Method | Route                                      | Auth Required       | Description              |
|--------|--------------------------------------------|---------------------|--------------------------|
| POST   | /api/auth/register                         | Public              | Sign up                  |
| POST   | /api/auth/login                            | Public              | Login, get tokens        |
| POST   | /api/auth/refresh                          | Public              | Refresh access token     |
| POST   | /api/auth/logout                           | Public              | Invalidate refresh token |
| GET    | /api/auth/me                               | Auth                | Get current user         |
| GET    | /api/projects                              | Auth                | My projects              |
| POST   | /api/projects                              | Auth                | Create project           |
| GET    | /api/projects/:id                          | Project Member      | Project details          |
| PUT    | /api/projects/:id                          | Project Admin       | Update project           |
| DELETE | /api/projects/:id                          | Project Admin       | Delete project           |
| POST   | /api/projects/:id/members                  | Project Admin       | Add member by email      |
| DELETE | /api/projects/:id/members/:uid             | Project Admin       | Remove member            |
| PATCH  | /api/projects/:id/members/:uid/role        | Project Admin       | Change member role       |
| GET    | /api/projects/:id/tasks                    | Project Member      | List tasks (filterable)  |
| POST   | /api/projects/:id/tasks                    | Project Admin       | Create task              |
| GET    | /api/projects/:id/tasks/:tid               | Project Member      | Task detail + comments   |
| PUT    | /api/projects/:id/tasks/:tid               | Project Admin       | Full task update         |
| DELETE | /api/projects/:id/tasks/:tid               | Project Admin       | Delete task              |
| PATCH  | /api/projects/:id/tasks/:tid/status        | Assignee OR Admin   | Update status only       |
| GET    | /api/tasks/:tid/comments                   | Project Member      | List comments            |
| POST   | /api/tasks/:tid/comments                   | Project Member      | Add comment              |
| DELETE | /api/tasks/:tid/comments/:cid              | Author OR Admin     | Delete comment           |
| GET    | /api/dashboard                             | Auth                | Dashboard stats          |

## 🔒 Role-Based Access Control

### Global Roles
- **ADMIN** — System-wide admin (can view all projects)
- **MEMBER** — Can only access projects they belong to

### Project-Level Roles
- **ADMIN** — Full CRUD on project, tasks, members; can change member roles
- **MEMBER** — Can view tasks, update status of own tasks, add comments

### Critical Rules
- Only Project ADMINs can assign/change the ADMIN role to other members
- Members CANNOT promote anyone — enforced on both frontend AND backend
- Non-members receive `403 Access denied. Insufficient permissions.` on all project routes

## 🗄️ Database Schema

```
User        → ProjectMember (one-to-many)
Project     → ProjectMember (one-to-many, cascade delete)
Project     → Task          (one-to-many, cascade delete)
Task        → Comment       (one-to-many, cascade delete)
User        → Task          (assignee, one-to-many)
User        → Comment       (author, one-to-many)
User        → RefreshToken  (one-to-many, cascade delete)
```

## 🚂 Deploy to Railway

1. Push code to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Add a **PostgreSQL** plugin to the project
4. Set environment variables on the **backend** service:
   ```
   DATABASE_URL  = (auto-filled by Railway PostgreSQL plugin)
   JWT_SECRET    = your_random_secret
   REFRESH_TOKEN_SECRET = another_random_secret
   FRONTEND_URL  = https://your-frontend-service.railway.app
   NODE_ENV      = production
   ```
5. Set environment variables on the **frontend** service:
   ```
   VITE_API_URL = https://your-backend-service.railway.app
   ```
6. Railway reads `railway.toml` — the `buildCommand` automatically runs `prisma migrate deploy`
7. Re-run seed manually if needed: `railway run node prisma/seed.js` (from backend service)

## 📸 Screenshots

_Add screenshots here_

## 📋 Validation Rules

| Field       | Rule                                              |
|-------------|---------------------------------------------------|
| Email       | Valid format, required                            |
| Password    | Min 8 chars, 1 uppercase, 1 number                |
| Task title  | Required, max 100 chars                           |
| Due date    | Required on create, must be today or future       |
| Priority    | Must be LOW \| MEDIUM \| HIGH                     |
| Status      | Must be TODO \| IN_PROGRESS \| DONE               |
| AssigneeId  | Must be an existing member of the project         |

All validation errors return:
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [{ "field": "fieldName", "message": "Error message" }]
}
```
