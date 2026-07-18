const { isEmpty } = require("validator");

const validate = async (req, res, next) => {
  const { userName, password } = req.body;
  if (isEmpty(userName)) {
    return res.status(400).json({
      message: "Please enter your user name",
    });
  }

  // Validate password length
  if (isEmpty(password)) {
    return res.status(400).json({
      message: "Please enter your password",
    });
  }
  next();
};

module.exports = { validate };
