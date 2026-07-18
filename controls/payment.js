const PaymentSchema = require("../models/payment.js");
const StudentSchema = require("../models/student"); // عدل المسار حسب مشروعك
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
    const set = await PaymentSchema.create(body);
    await set.save();

    return res.status(200).json({ message: "تم الدفع بنجاح" });
  } catch (error) {
    const errors = validatCreation(error, req.body);
    res.status(400).json({ errors: errors.errors, message: errors.message });
  }
};

const updateItem = async (req, res) => {
  try {
    let grade = await PaymentSchema.findOne({ _id: req.params.id });
    if (!grade) {
      return res.status(404).json({ message: "الدفع غير موجود" });
    }
    const body = {
      ...req.body,
    };

    await PaymentSchema.updateOne({ _id: req.params.id }, body);
    const dataAfterSave = await PaymentSchema.findOne({ _id: req.params.id });

    return res
      .status(200)
      .json({ data: dataAfterSave, message: "تم تعديل الدفع بنجاح" });
  } catch (error) {
    const errors = validatCreation(error, req.body);
    res.status(400).json({ errors: errors.errors, message: errors.message });
  }
};

const deleteItem = async (req, res) => {
  try {
    await PaymentSchema.deleteOne({ _id: req.params.id });
    res.status(200).json({ message: "تم حذف الدفع بنجاح" });
  } catch (error) {
    res.status(404).json({ message: "الدفع غير موجود" });
  }
};

const getItem = async (req, res) => {
  try {
    const result = await PaymentSchema.findById(req.params.id);
    if (!result) return res.status(404).json({ message: "الدفع غير موجود" });
    res.status(200).json(result);
  } catch (error) {
    res.status(404).json({ message: "الدفع غير موجود" });
  }
};

const getItems = async (req, res) => {
  try {
    const {
      searchWord,
      grade,
      group,
      type,
      paymentMethod,
      month,
      year,
      fromDate,
      toDate,
      page = 1,
      limit = 10,
    } = req.query;

    const query = {};

    // Search
    if (searchWord) {
      const students = await StudentSchema.find(
        {
          $or: [
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
          ],
        },
        "_id",
      );

      query.student = {
        $in: students.map((s) => s._id),
      };
    }

    // Grade
    if (grade) {
      query.grade = grade;
    }

    // Group
    if (group) {
      query.group = group;
    }

    // Type
    if (type) {
      query.type = type;
    }

    // Payment Method
    if (paymentMethod) {
      query.paymentMethod = paymentMethod;
    }

    // Month
    if (month) {
      query.month = Number(month);
    }

    // Year
    if (year) {
      query.year = Number(year);
    }

    // Date Range
    if (fromDate || toDate) {
      query.paymentDate = {};

      if (fromDate) {
        query.paymentDate.$gte = new Date(fromDate);
      }

      if (toDate) {
        const endDate = new Date(toDate);
        endDate.setHours(23, 59, 59, 999);

        query.paymentDate.$lte = endDate;
      }
    }

    const options = {
      page: Number(page),
      limit: Number(limit),
      sort: {
        paymentDate: -1,
      },
      populate: [
        {
          path: "student",
          select: "fullName barcode studentPhone parentPhone",
        },
        {
          path: "grade",
          select: "name",
        },
        {
          path: "group",
          select: "name",
        },
        {
          path: "book",
          select: "name",
        },
      ],
    };

    const result = await PaymentSchema.paginate(query, options);

    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "حدث خطأ أثناء جلب البيانات",
      error,
    });
  }
};

module.exports = {
  createItem,
  getItem,
  getItems,
  updateItem,
  deleteItem,
};
