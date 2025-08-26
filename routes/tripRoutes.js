const path = require("path");
const multer = require("multer");
const upload = multer({ dest: "uploads/" }); // temp folder

const express = require("express");
const {
  createTrip,
  getTripById,
  updateTrip,
  getTripStatsSummary,
  getTripStatsCategories,
  saveSettlements,
  markSettlementPaid,
  uploadReceipt,
  uploadProof,
  approvePayment,
  uploadQrCode,
  addMember

} = require("../controllers/tripController");

const router = express.Router();

// Existing routes
router.post("/", createTrip);
router.get("/:tripId", getTripById);
router.put("/:tripId", updateTrip);

// Analytics
router.get("/:tripId/stats/summary", getTripStatsSummary);
router.get("/:tripId/stats/categories", getTripStatsCategories);

// Settlements
router.post("/:tripId/settlements", saveSettlements);
router.put("/:tripId/settlements/:index/paid", markSettlementPaid);

// Cloudinary
router.post(
  "/:tripId/expenses/:expenseId/receipt",
  upload.single("receipt"),
  uploadReceipt
);


// NEW: Upload proof
// router.post("/:tripId/settlements/:index/proof", upload.single("proof"), uploadProof);

// NEW: Approve payment
// router.put("/:tripId/settlements/:index/approve", approvePayment);

router.post("/upload/qr", upload.single("qrCode"), uploadQrCode);
router.post("/:tripId/members", upload.single("qrCode"), addMember);






router.get("/:tripId/settlements/:index/pay", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/pay.html"));
});

router.get("/:tripId/settlements/:index/approve", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/approve.html"));
});

// Upload proof
router.post("/:tripId/settlements/:index/proof", upload.single("proof"), uploadProof);

// Approve
router.put("/:tripId/settlements/:index/approve", approvePayment);


module.exports = router;
