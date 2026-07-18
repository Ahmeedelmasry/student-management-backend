const express = require("express");
const router = express.Router();
const { doLogin } = require("../controls/auth");
const { validate } = require("../middlewares/validateLogin");

router.post("/login", validate, doLogin);

module.exports = router;
