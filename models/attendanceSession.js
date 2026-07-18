const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const AttendanceSessionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      default: "",
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
      required: [true, "Please select grade"],
      index: true,
    },

    sessionDate: {
      type: Date,
      required: [true, "Please enter session date"],
      index: true,
    },

    notes: {
      type: String,
      trim: true,
      default: "",
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

AttendanceSessionSchema.plugin(mongoosePaginate);

AttendanceSessionSchema.index(
  {
    group: 1,
    sessionDate: -1,
  },
  { unique: true },
);

module.exports = mongoose.model("attendanceSession", AttendanceSessionSchema);
