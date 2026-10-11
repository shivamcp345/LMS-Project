const express = require("express");

const {
  getAllUsers,
  createUser,
  deleteUser,
  toggleUserStatus,
  updateUserProfile,
  updateUserDocument,
  getGovernmentIdFile,
  getDocumentFile,
} = require("../controllers/user.controller");

const { authenticate, authorize } = require("../middleware/auth.middleware");
const upload = require("../config/multer");

const router = express.Router();

const uploadGovernmentDocument = (req, res, next) => {
  upload.governmentDocument.single("governmentId")(req, res, (error) => {
    if (error) {
      return res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({
        success: false,
        message: error.message,
      });
    }
    return next();
  });
};

router.get("/", authenticate, authorize("admin"), getAllUsers);

router.post("/", authenticate, authorize("admin"), createUser);
router.put("/:id", authenticate, authorize("admin"), updateUserProfile);
router.put("/:id/document/:key", authenticate, authorize("admin"), uploadGovernmentDocument, updateUserDocument);
router.delete("/:id", authenticate, authorize("admin"), deleteUser);
router.patch("/:id/status", authenticate, authorize("admin"), toggleUserStatus);
router.get(
  "/:userId/document/:key/file",
  authenticate,
  getDocumentFile,
);
router.get(
  "/:userId/government-id/:id/file",
  authenticate,
  getGovernmentIdFile,
);
module.exports = router;
