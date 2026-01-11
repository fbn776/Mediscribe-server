# API Documentation

## Patients API

### 1. Get All Patients

**Method:** `GET`  
**Route:** `/patients`  
**Access Control:** User types 1, 2

**Query Parameters:**
- `keyword` (optional): Search keyword to filter by name, email, or phone
- `dob_start` (optional): Start date for date of birth filter (ISO date string)
- `dob_end` (optional): End date for date of birth filter (ISO date string)
- `gender` (optional): Filter by gender
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of items per page (default: 10)

**Response (200):**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "patients": [
      {
        "_id": "6963f3c676c651358c5dad7d",
        "name": "John Rambo",
        "dob": "2003-10-09T18:30:00.000Z",
        "gender": "Male",
        "phone": "+918392046254",
        "email": "john@example.com",
        "createdAt": "2026-01-11T19:02:30.793Z",
        "updatedAt": "2026-01-11T19:02:30.793Z",
        "__v": 0
      }
    ],
    "page": 1,
    "limit": 10,
    "count": 1
  },
  "message": "Patients fetched successfully"
}
```

**Errors:**
- `500`: Internal server error

---

### 2. Get Patient by ID

**Method:** `GET`  
**Route:** `/patients/:id`  
**Access Control:** User types 1, 2, 3

**Params:**
- `id`: Patient ID (MongoDB ObjectId)

**Response (200):**
```json
{
  "success": true,
  "status": 200,
  "message": "Patient fetched successfully",
  "data": {
    "_id": "string",
    "name": "string",
    "dob": "date",
    "gender": "string",
    "phone": "string",
    "email": "string",
    "createdAt": "date",
    "updatedAt": "date"
  }
}
```

**Errors:**
- `400`: Invalid patient ID
- `404`: Patient not found
- `500`: Internal server error

---

### 3. Create Patient

**Method:** `POST`  
**Route:** `/patients`  
**Access Control:** User types 1, 2

**Body:**
```json
{
  "name": "string (required, max 200 chars)",
  "dob": "string (required, valid date string)",
  "gender": "string (required, max 50 chars)",
  "phone": "string (optional, 10-15 digits)",
  "email": "string (optional, valid email, max 100 chars)"
}
```

**Response (201):**
```json
{
  "success": true,
  "status": 201,
  "message": "Patient created successfully",
  "data": {
    "_id": "string",
    "name": "string",
    "dob": "date",
    "gender": "string",
    "phone": "string",
    "email": "string",
    "createdAt": "date",
    "updatedAt": "date"
  }
}
```

**Errors:**
- `400`: Invalid data (validation errors)
- `409`: Patient with this email or phone already exists
- `500`: Internal server error

---

### 4. Update Patient

**Method:** `PUT`  
**Route:** `/patients/:id`  
**Access Control:** User types 1, 2

**Params:**
- `id`: Patient ID (MongoDB ObjectId)

**Body:** (all fields optional)
```json
{
  "name": "string (max 200 chars)",
  "dob": "string (valid date string)",
  "gender": "string (max 50 chars)",
  "phone": "string (10-15 digits)",
  "email": "string (valid email, max 100 chars)"
}
```

**Response (200):**
```json
{
  "success": true,
  "status": 200,
  "message": "Patient updated successfully"
}
```

**Response (200 - No changes):**
```json
{
  "success": true,
  "status": 200,
  "message": "No changes made to patient"
}
```

**Errors:**
- `400`: Invalid patient ID or invalid data
- `404`: Patient not found
- `409`: Another patient with this email or phone already exists
- `500`: Internal server error

---

### 5. Delete Patient

**Method:** `DELETE`  
**Route:** `/patients/:id`  
**Access Control:** User types 1, 2

**Params:**
- `id`: Patient ID (MongoDB ObjectId)

**Response (200):**
```json
{
  "success": true,
  "status": 200,
  "message": "Patient deleted successfully"
}
```

**Errors:**
- `400`: Invalid patient ID
- `404`: Patient not found
- `500`: Internal server error

