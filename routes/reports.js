const express = require("express");
const router = express.Router();
const {
  getAttendanceReport,
  getStudentAttendanceDetails,
} = require("../controls/reports/attendanceReport.js");

const {
  getStudentPaymentsDetails,
  getStudentsFinancialReport,
} = require("../controls/reports/paymentReport.js");
const { getExamReport } = require("../controls/reports/examReport.js");
const { getDashboard } = require("../controls/reports/DashboardReport.js");

const fileUpload = require("express-fileupload");
const { verifyToken } = require("../middlewares/checkAuth.js");

router.get("/attendance", verifyToken, getAttendanceReport);
router.get("/attendance/:studentId", verifyToken, getStudentAttendanceDetails);
router.get("/payments", verifyToken, getStudentsFinancialReport);
router.get("/payments/details", verifyToken, getStudentPaymentsDetails);
router.get("/exams/:examId", verifyToken, getExamReport);
router.get("/dashboard", verifyToken, getDashboard);

module.exports = router;
