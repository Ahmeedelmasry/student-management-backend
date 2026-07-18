const StudentSchema = require("../models/student.js");
const AttendanceSessionSchema = require("../models/attendanceSession");
const AttendanceSchema = require("../models/attendance");
const PaymentSchema = require("../models/payment");
const BookSchema = require("../models/book");
const bcrypt = require("bcrypt");
const path = require("path");
require("dotenv").config();
const { generToken } = require("./auth.js");

// Creation Validator
const validatCreation = (error, body) => {
  const errors = {};
  let mainMsg = null;

  if (error.code == 11000) {
    console.log(error);
    errors.userName = "name is already in use";
    mainMsg = "name is already in use";
  }
  for (const val of Object.entries(error.errors ? error.errors : body)) {
    if (error.errors && error.errors[val[0]]) {
      if (!mainMsg) mainMsg = error.errors[val[0]].message;
      errors[val[0]] = error.errors[val[0]].message;
    }
  }

  return {
    errors: errors,
    message: mainMsg,
  };
};

// Create User
const createItem = async (req, res) => {
  try {
    const body = {
      ...req.body,
    };
    const set = await StudentSchema.create(body);
    await set.save();

    return res.status(200).json({ message: "تم انشاء طالب بنجاح" });
  } catch (error) {
    const errors = validatCreation(error, req.body);
    res.status(400).json({ errors: errors.errors, message: errors.message });
  }
};

const updateItem = async (req, res) => {
  try {
    let grade = await StudentSchema.findOne({ _id: req.params.id });
    if (!grade) {
      return res.status(404).json({ message: "الطالب غير موجود" });
    }
    const body = {
      ...req.body,
    };

    await StudentSchema.updateOne({ _id: req.params.id }, body);
    const dataAfterSave = await StudentSchema.findOne({ _id: req.params.id });

    return res
      .status(200)
      .json({ data: dataAfterSave, message: "تم تعديل الطالب بنجاح" });
  } catch (error) {
    const errors = validatCreation(error, req.body);
    res.status(400).json({ errors: errors.errors, message: errors.message });
  }
};

const deleteItem = async (req, res) => {
  try {
    await StudentSchema.deleteOne({ _id: req.params.id });
    res.status(200).json({ message: "تم حذف الطالب بنجاح" });
  } catch (error) {
    res.status(404).json({ message: "الطالب غير موجود" });
  }
};

const getItem = async (req, res) => {
  try {
    const result = await StudentSchema.findById(req.params.id);
    if (!result) return res.status(404).json({ message: "الطالب غير موجود" });
    res.status(200).json(result);
  } catch (error) {
    res.status(404).json({ message: "الطالب غير موجود" });
  }
};

const getItems = async (req, res) => {
  try {
    let query = {};

    const {
      searchWord,
      grade,
      group,
      fromDate,
      toDate,
      page = 1,
      limit = 10,
    } = req.query;

    // Search
    if (searchWord) {
      query.$or = [
        {
          fullName: {
            $regex: searchWord.replaceAll("\\", ""),
            $options: "i",
          },
        },
        {
          barcode: {
            $regex: searchWord.replaceAll("\\", ""),
            $options: "i",
          },
        },
        {
          studentPhone: {
            $regex: searchWord.replaceAll("\\", ""),
            $options: "i",
          },
        },
        {
          parentPhone: {
            $regex: searchWord.replaceAll("\\", ""),
            $options: "i",
          },
        },
      ];
    }

    // Grade
    if (grade) {
      query.grade = grade;
    }

    // Group
    if (group) {
      query.group = group;
    }

    // Registration Date
    if (fromDate || toDate) {
      query.registrationDate = {};

      if (fromDate) {
        query.registrationDate.$gte = new Date(fromDate);
      }

      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        query.registrationDate.$lte = end;
      }
    }

    const options = {
      page: Number(page),
      limit: Number(limit),
      sort: {
        createdAt: -1,
      },
      populate: [
        {
          path: "grade",
          select: "name",
        },
        {
          path: "group",
          select: "name monthlyPrice",
        },
      ],
    };

    const result = await StudentSchema.paginate(query, options);

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const scanAttendance = async (req, res) => {
  try {
    const { barcode } = req.params;

    if (!barcode) {
      return res.status(400).json({
        message: "يرجى إدخال الباركود",
      });
    }

    // ===========================
    // Student
    // ===========================

    const student = await StudentSchema.findOne({
      barcode,
      isActive: true,
    })
      .populate("grade", "name")
      .populate("group", "name monthlyPrice startDate endDate");

    if (!student) {
      return res.status(404).json({
        message: "الطالب غير موجود",
      });
    }

    // ===========================
    // Today's session
    // ===========================

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const session = await AttendanceSessionSchema.findOne({
      group: student.group._id,
      sessionDate: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    });

    if (!session) {
      return res.status(404).json({
        message: "لا توجد محاضرة اليوم لهذه المجموعة",
      });
    }

    // ===========================
    // Already scanned?
    // ===========================

    const exists = await AttendanceSchema.findOne({
      session: session._id,
      student: student._id,
    });

    if (exists) {
      return res.status(409).json({
        message: "تم تسجيل حضور الطالب بالفعل",
      });
    }

    // ===========================
    // Save Attendance
    // ===========================

    await AttendanceSchema.create({
      session: session._id,
      student: student._id,
      grade: student.grade._id,
      group: student.group._id,
      status: "Present",
      scannedAt: new Date(),
      createdBy: req.user?._id,
    });

    // ===========================
    // Load Books & Payments
    // ===========================

    const currentDate = new Date();

    const [books, paidBooks, paidSubscriptions] = await Promise.all([
      BookSchema.find({
        grade: student.grade._id,
        isActive: true,
      }).select("name price"),

      PaymentSchema.find({
        student: student._id,
        type: "Book",
        status: "Paid",
      }).select("book"),

      PaymentSchema.find({
        student: student._id,
        type: "Subscription",
        status: "Paid",
      }).select("month year"),
    ]);

    // ===========================
    // Unpaid Books
    // ===========================

    const paidBookIds = paidBooks.map((e) => e.book.toString());

    const unpaidNotes = books
      .filter((book) => !paidBookIds.includes(book._id.toString()))
      .map((book) => ({
        id: book._id,
        title: book.name,
        price: book.price,
      }));

    // ===========================
    // Unpaid Months
    // ===========================

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

    // بداية الاستحقاق = الأكبر بين بداية المجموعة وتاريخ تسجيل الطالب
    const groupStartDate = new Date(student.group.startDate);

    const registrationDate = student.registrationDate
      ? new Date(student.registrationDate)
      : groupStartDate;

    const startDate =
      registrationDate > groupStartDate ? registrationDate : groupStartDate;

    // نهاية الاستحقاق = الأصغر بين نهاية المجموعة واليوم الحالي
    const groupEndDate = new Date(student.group.endDate);

    const lastDate = groupEndDate > currentDate ? currentDate : groupEndDate;

    const startYear = startDate.getFullYear();
    const startMonth = startDate.getMonth() + 1;

    const lastYear = lastDate.getFullYear();
    const lastMonth = lastDate.getMonth() + 1;

    const unpaidMonths = [];

    let year = startYear;
    let month = startMonth;

    while (year < lastYear || (year === lastYear && month <= lastMonth)) {
      const isPaid = paidSubscriptions.some(
        (payment) => payment.year === year && payment.month === month,
      );

      if (!isPaid) {
        unpaidMonths.push({
          year,
          month,
          title: `${monthNames[month]} ${year}`,
          monthlyPrice: student.group.monthlyPrice,
        });
      }

      month++;

      if (month > 12) {
        month = 1;
        year++;
      }
    }

    // ===========================
    // Response
    // ===========================

    return res.status(200).json({
      message: "تم تسجيل الحضور بنجاح",

      student: {
        _id: student._id,
        name: student.fullName,
        phone: student.phone,
        parentPhone: student.parentPhone,
        studentPhone: student.studentPhone,
        barcode: student.barcode,

        gradeName: student.grade.name,
        groupName: student.group.name,

        unpaidNotes,
        unpaidMonths,
      },
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "حدث خطأ أثناء تسجيل الحضور",
    });
  }
};

module.exports = {
  createItem,
  getItem,
  getItems,
  updateItem,
  deleteItem,
  scanAttendance,
};
