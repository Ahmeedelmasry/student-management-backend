const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const ReportSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "student",
      required: [true, "Please select student"],
      index: true,
    },
    period: {
      type: Object,
      required: [true, "Please select period"],
    },
    attendance: {
      type: Object,
      required: [true, "Please select attendance"],
    },
    books: {
      type: Object,
      required: [true, "Please select books"],
    },
    subscription: {
      type: Object,
      required: [true, "Please select subscription"],
    },
    exams: {
      type: Object,
      required: [true, "Please select exams"],
    },
    payments: {
      type: Object,
      required: [true, "Please select payments"],
    },
    pdf: {
      type: Object,
      required: [true, "Please select pdf"],
    },
    isActive: {
      type: Boolean,
      required: [true, "Please enter active status"],
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

ReportSchema.plugin(mongoosePaginate);

module.exports = mongoose.model("monthly-report", ReportSchema);
