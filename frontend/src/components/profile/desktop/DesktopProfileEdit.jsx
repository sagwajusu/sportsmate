import { Check, MapPin, Pencil, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { locationApi } from "../../../api/locationApi";
import { sportApi } from "../../../api/sportApi";
import { userApi } from "../../../api/userApi";
import { useAuth } from "../../../contexts/AuthContext";

const NICKNAME_MAX_LENGTH = 12;

const levelOptions = [
  { value: "beginner", label: "입문" },
  { value: "intermediate", label: "중급" },
  { value: "advanced", label: "상급" }
];

const fallbackSportCategories = [
  { id: "ball", name: "구기 종목", sports: ["축구", "풋살", "농구", "배구", "야구", "족구"] },
  { id: "racket", name: "라켓 스포츠", sports: ["배드민턴", "탁구", "테니스", "스쿼시"] },
  { id: "outdoor", name: "러닝 / 야외", sports: ["러닝", "등산", "트래킹", "자전거", "산책"] },
  { id: "fitness", name: "피트니스", sports: ["헬스", "크로스핏", "클라이밍", "요가", "필라테스"] },
  { id: "etc", name: "기타", sports: ["볼링", "댄스", "골프", "수영"] }
];

function mergeSportNames(baseSports, apiSports) {
  const names = new Set(baseSports);
  apiSports.forEach((sportName) => {
    if (sportName) names.add(sportName);
  });
  return Array.from(names);
}

function buildSportGroups(categories, sports) {
  if (!categories.length) return fallbackSportCategories;

  const apiGroups = categories.map((category) => ({
    id: category.id,
    name: category.name,
    sports: sports
      .filter((sport) => String(sport.category_id) === String(category.id))
      .map((sport) => sport.name)
  }));
  const apiGroupByName = new Map(apiGroups.map((group) => [group.name, group]));

  // 2026-07-01: API 응답 도착 후에도 관심 종목 탭 순서와 기본 24개 종목이 흔들리지 않도록 병합.
  const fixedGroups = fallbackSportCategories.map((fallbackGroup) => {
    const apiGroup = apiGroupByName.get(fallbackGroup.name);
    return {
      ...fallbackGroup,
      sports: mergeSportNames(fallbackGroup.sports, apiGroup?.sports || [])
    };
  });

  const extraGroups = apiGroups.filter(
    (apiGroup) => !fallbackSportCategories.some((fallbackGroup) => fallbackGroup.name === apiGroup.name)
  );

  return [...fixedGroups, ...extraGroups];
}

const emptyForm = {
  name: "",
  phone_number: "",
  nickname: "",
  email: "",
  profile_image_url: "",
  region: "",
  selected_regions: [],
  exercise_level: "beginner",
  preferred_sports: [],
  preferred_sport_levels: {}
};

function splitList(value) {
  return (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeLevels(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function tagLabel(user) {
  const rawTag = user?.user_tag || user?.user_tag_display || user?.nickname_with_tag?.match(/\[([^\]]+)\]/)?.[1] || "";
  const normalized = String(rawTag).replace(/^#/, "").replace(/^\[/, "").replace(/\]$/, "").trim();
  return normalized ? `#${normalized}` : "";
}

function buildFormFromUser(user) {
  const profile = user?.profile || {};
  const selectedRegions = splitList(profile.region);
  const preferredSports = splitList(profile.preferred_sports);
  const levels = normalizeLevels(profile.preferred_sport_levels);

  return {
    name: user?.name || "",
    phone_number: user?.phone_number || "",
    nickname: (user?.nickname || "").slice(0, NICKNAME_MAX_LENGTH),
    email: user?.email || "",
    profile_image_url: user?.profile_image_url || "",
    region: profile.region || "",
    selected_regions: selectedRegions,
    exercise_level: profile.exercise_level || levels.all || "beginner",
    preferred_sports: preferredSports,
    preferred_sport_levels: levels
  };
}

function DesktopProfileEdit() {
  const navigate = useNavigate();
  const { user, backendTokenReady, setCurrentUser } = useAuth();
  const [form, setForm] = useState(() => (user ? buildFormFromUser(user) : emptyForm));
  const [loadedUser, setLoadedUser] = useState(user);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);

  const [categories, setCategories] = useState([]);
  const [sports, setSports] = useState([]);
  const [activeCategoryId, setActiveCategoryId] = useState(fallbackSportCategories[0].id);
  const [showMapPreview, setShowMapPreview] = useState(false);

  const [regionQuery, setRegionQuery] = useState("");
  const [regionResults, setRegionResults] = useState([]);
  const [regionSearching, setRegionSearching] = useState(false);
  const [regionMessage, setRegionMessage] = useState("");

  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: "", next: "", confirm: "" });
  const [passwordStatus, setPasswordStatus] = useState("idle");
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [withdrawText, setWithdrawText] = useState("");
  const [withdrawStatus, setWithdrawStatus] = useState("idle");
  const profileLoadedRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    if (!backendTokenReady) {
      // 2026-07-01: 백엔드 토큰 준비 전 users/me 호출로 발생하던 401 표시를 방지.
      profileLoadedRef.current = false;
      setLoading(false);
      setLoadError("");
      return () => {
        mounted = false;
      };
    }

    if (profileLoadedRef.current) {
      setLoading(false);
      return () => {
        mounted = false;
      };
    }

    // 2026-07-01: 프로필 수정 진입 시 최초 1회만 최신 내 정보로 폼을 채우고, 편집 중 값은 덮어쓰지 않음.
    profileLoadedRef.current = true;
    setLoading(true);
    setLoadError("");
    userApi.me()
      .then((data) => {
        if (!mounted) return;
        setLoadedUser(data.user);
        setCurrentUser?.(data.user);
        setForm(buildFormFromUser(data.user));
      })
      .catch((error) => {
        if (!mounted) return;
        profileLoadedRef.current = false;
        setLoadError(error?.response?.data?.message || "프로필 정보를 불러오지 못했습니다.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [backendTokenReady, setCurrentUser]);

  useEffect(() => {
    Promise.all([sportApi.categories(), sportApi.sports()])
      .then(([categoryData, sportData]) => {
        const nextCategories = categoryData.items || [];
        setCategories(nextCategories);
        setSports(sportData.items || []);
      })
      .catch(() => {
        setCategories([]);
        setSports([]);
      });
  }, []);

  const sportCategoryGroups = useMemo(() => buildSportGroups(categories, sports), [categories, sports]);

  const activeSportGroup = sportCategoryGroups.find((group) => String(group.id) === String(activeCategoryId)) || sportCategoryGroups[0];
  const displayTag = tagLabel(loadedUser);
  const savedIntro = loadedUser?.profile?.bio || "아직 한 줄 소개가 없습니다.";
  const pendingRegion = regionQuery || form.selected_regions[0] || "선호 지역";

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const updateNickname = (value) => {
    update("nickname", value.slice(0, NICKNAME_MAX_LENGTH));
  };

  const addRegion = (regionName) => {
    const nextRegion = regionName.trim();
    if (!nextRegion) return;

    setForm((current) => {
      const nextRegions = current.selected_regions.includes(nextRegion)
        ? current.selected_regions
        : [...current.selected_regions, nextRegion];
      return {
        ...current,
        region: nextRegions.join(", "),
        selected_regions: nextRegions
      };
    });
    setRegionQuery("");
    setRegionResults([]);
    setRegionMessage("");
  };

  const removeRegion = (regionName) => {
    setForm((current) => {
      const nextRegions = current.selected_regions.filter((region) => region !== regionName);
      return {
        ...current,
        region: nextRegions.join(", "),
        selected_regions: nextRegions
      };
    });
  };

  const searchRegion = async () => {
    const keyword = regionQuery.trim();
    setRegionMessage("");
    if (!keyword) {
      setRegionResults([]);
      setRegionMessage("검색할 지역이나 장소를 입력해주세요.");
      return;
    }

    setRegionSearching(true);
    try {
      const data = await locationApi.searchPlaces({ keyword, size: 8 });
      const items = data.items || [];
      const nextResults = items
        .map((item) => item.address || item.title || "")
        .filter(Boolean);
      setRegionResults(nextResults.length ? nextResults : [keyword]);
      if (!nextResults.length) setRegionMessage("검색 결과가 없어 입력한 문구를 그대로 추가할 수 있습니다.");
    } catch {
      setRegionResults([keyword]);
      setRegionMessage("주소 검색 API에 연결할 수 없어 입력한 문구를 그대로 추가할 수 있습니다.");
    } finally {
      setRegionSearching(false);
    }
  };

  const toggleSport = (sportName) => {
    setForm((current) => {
      const exists = current.preferred_sports.includes(sportName);
      const nextSports = exists
        ? current.preferred_sports.filter((name) => name !== sportName)
        : [...current.preferred_sports, sportName];
      const nextLevels = { ...current.preferred_sport_levels };

      if (exists) {
        delete nextLevels[sportName];
      } else {
        nextLevels[sportName] = nextLevels[sportName] || current.exercise_level;
      }

      return { ...current, preferred_sports: nextSports, preferred_sport_levels: nextLevels };
    });
  };

  const updateSportLevel = (sportName, level) => {
    setForm((current) => ({
      ...current,
      preferred_sport_levels: {
        ...current.preferred_sport_levels,
        [sportName]: level
      }
    }));
  };

  const updatePassword = (key, value) => {
    setPasswordStatus("idle");
    setPasswordForm((current) => ({ ...current, [key]: value }));
  };

  const submitPasswordChange = () => {
    if (!passwordForm.current || !passwordForm.next || !passwordForm.confirm) {
      setPasswordStatus("empty");
      return;
    }
    if (passwordForm.next !== passwordForm.confirm) {
      setPasswordStatus("mismatch");
      return;
    }
    setPasswordStatus("success");
  };

  const submitWithdraw = () => {
    if (withdrawText.trim() !== "탈퇴합니다") {
      setWithdrawStatus("mismatch");
      return;
    }
    setWithdrawStatus("success");
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaveError("");

    if (!loadedUser) {
      navigate("/mypage");
      return;
    }

    if (!backendTokenReady) {
      setSaveError("로그인 동기화가 완료된 뒤 다시 시도해주세요.");
      return;
    }

    setSaving(true);
    try {
      // 2026-07-01: PC 프로필 수정 저장을 백엔드 users/me PATCH와 연결.
      const data = await userApi.updateMe({
        name: form.name,
        nickname: form.nickname.trim(),
        profile_image_url: form.profile_image_url,
        region: form.region,
        exercise_level: form.exercise_level,
        preferred_sports: form.preferred_sports.join(", "),
        preferred_sport_levels: {
          ...form.preferred_sport_levels,
          all: form.exercise_level
        }
      });
      setCurrentUser?.(data.user);
      navigate("/mypage");
    } catch (error) {
      setSaveError(error?.response?.data?.message || "프로필 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="desktop-profile-edit" onSubmit={submit}>
      <div className="screen-title desktop-profile-edit__title">
        <div>
          <h1>프로필 수정</h1>
          <span>내 정보에 표시할 기본 정보와 운동 성향을 정리합니다.</span>
        </div>
        <div>
          <Link className="ghost-btn" to="/mypage">취소</Link>
          <button className="primary-small" type="submit" disabled={saving || loading}>
            <Check size={15} />{saving ? "저장 중" : "저장"}
          </button>
        </div>
      </div>

      {loadError && <p className="profile-setup__error">{loadError}</p>}
      {saveError && <p className="profile-setup__error">{saveError}</p>}

      <section className="page-card desktop-profile-top-card">
        <div className="section-head">
          <h2>기본 정보</h2>
        </div>
        <div className="desktop-profile-top-content">
          <div className="desktop-profile-preview">
            <img src={form.profile_image_url || "/images/logo.png"} alt="프로필 미리보기" />
            <h2>{form.nickname || "닉네임"}</h2>
            {displayTag && <span className="profile-user-tag desktop-profile-preview-tag">{displayTag}</span>}
            <p>{savedIntro}</p>
          </div>

          <div className="desktop-profile-basic-panel">
            <div className="desktop-profile-form-grid desktop-basic-info-grid">
              <label>
                이름
                <div className="desktop-basic-action-row">
                  <span className="desktop-readonly-field">{form.name || "미입력"}</span>
                  <span aria-hidden="true" />
                </div>
              </label>
              <label>
                이메일
                <div className="desktop-basic-action-row">
                  <span className="desktop-readonly-field">{form.email || "미입력"}</span>
                  <span aria-hidden="true" />
                </div>
              </label>
              <div className="desktop-nickname-tag-row">
                <label>
                  닉네임
                  <span className="desktop-edit-input desktop-edit-input--counted">
                    <input maxLength={NICKNAME_MAX_LENGTH} value={form.nickname} onChange={(event) => updateNickname(event.target.value)} />
                    <em>{form.nickname.length}/{NICKNAME_MAX_LENGTH}</em>
                    <Pencil size={15} />
                  </span>
                </label>
                <label>
                  고유 태그
                  {/* 2026-07-01: 고유 태그는 닉네임 식별 보조 정보라 닉네임 옆의 읽기 전용 필드로 표시. */}
                  <span className="desktop-nickname-tag">{displayTag || "태그 없음"}</span>
                </label>
              </div>
              <label>
                핸드폰 번호
                <div className="desktop-basic-action-row">
                  {/* 2026-07-01: 휴대폰 인증 정책 확정 전까지 번호는 읽기 전용으로만 표시. */}
                  <span className="desktop-readonly-field">{form.phone_number || "미입력"}</span>
                  <span aria-hidden="true" />
                </div>
              </label>
            </div>
          </div>
        </div>
      </section>

      <section className="page-card desktop-profile-edit-panel">
        <div className="section-head">
          <h2>선호 지역</h2>
        </div>
        <div className="desktop-region-picker">
          <label className="desktop-region-search-field">
            장소 또는 주소 검색
            <span className="desktop-region-search-box">
              <Search size={16} />
              <input
                value={regionQuery}
                placeholder="운동하고 싶은 지역이나 장소를 검색해보세요"
                onChange={(event) => setRegionQuery(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && (event.preventDefault(), searchRegion())}
              />
            </span>
          </label>
          <button className="primary-small" type="button" onClick={searchRegion} disabled={regionSearching}>
            {regionSearching ? "검색 중" : "검색"}
          </button>
          <button className="desktop-map-toggle" type="button" onClick={() => setShowMapPreview((current) => !current)}>
            <MapPin size={14} />
            {showMapPreview ? "지도 접기" : "지도에서 선택"}
          </button>
        </div>
        {regionMessage && <em className="nickname-check warn">{regionMessage}</em>}
        {regionResults.length > 0 && (
          <div className="desktop-region-results">
            {regionResults.map((regionName) => (
              <button key={regionName} type="button" onClick={() => addRegion(regionName)}>
                <MapPin size={14} />
                {regionName}
              </button>
            ))}
          </div>
        )}
        <div className="desktop-region-selected">
          {form.selected_regions.length ? form.selected_regions.map((regionName) => (
            <button key={regionName} type="button" onClick={() => removeRegion(regionName)}>
              {regionName}
              <X size={14} />
            </button>
          )) : <span>선택한 지역이 없습니다.</span>}
        </div>
        {showMapPreview && (
          <div className="desktop-profile-map-preview">
            <div className="map-current-label"><MapPin size={15} />{pendingRegion} 기준</div>
            <div className="map-pin p1"><MapPin size={19} /></div>
            <div className="map-pin p2"><MapPin size={19} /></div>
            <div className="map-pin p3"><MapPin size={19} /></div>
            <div className="map-center" />
          </div>
        )}
      </section>

      <section className="page-card desktop-profile-edit-panel">
        <div className="section-head">
          <h2>운동 설정</h2>
        </div>
        <div className="desktop-profile-form-grid desktop-level-grid">
          <label>
            기본 운동 수준
            <select value={form.exercise_level} onChange={(event) => update("exercise_level", event.target.value)}>
              {levelOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="desktop-profile-sport-section">
          <span className="desktop-subsection-title">관심 종목</span>
          <div className="desktop-sport-category-tabs">
            {sportCategoryGroups.map((group) => (
              <button
                key={group.id}
                className={String(activeSportGroup?.id) === String(group.id) ? "is-active" : ""}
                type="button"
                onClick={() => setActiveCategoryId(group.id)}
              >
                {group.name}
              </button>
            ))}
          </div>
          <div className="desktop-profile-sport-grid">
            {(activeSportGroup?.sports || []).map((sportName) => (
              <button
                key={sportName}
                className={form.preferred_sports.includes(sportName) ? "is-active" : ""}
                type="button"
                onClick={() => toggleSport(sportName)}
              >
                {sportName}
              </button>
            ))}
          </div>
        </div>
        {form.preferred_sports.length > 0 && (
          <>
            <span className="desktop-subsection-title">선택한 종목별 수준</span>
            <div className="desktop-profile-selected-sports">
              {form.preferred_sports.map((sportName) => (
                <div key={sportName}>
                  <button type="button" onClick={() => toggleSport(sportName)}>
                    {sportName}
                    <X size={14} />
                  </button>
                  <select
                    aria-label={`${sportName} 운동 수준`}
                    value={form.preferred_sport_levels[sportName] || form.exercise_level}
                    onChange={(event) => updateSportLevel(sportName, event.target.value)}
                  >
                    {levelOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="page-card desktop-profile-edit-panel desktop-account-security-panel">
        <div className="section-head">
          <h2>계정 보안</h2>
        </div>
        <div className="desktop-security-section">
          <span>
            <strong>비밀번호</strong>
            <small>비밀번호 변경은 백엔드 API 연결 후 사용할 수 있습니다.</small>
          </span>
          <button type="button" onClick={() => setPasswordModalOpen(true)}>비밀번호 변경</button>
        </div>
        <div className="desktop-security-section desktop-security-section--danger">
          <span>
            <strong>회원 탈퇴</strong>
            <small>회원 탈퇴는 백엔드 API 연결 후 처리됩니다.</small>
          </span>
          <button type="button" onClick={() => setWithdrawModalOpen(true)}>회원 탈퇴</button>
        </div>
      </section>

      {passwordModalOpen && (
        <div className="profile-auth-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setPasswordModalOpen(false)}>
          <section className="profile-auth-modal password-change-modal">
            <button className="schedule-modal-close" type="button" onClick={() => setPasswordModalOpen(false)}><X size={18} /></button>
            <h2>비밀번호 변경</h2>
            <p>현재는 화면 흐름만 확인할 수 있습니다. 백엔드 API가 추가되면 실제 변경으로 연결됩니다.</p>
            <label>
              현재 비밀번호
              <input type="password" value={passwordForm.current} onChange={(event) => updatePassword("current", event.target.value)} />
            </label>
            <label>
              새 비밀번호
              <input type="password" value={passwordForm.next} onChange={(event) => updatePassword("next", event.target.value)} />
            </label>
            <label>
              새 비밀번호 확인
              <input type="password" value={passwordForm.confirm} onChange={(event) => updatePassword("confirm", event.target.value)} />
            </label>
            {passwordStatus === "empty" && <em className="nickname-check warn">모든 비밀번호 항목을 입력해주세요.</em>}
            {passwordStatus === "mismatch" && <em className="nickname-check warn">새 비밀번호가 일치하지 않습니다.</em>}
            {passwordStatus === "success" && <em className="nickname-check ok">비밀번호 변경 흐름이 확인되었습니다.</em>}
            <div>
              <button className="ghost-btn" type="button" onClick={() => setPasswordModalOpen(false)}>취소</button>
              <button className="primary-small" type="button" onClick={submitPasswordChange}>변경하기</button>
            </div>
          </section>
        </div>
      )}

      {withdrawModalOpen && (
        <div className="profile-auth-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setWithdrawModalOpen(false)}>
          <section className="profile-auth-modal password-change-modal">
            <button className="schedule-modal-close" type="button" onClick={() => setWithdrawModalOpen(false)}><X size={18} /></button>
            <h2>회원 탈퇴</h2>
            <p>회원 탈퇴는 아직 백엔드 API가 없어 화면 흐름만 확인할 수 있습니다.</p>
            <label>
              확인 문구
              <input
                value={withdrawText}
                placeholder="탈퇴합니다"
                onChange={(event) => {
                  setWithdrawText(event.target.value);
                  setWithdrawStatus("idle");
                }}
              />
            </label>
            {withdrawStatus === "mismatch" && <em className="nickname-check warn">확인 문구를 정확히 입력해주세요.</em>}
            {withdrawStatus === "success" && <em className="nickname-check ok">회원 탈퇴 확인 흐름이 완료되었습니다.</em>}
            <div>
              <button className="ghost-btn" type="button" onClick={() => setWithdrawModalOpen(false)}>취소</button>
              <button className="primary-small danger-small" type="button" onClick={submitWithdraw}>탈퇴 확인</button>
            </div>
          </section>
        </div>
      )}
    </form>
  );
}

export default DesktopProfileEdit;
