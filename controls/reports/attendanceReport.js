const StudentSchema = require("../../models/student");
const AttendanceSessionSchema = require("../../models/attendanceSession");
const AttendanceSchema = require("../../models/attendance");

const getAttendanceReport = async (req, res) => {
  try {
    const {
      searchWord,
      grade,
      group,
      fromDate,
      toDate,
      absentCount,
      absentOperator,
      absentTo,
    } = req.query;

    // ==========================
    // Students Query
    // ==========================

    const studentQuery = {
      isActive: true,
    };

    if (grade) {
      studentQuery.grade = grade;
    }

    if (group) {
      studentQuery.group = group;
    }

    if (searchWord) {
      studentQuery.$or = [
        {
          fullName: {
            $regex: searchWord,
            $options: "i",
          },
        },
        {
          studentPhone: {
            $regex: searchWord,
            $options: "i",
          },
        },
        {
          parentPhone: {
            $regex: searchWord,
            $options: "i",
          },
        },
        {
          barcode: {
            $regex: searchWord,
            $options: "i",
          },
        },
      ];
    }

    // ==========================
    // Sessions Query
    // ==========================

    const sessionQuery = {};

    if (grade) {
      sessionQuery.grade = grade;
    }

    if (group) {
      sessionQuery.group = group;
    }

    if (fromDate || toDate) {
      sessionQuery.sessionDate = {};

      if (fromDate) {
        sessionQuery.sessionDate.$gte = new Date(fromDate);
      }

      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        sessionQuery.sessionDate.$lte = end;
      }
    }

    // ==========================
    // Load Data
    // ==========================

    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 10);

    const [studentsResult, sessions] = await Promise.all([
      StudentSchema.paginate(studentQuery, {
        page,
        limit,
        sort: {
          fullName: 1,
        },
        populate: [
          {
            path: "grade",
            select: "name",
          },
          {
            path: "group",
            select: "name",
          },
        ],
        lean: true,
      }),

      AttendanceSessionSchema.find(sessionQuery).lean(),
    ]);

    const students = studentsResult.docs;

    // ==========================
    // Attendances
    // ==========================

    const attendances = await AttendanceSchema.find({
      session: {
        $in: sessions.map((e) => e._id),
      },
    }).lean();

    // ==========================
    // Attendance Map
    // ==========================

    const attendanceMap = {};

    attendances.forEach((attendance) => {
      attendanceMap[`${attendance.student}_${attendance.session}`] = attendance;
    });

    // ==========================
    // Report
    // ==========================

    const report = students
      .map((student) => {
        const studentSessions = sessions.filter(
          (session) =>
            session.group.toString() === student.group._id.toString(),
        );

        const totalSessions = studentSessions.length;

        let attended = 0;

        let lastAttendanceDate = null;

        let lastAbsentDate = null;

        studentSessions.forEach((session) => {
          const attendance = attendanceMap[`${student._id}_${session._id}`];

          if (attendance) {
            attended++;

            if (
              !lastAttendanceDate ||
              session.sessionDate > lastAttendanceDate
            ) {
              lastAttendanceDate = session.sessionDate;
            }
          } else {
            if (!lastAbsentDate || session.sessionDate > lastAbsentDate) {
              lastAbsentDate = session.sessionDate;
            }
          }
        });

        const absent = totalSessions - attended;

        const attendanceRate =
          totalSessions === 0
            ? 0
            : Math.round((attended / totalSessions) * 100);

        let attendanceStatus = {
          title: "",
          color: "",
        };

        if (attendanceRate >= 95) {
          attendanceStatus = {
            title: "ممتاز",
            color: "green",
          };
        } else if (attendanceRate >= 85) {
          attendanceStatus = {
            title: "جيد جدًا",
            color: "light-green",
          };
        } else if (attendanceRate >= 70) {
          attendanceStatus = {
            title: "متوسط",
            color: "amber",
          };
        } else if (attendanceRate >= 50) {
          attendanceStatus = {
            title: "ضعيف",
            color: "orange",
          };
        } else {
          attendanceStatus = {
            title: "منعدم",
            color: "red",
          };
        }

        return {
          _id: student._id,

          fullName: student.fullName,

          barcode: student.barcode,

          studentPhone: student.studentPhone,

          parentPhone: student.parentPhone,

          grade: student.grade,

          group: student.group,

          totalSessions,

          attended,

          absent,

          attendanceRate,

          attendanceStatus,

          lastAttendanceDate,

          lastAbsentDate,
        };
      })
      .filter((student) => {
        if (
          !absentOperator ||
          absentCount === undefined ||
          absentCount === ""
        ) {
          return true;
        }

        const value = Number(absentCount);

        switch (absentOperator) {
          case "eq":
            return student.absent === value;

          case "gt":
            return student.absent > value;

          case "gte":
            return student.absent >= value;

          case "lt":
            return student.absent < value;

          case "lte":
            return student.absent <= value;

          case "between":
            if (absentTo === undefined || absentTo === "") {
              return true;
            }

            return (
              student.absent >= value && student.absent <= Number(absentTo)
            );

          default:
            return true;
        }
      });

    return res.status(200).json({
      ...studentsResult,
      docs: report,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "حدث خطأ أثناء استخراج التقرير",
    });
  }
};

const getStudentAttendanceDetails = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { fromDate, toDate, grade, group } = req.query;

    const student = await StudentSchema.findById(studentId)
      .populate("grade", "name")
      .populate("group", "name")
      .lean();

    if (!student) {
      return res.status(404).json({
        message: "الطالب غير موجود",
      });
    }

    const sessionQuery = {
      group: group || student.group._id,
    };

    if (grade) {
      sessionQuery.grade = grade;
    }

    if (fromDate || toDate) {
      sessionQuery.sessionDate = {};

      if (fromDate) {
        sessionQuery.sessionDate.$gte = new Date(fromDate);
      }

      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);

        sessionQuery.sessionDate.$lte = end;
      }
    }

    const sessions = await AttendanceSessionSchema.find(sessionQuery)
      .sort({
        sessionDate: -1,
      })
      .lean();

    const attendances = await AttendanceSchema.find({
      student: student._id,
      session: {
        $in: sessions.map((e) => e._id),
      },
    }).lean();

    const attendanceMap = {};

    attendances.forEach((attendance) => {
      attendanceMap[attendance.session.toString()] = attendance;
    });

    const result = sessions.map((session) => {
      const attendance = attendanceMap[session._id.toString()];

      return {
        sessionId: session._id,
        title: session.title,
        sessionDate: session.sessionDate,

        attended: !!attendance,

        status: attendance ? attendance.status : "Absent",

        scannedAt: attendance?.scannedAt || null,

        notes: attendance?.notes || "",

        attendanceId: attendance?._id || null,
      };
    });

    return res.status(200).json({
      student: {
        _id: student._id,
        fullName: student.fullName,
        barcode: student.barcode,
        studentPhone: student.studentPhone,
        parentPhone: student.parentPhone,
        grade: student.grade,
        group: student.group,
      },
      sessions: result,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "حدث خطأ أثناء تحميل تفاصيل الحضور",
    });
  }
};

module.exports = {
  getAttendanceReport,
  getStudentAttendanceDetails,
};
