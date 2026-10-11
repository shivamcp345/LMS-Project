import client from "./client";

export async function loginUser({ email, password }) {
  const { data } = await client.post("/auth/login", { email, password });
  return data;
}

export async function loginWithGoogle(credential) {
  const { data } = await client.post("/auth/google", { credential });
  return data;
}

export async function signupUser({ name, email, password }) {
  const { data } = await client.post("/auth/signup", { name, email, password });
  return data;
}

export async function loginAdmin({ email, password }) {
  const { data } = await client.post("/auth/admin/login", { email, password });
  return data;
}

export async function forgotPassword({ email }) {
  const { data } = await client.post("/auth/forgot-password", { email });
  return data;
}

export async function resetPassword({ email, otp, password }) {
  const { data } = await client.post("/auth/reset-password", {
    email,
    otp,
    password,
  });

  return data;
}
export async function sendPasswordResetOtp(email) {
  const { data } = await client.post("/auth/send-password-reset-otp", {
    email,
  });

  return data;
}

export async function verifyPasswordResetOtp({ email, otp }) {
  const { data } = await client.post("/auth/verify-password-reset-otp", {
    email,
    otp,
  });

  return data;
}

export async function getCurrentUser() {
  const { data } = await client.get("/auth/me");
  return data;
}
export async function getProfile() {
  const { data } = await client.get("/auth/profile");
  return data;
}

export async function logoutUser() {
  try {
    await client.post("/auth/logout");
  } catch {}
}
export async function sendEmailVerificationOtp(email) {
  const { data } = await client.post("/auth/send-email-otp", {
    email,
  });

  return data;
}

export async function verifyEmailOtp({ email, otp }) {
  const { data } = await client.post("/auth/verify-email-otp", {
    email,
    otp,
  });

  return data;
}
export async function uploadProfilePicture(file) {
  const formData = new FormData();
  formData.append("profilePicture", file);

  const { data } = await client.put("/auth/profile/picture", formData);

  return data;
}

export async function uploadBackgroundPicture(file) {
  const formData = new FormData();
  formData.append("backgroundPicture", file);

  const { data } = await client.put("/auth/profile/background", formData);

  return data;
}
export async function updateProfile({ name, email, mobile, address }) {
  const { data } = await client.put("/auth/profile", {
    name,
    email,
    mobile,
    address,
  });

  return data;
}

export async function updateProfileDetails(profileDetails) {
  const { data } = await client.put("/auth/profile/details", {
    profileDetails,
  });
  return data;
}

export async function uploadDocument(key, file, number = "") {
  const formData = new FormData();
  formData.append("governmentId", file);
  if (number) formData.append("number", number);
  const { data } = await client.put(`/auth/profile/document/${key}`, formData);
  return data;
}

export async function uploadGovernmentId(id, file) {
  const formData = new FormData();
  formData.append("governmentId", file);
  const { data } = await client.put(
    `/auth/profile/government-id/${id}`,
    formData,
  );
  return data;
}

export async function changeOwnPassword({
  currentPassword,
  newPassword,
  confirmPassword,
}) {
  const { data } = await client.put("/auth/profile/password", {
    currentPassword,
    newPassword,
    confirmPassword,
  });
  return data;
}
