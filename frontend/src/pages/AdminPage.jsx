import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  Users, 
  Trophy, 
  AlertTriangle, 
  MoreHorizontal, 
  ArrowUpRight,
  TrendingUp,
  User
} from "lucide-react";
import { adminApi } from "../api/adminApi";

// 1. Mock data based on the provided screenshot
const mockStats = {
  totalUsers: 1240,
  usersTrend: "+12명",
  totalMeetings: 452,
  meetingsTrend: "+34개 생성됨",
  pendingReports: 8,
  reportsTrend: "즉각적인 확인 요망"
};

const mockReports = [
  { id: 1, type: "욕설", target: "User_FC02", reporter: "킥마스터", date: "2023.10.27", status: "대기 중" },
  { id: 2, type: "노쇼", target: "러닝초보", reporter: "야간러너", date: "2023.10.26", status: "대기 중" },
  { id: 3, type: "기타", target: "스팸계정99", reporter: "농구조아", date: "2023.10.25", status: "처리 완료" },
  { id: 4, type: "욕설", target: "화난사람", reporter: "테니스킹", date: "2023.10.24", status: "처리 완료" }
];

const mockNewUsers = [
  { id: 1, name: "서지훈", time: "2시간 전", sport: "축구", emoji: "⚽", initial: "SJ" },
  { id: 2, name: "민경훈", time: "5시간 전", sport: "러닝", emoji: "🏃", initial: "MK" },
  { id: 3, name: "이지은", time: "1일 전", sport: "테니스", emoji: "🎾", useAvatar: true },
  { id: 4, name: "최현우", time: "1일 전", sport: "농구", emoji: "🏀", initial: "CH" }
];

function AdminPage() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    usersTrend: "+0명",
    totalMeetings: 0,
    meetingsTrend: "+0개",
    pendingReports: 0,
    reportsTrend: "대기 중인 신고 없음"
  });
  const [reports, setReports] = useState([]);
  const [newUsers, setNewUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch real data from backend API
  useEffect(() => {
    async function fetchAdminData() {
      try {
        setLoading(true);
        // Execute API calls in parallel
        const [usersRes, meetingsRes, reportsRes] = await Promise.allSettled([
          adminApi.users(),
          adminApi.meetings(),
          adminApi.reports()
        ]);

        const updatedStats = {
          totalUsers: 0,
          usersTrend: "+0명",
          totalMeetings: 0,
          meetingsTrend: "+0개",
          pendingReports: 0,
          reportsTrend: "대기 중인 신고 없음"
        };

        // 1. Process users count
        if (usersRes.status === "fulfilled" && usersRes.value?.items) {
          const apiUsers = usersRes.value.items;
          updatedStats.totalUsers = apiUsers.length;
          
          const now = new Date();
          const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const todayNewCount = apiUsers.filter(u => u.created_at && new Date(u.created_at) >= startOfToday).length;
          updatedStats.usersTrend = `오늘 +${todayNewCount}명`;

          const formattedUsers = apiUsers.slice(0, 4).map((u) => {
            let timeText = "방금 전";
            if (u.created_at) {
              const date = new Date(u.created_at);
              const diffMs = new Date() - date;
              const diffMins = Math.floor(diffMs / (1000 * 60));
              const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
              if (diffMins < 0) {
                timeText = "방금 전";
              } else if (diffMins < 60) {
                timeText = `${diffMins}분 전`;
              } else if (diffHours < 24) {
                timeText = `${diffHours}시간 전`;
              } else {
                timeText = `${Math.floor(diffHours / 24)}일 전`;
              }
            }

            const sportsList = u.profile?.preferred_sports 
              ? u.profile.preferred_sports.split(",")
              : [];
            const sportName = sportsList[0]?.trim() || "일반";
            
            const sportEmojis = {
              "축구": "⚽", "풋살": "⚽", "농구": "🏀", "배구": "🏐", "야구": "⚾",
              "배드민턴": "🏸", "탁구": "🏓", "테니스": "🎾", "스쿼시": "🏸",
              "러닝": "🏃", "등산": "⛰️", "클라이밍": "🧗", "요가": "🧘", "필라테스": "🧘"
            };
            const emoji = sportEmojis[sportName] || "👟";
            const initialName = u.nickname ? u.nickname.slice(0, 2) : "US";

            return {
              id: u.id,
              name: u.nickname || u.name,
              time: timeText,
              sport: sportName,
              emoji: emoji,
              initial: initialName
            };
          });

          setNewUsers(formattedUsers);
        }

        // 2. Process meetings count
        if (meetingsRes.status === "fulfilled" && meetingsRes.value?.items) {
          const apiMeetings = meetingsRes.value.items;
          updatedStats.totalMeetings = apiMeetings.length;
          
          const now = new Date();
          const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const todayMeetingsCount = apiMeetings.filter(m => m.created_at && new Date(m.created_at) >= startOfToday).length;
          updatedStats.meetingsTrend = `오늘 +${todayMeetingsCount}개`;
        }

        // 3. Process reports count and list
        if (reportsRes.status === "fulfilled" && reportsRes.value?.items) {
          const apiReports = reportsRes.value.items;
          const pendingCount = apiReports.filter(r => r.status === "대기 중" || r.status === "pending").length;
          updatedStats.pendingReports = pendingCount;
          updatedStats.reportsTrend = pendingCount > 0 ? "즉각 확인 요망" : "대기 중인 신고 없음";
          
          const formatted = apiReports.slice(0, 4).map((r, index) => ({
            id: r.id || index + 1,
            type: r.reason || "기타",
            target: r.target_name || r.target_type || `대상 #${r.target_id || ""}`,
            reporter: r.reporter_name || "신고자",
            date: r.created_at ? new Date(r.created_at).toLocaleDateString() : "2023.10.27",
            status: r.status === "pending" || r.status === "대기 중" ? "대기 중" : "처리 완료"
          }));
          
          setReports(formatted);
        } else {
          setReports([]);
        }

        setStats(updatedStats);
      } catch (err) {
        console.error("Failed to load real-time admin data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchAdminData();
  }, []);

  const handleAction = (reportId, currentStatus) => {
    if (currentStatus === "대기 중") {
      alert(`신고 번호 #${reportId} 처리를 시작합니다.`);
      // Optimistic update
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: "처리 완료" } : r));
    } else {
      alert(`신고 번호 #${reportId} 상세 내역을 조회합니다.`);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "400px", gap: "16px" }}>
        <style>{`
          @keyframes admin-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <div style={{
          width: "48px",
          height: "48px",
          border: "4px solid #f3f3f3",
          borderTop: "4px solid #3b82f6",
          borderRadius: "50%",
          animation: "admin-spin 1s linear infinite"
        }}></div>
        <span style={{ fontSize: "16px", color: "#64748b", fontWeight: 600 }}>대시보드 데이터를 불러오는 중...</span>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      {/* 1. Summary Widget Grid */}
      <section className="admin-stats-grid">
        {/* Card 1: Total Users */}
        <div className="admin-stat-card">
          <div className="admin-stat-card__main">
            <span className="admin-stat-card__title">전체 회원</span>
            <div className="admin-stat-card__value">
              {stats.totalUsers.toLocaleString()}
              <span className="admin-stat-card__unit">명</span>
            </div>
            <span className="admin-stat-card__trend admin-stat-card__trend--up">
              <TrendingUp size={12} />
              전일 대비 {stats.usersTrend}
            </span>
          </div>
          <div className="admin-stat-card__icon-box admin-stat-card__icon-box--blue">
            <Users size={22} />
          </div>
        </div>

        {/* Card 2: Total Meetings */}
        <div className="admin-stat-card">
          <div className="admin-stat-card__main">
            <span className="admin-stat-card__title">전체 모임</span>
            <div className="admin-stat-card__value">
              {stats.totalMeetings.toLocaleString()}
              <span className="admin-stat-card__unit">개</span>
            </div>
            <span className="admin-stat-card__trend admin-stat-card__trend--up">
              <TrendingUp size={12} />
              이번 주 {stats.meetingsTrend}
            </span>
          </div>
          <div className="admin-stat-card__icon-box admin-stat-card__icon-box--orange">
            <Trophy size={22} />
          </div>
        </div>

        {/* Card 3: Pending Reports */}
        <div className="admin-stat-card admin-stat-card--danger">
          <div className="admin-stat-card__main">
            <span className="admin-stat-card__title">대기 중인 신고</span>
            <div className="admin-stat-card__value">
              {stats.pendingReports}
              <span className="admin-stat-card__unit">건</span>
            </div>
            <span className="admin-stat-card__trend admin-stat-card__trend--danger">
              즉각적인 확인 요망
            </span>
          </div>
          <div className="admin-stat-card__icon-box admin-stat-card__icon-box--red">
            <AlertTriangle size={22} />
          </div>
        </div>
      </section>

      {/* 2. Main Analytics Columns */}
      <div className="admin-grid-cols">
        {/* Left Column: Recent Report list */}
        <section className="admin-panel-card">
          <div className="admin-panel-card__header">
            <h2 className="admin-panel-card__title">신고 관리 (최근)</h2>
            <Link to="/admin/reports" className="admin-panel-card__link">
              전체 보기 &gt;
            </Link>
          </div>
          <div className="admin-panel-card__body">
            <div className="admin-table-wrapper">
              <table className="admin-data-table">
                <thead>
                  <tr>
                    <th>유형</th>
                    <th>신고 대상</th>
                    <th>신고자</th>
                    <th>날짜</th>
                    <th>상태</th>
                    <th style={{ textAlign: "center" }}>액션</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => {
                    const isWaiting = report.status === "대기 중" || report.status === "pending";
                    const badgeType = 
                      report.type === "욕설" 
                        ? "red" 
                        : report.type === "노쇼" 
                          ? "orange" 
                          : "gray";

                    return (
                      <tr key={report.id}>
                        <td>
                          <span className={`admin-badge admin-badge--${badgeType}`}>
                            {report.type}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{report.target}</td>
                        <td>{report.reporter}</td>
                        <td style={{ color: "#64748b" }}>{report.date}</td>
                        <td>
                          <div className="admin-state-indicator">
                            <span className={`admin-state-indicator__dot admin-state-indicator__dot--${isWaiting ? "waiting" : "done"}`}></span>
                            <span className={`admin-state-indicator__text--${isWaiting ? "waiting" : "done"}`}>
                              {report.status}
                            </span>
                          </div>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            type="button"
                            onClick={() => handleAction(report.id, report.status)}
                            className={`admin-table-action-btn admin-table-action-btn--${isWaiting ? "primary" : "outline"}`}
                          >
                            {isWaiting ? "처리하기" : "상세 보기"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {reports.length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ textAlign: "center", color: "#94a3b8", padding: "30px" }}>
                        최근 접수된 신고 내역이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Right Column: Newly Joined Members */}
        <section className="admin-panel-card">
          <div className="admin-panel-card__header">
            <h2 className="admin-panel-card__title">최근 가입 회원</h2>
            <button type="button" className="admin-panel-card__more-btn" onClick={() => alert("더보기 메뉴는 준비 중입니다.")}>
              <MoreHorizontal size={18} />
            </button>
          </div>
          <div className="admin-panel-card__body">
            <div className="admin-users-list">
              {newUsers.map((userItem) => {
                const avatarClass = userItem.initial 
                  ? `admin-user-item__avatar--${userItem.initial.toLowerCase()}` 
                  : "admin-user-item__avatar--default";

                return (
                  <div className="admin-user-item" key={userItem.id}>
                    <div className="admin-user-item__info">
                      <div className={`admin-user-item__avatar ${avatarClass}`}>
                        {userItem.useAvatar ? (
                          <User size={18} />
                        ) : (
                          userItem.initial
                        )}
                      </div>
                      <div className="admin-user-item__detail">
                        <span className="admin-user-item__name">{userItem.name}</span>
                        <span className="admin-user-item__time">가입: {userItem.time}</span>
                      </div>
                    </div>
                    <div className="admin-user-item__tag">
                      <span>{userItem.emoji}</span>
                      <span>{userItem.sport}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="admin-panel-card__footer">
            <Link to="/admin/users" className="admin-panel-card__link">
              전체 회원 보기
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

export default AdminPage;
