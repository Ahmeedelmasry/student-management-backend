const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const StudentSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Please enter student name"],
      trim: true,
    },

    studentPhone: {
      type: String,
      default: "",
      trim: true,
    },

    parentPhone: {
      type: String,
      required: [true, "Please enter parent phone"],
      trim: true,
    },

    barcode: {
      type: String,
      required: [true, "Please enter barcode"],
      unique: true,
      trim: true,
      index: true,
    },

    grade: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "grade",
      required: [true, "Please select grade"],
      index: true,
    },

    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "group",
      required: [true, "Please select group"],
      index: true,
    },

    registrationDate: {
      type: Date,
      default: Date.now,
      required: true,
    },

    notes: {
      type: String,
      default: "",
      trim: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
StudentSchema.index({ grade: 1 });
StudentSchema.index({ group: 1 });
StudentSchema.index({ registrationDate: 1 });

StudentSchema.plugin(mongoosePaginate);

module.exports = mongoose.model("student", StudentSchema);
