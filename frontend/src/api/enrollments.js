import client from "./client";

export async function enrollInCourse(courseId) {
  const { data } = await client.post("/enrollments", { courseId });
  return data;
}

export async function unenrollFromCourse(courseId) {
  const { data } = await client.delete(`/enrollments/course/${courseId}`);
  return data;
}

export async function getMyEnrollments() {
  const { data } = await client.get("/enrollments/my");
  return data;
}

export async function getEnrollmentForCourse(courseId) {
  const { data } = await client.get(`/enrollments/course/${courseId}`);
  return data;
}

export async function updateLessonProgress(courseId, lessonIndex) {
  const { data } = await client.patch(
    `/enrollments/course/${courseId}/progress`,
    { lessonIndex },
  );
  return data;
}

export async function getStudentStats() {
  const { data } = await client.get("/enrollments/stats");
  return data;
}

export async function getAdminStats({ period = "monthly", year } = {}) {
  const { data } = await client.get("/enrollments/admin/stats", {
    params: { period, year },
  });
  return data;
}
