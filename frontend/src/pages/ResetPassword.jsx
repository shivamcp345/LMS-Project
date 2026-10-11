import { Navigate } from "react-router-dom";

export default function ResetPassword() {
  // The old token-link flow has been replaced by the safer email + OTP flow.
  // Keep this route as a compatibility redirect so old bookmarks do not dead-end.
  return <Navigate to="/forgot-password" replace />;
}
