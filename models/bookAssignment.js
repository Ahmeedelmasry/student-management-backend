const mongoose = require("mongoose");

const BookAssignmentSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "students",
      required: true,
      index: true,
    },

    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "books",
      required: true,
      index: true,
    },

    assignedAt: {
      type: Date,
      default: Date.now,
      required: [true, "Please enter assign date"],
    },

    notes: {
      type: String,
      default: "",
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

/**
 * الطالب مينفعش يتسندله نفس المذكرة مرتين
 */
BookAssignmentSchema.index(
  {
    student: 1,
    book: 1,
  },
  {
    unique: true,
  },
);

module.exports = mongoose.model("bookAssignment", BookAssignmentSchema);
