
import { BrowserRouter, Navigate, Route, Routes, Link } from "react-router-dom";
import App from "./App";
import Register from "./components/Register";
import CreateOrder from "./components/CreateOrder";

function LoginRequired({ children }) {
  return localStorage.getItem("token")
    ? children
    : <Navigate to="/login" replace />;
}

function LoginRedirect() {
  return localStorage.getItem("token")
    ? <Navigate to="/dashboard" replace />
    : <Navigate to="/login" replace />;
}

function LoginPage() {
  // Reuse your existing App.jsx login/dashboard component.
  // It already renders login when there is no token.
  return <App />;
}

function Navigation() {
  return (
    <nav style={{ display: "flex", gap: 20, padding: 16 }}>
      <Link to="/dashboard">Dashboard</Link>
      <Link to="/orders/create">Create Order</Link>
      <Link to="/register">Register</Link>
    </nav>
  );
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Navigation />
      <Routes>
        <Route path="/" element={<LoginRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/orders/create"
          element={
            <LoginRequired>
              <CreateOrder />
            </LoginRequired>
          }
        />
        <Route
          path="/dashboard"
          element={
            <LoginRequired>
              <App />
            </LoginRequired>
          }
        />
        <Route path="*" element={<LoginRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}