import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const currentUser = supabase.auth.getUser();
    currentUser.then(({ data }) => {
      if (data?.user) {
        setUser(data.user);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => listener?.subscription?.unsubscribe();
  }, []);

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
          <span>Gridster Account</span>
          <h3>Logged In</h3>
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
      <div className="auth-card glass-card">
        <span>Gridster Account</span>
        <h3>Sign In</h3>

        <form className="auth-form" onSubmit={handleLogin}>
          <label className="auth-field">
            <span>Email</span>
            <input
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
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              required
            />
          </label>

          <div className="auth-actions">
            <button type="submit" className="auth-login-button" disabled={loading}>
              {loading ? "Signing in..." : "Log In"}
            </button>
            <button type="button" className="auth-signup-button" onClick={handleSignup} disabled={loading}>
              {loading ? "Signing up..." : "Sign Up"}
            </button>
          </div>
        </form>

        {message ? <p className="auth-message">{message}</p> : null}
      </div>
    </section>
  );
}

export default AuthPage;