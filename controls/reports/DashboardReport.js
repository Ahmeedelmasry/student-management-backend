const StudentSchema = require("../../models/student");
const GroupSchema = require("../../models/group");
const PaymentSchema = require("../../models/payment");
const AttendanceSchema = require("../../models/attendance");
const AttendanceSessionSchema = require("../../models/attendanceSession");
const ExamSchema = require("../../models/exam");
const ExamResultSchema = require("../../models/examResult");

const getDashboard = async (req, res) => {
  try {
    const { grade, group, exam, period, month, year, fromDate, toDate } =
      req.query;

    // ==================================================
    // Date Filter
    // ==================================================

    let startDate = null;
    let endDate = null;

    const today = new Date();

    switch (period) {
      case "today":
        startDate = new Date(today);
        startDate.setHours(0, 0, 0, 0);

        endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999);
        break;

      case "thisWeek": {
        startDate = new Date(today);
        startDate.setDate(today.getDate() - today.getDay());
        startDate.setHours(0, 0, 0, 0);

        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        break;
      }

      case "thisMonth":
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);

        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        break;

      case "thisYear":
        startDate = new Date(today.getFullYear(), 0, 1);

        endDate = new Date(today.getFullYear(), 11, 31);
        endDate.setHours(23, 59, 59, 999);
        break;

      case "custom":
        if (fromDate) {
          startDate = new Date(fromDate);
        }

        if (toDate) {
          endDate = new Date(toDate);
          endDate.setHours(23, 59, 59, 999);
        }

        break;

      default:
        if (month && year) {
          startDate = new Date(Number(year), Number(month) - 1, 1);

          endDate = new Date(Number(year), Number(month), 0);
          endDate.setHours(23, 59, 59, 999);
        }

        break;
    }

    // ==================================================
    // Queries
    // ==================================================

    const studentQuery = {
      isActive: true,
    };

    if (grade) {
      studentQuery.grade = grade;
    }

    if (group) {
      studentQuery.group = group;
    }

    if (startDate || endDate) {
      studentQuery.createdAt = {};

      if (startDate) studentQuery.createdAt.$gte = startDate;

      if (endDate) studentQuery.createdAt.$lte = endDate;
    }

    const groupQuery = {
      isActive: true,
    };

    if (grade) {
      groupQuery.grade = grade;
    }

    if (group) {
      groupQuery._id = group;
    }

    const paymentQuery = {
      isActive: true,
    };

    const studentIds = await StudentSchema.find(studentQuery)
      .select("_id")
      .lean();

    paymentQuery.student = {
      $in: studentIds.map((e) => e._id),
    };

    if (startDate || endDate) {
      paymentQuery.paymentDate = {};

      if (startDate) {
        paymentQuery.paymentDate.$gte = startDate;
      }

      if (endDate) {
        paymentQuery.paymentDate.$lte = endDate;
      }
    }

    const attendanceQuery = {};

    if (grade) {
      attendanceQuery.grade = grade;
    }

    if (group) {
      attendanceQuery.group = group;
    }

    if (startDate || endDate) {
      attendanceQuery.scannedAt = {};

      if (startDate) {
        attendanceQuery.scannedAt.$gte = startDate;
      }

      if (endDate) {
        attendanceQuery.scannedAt.$lte = endDate;
      }
    }

    const sessionQuery = {};

    if (grade) {
      sessionQuery.grade = grade;
    }

    if (group) {
      sessionQuery.group = group;
    }

    if (startDate || endDate) {
      sessionQuery.sessionDate = {};

      if (startDate) {
        sessionQuery.sessionDate.$gte = startDate;
      }

      if (endDate) {
        sessionQuery.sessionDate.$lte = endDate;
      }
    }

    const examResultQuery = {};

    if (grade) {
      examResultQuery.grade = grade;
    }

    if (group) {
      examResultQuery.group = group;
    }

    if (exam) {
      examResultQuery.exam = exam;
    }

    if (startDate || endDate) {
      examResultQuery.updatedAt = {};

      if (startDate) {
        examResultQuery.updatedAt.$gte = startDate;
      }

      if (endDate) {
        examResultQuery.updatedAt.$lte = endDate;
      }
    }
    // ==================================================
    // Dashboard Cards
    // ==================================================

    const examQuery = {};

    if (grade) examQuery.grade = grade;
    if (exam) examQuery._id = exam;

    const [
      totalStudents,
      totalGroups,
      totalAttendanceSessions,
      totalAttendanceRecords,
      totalExams,
      totalExamResults,

      paidPaymentsCount,
      unpaidPaymentsCount,

      paidPaymentsAmount,
      unpaidPaymentsAmount,
    ] = await Promise.all([
      StudentSchema.countDocuments(studentQuery),

      GroupSchema.countDocuments(groupQuery),

      AttendanceSessionSchema.countDocuments(sessionQuery),

      AttendanceSchema.countDocuments(attendanceQuery),

      ExamSchema.countDocuments(examQuery),

      ExamResultSchema.countDocuments(examResultQuery),

      PaymentSchema.countDocuments({
        ...paymentQuery,
        status: "Paid",
      }),

      PaymentSchema.countDocuments({
        ...paymentQuery,
        status: "Unpaid",
      }),

      PaymentSchema.aggregate([
        {
          $match: {
            ...paymentQuery,
            status: "Paid",
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: "$amount",
            },
          },
        },
      ]),

      PaymentSchema.aggregate([
        {
          $match: {
            ...paymentQuery,
            status: "Unpaid",
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: "$amount",
            },
          },
        },
      ]),
    ]);

    const cards = {
      totalStudents,

      totalGroups,

      totalAttendanceSessions,

      totalAttendanceRecords,

      totalExams,

      totalExamResults,

      paidPaymentsCount,

      unpaidPaymentsCount,

      paidPaymentsAmount: paidPaymentsAmount[0]?.total || 0,

      unpaidPaymentsAmount: unpaidPaymentsAmount[0]?.total || 0,
    };

    // ==================================================
    // Attendance Statistics
    // ==================================================

    const attendanceStats = await AttendanceSchema.aggregate([
      {
        $match: attendanceQuery,
      },

      {
        $group: {
          _id: "$status",

          count: {
            $sum: 1,
          },
        },
      },
    ]);

    const attendance = {
      present: attendanceStats.find((e) => e._id === "Present")?.count || 0,

      absent: attendanceStats.find((e) => e._id === "Absent")?.count || 0,

      late: attendanceStats.find((e) => e._id === "Late")?.count || 0,
    };

    // ==================================================
    // Payments Statistics
    // ==================================================

    const paymentStats = await PaymentSchema.aggregate([
      {
        $match: paymentQuery,
      },

      {
        $group: {
          _id: "$status",

          amount: {
            $sum: "$amount",
          },

          count: {
            $sum: 1,
          },
        },
      },
    ]);

    const payments = {
      paidAmount: paymentStats.find((e) => e._id === "Paid")?.amount || 0,

      unpaidAmount: paymentStats.find((e) => e._id === "Unpaid")?.amount || 0,

      paidCount: paymentStats.find((e) => e._id === "Paid")?.count || 0,

      unpaidCount: paymentStats.find((e) => e._id === "Unpaid")?.count || 0,
    };

    // ==================================================
    // Exam Statistics
    // ==================================================

    const examStats = await ExamResultSchema.aggregate([
      {
        $match: examResultQuery,
      },

      {
        $facet: {
          corrected: [
            {
              $match: {
                isAbsent: false,
              },
            },
            {
              $count: "count",
            },
          ],

          absent: [
            {
              $match: {
                isAbsent: true,
              },
            },
            {
              $count: "count",
            },
          ],

          average: [
            {
              $match: {
                isAbsent: false,
              },
            },
            {
              $group: {
                _id: null,

                avg: {
                  $avg: "$score",
                },
              },
            },
          ],
        },
      },
    ]);

    const exams = {
      corrected: examStats[0].corrected[0]?.count || 0,

      absent: examStats[0].absent[0]?.count || 0,

      averageScore: Number((examStats[0].average[0]?.avg || 0).toFixed(2)),
    };

    // ==================================================
    // Charts
    // ==================================================

    // ==================================================
    // Students Per Grade
    // ==================================================

    const studentsPerGrade = await StudentSchema.aggregate([
      {
        $match: studentQuery,
      },
      {
        $group: {
          _id: "$grade",
          count: {
            $sum: 1,
          },
        },
      },
      {
        $lookup: {
          from: "grades",
          localField: "_id",
          foreignField: "_id",
          as: "grade",
        },
      },
      {
        $unwind: "$grade",
      },
      {
        $project: {
          _id: 0,
          label: "$grade.name",
          value: "$count",
        },
      },
      {
        $sort: {
          value: -1,
        },
      },
    ]);

    // ==================================================
    // Students Per Group
    // ==================================================

    const studentsPerGroup = await StudentSchema.aggregate([
      {
        $match: studentQuery,
      },
      {
        $group: {
          _id: "$group",
          count: {
            $sum: 1,
          },
        },
      },
      {
        $lookup: {
          from: "groups",
          localField: "_id",
          foreignField: "_id",
          as: "group",
        },
      },
      {
        $unwind: "$group",
      },
      {
        $project: {
          _id: 0,
          label: "$group.name",
          value: "$count",
        },
      },
      {
        $sort: {
          value: -1,
        },
      },
    ]);

    // ==================================================
    // Payments By Month
    // ==================================================

    const paymentsByMonth = await PaymentSchema.aggregate([
      {
        $match: {
          ...paymentQuery,
          status: "Paid",
        },
      },
      {
        $group: {
          _id: {
            year: {
              $year: "$paymentDate",
            },
            month: {
              $month: "$paymentDate",
            },
          },

          amount: {
            $sum: "$amount",
          },
        },
      },
      {
        $sort: {
          "_id.year": 1,
          "_id.month": 1,
        },
      },
      {
        $project: {
          _id: 0,

          label: {
            $concat: [
              {
                $toString: "$_id.month",
              },
              "/",
              {
                $toString: "$_id.year",
              },
            ],
          },

          value: "$amount",
        },
      },
    ]);

    // ==================================================
    // Attendance By Status
    // ==================================================

    const attendanceChart = [
      {
        label: "حاضر",
        value: attendance.present,
      },
      {
        label: "غائب",
        value: attendance.absent,
      },
      {
        label: "متأخر",
        value: attendance.late,
      },
    ];

    // ==================================================
    // Exam Status
    // ==================================================

    const examChart = [
      {
        label: "تم التصحيح",
        value: exams.corrected,
      },
      {
        label: "غياب",
        value: exams.absent,
      },
    ];

    // ==================================================
    // Latest Tables
    // ==================================================

    // ==================================================
    // Latest Payments
    // ==================================================

    const latestPayments = await PaymentSchema.find({
      ...paymentQuery,
      status: "Paid",
    })
      .populate("student", "fullName barcode")
      .populate("book", "name")
      .sort({
        paymentDate: -1,
      })
      .limit(10)
      .lean();

    // ==================================================
    // Latest Students
    // ==================================================

    const latestStudents = await StudentSchema.find(studentQuery)
      .populate("grade", "name")
      .populate("group", "name")
      .sort({
        createdAt: -1,
      })
      .limit(10)
      .lean();

    // ==================================================
    // Today's Sessions
    // ==================================================

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todaySessions = await AttendanceSessionSchema.find({
      ...(grade && { grade }),
      ...(group && { group }),

      sessionDate: {
        $gte: todayStart,
        $lte: todayEnd,
      },
      isActive: true,
    })
      .populate("grade", "name")
      .populate("group", "name")
      .sort({
        sessionDate: 1,
      })
      .lean();

    // ==================================================
    // Top Students
    // ==================================================

    const topStudents = await ExamResultSchema.aggregate([
      {
        $match: {
          ...examResultQuery,
          isAbsent: false,
        },
      },
      {
        $group: {
          _id: "$student",

          average: {
            $avg: "$score",
          },

          exams: {
            $sum: 1,
          },
        },
      },
      {
        $sort: {
          average: -1,
        },
      },
      {
        $limit: 10,
      },
      {
        $lookup: {
          from: "students",
          localField: "_id",
          foreignField: "_id",
          as: "student",
        },
      },
      {
        $unwind: "$student",
      },
      {
        $project: {
          _id: 0,

          name: "$student.fullName",

          barcode: "$student.barcode",

          average: {
            $round: ["$average", 2],
          },

          exams: 1,
        },
      },
    ]);

    // ==================================================
    // Most Absent Students
    // ==================================================

    const mostAbsentStudents = await AttendanceSchema.aggregate([
      {
        $match: {
          ...attendanceQuery,
          status: "Absent",
        },
      },
      {
        $group: {
          _id: "$student",

          absences: {
            $sum: 1,
          },
        },
      },
      {
        $sort: {
          absences: -1,
        },
      },
      {
        $limit: 10,
      },
      {
        $lookup: {
          from: "students",
          localField: "_id",
          foreignField: "_id",
          as: "student",
        },
      },
      {
        $unwind: "$student",
      },
      {
        $project: {
          _id: 0,

          name: "$student.fullName",

          barcode: "$student.barcode",

          absences: 1,
        },
      },
    ]);

    // ==================================================
    // Alerts
    // ==================================================

    const alerts = [];

    if (payments.unpaidCount > 0) {
      alerts.push({
        color: "red",
        icon: "mdi-cash-remove",
        title: `يوجد ${payments.unpaidCount} عملية دفع غير مكتملة`,
      });
    }

    if (todaySessions.length > 0 && attendance.present === 0) {
      alerts.push({
        color: "orange",
        icon: "mdi-calendar-alert",
        title: "لم يبدأ تسجيل حضور اليوم بعد",
      });
    }

    // ==========================================
    // Response
    // ==========================================

    return res.status(200).json({
      cards,

      attendance,

      payments,

      exams,

      charts: {
        studentsPerGrade,
        studentsPerGroup,
        paymentsByMonth,
        attendanceChart,
        examChart,
      },

      tables: {
        latestPayments,
        latestStudents,
        todaySessions,
        topStudents,
        mostAbsentStudents,
      },

      alerts,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "حدث خطأ أثناء تحميل بيانات الداشبورد",
    });
  }
};

module.exports = {
  getDashboard,
};
