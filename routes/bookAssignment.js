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

router.post("/assign-groups", verifyToken, assignGroups);
router.post("/assign-students", verifyToken, assignStudents);
router.post("/unassign-students", verifyToken, bulkUnassignStudents);
router.get("/get-unassigned-students", verifyToken, getUnAssignedStudents);
router.get("/get-assigned-students", verifyToken, getAssignedStudents);

module.exports = router;
