# Proposed Database Schema & Entity Relationships — Zaalima Cloud IDE

> **Notice:** These schemas represent the proposed data architecture submitted for review and approval before final Mongoose model implementation in Milestone 2.

---

## 1. Entity Relationship Overview

```text
       ┌──────────────────┐
       │      User        │
       └────────┬─────────┘
                │ 1
                │
                │ N
       ┌────────▼─────────┐
       │    Workspace     │
       └────────┬─────────┘
                │
       ┌────────┴────────┐
     1 │               1 │
       │ N               │ N
┌──────▼─────┐    ┌──────▼────────┐
│    File    │    │  ExecutionJob │
└────────────┘    └───────────────┘
```

---

## 2. Proposed Collections

### 2.1 Users (`users`)
Stores user identity, authentication credentials, and profile information.

| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Primary Key | Unique user identifier |
| `username` | String | Unique, Indexed, Required | Unique handle for user |
| `email` | String | Unique, Indexed, Required | Validated user email |
| `passwordHash` | String | Required | Argon2 / bcrypt hash (never plaintext) |
| `avatarUrl` | String | Optional | Profile image URL |
| `createdAt` | Date | Default `Date.now` | Account creation timestamp |
| `updatedAt` | Date | Default `Date.now` | Last update timestamp |

### 2.2 Workspaces (`workspaces`)
Represents an isolated coding environment owned by a user.

| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Primary Key | Unique workspace identifier |
| `name` | String | Required, Trimmed | Workspace display name |
| `description` | String | Optional | Optional project details |
| `ownerId` | ObjectId | Ref: `User`, Indexed | Owner of the workspace |
| `runtime` | String | Enum (`node`, `python`, `cpp`) | Target execution runtime environment |
| `isPublic` | Boolean | Default `false` | Access control flag |
| `createdAt` | Date | Default `Date.now` | Workspace creation timestamp |
| `updatedAt` | Date | Default `Date.now` | Workspace modification timestamp |

### 2.3 Files (`files`)
Hierarchical file and directory tree nodes belonging to a workspace.

| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Primary Key | Unique file identifier |
| `workspaceId` | ObjectId | Ref: `Workspace`, Indexed | Parent workspace |
| `name` | String | Required | File or folder name (e.g. `index.ts`) |
| `path` | String | Required, Indexed | Relative path within workspace (e.g. `/src/index.ts`) |
| `type` | String | Enum (`file`, `directory`) | Node classification |
| `parentId` | ObjectId | Ref: `File`, Optional | Parent directory ID (null for root items) |
| `content` | String | Optional (for files) | Raw text/code buffer |
| `size` | Number | Default `0` | Size in bytes |
| `createdAt` | Date | Default `Date.now` | Creation timestamp |
| `updatedAt` | Date | Default `Date.now` | Last edit timestamp |

### 2.4 ExecutionJobs (`execution_jobs`)
Audit log and execution history for code executions triggered in a workspace.

| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Primary Key | Unique job identifier |
| `workspaceId` | ObjectId | Ref: `Workspace`, Indexed | Workspace target |
| `triggeredBy` | ObjectId | Ref: `User` | User who initiated execution |
| `command` | String | Required | Command executed (e.g. `node index.js`) |
| `status` | String | Enum (`pending`, `running`, `completed`, `failed`, `timeout`) | Current lifecycle state |
| `exitCode` | Number | Nullable | Process exit code |
| `output` | String | Optional | Stored execution log/output |
| `durationMs` | Number | Optional | Wall-clock execution time in milliseconds |
| `createdAt` | Date | Default `Date.now` | Job submission timestamp |
| `completedAt` | Date | Optional | Job completion timestamp |

---

## 3. Database Connection & Security Principles
- Connection logic is strictly isolated in `apps/api/src/config/database.ts`.
- Credentials and database connection strings are never committed to version control and are parsed exclusively from environment variables (`MONGODB_URI`).
- Connection pooling and auto-reconnect listeners are configured to handle network latency or service restarts gracefully.
