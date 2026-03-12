# Document Management API Documentation

## Overview

The Document Management system allows users to upload medical documents (PDFs and images), processes them through OCR, cleans the content with AI agents, and makes them searchable within chat sessions.

## Document Processing Pipeline

1. **File Upload** → Validate file type and size
2. **OCR Processing** → Extract text using Datalab OCR API
3. **AI Processing** → Clean and structure text with document agent
4. **Storage** → Save metadata in MongoDB, embed text in Chroma
5. **Chat Integration** → Make documents searchable in session chats

---

## Patient Documents API

### Upload Document for Patient

```
POST /patients/documents/upload/:patientID
```

Upload a medical document for a specific patient.

#### URL Parameters

| Parameter   | Type   | Required | Description            |
|-------------|--------|----------|------------------------|
| `patientID` | string | Yes      | Patient MongoDB ObjectId |

#### Request Body

Form-data with file upload:

| Field  | Type | Required | Description                           |
|--------|------|----------|---------------------------------------|
| `file` | File | Yes      | PDF or image file (JPEG, PNG) max 50MB |

#### Success Response `201`

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Document uploaded successfully. Processing in background.",
  "data": {
    "documentId": "660a1f2b...",
    "filename": "lab_results.pdf",
    "status": "uploading",
    "uploadPath": "uploads/documents/patients/..."
  }
}
```

#### Error Responses

- `400` - Invalid patient ID or file validation error
- `404` - Patient not found
- `413` - File too large

---

### Get Patient Documents

```
GET /patients/documents/:patientID
```

Get all documents for a specific patient with pagination.

#### URL Parameters

| Parameter   | Type   | Required | Description            |
|-------------|--------|----------|------------------------|
| `patientID` | string | Yes      | Patient MongoDB ObjectId |

#### Query Parameters

| Parameter | Type   | Default | Description                    |
|-----------|--------|---------|--------------------------------|
| `page`    | number | `1`     | Page number for pagination     |
| `limit`   | number | `20`    | Documents per page             |
| `status`  | string | -       | Filter by processing status    |

#### Success Response `200`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Documents fetched successfully",
  "data": {
    "documents": [
      {
        "_id": "660a1f2b...",
        "filename": "lab_results.pdf",
        "mimetype": "application/pdf",
        "size": 1024000,
        "status": "completed",
        "pageCount": 3,
        "qualityScore": 0.95,
        "session": {
          "_id": "660a1f2c...",
          "title": "Annual Checkup",
          "createdAt": "2026-03-13T10:00:00.000Z"
        },
        "uploadedBy": {
          "_id": "660a1f2d...",
          "name": "Dr. Smith",
          "email": "dr.smith@hospital.com"
        },
        "createdAt": "2026-03-13T10:00:00.000Z",
        "updatedAt": "2026-03-13T10:05:00.000Z"
      }
    ],
    "page": 1,
    "limit": 20,
    "count": 1
  }
}
```

---

### Download Patient Document

```
GET /patients/documents/download/:docID
```

Download the original document file.

#### URL Parameters

| Parameter | Type   | Required | Description              |
|-----------|--------|----------|--------------------------|
| `docID`   | string | Yes      | Document MongoDB ObjectId |

#### Success Response

Returns the file with appropriate headers for download from local storage.

---

## Session Documents API

### Upload Document for Session

```
POST /sessions/documents/upload/:sessionID
```

Upload a medical document for a specific session.

#### URL Parameters

| Parameter   | Type   | Required | Description            |
|-------------|--------|----------|------------------------|
| `sessionID` | string | Yes      | Session MongoDB ObjectId |

#### Request Body

Same as patient document upload.

#### Success Response `201`

Same format as patient document upload.

---

### Get Session Documents

```
GET /sessions/documents/:sessionID
```

Get all documents for a specific session.

#### URL Parameters

| Parameter   | Type   | Required | Description            |
|-------------|--------|----------|------------------------|
| `sessionID` | string | Yes      | Session MongoDB ObjectId |

#### Query Parameters

Same as patient documents.

#### Success Response `200`

Similar format to patient documents but filtered by session.

---

### Download Session Document

```
GET /sessions/documents/download/:docID
```

Download a document from a session with access control.

Same as patient document download but includes session access validation.

---

## Document Processing Status

### Document Status Values

| Status        | Description                                    |
|---------------|------------------------------------------------|
| `uploading`   | File is being uploaded to storage            |
| `processing`  | OCR and AI processing in progress            |
| `completed`   | Document fully processed and searchable      |
| `error`       | Processing failed (see error field)         |

### Processing Flow

1. **Upload** → Status: `uploading`
2. **OCR API Call** → Status: `processing` 
3. **AI Agent Processing** → Status: `processing`
4. **Chroma Embedding** → Status: `completed`

If any step fails → Status: `error`

---

## File Upload Validation

### Allowed File Types

- **PDF**: `application/pdf`
- **Images**: `image/jpeg`, `image/png`

### File Size Limits

- **Maximum**: 50MB per file
- **Recommended**: Under 10MB for faster processing

### File Naming

- Original filename preserved in database
- Storage path includes patient/session ID for organization

---

## Chat Integration

Documents are automatically made available in chat sessions through:

### Context Access Rules

1. **Current Session**: Access to all session transcripts + documents
2. **Patient History**: Access to all patient documents across sessions
3. **Privacy**: No access to other patients' documents or other sessions' transcripts

### Search Capabilities

The chat agent can search through:

- **Transcripts**: From current session only
- **Documents**: From current session + all patient sessions
- **Combined Results**: Ranked by relevance and recency

### Example Chat Queries

```
"What were the lab results from last visit?"
"Show me the patient's medical history"
"What medications were prescribed in previous sessions?"
```

---

## Error Handling

### Common Error Codes

| Code | Description                    |
|------|--------------------------------|
| 400  | Invalid request or file format |
| 401  | Authentication required        |
| 403  | Access denied                  |
| 404  | Patient/Session/Document not found |
| 413  | File too large                 |
| 422  | OCR processing failed          |
| 500  | Server processing error        |

### Error Response Format

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Only PDF and image files (JPEG, PNG) are allowed",
  "error": "Invalid file type"
}
```

---

## Background Processing

### Asynchronous Pipeline

Documents are processed asynchronously after upload:

1. User receives immediate upload confirmation
2. Processing happens in background
3. Status updates in database
4. Chat availability when status = `completed`

### Processing Time

- **Small files** (< 1MB): 10-30 seconds
- **Medium files** (1-10MB): 30-120 seconds  
- **Large files** (10-50MB): 2-5 minutes

### Monitoring

Check document status via:
- GET document endpoint shows current `status`
- `error` field contains failure reason if status = `error`

---

## Security & Access Control

### Authentication

All endpoints require valid JWT token with appropriate user type:

- **Type 1**: Admin - Full access
- **Type 2**: Doctor - Access to assigned patients
- **Type 3**: Staff - Limited access

### Access Validation

- **Patient documents**: User must have patient access
- **Session documents**: User must be session creator
- **Download**: Additional ownership validation

### File Security

- Files stored locally in organized directory structure
- No direct file URLs exposed
- Access only through authenticated endpoints

---

## Integration with OCR Service

### OCR API Configuration

Set environment variable:
```
OCR_API_URL=http://localhost:3432
```

### OCR Service Response

```json
{
  "markdown": "# Lab Results\n\nPatient: John Doe...",
  "page_count": 3,
  "quality_score": 0.95
}
```

### Quality Scores

- **0.9-1.0**: Excellent OCR quality
- **0.7-0.9**: Good quality, minor corrections needed
- **0.5-0.7**: Fair quality, significant corrections needed
- **< 0.5**: Poor quality, manual review recommended

---

This documentation covers the complete document management system integrated with the Mediscribe platform.
