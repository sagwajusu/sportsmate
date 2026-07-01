import { useState } from "react";
import { useParams } from "react-router-dom";
import Button from "../components/common/Button.jsx";
import EmptyState from "../components/common/EmptyState.jsx";
import LoadingCards from "../components/common/LoadingCards.jsx";
import MobileHeader from "../components/layout/mobile/MobileHeader.jsx";
import { meetingApi } from "../api/meetingApi";
import { useAsync } from "../hooks/useAsync";

function HostAttendancePage() {
  const { meetingId } = useParams();
  const [refreshKey, setRefreshKey] = useState(0);
  const [checkingId, setCheckingId] = useState(null);
  const attendance = useAsync(() => meetingApi.attendance(meetingId), [meetingId, refreshKey]);
  const checkedIds = new Set((attendance.data?.items || []).map((item) => item.user.id));

  const checkParticipant = async (userId) => {
    setCheckingId(userId);
    try {
      await meetingApi.checkAttendance(meetingId, { user_id: userId });
      setRefreshKey((value) => value + 1);
    } finally {
      setCheckingId(null);
    }
  };

  return (
    <>
      <MobileHeader title="출석 관리" />
      {attendance.loading ? (
        <LoadingCards count={2} />
      ) : attendance.data?.approved_participants?.length ? (
        <div className="attendance-list">
          {(attendance.data?.approved_participants || []).map((participant) => (
            <article key={participant.id}>
              <div>
                <img src={participant.user.profile_image_url || "/images/logo.png"} alt="" />
                <strong>{participant.user.nickname}</strong>
              </div>
              <div className="attendance-list__control">
                <span className={checkedIds.has(participant.user.id) ? "checked" : ""}>{checkedIds.has(participant.user.id) ? "출석 완료" : "미출석"}</span>
                {!checkedIds.has(participant.user.id) && (
                  <Button type="button" onClick={() => checkParticipant(participant.user.id)} disabled={checkingId === participant.user.id}>
                    {checkingId === participant.user.id ? "처리 중" : "출석 체크"}
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="출석 대상이 없습니다." description="승인된 참여자가 생기면 출석 체크를 진행할 수 있습니다." />
      )}
    </>
  );
}

export default HostAttendancePage;
