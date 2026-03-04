# FlexMaster — Task Management Backend (Django + DRF + Docker)

## Overview

FlexMaster is a containerized Django task management backend featuring a REST API built with Django REST Framework.  
The system supports user authentication, task and subtask management, email activation, and relational task completion propagation.

This project demonstrates backend engineering practices including:

- REST API design
- relational data modeling
- authentication workflows
- containerized development environments
- automated testing

A React frontend will be integrated in the next phase.

---

# Architecture

```
Client (React – planned)
        ↓
Django REST API (DRF)
        ↓
PostgreSQL
        ↓
Docker Containers
```

Components:

| Layer | Technology |
|------|------------|
| Backend | Django |
| API | Django REST Framework |
| Database | PostgreSQL |
| Containerization | Docker |
| Authentication | Custom Django User Model |
| Testing | Django + DRF Test Framework |

---

# Features

### Authentication
- Custom user model
- Email verification activation
- Login via username or email

### Task Management
- Create/update/delete tasks
- Subtasks
- Automatic parent completion propagation

### API
- RESTful endpoints
- Filtering
- Ordering
- Pagination
- User-scoped data access

### Infrastructure
- Dockerized development environment
- PostgreSQL container
- Environment variable configuration

### Data Integrity
- Unique task name per user
- Relational task/subtask consistency
- Serializer validation

### Testing
- API tests
- Model integrity tests
- Authentication tests

---

# API Endpoints
```
- GET /api/tasks/
- POST /api/tasks/
- GET /api/tasks/{id}/
- PUT /api/tasks/{id}/
- DELETE /api/tasks/{id}/

- GET /api/subtasks/
- POST /api/subtasks/
```

 ### Filtering Example

```
/api/tasks/?completed=true
```

### Ordering Example

```
/api/tasks/?ordering=dateCreated
```

---

# Running the Project

### 1. Clone the Repository

```bash
git clone <repo-url>
cd flexmaster
```

---

### 2. Create Environment File

Create a `.env` file:

```
DEBUG=True

POSTGRES_DB=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_HOST=db
POSTGRES_PORT=5432

SECRET_KEY=your-secret-key
```

---

### 3. Build Docker Containers

```bash
docker-compose up --build
```

---

### 4. Run Database Migrations

```bash
docker-compose exec web python manage.py migrate
```

---

### 5. Access the Application

Application:

```
http://localhost:8637
```

API Root:

```
http://localhost:8637/api/
```

---

# Running Tests

Execute tests inside the Docker container:

```bash
docker-compose exec web python manage.py test
```

---

# Engineering Decisions

### Custom User Model

Allows authentication flexibility and supports future extensibility for user profiles and permissions.

### REST API

The backend exposes a RESTful API using Django REST Framework to support integration with a React frontend.

### Subtask Completion Propagation

Task completion state automatically updates based on the completion status of associated subtasks.

### UTC Date Handling

All timestamps are stored in UTC to prevent timezone inconsistencies across clients.

### Dockerized Environment

Docker ensures a consistent development environment and simplifies dependency management.

---

# Future Improvements

- React frontend
- JWT authentication
- Asynchronous email processing (Celery)
- Production deployment (AWS / Fly / Railway)

---

# License

This project is for educational and portfolio purposes.