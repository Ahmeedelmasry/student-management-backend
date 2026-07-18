require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const app = express();
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");

const AdminSchema = require("./models/admin");
const bcrypt = require("bcrypt");
const path = require("path");
require("dotenv").config();
const { generToken } = require("./controls/auth.js");

// Routes
const auth = require("./routes/auth");
const admin = require("./routes/admin");
const grade = require("./routes/grade");
const group = require("./routes/group");
const student = require("./routes/student");
const payment = require("./routes/payment");
const book = require("./routes/book");
const exam = require("./routes/exam");
const examResult = require("./routes/examResult");
const attendanceSession = require("./routes/attendanceSession.js");
const reports = require("./routes/reports.js");

// Set Headers
app.use((req, res, next) => {
  res
    .header("Access-Control-Allow-Origin", "*")
    .header("Access-Control-Allow-Methods", "GET, POST, HEAD, PUT, DELETE")
    .header(
      "Access-Control-Allow-Headers",
      "auth-token, Origin, X-Requested-With, Content-Type, Accept, Authorization",
    )
    .header("Access-Control-Allow-Credentials", true);
  next();
});

//Config
app.use(bodyParser.json());

//Cookie Parser
app.use(cookieParser());

// Public Files
app.use(express.static("assets"));

// Routes
app.use("/auth", auth);
app.use("/admins", admin);
app.use("/grades", grade);
app.use("/groups", group);
app.use("/students", student);
app.use("/payments", payment);
app.use("/books", book);
app.use("/exams", exam);
app.use("/exam-results", examResult);
app.use("/sessions", attendanceSession);
app.use("/reports", reports);

app.get("/", (req, res) => {
  res.json({ message: "Hello world" });
});

//Socket io
const http = require("http");
const httpServer = http.createServer(app);

//Starting server

//Database Connection
mongoose
  .set("strictQuery", true)
  .connect(process.env.DB_URI)
  .then(async () => {
    httpServer.listen(process.env.PORT, async () => {
      // Create User
      const allAdmins = await AdminSchema.find();

      if (!allAdmins.length) {
        let filepath;
        try {
          const salt = await bcrypt.genSalt();
          //Hash The Password
          const body = {
            fullName: "Hisham Ebaid",
            userName: "admin",
            isAdmin: true,
          };
          body.password = await bcrypt.hash("admin", salt);

          const set = await AdminSchema.create(body);
          await set.save();
        } catch (error) {
          console.log(error);
          console.log("error occured while creating default admin");
        }
      }

      console.log(`Listining at port ${process.env.PORT || 3000}`);
    });
  })
  .catch((err) => console.log(err));
