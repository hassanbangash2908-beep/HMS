import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  CalendarRange,
  ClipboardList,
  Receipt,
  Pill,
  LogOut,
  Menu,
  X,
} from "lucide-react";

export default function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  if (!user) return null;

  const links = [];

  if (user.role === "Admin") {
    links.push(
      { path: "/", label: "Dashboard", icon: LayoutDashboard },
      { path: "/patients", label: "Patients", icon: Users },
      { path: "/doctors", label: "Doctors", icon: UserCheck },
      { path: "/staff", label: "Staff Directory", icon: Users },
      { path: "/appointments", label: "Appointments", icon: CalendarRange },
      { path: "/clinical", label: "Clinical Queue", icon: ClipboardList },
      { path: "/billing", label: "Billing / Invoices", icon: Receipt },
      { path: "/pharmacist", label: "Pharmacy Stock", icon: Pill }
    );
  } else if (user.role === "Receptionist") {
    links.push(
      { path: "/patients", label: "Patients", icon: Users },
      { path: "/appointments", label: "Appointments", icon: CalendarRange }
    );
  } else if (user.role === "Doctor") {
    links.push({ path: "/clinical", label: "Clinical Queue", icon: ClipboardList });
  } else if (user.role === "Pharmacist") {
    links.push({ path: "/pharmacist", label: "Pharmacy Stock", icon: Pill });
  } else if (user.role === "Billing Staff") {
    links.push({ path: "/billing", label: "Billing & Receipts", icon: Receipt });
  }

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        className="hamburger-btn"
        onClick={() => setOpen(!open)}
        aria-label="Toggle menu"
      >
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Overlay when sidebar is open on mobile */}
      {open && (
        <div className="sidebar-overlay" onClick={() => setOpen(false)} />
      )}

      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="sidebar-brand">
          <span className="brand-icon">🏥</span>
          <span className="brand-text">Subhan Care</span>
        </div>

        <div className="user-profile-badge">
          <div className="user-avatar">{user.username[0].toUpperCase()}</div>
          <div className="user-info">
            <div className="user-name">{user.username}</div>
            <div className="user-role">{user.role}</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`nav-link ${isActive ? "active" : ""}`}
              >
                <Icon size={18} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <button className="btn btn-danger logout-btn" onClick={logout}>
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </aside>
    </>
  );
}
