import client from "./client";

export async function getBatchTests(batchId) {
  const { data } = await client.get(`/tests/batch/${batchId}`);
  return data;
}

export async function createBatchTest(batchId, test) {
  const { data } = await client.post(`/tests/batch/${batchId}`, test);
  return data;
}

export async function submitTestAttempt(testId, submission) {
  const body = submission instanceof FormData
    ? submission
    : Array.isArray(submission)
      ? { answers: submission }
      : submission;
  const { data } = await client.post(`/tests/${testId}/attempt`, body);
  return data;
}

export async function startTestAttempt(testId) {
  const { data } = await client.post(`/tests/${testId}/start`);
  return data;
}

export async function saveTestAttemptProgress(testId, attemptId, answers, warning = false) {
  const { data } = await client.put(`/tests/${testId}/attempts/${attemptId}/progress`, { answers, warning });
  return data;
}

export async function getBatchTestResults(batchId) {
  const { data } = await client.get(`/tests/batch/${batchId}/results`);
  return data;
}

export async function gradeTestAttempt(testId, attemptId, score, feedback) {
  const { data } = await client.put(`/tests/${testId}/attempts/${attemptId}/grade`, { score, feedback });
  return data;
}

export async function getStudentTestResults(studentId) {
  const { data } = await client.get(`/tests/student/${studentId}/results`);
  return data;
}

export async function getTestPaper(testId) {
  const { data } = await client.get(`/tests/${testId}/paper`, { responseType: "blob" });
  return data;
}

export async function getMyTestResults() {
  const { data } = await client.get("/tests/student/me/results");
  return data;
}

export async function getTestAnswer(attemptId) {
  const { data } = await client.get(`/tests/attempts/${attemptId}/answer`, { responseType: "blob" });
  return data;
}
