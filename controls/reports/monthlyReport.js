const MonthlyReport = require("../../models/monthlyReport.js");
const Student = require("../../models/student.js");
const bcrypt = require("bcrypt");
const path = require("path");
require("dotenv").config();
const { generToken } = require("../auth.js");

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

const deleteReport = async (req, res) => {
  try {
    await MonthlyReport.updateOne(
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

const getReport = async (req, res) => {
  try {
    const result = await MonthlyReport.findById(req.params.id);
    if (!result) return res.status(404).json({ message: "المذكرة غير موجودة" });
    res.status(200).json(result);
  } catch (error) {
    res.status(404).json({ message: "المذكرة غير موجودة" });
  }
};

const getReports = async (req, res) => {
  try {
    const {
      searchWord,
      grade,
      group,
      month,
      year,
      isActive,
      page = 1,
      limit = 10,
    } = req.query;

    const query = {};

    // Active filter
    if (isActive !== undefined && isActive !== "") {
      query.isActive = isActive === "true";
    } else {
      query.isActive = true;
    }

    /*
     * Find students matching search / grade / group
     */
    const studentQuery = {};

    // Search student name / barcode / phone
    if (searchWord) {
      const search = searchWord.replaceAll("\\", "");

      studentQuery.$or = [
        {
          fullName: {
            $regex: search,
            $options: "i",
          },
        },
        {
          barcode: {
            $regex: search,
            $options: "i",
          },
        },
        {
          studentPhone: {
            $regex: search,
            $options: "i",
          },
        },
        {
          parentPhone: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    // Grade
    if (grade) {
      studentQuery.grade = grade;
    }

    // Group
    if (group) {
      studentQuery.group = group;
    }

    /*
     * Only query Student collection if we actually
     * have student-related filters.
     */
    if (Object.keys(studentQuery).length > 0) {
      const students = await Student.find(studentQuery).select("_id");

      const studentIds = students.map((student) => student._id);

      // No students match the filters
      if (!studentIds.length) {
        return res.status(200).json({
          docs: [],
          totalDocs: 0,
          limit: Number(limit),
          page: Number(page),
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
          pagingCounter: 0,
          nextPage: null,
          prevPage: null,
        });
      }

      query.student = {
        $in: studentIds,
      };
    }

    // Report month
    if (month) {
      query["period.month"] = Number(month);
    }

    // Report year
    if (year) {
      query["period.year"] = Number(year);
    }

    const options = {
      page: Number(page),
      limit: Number(limit),
      sort: {
        createdAt: -1,
      },
      populate: {
        path: "student",
        populate: [
          {
            path: "grade",
            select: "name",
          },
          {
            path: "group",
            select: "name monthlyPrice startDate endDate",
          },
        ],
      },
    };

    const result = await MonthlyReport.paginate(query, options);

    res.status(200).json(result);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

module.exports = {
  getReport,
  getReports,
  deleteReport,
};
