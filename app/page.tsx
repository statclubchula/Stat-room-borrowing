import { HomeActions } from "@/components/home-actions";

export default function Home() {
  return (
    <div className="container pt-3 pb-8 sm:pt-4 sm:pb-10">
      {/* ---- Hero banner ---- */}
      <div className="relative mx-auto max-w-4xl overflow-hidden rounded-2xl border border-white/10 shadow-xl shadow-primary/20">
        {/* Vibrant violet → fuchsia base (its own colored surface, identical in both themes) */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-purple-700 to-fuchsia-800" />

        {/* Decorative glow blobs */}
        <div className="pointer-events-none absolute -left-16 -top-20 h-56 w-56 rounded-full bg-fuchsia-400/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-10 h-56 w-56 rounded-full bg-violet-300/30 blur-3xl" />

        {/* Faint grid pattern */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.6) 1px, transparent 1px)",
            backgroundSize: "38px 38px",
          }}
        />

        {/* Dark fade for absolute text contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />

        {/* Content */}
        <div className="relative flex flex-col items-center px-6 py-12 text-center sm:py-16">
          <h1 className="text-4xl font-extrabold tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)] sm:text-6xl">
            Stat Room Borrowing
          </h1>
          <span className="mt-4 inline-flex items-center rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur">
            by Stat Club
          </span>
        </div>
      </div>

      {/* ---- Action cards (ยืม / คืน / ติดต่อ) ---- */}
      <HomeActions />
    </div>
  );
}
