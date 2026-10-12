import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Courses from "./pages/Courses";
import CourseDetails from "./pages/CourseDetails";
import Profile from "./pages/Profile";
import MyBatch from "./pages/MyBatch";
import BatchLessons from "./pages/BatchLessons";
import BatchTests from "./pages/BatchTests";
import AdminDashboard from "./pages/AdminDashboard";
import AdminCourses from "./pages/AdminCourses";
import AdminUsers from "./pages/AdminUsers";
import AdminTrainers from "./pages/AdminTrainers";
import AdminBatches from "./pages/AdminBatches";
import AdminProfile from "./pages/AdminProfile";
import TrainerDashboard from "./pages/TrainerDashboard";
import TrainerStudents from "./pages/TrainerStudents";
import TrainerTests from "./pages/TrainerTests";
import TrainerBatchDetails from "./pages/TrainerBatchDetails";
import TrainerStudentDetails from "./pages/TrainerStudentDetails";
import {
  RequireAuth,
  RequireStudent,
  RequireAdmin,
  RequireTrainer,
  RequireGuest,
} from "./components/RouteGuards";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route element={<RequireGuest />}>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
      </Route>
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<RequireStudent />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/courses" element={<Courses />} />
        <Route path="/courses/:id" element={<CourseDetails />} />
        <Route path="/my-batch" element={<MyBatch />} />
        <Route path="/my-batch/:batchId" element={<MyBatch />} />
        <Route path="/my-batch/:batchId/lessons" element={<BatchLessons />} />
        <Route path="/my-batch/:batchId/lessons/:lessonId" element={<BatchLessons />} />
        <Route path="/my-batch/:batchId/tests" element={<BatchTests />} />
      </Route>
      <Route element={<RequireAuth />}>
        <Route path="/profile" element={<Profile />} />
      </Route>
      <Route element={<RequireAdmin />}>
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/courses" element={<AdminCourses />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/trainers" element={<AdminTrainers />} />
        <Route path="/admin/batches" element={<AdminBatches />} />
        <Route path="/admin/profile" element={<AdminProfile />} />
      </Route>
      <Route element={<RequireTrainer />}>
        <Route path="/trainer/dashboard" element={<TrainerDashboard />} />
        <Route
          path="/trainer/batches"
          element={<TrainerDashboard batchOnly />}
        />
        <Route path="/trainer/batches/:batchId" element={<TrainerBatchDetails />} />
        <Route path="/trainer/batches/:batchId/students/:studentId" element={<TrainerStudentDetails />} />
        <Route path="/trainer/students" element={<TrainerStudents />} />
        <Route path="/trainer/batches/:batchId/tests" element={<TrainerTests />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
