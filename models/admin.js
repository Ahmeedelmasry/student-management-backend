const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const AdminSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Please enter user name"],
    },
    userName: {
      type: String,
      required: [true, "Please enter user name"],
      unique: true,
    },
    password: {
      type: String,
      required: [true, "Please enter password"],
      minlength: [6, "Minimum password length is 6 characters"],
    },
    isActive: {
      type: Boolean,
      required: [true, "Please enter user active status"],
      default: true,
    },
    isAdmin: {
      type: Boolean,
      required: [true, "Please enter user role"],
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

AdminSchema.plugin(mongoosePaginate);

module.exports = mongoose.model("admin", AdminSchema);
