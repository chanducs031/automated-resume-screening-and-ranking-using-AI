import { AuthProvider, useAuth } from "./context/AuthContext";
import AuthPage from "./pages/AuthPage";
import HRDashboard from "./pages/HRDashboard";
import ApplicantDashboard from "./pages/ApplicantDashboard";

function Router() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif", background: "#f8fafc" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 44, height: 44, border: "3px solid #e2e8f0", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 0.7s linear infinite", margin: "0 auto 12px" }} />
          <div style={{ color: "#6366f1", fontWeight: 600 }}>Loading HireAI...</div>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    );
  }

  if (!user) return <AuthPage />;
  if (user.role === "admin" || user.role === "hr") return <HRDashboard />;
  if (user.role === "applicant") return <ApplicantDashboard />;
  return <AuthPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <Router />
    </AuthProvider>
  );
}
