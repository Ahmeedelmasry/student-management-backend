const GroupSchema = require("../models/group.js");

// Validation
const validatCreation = (error, body) => {
  const errors = {};
  let mainMsg = null;

  if (error.code == 11000) {
    errors.name = "Group name is already in use";
    mainMsg = "اسم المجموعة مستخدم بالفعل";
  }

  for (const val of Object.entries(error.errors ? error.errors : body)) {
    if (error.errors && error.errors[val[0]]) {
      if (!mainMsg) mainMsg = error.errors[val[0]].message;
      errors[val[0]] = error.errors[val[0]].message;
    }
  }

  return {
    errors,
    message: mainMsg,
  };
};

// Create
const createItem = async (req, res) => {
  try {
    const body = {
      ...req.body,
    };

    const group = await GroupSchema.create(body);

    return res.status(200).json({
      data: group,
      message: "تم إنشاء المجموعة بنجاح",
    });
  } catch (error) {
    const errors = validatCreation(error, req.body);

    return res.status(400).json({
      errors: errors.errors,
      message: errors.message,
    });
  }
};

// Update
const updateItem = async (req, res) => {
  try {
    const group = await GroupSchema.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        message: "المجموعة غير موجودة",
      });
    }

    await GroupSchema.updateOne(
      {
        _id: req.params.id,
      },
      {
        ...req.body,
      },
    );

    const dataAfterSave = await GroupSchema.findById(req.params.id).populate(
      "grade",
      "name",
    );

    return res.status(200).json({
      data: dataAfterSave,
      message: "تم تعديل المجموعة بنجاح",
    });
  } catch (error) {
    const errors = validatCreation(error, req.body);

    return res.status(400).json({
      errors: errors.errors,
      message: errors.message,
    });
  }
};

// Delete
const deleteItem = async (req, res) => {
  try {
    const group = await GroupSchema.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        message: "المجموعة غير موجودة",
      });
    }

    await GroupSchema.updateOne(
      { _id: req.params.id },
      {
        $set: {
          isActive: false,
        },
      },
    );

    return res.status(200).json({
      message: "تم حذف المجموعة بنجاح",
    });
  } catch (error) {
    return res.status(404).json({
      message: "المجموعة غير موجودة",
    });
  }
};

// Get One
const getItem = async (req, res) => {
  try {
    const result = await GroupSchema.findById(req.params.id).populate(
      "grade",
      "name",
    );

    if (!result) {
      return res.status(404).json({
        message: "المجموعة غير موجودة",
      });
    }

    return res.status(200).json(result);
  } catch (error) {
    return res.status(404).json({
      message: "المجموعة غير موجودة",
    });
  }
};

// Get List
const getItems = async (req, res) => {
  try {
    let query = {
      isActive: true,
    };

    const {
      searchWord,
      grade,
      day,
      isActive,
      fromDate,
      toDate,
      page = 1,
      limit = 10,
    } = req.query;

    if (searchWord) {
      query.name = {
        $regex: searchWord.replaceAll("\\", ""),
        $options: "i",
      };
    }

    if (grade) {
      query.grade = grade;
    }

    if (day) {
      query.days = day;
    }

    if (isActive !== undefined && isActive !== "") {
      query.isActive = isActive === "true";
    }

    if (fromDate || toDate) {
      query.startDate = {};

      if (fromDate) {
        query.startDate.$gte = new Date(fromDate);
      }

      if (toDate) {
        query.startDate.$lte = new Date(toDate);
      }
    }

    const options = {
      page: Number(page),
      limit: Number(limit),
      sort: {
        createdAt: -1,
      },
      populate: {
        path: "grade",
        select: "name",
      },
    };

    const result = await GroupSchema.paginate(query, options);

    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({
      message: error.message,
    });
  }
};

module.exports = {
  createItem,
  updateItem,
  deleteItem,
  getItem,
  getItems,
};
