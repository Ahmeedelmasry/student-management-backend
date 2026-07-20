const GradeSchema = require("../models/grade.js");
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
    const set = await GradeSchema.create(body);
    await set.save();

    return res.status(200).json({ message: "تم انشاء صف بنجاح" });
  } catch (error) {
    const errors = validatCreation(error, req.body);
    res.status(400).json({ errors: errors.errors, message: errors.message });
  }
};

const updateItem = async (req, res) => {
  try {
    let grade = await GradeSchema.findOne({
      _id: req.params.id,
      isActive: true,
    });
    if (!grade) {
      return res.status(404).json({ message: "الصف غير موجود" });
    }
    const body = {
      ...req.body,
    };

    await GradeSchema.updateOne({ _id: req.params.id }, body);
    const dataAfterSave = await GradeSchema.findOne({
      _id: req.params.id,
      isActive: true,
    });

    return res
      .status(200)
      .json({ data: dataAfterSave, message: "تم تعديل الصف بنجاح" });
  } catch (error) {
    const errors = validatCreation(error, req.body);
    res.status(400).json({ errors: errors.errors, message: errors.message });
  }
};

const deleteItem = async (req, res) => {
  try {
    await GradeSchema.updateOne(
      { _id: req.params.id },
      {
        $set: {
          isActive: false,
        },
      },
    );
    res.status(200).json({ message: "تم حذف الصف بنجاح" });
  } catch (error) {
    res.status(404).json({ message: "الصف غير موجود" });
  }
};

const getItem = async (req, res) => {
  try {
    const result = await GradeSchema.findById(req.params.id);
    if (!result) return res.status(404).json({ message: "الصف غير موجود" });
    res.status(200).json(result);
  } catch (error) {
    res.status(404).json({ message: "الصف غير موجود" });
  }
};

const getItems = async (req, res) => {
  try {
    let query = {
      isActive: true,
    };

    const { searchWord, page = 1, limit = 10 } = req.query;

    if (searchWord) {
      query = {
        $or: [
          {
            name: {
              $regex: searchWord.replaceAll("\\", ""),
              $options: "i",
            },
          },
        ],
      };
    }

    const options = {
      page: Number(page),
      limit: Number(limit),
      populate: {
        path: "groups",
        select: "name startTime endTime monthlyPrice days isActive",
      },
    };

    const result = await GradeSchema.paginate(query, options);

    res.status(200).json(result);
  } catch (error) {
    res.status(404).json({ error: error });
  }
};

module.exports = {
  createItem,
  getItem,
  getItems,
  updateItem,
  deleteItem,
};
