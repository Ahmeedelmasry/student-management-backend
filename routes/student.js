const express = require("express");
const router = express.Router();
const {
  createItem,
  getItem,
  getItems,
  updateItem,
  deleteItem,
  scanAttendance,
} = require("../controls/student.js");
const {
  generateMonthlyStudentsReport,
} = require("../controls/reports/studentReport.js");
const { verifyToken } = require("../middlewares/checkAuth.js");

router.post("/", verifyToken, createItem);
router.post("/scan/:barcode", verifyToken, scanAttendance);
router.get("/", verifyToken, getItems);
router.get("/:id", verifyToken, getItem);
router.get(
  "/monthly-reports/:gradeId",
  verifyToken,
  generateMonthlyStudentsReport,
);
router.put("/:id", verifyToken, updateItem);
router.delete("/:id", verifyToken, deleteItem);

module.exports = router;
