const express = require("express");
const router = require("express").Router();

const {
  getExamResults,
  saveExamResults,
  updateExamResults,
} = require("../controls/examResult.js");
const { verifyToken } = require("../middlewares/checkAuth.js");

router.get("/:examId", verifyToken, getExamResults);
router.post("/save", verifyToken, saveExamResults);
router.put("/edit-results", verifyToken, updateExamResults);

module.exports = router;
