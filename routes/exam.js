const express = require("express");
const router = express.Router();
const {
  createItem,
  getItem,
  getItems,
  updateItem,
  deleteItem,
} = require("../controls/exam.js");
const { getExamStudents } = require("../controls/examResult.js");

const { verifyToken } = require("../middlewares/checkAuth.js");

router.post("/", verifyToken, createItem);
router.get("/", verifyToken, getItems);
router.get("/:examId/students", verifyToken, getExamStudents);
router.get("/:id", verifyToken, getItem);
router.put("/:id", verifyToken, updateItem);
router.delete("/:id", verifyToken, deleteItem);

module.exports = router;
