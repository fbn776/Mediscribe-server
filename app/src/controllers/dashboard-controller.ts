import {Request, Response} from "express";
import {error_function, success_function} from "../utils/response-handler";
import Patients from "../db/models/patients";
import Sessions from "../db/models/sessions";
import Users from "../db/models/users";
import Transcripts from "../db/models/transcripts";
import ChatConversations from "../db/models/chat-conversations";

/**
 * Dashboard controller - provides overview metrics for admins
 * GET /dashboard
 * Access: Admin only (type_id: 1)
 */
export async function getDashboardMetrics(req: Request, res: Response) {
    try {
        // Get current date boundaries for time-based queries
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfYear = new Date(now.getFullYear(), 0, 1);

        // Parallel queries for better performance
        const [
            totalPatients,
            totalSessions,
            totalUsers,
            activeSessions,
            totalTranscripts,
            totalChatConversations,
            sessionsToday,
            sessionsThisWeek,
            sessionsThisMonth,
            sessionsThisYear,
            patientsToday,
            patientsThisWeek,
            patientsThisMonth,
            recentPatients,
            recentSessions,
        ] = await Promise.all([
            // Total counts
            Patients.countDocuments(),
            Sessions.countDocuments(),
            Users.countDocuments(),

            // Active sessions (not ended)
            Sessions.countDocuments({endedAt: {$exists: false}}),

            // Transcripts count
            Transcripts.countDocuments(),

            // Chat conversations count
            ChatConversations.countDocuments({deleted: false}),

            // Sessions by time period
            Sessions.countDocuments({createdAt: {$gte: startOfToday}}),
            Sessions.countDocuments({createdAt: {$gte: startOfWeek}}),
            Sessions.countDocuments({createdAt: {$gte: startOfMonth}}),
            Sessions.countDocuments({createdAt: {$gte: startOfYear}}),

            // Patients by time period
            Patients.countDocuments({createdAt: {$gte: startOfToday}}),
            Patients.countDocuments({createdAt: {$gte: startOfWeek}}),
            Patients.countDocuments({createdAt: {$gte: startOfMonth}}),

            // Recent records for quick view
            Patients.find()
                .sort({createdAt: -1})
                .limit(5)
                .select('name dob gender phone email createdAt'),

            Sessions.find()
                .sort({createdAt: -1})
                .limit(5)
                .populate('patient', 'name')
                .populate('added_by', 'name email')
                .select('title patient added_by endedAt createdAt'),
        ]);

        // Get user statistics by type
        const usersByType = await Users.aggregate([
            {
                $lookup: {
                    from: 'user_types',
                    localField: 'type',
                    foreignField: '_id',
                    as: 'userType'
                }
            },
            {
                $unwind: {
                    path: '$userType',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $group: {
                    _id: '$userType.title',
                    count: {$sum: 1}
                }
            }
        ]);

        // Calculate average session duration for completed sessions
        const sessionStats = await Sessions.aggregate([
            {
                $match: {endedAt: {$exists: true}}
            },
            {
                $project: {
                    duration: {
                        $divide: [
                            {$subtract: ['$endedAt', '$createdAt']},
                            1000 * 60 // Convert to minutes
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    avgDuration: {$avg: '$duration'},
                    totalCompleted: {$sum: 1}
                }
            }
        ]);

        // Get top active doctors (by session count)
        const topDoctors = await Sessions.aggregate([
            {
                $group: {
                    _id: '$added_by',
                    sessionCount: {$sum: 1}
                }
            },
            {$sort: {sessionCount: -1}},
            {$limit: 5},
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'doctor'
                }
            },
            {$unwind: '$doctor'},
            {
                $project: {
                    name: '$doctor.name',
                    email: '$doctor.email',
                    sessionCount: 1
                }
            }
        ]);

        const dashboardData = {
            overview: {
                totalPatients,
                totalSessions,
                totalUsers,
                activeSessions,
                completedSessions: totalSessions - activeSessions,
                totalTranscripts,
                totalChatConversations,
            },
            sessions: {
                today: sessionsToday,
                thisWeek: sessionsThisWeek,
                thisMonth: sessionsThisMonth,
                thisYear: sessionsThisYear,
                active: activeSessions,
                avgDuration: sessionStats[0]?.avgDuration?.toFixed(2) || 0,
                completionRate: totalSessions > 0
                    ? (((totalSessions - activeSessions) / totalSessions) * 100).toFixed(2)
                    : 0
            },
            patients: {
                today: patientsToday,
                thisWeek: patientsThisWeek,
                thisMonth: patientsThisMonth,
                total: totalPatients
            },
            users: {
                total: totalUsers,
                byType: usersByType.reduce((acc: any, item: any) => {
                    acc[item._id || 'Unknown'] = item.count;
                    return acc;
                }, {})
            },
            topDoctors,
            recentActivity: {
                recentPatients: recentPatients.map(p => ({
                    id: p._id,
                    name: p.name,
                    gender: p.gender,
                    phone: p.phone,
                    email: p.email,
                    createdAt: p.createdAt
                })),
                recentSessions: recentSessions.map(s => ({
                    id: s._id,
                    title: s.title,
                    patient: s.patient,
                    doctor: s.added_by,
                    status: s.endedAt ? 'Completed' : 'Active',
                    createdAt: s.createdAt,
                    endedAt: s.endedAt
                }))
            }
        };

        return res.status(200).send(
            success_function({
                status: 200,
                data: dashboardData,
                message: "Dashboard metrics retrieved successfully"
            })
        );

    } catch (error: any) {
        console.error("Dashboard Error:", error);
        return res.status(500).send(
            error_function({
                status: 500,
                message: error.message || "Failed to fetch dashboard metrics"
            })
        );
    }
}

