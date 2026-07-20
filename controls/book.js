const BookSchema = require("../models/book.js");
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
    const set = await BookSchema.create(body);
    await set.save();

    return res.status(200).json({ message: "تم انشاء مذكرة بنجاح" });
  } catch (error) {
    const errors = validatCreation(error, req.body);
    res.status(400).json({ errors: errors.errors, message: errors.message });
  }
};

const updateItem = async (req, res) => {
  try {
    let book = await BookSchema.findOne({ _id: req.params.id, isActive: true });
    if (!book) {
      return res.status(404).json({ message: "المذكرة غير موجودة" });
    }
    const body = {
      ...req.body,
    };

    await BookSchema.updateOne({ _id: req.params.id }, body);
    const dataAfterSave = await BookSchema.findOne({
      _id: req.params.id,
      isActive: true,
    });

    return res
      .status(200)
      .json({ data: dataAfterSave, message: "تم تعديل المذكرة بنجاح" });
  } catch (error) {
    const errors = validatCreation(error, req.body);
    res.status(400).json({ errors: errors.errors, message: errors.message });
  }
};

const deleteItem = async (req, res) => {
  try {
    await BookSchema.updateOne(
      { _id: req.params.id },
      {
        $set: {
          isActive: false,
        },
      },
    );
    res.status(200).json({ message: "تم حذف المذكرة بنجاح" });
  } catch (error) {
    res.status(404).json({ message: "المذكرة غير موجودة" });
  }
};

const getItem = async (req, res) => {
  try {
    const result = await BookSchema.findById(req.params.id);
    if (!result) return res.status(404).json({ message: "المذكرة غير موجودة" });
    res.status(200).json(result);
  } catch (error) {
    res.status(404).json({ message: "المذكرة غير موجودة" });
  }
};

const getItems = async (req, res) => {
  try {
    const {
      searchWord,
      grade,
      type,
      isActive,
      page = 1,
      limit = 10,
    } = req.query;

    const query = {
      isActive: true,
    };

    if (searchWord) {
      query.$or = [
        {
          name: {
            $regex: searchWord.replaceAll("\\", ""),
            $options: "i",
          },
        },
        {
          code: {
            $regex: searchWord.replaceAll("\\", ""),
            $options: "i",
          },
        },
      ];
    }

    if (grade) {
      query.grade = grade;
    }

    if (type) {
      query.type = type;
    }

    if (isActive !== undefined && isActive !== "") {
      query.isActive = isActive === "true";
    }

    const options = {
      page: Number(page),
      limit: Number(limit),
      isActive: true,
      sort: {
        createdAt: -1,
      },
      populate: {
        path: "grade",
        select: "name",
      },
    };

    const result = await BookSchema.paginate(query, options);

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
