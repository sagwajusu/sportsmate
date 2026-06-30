import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MobileHeader from "../components/layout/mobile/MobileHeader.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";

function AuthCallbackPage() {
  const navigate = useNavigate();
  const { loading, isAuthenticated } = useAuth();
  const [message, setMessage] = useState("로그인 정보를 확인하고 있습니다.");

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      setMessage("로그인 세션을 확인하지 못했습니다. 다시 로그인해주세요.");
      const timer = window.setTimeout(() => navigate("/login", { replace: true }), 1200);
      return () => window.clearTimeout(timer);
    }

    const redirectPath = localStorage.getItem("sportsmate_post_auth_redirect") || "/";
    localStorage.removeItem("sportsmate_post_auth_redirect");
    sessionStorage.setItem("sportsmate_flash", "로그인하셨습니다.");
    navigate(redirectPath, { replace: true });
  }, [loading, isAuthenticated, navigate]);

  return (
    <>
      <MobileHeader title="소셜 로그인" />
      <section className="mobile-form auth-form auth-callback-panel">
        <strong>SportsMate</strong>
        <p>{message}</p>
      </section>
    </>
  );
}

export default AuthCallbackPage;
