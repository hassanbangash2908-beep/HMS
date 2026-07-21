import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
  Users,
  CalendarCheck,
  TrendingUp,
  AlertCircle,
  FileClock,
  ShieldCheck,
} from "lucide-react";

export default function Dashboard() {
  const { authFetch } = useAuth();
  const [kpis, setKpis] = useState({
    newPatientsToday: 0,
    totalPatients: 0,
    appointmentsToday: 0,
    revenueToday: 0,
    totalRevenue: 0,
    lowStockCount: 0,
    nearExpiryCount: 0,
  });
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        // Load KPIs
        const kpiRes = await authFetch("/api/reports/dashboard-kpis");
        const kpiData = await kpiRes.json();
        
        // Load Audit Logs
        const logsRes = await authFetch("/api/reports/audit-logs");
        const logsData = await logsRes.json();

        if (kpiRes.ok && kpiData.success) {
          setKpis(kpiData.kpis);
        }
        if (logsRes.ok && logsData.success) {
          setLogs(logsData.logs);
        }
      } catch (err) {
        setError("Error loading metrics dashboard.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="page-loading">
        <span className="spinner" /> Loading dashboard...
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="page-header-row">
        <div>
          <h1>KPI Operational Dashboard</h1>
          <p className="subtitle">Real-time summaries and compliance activity logs</p>
        </div>
      </div>

      {error && <div className="alert alert-danger mb-4">{error}</div>}

      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        <div className="kpi-card purple">
          <div className="kpi-icon">
            <Users size={24} />
          </div>
          <div className="kpi-content">
            <h3>Registered Patients</h3>
            <div className="kpi-value">{kpis.totalPatients}</div>
            <div className="kpi-sub">+ {kpis.newPatientsToday} registered today</div>
          </div>
        </div>

        <div className="kpi-card blue">
          <div className="kpi-icon">
            <CalendarCheck size={24} />
          </div>
          <div className="kpi-content">
            <h3>Today's Bookings</h3>
            <div className="kpi-value">{kpis.appointmentsToday}</div>
            <div className="kpi-sub">Active scheduled slots</div>
          </div>
        </div>

        <div className="kpi-card green">
          <div className="kpi-icon">
            <TrendingUp size={24} />
          </div>
          <div className="kpi-content">
            <h3>Today's Billing</h3>
            <div className="kpi-value">Rs. {kpis.revenueToday}</div>
            <div className="kpi-sub">Total revenue: Rs. {kpis.totalRevenue}</div>
          </div>
        </div>

        <div className="kpi-card red">
          <div className="kpi-icon">
            <AlertCircle size={24} />
          </div>
          <div className="kpi-content">
            <h3>Alert Stock Levels</h3>
            <div className="kpi-value">{kpis.lowStockCount}</div>
            <div className="kpi-sub">{kpis.nearExpiryCount} items expiring soon</div>
          </div>
        </div>
      </div>

      {/* Audit Logs and Quick Info */}
      <div className="dashboard-content-split">
        <div className="card audit-log-panel">
          <div className="card-header">
            <div className="card-title">
              <FileClock className="icon-purple" size={20} />
              Tamper-Evident System Audit Trail
            </div>
            <span className="badge badge-success">
              <ShieldCheck size={12} style={{ marginRight: "4px" }} /> Secure
            </span>
          </div>
          
          <div className="card-body scroll-panel">
            {logs.length === 0 ? (
              <div className="idle-state">
                <p>No audit trail records found in this environment.</p>
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Operator</th>
                    <th>Action</th>
                    <th>Affected Unit</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log._id}>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {new Date(log.timestamp).toLocaleTimeString()}{" "}
                        <span style={{ fontSize: "10px", opacity: 0.6 }}>
                          {new Date(log.timestamp).toLocaleDateString()}
                        </span>
                      </td>
                      <td>
                        <strong>{log.username || "System"}</strong>
                        <div style={{ fontSize: "10px", opacity: 0.7 }}>
                          {log.userId?.role || "System"}
                        </div>
                      </td>
                      <td>
                        <span className={`method-badge ${log.action.includes("CREATE") ? "get-tag" : "error"}`}>
                          {log.action}
                        </span>
                      </td>
                      <td>
                        <code className="text-purple">{log.affectedEntity}</code>
                        <div style={{ fontSize: "10px", opacity: 0.6 }}>ID: {log.affectedRecordId}</div>
                      </td>
                      <td style={{ fontSize: "12px" }}>{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
