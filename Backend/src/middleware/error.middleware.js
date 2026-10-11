function notFound(req, res, next) {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  let statusCode = Number(error.statusCode || error.status) || 500;
  let message = error.message || "Internal server error";

  if (error.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(error.errors || {})
      .map((item) => item.message)
      .join(", ") || "Invalid request data";
  } else if (error.name === "CastError") {
    statusCode = 400;
    message = "Invalid resource identifier";
  } else if (error.code === 11000) {
    statusCode = 409;
    const field = Object.keys(error.keyValue || {})[0];
    message = field ? `${field} is already in use` : "A record with these details already exists";
  } else if (error.type === "entity.parse.failed" || (error instanceof SyntaxError && "body" in error)) {
    statusCode = 400;
    message = "Invalid JSON request body";
  }

  if (statusCode < 400 || statusCode > 599) statusCode = 500;
  if (statusCode >= 500) {
    console.error("Unhandled request error:", error);
    message = process.env.NODE_ENV === "production" ? "Internal server error" : message;
  }

  return res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== "production" && statusCode >= 500
      ? { stack: error.stack }
      : {}),
  });
}

module.exports = { notFound, errorHandler };
