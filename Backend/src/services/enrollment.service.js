const Enrollment = require("../models/Enrollment");
const Course = require("../models/Course");
const User = require("../models/User");
// ENROLL IN A COURSE
const enrollInCourse = async (studentId, courseId) => {
  const student = await User.findOne({ _id: studentId, role: "user", isActive: { $ne: false } }).select("_id");
  if (!student) {
    throw new Error("Only active students can enroll in courses");
  }

  const course = await Course.findOne({
    _id: courseId,
    isDeleted: { $ne: true },
  });

  if (!course) {
    throw new Error("Course not found");
  }

  if (course.isActive === false || course.isPublished === false) {
    throw new Error("This course is not currently open for enrollment");
  }

  const existing = await Enrollment.findOne({
    student: studentId,
    course: courseId,
  });

  if (existing) {
    return existing;
  }

  const enrollment = await Enrollment.create({
    student: studentId,
    course: courseId,
  });

  return enrollment;
};
// UNENROLL FROM A COURSE
const unenrollFromCourse = async (studentId, courseId) => {
  const student = await User.findOne({ _id: studentId, role: "user" }).select("_id");
  if (!student) {
    throw new Error("Only students can manage course enrollments");
  }

  const enrollment = await Enrollment.findOneAndDelete({
    student: studentId,
    course: courseId,
  });

  if (!enrollment) {
    throw new Error("Enrollment not found");
  }

  return enrollment;
};
// GET MY ENROLLMENTS (with course details)
const getMyEnrollments = async (studentId) => {
  const enrollments = await Enrollment.find({ student: studentId })
    .populate("course")
    .sort({ updatedAt: -1 });

  // Filter out enrollments whose course was deleted
  return enrollments.filter((e) => e.course);
};
// GET SINGLE ENROLLMENT FOR A COURSE
const getEnrollmentForCourse = async (studentId, courseId) => {
  const enrollment = await Enrollment.findOne({
    student: studentId,
    course: courseId,
  });

  return enrollment;
};
// UPDATE LESSON PROGRESS
const updateLessonProgress = async (studentId, courseId, lessonIndex) => {
  if (!Number.isInteger(lessonIndex) || lessonIndex < 0) {
    throw new Error("Lesson index must be a non-negative integer");
  }
  const enrollment = await Enrollment.findOne({
    student: studentId,
    course: courseId,
  });

  if (!enrollment) {
    throw new Error("You are not enrolled in this course");
  }

  const course = await Course.findById(courseId);

  if (!course) {
    throw new Error("Course not found");
  }

  const totalLessons =
    course.curriculum?.length || course.lessonsCount || 1;

  if (lessonIndex >= totalLessons) {
    throw new Error("Lesson index is outside this course curriculum");
  }

  const alreadyCompleted = enrollment.completedLessons.includes(lessonIndex);

  if (alreadyCompleted) {
    enrollment.completedLessons = enrollment.completedLessons.filter(
      (i) => i !== lessonIndex,
    );
  } else {
    enrollment.completedLessons.push(lessonIndex);
  }

  const percent = Math.min(
    100,
    Math.round((enrollment.completedLessons.length / totalLessons) * 100),
  );

  enrollment.progress = percent;
  enrollment.status = percent >= 100 ? "completed" : "in-progress";
  enrollment.lastAccessedAt = new Date();

  await enrollment.save();

  return enrollment;
};
// STUDENT DASHBOARD STATS
const getStudentStats = async (studentId) => {
  const enrollments = await Enrollment.find({ student: studentId }).populate(
    "course",
  );

  const validEnrollments = enrollments.filter((e) => e.course);

  const coursesEnrolled = validEnrollments.length;

  const coursesCompleted = validEnrollments.filter(
    (e) => e.status === "completed",
  ).length;

  // Rough learning-time estimate: 10 minutes per completed lesson
  const totalCompletedLessons = validEnrollments.reduce(
    (sum, e) => sum + e.completedLessons.length,
    0,
  );

  const learningMinutes = totalCompletedLessons * 10;
  const learningHours = (learningMinutes / 60).toFixed(1);

  // XP: 20 points per completed lesson + 100 bonus per completed course
  const xp =
    totalCompletedLessons * 20 + coursesCompleted * 100;

  const continueLearning = validEnrollments
    .filter((e) => e.status !== "completed")
    .slice(0, 3);

  return {
    coursesEnrolled,
    coursesCompleted,
    learningHours: `${learningHours}h`,
    xp,
    continueLearning,
  };
};
// ADMIN STATS
const getAdminStats = async ({ period = "monthly", year } = {}) => {
  const [
    totalUsers,
    totalStudents,
    totalTrainers,
    totalCourses,
    publishedCourses,
    totalEnrollments,
    activeEnrollments,
    completedEnrollments,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: "user", isActive: true }),
    User.countDocuments({ role: "trainer", isActive: true }),
    Course.countDocuments({ isDeleted: { $ne: true } }),
    Course.countDocuments({ isPublished: true, isDeleted: { $ne: true } }),
    Enrollment.countDocuments(),
    Enrollment.countDocuments({ status: "in-progress" }),
    Enrollment.countDocuments({ status: "completed" }),
  ]);

  const enrollmentsWithCourse = await Enrollment.find()
    .populate("course", "price")
    .select("course");
  const revenue = enrollmentsWithCourse.reduce((sum, e) => sum + (e.course?.price || 0), 0);

  const recentEnrollments = await Enrollment.find()
    .sort({ createdAt: -1 })
    .limit(6)
    .populate("student", "name")
    .populate("course", "title");
  const recentActivity = recentEnrollments
    .filter((e) => e.student && e.course)
    .map((e) => ({ message: `${e.student.name} enrolled in ${e.course.title}`, date: e.createdAt }));

  const now = new Date();
  const selectedYear = Number(year) >= 2020 && Number(year) <= now.getFullYear() + 1 ? Number(year) : now.getFullYear();
  const safePeriod = ["weekly", "monthly", "yearly"].includes(period) ? period : "monthly";
  let rangeStart;
  let labels;
  let bucket;

  if (safePeriod === "yearly") {
    const firstYear = Math.max(2020, selectedYear - 5);
    rangeStart = new Date(Date.UTC(firstYear, 0, 1));
    labels = Array.from({ length: selectedYear - firstYear + 1 }, (_, i) => String(firstYear + i));
    bucket = (date) => String(date.getUTCFullYear());
  } else if (safePeriod === "weekly") {
    const yearStart = new Date(Date.UTC(selectedYear, 0, 1));
    const day = yearStart.getUTCDay() || 7;
    rangeStart = new Date(yearStart);
    rangeStart.setUTCDate(rangeStart.getUTCDate() - day + 1);
    labels = Array.from({ length: 53 }, (_, i) => `W${String(i + 1).padStart(2, "0")}`);
    bucket = (date) => {
      if (date.getUTCFullYear() !== selectedYear) return null;
      const diff = Math.floor((date.getTime() - rangeStart.getTime()) / 604800000);
      return diff >= 0 && diff < 53 ? `W${String(diff + 1).padStart(2, "0")}` : null;
    };
  } else {
    rangeStart = new Date(Date.UTC(selectedYear, 0, 1));
    labels = Array.from({ length: 12 }, (_, i) => new Date(Date.UTC(selectedYear, i, 1)).toLocaleDateString("en", { month: "short", timeZone: "UTC" }));
    bucket = (date) => date.getUTCFullYear() === selectedYear ? String(date.getUTCMonth() + 1) : null;
  }

  const rangeEnd = new Date(Date.UTC(selectedYear + 1, 0, 1));
  const rows = await Enrollment.find({ createdAt: { $gte: rangeStart, $lt: rangeEnd } }).select("student createdAt").lean();
  const uniqueAdmissions = new Map();
  for (const row of rows) {
    const key = `${row.student}:${bucket(new Date(row.createdAt))}`;
    const bucketName = bucket(new Date(row.createdAt));
    if (!bucketName || uniqueAdmissions.has(key)) continue;
    uniqueAdmissions.set(key, true);
  }
  const counts = new Map();
  for (const key of uniqueAdmissions.keys()) {
    const bucketName = key.slice(key.lastIndexOf(":") + 1);
    counts.set(bucketName, (counts.get(bucketName) || 0) + 1);
  }
  const newStudentsTrend = labels.map((label, index) => ({ label, count: safePeriod === "monthly" ? counts.get(String(index + 1)) || 0 : counts.get(label) || 0 }));

  return {
    totalUsers,
    totalStudents,
    totalTrainers,
    totalCourses,
    publishedCourses,
    totalEnrollments,
    activeEnrollments,
    completedEnrollments,
    revenue,
    recentActivity,
    newStudentsTrend,
    admissionPeriod: safePeriod,
    admissionYear: selectedYear,
  };
};

module.exports = {
  enrollInCourse,
  unenrollFromCourse,
  getMyEnrollments,
  getEnrollmentForCourse,
  updateLessonProgress,
  getStudentStats,
  getAdminStats,
};
