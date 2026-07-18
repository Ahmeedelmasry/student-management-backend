const AdminSchema = require("../models/admin");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const maxAge = 60 * 60 * 24;

//Generating Token
const generToken = (data) => {
  return jwt.sign({ data }, "Hawiat erp system", {
    expiresIn: maxAge,
  });
};

const doLogin = async (req, res) => {
  try {
    const { userName, password } = req.body;
    const user = await AdminSchema.findOne({ userName });

    if (!user) {
      return res.status(404).json({ message: "Invalid user name or password" });
    }

    const compare = await bcrypt.compare(password, user.password);
    if (!compare) {
      return res.status(415).json({ message: "Invalid user name or password" });
    }

    const cookie = generToken({
      userName: user.userName,
      email: user.email,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
      _id: user._id,
    });

    return res.status(200).json({ token: cookie });
  } catch (error) {
    console.log("aaaaaaaaaaaaaaa");
  }
};

module.exports = {
  doLogin,
  generToken,
};
