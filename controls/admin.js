const AdminSchema = require("../models/admin");
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
    errors.userName = "User name is already in use";
    mainMsg = "User name is already in use";
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
  let filepath;
  try {
    const salt = await bcrypt.genSalt();
    //Hash The Password
    const mailBody = { ...req.body };
    req.body.password = await bcrypt.hash(req.body.password, salt);
    const body = {
      ...req.body,
    };

    if (req.files && req.files.file) {
      filepath = await uploadFile(req, res, "avatars");
      body.avatar = `${process.env.DOMAIN}/${filepath}`;
    }

    const set = await AdminSchema.create(body);
    await set.save();

    return res.status(200).json({ message: "تم انشاء مستخدم بنجاح" });
  } catch (error) {
    const errors = validatCreation(error, req.body);
    res.status(400).json({ errors: errors.errors, message: errors.message });
  }
};

const updateItem = async (req, res) => {
  try {
    let user = await AdminSchema.findOne({ _id: req.params.id });
    //Hash The Password
    if (!user) {
      return res.status(404).json({ message: "المستخدم غير موجود" });
    }
    const body = {
      ...req.body,
    };
    if (body.password) {
      const salt = await bcrypt.genSalt();

      //Hash The Password
      body.password = await bcrypt.hash(body.password, salt);
    }

    // Check If there is an image file uploaded
    let filepath;

    if (req.files && req.files.file) {
      filepath = await uploadFile(req, res, "avatars");
      body.avatar = `${process.env.DOMAIN}/${filepath}`;
    }

    await AdminSchema.updateOne({ _id: req.params.id }, body);
    const userAfterSave = await AdminSchema.findOne({ _id: req.params.id });

    const userData = {
      _id: req.params.id,
      ...body,
    };

    const cookie = generToken(userData);

    return res
      .status(200)
      .json({ token: cookie, message: "تم تعديل المستخدم بنجاح" });
  } catch (error) {
    const errors = validatCreation(error, req.body);
    res.status(400).json({ errors: errors.errors, message: errors.message });
  }
};

const deleteItem = async (req, res) => {
  try {
    await AdminSchema.deleteOne({ _id: req.params.id });
    res.status(200).json({ message: "تم حذف المستخدم بنجاح" });
  } catch (error) {
    res.status(404).json({ message: "المستخدم غير موجود" });
  }
};

// Get User
const getItem = async (req, res) => {
  try {
    const result = await AdminSchema.findById(req.params.id);
    if (!result) return res.status(404).json({ message: "المستخدم غير موجود" });
    res.status(200).json(result);
  } catch (error) {
    res.status(404).json({ message: "المستخدم غير موجود" });
  }
};

// Get User
const getItems = async (req, res) => {
  try {
    let query = {};

    const { searchWord, page = 1, limit = 10 } = req.query;

    if (searchWord) {
      query = {
        $or: [
          {
            fullName: {
              $regex: searchWord.replaceAll("\\", ""),
              $options: "i",
            },
          },
          {
            userName: {
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
      select: `userName fullName isActive isAdmin createdAt`,
    };

    const result = await AdminSchema.paginate(query, options);

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
