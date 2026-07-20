const StudentSchema = require("../../models/student");
const ExamSchema = require("../../models/exam");
const ExamResultSchema = require("../../models/examResult");

const getExamReport = async (req, res) => {
  try {
    const {
      searchWord,
      group,
      score,
      scoreOperator,
      scoreTo,
      page = 1,
      limit = 10,
    } = req.query;

    // ==========================================
    // Validate
    // ==========================================

    const { examId } = req.params;

    if (!examId) {
      return res.status(400).json({
        message: "يرجى اختيار الامتحان",
      });
    }

    // ==========================================
    // Exam
    // ==========================================

    const exam = await ExamSchema.findById(examId)
      .populate("grade", "name")
      .populate("groups", "name")
      .lean();

    if (!exam) {
      return res.status(404).json({
        message: "الامتحان غير موجود",
      });
    }

    // ==========================================
    // Students Query
    // ==========================================

    const studentQuery = {
      isActive: true,

      group: {
        $in: exam.groups.map((g) => g._id),
      },

      registrationDate: {
        $lt: exam.createdAt,
      },
    };

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

    // ==========================================
    // Load Data
    // ==========================================

    const [students, results] = await Promise.all([
      StudentSchema.find(studentQuery)
        .populate("grade", "name")
        .populate("group", "name")
        .lean(),

      ExamResultSchema.find({
        exam: exam._id,
        isActive: true,
      })
        .select("student score isAbsent notes updatedAt")
        .lean(),
    ]);

    console.log(results);

    // ==========================================
    // Result Map
    // ==========================================

    const resultMap = {};

    results.forEach((result) => {
      resultMap[result.student.toString()] = result;
    });

    // ==========================================
    // Build Report
    // ==========================================

    const report = [];

    // ==========================================
    // Build Report
    // ==========================================

    for (const student of students) {
      const result = resultMap[student._id.toString()];

      const scoreValue = result?.score ?? 0;

      const percentage =
        exam.maxScore === 0
          ? 0
          : Number((scoreValue / exam.maxScore) * 100).toFixed(2);

      let examStatus = {
        title: "",
        color: "",
      };

      if (!result) {
        examStatus = {
          title: "لم يتم التصحيح",
          color: "grey",
        };
      } else if (result.isAbsent) {
        examStatus = {
          title: "غائب",
          color: "red",
        };
      } else if (percentage >= 50) {
        examStatus = {
          title: "ناجح",
          color: "green",
        };
      } else {
        examStatus = {
          title: "راسب",
          color: "orange",
        };
      }

      report.push({
        _id: student._id,

        student,

        grade: student.grade,

        group: student.group,

        score: scoreValue,

        maxScore: exam.maxScore,

        percentage,

        isAbsent: result?.isAbsent ?? false,

        notes: result?.notes || "",

        correctedAt: result?.updatedAt || null,

        examStatus,

        result,
      });
    }

    // ==========================================
    // Ranking
    // ==========================================

    const rankedStudents = [...report]
      .filter((item) => item.result && !item.isAbsent)
      .sort((a, b) => b.score - a.score);

    rankedStudents.forEach((student, index) => {
      student.rank = index + 1;
    });

    report.forEach((student) => {
      if (!student.rank) {
        student.rank = null;
      }
    });

    // ==========================================
    // Score Filter
    // ==========================================

    const filteredReport = report.filter((student) => {
      if (
        !scoreOperator ||
        score === undefined ||
        score === null ||
        score === ""
      ) {
        return true;
      }

      const value = Number(score);

      switch (scoreOperator) {
        case "eq":
          return student.score === value;

        case "gt":
          return student.score > value;

        case "gte":
          return student.score >= value;

        case "lt":
          return student.score < value;

        case "lte":
          return student.score <= value;

        case "between":
          if (scoreTo === undefined || scoreTo === "") {
            return true;
          }

          return student.score >= value && student.score <= Number(scoreTo);

        default:
          return true;
      }
    });

    // ==========================================
    // Summary
    // ==========================================

    const correctedStudents = filteredReport.filter(
      (e) => e.result && !e.isAbsent,
    ).length;

    const summary = {
      totalStudents: filteredReport.length,

      correctedStudents: correctedStudents,

      absentStudents: filteredReport.filter((item) => item.isAbsent).length,

      notCorrectedStudents: filteredReport.filter((item) => !item.result)
        .length,

      averageScore:
        filteredReport.filter((item) => item.result && !item.isAbsent)
          .length === 0
          ? 0
          : Number(
              (
                filteredReport
                  .filter((item) => item.result && !item.isAbsent)
                  .reduce((sum, item) => sum + item.score, 0) /
                filteredReport.filter((item) => item.result && !item.isAbsent)
                  .length
              ).toFixed(2),
            ),

      successCount: filteredReport.filter(
        (item) => item.result && !item.isAbsent && item.percentage >= 50,
      ).length,

      failedCount: filteredReport.filter(
        (item) => item.result && !item.isAbsent && item.percentage < 50,
      ).length,
    };

    const successRate =
      correctedStudents === 0
        ? 0
        : Number(((summary.successCount / correctedStudents) * 100).toFixed(2));

    summary.successRate = successRate;

    // ==========================================
    // Sort
    // ==========================================

    filteredReport.sort((a, b) => {
      if (a.rank === null && b.rank !== null) return 1;
      if (a.rank !== null && b.rank === null) return -1;
      if (a.rank === null && b.rank === null) {
        return a.student.fullName.localeCompare(b.student.fullName, "ar");
      }

      return a.rank - b.rank;
    });

    // ==========================================
    // Manual Pagination
    // ==========================================

    const currentPage = Number(page);
    const perPage = Number(limit);

    const totalDocs = filteredReport.length;

    const totalPages = Math.ceil(totalDocs / perPage);

    const docs = filteredReport.slice(
      (currentPage - 1) * perPage,
      currentPage * perPage,
    );

    // ==========================================
    // Response
    // ==========================================

    return res.status(200).json({
      docs,

      totalDocs,

      limit: perPage,

      totalPages,

      page: currentPage,

      pagingCounter: (currentPage - 1) * perPage + 1,

      hasPrevPage: currentPage > 1,

      hasNextPage: currentPage < totalPages,

      prevPage: currentPage > 1 ? currentPage - 1 : null,

      nextPage: currentPage < totalPages ? currentPage + 1 : null,

      summary,

      exam: {
        _id: exam._id,
        name: exam.name,
        maxScore: exam.maxScore,
        duration: exam.duration,
        grade: exam.grade,
      },
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "حدث خطأ أثناء استخراج تقرير الامتحان",
    });
  }
};

module.exports = {
  getExamReport,
};
