const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ message: "Please login to your account" });
  }

  jwt.verify(token, "Hawiat erp system", (err, decoded) => {
    if (err) {
      return res
        .status(403)
        .json({ message: "You are not authorized for this request" });
    }
    req.decoded = decoded;
    next();
  });
};

module.exports = { verifyToken };
