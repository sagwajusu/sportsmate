import React, { useState, useEffect } from "react";
import MobileHeader from "../components/layout/mobile/MobileHeader.jsx";
import EmptyState from "../components/common/EmptyState.jsx";
import LoadingCards from "../components/common/LoadingCards.jsx";
import { userApi } from "../api/userApi";
import { useAsync } from "../hooks/useAsync";
import { useAuth } from "../contexts/AuthContext.jsx";
import { Star } from "lucide-react";

function MyReviewsPage() {
  const { user } = useAuth();
  const reviews = useAsync(() => userApi.myReviews(), []);

  // 받은 후기를 로컬스토리지에 저장하여 마이페이지 알림을 지워줌
  useEffect(() => {
    if (reviews.data && user) {
      const receivedCount = reviews.data.received?.length || 0;
      localStorage.setItem(`sportsmate_viewed_reviews_count_${user.id}`, String(receivedCount));
    }
  }, [reviews.data, user]);

  // 탭 상태 ("written" (디폴트), "received") - 전체보기("all") 제거!
  const [activeTab, setActiveTab] = useState("written");
  
  // 수정 중인 후기 상태 관리
  const [editingId, setEditingId] = useState(null);
  const [editRating, setEditRating] = useState(5);
  const [editContent, setEditContent] = useState("");
  const [savingId, setSavingId] = useState(null);

  // 날짜 포맷터
  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
  };

  // 평점 별점 표시 컴포넌트
  const RatingStars = ({ rating }) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          size={12}
          fill={i <= rating ? "#fbbf24" : "none"}
          color={i <= rating ? "#fbbf24" : "#cbd5e1"}
        />
      );
    }
    return <div className="mobile-review-card__rating">{stars}</div>;
  };

  // 수정 시작 핸들러
  const startEdit = (review) => {
    setEditingId(review.id);
    setEditRating(review.rating);
    setEditContent(review.content);
  };

  // 수정 취소 핸들러
  const cancelEdit = () => {
    setEditingId(null);
    setEditContent("");
  };

  // 수정 저장 핸들러
  const handleSave = async (id) => {
    if (!editContent.trim()) {
      alert("후기 내용을 입력해주세요.");
      return;
    }
    setSavingId(id);
    try {
      await userApi.updateReview(id, {
        rating: editRating,
        content: editContent.trim()
      });
      setEditingId(null);
      // 리스트 갱신
      reviews.execute();
    } catch (err) {
      alert(err?.response?.data?.message || "후기 수정에 실패했습니다.");
    } finally {
      setSavingId(null);
    }
  };

  // 후기 삭제 핸들러
  const handleDelete = async (id) => {
    if (!window.confirm("정말로 이 후기를 삭제하시겠습니까?")) {
      return;
    }
    try {
      await userApi.deleteReview(id);
      // 리스트 갱신
      reviews.execute();
    } catch (err) {
      alert(err?.response?.data?.message || "후기 삭제에 실패했습니다.");
    }
  };

  const getDisplayList = () => {
    if (!reviews.data) return [];
    if (activeTab === "written") return reviews.data.written || [];
    return reviews.data.received || [];
  };

  const currentList = getDisplayList();

  return (
    <>
      <MobileHeader title="내 후기" />
      
      {/* 탭 네비게이션 (내가 남긴 후기 | 받은 후기 1:1 레이아웃) */}
      <div className="mobile-reviews-tabs">
        <button
          type="button"
          className={`mobile-reviews-tab-btn ${activeTab === "written" ? "is-active" : ""}`}
          onClick={() => setActiveTab("written")}
        >
          내가 남긴 후기
        </button>
        <button
          type="button"
          className={`mobile-reviews-tab-btn ${activeTab === "received" ? "is-active" : ""}`}
          onClick={() => setActiveTab("received")}
        >
          받은 후기
        </button>
      </div>

      {reviews.loading ? (
        <div style={{ padding: "16px" }}>
          <LoadingCards count={3} />
        </div>
      ) : currentList.length > 0 ? (
        <div className="mobile-reviews-list">
          {currentList.map((review) => {
            const isMyWritten = user && review.reviewer?.id === user.id;
            const isEditing = editingId === review.id;
            
            // 나한테 남긴 받은 후기(isMyWritten이 거짓인 경우)는 작성자 정보 익명 처리!
            const reviewerName = isMyWritten 
              ? (review.reviewer?.nickname || review.reviewer?.name || "스포츠메이트") 
              : "익명 메이트";
            const reviewerAvatar = isMyWritten 
              ? (review.reviewer?.profile_image_url || "/images/logo.png") 
              : "/images/logo.png";

            // 구분 로직: 모임에 남긴 후기면 '모임'만 노출 | 유저에게 남긴거면 '유저'만 노출
            // meeting_title이 임시나 비어있지 않으면 '모임', 그렇지 않으면 '유저'로 판단
            const isUserReview = !review.meeting_title || review.meeting_title === "삭제된 모임" || review.meeting_title.includes("1:1");

            return (
              <article key={review.id} className="mobile-review-card">
                <div className="mobile-review-card__header">
                  <div className="mobile-review-card__user">
                    <img
                      src={reviewerAvatar}
                      alt="프로필"
                      className="mobile-review-card__avatar"
                    />
                    <div className="mobile-review-card__user-info">
                      <span className="mobile-review-card__nickname">
                        {reviewerName}
                      </span>
                      <span className="mobile-review-card__role-badge">
                        {isMyWritten ? "내가 작성한 후기" : "받은 후기"}
                      </span>
                    </div>
                  </div>
                  
                  {!isEditing && (
                    <div className="mobile-review-card__meta">
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <RatingStars rating={review.rating} />
                        <span className="mobile-review-card__rating-text">{review.rating}.0</span>
                      </div>
                      <span className="mobile-review-card__date">
                        {formatDate(review.created_at)}
                      </span>
                    </div>
                  )}
                </div>

                {/* 모임 / 유저 구분 렌더링 */}
                <div className="mobile-review-card__info-row">
                  {isUserReview ? (
                    <span className="mobile-review-card__info-item">
                      👤 <strong>구분:</strong> 유저 | <strong>대상 메이트:</strong> {review.meeting_host_nickname || "알 수 없음"}
                    </span>
                  ) : (
                    <span className="mobile-review-card__info-item">
                      📌 <strong>구분:</strong> 모임 | <strong>모임명:</strong> {review.meeting_title}
                    </span>
                  )}
                </div>

                {isEditing ? (
                  /* 수정 모드 */
                  <div className="mobile-review-edit-form">
                    <div className="mobile-review-edit-form__rating-row">
                      <span>평점 선택:</span>
                      <div className="mobile-review-edit-form__stars">
                        {[1, 2, 3, 4, 5].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setEditRating(num)}
                            aria-label={`평점 ${num}점`}
                          >
                            <Star
                              size={20}
                              fill={num <= editRating ? "#fbbf24" : "none"}
                              color={num <= editRating ? "#fbbf24" : "#cbd5e1"}
                            />
                          </button>
                        ))}
                      </div>
                      <strong style={{ color: "#fbbf24", marginLeft: "4px" }}>{editRating}.0점</strong>
                    </div>
                    
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      placeholder="후기 내용을 입력해주세요 (최대 100자)"
                      maxLength={100}
                    />
                    
                    <div className="mobile-review-card__actions">
                      <button
                        type="button"
                        className="mobile-review-card__action-btn"
                        onClick={() => handleSave(review.id)}
                        disabled={savingId === review.id}
                      >
                        {savingId === review.id ? "저장 중..." : "저장"}
                      </button>
                      <button
                        type="button"
                        className="mobile-review-card__action-btn"
                        onClick={cancelEdit}
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  /* 일반 모드 */
                  <>
                    <p className="mobile-review-card__content">{review.content}</p>
                    
                    {/* 내가 남긴 후기라면 수정/삭제 액션 버튼 노출 */}
                    {isMyWritten && (
                      <div className="mobile-review-card__actions">
                        <button
                          type="button"
                          className="mobile-review-card__action-btn"
                          onClick={() => startEdit(review)}
                        >
                          수정
                        </button>
                        <button
                          type="button"
                          className="mobile-review-card__action-btn is-delete"
                          onClick={() => handleDelete(review.id)}
                        >
                          삭제
                        </button>
                      </div>
                    )}
                  </>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title={
            activeTab === "received"
              ? "받은 후기가 아직 없습니다."
              : "작성한 후기가 아직 없습니다."
          }
          description="모임에 적극적으로 참여하고 메이트들과 평점/후기를 나눠보세요."
          actionLabel="모임 보러가기"
          actionTo="/meetings"
        />
      )}
    </>
  );
}

export default MyReviewsPage;
