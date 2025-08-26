const Trip = require("../models/Trip");
const { v4: uuidv4 } = require("uuid");
const nodemailer = require("nodemailer");
const API_URL = "http://localhost:8000/";
const cloudinary = require("../config/cloudinary");
const fs = require("fs");

// ======================
// Setup Nodemailer
// ======================
const transporter = nodemailer.createTransport({
  service: "gmail", // you can also configure SMTP
  auth: {
    user: process.env.EMAIL_USER, // set in .env
    pass: process.env.EMAIL_PASS, // app password, not normal Gmail password
  },
});

async function sendEmail(to, subject, text, html) {
  try {
    await transporter.sendMail({
      from: `"BillBuddies Notifications" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text, // fallback (for clients that don't support HTML)
      html, // main styled email
    });
    console.log(`✅ Email sent to ${to}`);
  } catch (err) {
    console.error("❌ Error sending email:", err);
  }
}

const tripController = {
  // Create a new trip
  createTrip: async (req, res) => {
    // console.log("Creating trip with data:", req.body);
    try {
      const tripId = uuidv4();
      const trip = new Trip({
        tripId,
        groupTitle: req.body.groupTitle,
        groupMembers: req.body.groupMembers,
        expenses: [],
        settlements: [],
      });
      await trip.save();
      res.json({ tripId });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Get a trip by ID
  getTripById: async (req, res) => {
    try {
      const trip = await Trip.findOne({ tripId: req.params.tripId });
      if (!trip) {
        return res.status(404).json({ error: "Trip not found" });
      }
      res.json(trip);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Update a trip
  updateTrip: async (req, res) => {
    try {
      const trip = await Trip.findOneAndUpdate(
        { tripId: req.params.tripId },
        {
          $set: {
            groupTitle: req.body.groupTitle,
            groupMembers: req.body.groupMembers,
            expenses: req.body.expenses,
            updatedAt: new Date(),
          },
        },
        { new: true }
      );
      res.json(trip);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Analytics: Total spent by each member
  getTripStatsSummary: async (req, res) => {
    try {
      const tripId = req.params.tripId;
      const stats = await Trip.aggregate([
        { $match: { tripId: tripId } },
        { $unwind: "$expenses" },
        {
          $group: {
            _id: "$expenses.paidBy",
            totalSpent: { $sum: "$expenses.amount" },
          },
        },
        {
          $project: { member: "$_id", totalSpent: 1, _id: 0 },
        },
      ]);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  //  Analytics: Category breakdown
  getTripStatsCategories: async (req, res) => {
    try {
      const tripId = req.params.tripId;
      const stats = await Trip.aggregate([
        { $match: { tripId: tripId } },
        { $unwind: "$expenses" },
        {
          $group: {
            _id: "$expenses.category",
            total: { $sum: "$expenses.amount" },
          },
        },
        {
          $project: { category: "$_id", total: 1, _id: 0 },
        },
      ]);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Save settlements + send emails
  saveSettlements: async (req, res) => {
    try {
      const { tripId } = req.params;
      const { settlements } = req.body;

      const trip = await Trip.findOne({ tripId });
      if (!trip) return res.status(404).json({ error: "Trip not found" });

      trip.settlements = settlements.map((s) => ({
        ...s,
        status: "pending",
      }));
      await trip.save();

      // Send emails to debtors with personalized links
      for (let i = 0; i < settlements.length; i++) {
        const s = settlements[i];

        if (s.amount <= 0) continue; // skip if nothing to pay

        // Find debtor’s email from groupMembers
        const debtor = trip.groupMembers.find((m) => m.name === s.from);
        if (!debtor || !debtor.email) continue;

        // const payLink = `${API_URL}/?trip=${tripId}`;
        const payLink = `${API_URL}api/trips/${tripId}/settlements/${i}/pay`;

        //       await sendEmail(
        //         debtor.email,
        //         `BillBuddies – Settlement for "${trip.groupTitle}"`,
        //         // Plain text fallback
        //         `Hi ${s.from},\n\nYou need to pay ${s.to} ₹${s.amount}.\nTrip: ${trip.groupTitle}\nClick here: ${payLink}\n\n- BillBuddies`,
        //         // HTML Email 👇
        //         `
        // <div style="font-family: Arial, sans-serif; background:#f9fafb; padding:20px; color:#333;">

        //   <!-- Header -->
        //   <div style="text-align:center; padding:10px 0;">
        //     <img src="https://img.icons8.com/?size=100&id=117511&format=png&color=4CAF50"
        //          alt="BillBuddies Logo" width="50" style="margin-bottom:10px;">
        //     <h2 style="margin:0; color:#2b6cb0;">BillBuddies Notification</h2>
        //   </div>

        //   <!-- Settlement Card -->
        //   <div style="background:#fff; border:1px solid #e2e8f0; border-radius:8px;
        //               padding:20px; margin:20px auto; max-width:500px; box-shadow:0 2px 6px rgba(0,0,0,0.1);">

        //     <p>Hi <strong>${s.from}</strong>,</p>

        //     <p>You have a pending settlement in your trip
        //        <strong style="color:#2b6cb0;">${trip.groupTitle}</strong>.
        //     </p>

        //     <p style="font-size:16px;">➡️ Please pay
        //        <strong style="color:#38a169;">${s.to} ₹${s.amount}</strong>.
        //     </p>

        //     <p style="text-align:center; margin:20px 0;">
        //       <a href="${payLink}"
        //          style="display:inline-block; padding:12px 24px; background:#38a169; color:#fff;
        //                 text-decoration:none; border-radius:5px; font-weight:bold; font-size:16px;">
        //         ✅ Mark as Paid
        //       </a>
        //     </p>

        //     <hr style="margin:20px 0;">

        //     <p><strong>📌 Trip Details:</strong></p>
        //     <ul style="padding-left:20px; margin:0; color:#555;">
        //       <li><strong>Trip Title:</strong> ${trip.groupTitle}</li>
        //       <li><strong>Members:</strong> ${trip.groupMembers
        //         .map((m) => m.name)
        //         .join(", ")}</li>
        //     </ul>
        //   </div>

        //   <!-- Footer -->
        //   <div style="text-align:center; margin-top:30px; font-size:13px; color:#777;">
        //     💚 Thank you for using <strong>BillBuddies</strong><br>
        //     Making group trips simpler, one bill at a time!
        //   </div>
        // </div>
        // `
        //       );
        //   await sendEmail(
        //   debtor.email,
        //   `BillBuddies – Settlement for "${trip.groupTitle}"`,
        //   `Hi ${s.from}, You need to pay ${s.to} ₹${s.amount}. Click: ${payLink}`,
        //   `
        //     <div style="font-family: Arial, sans-serif;">
        //       <h2>💸 Settlement Reminder</h2>
        //       <p>Hi <strong>${s.from}</strong>,</p>
        //       <p>Please pay <strong>${s.to}</strong> ₹${s.amount} for the trip <b>${trip.groupTitle}</b>.</p>
        //       <p style="text-align:center; margin:20px 0;">
        //         <a href="${payLink}" style="background:#38a169;color:#fff;padding:10px 20px;border-radius:5px;text-decoration:none;">
        //           🔗 View QR & Upload Proof
        //         </a>
        //       </p>
        //     </div>
        //   `
        // );
        await sendEmail(
          debtor.email,
          `💸 Settlement Reminder – ${trip.groupTitle}`,
          `Hi ${s.from}, You need to pay ${s.to} ₹${s.amount}. Click: ${payLink}`,
          `
  <div style="font-family: 'Segoe UI', Arial, sans-serif; background:#f4f6f9; padding:20px;">
    <div style="max-width:600px; margin:auto; background:#ffffff; border-radius:10px; box-shadow:0 4px 12px rgba(0,0,0,0.1); overflow:hidden;">
      
      <!-- Header -->
      <div style="background:#16a34a; color:#ffffff; padding:16px; text-align:center;">
        <h2 style="margin:0; font-size:22px;">💸 Settlement Reminder</h2>
      </div>

      <!-- Body -->
      <div style="padding:24px; color:#334155; font-size:16px; line-height:1.6;">
        <p>Hi <strong>${s.from}</strong>,</p>
        
        <p>You have a pending settlement in your trip 
           <b style="color:#2563eb;">${trip.groupTitle}</b>.</p>
        
        <p>Please pay <strong>${s.to}</strong> 
           <span style="color:#16a34a; font-weight:bold;">₹${s.amount}</span>.</p>
        
        <!-- Call-to-Action -->
        <div style="text-align:center; margin:30px 0;">
          <a href="${payLink}" 
             style="background:#16a34a; color:#ffffff; padding:14px 28px; 
                    font-size:16px; font-weight:bold; border-radius:6px; 
                    text-decoration:none; display:inline-block;">
            🔗 View QR & Upload Proof
          </a>
        </div>

        <hr style="border:none; border-top:1px solid #e2e8f0; margin:30px 0;">

        <!-- Trip details -->
        <p><strong>📌 Trip Details:</strong></p>
        <ul style="padding-left:20px; margin:0; color:#555;">
          <li><strong>Trip:</strong> ${trip.groupTitle}</li>
          <li><strong>Pay To:</strong> ${s.to}</li>
          <li><strong>Amount:</strong> ₹${s.amount}</li>
        </ul>

        <!-- Footer -->
        <p style="font-size:14px; color:#94a3b8; text-align:center; margin-top:30px;">
          💚 Thank you for using <strong>BillBuddies</strong><br>
          Making group trips simpler, one bill at a time!
        </p>
      </div>
    </div>
  </div>
  `
        );
      }

      res.json(trip.settlements);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  markSettlementPaid: async (req, res) => {
    try {
      const { tripId, index } = req.params;
      const trip = await Trip.findOne({ tripId });
      if (!trip) return res.status(404).json({ error: "Trip not found" });

      if (!trip.settlements[index]) {
        return res.status(400).json({ error: "Invalid settlement index" });
      }

      // Update settlement status
      trip.settlements[index].status = "paid";
      trip.settlements[index].settledAt = new Date();
      await trip.save();

      const tx = trip.settlements[index];
      const payee = trip.groupMembers.find((m) => m.name === tx.to);

      if (payee?.email) {
        await transporter.sendMail({
          from: `"BillBuddies Notifications" <${process.env.EMAIL_USER}>`,
          to: payee.email,
          subject: `🎉 You Got Paid – ${trip.groupTitle}`,
          html: `
      <div style="font-family: Arial, sans-serif; max-width:600px; margin:auto; padding:20px; border:1px solid #eee; border-radius:8px; background:#fafafa;">
        <h2 style="color:#3182ce;">🎉 Payment Received</h2>
        <p>Hi <strong>${tx.to}</strong>,</p>
        <p>You have received <span style="color:#38a169;">₹${tx.amount}</span> from <strong>${tx.from}</strong> 
           for the trip <b>${trip.groupTitle}</b>.</p>
        <p style="text-align:center; margin-top:20px;">
          <a href="http://localhost:8000/?trip=${tripId}" 
             style="background:#2b6cb0; color:#fff; padding:10px 16px; border-radius:6px; text-decoration:none; font-weight:bold; display:inline-block;">
             🔗 View Trip
          </a>
        </p>
      </div>
    `,
        });
      }

      res.json(trip.settlements);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  uploadReceipt: async (req, res) => {
    try {
      const { tripId, expenseId } = req.params;
      const file = req.file;

      if (!file) return res.status(400).json({ error: "No file uploaded" });

      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(file.path, {
        folder: "billbuddies/receipts",
      });

      // Update trip expense with receipt URL
      const trip = await Trip.findOne({ tripId });
      if (!trip) return res.status(404).json({ error: "Trip not found" });

      const expense = trip.expenses.id(expenseId);
      if (!expense) return res.status(404).json({ error: "Expense not found" });

      expense.receiptUrl = result.secure_url;
      await trip.save();

      res.json({ success: true, url: result.secure_url });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // uploadProof: async (req, res) => {
  //   try {
  //     const { tripId, index } = req.params;
  //     const trip = await Trip.findOne({ tripId });
  //     if (!trip) return res.status(404).json({ error: "Trip not found" });

  //     const file = req.file;
  //     if (!file) return res.status(400).json({ error: "No file uploaded" });

  //     const result = await cloudinary.uploader.upload(file.path, {
  //       folder: "billbuddies/payment_proofs",
  //     });

  //     const settlement = trip.settlements[index];
  //     if (!settlement) return res.status(400).json({ error: "Invalid settlement index" });

  //     settlement.status = "proof_uploaded";
  //     settlement.proofUrl = result.secure_url;
  //     await trip.save();

  //     const payee = trip.groupMembers.find((m) => m.name === settlement.to);

  //     if (payee?.email) {
  //       await transporter.sendMail({
  //         from: `"BillBuddies Notifications" <${process.env.EMAIL_USER}>`,
  //         to: payee.email,
  //         subject: `📎 Payment proof received – ${trip.groupTitle}`,
  //         html: `
  //           <p>Hi ${settlement.to},</p>
  //           <p>${settlement.from} uploaded a payment screenshot of ₹${settlement.amount}.</p>
  //           <p><a href="${settlement.proofUrl}" target="_blank">📷 View Screenshot</a></p>
  //           <p><a href="http://localhost:8000/?trip=${tripId}&settlement=${index}&action=approve">✅ Approve Payment</a></p>
  //         `,
  //       });
  //     }

  //     res.json(trip.settlements);
  //   } catch (err) {
  //     res.status(500).json({ error: err.message });
  //   }
  // },

  uploadProof: async (req, res) => {
    try {
      const { tripId, index } = req.params;
      const trip = await Trip.findOne({ tripId });
      if (!trip) return res.status(404).json({ error: "Trip not found" });

      if (!req.file) return res.status(400).json({ error: "No file uploaded" });

      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "billbuddies/payment_proofs",
      });
      fs.unlinkSync(req.file.path);

      const settlement = trip.settlements[index];
      if (!settlement)
        return res.status(400).json({ error: "Invalid settlement index" });

      settlement.status = "proof_uploaded";
      settlement.proofUrl = result.secure_url;
      await trip.save();

      // Notify payee
      const payee = trip.groupMembers.find((m) => m.name === settlement.to);
      const approveLink = `${API_URL}api/trips/${tripId}/settlements/${index}/approve`;
      if (payee?.email) {
        // await sendEmail(
        //   payee.email,
        //   `📎 Payment proof received – ${trip.groupTitle}`,
        //   `Hi ${payee.name}, ${settlement.from} uploaded proof.`,
        //   `
        //     <p>Hi ${payee.name},</p>
        //     <p>${settlement.from} uploaded a payment screenshot of ₹${settlement.amount}.</p>
        //     <p><a href="${API_URL}api/trips/${tripId}/settlements/${index}/approve">✅ Approve Payment</a></p>
        //   `
        // );

        // await sendEmail(
        //   payee.email,
        //   `📎 Payment proof received – ${trip.groupTitle}`,
        //   `Hi ${payee.name}, ${settlement.from} uploaded proof.`,
        //   `
        //     <div style="font-family: Arial, sans-serif;">
        //       <h2>📎 Payment Proof Received</h2>
        //       <p>${settlement.from} uploaded a proof for ₹${settlement.amount}.</p>
        //       <p><a href="${settlement.proofUrl}" target="_blank">📷 View Screenshot</a></p>
        //       <p style="text-align:center; margin:20px 0;">
        //         <a href="${approveLink}" style="background:#3182ce;color:#fff;padding:10px 20px;border-radius:5px;text-decoration:none;">
        //           ✅ Review & Approve
        //         </a>
        //       </p>
        //     </div>
        //   `
        // );
        await sendEmail(
          payee.email,
          `📎 Payment Proof Received – ${trip.groupTitle}`,
          `Hi ${payee.name}, ${settlement.from} uploaded proof.`,
          `
  <div style="font-family: 'Segoe UI', Arial, sans-serif; background:#f4f6f9; padding:20px;">
    <div style="max-width:600px; margin:auto; background:#ffffff; border-radius:10px; box-shadow:0 4px 12px rgba(0,0,0,0.1); overflow:hidden;">
      
      <!-- Header -->
      <div style="background:#2563eb; color:#ffffff; padding:16px; text-align:center;">
        <h2 style="margin:0; font-size:22px;">📎 Payment Proof Uploaded</h2>
      </div>

      <!-- Body -->
      <div style="padding:24px; color:#334155; font-size:16px; line-height:1.6;">
        <p>Hi <strong>${payee.name}</strong>,</p>
        
        <p><strong>${settlement.from}</strong> has uploaded a payment proof of 
        <span style="color:#16a34a; font-weight:bold;">₹${settlement.amount}</span> 
        for your trip <b>${trip.groupTitle}</b>.</p>
        
        <!-- Proof Preview -->
        <div style="text-align:center; margin:20px 0;">
          <a href="${settlement.proofUrl}" target="_blank">
            <img src="${settlement.proofUrl}" alt="Payment Proof" 
              style="max-width:100%; border-radius:8px; border:1px solid #e2e8f0; box-shadow:0 2px 6px rgba(0,0,0,0.2);" />
          </a>
          <p style="font-size:13px; color:#64748b; margin-top:8px;">Click to view full screenshot</p>
        </div>

        <!-- Approve Button -->
        <div style="text-align:center; margin:30px 0;">
          <a href="${approveLink}" 
             style="background:#2563eb; color:#ffffff; padding:14px 28px; 
                    font-size:16px; font-weight:bold; border-radius:6px; 
                    text-decoration:none; display:inline-block;">
            ✅ Review & Approve Payment
          </a>
        </div>

        <hr style="border:none; border-top:1px solid #e2e8f0; margin:30px 0;">

        <p style="font-size:14px; color:#94a3b8; text-align:center;">
          💚 Thank you for using <strong>BillBuddies</strong>.<br>
          Making group trips simpler, one bill at a time!
        </p>
      </div>
    </div>
  </div>
  `
        );
      }

      res.json(settlement);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // approvePayment: async (req, res) => {
  //   try {
  //     const { tripId, index } = req.params;
  //     const trip = await Trip.findOne({ tripId });
  //     if (!trip) return res.status(404).json({ error: "Trip not found" });

  //     const settlement = trip.settlements[index];
  //     if (!settlement) return res.status(400).json({ error: "Invalid settlement index" });

  //     settlement.status = "paid";
  //     settlement.settledAt = new Date();
  //     await trip.save();

  //     const debtor = trip.groupMembers.find((m) => m.name === settlement.from);

  //     if (debtor?.email) {
  //       await transporter.sendMail({
  //         from: `"BillBuddies Notifications" <${process.env.EMAIL_USER}>`,
  //         to: debtor.email,
  //         subject: `✅ Payment approved – ${trip.groupTitle}`,
  //         html: `
  //           <p>Hi ${settlement.from},</p>
  //           <p>Your payment of ₹${settlement.amount} to ${settlement.to} was approved!</p>
  //           <p>Trip: <b>${trip.groupTitle}</b></p>
  //         `,
  //       });
  //     }

  //     res.json(trip.settlements);
  //   } catch (err) {
  //     res.status(500).json({ error: err.message });
  //   }
  // },

  approvePayment: async (req, res) => {
    try {
      const { tripId, index } = req.params;
      const trip = await Trip.findOne({ tripId });
      if (!trip) return res.status(404).json({ error: "Trip not found" });

      const settlement = trip.settlements[index];
      if (!settlement)
        return res.status(400).json({ error: "Invalid settlement index" });

      settlement.status = "paid";
      settlement.settledAt = new Date();
      await trip.save();

      // Notify debtor
      const debtor = trip.groupMembers.find((m) => m.name === settlement.from);
      if (debtor?.email) {
        await sendEmail(
          debtor.email,
          `✅ Payment approved – ${trip.groupTitle}`,
          `Hi ${debtor.name}, your payment has been approved.`,
          `<p>Your payment of ₹${settlement.amount} to ${settlement.to} was approved!</p>`
        );
      }

      res.json(settlement);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  uploadQrCode: async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });

      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "billbuddies/qr_codes",
      });
      // console.log("QR Code uploaded:", result.secure_url);

      // delete temp file
      fs.unlinkSync(req.file.path);

      res.json({ url: result.secure_url });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  addMember: async (req, res) => {
    try {
      const { tripId } = req.params;
      const { name, email } = req.body;

      if (!name || !email) {
        return res.status(400).json({ error: "Name and email are required" });
      }

      const trip = await Trip.findOne({ tripId });
      if (!trip) return res.status(404).json({ error: "Trip not found" });

      // Upload QR code if provided
      let qrCodeUrl = "";
      if (req.file) {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: "billbuddies/qr_codes",
        });
        qrCodeUrl = result.secure_url;

        // const fs = require("fs");
        fs.unlinkSync(req.file.path);
      }

      // Add member
      trip.groupMembers.push({ name, email, qrCodeUrl });
      await trip.save();

      res.json(trip.groupMembers);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
};

module.exports = tripController;
 