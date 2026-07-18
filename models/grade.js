const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const GradeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please enter name"],
    },
    isActive: {
      type: Boolean,
      required: [true, "Please enter active status"],
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

GradeSchema.virtual("groups", {
  ref: "group",
  localField: "_id",
  foreignField: "grade",
});

GradeSchema.plugin(mongoosePaginate);

module.exports = mongoose.model("grade", GradeSchema);
