import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Loader2 } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [step, setStep] = useState(1); // 1 = request OTP, 2 = reset password
  const [devCode, setDevCode] = useState(""); // Dev code helper for local testing
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setLoading(false);

      if (res.ok) {
        setMessage(data.message);
        if (data.dev_code) {
          setDevCode(data.dev_code);
        }
        setStep(2);
      } else {
        setError(data.message || "Failed to send reset request");
      }
    } catch (err) {
      setLoading(false);
      setError("Network error. Please try again.");
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp, newPassword }),
      });
      const data = await res.json();
      setLoading(false);

      if (res.ok) {
        setMessage("Password updated successfully. Redirecting to login...");
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      } else {
        setError(data.message || "Failed to reset password");
      }
    } catch (err) {
      setLoading(false);
      setError("Network error. Please try again.");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-glow" />
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">🔑</div>
          <h1>Reset Password</h1>
          <p>Subhan Care Account Recovery</p>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}
        {message && <div className="alert alert-success">{message}</div>}

        {step === 1 ? (
          <form onSubmit={handleRequestOtp} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                placeholder="Enter your registered email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary w-full mt-4" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="spinner animate-spin" size={18} />
                  <span>Sending Request...</span>
                </>
              ) : (
                <span>Request Reset Code</span>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="auth-form">
            {devCode && (
              <div className="alert alert-info" style={{ fontSize: "12px" }}>
                <strong>Development Code:</strong> Use OTP <code>{devCode}</code> to complete the reset.
              </div>
            )}

            <div className="form-group">
              <label htmlFor="otp">Reset Code (OTP)</label>
              <input
                type="text"
                id="otp"
                placeholder="6-digit verification code"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="newPassword">New Password</label>
              <input
                type="password"
                id="newPassword"
                placeholder="Min 8 chars, A-z, 0-9, symbol"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary w-full mt-4" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="spinner animate-spin" size={18} />
                  <span>Updating Password...</span>
                </>
              ) : (
                <span>Update Password</span>
              )}
            </button>
          </form>
        )}

        <div className="auth-footer">
          <Link to="/login" style={{ color: "var(--color-primary-light)", fontWeight: 500 }}>
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
