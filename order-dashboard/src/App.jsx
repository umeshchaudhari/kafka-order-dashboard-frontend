import { useCallback, useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import "./App.css";

const API =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:9092";

const PAGE_SIZE = 10;

export default function App() {
  const [token, setToken] = useState(
    () => localStorage.getItem("token")
  );

  const [username, setUsername] = useState(
    () => localStorage.getItem("username") || ""
  );

  const [password, setPassword] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState("");

  const [total, setTotal] = useState(0);
  const [order, setOrder] = useState([]);
  const [daily, setDaily] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // LOGIN
  async function handleLogin(event) {
    event.preventDefault();

    setLoggingIn(true);
    setLoginError("");

    try {
      // Step 1: Encrypt username and password.
      const encryptResponse = await fetch(
        `${API}/encryption/encrypt`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            username,
            password,
          }),
        }
      );

      if (!encryptResponse.ok) {
        const message = await encryptResponse.text();

        throw new Error(
          `Encryption failed (${encryptResponse.status}): ${message}`
        );
      }

      const encryptedRequest = await encryptResponse.json();

      if (!encryptedRequest.data) {
        throw new Error(
          "Encryption API did not return a data field."
        );
      }

      // Step 2: Send encrypted credentials to the login API.
      const loginResponse = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          data: encryptedRequest.data,
        }),
      });

      if (!loginResponse.ok) {
        const message = await loginResponse.text();

        throw new Error(
          `Login failed (${loginResponse.status}): ${message}`
        );
      }

      const encryptedLoginData = await loginResponse.json();

      if (!encryptedLoginData.data) {
        throw new Error(
          "Login API did not return an encrypted data field."
        );
      }

      // Step 3: Decrypt the login response.
      const decryptResponse = await fetch(
        `${API}/encryption/decrypt`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            data: encryptedLoginData.data,
          }),
        }
      );

      if (!decryptResponse.ok) {
        const message = await decryptResponse.text();

        throw new Error(
          `Response decryption failed (${decryptResponse.status}): ${message}`
        );
      }

      const loginData = await decryptResponse.json();

      // Step 4: Validate the login response.
      if (loginData.message && !loginData.token) {
        throw new Error(loginData.message);
      }

      const jwt =
        loginData.token ??
        loginData.accessToken ??
        loginData.jwt ??
        loginData.access_token;

      if (!jwt || typeof jwt !== "string") {
        throw new Error(
          "Decrypted login response does not contain a JWT token."
        );
      }

      // Step 5: Save the token and logged-in username.
      const loggedInUsername =
        loginData.username ??
        loginData.user?.username ??
        username;

      localStorage.setItem("token", jwt);
      localStorage.setItem("username", loggedInUsername);

      setToken(jwt);
      setUsername(loggedInUsername);
      setPassword("");
      setPage(0);
      setLoginError("");
      setError("");
    } catch (err) {
      console.error("Login error:", err);

      setLoginError(
        err.message || "Unable to log in. Please try again."
      );
    } finally {
      setLoggingIn(false);
    }
  }

  // DECRYPT ENCRYPTED API RESPONSES
  async function decryptApiResponse(response) {
    const encryptedResponse = await response.json();

    // Support APIs that return plain JSON.
    if (
      !encryptedResponse ||
      typeof encryptedResponse.data !== "string"
    ) {
      return encryptedResponse;
    }

    const decryptResponse = await fetch(
      `${API}/encryption/decrypt`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          data: encryptedResponse.data,
        }),
      }
    );

    if (!decryptResponse.ok) {
      const message = await decryptResponse.text();

      throw new Error(
        `Decryption failed (${decryptResponse.status}): ${message}`
      );
    }

    return await decryptResponse.json();
  }

  // LOAD DASHBOARD
  const loadDashboard = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError("");

    try {
      const headers = {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      };

      const requests = [
        {
          name: "Order count",
          url: `${API}/order/count`,
        },
        {
          name: "Order details",
          url: `${API}/order?page=${page}&size=${PAGE_SIZE}`,
        },
        {
          name: "Daily order count",
          url: `${API}/order/count/daily`,
        },
      ];

      const responses = await Promise.all(
        requests.map(({ url }) =>
          fetch(url, {
            method: "GET",
            headers,
          })
        )
      );

      for (let i = 0; i < responses.length; i++) {
        if (!responses[i].ok) {
          const message = await responses[i].text();

          // if (responses[i].status === 401) {
          //   localStorage.removeItem("token");
          //   localStorage.removeItem("username");

          //   setToken(null);
          //   setUsername("");

          //   throw new Error(
          //     "Your session expired. Please log in again."
          //   );
          // }
          if (responses[i].status === 401) {
  handleLogout(
    "Your session has expired. Please log in again."
  );
  return;
}

          throw new Error(
            `${requests[i].name} failed (${responses[i].status}): ${message}`
          );
        }
      }

      const [countData, pageData, dailyData] =
        await Promise.all(
          responses.map((response) =>
            decryptApiResponse(response)
          )
        );

      // Total order count.
      const count =
        typeof countData === "number"
          ? countData
          : Number(
              countData?.count ??
                countData?.total ??
                0
            );

      setTotal(Number.isFinite(count) ? count : 0);

      // Order details.
      const orderRows = Array.isArray(pageData)
        ? pageData
        : pageData?.content;

      if (!Array.isArray(orderRows)) {
        throw new Error(
          "Unexpected order details response format."
        );
      }

      setOrder(orderRows);

      const pages = Array.isArray(pageData)
        ? 1
        : Number(pageData?.totalPages ?? 1);

      setTotalPages(pages);

      // Daily order counts.
      const dailyRows = Array.isArray(dailyData)
        ? dailyData
        : dailyData?.data ??
          dailyData?.content ??
          dailyData?.dailyCounts;

      if (!Array.isArray(dailyRows)) {
        throw new Error(
          "Unexpected daily count response format."
        );
      }

      setDaily(
        dailyRows.map((item) => ({
          date: String(
            item.date ??
              item.day ??
              item.createdDate ??
              item.orderDate ??
              ""
          ),
          count: Number(
            item.count ??
              item.total ??
              item.orderCount ??
              0
          ),
        }))
      );
    } catch (err) {
      console.error("Dashboard error:", err);

      setError(
        err.message || "Unable to load dashboard."
      );
    } finally {
      setLoading(false);
    }
  }, [token, page]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // LOGOUT
  function handleLogout(message = "") {
  localStorage.removeItem("token");
  localStorage.removeItem("username");

  setToken(null);
  setUsername("");
  setPassword("");

  setOrder([]);
  setDaily([]);
  setTotal(0);
  setPage(0);
  setTotalPages(0);

  setError("");
  setLoginError(message);
}

  // LOGIN PAGE
  if (!token) {
    return (
      <div className="login-page">
        <form
          className="login-card"
          onSubmit={handleLogin}
        >
          <div className="login-icon">OM</div>

          <h1>Welcome Back</h1>

          <p className="login-subtitle">
            Sign in to your Order Management Dashboard
          </p>

          {loginError && (
            <div
              className="error-message"
              role="alert"
            >
              {loginError}
            </div>
          )}

          <label htmlFor="username">
            Username
          </label>

          <input
            id="username"
            type="text"
            placeholder="Enter your username"
            value={username}
            onChange={(event) =>
              setUsername(event.target.value)
            }
            autoComplete="username"
            required
          />

          <label htmlFor="password">
            Password
          </label>

          <input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) =>
              setPassword(event.target.value)
            }
            autoComplete="current-password"
            required
          />

          <button
            className="login-button"
            type="submit"
            disabled={loggingIn}
          >
            {loggingIn
              ? "Signing in..."
              : "Login"}
          </button>

          <p className="login-footer">
            Secure access with JWT authentication
          </p>
        </form>
      </div>
    );
  }

  // DASHBOARD PAGE
  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-heading">
          <h1>Order Management Dashboard</h1>

          <p>
            Monitor orders and daily order activity
          </p>
        </div>

        <div className="topbar-actions">
          {/* LOGGED-IN USER */}
          <div className="logged-in-user">
            <div className="user-avatar">
              {(
                username ||
                "U"
              ).charAt(0).toUpperCase()}
            </div>

            <div className="user-info">
              <span className="user-label">
                Logged in as
              </span>

              <strong>
                {username || "User"}
              </strong>
            </div>
          </div>

          <button
            className="refresh-button"
            onClick={loadDashboard}
            disabled={loading}
          >
            {loading ? "Loading..." : "Refresh"}
          </button>

          <button
            className="logout-button"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </header>

      {error && (
        <div
          className="error-message dashboard-error"
          role="alert"
        >
          <strong>Dashboard error</strong>
          <p>{error}</p>
        </div>
      )}

      <main>
        {/* SUMMARY CARDS */}
        <section className="summary-grid">
          <article className="summary-card">
            <p>Total Orders</p>
            <h2>{total}</h2>
            <span>All recorded orders</span>
          </article>

          <article className="summary-card">
            <p>Orders on This Page</p>
            <h2>{order.length}</h2>
            <span>Up to {PAGE_SIZE} orders</span>
          </article>

          <article className="summary-card">
            <p>Daily Records</p>
            <h2>{daily.length}</h2>
            <span>Days returned by the API</span>
          </article>
        </section>

        {/* DAILY ORDERS CHART */}
        <section className="panel">
          <h2>Daily Orders</h2>

          <p className="panel-subtitle">
            Order count by date
          </p>

          <div className="chart-container">
            {daily.length > 0 ? (
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart data={daily}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                  />

                  <XAxis dataKey="date" />

                  <YAxis allowDecimals={false} />

                  <Tooltip />

                  <Bar
                    dataKey="count"
                    name="Orders"
                    fill="#2563eb"
                    radius={[5, 5, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state">
                {loading
                  ? "Loading..."
                  : "No daily order data found."}
              </div>
            )}
          </div>
        </section>

        {/* ORDER DETAILS TABLE */}
        <section className="panel">
          <h2>Order Details</h2>

          <p className="panel-subtitle">
            Page {page + 1}
          </p>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Details</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Created At</th>
                </tr>
              </thead>

              <tbody>
                {order.map((orderItem, index) => (
                  <tr
                    key={
                      orderItem.id ??
                      orderItem.orderId ??
                      `${page}-${index}`
                    }
                  >
                    <td>
                      {orderItem.orderId ??
                        orderItem.id ??
                        "—"}
                    </td>

                    <td>
                      {orderItem.description ??
                        orderItem.productName ??
                        orderItem.customerName ??
                        "—"}
                    </td>

                    <td>
                      {orderItem.amount == null
                        ? "—"
                        : Number(
                            orderItem.amount
                          ).toLocaleString("en-IN", {
                            style: "currency",
                            currency: "INR",
                          })}
                    </td>

                    <td>
                      <span
                        className="status"
                      >
                        {orderItem.status ?? "—"}
                      </span>
                    </td>

                    <td>
                      {orderItem.createdAt
                        ? String(
                            orderItem.createdAt
                          ).replace("T", " ")
                        : "—"}
                    </td>
                  </tr>
                ))}

                {!loading && order.length === 0 && (
                  <tr>
                    <td
                      colSpan="5"
                      className="empty-table"
                    >
                      No orders found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          <div className="pagination">
            <button
              onClick={() =>
                setPage((current) =>
                  Math.max(0, current - 1)
                )
              }
              disabled={page === 0 || loading}
            >
              Previous
            </button>

            <span>
              Page {page + 1}
              {totalPages > 0
                ? ` of ${totalPages}`
                : ""}
            </span>

            <button
              onClick={() =>
                setPage((current) =>
                  Math.min(
                    totalPages - 1,
                    current + 1
                  )
                )
              }
              disabled={
                loading ||
                totalPages === 0 ||
                page >= totalPages - 1
              }
            >
              Next
            </button>
          </div>
        </section>
      </main>

      <footer>
        Order Management System
      </footer>
    </div>
  );
}