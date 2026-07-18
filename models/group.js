const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const GroupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please enter group name"],
      trim: true,
    },

    grade: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "grade",
      required: [true, "Please select grade"],
      index: true,
    },

    days: {
      type: [
        {
          type: String,
          enum: [
            "Saturday",
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
          ],
        },
      ],
      validate: {
        validator: (value) => value.length > 0,
        message: "Please select at least one day",
      },
    },

    startTime: {
      type: String,
      required: [true, "Please enter start time"],
      trim: true,
    },

    endTime: {
      type: String,
      required: [true, "Please enter end time"],
      trim: true,
    },

    monthlyPrice: {
      type: Number,
      required: [true, "Please enter monthly price"],
      min: 0,
    },

    startDate: {
      type: Date,
      required: [true, "Please enter start date"],
    },

    endDate: {
      type: Date,
      required: [true, "Please enter end date"],
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

GroupSchema.plugin(mongoosePaginate);

module.exports = mongoose.model("group", GroupSchema);
