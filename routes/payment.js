const express = require("express");
const router = express.Router();
const {
  createItem,
  getItem,
  getItems,
  updateItem,
  deleteItem,
  bulkBookPayment
} = require("../controls/payment.js");
const { verifyToken } = require("../middlewares/checkAuth.js");

router.post("/", verifyToken, createItem);
router.post("/bulk-pay", verifyToken, bulkBookPayment);
router.get("/", verifyToken, getItems);
router.get("/:id", verifyToken, getItem);
router.put("/:id", verifyToken, updateItem);
router.delete("/:id", verifyToken, deleteItem);

module.exports = router;
