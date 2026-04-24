import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth, loadGoogleScript, GOOGLE_CLIENT_ID } from "../context/AuthContext";
import { api } from "../api/client";
import {
  User, Mail, Lock, Phone, Eye, EyeOff, MapPin, Briefcase,
  Camera, X, Star, ChevronRight, ChevronLeft, Check, ArrowRight,
  ShieldCheck, RefreshCw,
} from "lucide-react";
import PhoneCollageBg from "../components/PhoneCollageBg";
import BrandLogo from "../components/BrandLogo";
import { COUNTRIES, INDIA_STATES, INDIA_STATE_NAMES } from "../data/locations";

const TOTAL_STEPS = 7;

const RELATIONSHIP_GOALS = [
  { value: "long_term", label: "Long-term relationship", emoji: "💑" },
  { value: "short_term", label: "Short-term / Casual", emoji: "✨" },
  { value: "marriage", label: "Marriage", emoji: "💍" },
  { value: "friendship", label: "Friendship first", emoji: "🤝" },
  { value: "casual", label: "Just exploring", emoji: "🌟" },
  { value: "unsure", label: "Not sure yet", emoji: "🤔" },
];

const GENDERS = [
  { value: "male", label: "Man" },
  { value: "female", label: "Woman" },
  { value: "non_binary", label: "Non-binary" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

const EDUCATION_LEVELS = [
  { value: "less_than_high_school", label: "Less than high school" },
  { value: "high_school",           label: "High school" },
  { value: "some_college",          label: "Some college" },
  { value: "associates",            label: "Associate degree" },
  { value: "diploma",               label: "Diploma / Certificate" },
  { value: "trade_school",          label: "Trade / Vocational school" },
  { value: "bachelors",             label: "Bachelor's degree" },
  { value: "postgraduate_diploma",  label: "Postgraduate diploma" },
  { value: "masters",               label: "Master's degree" },
  { value: "professional",          label: "Professional (MD / JD / MBA / CA)" },
  { value: "phd",                   label: "PhD / Doctorate" },
  { value: "postdoc",               label: "Postdoctoral" },
  { value: "other",                 label: "Other" },
];

// Broad list covering the world's major traditions + non-religious options.
// Free-form is preserved by the backend (stored as TEXT) so we allow custom
// entries via the "Other" option and a small input fallback when picked.
const RELIGION_OPTIONS = [
  "Agnostic",
  "Atheist",
  "Spiritual but not religious",
  "Buddhist",
  "Catholic",
  "Christian",
  "Eastern Orthodox",
  "Hindu",
  "Jain",
  "Jewish",
  "Muslim",
  "Parsi / Zoroastrian",
  "Protestant",
  "Shinto",
  "Sikh",
  "Taoist",
  "Wiccan / Pagan",
  "Other",
  "Prefer not to say",
];

const RELATIONSHIP_STATUSES = [
  { value: "single", label: "Single" },
  { value: "divorced", label: "Divorced" },
  { value: "widowed", label: "Widowed" },
  { value: "separated", label: "Separated" },
];

const HOBBY_OPTIONS = [
  "Travel", "Music", "Cooking", "Reading", "Fitness", "Gaming",
  "Photography", "Art", "Movies", "Dancing", "Hiking", "Yoga",
  "Cycling", "Swimming", "Coffee", "Dogs", "Cats", "Volunteering",
];

const VIBE_OPTIONS = [
  "Adventurous", "Homebody", "Spiritual", "Ambitious", "Creative",
  "Funny", "Romantic", "Intellectual", "Outdoorsy", "Social butterfly",
];

// Lifestyle chips — values match backend enums in app/profile/schemas.py
const DRINKING_OPTIONS = [
  { value: "never",     label: "Never",      emoji: "🚫" },
  { value: "rarely",    label: "Rarely",     emoji: "🙂" },
  { value: "socially",  label: "Socially",   emoji: "🥂" },
  { value: "often",     label: "Often",      emoji: "🍸" },
  { value: "prefer_not_to_say", label: "Prefer not to say", emoji: "🤐" },
];
const SMOKING_OPTIONS = [
  { value: "never",          label: "Never",           emoji: "🚭" },
  { value: "socially",       label: "Socially",        emoji: "💨" },
  { value: "regularly",      label: "Regularly",       emoji: "🚬" },
  { value: "trying_to_quit", label: "Trying to quit",  emoji: "🤞" },
  { value: "prefer_not_to_say", label: "Prefer not to say", emoji: "🤐" },
];
const WORKOUT_OPTIONS = [
  { value: "never",      label: "Never",      emoji: "😌" },
  { value: "sometimes",  label: "Sometimes",  emoji: "🚶" },
  { value: "regularly",  label: "Regularly",  emoji: "💪" },
  { value: "daily",      label: "Daily",      emoji: "🏋️" },
];
const PETS_OPTIONS = [
  { value: "dog",      label: "Dog",       emoji: "🐶" },
  { value: "cat",      label: "Cat",       emoji: "🐱" },
  { value: "both",     label: "Both",      emoji: "🐾" },
  { value: "other",    label: "Other",     emoji: "🦜" },
  { value: "none",     label: "No pets",   emoji: "🙅" },
  { value: "want_one", label: "Want one",  emoji: "💖" },
];
const CHILDREN_OPTIONS = [
  { value: "have_and_want_more",      label: "Have & want more" },
  { value: "have_and_dont_want_more", label: "Have & don't want more" },
  { value: "want",                    label: "Want kids" },
  { value: "dont_want",               label: "Don't want kids" },
  { value: "unsure",                  label: "Not sure" },
];
const DIET_OPTIONS = [
  { value: "vegetarian",     label: "Vegetarian"     },
  { value: "vegan",          label: "Vegan"          },
  { value: "non_vegetarian", label: "Non-vegetarian" },
  { value: "eggetarian",     label: "Eggetarian"     },
  { value: "jain",           label: "Jain"           },
  { value: "other",          label: "Other"          },
];

function StepIndicator({ current }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${
          i < current ? "flex-1 bg-pink-500" : i === current - 1 ? "flex-1 bg-pink-500" : "w-6 bg-gray-200"
        }`} />
      ))}
    </div>
  );
}

function TagButton({ label, selected, onClick }) {
  return (
    <button type="button" onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
        selected ? "bg-pink-500 border-pink-500 text-white shadow-sm" : "bg-white border-gray-200 text-gray-600 hover:border-pink-400 hover:text-pink-500"
      }`}>
      {label}
    </button>
  );
}

function InputField({ icon, label, type = "text", placeholder, value, onChange, min, max, required, readOnly, hint }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="relative">
        {icon && <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">{icon}</span>}
        <input
          type={type} value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder} min={min} max={max} required={required}
          readOnly={readOnly}
          aria-readonly={readOnly || undefined}
          tabIndex={readOnly ? -1 : undefined}
          className={`w-full border rounded-xl ${icon ? "pl-10" : "pl-4"} ${readOnly ? "pr-10 bg-gray-50 text-gray-500 border-gray-200 cursor-not-allowed select-all" : "pr-4 text-gray-900 border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"} placeholder-gray-400 transition text-sm py-3`}
        />
        {readOnly && (
          /* Small lock icon at the right so it's immediately obvious why
             the field doesn't respond to clicks. Tooltip is the hint prop. */
          <span
            title={hint || "Not editable"}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </span>
        )}
      </div>
      {hint && (
        <p className="mt-1.5 text-xs text-gray-400">{hint}</p>
      )}
    </div>
  );
}

function SelectButton({ label, selected, onClick }) {
  return (
    <button type="button" onClick={onClick}
      className={`py-2.5 px-3 rounded-xl border text-sm text-left transition-all ${
        selected ? "border-pink-500 bg-pink-50 text-pink-600 font-medium" : "border-gray-200 bg-white text-gray-600 hover:border-pink-300"
      }`}>
      {label}
    </button>
  );
}

// Cascading country → state → city picker. Only "India" has curated
// state+city data; other countries get free-text inputs for state and
// city so users outside India can still sign up. The stored fields are
// `country` and `city` — `state` is UI-only (not persisted) and exists
// purely to narrow the city dropdown for Indian addresses.
function LocationPicker({ country, state, city, onCountry, onState, onCity }) {
  const isIndia = country === "India";
  const isOtherCountry = country === "Other";
  const cityOptions = isIndia && state ? (INDIA_STATES[state] || []) : [];

  const selectClasses =
    "w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition text-sm bg-white";
  const inputClasses =
    "w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition text-sm";

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
        <select
          value={country}
          onChange={(e) => onCountry(e.target.value)}
          className={selectClasses}
        >
          {COUNTRIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Other country — let user type country name */}
      {isOtherCountry && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Enter country</label>
          <input
            type="text"
            placeholder="Your country"
            onChange={(e) => onCountry(e.target.value)}
            className={inputClasses}
          />
        </div>
      )}

      {isIndia ? (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
            <select
              value={state}
              onChange={(e) => onState(e.target.value)}
              className={selectClasses}
            >
              <option value="">Select state…</option>
              {INDIA_STATE_NAMES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
            <select
              value={city}
              onChange={(e) => onCity(e.target.value)}
              disabled={!state}
              className={`${selectClasses} ${!state ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              <option value="">{state ? "Select city…" : "Select state first"}</option>
              {cityOptions.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
              {/* Escape hatch so users from smaller towns aren't blocked */}
              <option value="__other__">Other (type below)</option>
            </select>
            {city === "__other__" && (
              <input
                type="text"
                placeholder="Your city"
                onChange={(e) => onCity(e.target.value)}
                className={`mt-2 ${inputClasses}`}
                autoFocus
              />
            )}
          </div>
        </>
      ) : (
        // Non-India: free-text city. No state dropdown since we don't have
        // curated city data for other countries.
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
          <div className="relative">
            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={city}
              onChange={(e) => onCity(e.target.value)}
              placeholder="Your city"
              className={`${inputClasses} pl-10`}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function Signup() {
  const { user, profile, signup, googleSignIn, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef();
  const googleBtnRef = useRef(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [images, setImages] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  // Set to true after a successful Google sign-in. Locks the email field,
  // hides the password + Google button, and makes handleNext skip the
  // /auth/signup call (Google already created the account).
  const [fromGoogle, setFromGoogle] = useState(false);

  const [form, setForm] = useState({
    name: "", email: "", password: "", phone_number: "",
    // India is the primary market — default country avoids a extra click
    // for most users. `state` is UI-only (not sent to backend) and used to
    // narrow the city dropdown for Indian addresses.
    age: "", date_of_birth: "", gender: "", city: "", state: "", country: "India",
    preferred_gender: "", relationship_goal: "",
    education_level: "", occupation: "",
    hobbies: [], vibes: [], relationship_status: "", bio: "",
    // Lifestyle / Tinder-style detail chips
    drinking: "", smoking: "", workout: "",
    pets: "", children: "", diet: "",
    religion: "", languages: [], height_cm: "",
    first_date_idea: "",
  });

  function set(field, value) { setForm((f) => ({ ...f, [field]: value })); }

  // If user lands here already authenticated (e.g. Google sign-in from /login
  // with an incomplete profile), skip the account-creation step and prefill
  // what we already know so they can finish onboarding from step 2.
  useEffect(() => {
    if (step !== 1 || !user) return;
    setForm((f) => ({
      ...f,
      email: f.email || user.email || "",
      name: f.name || profile?.name || "",
      password: f.password || `existing_${user.id || Math.random().toString(36).slice(2)}`,
    }));
    setStep(2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Render Google Sign-In button while on step 1
  useEffect(() => {
    if (step !== 1) return;
    let cancelled = false;
    loadGoogleScript()
      .then((google) => {
        if (cancelled || !googleBtnRef.current) return;
        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async (resp) => {
            setError("");
            setLoading(true);
            try {
              const result = await googleSignIn(resp.credential);
              // Fully-completed profiles go straight to the app.
              if (result.is_complete) {
                navigate("/dashboard");
                return;
              }
              // New Google users (or returning users without a complete
              // profile) need to finish onboarding. Stay on step 1 so they
              // can confirm the pre-filled name, enter a phone number
              // (Google's ID token doesn't include it), and review their
              // email (locked). Password field is hidden for Google users.
              setFromGoogle(true);
              setForm((f) => ({
                ...f,
                email: result.email || f.email,
                name: result.name || f.name,
                phone_number: result.phone_number || f.phone_number,
                // Password isn't used for Google accounts but our local
                // validation might still read form.password — stash a random
                // placeholder that's >= 8 chars so it passes any length check.
                password: f.password || `google_${result.user_id || Math.random().toString(36).slice(2)}`,
              }));
            } catch (err) {
              setError(err.message || "Google sign-in failed");
            } finally {
              setLoading(false);
            }
          },
        });
        // Clear any previously-rendered button before re-rendering (StrictMode double-mount)
        googleBtnRef.current.innerHTML = "";
        google.accounts.id.renderButton(googleBtnRef.current, {
          theme: "outline",
          size: "large",
          width: googleBtnRef.current.offsetWidth || 360,
          text: "signup_with",
          shape: "rectangular",
        });
      })
      .catch(() => {
        // Non-fatal — user can still sign up with email/password
      });
    return () => { cancelled = true; };
  }, [step, googleSignIn, navigate]);

  function toggleArray(field, value) {
    setForm((f) => ({
      ...f,
      [field]: f[field].includes(value) ? f[field].filter((v) => v !== value) : [...f[field], value],
    }));
  }

  // Compute age (years) from a YYYY-MM-DD date-of-birth string.
  function ageFromDob(dob) {
    if (!dob) return null;
    const d = new Date(dob);
    if (Number.isNaN(d.getTime())) return null;
    const today = new Date();
    let a = today.getFullYear() - d.getFullYear();
    const m = today.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) a--;
    return a;
  }

  // Western tropical zodiac — matches backend app/profile/service.py so the
  // preview the user sees during signup is identical to the stored value.
  function zodiacFromDob(dob) {
    if (!dob) return null;
    const d = new Date(dob);
    if (Number.isNaN(d.getTime())) return null;
    const m = d.getMonth() + 1, day = d.getDate();
    const cusps = [
      [[1, 20],  "Capricorn",   "♑"],
      [[2, 19],  "Aquarius",    "♒"],
      [[3, 21],  "Pisces",      "♓"],
      [[4, 20],  "Aries",       "♈"],
      [[5, 21],  "Taurus",      "♉"],
      [[6, 21],  "Gemini",      "♊"],
      [[7, 23],  "Cancer",      "♋"],
      [[8, 23],  "Leo",         "♌"],
      [[9, 23],  "Virgo",       "♍"],
      [[10, 23], "Libra",       "♎"],
      [[11, 22], "Scorpio",     "♏"],
      [[12, 22], "Sagittarius", "♐"],
    ];
    for (const [[cm, cd], sign, glyph] of cusps) {
      if (m < cm || (m === cm && day < cd)) return { sign, glyph };
    }
    return { sign: "Capricorn", glyph: "♑" };
  }

  // Max DOB for the <input type="date"> picker — 18 years ago today.
  const maxDob = (() => {
    const t = new Date();
    t.setFullYear(t.getFullYear() - 18);
    return t.toISOString().slice(0, 10);
  })();

  function validate() {
    if (step === 1) {
      if (!form.name.trim()) return "Full name is required";
      if (!form.email.trim()) return "Email is required";
      if (!form.phone_number.trim()) return "Phone number is required";
      // Google users already have an account on the backend — no password needed.
      if (!fromGoogle && form.password.length < 8) return "Password must be at least 8 characters";
    }
    if (step === 2) {
      const age = ageFromDob(form.date_of_birth);
      if (!form.date_of_birth) return "Date of birth is required";
      if (age === null || age < 18) return "You must be 18 or older";
      if (age > 100) return "Please enter a valid date of birth";
      if (!form.gender) return "Please select your gender";
      if (!form.country.trim()) return "Country is required";
      if (form.country === "India" && !form.state.trim()) return "State is required";
      if (!form.city.trim()) return "City is required";
    }
    if (step === 3) {
      if (!form.preferred_gender) return "Please select who you want to date";
      if (!form.relationship_goal) return "Please select a relationship goal";
    }
    if (step === 6) {
      if (images.length < 1) return "Please upload at least 1 photo";
    }
    return null;
  }

  async function handleNext() {
    const err = validate();
    if (err) { setError(err); return; }
    setError("");

    if (step === 1) {
      // Google flow: account already exists (created on /auth/google).
      // Skip /auth/signup — it would 409 on the duplicate email. Just
      // advance so the user can fill out profile details.
      if (fromGoogle) {
        setStep(2);
        return;
      }
      setLoading(true);
      try {
        await signup(form.email, form.password, form.name, form.phone_number);
        setStep(2);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Step 5 now saves the full profile so photo upload (step 6) has a FK target.
    if (step === 5) {
      await handleSaveProfile();
      return;
    }

    if (step === 6) {
      await handleImageUpload();
      return;
    }

    // Step 7 (face verification) has its own button inside the component
    if (step === 7) return;

    setStep((s) => s + 1);
  }

  async function handleSaveProfile() {
    setLoading(true);
    setError("");
    try {
      // Derive age server-side too, but send a best-guess so the required int
      // field on ProfileCreateRequest is satisfied even if DOB parsing fails.
      const derivedAge = ageFromDob(form.date_of_birth);
      const payload = {
        name: form.name,
        age: derivedAge ?? (form.age ? parseInt(form.age) : undefined),
        gender: form.gender,
        preferred_gender: form.preferred_gender,
        city: form.city,
        country: form.country,
        relationship_goal: form.relationship_goal,
        date_of_birth: form.date_of_birth || undefined,
        phone_number: form.phone_number || undefined,
        education_level: form.education_level || undefined,
        occupation: form.occupation || undefined,
        bio: form.bio || undefined,
        hobbies: form.hobbies,
        vibes: form.vibes,
        relationship_status: form.relationship_status || undefined,
        // Lifestyle / Tinder-style details
        drinking: form.drinking || undefined,
        smoking: form.smoking || undefined,
        workout: form.workout || undefined,
        pets: form.pets || undefined,
        children: form.children || undefined,
        diet: form.diet || undefined,
        religion: form.religion?.trim() || undefined,
        languages: (form.languages && form.languages.length) ? form.languages : undefined,
        height_cm: form.height_cm ? parseInt(form.height_cm) : undefined,
        first_date_idea: form.first_date_idea?.trim() || undefined,
      };
      await api.profile.complete(payload);
      setStep(6);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleImageUpload() {
    if (images.length === 0) { setError("Upload at least 1 photo"); return; }
    setUploadingImages(true);
    setError("");
    try {
      for (let i = 0; i < images.length; i++) {
        if (!images[i].uploaded) {
          await api.images.upload(images[i].file, i === 0);
          setImages((prev) => prev.map((img, idx) => idx === i ? { ...img, uploaded: true } : img));
        }
      }
      // Continue to face-verification step instead of going straight to the dashboard
      setStep(7);
    } catch (e) {
      setError(e.message);
    } finally {
      setUploadingImages(false);
    }
  }

  async function handleVerificationFinish(blob) {
    setLoading(true);
    setError("");
    try {
      const file = new File([blob], "verification.jpg", { type: "image/jpeg" });
      await api.images.uploadVerification(file);
      await refreshProfile().catch(() => {});
      navigate("/dashboard");
    } catch (e) {
      setError(e.message || "Could not save verification");
    } finally {
      setLoading(false);
    }
  }

  function addImages(files) {
    const remaining = 6 - images.length;
    const newFiles = Array.from(files).slice(0, remaining);
    const newImgs = newFiles.map((f) => ({ file: f, preview: URL.createObjectURL(f), uploaded: false }));
    setImages((prev) => [...prev, ...newImgs]);
  }

  function removeImage(idx) { setImages((prev) => prev.filter((_, i) => i !== idx)); }

  const stepTitles = [
    "Create your account",
    "Tell us about yourself",
    "What are you looking for?",
    "Career & education",
    "Vibes & interests",
    "Your best photos",
    "Verify it's really you",
  ];

  const stepSubtitles = [
    "Join millions finding real connections",
    "Help us find your perfect match",
    "Be honest — it helps us match better",
    "Optional, but makes profiles stand out",
    "Show your personality",
    "Profiles with photos get 10× more views",
    "A quick selfie helps us keep fake profiles out",
  ];

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-12 overflow-hidden">
      {/* Decorative phone-collage backdrop — sits behind everything else,
          pointer-events none. Gives the signup page a lively "start
          something epic" vibe without requiring any real imagery. */}
      <PhoneCollageBg />

      <div className="relative z-10 w-full max-w-lg">
        {/* Logo — heart-M wordmark, white text for dark phone-collage bg */}
        <Link to="/" className="flex items-center justify-center mb-8 drop-shadow-md">
          <BrandLogo variant="full" size="lg" tone="light" />
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <StepIndicator current={step} />

          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900">{stepTitles[step - 1]}</h2>
            <p className="text-sm text-gray-400 mt-0.5">Step {step} of {TOTAL_STEPS} · {stepSubtitles[step - 1]}</p>
          </div>

          {error && (
            <div className="mb-5 flex items-start gap-2 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              <span>⚠️</span> {error}
            </div>
          )}

          {/* STEP 1 — Account */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Email/password path: show Google button + "or" divider.
                  After a successful Google sign-in we already have the
                  email on file, so hide the button and show a confirmation
                  banner instead. */}
              {!fromGoogle ? (
                <>
                  <div ref={googleBtnRef} className="w-full flex justify-center min-h-[44px]" />
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">or sign up with email</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                </>
              ) : (
                <div className="flex items-start gap-2.5 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-xs">
                  <Check size={16} className="mt-0.5 flex-shrink-0" />
                  <span>
                    Signed in with Google as <strong>{form.email}</strong>. Confirm your details below — your email can't be changed because it's linked to your Google account.
                  </span>
                </div>
              )}

              <InputField
                icon={<User size={16} />}
                label="Full name"
                placeholder="Your full name"
                value={form.name}
                onChange={(v) => set("name", v)}
                required
              />

              <InputField
                icon={<Mail size={16} />}
                label="Email address"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(v) => set("email", v)}
                required
                readOnly={fromGoogle}
                hint={fromGoogle ? "Linked to your Google account" : undefined}
              />

              <InputField
                icon={<Phone size={16} />}
                label="Phone number"
                type="tel"
                placeholder="+1 234 567 8900"
                value={form.phone_number}
                onChange={(v) => set("phone_number", v)}
                required
                hint={fromGoogle && !form.phone_number ? "Google doesn't share phone numbers — please add yours" : undefined}
              />

              {/* Password is an email/password flow detail — Google users
                  never type or see one. */}
              {!fromGoogle && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type={showPwd ? "text" : "password"} value={form.password}
                      onChange={(e) => set("password", e.target.value)}
                      placeholder="Min. 8 characters"
                      className="w-full border border-gray-200 rounded-xl pl-10 pr-12 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition text-sm"
                    />
                    <button type="button" onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <p className="mt-1.5 text-xs text-gray-400">Must be at least 8 characters</p>
                </div>
              )}
            </div>
          )}

          {/* STEP 2 — About you */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date of birth</label>
                <input
                  type="date"
                  value={form.date_of_birth}
                  max={maxDob}
                  onChange={(e) => set("date_of_birth", e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition text-sm"
                />
                {form.date_of_birth && ageFromDob(form.date_of_birth) !== null && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-pink-50 text-pink-600 font-medium">
                      🎂 {ageFromDob(form.date_of_birth)} years old
                    </span>
                    {zodiacFromDob(form.date_of_birth) && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-50 text-purple-600 font-medium">
                        {zodiacFromDob(form.date_of_birth).glyph} {zodiacFromDob(form.date_of_birth).sign}
                      </span>
                    )}
                  </div>
                )}
                <p className="mt-1.5 text-xs text-gray-400">You must be at least 18 to join MatchInMinutes.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">I identify as…</label>
                <div className="grid grid-cols-2 gap-2">
                  {GENDERS.map((g) => (
                    <SelectButton key={g.value} label={g.label} selected={form.gender === g.value} onClick={() => set("gender", g.value)} />
                  ))}
                </div>
              </div>
              <LocationPicker
                country={form.country}
                state={form.state}
                city={form.city}
                onCountry={(v) => { set("country", v); set("state", ""); set("city", ""); }}
                onState={(v) => { set("state", v); set("city", ""); }}
                onCity={(v) => set("city", v)}
              />
            </div>
          )}

          {/* STEP 3 — Preferences */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">I'm interested in dating…</label>
                <div className="grid grid-cols-2 gap-2">
                  {GENDERS.map((g) => (
                    <SelectButton key={g.value} label={g.label} selected={form.preferred_gender === g.value} onClick={() => set("preferred_gender", g.value)} />
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">What are you looking for?</label>
                <div className="grid grid-cols-2 gap-2">
                  {RELATIONSHIP_GOALS.map((g) => (
                    <SelectButton key={g.value} label={`${g.emoji} ${g.label}`} selected={form.relationship_goal === g.value} onClick={() => set("relationship_goal", g.value)} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4 — Career */}
          {step === 4 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400 -mt-2">All optional — helps us find better matches for you</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Education level</label>
                <div className="grid grid-cols-2 gap-2">
                  {EDUCATION_LEVELS.map((e) => (
                    <SelectButton key={e.value} label={e.label} selected={form.education_level === e.value} onClick={() => set("education_level", e.value)} />
                  ))}
                </div>
              </div>
              <InputField icon={<Briefcase size={16} />} label="Occupation" placeholder="e.g. Software Engineer" value={form.occupation} onChange={(v) => set("occupation", v)} />
            </div>
          )}

          {/* STEP 6 — Photos */}
          {step === 6 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400 -mt-2">
                Upload up to <strong className="text-gray-700">6 photos</strong>. First photo must clearly show your face.
              </p>
              <div className="grid grid-cols-3 gap-3">
                {images.map((img, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 group">
                    <img src={img.preview} alt="" className="w-full h-full object-cover" />
                    {i === 0 && (
                      <div className="absolute top-1.5 left-1.5 bg-pink-500 text-white text-[10px] px-1.5 py-0.5 rounded-md font-semibold">MAIN</div>
                    )}
                    {img.uploaded && (
                      <div className="absolute top-1.5 right-1.5 bg-green-500 rounded-full p-0.5">
                        <Check size={10} className="text-white" />
                      </div>
                    )}
                    <button type="button" onClick={() => removeImage(i)}
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                      <X size={20} className="text-white" />
                    </button>
                  </div>
                ))}
                {images.length < 6 && (
                  <button type="button" onClick={() => fileRef.current?.click()}
                    className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-pink-400 hover:text-pink-500 transition">
                    <Camera size={22} />
                    <span className="text-xs font-medium">Add photo</span>
                  </button>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => addImages(e.target.files)} />
            </div>
          )}

          {/* STEP 5 — Vibes */}
          {step === 5 && (
            <div className="space-y-5">
              <p className="text-sm text-gray-400 -mt-2">All optional — make your profile shine ✨</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Hobbies <span className="text-gray-400 font-normal">(pick any)</span></label>
                <div className="flex flex-wrap gap-2">
                  {HOBBY_OPTIONS.map((h) => (
                    <TagButton key={h} label={h} selected={form.hobbies.includes(h)} onClick={() => toggleArray("hobbies", h)} />
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Your vibe</label>
                <div className="flex flex-wrap gap-2">
                  {VIBE_OPTIONS.map((v) => (
                    <TagButton key={v} label={v} selected={form.vibes.includes(v)} onClick={() => toggleArray("vibes", v)} />
                  ))}
                </div>
              </div>

              {/* Lifestyle chips — single-select per row (tap again to clear) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">🍷 Drinking</label>
                <div className="flex flex-wrap gap-2">
                  {DRINKING_OPTIONS.map((o) => (
                    <TagButton
                      key={o.value}
                      label={`${o.emoji} ${o.label}`}
                      selected={form.drinking === o.value}
                      onClick={() => set("drinking", form.drinking === o.value ? "" : o.value)}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">🚬 Smoking</label>
                <div className="flex flex-wrap gap-2">
                  {SMOKING_OPTIONS.map((o) => (
                    <TagButton
                      key={o.value}
                      label={`${o.emoji} ${o.label}`}
                      selected={form.smoking === o.value}
                      onClick={() => set("smoking", form.smoking === o.value ? "" : o.value)}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">💪 Workout</label>
                <div className="flex flex-wrap gap-2">
                  {WORKOUT_OPTIONS.map((o) => (
                    <TagButton
                      key={o.value}
                      label={`${o.emoji} ${o.label}`}
                      selected={form.workout === o.value}
                      onClick={() => set("workout", form.workout === o.value ? "" : o.value)}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">🐾 Pets</label>
                <div className="flex flex-wrap gap-2">
                  {PETS_OPTIONS.map((o) => (
                    <TagButton
                      key={o.value}
                      label={`${o.emoji} ${o.label}`}
                      selected={form.pets === o.value}
                      onClick={() => set("pets", form.pets === o.value ? "" : o.value)}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">👶 Children</label>
                <div className="grid grid-cols-2 gap-2">
                  {CHILDREN_OPTIONS.map((o) => (
                    <SelectButton
                      key={o.value}
                      label={o.label}
                      selected={form.children === o.value}
                      onClick={() => set("children", form.children === o.value ? "" : o.value)}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">🍽️ Diet</label>
                <div className="grid grid-cols-2 gap-2">
                  {DIET_OPTIONS.map((o) => (
                    <SelectButton
                      key={o.value}
                      label={o.label}
                      selected={form.diet === o.value}
                      onClick={() => set("diet", form.diet === o.value ? "" : o.value)}
                    />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <InputField
                  label="Height (cm)"
                  type="number"
                  placeholder="e.g. 170"
                  value={form.height_cm}
                  onChange={(v) => set("height_cm", v)}
                  min={120}
                  max={230}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Religion</label>
                  <select
                    value={RELIGION_OPTIONS.includes(form.religion) ? form.religion : (form.religion ? "Other" : "")}
                    onChange={(e) => set("religion", e.target.value === "Other" ? (form.religion && !RELIGION_OPTIONS.includes(form.religion) ? form.religion : "") : e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500 bg-white text-sm"
                  >
                    <option value="">Select…</option>
                    {RELIGION_OPTIONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  {/* Free-text fallback when user picks "Other" */}
                  {(form.religion && !RELIGION_OPTIONS.includes(form.religion)) ||
                   (RELIGION_OPTIONS.includes(form.religion) && form.religion === "Other") ? (
                    <input
                      type="text"
                      value={RELIGION_OPTIONS.includes(form.religion) ? "" : form.religion}
                      onChange={(e) => set("religion", e.target.value)}
                      placeholder="Your religion"
                      className="mt-2 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                  ) : null}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Languages <span className="text-gray-400 font-normal">(comma-separated)</span>
                </label>
                <input
                  type="text"
                  value={(form.languages || []).join(", ")}
                  onChange={(e) =>
                    set(
                      "languages",
                      e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean)
                    )
                  }
                  placeholder="e.g. English, Hindi, Tamil"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ✨ Your ideal first date
                </label>
                <textarea
                  value={form.first_date_idea}
                  onChange={(e) => set("first_date_idea", e.target.value)}
                  rows={2}
                  maxLength={200}
                  placeholder="Coffee and a long walk? A concert? Cooking together?"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition resize-none text-sm"
                />
                <p className="text-right text-xs text-gray-400 mt-1">{(form.first_date_idea || "").length}/200</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Relationship status</label>
                <div className="grid grid-cols-2 gap-2">
                  {RELATIONSHIP_STATUSES.map((r) => (
                    <SelectButton key={r.value} label={r.label} selected={form.relationship_status === r.value} onClick={() => set("relationship_status", form.relationship_status === r.value ? "" : r.value)} />
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bio <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={form.bio} onChange={(e) => set("bio", e.target.value)}
                  rows={3} maxLength={300}
                  placeholder="Tell people a bit about yourself…"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition resize-none text-sm"
                />
                <p className="text-right text-xs text-gray-400 mt-1">{form.bio.length}/300</p>
              </div>
            </div>
          )}

          {/* STEP 7 — Face verification (skippable) */}
          {step === 7 && (
            <FaceVerificationStep
              onFinish={handleVerificationFinish}
              onSkip={() => navigate("/dashboard")}
              loading={loading}
              setError={setError}
            />
          )}

          {/* Navigation — hidden on the verification step (it has its own controls) */}
          {step !== 7 && (
            <div className="mt-8 flex items-center gap-3">
              {step > 1 && (
                <button type="button" onClick={() => { setError(""); setStep((s) => s - 1); }}
                  className="flex items-center gap-1.5 px-5 py-3 rounded-xl border border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition text-sm font-medium">
                  <ChevronLeft size={16} /> Back
                </button>
              )}
              <button
                type="button" onClick={handleNext}
                disabled={loading || uploadingImages}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-pink-600 text-white font-semibold hover:from-pink-600 hover:to-pink-700 transition disabled:opacity-50 text-sm shadow-md shadow-pink-100"
              >
                {loading || uploadingImages ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Please wait…
                  </span>
                ) : step === 6 ? (
                  <><Camera size={16} /> Upload &amp; continue</>
                ) : step === 5 ? (
                  <><Check size={16} /> Save &amp; continue</>
                ) : (
                  <>Continue <ArrowRight size={16} /></>
                )}
              </button>
            </div>
          )}

          {step === 1 && (
            <p className="mt-5 text-center text-sm text-gray-500">
              Already have an account?{" "}
              <Link to="/login" className="text-pink-600 font-semibold hover:text-pink-700">Sign in</Link>
            </p>
          )}
          {step === 4 && (
            <button type="button" onClick={() => { setError(""); setStep((s) => s + 1); }}
              className="w-full mt-3 text-sm text-gray-400 hover:text-gray-600 transition">
              Skip this step →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Face verification step ──────────────────────────────────────────────────
// Camera feed with an oval face-frame overlay. Uses the browser's FaceDetector
// API when available to confirm a clear face is visible; otherwise accepts the
// capture after the user confirms. The resulting JPEG blob is handed to onFinish.
// `onSkip` lets users bypass verification during signup (they can verify later
// from their profile page) — but unverified users are hidden from Discover and
// blocked from sending match requests, so the UX nudges them to finish it.
function FaceVerificationStep({ onFinish, onSkip, loading, setError }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [phase, setPhase] = useState("idle");   // idle | live | captured | checking
  const [preview, setPreview] = useState(null); // { url, blob }
  const [detectorSupported] = useState(() =>
    typeof window !== "undefined" && "FaceDetector" in window
  );
  const [localError, setLocalError] = useState("");

  // Start camera once the step is shown
  useEffect(() => {
    startCamera();
    return () => stopCamera();
    // eslint-disable-next-line
  }, []);

  async function startCamera() {
    setLocalError("");
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setPhase("live");
    } catch (e) {
      setLocalError("Camera access denied. Please allow camera to verify your identity.");
      setPhase("idle");
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }

  async function capture() {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;
    setPhase("checking");
    setLocalError("");

    const canvas = canvasRef.current || document.createElement("canvas");
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 640;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    // Mirror so the saved image matches what the user saw
    ctx.save();
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, w, h);
    ctx.restore();

    // Optional face-presence check (Chrome/Edge desktop & Android only)
    if (detectorSupported) {
      try {
        const detector = new window.FaceDetector({ fastMode: true });
        const faces = await detector.detect(canvas);
        if (faces.length === 0) {
          setLocalError("We couldn't find a clear face. Please center your face in the oval and try again.");
          setPhase("live");
          return;
        }
        if (faces.length > 1) {
          setLocalError("Multiple faces detected. Please take the selfie alone.");
          setPhase("live");
          return;
        }
        // Require the face to fill a reasonable portion of the frame
        const face = faces[0];
        const areaRatio = (face.boundingBox.width * face.boundingBox.height) / (w * h);
        if (areaRatio < 0.08) {
          setLocalError("Face too small — please move closer and try again.");
          setPhase("live");
          return;
        }
      } catch {
        // Detector failed — accept the capture rather than blocking verification
      }
    }

    canvas.toBlob((blob) => {
      if (!blob) {
        setLocalError("Couldn't capture the image. Please try again.");
        setPhase("live");
        return;
      }
      setPreview({ blob, url: URL.createObjectURL(blob) });
      setPhase("captured");
      stopCamera();
    }, "image/jpeg", 0.9);
  }

  async function retake() {
    if (preview?.url) URL.revokeObjectURL(preview.url);
    setPreview(null);
    setLocalError("");
    await startCamera();
  }

  function confirm() {
    if (preview?.blob) onFinish(preview.blob);
  }

  return (
    <div className="space-y-4">
      {localError && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-xs">
          <span>⚠️</span> {localError}
        </div>
      )}

      {phase === "captured" && preview ? (
        <div className="space-y-3">
          <div className="relative mx-auto w-64 h-64 rounded-3xl overflow-hidden border-2 border-pink-200 bg-gray-100">
            <img src={preview.url} alt="Your selfie" className="w-full h-full object-cover" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={retake}
              disabled={loading}
              className="flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition text-sm disabled:opacity-50"
            >
              <RefreshCw size={15} /> Retake
            </button>
            <button
              type="button"
              onClick={confirm}
              disabled={loading}
              className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-pink-600 text-white font-semibold hover:from-pink-600 hover:to-pink-700 transition text-sm shadow-md shadow-pink-100 disabled:opacity-50"
            >
              {loading
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
                : <><Check size={16} /> Verify &amp; finish</>
              }
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative mx-auto w-64 h-64 rounded-3xl overflow-hidden bg-gray-900">
            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: "scaleX(-1)" }}
            />
            {/* Oval face-frame overlay */}
            <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
              <defs>
                <mask id="faceMask">
                  <rect width="100" height="100" fill="white" />
                  <ellipse cx="50" cy="50" rx="32" ry="42" fill="black" />
                </mask>
              </defs>
              <rect width="100" height="100" fill="rgba(0,0,0,0.45)" mask="url(#faceMask)" />
              <ellipse
                cx="50" cy="50" rx="32" ry="42"
                fill="none" stroke="white" strokeOpacity="0.85" strokeWidth="0.6"
                strokeDasharray="1.5 1.5"
              />
            </svg>
            {phase === "checking" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <span className="text-white text-xs font-medium flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Checking…
                </span>
              </div>
            )}
          </div>
          <p className="text-center text-xs text-gray-500">
            Center your face inside the oval, then tap capture.
          </p>
          <button
            type="button"
            onClick={capture}
            disabled={phase !== "live"}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-pink-600 text-white font-semibold hover:from-pink-600 hover:to-pink-700 transition text-sm shadow-md shadow-pink-100 disabled:opacity-50"
          >
            <Camera size={16} /> Capture selfie
          </button>
          {!detectorSupported && (
            <p className="text-[11px] text-gray-400 text-center">
              Face auto-check not supported on this browser — please make sure your face is clearly visible.
            </p>
          )}
        </div>
      )}

      {onSkip && phase !== "captured" && (
        <button
          type="button"
          onClick={() => { stopCamera(); onSkip(); }}
          disabled={loading}
          className="w-full text-center text-sm text-gray-400 hover:text-gray-600 py-1 transition disabled:opacity-50"
        >
          Skip for now — I'll verify later
        </button>
      )}
      <p className="text-[11px] text-gray-400 text-center leading-relaxed">
        Verified profiles are the only ones shown in Discover and allowed to send requests. You can verify anytime from your profile.
      </p>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
