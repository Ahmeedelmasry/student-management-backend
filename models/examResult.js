const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const ExamResultSchema = new mongoose.Schema(
  {
    exam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "exam",
      required: true,
      index: true,
    },

    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "student",
      required: true,
      index: true,
    },

    grade: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "grade",
      required: true,
      index: true,
    },

    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "group",
      required: true,
      index: true,
    },

    score: {
      type: Number,
      default: 0,
      min: 0,
    },

    isAbsent: {
      type: Boolean,
      default: false,
      index: true,
    },

    correctedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "admin",
    },

    notes: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

ExamResultSchema.plugin(mongoosePaginate);

/*
كل طالب له نتيجة واحدة فقط داخل نفس الامتحان
*/
ExamResultSchema.index(
  {
    exam: 1,
    student: 1,
  },
  {
    unique: true,
  },
);

/*
تقارير الامتحانات
*/
ExamResultSchema.index({
  exam: 1,
  score: -1,
});

/*
تقارير الطالب
*/
ExamResultSchema.index({
  student: 1,
  createdAt: -1,
});

/*
تقارير الصفوف
*/
ExamResultSchema.index({
  grade: 1,
  group: 1,
});

module.exports = mongoose.model("examResult", ExamResultSchema);
