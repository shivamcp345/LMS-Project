import client from "./client";

export async function getCourses() {
  const { data } = await client.get("/courses");
  return data;
}

export async function getPublishedCourses() {
  const { data } = await client.get("/courses/published");
  return data;
}

export async function getCourseById(courseId) {
  const { data } = await client.get(`/courses/${courseId}`);
  return data;
}

export async function createCourse(courseData) {
  const { data } = await client.post("/courses", courseData);
  return data;
}

export async function updateCourse(courseId, courseData) {
  const { data } = await client.put(`/courses/${courseId}`, courseData);

  return data;
}

export async function deleteCourse(courseId) {
  const { data } = await client.delete(`/courses/${courseId}`);
  return data;
}

export async function togglePublishCourse(courseId) {
  const { data } = await client.patch(`/courses/${courseId}/publish`);

  return data;
}

export async function toggleCourseStatus(courseId) {
  const { data } = await client.patch(`/courses/${courseId}/status`);
  return data;
}
