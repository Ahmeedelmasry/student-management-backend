const AttendenceSession = require("../models/attendanceSession.js");
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
    errors.userName = "تم تسجيل محاضرة لهذه المجموعة ف هذا التاريخ من قبل";
    mainMsg = "تم تسجيل محاضرة لهذه المجموعة ف هذا التاريخ من قبل";
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
    const set = await AttendenceSession.create(body);
    await set.save();

    return res.status(200).json({ message: "تم انشاء مذكرة بنجاح" });
  } catch (error) {
    const errors = validatCreation(error, req.body);
    res.status(400).json({ errors: errors.errors, message: errors.message });
  }
};

const updateItem = async (req, res) => {
  try {
    let book = await AttendenceSession.findOne({
      _id: req.params.id,
      isActive: true,
    });
    if (!book) {
      return res.status(404).json({ message: "المحاضرة غير موجودة" });
    }
    const body = {
      ...req.body,
    };

    await AttendenceSession.updateOne({ _id: req.params.id }, body);
    const dataAfterSave = await AttendenceSession.findOne({
      _id: req.params.id,
      isActive: true,
    });

    return res
      .status(200)
      .json({ data: dataAfterSave, message: "تم تعديل المحاضرة بنجاح" });
  } catch (error) {
    const errors = validatCreation(error, req.body);
    res.status(400).json({ errors: errors.errors, message: errors.message });
  }
};

const deleteItem = async (req, res) => {
  try {
    await AttendenceSession.updateOne(
      { _id: req.params.id },
      {
        $set: {
          isActive: false,
        },
      },
    );
    res.status(200).json({ message: "تم حذف المحاضرة بنجاح" });
  } catch (error) {
    res.status(404).json({ message: "المحاضرة غير موجودة" });
  }
};

const getItem = async (req, res) => {
  try {
    const result = await AttendenceSession.findById(req.params.id);
    if (!result)
      return res.status(404).json({ message: "المحاضرة غير موجودة" });
    res.status(200).json(result);
  } catch (error) {
    res.status(404).json({ message: "المحاضرة غير موجودة" });
  }
};

const getItems = async (req, res) => {
  try {
    const {
      searchWord,
      grade,
      group,
      type,
      status,
      isActive,
      fromDate,
      toDate,
      page = 1,
      limit = 10,
    } = req.query;

    const query = {};

    if (searchWord) {
      query.title = {
        $regex: searchWord.replaceAll("\\", ""),
        $options: "i",
      };
    }

    if (grade) {
      query.grade = grade;
    }

    if (group) {
      query.group = group;
    }

    if (fromDate || toDate) {
      query.sessionDate = {};

      if (fromDate) {
        query.sessionDate.$gte = new Date(fromDate);
      }

      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        query.sessionDate.$lte = end;
      }
    }

    const options = {
      page: Number(page),
      limit: Number(limit),
      isActive: true,
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
          select: "name days",
        },
      ],
    };

    const result = await AttendenceSession.paginate(query, options);

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error });
  }
};

module.exports = {
  createItem,
  getItem,
  getItems,
  updateItem,
  deleteItem,
};
