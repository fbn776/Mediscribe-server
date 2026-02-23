# Chat API Documentation

Base path: `/chat`  
All routes require a valid **Bearer token** (`Authorization: Bearer <token>`).  
Access: user types **1** (Admin), **2** (Staff), **3** (Regular User).

---

## Common Response Envelope

Every response (success or error) follows this shape:

```json
{
  "success": true | false,
  "statusCode": 200,
  "message": "Human-readable message",
  "data": { ... } | null
}
```

---

## Conversations

A **conversation** is a named chat thread that holds a sequence of messages exchanged with the LLM.

---

### 1. List Conversations

```
GET /chat/conversations
```

Returns a paginated list of the authenticated user's conversations, sorted by most recently updated.

#### Query Parameters

| Parameter | Type   | Required | Default | Description                  |
|-----------|--------|----------|---------|------------------------------|
| `page`    | number | No       | `1`     | Page number                  |
| `limit`   | number | No       | `20`    | Number of results per page   |

#### Success Response `200`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Conversations fetched successfully",
  "data": {
    "conversations": [
      {
        "_id": "664a1f...",
        "title": "Hypertension follow-up",
        "user": "663f00...",
        "session": null,
        "systemPrompt": null,
        "deleted": false,
        "createdAt": "2026-02-24T10:00:00.000Z",
        "updatedAt": "2026-02-24T10:05:00.000Z"
      }
    ],
    "page": 1,
    "limit": 20,
    "count": 1
  }
}
```

---

### 2. Create Conversation

```
POST /chat/conversations
```

Creates a new conversation thread for the authenticated user.

#### Request Body (`application/json`)

| Field          | Type   | Required | Description                                                              |
|----------------|--------|----------|--------------------------------------------------------------------------|
| `title`        | string | No       | Display name of the thread. Defaults to `"New Conversation"`.            |
| `session`      | string | No       | MongoDB ObjectId of a linked clinical session.                           |
| `systemPrompt` | string | No       | Custom system prompt for this thread. Overrides the default AI persona.  |

```json
{
  "title": "Diabetes Q&A",
  "session": "664b2e...",
  "systemPrompt": "You are a specialist in endocrinology."
}
```

#### Success Response `201`

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Conversation created successfully",
  "data": {
    "_id": "664a1f...",
    "title": "Diabetes Q&A",
    "user": "663f00...",
    "session": "664b2e...",
    "systemPrompt": "You are a specialist in endocrinology.",
    "deleted": false,
    "createdAt": "2026-02-24T10:00:00.000Z",
    "updatedAt": "2026-02-24T10:00:00.000Z"
  }
}
```

---

### 3. Get Conversation

```
GET /chat/conversations/:id
```

Returns a single conversation along with its full message history (oldest → newest).

#### URL Parameters

| Parameter | Type   | Required | Description            |
|-----------|--------|----------|------------------------|
| `id`      | string | Yes      | Conversation ObjectId  |

#### Success Response `200`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Conversation fetched successfully",
  "data": {
    "conversation": {
      "_id": "664a1f...",
      "title": "Diabetes Q&A",
      "user": "663f00...",
      "session": null,
      "systemPrompt": null,
      "deleted": false,
      "createdAt": "2026-02-24T10:00:00.000Z",
      "updatedAt": "2026-02-24T10:05:00.000Z"
    },
    "messages": [
      {
        "_id": "665c3a...",
        "conversation": "664a1f...",
        "role": "user",
        "content": "What are the symptoms of Type 2 diabetes?",
        "usage": { "promptTokens": null, "completionTokens": null, "totalTokens": null },
        "finishReason": null,
        "createdAt": "2026-02-24T10:01:00.000Z",
        "updatedAt": "2026-02-24T10:01:00.000Z"
      },
      {
        "_id": "665c3b...",
        "conversation": "664a1f...",
        "role": "assistant",
        "content": "Common symptoms include increased thirst, frequent urination...",
        "usage": { "promptTokens": 45, "completionTokens": 120, "totalTokens": 165 },
        "finishReason": "stop",
        "createdAt": "2026-02-24T10:01:02.000Z",
        "updatedAt": "2026-02-24T10:01:02.000Z"
      }
    ]
  }
}
```

---

### 4. Update Conversation

```
PATCH /chat/conversations/:id
```

Updates the title and/or system prompt of an existing conversation.

#### URL Parameters

| Parameter | Type   | Required | Description           |
|-----------|--------|----------|-----------------------|
| `id`      | string | Yes      | Conversation ObjectId |

#### Request Body (`application/json`)

| Field          | Type         | Required | Description                              |
|----------------|--------------|----------|------------------------------------------|
| `title`        | string       | No       | New display name (min 1 character).      |
| `systemPrompt` | string\|null | No       | New system prompt, or `null` to clear.   |

```json
{
  "title": "Updated Thread Name",
  "systemPrompt": null
}
```

#### Success Response `200`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Conversation updated successfully",
  "data": {
    "_id": "664a1f...",
    "title": "Updated Thread Name",
    "systemPrompt": null,
    ...
  }
}
```

---

### 5. Delete Conversation

```
DELETE /chat/conversations/:id
```

Soft-deletes a conversation (it is marked as deleted and hidden from list/get queries).

#### URL Parameters

| Parameter | Type   | Required | Description           |
|-----------|--------|----------|-----------------------|
| `id`      | string | Yes      | Conversation ObjectId |

#### Success Response `200`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Conversation deleted successfully",
  "data": null
}
```

---

## Messages

---

### 6. Send Message

```
POST /chat/conversations/:id/messages
```

Appends the user's message to the conversation, calls the LLM with the full conversation history, and persists + returns the assistant's reply. The full message history is automatically included as context for every request.

#### URL Parameters

| Parameter | Type   | Required | Description           |
|-----------|--------|----------|-----------------------|
| `id`      | string | Yes      | Conversation ObjectId |

#### Request Body (`application/json`)

| Field     | Type   | Required | Description                                                                                    |
|-----------|--------|----------|------------------------------------------------------------------------------------------------|
| `message` | string | Yes      | The user's message text (min 1 character).                                                     |
| `model`   | string | No       | LLM model ID to use for this request (e.g. `"gpt-4o"`). Defaults to env `CHAT_MODEL` or `gpt-4o-mini`. |

```json
{
  "message": "What is the recommended first-line treatment for hypertension?",
  "model": "gpt-4o"
}
```

#### Success Response `200`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Message sent successfully",
  "data": {
    "userMessage": {
      "_id": "665c3a...",
      "conversation": "664a1f...",
      "role": "user",
      "content": "What is the recommended first-line treatment for hypertension?",
      "usage": { "promptTokens": null, "completionTokens": null, "totalTokens": null },
      "finishReason": null,
      "createdAt": "2026-02-24T10:10:00.000Z",
      "updatedAt": "2026-02-24T10:10:00.000Z"
    },
    "assistantMessage": {
      "_id": "665c3b...",
      "conversation": "664a1f...",
      "role": "assistant",
      "content": "The recommended first-line treatments for hypertension include...",
      "usage": {
        "promptTokens": 80,
        "completionTokens": 210,
        "totalTokens": 290
      },
      "finishReason": "stop",
      "createdAt": "2026-02-24T10:10:02.000Z",
      "updatedAt": "2026-02-24T10:10:02.000Z"
    }
  }
}
```

---

### 7. Get Messages

```
GET /chat/conversations/:id/messages
```

Returns a paginated list of all messages in a conversation, ordered oldest → newest.

#### URL Parameters

| Parameter | Type   | Required | Description           |
|-----------|--------|----------|-----------------------|
| `id`      | string | Yes      | Conversation ObjectId |

#### Query Parameters

| Parameter | Type   | Required | Default | Description                |
|-----------|--------|----------|---------|----------------------------|
| `page`    | number | No       | `1`     | Page number                |
| `limit`   | number | No       | `50`    | Number of results per page |

#### Success Response `200`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Messages fetched successfully",
  "data": {
    "messages": [
      {
        "_id": "665c3a...",
        "conversation": "664a1f...",
        "role": "user",
        "content": "What is the recommended first-line treatment for hypertension?",
        "usage": { "promptTokens": null, "completionTokens": null, "totalTokens": null },
        "finishReason": null,
        "createdAt": "2026-02-24T10:10:00.000Z",
        "updatedAt": "2026-02-24T10:10:00.000Z"
      }
    ],
    "page": 1,
    "limit": 50,
    "count": 1
  }
}
```

---

### 8. Clear Messages

```
DELETE /chat/conversations/:id/messages
```

Permanently deletes all messages in a conversation, effectively resetting the chat history. The conversation object itself is **not** deleted.

#### URL Parameters

| Parameter | Type   | Required | Description           |
|-----------|--------|----------|-----------------------|
| `id`      | string | Yes      | Conversation ObjectId |

#### Success Response `200`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Conversation history cleared",
  "data": null
}
```

---

## Error Responses

| Status | Condition                                       |
|--------|-------------------------------------------------|
| `400`  | Missing/invalid field or invalid ObjectId       |
| `401`  | Missing, invalid, or revoked JWT token          |
| `403`  | User type not permitted to access this route    |
| `404`  | Conversation not found (or belongs to another user) |

```json
{
  "success": false,
  "statusCode": 404,
  "message": "Conversation not found",
  "data": null
}
```

---

## Message Schema Reference

| Field          | Type                              | Description                                      |
|----------------|-----------------------------------|--------------------------------------------------|
| `_id`          | ObjectId                          | Unique message ID                                |
| `conversation` | ObjectId                          | Reference to parent conversation                 |
| `role`         | `"user"` \| `"assistant"` \| `"system"` | Who authored the message                   |
| `content`      | string                            | Message text                                     |
| `usage.promptTokens` | number \| null             | Input tokens used (assistant messages only)      |
| `usage.completionTokens` | number \| null         | Output tokens used (assistant messages only)     |
| `usage.totalTokens` | number \| null              | Total tokens used (assistant messages only)      |
| `finishReason` | string \| null                    | LLM finish reason e.g. `"stop"`, `"length"`      |
| `createdAt`    | ISO 8601 date                     | Creation timestamp                               |
| `updatedAt`    | ISO 8601 date                     | Last update timestamp                            |

