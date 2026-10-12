import client from "./client";

export async function getLessonsByBatch(batchId) {
  const { data } = await client.get(`/lessons/batch/${batchId}`);
  return data;
}

export async function getLessonById(lessonId) {
  const { data } = await client.get(`/lessons/${lessonId}`);
  return data;
}

export async function createLesson(lessonData) {
  const { data } = await client.post("/lessons", lessonData);
  return data;
}

export async function updateLesson(lessonId, lessonData) {
  const { data } = await client.put(`/lessons/${lessonId}`, lessonData);
  return data;
}

export async function deleteLesson(lessonId) {
  const { data } = await client.delete(`/lessons/${lessonId}`);
  return data;
}

export async function getBatchLessonProgress(batchId) {
  const { data } = await client.get(`/lessons/batch/${batchId}/progress`);
  return data;
}

export async function toggleLessonProgress(lessonId) {
  const { data } = await client.patch(`/lessons/${lessonId}/progress`);
  return data;
}

