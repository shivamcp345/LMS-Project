const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");

const env = require("./config/env");
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const courseRoutes = require("./routes/course.routes");
const lessonRoutes = require("./routes/lesson.routes");
const enrollmentRoutes = require("./routes/enrollment.routes");
const batchRoutes = require("./routes/batch.routes");
const testRoutes = require("./routes/test.routes");
const materialRoutes = require("./routes/material.routes");
const { notFound, errorHandler } = require("./middleware/error.middleware");

const app = express();

app.disable("x-powered-by");
app.use(cors({ origin: env.clientUrl, credentials: true }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/courses", courseRoutes);
app.use("/api/v1/lessons", lessonRoutes);
app.use("/api/v1/enrollments", enrollmentRoutes);
app.use("/api/v1/batches", batchRoutes);
app.use("/api/v1/tests", testRoutes);
app.use("/api/v1/materials", materialRoutes);

app.get("/api/v1/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "LMS API is running",
  });
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;
