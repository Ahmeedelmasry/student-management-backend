const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const BookSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please enter book name"],
      trim: true,
    },

    code: {
      type: String,
      trim: true,
      uppercase: true,
    },

    grade: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "grade",
      required: [true, "Please select grade"],
      index: true,
    },

    price: {
      type: Number,
      required: [true, "Please enter price"],
      min: 0,
    },

    type: {
      type: String,
      enum: [
        "Book", // مذكرة
        "Revision", // مراجعة
        "Booklet", // بوكليت
      ],
      default: "Book",
      index: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
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

BookSchema.plugin(mongoosePaginate);

BookSchema.index({
  grade: 1,
  type: 1,
});

module.exports = mongoose.model("book", BookSchema);
