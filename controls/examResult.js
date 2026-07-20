const ExamSchema = require("../models/exam");
const ExamResultSchema = require("../models/examResult");
const StudentSchema = require("../models/student");

// =========================
// Get Exam Results
// =========================
const getExamResults = async (req, res) => {
  try {
    const { examId } = req.params;
    const { groupIds, searchWord } = req.query;

    const exam = await ExamSchema.findById(examId);

    if (!exam) {
      return res.status(404).json({
        message: "الامتحان غير موجود",
      });
    }

    let query = {
      exam: examId,
      isActive: true,
    };

    // فلترة بالمجموعات
    if (groupIds) {
      const groups = groupIds.split(",").filter(Boolean);
      query.group = { $in: groups };
    }

    let results = await ExamResultSchema.find(query)
      .populate({
        path: "student",
        select: "fullName phone parentPhone code",
      })
      .populate("grade", "name")
      .populate("group", "name")
      .populate("exam")
      .sort({
        score: -1,
      });

    // البحث بالاسم
    if (searchWord) {
      const word = searchWord.toLowerCase();

      results = results.filter((item) =>
        item.student?.fullName?.toLowerCase().includes(word),
      );
    }

    return res.status(200).json(results);
  } catch (error) {
    return res.status(500).json({
      message: "حدث خطأ",
      error: error.message,
    });
  }
};

// =========================
// Bulk Save Results
// =========================
const saveExamResults = async (req, res) => {
  try {
    const { examId, results } = req.body;

    if (!examId) {
      return res.status(400).json({
        message: "examId is required",
      });
    }

    if (!Array.isArray(results)) {
      return res.status(400).json({
        message: "results must be array",
      });
    }

    const operations = results.map((item) => {
      return {
        updateOne: {
          filter: {
            exam: examId,
            student: item.student,
          },
          update: {
            exam: examId,
            student: item.student,
            grade: item.grade,
            group: item.group,
            score: item.score || 0,
            isAbsent: item.isAbsent || false,
            notes: item.notes || "",
            correctedBy: req.user?._id,
          },
          upsert: true,
        },
      };
    });

    await ExamResultSchema.bulkWrite(operations);

    return res.status(200).json({
      message: "تم حفظ الدرجات بنجاح",
    });
  } catch (error) {
    console.log(error);
    return res.status(400).json({
      message: error.message,
    });
  }
};

const updateExamResults = async (req, res) => {
  try {
    const { results } = req.body;

    if (!Array.isArray(results)) {
      return res.status(400).json({
        message: "results must be array",
      });
    }

    const operations = results.map((item) => ({
      updateOne: {
        filter: {
          _id: item._id,
        },
        update: {
          $set: {
            score: item.score,
          },
        },
      },
    }));

    await ExamResultSchema.bulkWrite(operations);

    return res.status(200).json({
      message: "تم تعديل الدرجات بنجاح",
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
    });
  }
};

const getExamStudents = async (req, res) => {
  try {
    const { examId } = req.params;
    const { groupIds } = req.query;

    const exam = await ExamSchema.findById(examId);

    if (!exam) {
      return res.status(404).json({
        message: "الامتحان غير موجود",
      });
    }

    let groups = exam.groups;

    // فلترة المجموعات لو المستخدم اختار مجموعة معينة
    if (groupIds) {
      const selectedGroups = groupIds.split(",").filter(Boolean);

      groups = groups.filter((g) => selectedGroups.includes(g.toString()));
    }

    // الطلاب اللي اتسجلت درجاتهم في الامتحان ده
    const savedResults = await ExamResultSchema.find(
      { exam: examId, isActive: true },
      "student",
    );

    const studentIds = savedResults.map((e) => e.student);

    const students = await StudentSchema.find({
      group: { $in: groups },
      isActive: true,
      _id: { $nin: studentIds }, // استبعاد الطلاب اللي اتسجلوا
    })
      .populate("grade", "name")
      .populate("group", "name")
      .sort({ fullName: 1 });

    return res.status(200).json(students);
  } catch (error) {
    return res.status(500).json({
      message: "حدث خطأ",
      error,
    });
  }
};

module.exports = {
  getExamResults,
  saveExamResults,
  getExamStudents,
  updateExamResults,
};
