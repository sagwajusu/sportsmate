import { Link, useNavigate } from "react-router-dom";
import { CalendarCheck, Dumbbell, Footprints, MapPin, MessageCircle, Pencil, Star, Trophy } from "lucide-react";
import MobileHeader from "../../layout/mobile/MobileHeader.jsx";
import Button from "../../common/Button.jsx";
import EmptyState from "../../common/EmptyState.jsx";
import { useAuth } from "../../../contexts/AuthContext.jsx";
import { userApi } from "../../../api/userApi";
import { useAsync } from "../../../hooks/useAsync";

const levelLabels = {
  beginner: "입문",
  intermediate: "중급",
  advanced: "상급"
};

function splitPreferredSports(value) {
  return (value || "")
    .split(",")
    .map((sport) => sport.trim())
    .filter(Boolean);
}

function formatAttendanceRate(value) {
  const rate = Number(value || 0);
  return rate > 0 ? `${Math.round(rate)}%` : "준비중";
}

function formatRating(value) {
  const rating = Number(value || 0);
  return rating > 0 ? rating.toFixed(1) : "신규";
}

function MobileMyPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const meetings = useAsync(() => (user ? userApi.myMeetings() : Promise.resolve({ hosted: [], joined: [], pending: [] })), [user?.id]);
  const reviews = useAsync(() => (user ? userApi.myReviews() : Promise.resolve({ items: [] })), [user?.id]);

  const profile = user?.profile || {};
  const preferredSports = splitPreferredSports(profile.preferred_sports);
  const hostedCount = meetings.data?.hosted?.length || 0;
  const joinedCount = meetings.data?.joined?.length || 0;
  const pendingCount = meetings.data?.pending?.length || 0;
  const reviewCount = reviews.data?.items?.length || 0;
  const exerciseLevel = levelLabels[profile.exercise_level] || "입문";

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  if (!user) {
    return (
      <>
        <MobileHeader title="내 정보" />
        <EmptyState
          title="로그인이 필요합니다."
          description="프로필과 참여 모임을 확인하려면 먼저 로그인해주세요."
          actionLabel="로그인"
          actionTo="/login"
        />
      </>
    );
  }

  return (
    <>
      <MobileHeader title="내 정보" />
      <section className="profile-card profile-card--stitch">
        <img src={user?.profile_image_url || "/images/logo.png"} alt="프로필" />
        <div>
          <strong>{user.nickname || user.name || "스포츠메이트"}</strong>
          <p>{exerciseLevel} · {profile.region || "활동 지역 미설정"}</p>
          {profile.bio ? <small>{profile.bio}</small> : null}
          <div className="profile-sport-tags" aria-label="선호 종목">
            {preferredSports.length ? preferredSports.slice(0, 4).map((sport) => (
              <span key={sport}><Dumbbell size={16} />{sport}</span>
            )) : (
              <span><Footprints size={16} />선호 종목 설정 전</span>
            )}
          </div>
        </div>
        <Link className="profile-edit-shortcut" to="/mypage/profile" aria-label="프로필 수정">
          <Pencil size={17} />
        </Link>
      </section>
      <div className="stats-grid">
        <span><Trophy size={18} /><small>참여 모임</small><strong>{joinedCount}회</strong></span>
        <span><CalendarCheck size={18} /><small>참여율</small><strong>{formatAttendanceRate(profile.attendance_rate)}</strong></span>
        <span><Star size={18} /><small>평점</small><strong>{formatRating(profile.rating_average)}</strong></span>
      </div>
      <section className="mobile-profile-summary" aria-label="활동 요약">
        <div>
          <MapPin size={18} />
          <span>활동 지역</span>
          <strong>{profile.region || "지역 미설정"}</strong>
        </div>
        <div>
          <MessageCircle size={18} />
          <span>후기</span>
          <strong>{reviews.loading ? "확인 중" : `${reviewCount}개`}</strong>
        </div>
        <div>
          <CalendarCheck size={18} />
          <span>승인 대기</span>
          <strong>{meetings.loading ? "확인 중" : `${pendingCount}건`}</strong>
        </div>
      </section>
      <div className="menu-list">
        <Link to="/mypage/profile">프로필 수정</Link>
        <Link to="/mypage/meetings">내가 만든 모임 <span>{hostedCount}</span></Link>
        <Link to="/mypage/meetings">참여 중인 모임 <span>{joinedCount}</span></Link>
        <Link to="/meetings">관심 모임</Link>
        <Link to="/mypage/reviews">내 후기 <span>{reviewCount}</span></Link>
        <Link to="/host">방장 관리</Link>
      </div>
      <Button variant="secondary" onClick={handleLogout}>로그아웃</Button>
    </>
  );
}

export default MobileMyPage;
