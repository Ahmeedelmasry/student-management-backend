const StudentSchema = require("../../models/student");
const GradeSchema = require("../../models/grade");
const AttendanceSessionSchema = require("../../models/attendanceSession");
const AttendanceSchema = require("../../models/attendance");
const PaymentSchema = require("../../models/payment");
const BookAssignmentSchema = require("../../models/bookAssignment");
const ExamSchema = require("../../models/exam");
const ExamResultSchema = require("../../models/examResult");

// ==========================================
// PDF Generation
// ==========================================

const { generateStudentsPdfs } = require("./studentReportPdf");

const generateMonthlyStudentsReport = async (req, res) => {
  try {
    // ==========================================
    // Params
    // ==========================================

    const { gradeId } = req.params;

    // ==========================================
    // Body
    // ==========================================

    const { students = [], groups = [], month, year } = req.body;

    // ==========================================
    // Validate Grade
    // ==========================================

    if (!gradeId) {
      return res.status(400).json({
        message: "يرجى اختيار الصف الدراسي",
      });
    }

    // ==========================================
    // Check Grade
    // ==========================================

    const grade = await GradeSchema.findOne({
      _id: gradeId,
      isActive: true,
    }).lean();

    if (!grade) {
      return res.status(404).json({
        message: "الصف الدراسي غير موجود",
      });
    }

    // ==========================================
    // Report Date
    // ==========================================

    const today = new Date();

    const reportMonth = month ? Number(month - 1) : today.getMonth();

    const reportYear = year ? Number(year) : today.getFullYear();

    // ==========================================
    // Validate Month
    // ==========================================

    if (reportMonth < 1 || reportMonth > 12) {
      return res.status(400).json({
        message: "الشهر غير صحيح",
      });
    }

    // ==========================================
    // Normalize Arrays
    // ==========================================

    const studentIds = Array.isArray(students) ? students.filter(Boolean) : [];

    const groupIds = Array.isArray(groups) ? groups.filter(Boolean) : [];

    // ==========================================
    // Students Query
    // ==========================================

    const studentQuery = {
      grade: gradeId,
      isActive: true,
    };

    // ==========================================
    // Groups Filter
    // ==========================================

    if (groupIds.length > 0) {
      studentQuery.group = {
        $in: groupIds,
      };
    }

    // ==========================================
    // Students Filter
    // ==========================================

    if (studentIds.length > 0) {
      studentQuery._id = {
        $in: studentIds,
      };
    }

    // ==========================================
    // Get Students
    // ==========================================

    const selectedStudents = await StudentSchema.find(studentQuery)
      .populate("grade", "name")
      .populate("group", "name monthlyPrice startDate endDate")
      .sort({
        fullName: 1,
      })
      .lean();

    if (!selectedStudents.length) {
      return res.status(404).json({
        message: "لا يوجد طلاب مطابقين للاختيارات المحددة",
      });
    }

    // ==========================================
    // Month Start / End
    // ==========================================

    const monthStart = new Date(reportYear, reportMonth - 1, 1, 0, 0, 0, 0);

    const monthEnd = new Date(reportYear, reportMonth, 0, 23, 59, 59, 999);

    // ==========================================
    // Arabic Months
    // ==========================================

    const monthNames = {
      1: "يناير",
      2: "فبراير",
      3: "مارس",
      4: "إبريل",
      5: "مايو",
      6: "يونيو",
      7: "يوليو",
      8: "أغسطس",
      9: "سبتمبر",
      10: "أكتوبر",
      11: "نوفمبر",
      12: "ديسمبر",
    };

    // ==========================================
    // Final Reports
    // ==========================================

    const reports = [];

    // ==========================================
    // Loop Students
    // ==========================================

    for (const student of selectedStudents) {
      // ========================================
      // Student ID
      // ========================================

      const studentId = student._id;

      // ========================================
      // 1. Attendance Sessions
      // ========================================

      const sessions = await AttendanceSessionSchema.find({
        group: student.group._id,
        isActive: true,

        sessionDate: {
          $gte: monthStart,
          $lte: monthEnd,
        },
      })
        .sort({
          sessionDate: 1,
        })
        .lean();

      // ========================================
      // 2. Student Attendance
      // ========================================

      const attendances = await AttendanceSchema.find({
        student: studentId,
        isActive: true,

        scannedAt: {
          $gte: monthStart,
          $lte: monthEnd,
        },
      })
        .populate("session")
        .lean();

      // ========================================
      // Attendance Map
      // ========================================

      const attendanceMap = {};

      attendances.forEach((attendance) => {
        attendanceMap[attendance.session.toString()] = attendance;
      });

      // ========================================
      // Attendance Details
      // ========================================

      const attendanceDetails = sessions.map((session) => {
        const attendance = attendanceMap[session._id.toString()];

        return {
          sessionId: session._id,

          sessionDate: session.sessionDate,

          status: attendance ? attendance.status : "Absent",

          scannedAt: attendance?.scannedAt || null,
        };
      });

      // ========================================
      // Attendance Summary
      // ========================================

      const presentCount = attendanceDetails.filter(
        (item) => item.status === "Present",
      ).length;

      const absentCount = attendanceDetails.filter(
        (item) => item.status === "Absent",
      ).length;

      // ========================================
      // 3. Assigned Books
      // ========================================

      const assignedBooks = await BookAssignmentSchema.find({
        student: studentId,
        isActive: true,
      })
        .populate("book", "name price")
        .sort({
          assignedAt: 1,
        })
        .lean();

      // ========================================
      // 4. Book Payments
      // ========================================

      const bookPayments = await PaymentSchema.find({
        student: studentId,

        type: "Book",

        status: "Paid",

        isActive: true,
      }).lean();

      // ========================================
      // Paid Book IDs
      // ========================================

      const paidBookIds = bookPayments
        .filter((payment) => payment.book)
        .map((payment) => payment.book.toString());

      // ========================================
      // Books Details
      // ========================================

      const booksDetails = assignedBooks
        .filter((assignment) => assignment.book)
        .map((assignment) => {
          const isPaid = paidBookIds.includes(assignment.book._id.toString());

          const payment = bookPayments.find(
            (item) =>
              item.book &&
              item.book.toString() === assignment.book._id.toString(),
          );

          return {
            assignmentId: assignment._id,

            bookId: assignment.book._id,

            name: assignment.book.name,

            price: assignment.book.price,

            assignedAt: assignment.assignedAt,

            notes: assignment.notes,

            paymentStatus: isPaid ? "Paid" : "Unpaid",

            paymentDate: payment?.paymentDate || null,
          };
        });

      // ========================================
      // Books Summary
      // ========================================

      const paidBooksCount = booksDetails.filter(
        (item) => item.paymentStatus === "Paid",
      ).length;

      const unpaidBooksCount = booksDetails.filter(
        (item) => item.paymentStatus === "Unpaid",
      ).length;

      // ========================================
      // 5. Subscription Payment
      // ========================================

      const subscriptionPayment = await PaymentSchema.findOne({
        student: studentId,

        type: "Subscription",

        month: reportMonth,

        year: reportYear,

        status: "Paid",

        isActive: true,
      }).lean();

      // ========================================
      // Subscription
      // ========================================

      const subscription = {
        month: reportMonth,

        year: reportYear,

        monthName: monthNames[reportMonth],

        amount: subscriptionPayment?.amount || student.group.monthlyPrice,

        status: subscriptionPayment ? "Paid" : "Unpaid",

        paymentDate: subscriptionPayment?.paymentDate || null,

        payment: subscriptionPayment || null,
      };

      // ========================================
      // 6. Exams
      // ========================================

      const exams = await ExamSchema.find({
        grade: gradeId,

        group: student.group._id,

        isActive: true,

        createdAt: {
          $gte: monthStart,
          $lte: monthEnd,
        },
      })
        .sort({
          examDate: 1,
        })
        .lean();

      // ========================================
      // 7. Exam Results
      // ========================================

      const examResults = await ExamResultSchema.find({
        student: studentId,
        isActive: true,
      }).lean();

      // ========================================
      // Exam Result Map
      // ========================================

      const examResultMap = {};

      examResults.forEach((result) => {
        examResultMap[result.exam.toString()] = result;
      });

      // ========================================
      // Exam Details
      // ========================================

      const examsDetails = exams.map((exam) => {
        const result = examResultMap[exam._id.toString()];

        return {
          examId: exam._id,

          examName: exam.name,

          examDate: exam.createdAt,

          totalDegree: exam.maxScore,

          status: result ? result.status || "Present" : "Absent",

          degree: result?.score || 0,

          percentage: result
            ? Number(((result.score / exam.maxScore) * 100).toFixed(2))
            : 0,

          result: result || null,
        };
      });

      // ========================================
      // Exams Summary
      // ========================================

      const attendedExamsCount = examsDetails.filter(
        (item) => item.status !== "Absent",
      ).length;

      const absentExamsCount = examsDetails.filter(
        (item) => item.status === "Absent",
      ).length;

      // ========================================
      // Average Exam Percentage
      // ========================================

      const examsWithResults = examsDetails.filter(
        (item) => item.status !== "Absent",
      );

      const averagePercentage = examsWithResults.length
        ? Number(
            (
              examsWithResults.reduce((sum, exam) => sum + exam.percentage, 0) /
              examsWithResults.length
            ).toFixed(2),
          )
        : 0;

      // ========================================
      // 8. Student Payments This Month
      // ========================================

      const monthlyPayments = await PaymentSchema.find({
        student: studentId,

        isActive: true,

        paymentDate: {
          $gte: monthStart,
          $lte: monthEnd,
        },
      })
        .sort({
          paymentDate: 1,
        })
        .populate("book", "name price")
        .lean();

      // ========================================
      // Payment Summary
      // ========================================

      const totalPaidAmount = monthlyPayments
        .filter((payment) => payment.status === "Paid")
        .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

      // ========================================
      // Final Student Report
      // ========================================

      reports.push({
        // ======================================
        // Student
        // ======================================

        student: {
          _id: student._id,

          fullName: student.fullName,

          barcode: student.barcode,

          studentPhone: student.studentPhone,

          parentPhone: student.parentPhone,

          registrationDate: student.registrationDate,

          grade: student.grade,

          group: student.group,
        },

        // ======================================
        // Report Period
        // ======================================

        period: {
          month: reportMonth,

          year: reportYear,

          monthName: monthNames[reportMonth],

          from: monthStart,

          to: monthEnd,
        },

        // ======================================
        // Attendance
        // ======================================

        attendance: {
          totalSessions: attendanceDetails.length,

          presentCount,

          absentCount,

          attendancePercentage: attendanceDetails.length
            ? Number(
                ((presentCount / attendanceDetails.length) * 100).toFixed(2),
              )
            : 0,

          sessions: attendanceDetails,
        },

        // ======================================
        // Books
        // ======================================

        books: {
          totalBooks: booksDetails.length,

          paidBooksCount,

          unpaidBooksCount,

          items: booksDetails,
        },

        // ======================================
        // Subscription
        // ======================================

        subscription,

        // ======================================
        // Exams
        // ======================================

        exams: {
          totalExams: examsDetails.length,

          attendedExamsCount,

          absentExamsCount,

          averagePercentage,

          items: examsDetails,
        },

        // ======================================
        // Payments
        // ======================================

        payments: {
          totalPayments: monthlyPayments.length,

          totalPaidAmount,

          items: monthlyPayments,
        },
      });
    }

    // ==========================================
    // Generate & Save PDF Files (one per student)
    // ==========================================

    const period = {
      month: reportMonth,
      year: reportYear,
      monthName: monthNames[reportMonth],
    };

    const pdfResults = await generateStudentsPdfs({
      reports,
      grade,
      period,
      gradeId,
    });

    // ==========================================
    // Attach PDF Info To Each Report
    // ==========================================

    const pdfMap = {};

    pdfResults.forEach((item) => {
      pdfMap[item.studentId.toString()] = item;
    });

    reports.forEach((report) => {
      const pdfInfo = pdfMap[report.student._id.toString()];

      report.pdf = pdfInfo
        ? {
            fileName: pdfInfo.fileName,
            path: pdfInfo.relativePath,
          }
        : null;
    });

    // ==========================================
    // Response
    // ==========================================

    return res.status(200).json({
      message: "تم تجهيز تقارير الطلاب وحفظ ملفات PDF بنجاح",

      grade,

      period,

      totalStudents: reports.length,

      reports,
    });
  } catch (error) {
    console.log("generateMonthlyStudentsReport error:", error);

    return res.status(500).json({
      message: "حدث خطأ أثناء تجهيز تقارير الطلاب",
    });
  }
};

module.exports = {
  generateMonthlyStudentsReport,
};
