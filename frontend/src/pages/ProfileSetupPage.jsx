import { Camera, CheckCircle2, MapPin, Plus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/common/Button.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";
import { sportApi } from "../api/sportApi";
import { userApi } from "../api/userApi";
import { koreaRegions } from "../data/koreaRegions";

const levelOptions = [
  { value: "beginner", label: "입문" },
  { value: "intermediate", label: "중급" },
  { value: "advanced", label: "상급" }
];

const fallbackSportGroups = [
  { id: "ball", name: "구기 종목", sports: ["축구", "풋살", "농구", "배구", "야구", "족구"] },
  { id: "racket", name: "라켓 스포츠", sports: ["배드민턴", "탁구", "테니스", "스쿼시"] },
  { id: "outdoor", name: "러닝 / 야외", sports: ["러닝", "등산", "트래킹", "자전거", "산책"] },
  { id: "fitness", name: "피트니스", sports: ["헬스", "크로스핏", "클라이밍", "요가", "필라테스"] },
  { id: "etc", name: "기타", sports: ["볼링", "당구", "골프", "수영"] }
];

function formatPhoneNumber(value) {
  const digits = (value || "").replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

function text(value) {
  return value;
}

function splitSports(value) {
  return (value || "")
    .split(",")
    .map((sport) => sport.trim())
    .filter(Boolean);
}

function parsePreferredLevels(value) {
  if (!value) return {};
  if (typeof value === "object") return Object.keys(value).length ? value : {};
  try {
    const parsed = JSON.parse(value);
    return parsed && Object.keys(parsed).length ? parsed : {};
  } catch {
    return {};
  }
}

function hasBrokenText(value) {
  return !value || /\\u[0-9a-f]{4}|\ufffd|\?\?/.test(String(value));
}

function buildSportGroups(categories, sports) {
  if (!categories.length || !sports.length || categories.some((category) => hasBrokenText(category.name))) {
    return fallbackSportGroups;
  }

  const groups = categories
    .map((category) => ({
      id: String(category.id),
      name: category.name,
      sports: sports
        .filter((sport) => String(sport.category_id) === String(category.id))
        .map((sport) => sport.name)
        .filter((name) => !hasBrokenText(name))
    }))
    .filter((group) => group.sports.length);

  return groups.length ? groups : fallbackSportGroups;
}

function regionParts(regionName) {
  const parts = (regionName || "").split(" ").filter(Boolean);
  return {
    sido: parts[0] || "",
    area: parts[1] || "",
    district: parts.slice(2).join(" ")
  };
}

function joinRegion(sido, area, district) {
  return [sido, area, district].filter(Boolean).join(" ");
}

function tagLabel(user) {
  const rawTag = user?.user_tag || user?.user_tag_display || user?.nickname_with_tag?.match(/\[([^\]]+)\]/)?.[1] || "";
  const normalized = String(rawTag).replace(/^#/, "").replace(/^\[/, "").replace(/\]$/, "").trim();
  return normalized ? `#${normalized}` : "";
}

function ProfileSetupPage() {
  const navigate = useNavigate();
  const { user, setCurrentUser } = useAuth();
  const initialRegion = regionParts(user?.profile?.region);
  const initialLevels = parsePreferredLevels(user?.profile?.preferred_sport_levels);
  const initialSports = splitSports(user?.profile?.preferred_sports);

  const [form, setForm] = useState({
    name: user?.name || "",
    nickname: user?.nickname || "",
    phone_number: formatPhoneNumber(user?.phone_number || ""),
    profile_image_url: user?.profile_image_url || "",
    bio: user?.profile?.bio || "",
    region_sido: initialRegion.sido,
    region_area: initialRegion.area,
    region_district: initialRegion.district,
    region: user?.profile?.region || "",
    exercise_level: user?.profile?.exercise_level || initialLevels.all || "beginner",
    preferred_sports: initialSports,
    preferred_sport_levels: initialLevels
  });
  const [categories, setCategories] = useState([]);
  const [sports, setSports] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(fallbackSportGroups[0].id);
  const [selectedSport, setSelectedSport] = useState("");
  const [useSportLevels, setUseSportLevels] = useState(
    initialSports.some((sportName) => Boolean(initialLevels[sportName]))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([sportApi.categories(), sportApi.sports()])
      .then(([categoryData, sportData]) => {
        setCategories(categoryData.items || []);
        setSports(sportData.items || []);
      })
      .catch(() => {
        setCategories([]);
        setSports([]);
      });
  }, []);

  const sportGroups = useMemo(() => buildSportGroups(categories, sports), [categories, sports]);
  const activeSportGroup = sportGroups.find((group) => group.id === selectedCategoryId) || sportGroups[0];
  const selectedSido = koreaRegions.find((region) => region.name === form.region_sido);
  const availableAreas = selectedSido?.areas || [];
  const availableDistricts = selectedSido?.districts?.[form.region_area] || [];
  const selectedLevelLabel = levelOptions.find((level) => level.value === form.exercise_level)?.label || "입문";
  const displayTag = tagLabel(user);

  useEffect(() => {
    if (!sportGroups.some((group) => group.id === selectedCategoryId)) {
      setSelectedCategoryId(sportGroups[0]?.id || "");
      setSelectedSport("");
    }
  }, [sportGroups, selectedCategoryId]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateRegion = (sido, area = "", district = "") => {
    setForm((current) => ({
      ...current,
      region_sido: sido,
      region_area: area,
      region_district: district,
      region: joinRegion(sido, area, district)
    }));
  };

  const updateExerciseLevel = (level) => {
    setForm((current) => ({
      ...current,
      exercise_level: level,
      preferred_sport_levels: {
        ...current.preferred_sport_levels,
        all: level
      }
    }));
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

  const addSport = () => {
    if (!selectedSport) return;
    setForm((current) => {
      if (current.preferred_sports.includes(selectedSport)) return current;
      return {
        ...current,
        preferred_sports: [...current.preferred_sports, selectedSport],
        preferred_sport_levels: {
          ...current.preferred_sport_levels,
          [selectedSport]: current.preferred_sport_levels[selectedSport] || current.exercise_level
        }
      };
    });
    setSelectedSport("");
  };

  const removeSport = (sportName) => {
    setForm((current) => {
      const nextLevels = { ...current.preferred_sport_levels };
      delete nextLevels[sportName];
      return {
        ...current,
        preferred_sports: current.preferred_sports.filter((name) => name !== sportName),
        preferred_sport_levels: nextLevels
      };
    });
  };

  const attachProfileImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateField("profile_image_url", reader.result);
    reader.readAsDataURL(file);
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      const data = await userApi.updateMe({
        name: form.name.trim(),
        phone_number: formatPhoneNumber(form.phone_number),
        nickname: form.nickname.trim(),
        profile_image_url: form.profile_image_url,
        bio: form.bio.trim(),
        region: form.region,
        exercise_level: form.exercise_level,
        preferred_sports: form.preferred_sports.join(", "),
        preferred_sport_levels: useSportLevels
          ? { ...form.preferred_sport_levels, all: form.exercise_level }
          : { all: form.exercise_level }
      });
      setCurrentUser(data.user);
      navigate("/", { replace: true });
    } catch (submitError) {
      setError(submitError?.response?.data?.message || "프로필 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="profile-setup-page">
      <form className="profile-setup" onSubmit={submit}>
        <section className="profile-setup__intro">
          <div>
            <p className="profile-setup__eyebrow">{"추가 정보 입력"}</p>
            <h1>{"운동 메이트 추천을 위한 프로필을 완성해주세요"}</h1>
            <p>{"가입은 완료됐어요. 지역, 운동 수준, 선호 종목을 입력하면 더 정확한 추천을 받을 수 있습니다."}</p>
          </div>
          <div className="profile-setup__status">
            <CheckCircle2 size={18} />
            <span>{"Supabase Auth 연결됨"}</span>
          </div>
        </section>

        <section className="profile-setup__nickname-notice" aria-label="nickname notice">
          <strong>{"닉네임과 식별 태그가 설정됐어요"}</strong>
          <p>{"카카오톡으로 처음 로그인하면 카카오톡 닉네임을 기본으로 사용합니다. 사용자 식별은 자동으로 생성된 4자리 태그를 사용하고, 닉네임은 마이페이지에서 언제든 수정할 수 있습니다."}</p>
          {form.nickname ? <span>{"현재 닉네임"}: {form.nickname} {displayTag}</span> : null}
        </section>

        <section className="profile-setup__panel profile-setup__identity">
          <div className="profile-setup__avatar">
            <img src={form.profile_image_url || "/images/logo.png"} alt="profile preview" />
            <label className="profile-setup__avatar-button">
              <Camera size={18} />
              <span>{"사진 변경"}</span>
              <input type="file" accept="image/*" onChange={attachProfileImage} />
            </label>
          </div>
          <div className="profile-setup__fields">
            <label>
              <span>{"이름"}</span>
              <input value={form.name} onChange={(event) => updateField("name", event.target.value)} placeholder={text("표시 이름")} />
            </label>
            <label>
              <span>{"닉네임"}</span>
              <input value={form.nickname} onChange={(event) => updateField("nickname", event.target.value)} placeholder={text("모임에서 사용할 닉네임")} required />
            </label>
            <label>
              <span>{"휴대폰 번호"}</span>
              <input
                type="tel"
                inputMode="numeric"
                value={form.phone_number}
                onChange={(event) => updateField("phone_number", formatPhoneNumber(event.target.value))}
                placeholder="010-0000-0000"
                maxLength={13}
              />
            </label>
            <label className="profile-setup__wide-field">
              <span>{"한 줄 소개"}</span>
              <textarea value={form.bio} onChange={(event) => updateField("bio", event.target.value)} placeholder={text("예: 평일 저녁 러닝과 주말 풋살을 좋아해요.")} rows={3} />
            </label>
          </div>
        </section>

        <section className="profile-setup__panel profile-setup__grid-section">
          <div>
            <h2>{"활동 지역"}</h2>
            <p>{"주로 참여할 수 있는 지역을 단계별로 선택해주세요."}</p>
          </div>
          <div className="profile-setup__select-block">
            <div className="profile-setup__select-grid profile-setup__select-grid--region">
              <select value={form.region_sido} onChange={(event) => updateRegion(event.target.value)}>
                <option value="">{"시/도 선택"}</option>
                {koreaRegions.map((region) => <option key={region.name} value={region.name}>{region.name}</option>)}
              </select>
              <select value={form.region_area} onChange={(event) => updateRegion(form.region_sido, event.target.value)} disabled={!form.region_sido}>
                <option value="">{"시/군/구 선택"}</option>
                {availableAreas.map((area) => <option key={area} value={area}>{area}</option>)}
              </select>
              <select value={form.region_district} onChange={(event) => updateRegion(form.region_sido, form.region_area, event.target.value)} disabled={!availableDistricts.length}>
                <option value="">{"읍/면/동 선택"}</option>
                {availableDistricts.map((district) => <option key={district} value={district}>{district}</option>)}
              </select>
            </div>
            <div className="profile-setup__region-result"><MapPin size={16} />{form.region || text("지역 미선택")}</div>
          </div>
        </section>

        <section className="profile-setup__panel profile-setup__grid-section">
          <div>
            <h2>{"운동 프로필"}</h2>
            <p>{"전체 운동 수준은"} <strong>{selectedLevelLabel}</strong>{"으로 저장됩니다."}</p>
          </div>
          <div className="profile-setup__level-buttons">
            {levelOptions.map((level) => (
              <button key={level.value} type="button" className={form.exercise_level === level.value ? "is-active" : ""} onClick={() => updateExerciseLevel(level.value)}>
                {level.label}
              </button>
            ))}
          </div>
        </section>

        <section className="profile-setup__panel profile-setup__sports">
          <div className="profile-setup__section-head">
            <div>
              <h2>{"선호 종목"}</h2>
              <p>{"대주제를 고른 뒤 소주제를 추가해주세요. 여러 종목을 선택할 수 있어요."}</p>
            </div>
            <span>{form.preferred_sports.length}{"개 선택"}</span>
          </div>
          <div className="profile-setup__sport-dropdowns">
            <select value={selectedCategoryId} onChange={(event) => { setSelectedCategoryId(event.target.value); setSelectedSport(""); }}>
              {sportGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
            </select>
            <select value={selectedSport} onChange={(event) => setSelectedSport(event.target.value)}>
              <option value="">{"소주제 선택"}</option>
              {(activeSportGroup?.sports || []).map((sportName) => <option key={sportName} value={sportName}>{sportName}</option>)}
            </select>
            <button type="button" onClick={addSport} disabled={!selectedSport}>
              <Plus size={16} /> {"추가"}
            </button>
          </div>
          <label className="profile-setup__level-toggle">
            <input
              type="checkbox"
              checked={useSportLevels}
              onChange={(event) => setUseSportLevels(event.target.checked)}
            />
            <span>{"종목별 수준 선택하기"}</span>
          </label>
          {useSportLevels && form.preferred_sports.length > 0 ? (
            <div className="profile-setup__sport-levels">
              {form.preferred_sports.map((sportName) => (
                <label key={sportName}>
                  <span>{sportName}</span>
                  <select
                    value={form.preferred_sport_levels[sportName] || form.exercise_level}
                    onChange={(event) => updateSportLevel(sportName, event.target.value)}
                  >
                    {levelOptions.map((level) => (
                      <option key={level.value} value={level.value}>{level.label}</option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          ) : null}
          {form.preferred_sports.length > 0 ? (
            <div className="profile-setup__selected">
              {form.preferred_sports.map((sportName) => {
                const levelLabel = levelOptions.find((level) => level.value === form.preferred_sport_levels[sportName])?.label;
                return (
                  <button type="button" key={sportName} onClick={() => removeSport(sportName)}>
                    {useSportLevels && levelLabel ? `${sportName}:${levelLabel}` : sportName}
                    <X size={14} />
                  </button>
                );
              })}
            </div>
          ) : null}
        </section>

        {error ? <p className="profile-setup__error">{error}</p> : null}
        <div className="profile-setup__actions">
          <Button type="button" variant="ghost" onClick={() => navigate("/", { replace: true })}>{"나중에 하기"}</Button>
          <Button type="submit" disabled={saving || !form.nickname.trim()}>{saving ? text("저장 중...") : text("프로필 저장")}</Button>
        </div>
      </form>
    </main>
  );
}

export default ProfileSetupPage;
