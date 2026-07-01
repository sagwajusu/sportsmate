from datetime import datetime
from flask import Blueprint, jsonify

from app.models import Meeting, Report, User, Participant

admin_bp = Blueprint("admin", __name__)


@admin_bp.get("/users")
def users():
    return jsonify({"items": [user.to_dict() for user in User.query.order_by(User.created_at.desc()).all()]})


@admin_bp.get("/users/<int:user_id>")
def user_detail(user_id):
    user = User.query.get_or_404(user_id)
    
    now = datetime.utcnow()
    
    # Calculate meetings counts (only count completed ones)
    meetings_count = Meeting.query.filter(Meeting.host_id == user.id, Meeting.end_at < now).count()
    participant_count = Participant.query.join(Meeting).filter(
        Participant.user_id == user.id,
        Participant.status == "approved",
        Participant.role != "host",
        Meeting.end_at < now
    ).count()
    total_meetings = meetings_count + participant_count
    
    # Recent activities (completed meetings)
    joined_meetings = []
    participants = Participant.query.join(Meeting).filter(
        Participant.user_id == user.id,
        Participant.status == "approved",
        Meeting.end_at < now
    ).order_by(Meeting.end_at.desc()).limit(5).all()
    
    for p in participants:
        meeting = p.meeting
        if meeting:
            joined_meetings.append({
                "id": meeting.id,
                "title": meeting.title,
                "category": meeting.sport.name if meeting.sport else "기타",
                "time": meeting.start_at.strftime("%Y.%m.%d %H:%M") if meeting.start_at else "",
                "status": "참여완료"
            })
            
    # Reports
    reports_list = [
        {
            "id": r.id,
            "date": r.created_at.strftime("%Y.%m.%d") if r.created_at else "",
            "reason": r.reason
        }
        for r in Report.query.filter_by(target_type="user", target_id=user.id).all()
    ]
    
    res_data = user.to_dict()
    res_data["stats"] = {
        "meetingsCount": total_meetings,
        "attendanceRate": int(user.profile.attendance_rate) if user.profile else 0,
        "mannerScore": round(user.profile.rating_average, 1) if user.profile else 0.0,
        "reviewsCount": 0
    }
    res_data["activities"] = joined_meetings
    res_data["reports"] = reports_list
    return jsonify({"user": res_data})


@admin_bp.get("/meetings")
def meetings():
    return jsonify({"items": [meeting.to_dict() for meeting in Meeting.query.order_by(Meeting.created_at.desc()).all()]})


@admin_bp.get("/meetings/<int:meeting_id>")
def meeting_detail(meeting_id):
    meeting = Meeting.query.get_or_404(meeting_id)
    from app.models import Participant, Report
    participants = Participant.query.filter_by(meeting_id=meeting.id, status="approved").all()
    
    reports = [
        {
            "id": r.id,
            "date": r.created_at.strftime("%Y.%m.%d") if r.created_at else "",
            "reason": r.reason
        }
        for r in Report.query.filter_by(target_type="meeting", target_id=meeting.id).all()
    ]
    
    members_list = [
        {
            "id": p.user.id,
            "nickname": p.user.nickname or p.user.name or "알 수 없음",
            "role": "방장" if p.role == "host" else "멤버",
            "joinedAt": p.requested_at.strftime("%Y.%m.%d") if p.requested_at else "",
            "manner": f"{round(p.user.profile.rating_average, 1) if p.user.profile else 0.0} / 5.0"
        }
        for p in participants
    ]
    members_list.sort(key=lambda m: 0 if m["role"] == "방장" else 1)
    
    res_data = meeting.to_dict()
    res_data["members"] = members_list
    res_data["reports"] = reports
    return jsonify({"meeting": res_data})


@admin_bp.get("/reports")
def reports():
    return jsonify({
        "items": [
            {
                "id": item.id,
                "target_type": item.target_type,
                "target_id": item.target_id,
                "reason": item.reason,
                "status": item.status
            }
            for item in Report.query.order_by(Report.created_at.desc()).all()
        ]
    })
