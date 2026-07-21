# 🏥 Subhan Care Hospital Management System

A full-stack **MERN** Hospital Management System built for Subhan Care. Covers patient registration, doctor scheduling, clinical consultations, pharmacy inventory, billing, and admin analytics.

## Tech Stack
- **MongoDB Atlas** — Cloud Database
- **Express.js** — REST API Backend
- **React + Vite** — Frontend
- **Node.js** — Runtime

## Features
- 🔐 JWT Authentication with Role-Based Access Control (RBAC)
- 🏥 Patient Registration & Management
- 👨‍⚕️ Doctor Profiles & Availability Scheduling
- 📅 Appointment Booking (with conflict prevention)
- 🩺 Clinical Consultations & Prescriptions
- 💊 Pharmacy Inventory & Auto Stock Deduction
- 🧾 Billing, Invoicing & Credit Notes
- 📊 Admin KPI Dashboard & Audit Logs
- 📱 Mobile Responsive UI

## Getting Started

### 1. Clone the repo
```bash
git clone https://github.com/<your-username>/HMS.git
cd HMS
```

### 2. Setup Backend
```bash
cd server
npm install
cp .env.example .env
# Fill in your MONGO_URI and JWT_SECRET in .env
npm run dev
```

### 3. Setup Frontend
```bash
cd client
npm install
npm run dev
```

### 4. Open in browser
```
http://localhost:5173
```

### 5. Create first Admin account
```bash
POST http://localhost:5000/api/auth/register
{
  "username": "admin",
  "email": "admin@subhancare.com",
  "password": "Admin@1234",
  "role": "Admin"
}
```

## User Roles
| Role | Access |
|------|--------|
| Admin | Full system access, reports, audit logs |
| Receptionist | Patient registration, appointments |
| Doctor | Clinical queue, consultations, prescriptions |
| Pharmacist | Pharmacy stock, dispense medicines |
| Billing Staff | Invoices, payments, credit notes |

## Project Structure
```
HMS/
├── server/          # Express.js backend
│   ├── models/      # Mongoose schemas
│   ├── routes/      # REST API routes
│   ├── middleware/  # Auth & Audit middleware
│   └── index.js    # Server entry point
└── client/          # React + Vite frontend
    └── src/
        ├── pages/       # Page components
        ├── components/  # Sidebar, Navbar
        └── context/     # Auth context
```
