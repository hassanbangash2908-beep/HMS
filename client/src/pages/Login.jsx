import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { KeyRound, User, Loader2 } from "lucide-react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!username || !password) {
      setError("Please enter both username and password");
      setLoading(false);
      return;
    }

    const res = await login(username, password);
    setLoading(false);

    if (res.success) {
      navigate("/");
    } else {
      setError(res.error || "Login failed");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-glow" />
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">🏥</div>
          <h1>Subhan Care HMS</h1>
          <p>Hospital Management System Portal</p>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <div className="input-with-icon">
              <User className="input-icon" size={18} />
              <input
                type="text"
                id="username"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <div className="label-row">
              <label htmlFor="password">Password</label>
              <Link to="/forgot-password" style={{ fontSize: "12px", color: "var(--color-primary-light)" }}>
                Forgot Password?
              </Link>
            </div>
            <div className="input-with-icon">
              <KeyRound className="input-icon" size={18} />
              <input
                type="password"
                id="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary w-full mt-4" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="spinner animate-spin" size={18} />
                <span>Authenticating...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>Secure system access for authorized personnel only.</p>
          <p style={{ marginTop: "10px", fontSize: "11px", opacity: 0.7 }}>
            Try registering an admin account if you don't have credentials.
          </p>
        </div>
      </div>
    </div>
  );
}
