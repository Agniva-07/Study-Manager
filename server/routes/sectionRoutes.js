const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const { getBuilderStats } = require("../controllers/sectionController");

router.get("/:sectionName/builder-stats", protect, getBuilderStats);

module.exports = router;