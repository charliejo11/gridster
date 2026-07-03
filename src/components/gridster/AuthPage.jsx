import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

function getAuthMode(mode) {
  return mode === "signup" ? "signup" : "login";
}

function AuthPage({ initialMode = "login" }) {
  const [mode, setMode] = useState(() => getAuthMode(initialMode));
  const [slUsername, setSlUsername] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [enteredVerificationCode, setEnteredVerificationCode] = useState("");
  const [verificationMessage, setVerificationMessage] = useState("");
  const [verificationError, setVerificationError] = useState("");
  const [verificationLoading, setVerificationLoading] = useState(false);
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

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => listener?.subscription?.unsubscribe();
  }, []);

  const handleGenerateCode = async (e) => {
    e.preventDefault();
    setVerificationLoading(true);
    setVerificationCode("");
    setEnteredVerificationCode("");
    setAvatarVerified(false);
    setVerificationMessage("");
    setVerificationError("");
    setMessage("");

    try {
      const response = await fetch("/.netlify/functions/create-sl-verification-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ slUsername }),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || "Could not create a verification code.");
      }

      setVerificationCode(result.code);
      setVerificationMessage(result.message || "Verification code created and stored.");
    } catch (error) {
      setVerificationError(error.message || "Could not reach the verification service.");
    } finally {
      setVerificationLoading(false);
    }
  };

  const handleVerifyCode = (e) => {
    e.preventDefault();
    const submittedCode = enteredVerificationCode.trim().toUpperCase();

    if (!verificationCode) {
      setVerificationError("Generate a verification code first.");
      return;
    }

    if (submittedCode !== verificationCode) {
      setAvatarVerified(false);
      setVerificationError("That code does not match the current Gridster verification code.");
      return;
    }

    setVerificationError("");
    setAvatarVerified(true);
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Check your email for the confirmation link.");
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

  if (user) {
    return (
      <section className="auth-page">
        <div className="auth-card glass-card">
          <div className="auth-card-heading">
            <span>Gridster Account</span>
            <h3>Logged In</h3>
          </div>
          <p className="auth-user-email">{user.email}</p>
          <button className="auth-logout-button" onClick={handleLogout} disabled={loading}>
            {loading ? "Signing out..." : "Log Out"}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="auth-page">
      <div className="auth-card glass-card auth-verification-card">
        <div className="auth-card-heading">
          <span>Gridster Account</span>
          <h3>Verify your Second Life avatar</h3>
          <p>
            Gridster is for Second Life residents. Start by entering your SL legacy username.
            We'll send a one-time verification code to your avatar.
          </p>
        </div>

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

        {verificationCode ? (
          <div className="auth-verification-panel" aria-live="polite">
            <div className="auth-code-row">
              <span>One-time avatar code</span>
              <strong>{verificationCode}</strong>
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
                  required
                />
              </label>

              <button type="submit" className="auth-verify-button">
                Verify Code
              </button>
            </form>

            {avatarVerified ? <p className="auth-verified-note">Second Life avatar verification marked complete for this preview.</p> : null}
          </div>
        ) : null}

        <p className="auth-next-step">After SL verification, you'll finish account setup with email and password.</p>
      </div>

      <div className="auth-card glass-card auth-login-card">
        <div className="auth-card-heading">
          <span>Later step</span>
          <h3>Create your Gridster login</h3>
          <p>After your Second Life avatar is verified, you'll create your Gridster login.</p>
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
        </form>

        {message ? <p className="auth-message">{message}</p> : null}
      </div>
    </section>
  );
}

export default AuthPage;
