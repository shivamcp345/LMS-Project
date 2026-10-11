import client from "./client";

export async function listUsers() {
  const { data } = await client.get("/users");
  return data.data;
}

export async function addUser({ name, email, password, role }) {
  const { data } = await client.post("/users", {
    name,
    email,
    password,
    role,
  });
  return data;
}

export async function removeUser(userId) {
  const { data } = await client.delete(`/users/${userId}`);
  return data;
}
export async function toggleUserStatus(userId) {
  const { data } = await client.patch(`/users/${userId}/status`);
  return data;
}

export async function updateUserProfile(userId, profile) {
  const { data } = await client.put(`/users/${userId}`, profile);
  return data;
}

export async function updateUserDocument(userId, key, file, number = "") {
  const formData = new FormData();
  formData.append("governmentId", file);
  if (number) formData.append("number", number);
  const { data } = await client.put(
    `/users/${userId}/document/${key}`,
    formData,
  );
  return data;
}

export async function getDocumentFile(userId, key) {
  const response = await client.get(`/users/${userId}/document/${key}/file`, {
    responseType: "blob",
  });
  return response.data;
}

export async function getGovernmentIdFile(userId, id) {
  const response = await client.get(
    `/users/${userId}/government-id/${id}/file`,
    { responseType: "blob" },
  );
  return response.data;
}
