# Dashboard API Documentation

## Overview
The Dashboard API provides comprehensive metrics and statistics for administrators to monitor the Mediscribe platform. It aggregates data from various models including patients, sessions, users, transcripts, and chat conversations.

## Authentication
All dashboard endpoints require admin authentication (type_id: 1).

---

## Endpoints

### Get Dashboard Metrics
Retrieves comprehensive dashboard statistics and metrics.

**Endpoint:** `GET /dashboard`

**Access Control:** Admin only (type_id: 1)

**Request Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response Success (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Dashboard metrics retrieved successfully",
  "data": {
    "overview": {
      "totalPatients": 150,
      "totalSessions": 423,
      "totalUsers": 25,
      "activeSessions": 8,
      "completedSessions": 415,
      "totalTranscripts": 5234,
      "totalChatConversations": 89
    },
    "sessions": {
      "today": 12,
      "thisWeek": 45,
      "thisMonth": 178,
      "thisYear": 423,
      "active": 8,
      "avgDuration": "23.45",
      "completionRate": "98.11"
    },
    "patients": {
      "today": 3,
      "thisWeek": 15,
      "thisMonth": 42,
      "total": 150
    },
    "users": {
      "total": 25,
      "byType": {
        "admin": 2,
        "agent": 18,
        "customer": 5
      }
    },
    "topDoctors": [
      {
        "_id": "63592f9e29fa6431e563fe01",
        "name": "Dr. John Smith",
        "email": "john.smith@example.com",
        "sessionCount": 87
      }
    ],
    "recentActivity": {
      "recentPatients": [
        {
          "id": "63592f9e29fa6431e563fe01",
          "name": "Jane Doe",
          "gender": "Female",
          "phone": "+1234567890",
          "email": "jane.doe@example.com",
          "createdAt": "2026-03-13T10:30:00.000Z"
        }
      ],
      "recentSessions": [
        {
          "id": "63592f9e29fa6431e563fe01",
          "title": "Follow-up consultation",
          "patient": {
            "_id": "63592f9e29fa6431e563fe02",
            "name": "Jane Doe"
          },
          "doctor": {
            "_id": "63592f9e29fa6431e563fe03",
            "name": "Dr. John Smith",
            "email": "john.smith@example.com"
          },
          "status": "Active",
          "createdAt": "2026-03-13T10:00:00.000Z",
          "endedAt": null
        }
      ]
    }
  }
}
```

**Response Error (500 Internal Server Error):**
```json
{
  "success": false,
  "statusCode": 500,
  "message": "Failed to fetch dashboard metrics",
  "data": null
}
```

**Response Error (401 Unauthorized):**
```json
{
  "success": false,
  "statusCode": 401,
  "message": "Access denied. Admin privileges required.",
  "data": null
}
```

---

## Data Metrics Explained

### Overview Metrics
- **totalPatients**: Total number of registered patients in the system
- **totalSessions**: Total number of medical consultation sessions
- **totalUsers**: Total number of system users (admins, doctors, staff)
- **activeSessions**: Number of currently ongoing sessions (not ended)
- **completedSessions**: Number of sessions that have been completed
- **totalTranscripts**: Total number of transcript entries across all sessions
- **totalChatConversations**: Total number of chat conversations (excluding deleted)

### Session Metrics
- **today**: Sessions created today
- **thisWeek**: Sessions created this week
- **thisMonth**: Sessions created this month
- **thisYear**: Sessions created this year
- **active**: Number of active (ongoing) sessions
- **avgDuration**: Average duration of completed sessions in minutes
- **completionRate**: Percentage of sessions that have been completed (%)

### Patient Metrics
- **today**: Patients registered today
- **thisWeek**: Patients registered this week
- **thisMonth**: Patients registered this month
- **total**: Total registered patients

### User Metrics
- **total**: Total number of users in the system
- **byType**: Breakdown of users by their role type (admin, agent, customer, etc.)

### Top Doctors
List of top 5 most active doctors based on session count, including:
- Doctor ID
- Name
- Email
- Total number of sessions conducted

### Recent Activity
- **recentPatients**: Last 5 registered patients with basic information
- **recentSessions**: Last 5 sessions with patient and doctor information, including status

---

## Time Period Calculations
- **Today**: From 00:00:00 to 23:59:59 of the current day
- **This Week**: From Sunday 00:00:00 to current time
- **This Month**: From 1st of the month 00:00:00 to current time
- **This Year**: From January 1st 00:00:00 to current time

---

## Usage Example

### Using cURL
```bash
curl -X GET http://localhost:3000/dashboard \
  -H "Authorization: Bearer your_jwt_token_here"
```

### Using JavaScript (Fetch API)
```javascript
fetch('http://localhost:3000/dashboard', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer your_jwt_token_here',
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Error:', error));
```

### Using Axios
```javascript
import axios from 'axios';

const getDashboardMetrics = async () => {
  try {
    const response = await axios.get('http://localhost:3000/dashboard', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log(response.data);
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
  }
};
```

---

## Performance Notes
- All database queries are executed in parallel using `Promise.all()` for optimal performance
- Aggregation pipelines are used for complex queries (user types, session stats, top doctors)
- Recent activity queries are limited to 5 records each to reduce response size
- All time-based queries use indexed `createdAt` fields for efficient filtering

---

## Business Intelligence

### Key Insights You Can Derive

1. **System Growth**: Track patient registration and session trends over time
2. **Resource Utilization**: Monitor active vs completed sessions
3. **Doctor Performance**: Identify most active doctors and their workload
4. **Session Efficiency**: Track average session duration and completion rates
5. **User Activity**: Monitor user distribution across different roles
6. **Real-time Monitoring**: View active sessions and recent patient registrations

### Recommended Dashboard Widgets

1. **Key Performance Indicators (KPIs)**
   - Total Patients
   - Total Sessions
   - Active Sessions
   - Completion Rate

2. **Time-based Charts**
   - Sessions trend (Today, Week, Month, Year)
   - Patient registration trend

3. **User Analytics**
   - Users by type (Pie chart)
   - Top doctors leaderboard

4. **Activity Feed**
   - Recent patients
   - Recent sessions

5. **Session Analytics**
   - Average session duration
   - Session completion rate
   - Active vs Completed sessions

---

## Error Handling
All errors are logged to `./logs/api-logs.txt` in development mode. The API will return appropriate error messages and status codes for different failure scenarios.

---

## Future Enhancements
Potential additions to the dashboard API:
- Patient demographics breakdown (age groups, gender distribution)
- Revenue and billing metrics
- Appointment scheduling statistics
- Patient satisfaction scores
- Transcript quality metrics
- Peak usage hours/days analysis
- Doctor availability and schedule optimization data

