const BookSchema = require("../models/book");
const BookAssignmentSchema = require("../models/bookAssignment");
const StudentSchema = require("../models/student");

const assignGroups = async (req, res) => {
  try {
    const { book, groups } = req.body;

    // ==========================================
    // Validate
    // ==========================================

    if (!book) {
      return res.status(400).json({
        message: "يرجى اختيار المذكرة",
      });
    }

    if (!groups || !Array.isArray(groups) || groups.length === 0) {
      return res.status(400).json({
        message: "يرجى اختيار مجموعة واحدة على الأقل",
      });
    }

    // ==========================================
    // Check Book
    // ==========================================

    const bookData = await BookSchema.findOne({
      _id: book,
      isActive: true,
    }).lean();

    if (!bookData) {
      return res.status(404).json({
        message: "المذكرة غير موجودة",
      });
    }

    // ==========================================
    // Get Students
    // ==========================================

    const students = await StudentSchema.find({
      isActive: true,
      group: {
        $in: groups,
      },
    })
      .select("_id")
      .lean();

    if (!students.length) {
      return res.status(400).json({
        message: "لا يوجد طلاب داخل المجموعات المختارة",
      });
    }

    // ==========================================
    // Already Assigned
    // ==========================================

    const assignedStudents = await BookAssignmentSchema.find({
      book,
      isActive: true,
      student: {
        $in: students.map((e) => e._id),
      },
    })
      .select("student")
      .lean();

    const assignedIds = new Set(
      assignedStudents.map((e) => e.student.toString()),
    );

    // ==========================================
    // Prepare Insert
    // ==========================================

    const assignments = students
      .filter((student) => !assignedIds.has(student._id.toString()))
      .map((student) => ({
        student: student._id,
        book,
      }));

    if (!assignments.length) {
      return res.status(400).json({
        message: "جميع الطلاب لديهم هذه المذكرة بالفعل",
      });
    }

    // ==========================================
    // Insert
    // ==========================================

    await BookAssignmentSchema.insertMany(assignments);

    // ==========================================
    // Response
    // ==========================================

    return res.status(200).json({
      insertedCount: assignments.length,
      skippedCount: students.length - assignments.length,
      message: "تم إسناد المذكرة للمجموعات بنجاح",
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "حدث خطأ أثناء إسناد المذكرة",
    });
  }
};

// ==========================================
// Assign Book To Students
// ==========================================

const assignStudents = async (req, res) => {
  try {
    const { book, students } = req.body;

    // ==========================================
    // Validate
    // ==========================================

    if (!book) {
      return res.status(400).json({
        message: "يرجى اختيار المذكرة",
      });
    }

    if (!students || !Array.isArray(students) || students.length === 0) {
      return res.status(400).json({
        message: "يرجى اختيار طالب واحد على الأقل",
      });
    }

    // ==========================================
    // Check Book
    // ==========================================

    const bookData = await BookSchema.findOne({
      _id: book,
      isActive: true,
    }).lean();

    if (!bookData) {
      return res.status(404).json({
        message: "المذكرة غير موجودة",
      });
    }

    // ==========================================
    // Check Students
    // ==========================================

    const studentDocs = await StudentSchema.find({
      _id: {
        $in: students,
      },
      isActive: true,
    })
      .select("_id")
      .lean();

    if (!studentDocs.length) {
      return res.status(400).json({
        message: "لا يوجد طلاب صالحين للإسناد",
      });
    }

    // ==========================================
    // Already Assigned
    // ==========================================

    const assignedStudents = await BookAssignmentSchema.find({
      book,
      isActive: true,
      student: {
        $in: studentDocs.map((e) => e._id),
      },
    })
      .select("student")
      .lean();

    const assignedIds = new Set(
      assignedStudents.map((e) => e.student.toString()),
    );

    // ==========================================
    // Prepare Insert
    // ==========================================

    const assignments = studentDocs
      .filter((student) => !assignedIds.has(student._id.toString()))
      .map((student) => ({
        student: student._id,
        book,
      }));

    if (!assignments.length) {
      return res.status(400).json({
        message: "جميع الطلاب لديهم هذه المذكرة بالفعل",
      });
    }

    // ==========================================
    // Insert
    // ==========================================

    await BookAssignmentSchema.insertMany(assignments);

    // ==========================================
    // Response
    // ==========================================

    return res.status(200).json({
      insertedCount: assignments.length,
      skippedCount: studentDocs.length - assignments.length,
      message: "تم إسناد المذكرة للطلاب بنجاح",
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "حدث خطأ أثناء إسناد المذكرة",
    });
  }
};

// ==========================================
// Get Unassigned Students
// ==========================================

const getUnAssignedStudents = async (req, res) => {
  try {
    const { bookId } = req.params;

    const { group, barcode, searchWord, page = 1, limit = 10 } = req.query;

    // ==========================================
    // Validate
    // ==========================================

    if (!bookId) {
      return res.status(400).json({
        message: "يرجى اختيار المذكرة",
      });
    }

    // ==========================================
    // Check Book
    // ==========================================

    const book = await BookSchema.findOne({
      _id: bookId,
      isActive: true,
    });

    if (!book) {
      return res.status(404).json({
        message: "المذكرة غير موجودة",
      });
    }

    // ==========================================
    // Assigned Students
    // ==========================================

    const assignedStudents = await BookAssignmentSchema.find({
      book: bookId,
      isActive: true,
    }).select("student");

    const assignedIds = assignedStudents.map((e) => e.student);

    // ==========================================
    // Query
    // ==========================================

    const query = {
      isActive: true,

      _id: {
        $nin: assignedIds,
      },
    };

    if (group) {
      query.group = group;
    }

    if (barcode) {
      query.barcode = {
        $regex: barcode,
        $options: "i",
      };
    }

    if (searchWord) {
      query.$or = [
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
    // Options
    // ==========================================

    const options = {
      page: Number(page),
      limit: Number(limit),

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
    };

    // ==========================================
    // Data
    // ==========================================

    const result = await StudentSchema.paginate(query, options);

    return res.status(200).json(result);
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "حدث خطأ أثناء جلب الطلاب",
    });
  }
};

// ==========================================
// Get Assigned Students
// ==========================================

const getAssignedStudents = async (req, res) => {
  try {
    const { bookId } = req.params;

    const { group, barcode, searchWord, page = 1, limit = 10 } = req.query;

    // ==========================================
    // Student Filter
    // ==========================================

    const studentMatch = {
      isActive: true,
    };

    if (group) {
      studentMatch.group = group;
    }

    if (barcode) {
      studentMatch.barcode = {
        $regex: barcode,
        $options: "i",
      };
    }

    if (searchWord) {
      studentMatch.$or = [
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
    // Pagination
    // ==========================================

    const options = {
      page: Number(page),
      limit: Number(limit),

      sort: {
        assignedAt: -1,
      },

      populate: {
        path: "student",
        match: studentMatch,
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
      },

      lean: true,
    };

    let result = await BookAssignmentSchema.paginate(
      {
        book: bookId,
        isActive: true,
      },
      options,
    );

    // ==========================================
    // Remove unmatched students
    // ==========================================

    result.docs = result.docs.filter((e) => e.student);

    result.totalDocs = result.docs.length;

    return res.status(200).json(result);
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "حدث خطأ أثناء تحميل الطلاب",
    });
  }
};

// ==========================================
// Bulk Unassign Students
// ==========================================

const bulkUnassignStudents = async (req, res) => {
  try {
    const { bookId, studentIds } = req.body;

    // ==========================================
    // Validation
    // ==========================================

    if (!bookId) {
      return res.status(400).json({
        message: "يرجى اختيار المذكرة",
      });
    }

    if (!studentIds || !studentIds.length) {
      return res.status(400).json({
        message: "يرجى اختيار الطلاب",
      });
    }

    // ==========================================
    // Soft Delete Assignments
    // ==========================================

    const result = await BookAssignmentSchema.updateMany(
      {
        book: bookId,

        student: {
          $in: studentIds,
        },

        isActive: true,
      },
      {
        $set: {
          isActive: false,
        },
      },
    );

    return res.status(200).json({
      modifiedCount: result.modifiedCount,
      message: "تم إلغاء تسليم المذكرة للطلاب بنجاح",
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "حدث خطأ أثناء إلغاء التسليم",
    });
  }
};

module.exports = {
  assignGroups,
  assignStudents,
  getUnAssignedStudents,
  getAssignedStudents,
  bulkUnassignStudents,
};
