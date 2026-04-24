import { motion } from "framer-motion";
import { Search, Heart, ArrowRight, MapPin, Star, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
// Note: SocialSidebar is rendered once at the LandingPage level (App.jsx), not here.
// Rendering it inside HeroSection too would stack two identical absolute-positioned
// sidebars on top of each other and produce "merged" icons.

const BG_IMAGE =
  "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=1400&q=80";

// Couple images from Unsplash — all three are real couples so the hero
// collage reads as "dating app for people looking for love", not stock
// portraits or lifestyle shots.
const COUPLE_MAIN =
  "https://images.unsplash.com/photo-1518621736915-f3b1c41bfd00?w=600&q=85"; // couple embrace outdoors (tall hero)

const COUPLE_2 =
  "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=400&q=80"; // heart-hands silhouette (kept)

const COUPLE_3 =
  "https://images.unsplash.com/photo-1529636798458-92182e662485?w=400&q=80"; // couple close-up, warm tones

export default function HeroSection() {
  const navigate = useNavigate();
  return (
    <section className="relative min-h-screen bg-[#0b0b18] overflow-hidden flex flex-col">
      {/* Blurred bg */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-15 blur-sm scale-105"
        style={{ backgroundImage: `url(${BG_IMAGE})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0b0b18]/70 via-[#0b0b18]/50 to-[#0b0b18]" />

      {/* Glow blobs */}
      <div className="absolute top-1/3 right-1/3 w-96 h-96 bg-purple-700/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-pink-700/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-1 items-center px-20 pt-4 pb-12 gap-12">

        {/* ── LEFT TEXT ── */}
        <div className="flex-1 max-w-xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 bg-pink-500/10 border border-pink-500/30 text-pink-400 text-xs font-semibold px-4 py-2 rounded-full mb-6"
          >
            <Heart size={12} className="fill-pink-400" />
            Over 8.6 Million Singles Online
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-white font-extrabold text-5xl leading-tight mb-5"
          >
            When You Would Like
            <br />
            To Go On A{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500">
              Dating?
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-gray-400 text-base mb-10 leading-relaxed"
          >
            A website aimed at singles looking for a real relationship —
            connecting people through shared places, interests &amp; meaningful moments.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex items-center gap-4 flex-wrap"
          >
            <button onClick={() => navigate("/signup")}
              className="flex items-center gap-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white font-bold px-8 py-4 rounded-full shadow-xl shadow-pink-600/30 hover:shadow-pink-600/50 hover:scale-105 transition-all duration-200">
              Get Started Free
              <ArrowRight size={18} />
            </button>
            <button onClick={() => navigate("/login")}
              className="flex items-center gap-2 text-white font-semibold px-6 py-4 rounded-full border border-gray-700 hover:border-pink-500/50 transition-all duration-200 hover:bg-white/5">
              <Search size={16} className="text-pink-400" />
              Browse Profiles
            </button>
          </motion.div>

          {/* Trust row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex items-center gap-6 mt-8"
          >
            <div className="flex -space-x-2">
              {["women/21", "men/32", "women/44", "men/55"].map((p, i) => (
                <img
                  key={i}
                  src={`https://randomuser.me/api/portraits/${p}.jpg`}
                  className="w-8 h-8 rounded-full border-2 border-[#0b0b18] object-cover"
                  alt=""
                />
              ))}
            </div>
            <div>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={12} className="fill-yellow-400 text-yellow-400" />
                ))}
                <span className="text-yellow-400 text-xs font-bold ml-1">4.9</span>
              </div>
              <p className="text-gray-500 text-xs mt-0.5">Trusted by 8.6M+ singles</p>
            </div>
          </motion.div>
        </div>

        {/* ── RIGHT — COUPLE PHOTOS ── */}
        <div className="flex-1 flex items-center justify-center relative" style={{ minHeight: 520 }}>

          {/* Glow blob */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-gradient-to-br from-pink-600/20 to-purple-700/25 rounded-full blur-3xl pointer-events-none" />

          {/* ── Photo cluster — fixed 460px wide box, centred ── */}
          <div className="relative" style={{ width: 420, height: 480 }}>

            {/* Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-br from-pink-600/20 to-purple-700/25 rounded-full blur-3xl pointer-events-none" />

            {/* ── MAIN tall photo ── */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="absolute left-12 top-10 w-52 h-[340px] rounded-3xl overflow-hidden shadow-2xl border-2 border-white/10 z-10"
              style={{ transform: "rotate(-4deg)" }}
            >
              <img src={COUPLE_MAIN} alt="Couple" className="w-full h-full object-cover object-center" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 1.1 }}
                className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-pink-600 text-white text-xs font-bold px-4 py-2 rounded-full flex items-center gap-1.5 shadow-lg whitespace-nowrap"
              >
                <Heart size={12} className="fill-white" /> It&apos;s a Match!
              </motion.div>
            </motion.div>

            {/* ── SECOND photo — top-right ── */}
            <motion.div
              initial={{ opacity: 0, x: 30, y: -20 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="absolute right-0 top-0 w-40 h-52 rounded-2xl overflow-hidden shadow-xl border-2 border-white/10 z-20"
              style={{ transform: "rotate(5deg)" }}
            >
              <img src={COUPLE_2} alt="Couple" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            </motion.div>

            {/* ── THIRD photo — bottom-right ── */}
            <motion.div
              initial={{ opacity: 0, x: 30, y: 20 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ duration: 0.7, delay: 0.55 }}
              className="absolute right-4 bottom-0 w-36 h-44 rounded-2xl overflow-hidden shadow-xl border-2 border-white/10 z-20"
              style={{ transform: "rotate(-3deg)" }}
            >
              <img src={COUPLE_3} alt="Couple" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            </motion.div>

            {/* ── 8.6m stat card — bottom-left ── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="absolute left-0 bottom-6 bg-purple-700/85 backdrop-blur-md rounded-2xl p-3.5 shadow-xl border border-purple-500/40 z-30"
              style={{ width: 160 }}
            >
              <p className="text-white text-3xl font-extrabold mb-2">8.6m</p>
              <div className="flex -space-x-2 mb-1.5">
                {["women/44", "men/32", "women/68"].map((p, i) => (
                  <img key={i} src={`https://randomuser.me/api/portraits/${p}.jpg`} alt=""
                    className="w-7 h-7 rounded-full border-2 border-purple-700 object-cover" />
                ))}
              </div>
              <p className="text-purple-200 text-xs">Happy couples worldwide</p>
            </motion.div>

            {/* ── Verified chip — top-left ── */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="absolute left-0 top-16 bg-[#0f0f25]/90 backdrop-blur-md border border-green-500/40 rounded-2xl px-3 py-2.5 flex items-center gap-2 z-30"
            >
              <div className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/50 flex items-center justify-center flex-shrink-0">
                <Check size={14} className="text-green-400" />
              </div>
              <div>
                <p className="text-white text-xs font-bold">Verified</p>
                <p className="text-gray-400 text-xs">Profile Match</p>
              </div>
            </motion.div>

            {/* ── Floating heart ── */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              className="absolute top-0 left-1/2 -translate-x-1/2 z-30"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-pink-700 flex items-center justify-center shadow-lg shadow-pink-600/50">
                <Heart size={18} className="text-white fill-white" />
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
