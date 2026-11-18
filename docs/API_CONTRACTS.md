# API Contracts & Conventions — Zaalima Cloud IDE

## 1. Protocol & Response Conventions

All API responses follow a consistent JSON envelope schema defined in `@cloud-ide/shared`.

### Standard Success Envelope
```json
{
  "success": true,
  "message": "Optional human-readable success description",
  "data": { ... },
  "timestamp": "2026-11-18T22:30:00.000Z"
}
```

### Standard Error Envelope
```json
{
  "success": false,
  "error": {
    "code": "ERROR_IDENTIFIER_CODE",
    "message": "Human-readable explanation of error",
    "details": null
  },
  "timestamp": "2026-11-18T22:30:00.000Z"
}
```

---

## 2. Standard HTTP Status Codes

| Status Code | Meaning | Usage |
| :--- | :--- | :--- |
| `200 OK` | Request succeeded | Standard GET, PUT, or PATCH operations |
| `201 Created` | Resource created | Successful POST creation |
| `400 Bad Request` | Invalid payload | Validation failure or malformed input |
| `401 Unauthorized` | Unauthenticated | Missing or expired token |
| `403 Forbidden` | Access denied | User lacks permission for workspace |
| `404 Not Found` | Resource missing | Entity does not exist |
| `500 Internal Error`| Server fault | Unhandled exception (logs captured server-side) |
| `503 Service Unavailable`| Degraded | Critical dependency unreachable |

---

## 3. Implemented Endpoints

### 3.1 Health Check
- **Endpoint:** `GET /api/health` (also mounted at `GET /health`)
- **Description:** Returns the operational status of the API server, database connectivity, runtime version, and process uptime.
- **Access:** Public

#### Response (`200 OK` or `503 Service Unavailable`):
```json
{
  "status": "healthy",
  "uptime": 12.45,
  "timestamp": "2026-11-18T22:30:00.000Z",
  "service": "cloud-ide-api",
  "version": "0.1.0",
  "environment": "development",
  "database": {
    "status": "connected",
    "name": "cloud_ide"
  }
}
```

---

## 4. Planned Endpoint Specifications (Milestone 2)

### 4.1 Workspaces
- `GET /api/v1/workspaces`: List user's workspaces
- `POST /api/v1/workspaces`: Create a new workspace
- `GET /api/v1/workspaces/:id`: Get workspace details and metadata
- `DELETE /api/v1/workspaces/:id`: Delete workspace

### 4.2 Files
- `GET /api/v1/workspaces/:id/files`: Get workspace file tree
- `POST /api/v1/workspaces/:id/files`: Create a file or directory
- `GET /api/v1/files/:fileId`: Fetch file content
- `PUT /api/v1/files/:fileId`: Update file content
- `DELETE /api/v1/files/:fileId`: Delete a file or directory
