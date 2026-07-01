import { Send, UsersRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import MobileHeader from "../../layout/mobile/MobileHeader.jsx";
import LoadingCards from "../../common/LoadingCards.jsx";
import EmptyState from "../../common/EmptyState.jsx";
import { chatApi } from "../../../api/chatApi";
import { useAsync } from "../../../hooks/useAsync";
import { useAuth } from "../../../contexts/AuthContext.jsx";
import { isSupabaseConfigured, supabase } from "../../../api/supabaseClient";

function formatMessageTime(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function MobileChatRoom() {
  const { chatRoomId } = useParams();
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const bottomRef = useRef(null);
  const messages = useAsync(() => chatApi.messages(chatRoomId), [chatRoomId, refreshKey]);
  const room = messages.data?.room;
  const meeting = room?.meeting;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.data?.items?.length]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.hidden || sending || realtimeConnected) return;
      setRefreshKey((value) => value + 1);
    }, 1500);
    return () => window.clearInterval(timer);
  }, [realtimeConnected, sending]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !chatRoomId) {
      setRealtimeConnected(false);
      return undefined;
    }

    const channel = supabase
      .channel(`mobile-chat-room-${chatRoomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `chat_room_id=eq.${chatRoomId}`
        },
        () => setRefreshKey((value) => value + 1)
      )
      .subscribe((status) => {
        setRealtimeConnected(status === "SUBSCRIBED");
      });

    return () => {
      setRealtimeConnected(false);
      supabase.removeChannel(channel);
    };
  }, [chatRoomId]);

  const send = async (event) => {
    event.preventDefault();
    if (!content.trim()) return;
    setError("");
    setSending(true);
    try {
      await chatApi.send(chatRoomId, { content: content.trim() });
      setContent("");
      setRefreshKey((value) => value + 1);
    } catch (sendError) {
      setError(sendError.response?.data?.message || "메시지 전송에 실패했습니다.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <MobileHeader title={meeting?.title || "채팅방"} />
      {messages.loading && !messages.data ? (
        <LoadingCards count={3} />
      ) : messages.error ? (
        <EmptyState title="채팅방을 불러오지 못했습니다." description="참여 승인 상태를 확인하거나 잠시 후 다시 시도해주세요." actionLabel="채팅 목록" actionTo="/chats" />
      ) : (
        <>
          <section className="chat-room-summary">
            <div className="chat-room-summary__thumb" style={meeting?.cover_image_url ? { backgroundImage: `url(${meeting.cover_image_url})` } : undefined}>
              {!meeting?.cover_image_url && <span>{meeting?.sport?.name || "운동"}</span>}
            </div>
            <div>
              <strong>{meeting?.title}</strong>
              <p>{meeting?.location_name} · {meeting?.current_participants}/{meeting?.max_participants}명</p>
            </div>
            {meeting?.id && <Link to={`/meetings/${meeting.id}`}>상세</Link>}
          </section>
          <div className="message-list">
            <div className="message-day-divider">오늘</div>
            {(messages.data?.items || []).length ? (
              (messages.data?.items || []).map((message) => {
                const mine = message.user_id === user?.id;
                return (
                  <div key={message.id} className={`message-row ${mine ? "mine" : ""}`}>
                    {!mine && (
                      <div className="message-avatar">
                        {message.sender?.profile_image_url ? <img src={message.sender.profile_image_url} alt="" /> : <UsersRound size={16} />}
                      </div>
                    )}
                    <div className={`message-bubble ${mine ? "mine" : ""}`}>
                      {!mine && <span>{message.sender?.nickname || "참여자"}</span>}
                      <p>{message.content}</p>
                      <time>{formatMessageTime(message.created_at)}</time>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="message-empty">
                <strong>아직 대화가 없습니다.</strong>
                <p>오늘 모임 준비 이야기를 먼저 시작해보세요.</p>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </>
      )}
      <form className="chat-input" onSubmit={send}>
        {error ? <p className="chat-input__error">{error}</p> : null}
        <input value={content} onChange={(event) => setContent(event.target.value)} placeholder="메시지를 입력하세요" />
        <button type="submit" aria-label="메시지 전송" disabled={sending || !content.trim()}>
          <Send size={20} />
        </button>
      </form>
    </>
  );
}

export default MobileChatRoom;
