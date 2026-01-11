# Sessions API Documentation

## Get All Sessions

**Method:** `GET`  
**Route:** `/sessions`  
**Access Control:** User types 1, 2, 3

### Query Parameters
- `keyword` (optional): Search keyword for session title (case-insensitive regex match)
- `startedAt` (optional): Filter sessions created at or after this date (ISO date string)
- `endedAt` (optional): Filter sessions ended at or before this date (ISO date string)
- `patient` (optional): Filter by patient ID
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of items per page (default: 10)

### Response
**Status:** 200 OK
```json
{
  "status": 200,
  "message": "Sessions fetched successfully",
  "data": {
    "sessions": [
      {
        "_id": "string",
        "title": "string",
        "added_by": "string",
        "patient": "string",
        "notes": "string",
        "endedAt": "date",
        "createdAt": "date",
        "updatedAt": "date"
      }
    ],
    "page": "number",
    "limit": "number",
    "count": "number"
  }
}
```

### Errors
- **500**: Internal server error

---

## Get Session by ID

**Method:** `GET`  
**Route:** `/sessions/:id`  
**Access Control:** User types 1, 2, 3

### Params
- `id` (required): Session ID (must be a valid MongoDB ObjectId)

### Response
**Status:** 200 OK
```json
{
  "status": 200,
  "message": "Session fetched successfully",
  "data": {
    "_id": "string",
    "title": "string",
    "added_by": "string",
    "patient": "string",
    "notes": "string",
    "endedAt": "date",
    "createdAt": "date",
    "updatedAt": "date"
  }
}
```

### Errors
- **400**: Invalid session ID
- **404**: Session not found
- **500**: Internal server error

---

## Create Session

**Method:** `POST`  
**Route:** `/sessions`  
**Access Control:** User types 1, 2, 3

### Body
```json
{
  "title": "string (required)",
  "patient": "string (required)",
  "notes": "string (optional)",
  "endedAt": "string (optional, ISO date string)"
}
```

### Response
**Status:** 201 Created
```json
{
  "status": 201,
  "message": "Session created successfully",
  "data": {
    "_id": "string",
    "title": "string",
    "added_by": "string",
    "patient": "string",
    "notes": "string",
    "endedAt": "date",
    "createdAt": "date",
    "updatedAt": "date"
  }
}
```

### Errors
- **400**: Invalid data (includes validation error details)
- **500**: Internal server error

---

## Update Session by ID

**Method:** `PUT`  
**Route:** `/sessions/:id`  
**Access Control:** User types 1, 2, 3

### Params
- `id` (required): Session ID (must be a valid MongoDB ObjectId)

### Body
```json
{
  "title": "string (optional)",
  "notes": "string (optional)",
  "endedAt": "string (optional, ISO date string)"
}
```

### Response
**Status:** 200 OK
```json
{
  "status": 200,
  "message": "Session updated successfully"
}
```

OR

```json
{
  "status": 200,
  "message": "No changes made to session"
}
```

### Errors
- **400**: Invalid session ID or invalid data (includes validation error details)
- **404**: Session not found
- **500**: Internal server error

---

## Delete Session by ID

**Method:** `DELETE`  
**Route:** `/sessions/:id`  
**Access Control:** User types 1, 2, 3

### Params
- `id` (required): Session ID (must be a valid MongoDB ObjectId)

### Response
**Status:** 200 OK
```json
{
  "status": 200,
  "message": "Session deleted successfully"
}
```

### Errors
- **400**: Invalid session ID
- **404**: Session not found
- **500**: Internal server error

