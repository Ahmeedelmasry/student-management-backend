const express = require("express");
const router = express.Router();
const {
  assignGroups,
  assignStudents,
  getUnAssignedStudents,
  getAssignedStudents,
  bulkUnassignStudents,
} = require("../controls/bookAssignment.js");
const { verifyToken } = require("../middlewares/checkAuth.js");

router.get("/unassigned-students/:bookId", verifyToken, getUnAssignedStudents);
router.post("/assign-students/:bookId", verifyToken, assignStudents);
router.get("/assigned-students/:bookId", verifyToken, getAssignedStudents);
router.post("/unassign-students/:bookId", verifyToken, bulkUnassignStudents);

module.exports = router;
