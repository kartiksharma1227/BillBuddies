# 💸 BillBuddies – Smart Expense Splitting & Settlements

BillBuddies is a **full-stack expense-sharing and settlement system** designed to simplify group trip expense management.  
It allows users to add members (with QR codes), record expenses (with receipts), calculate settlements using the **Minimum Cash Flow Algorithm**, upload payment proofs, and approve/confirm payments — all with **real-time email notifications**.

---

## 🚀 Features

- 👥 **Group Trip Management** – Create trips with members (name, email, QR code).  
- 💰 **Expense Tracking** – Add expenses with participants, categories, receipts, and timestamps.  
- ⚖️ **Settlement Calculation** – Optimized **Minimum Cash Flow Algorithm** reduces total number of transactions by up to 60%.  
- 📎 **Proof Upload & Approval** – Debtors upload payment proofs, payees approve via dedicated approval links.  
- 📩 **Automated Notifications** – Email reminders, proof received alerts, and payment confirmations (via Nodemailer).  
- 📊 **Analytics Dashboard** – Category breakdown, member spending insights, and printable settlement reports.  
- ☁️ **Secure File Handling** – Receipts, proofs, and QR codes stored safely in **Cloudinary**.  

---

## 🛠️ Tech Stack

**Backend**
- Node.js, Express.js  
- MongoDB + Mongoose  
- Cloudinary (file uploads)  
- Nodemailer (email notifications)  

 

---

## 📂 Project Structure

```

├── config/
│   ├── cloudinary.js       # Cloudinary setup
│   └── database.js         # MongoDB connection
├── controllers/
│   └── tripController.js   # All business logic
├── models/
│   └── Trip.js             # Mongoose schemas
├── routes/
│   └── tripRoutes.js       # REST API routes
├── public/
│   ├── index.html          # Main UI
│   ├── approve.html        # Payment approval page
│   ├── pay.html            # Payment upload page
│   ├── script.js           # Frontend logic
│   └── style.css           # Styling
├── uploads/                # Temporary uploads (multer)
├── app.js                  # Server entry point
└── .env                    # Environment variables

````

---

## ⚙️ Setup & Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/kartiksharma1227/BillBuddies.git
   cd billbuddies
````

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**
   Create a `.env` file in the root with:

   ```env
   PORT=8000
   MONGODB_URI=your-mongodb-uri
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud
   CLOUDINARY_API_KEY=your-cloudinary-key
   CLOUDINARY_API_SECRET=your-cloudinary-secret
   ```

4. **Run the server**

   ```bash
   npm start
   ```

   Visit: [http://localhost:8000](http://localhost:8000)

---

## 🔑 API Endpoints (Backend)

| Method | Endpoint                                         | Description                        |
| ------ | ------------------------------------------------ | ---------------------------------- |
| `POST` | `/api/trips`                                     | Create a new trip                  |
| `GET`  | `/api/trips/:tripId`                             | Get trip details                   |
| `PUT`  | `/api/trips/:tripId`                             | Update trip (members/expenses)     |
| `POST` | `/api/trips/:tripId/expenses/:expenseId/receipt` | Upload expense receipt             |
| `POST` | `/api/trips/:tripId/settlements`                 | Save settlements (triggers emails) |
| `POST` | `/api/trips/:tripId/settlements/:index/proof`    | Upload payment proof               |
| `PUT`  | `/api/trips/:tripId/settlements/:index/approve`  | Approve a payment proof            |
| `PUT`  | `/api/trips/:tripId/settlements/:index/paid`     | Mark settlement as paid            |
| `POST` | `/api/trips/upload/qr`                           | Upload member QR code              |

---

## 📜 License

This project is licensed under the **MIT License**.

---

💚 Built with passion to make group trips simpler – one bill at a time!

 
