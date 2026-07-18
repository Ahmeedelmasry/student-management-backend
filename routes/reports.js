const express = require("express");
const router = express.Router();
const {
  getAttendanceReport,
  getStudentAttendanceDetails,
} = require("../controls/reports/attendanceReport.js");

const { getPaymentsReport } = require("../controls/reports/paymentReport.js");

const fileUpload = require("express-fileupload");
const { verifyToken } = require("../middlewares/checkAuth.js");

router.get("/attendance", verifyToken, getAttendanceReport);
router.get("/attendance/:studentId", verifyToken, getStudentAttendanceDetails);
router.get("/payments", verifyToken, getPaymentsReport);

module.exports = router;
