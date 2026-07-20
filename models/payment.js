const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const PaymentSchema = new mongoose.Schema(
  {
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

    type: {
      type: String,
      enum: ["Subscription", "Book"],
      required: true,
      index: true,
    },

    month: {
      type: Number,
      min: 1,
      max: 12,
    },

    year: {
      type: Number,
    },

    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "book",
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    paymentMethod: {
      type: String,
      enum: ["Cash", "Instapay", "VodafoneCash", "Bank"],
      default: "Cash",
    },

    paymentDate: {
      type: Date,
      default: Date.now,
      index: true,
    },

    status: {
      type: String,
      enum: ["Paid", "Cancelled", "Refunded"],
      default: "Paid",
      index: true,
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
  },
  {
    timestamps: true,
  },
);

PaymentSchema.index(
  {
    student: 1,
    type: 1,
    month: 1,
    year: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      type: "Subscription",
      status: "Paid",
    },
  },
);

PaymentSchema.plugin(mongoosePaginate);

module.exports = mongoose.model("payment", PaymentSchema);
