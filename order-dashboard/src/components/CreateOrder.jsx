
import { useState } from "react";
import { Link } from "react-router-dom";
import "./CreateOrder.css";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:9092";

export default function CreateOrder() {
  const [form, setForm] = useState({
    orderId: "",
    description: "",
    amount: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Please log in before creating an order.");
      }

      const payload = {
        orderId: form.orderId.trim(),
        description: form.description.trim(),
        amount: Number(form.amount),
      };

      const response = await fetch(`${API}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const body = await response.text();

      if (response.status === 401) {
        throw new Error("Your session expired. Please log in again.");
      }

      if (!response.ok) {
        throw new Error(body || `Order creation failed: ${response.status}`);
      }

      setMessage(body || "Order created successfully!");
      setForm({ orderId: "", description: "", amount: "" });
    } catch (err) {
      setError(err.message || "Unable to create order.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="create-order-page">
      <form className="create-order-card" onSubmit={handleSubmit}>
        <h1>Create New Order</h1>
        <p>Enter the order details below.</p>

        {message && <div className="order-success">{message}</div>}
        {error && <div className="order-error">{error}</div>}

        <label htmlFor="orderId">Order ID</label>
        <input
          id="orderId"
          name="orderId"
          value={form.orderId}
          onChange={handleChange}
          placeholder="Enter order ID"
          required
        />

        <label htmlFor="description">Order Description</label>
        <input
          id="description"
          name="description"
          value={form.description}
          onChange={handleChange}
          placeholder="Enter order description"
          required
        />

        <label htmlFor="amount">Amount (₹)</label>
        <input
          id="amount"
          name="amount"
          type="number"
          min="0.01"
          step="0.01"
          value={form.amount}
          onChange={handleChange}
          placeholder="Enter amount"
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create Order"}
        </button>

        <Link className="back-link" to="/dashboard">
          Back to Dashboard
        </Link>
      </form>
    </div>
  );
}
