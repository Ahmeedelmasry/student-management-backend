const ExamSchema = require("../models/exam.js");

// Validation
const validatCreation = (error, body) => {
  const errors = {};
  let mainMsg = null;

  if (error.code == 11000) {
    errors.name = "Exam name is already in use";
    mainMsg = "اسم الامتحان مستخدم بالفعل";
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

    const exam = await ExamSchema.create(body);

    return res.status(200).json({
      data: exam,
      message: "تم إنشاء الامتحان بنجاح",
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
    const exam = await ExamSchema.findById(req.params.id);

    if (!exam) {
      return res.status(404).json({
        message: "الامتحان غير موجود",
      });
    }

    await ExamSchema.updateOne(
      { _id: req.params.id },
      {
        ...req.body,
      },
    );

    const dataAfterSave = await ExamSchema.findById(req.params.id)
      .populate("grade", "name")
      .populate("groups", "name");

    return res.status(200).json({
      data: dataAfterSave,
      message: "تم تعديل الامتحان بنجاح",
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
    const exam = await ExamSchema.findById(req.params.id);

    if (!exam) {
      return res.status(404).json({
        message: "الامتحان غير موجود",
      });
    }

    await ExamSchema.deleteOne({
      _id: req.params.id,
    });

    return res.status(200).json({
      message: "تم حذف الامتحان بنجاح",
    });
  } catch (error) {
    return res.status(404).json({
      message: "الامتحان غير موجود",
    });
  }
};

// Get One
const getItem = async (req, res) => {
  try {
    const result = await ExamSchema.findById(req.params.id)
      .populate("grade", "name")
      .populate("groups", "name");

    if (!result) {
      return res.status(404).json({
        message: "الامتحان غير موجود",
      });
    }

    return res.status(200).json(result);
  } catch (error) {
    return res.status(404).json({
      message: "الامتحان غير موجود",
    });
  }
};

// List
const getItems = async (req, res) => {
  try {
    let query = {};

    const {
      searchWord,
      grade,
      status,
      group,
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

    if (status) {
      query.status = status;
    }

    if (group) {
      query.groups = group;
    }

    if (isActive !== undefined && isActive !== "") {
      query.isActive = isActive === "true";
    }

    if (fromDate || toDate) {
      query.createdAt = {};

      if (fromDate) {
        query.createdAt.$gte = new Date(fromDate);
      }

      if (toDate) {
        query.createdAt.$lte = new Date(toDate);
      }
    }

    const options = {
      page: Number(page),
      limit: Number(limit),
      sort: {
        examDate: -1,
      },
      populate: [
        {
          path: "grade",
          select: "name",
        },
        {
          path: "groups",
          select: "name",
        },
      ],
    };

    const result = await ExamSchema.paginate(query, options);

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
