import client from "./client";

// ===== Admin: batch CRUD =====
export async function getBatches() {
  const { data } = await client.get("/batches");
  return data;
}

export async function getBatchById(batchId) {
  const { data } = await client.get(`/batches/${batchId}`);
  return data;
}

export async function createBatch(batchData) {
  const { data } = await client.post("/batches", batchData);
  return data;
}

export async function updateBatch(batchId, batchData) {
  const { data } = await client.put(`/batches/${batchId}`, batchData);
  return data;
}

export async function deleteBatch(batchId) {
  const { data } = await client.delete(`/batches/${batchId}`);
  return data;
}

export async function toggleBatchStatus(batchId) {
  const { data } = await client.patch(`/batches/${batchId}/status`);
  return data;
}

// ===== Admin: roster management =====
export async function getBatchStudents(batchId) {
  const { data } = await client.get(`/batches/${batchId}/students`);
  return data;
}

export async function getEligibleBatchStudents(
  batchId,
  { page = 1, search = "" } = {},
) {
  const { data } = await client.get(`/batches/${batchId}/eligible-students`, {
    params: { page, search },
  });
  return data.data;
}

export async function addStudentToBatch(batchId, studentId) {
  const { data } = await client.post(`/batches/${batchId}/students`, {
    studentId,
  });
  return data;
}

export async function removeStudentFromBatch(batchId, studentId) {
  const { data } = await client.delete(
    `/batches/${batchId}/students/${studentId}`,
  );
  return data;
}

// ===== Student: my batch =====
export async function getMyBatches() {
  const { data } = await client.get("/batches/my");
  return data;
}

export async function askBatchQuestion(batchId, question, history = []) {
  const { data } = await client.post(`/batches/${batchId}/assistant`, {
    question,
    history,
  });
  return data;
}

export async function getBatchmates(batchId) {
  const { data } = await client.get(`/batches/${batchId}/batchmates`);
  return data;
}

export async function getMyBatchAttendance(batchId) {
  const { data } = await client.get(`/batches/${batchId}/attendance/me`);
  return data;
}

// ===== Trainer: assigned batches =====
export async function getTrainerBatches() {
  const { data } = await client.get("/batches/trainer/my");
  return data;
}

export async function getTrainerStudents() {
  const { data } = await client.get("/batches/trainer/students");
  return data;
}

export async function getTrainerBatchStudents(batchId) {
  const { data } = await client.get(`/batches/${batchId}/students`);
  return data;
}

export async function getTrainerBatchDetails(batchId) {
  const { data } = await client.get(`/batches/trainer/${batchId}/details`);
  return data;
}

export async function updateTrainerMeetingLink(batchId, slotId, meetLink) {
  const { data } = await client.patch(
    `/batches/trainer/${batchId}/schedule-link`,
    { slotId, meetLink },
  );
  return data;
}

export async function getTrainerStudentDetails(batchId, studentId) {
  const { data } = await client.get(
    `/batches/trainer/${batchId}/students/${studentId}`,
  );
  return data;
}

export async function getAdminStudentReport(studentId) {
  const { data } = await client.get(
    `/batches/admin/students/${studentId}/report`,
  );
  return data;
}

export async function saveStudentAttendance(batchId, studentId, date, status) {
  const { data } = await client.put(
    `/batches/${batchId}/students/${studentId}/attendance`,
    { date, status },
  );
  return data;
}

export async function getTrainerBatchAttendance(batchId, date) {
  const { data } = await client.get(`/batches/${batchId}/attendance`, {
    params: { date },
  });
  return data;
}

export async function saveTrainerBatchAttendance(batchId, date, records) {
  const { data } = await client.put(`/batches/${batchId}/attendance`, {
    date,
    records,
  });
  return data;
}
