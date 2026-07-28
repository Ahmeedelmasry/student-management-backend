const BookSchema = require("../models/book");
const BookAssignmentSchema = require("../models/bookAssignment");
const StudentSchema = require("../models/student");
const PaymentSchema = require("../models/payment");

// ==========================================
// Assign Book To Students
// ==========================================

const assignStudents = async (req, res) => {
  try {
    const book = req.params.bookId;
    const students = req.body;
    const { payNow } = req.query;

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
      .select("_id grade group")
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
        group: student.group,
        grade: student.grade,
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

    if (payNow) {
      assignments.forEach(async (el) => {
        const exists = await PaymentSchema.findOne({
          book: el.book,
          student: el.student,
          isActive: true,
        });
        if (!exists) {
          const paymentBody = {
            student: el.student,
            group: el.group,
            grade: el.grade,
            type: "Book",
            month: new Date().getMonth() + 1,
            year: new Date().getFullYear(),
            book: el.book,
            paymentMethod: "Cash",
            amount: bookData.price,
          };

          const saveData = await PaymentSchema.create(paymentBody);

          await saveData.save();
        }
      });
    }

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

    const {
      group,
      barcode,
      searchWord,
      page = 1,
      limit = 10,
      paymentStatus,
    } = req.query;

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

    let docs = result.docs.map((e) => ({
      ...e._doc,
    }));

    const allBookPayments = await PaymentSchema.find({
      book: bookId,
      type: "Book",
      isActive: true,
    }).select("student paymentDate");

    docs.forEach((student) => {
      const payment = allBookPayments.find(
        (e) => e.student.toString() === student._id.toString(),
      );

      if (payment) {
        student.isPaid = true;
        student.paymentDate = payment.paymentDate;
      }
    });

    // ==========================================
    // Payment Status Filter
    // ==========================================

    if (paymentStatus === "paid") {
      docs = docs.filter((e) => e.isPaid);
    }

    if (paymentStatus === "unpaid") {
      docs = docs.filter((e) => !e.isPaid);
    }

    // ==========================================
    // Update Pagination
    // ==========================================

    result.docs = docs;
    result.totalDocs = docs.length;
    result.totalPages = Math.ceil(docs.length / Number(limit));

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

    const {
      group,
      barcode,
      searchWord,
      page = 1,
      limit = 10,
      paymentStatus,
    } = req.query;

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
        $in: assignedIds,
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

    let docs = result.docs.map((e) => ({
      ...e._doc,
    }));

    const allBookPayments = await PaymentSchema.find({
      book: bookId,
      type: "Book",
      isActive: true,
    }).select("student paymentDate");

    docs.forEach((student) => {
      const payment = allBookPayments.find(
        (e) => e.student.toString() === student._id.toString(),
      );

      if (payment) {
        student.isPaid = true;
        student.paymentDate = payment.paymentDate;
      }
    });

    // ==========================================
    // Payment Status Filter
    // ==========================================

    if (paymentStatus === "paid") {
      docs = docs.filter((e) => e.isPaid);
    }

    if (paymentStatus === "unpaid") {
      docs = docs.filter((e) => !e.isPaid);
    }

    // ==========================================
    // Update Pagination
    // ==========================================

    result.docs = docs;
    result.totalDocs = docs.length;
    result.totalPages = Math.ceil(docs.length / Number(limit));

    return res.status(200).json(result);
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "حدث خطأ أثناء جلب الطلاب",
    });
  }
};

// ==========================================
// Bulk Unassign Students
// ==========================================

const bulkUnassignStudents = async (req, res) => {
  try {
    const studentIds = req.body;
    const bookId = req.params.bookId;
    const { cancelPayment } = req.query;

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

    const result = await BookAssignmentSchema.deleteMany({
      book: bookId,

      student: {
        $in: studentIds,
      },
    });

    if (cancelPayment) {
      for (let i = 0; i < studentIds.length; i++) {
        const student = studentIds[i];
        const exists = await PaymentSchema.findOne({
          book: bookId,
          student: student,
          isActive: true,
        });
        if (exists) {
          const saveData = await PaymentSchema.updateOne(
            { _id: exists._id },
            { isActive: false },
          );
        }
      }
    }

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
  assignStudents,
  getUnAssignedStudents,
  getAssignedStudents,
  bulkUnassignStudents,
};
