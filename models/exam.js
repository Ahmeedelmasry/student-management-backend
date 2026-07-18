const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const ExamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please enter exam name"],
      trim: true,
    },

    grade: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "grade",
      required: [true, "Please select grade"],
      index: true,
    },

    groups: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "group",
        required: true,
      },
    ],

    maxScore: {
      type: Number,
      required: [true, "Please enter max score"],
      min: 1,
    },

    duration: {
      type: Number,
      required: [true, "Please enter exam duration"],
    },

    notes: {
      type: String,
      default: "",
      trim: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["Draft", "Published", "Finished"],
      default: "Draft",
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

ExamSchema.plugin(mongoosePaginate);

ExamSchema.index({
  grade: 1,
});

module.exports = mongoose.model("exam", ExamSchema);
