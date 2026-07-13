import React from "react";
import { AppProvider, useApp } from "./contexts/AppContext";
import LoginPage from "./pages/LoginPage";
import MainPage from "./pages/MainPage";
import ErrorBoundary from "./components/ErrorBoundary";

function AppContent() {
  const { state, authLoading } = useApp();
  if (authLoading) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-primary)" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--text-primary)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontWeight: 900, fontSize: 20, color: "var(--bg-primary)" }}>D</div>
          <div style={{ width: 24, height: 24, border: "3px solid var(--border-color)", borderTopColor: "var(--text-primary)", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto" }} />
        </div>
      </div>
    );
  }
  return state.user ? <MainPage /> : <LoginPage />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ErrorBoundary>
  );
}
