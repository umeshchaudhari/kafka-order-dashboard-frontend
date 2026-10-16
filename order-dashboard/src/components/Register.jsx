import { useState } from "react";
import { Link } from "react-router-dom";
import { encryptData, decryptData } from "../utils/encryption";
import "./Register.css";

const API =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:9092";

export default function Register() {
  const [form, setForm] = useState({
    username: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function handleChange(event) {
    setForm((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const encryptedData = await encryptData(
        JSON.stringify(form)
      );

      const response = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          data: encryptedData,
        }),
      });

      const responseBody = await response.json();

      if (!responseBody.data) {
        throw new Error("Invalid response from server");
      }

      const decryptedJson = await decryptData(
        responseBody.data
      );

      const body = JSON.parse(decryptedJson);

      if (!response.ok) {
        throw new Error(
          body.message || "Registration failed"
        );
      }

      setMessage(
        body.message || "Registration successful. Please log in."
      );

      setForm({
        username: "",
        password: "",
      });
    } catch (err) {
      console.error("Registration error:", err);
      setError(err.message || "Unable to register.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="register-page">
      <form className="register-card" onSubmit={handleSubmit}>
        <h1>Create Account</h1>
        <p>Register to start managing your orders.</p>

        {message && (
          <div className="success-message">{message}</div>
        )}

        {error && (
          <div className="form-error">{error}</div>
        )}

        <label htmlFor="username">Username</label>
        <input
          id="username"
          name="username"
          type="text"
          value={form.username}
          onChange={handleChange}
          autoComplete="username"
          required
        />

        <label htmlFor="register-password">Password</label>
        <input
          id="register-password"
          name="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          autoComplete="new-password"
          minLength={8}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? "Registering..." : "Register"}
        </button>

        <div className="register-footer">
          Already registered? <Link to="/login">Login here</Link>
        </div>
      </form>
    </div>
  );
}