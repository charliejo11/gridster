import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

function getAuthMode(mode) {
  return mode === "signup" ? "signup" : "login";
}

function AuthPage({ initialMode = "login", onProfileOpen }) {
  const [mode, setMode] = useState(() => getAuthMode(initialMode));
  const [newPassword, setNewPassword] = useState("");
  const [slUsername, setSlUsername] = useState("");
  const [verificationRequestId, setVerificationRequestId] = useState("");
  const [enteredVerificationCode, setEnteredVerificationCode] = useState("");
  const [verificationMessage, setVerificationMessage] = useState("");
  const [verificationError, setVerificationError] = useState("");
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationSubmitting, setVerificationSubmitting] = useState(false);
  const [avatarVerified, setAvatarVerified] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const isSignupMode = mode === "signup";

  useEffect(() => {
    setMode(getAuthMode(initialMode));
  }, [initialMode]);

  useEffect(() => {
    const currentUser = supabase.auth.getUser();
    currentUser.then(({ data }) => {
      if (data?.user) {
        setUser(data.user);
      }
    }).catch(() => {});

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);

      if (event === "PASSWORD_RECOVERY") {
        setMode("reset");
      }
    });

    return () => listener?.subscription?.unsubscribe();
  }, []);

  const handleGenerateCode = async (e) => {
    e.preventDefault();
    setVerificationLoading(true);
    setVerificationRequestId("");
    setEnteredVerificationCode("");
    setAvatarVerified(false);
    setVerificationMessage("");
    setVerificationError("");
    setMessage("");

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        throw new Error("Log in to Gridster before verifying your Second Life avatar.");
      }

      const response = await fetch("/api/create-sl-verification-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ slUsername }),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || "Could not create a verification code.");
      }

      setVerificationRequestId(result.id);
      setVerificationMessage(result.message || "Verification request created.");
    } catch (error) {
      setVerificationError(error.message || "Could not reach the verification service.");
    } finally {
      setVerificationLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    const submittedCode = enteredVerificationCode.trim().toUpperCase();

    if (!verificationRequestId) {
      setVerificationError("Send a code to Second Life first.");
      return;
    }

    setVerificationSubmitting(true);
    setVerificationError("");
    setAvatarVerified(false);

    try {
      const response = await fetch("/api/verify-sl-verification-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: verificationRequestId,
          code: submittedCode,
        }),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || "Could not verify that code.");
      }

      setVerificationMessage(result.message || "Second Life avatar verified.");
      setVerificationError("");
      setAvatarVerified(true);
    } catch (error) {
      setAvatarVerified(false);
      setVerificationError(error.message || "Could not verify that code.");
    } finally {
      setVerificationSubmitting(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Check your email for the confirmation link.");
    }

    setLoading(false);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Check your email for a password reset link.");
    }

    setLoading(false);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setMessage(error.message);
    } else {
      setNewPassword("");
      setMessage("Password updated. You're logged in with your new password.");
      setMode("login");
    }

    setLoading(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Logged in successfully.");
    }

    setLoading(false);
  };

  const handleLogout = async () => {
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signOut();

    if (error) {
      setMessage(error.message);
    } else {
      setUser(null);
      setEmail("");
      setPassword("");
      setMessage("Logged out.");
    }

    setLoading(false);
  };

  if (mode === "reset") {
    return (
      <section className="auth-page">
        <div className="auth-card glass-card auth-login-card">
          <div className="auth-card-heading">
            <span>Gridster Account</span>
            <h3>Choose a new password.</h3>
          </div>

          <form className="auth-form" onSubmit={handleResetPassword}>
            <label className="auth-field">
              <span>New password</span>
              <input
                className="auth-input"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
                required
              />
            </label>

            <div className="auth-actions">
              <button type="submit" className="auth-login-button" disabled={loading}>
                {loading ? "Updating..." : "Update Password"}
              </button>
            </div>
          </form>

          {message ? <p className="auth-message">{message}</p> : null}
        </div>
      </section>
    );
  }

  if (user) {
    return (
      <section className="auth-page">
        <div className="auth-card glass-card">
          <div className="auth-card-heading">
            <span>Gridster Account</span>
            <h3>Logged In</h3>
          </div>
          <p className="auth-user-email">{user.email}</p>
          <div className="auth-actions">
            <button className="auth-signup-button" type="button" onClick={onProfileOpen} disabled={loading}>
              Set Up Profile
            </button>
            <button className="auth-logout-button" type="button" onClick={handleLogout} disabled={loading}>
              {loading ? "Signing out..." : "Log Out"}
            </button>
          </div>
        </div>

        <div className="auth-card glass-card auth-verification-card">
          <div className="auth-card-heading">
            <span>Gridster Account</span>
            <h3>Verify your Second Life avatar</h3>
            <p>
              Enter your SL legacy username and we'll send a one-time verification code to your
              avatar. Verifying unlocks your Verified Resident badge.
            </p>
          </div>

          {avatarVerified ? <p className="auth-verified-badge">Verified Resident</p> : null}

          <form className="auth-form auth-sl-form" onSubmit={handleGenerateCode}>
            <label className="auth-field">
              <span>Second Life legacy username</span>
              <input
                className="auth-input"
                type="text"
                value={slUsername}
                onChange={(e) => setSlUsername(e.target.value)}
                placeholder="example: charliejo11.resident"
                disabled={verificationLoading}
                required
              />
            </label>

            <button type="submit" className="auth-generate-button" disabled={verificationLoading}>
              {verificationLoading ? "Creating Code..." : "Send Code to Second Life"}
            </button>
          </form>

          {verificationError ? <p className="auth-message auth-error-message" role="alert">{verificationError}</p> : null}

          {verificationRequestId ? (
            <div className="auth-verification-panel" aria-live="polite">
              <div className="auth-code-row">
                <span>Verification request</span>
                <strong>{avatarVerified ? "Verified" : "Queued"}</strong>
              </div>

              {verificationMessage ? <p className="auth-im-note">{verificationMessage}</p> : null}

              <form className="auth-code-form" onSubmit={handleVerifyCode}>
                <label className="auth-field">
                  <span>Enter verification code</span>
                  <input
                    className="auth-input"
                    type="text"
                    value={enteredVerificationCode}
                    onChange={(e) => setEnteredVerificationCode(e.target.value.toUpperCase())}
                    placeholder="GRID-4829"
                    disabled={verificationSubmitting}
                    required
                  />
                </label>

                <button type="submit" className="auth-verify-button" disabled={verificationSubmitting}>
                  {verificationSubmitting ? "Verifying..." : "Verify Code"}
                </button>
              </form>

              {avatarVerified ? <p className="auth-verified-note">Second Life avatar verification complete.</p> : null}
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  if (mode === "forgot") {
    return (
      <section className="auth-page">
        <div className="auth-card glass-card auth-login-card">
          <div className="auth-card-heading">
            <span>Gridster Account</span>
            <h3>Reset your password.</h3>
            <p>Enter your email and we'll send you a link to choose a new password.</p>
          </div>

          <form className="auth-form" onSubmit={handleForgotPassword}>
            <label className="auth-field">
              <span>Email</span>
              <input
                className="auth-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </label>

            <div className="auth-actions">
              <button type="submit" className="auth-login-button" disabled={loading}>
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
              <button
                type="button"
                className="auth-signup-button"
                onClick={() => {
                  setMode("login");
                  setMessage("");
                }}
                disabled={loading}
              >
                Back to Log In
              </button>
            </div>
          </form>

          {message ? <p className="auth-message">{message}</p> : null}
        </div>
      </section>
    );
  }

  return (
    <section className="auth-page">
      <div className="auth-card glass-card auth-login-card">
        <div className="auth-card-heading">
          <span>Gridster Account</span>
          <h3>Create your Gridster account first.</h3>
          <p>After you log in, you can verify your Second Life avatar and unlock your Verified Resident badge.</p>
        </div>

        <form className="auth-form" onSubmit={isSignupMode ? handleSignup : handleLogin}>
          <label className="auth-field">
            <span>Email</span>
            <input
              className="auth-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>

          <label className="auth-field">
            <span>Password</span>
            <input
              className="auth-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              required
            />
          </label>

          <div className="auth-actions">
            <button
              type="submit"
              className={isSignupMode ? "auth-signup-button" : "auth-login-button"}
              disabled={loading}
            >
              {loading ? (isSignupMode ? "Signing up..." : "Signing in...") : (isSignupMode ? "Sign Up" : "Log In")}
            </button>
            <button
              type="button"
              className={isSignupMode ? "auth-login-button" : "auth-signup-button"}
              onClick={() => {
                setMode(isSignupMode ? "login" : "signup");
                setMessage("");
              }}
              disabled={loading}
            >
              {isSignupMode ? "Log In Instead" : "Sign Up Instead"}
            </button>
          </div>

          {!isSignupMode ? (
            <button
              type="button"
              className="auth-forgot-password-link"
              onClick={() => {
                setMode("forgot");
                setMessage("");
              }}
              disabled={loading}
            >
              Forgot password?
            </button>
          ) : null}
        </form>

        {message ? <p className="auth-message">{message}</p> : null}
      </div>
    </section>
  );
}

export default AuthPage;
