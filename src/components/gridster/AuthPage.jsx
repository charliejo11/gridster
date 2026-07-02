import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

function getAuthMode(mode) {
  return mode === "signup" ? "signup" : "login";
}

function AuthPage({ initialMode = "login" }) {
  const [mode, setMode] = useState(() => getAuthMode(initialMode));
  const [slUsername, setSlUsername] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
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

  const handleGenerateCode = (e) => {
    e.preventDefault();
    setVerificationCode(`GRID-${Math.floor(1000 + Math.random() * 9000)}`);
    setMessage("");
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
            We'll generate a one-time verification code for your avatar.
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
              required
            />
          </label>

          <button type="submit" className="auth-generate-button">
            Generate Verification Code
          </button>
        </form>

        {verificationCode ? (
          <div className="auth-verification-panel" aria-live="polite">
            <div className="auth-code-row">
              <span>One-time avatar code</span>
              <strong>{verificationCode}</strong>
            </div>

            <ol>
              <li>Log into Second Life.</li>
              <li>Visit the Gridster verification kiosk.</li>
              <li>Touch the kiosk.</li>
              <li>Paste or enter this code.</li>
              <li>Gridster will connect your SL avatar UUID to your account.</li>
            </ol>

            <p className="auth-kiosk-note">In-world kiosk connection coming soon.</p>
          </div>
        ) : null}

        <p className="auth-next-step">After SL verification, you'll finish account setup with email and password.</p>
      </div>

      <div className="auth-card glass-card auth-login-card">
        <div className="auth-card-heading">
          <span>Finish account login</span>
          <h3>{isSignupMode ? "Create your login" : "Sign in with email"}</h3>
          <p>Use this secondary account login after your Second Life avatar is verified.</p>
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
