import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";

// Pages
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import PatientManagement from "./pages/PatientManagement";
import DoctorManagement from "./pages/DoctorManagement";
import StaffManagement from "./pages/StaffManagement";
import AppointmentScheduling from "./pages/AppointmentScheduling";
import DoctorDashboard from "./pages/DoctorDashboard";
import PharmacistPortal from "./pages/PharmacistPortal";
import BillingPortal from "./pages/BillingPortal";

/**
 * Route protection wrapper for authenticated pages.
 */
function ProtectedRoute({ children, roles = [] }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="page-loading"><span className="spinner" /> Loading session...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles.length > 0 && !roles.includes(user.role)) {
    // Redirect to default home page or custom access denied page
    return <Navigate to="/" replace />;
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content-wrapper">
        <Navbar />
        <main className="content-container">
          {children}
        </main>
      </div>
    </div>
  );
}

function HomeRedirect() {
  const { user } = useAuth();
  
  if (!user) return <Navigate to="/login" replace />;
  
  // Direct default home route to respective role dashboards
  if (user.role === "Doctor") return <Navigate to="/clinical" replace />;
  if (user.role === "Pharmacist") return <Navigate to="/pharmacist" replace />;
  if (user.role === "Billing Staff") return <Navigate to="/billing" replace />;
  
  return <Dashboard />;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <HomeRedirect />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patients"
            element={
              <ProtectedRoute roles={["Admin", "Receptionist"]}>
                <PatientManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctors"
            element={
              <ProtectedRoute roles={["Admin"]}>
                <DoctorManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff"
            element={
              <ProtectedRoute roles={["Admin"]}>
                <StaffManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/appointments"
            element={
              <ProtectedRoute roles={["Admin", "Receptionist"]}>
                <AppointmentScheduling />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clinical"
            element={
              <ProtectedRoute roles={["Admin", "Doctor"]}>
                <DoctorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pharmacist"
            element={
              <ProtectedRoute roles={["Admin", "Pharmacist"]}>
                <PharmacistPortal />
              </ProtectedRoute>
            }
          />
          <Route
            path="/billing"
            element={
              <ProtectedRoute roles={["Admin", "Billing Staff"]}>
                <BillingPortal />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
