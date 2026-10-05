"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";

const FlightMap = dynamic(() => import("@/components/FlightMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-400">
      جاري تحميل الخريطة...
    </div>
  ),
});

export type Flight = {
  icao24: string;
  callsign: string;
  originCountry: string;
  longitude: number;
  latitude: number;
  altitude: number | null;
  altitudeFt: number | null;
  onGround: boolean;
  velocity: number | null;
  velocityKmh: number | null;
  heading: number | null;
  verticalRate: number | null;
  squawk: string | null;
};

type Region = {
  id: string;
  name: string;
  nameAr: string;
  lamin: number;
  lomin: number;
  lamax: number;
  lomax: number;
  center: [number, number];
  zoom: number;
};

const REGIONS: Region[] = [
  { id: "world", name: "World", nameAr: "العالم", lamin: -60, lomin: -180, lamax: 80, lomax: 180, center: [25, 20], zoom: 2 },
  { id: "uae", name: "UAE & Gulf", nameAr: "الإمارات والخليج", lamin: 22, lomin: 50, lamax: 28, lomax: 58, center: [25.2, 55.3], zoom: 7 },
  { id: "ksa", name: "Saudi Arabia", nameAr: "السعودية", lamin: 16, lomin: 34, lamax: 32.5, lomax: 56, center: [24, 45], zoom: 5 },
  { id: "europe", name: "Europe", nameAr: "أوروبا", lamin: 35, lomin: -10, lamax: 60, lomax: 30, center: [48, 10], zoom: 4 },
  { id: "mena", name: "Middle East", nameAr: "الشرق الأوسط", lamin: 12, lomin: 25, lamax: 42, lomax: 60, center: [28, 45], zoom: 4 },
  { id: "usa", name: "USA", nameAr: "أمريكا", lamin: 24, lomin: -125, lamax: 50, lomax: -66, center: [39, -98], zoom: 4 },
];

export default function Home() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Flight | null>(null);
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState<Region>(REGIONS[1]);
  const [lastUpdate, setLastUpdate] = useState("");
  const [countdown, setCountdown] = useState(12);
  const [totalCount, setTotalCount] = useState(0);

  const fetchFlights = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        lamin: String(region.lamin),
        lomin: String(region.lomin),
        lamax: String(region.lamax),
        lomax: String(region.lomax),
      });
      const res = await fetch(`/api/flights?${params}`);
      const data = await res.json();

      if (data.success) {
        setFlights(data.states || []);
        setTotalCount(data.count || 0);
        setLastUpdate(new Date().toLocaleTimeString("ar-AE"));
        setError("");
      } else {
        setError(data.error || "فشل جلب البيانات");
      }
    } catch (e: any) {
      setError(e.message || "خطأ في الاتصال");
    } finally {
      setLoading(false);
      setCountdown(12);
    }
  }, [region]);

  useEffect(() => {
    setLoading(true);
    fetchFlights();
    const interval = setInterval(fetchFlights, 12_000);
    return () => clearInterval(interval);
  }, [fetchFlights]);

  useEffect(() => {
    const tick = setInterval(() => {
      setCountdown((c) => (c <= 1 ? 12 : c - 1));
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  const filtered = search.trim()
    ? flights.filter(
        (f) =>
          f.callsign.toLowerCase().includes(search.toLowerCase()) ||
          f.icao24.toLowerCase().includes(search.toLowerCase()) ||
          f.originCountry.toLowerCase().includes(search.toLowerCase())
      )
    : flights;

  const airborne = filtered.filter((f) => !f.onGround).length;
  const onGround = filtered.filter((f) => f.onGround).length;

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <header className="shrink-0 border-b border-slate-700/80 bg-slate-950/95 backdrop-blur z-20">
        <div className="px-3 py-2.5 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-sky-500 to-blue-700 flex items-center justify-center text-lg shadow">✈️</div>
            <div>
              <h1 className="text-base font-bold text-white leading-tight">تتبع الطيران اللحظي</h1>
              <p className="text-[10px] text-slate-400">Live Flight Tracker · OpenSky ADS-B</p>
            </div>
          </div>

          <select
            value={region.id}
            onChange={(e) => {
              const r = REGIONS.find((x) => x.id === e.target.value);
              if (r) setRegion(r);
            }}
            className="bg-slate-800 border border-slate-600 rounded-lg px-2.5 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            {REGIONS.map((r) => (
              <option key={r.id} value={r.id}>{r.nameAr}</option>
            ))}
          </select>

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث: رقم الرحلة / ICAO / الدولة..."
            className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-sm w-44 sm:w-56 focus:outline-none focus:ring-2 focus:ring-sky-500 placeholder-slate-500"
          />

          <div className="flex items-center gap-3 ms-auto text-xs">
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-full px-2.5 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 live-dot" />
              <span className="text-emerald-300">مباشر</span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-300">{countdown}ث</span>
            </div>
            <span className="text-slate-400 hidden sm:inline">🛫 {airborne} · 🛬 {onGround} · الكل {totalCount}</span>
            {lastUpdate && <span className="text-slate-500 hidden md:inline">آخر تحديث: {lastUpdate}</span>}
            <button
              onClick={() => { setLoading(true); fetchFlights(); }}
              className="bg-sky-600 hover:bg-sky-500 text-white px-2.5 py-1 rounded-lg text-xs transition"
            >🔄</button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-72 sm:w-80 shrink-0 border-l border-slate-700/80 bg-slate-950/90 overflow-y-auto hidden md:block">
          <div className="p-2 sticky top-0 bg-slate-950/95 border-b border-slate-800 z-10">
            <p className="text-xs text-slate-400 px-1">{filtered.length} طائرة · {region.nameAr}</p>
          </div>

          {error && (
            <div className="m-2 p-2 bg-red-950/50 border border-red-800 rounded-lg text-red-200 text-xs">⚠️ {error}</div>
          )}

          {loading && flights.length === 0 ? (
            <div className="p-6 text-center text-slate-500 text-sm">جاري التحميل...</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center text-slate-500 text-sm">لا توجد طائرات في هذه المنطقة</div>
          ) : (
            <ul className="divide-y divide-slate-800/80">
              {filtered.slice(0, 120).map((f) => (
                <li
                  key={f.icao24 + f.callsign}
                  onClick={() => setSelected(f)}
                  className={`px-3 py-2.5 cursor-pointer hover:bg-slate-800/70 transition ${
                    selected?.icao24 === f.icao24 ? "bg-sky-900/40 border-r-2 border-sky-400" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-semibold text-sky-300 text-sm">{f.callsign}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      f.onGround ? "bg-amber-900/50 text-amber-300" : "bg-emerald-900/50 text-emerald-300"
                    }`}>{f.onGround ? "على الأرض" : "في الجو"}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-400">
                    <span>{f.originCountry}</span>
                    {f.altitudeFt != null && <span>{f.altitudeFt.toLocaleString()} قدم</span>}
                    {f.velocity != null && <span>{f.velocity} عقدة</span>}
                    {f.heading != null && <span>↕ {f.heading}°</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <div className="flex-1 relative">
          <FlightMap
            flights={filtered}
            selected={selected}
            onSelect={setSelected}
            center={region.center}
            zoom={region.zoom}
          />

          {selected && (
            <div className="absolute bottom-3 left-3 right-3 md:left-auto md:right-3 md:w-80 bg-slate-900/95 border border-slate-600 rounded-xl p-4 shadow-2xl z-[1000] backdrop-blur">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <h3 className="font-mono text-lg font-bold text-sky-300">{selected.callsign}</h3>
                  <p className="text-xs text-slate-400">{selected.icao24} · {selected.originCountry}</p>
                </div>
                <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-white text-xl leading-none">×</button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-slate-800/80 rounded-lg p-2">
                  <div className="text-[10px] text-slate-500">الارتفاع</div>
                  <div className="font-semibold text-white">{selected.altitudeFt != null ? `${selected.altitudeFt.toLocaleString()} قدم` : "—"}</div>
                </div>
                <div className="bg-slate-800/80 rounded-lg p-2">
                  <div className="text-[10px] text-slate-500">السرعة</div>
                  <div className="font-semibold text-white">
                    {selected.velocity != null ? `${selected.velocity} عقدة` : "—"}
                    {selected.velocityKmh != null && <span className="text-xs text-slate-400 ms-1">({selected.velocityKmh} كم/س)</span>}
                  </div>
                </div>
                <div className="bg-slate-800/80 rounded-lg p-2">
                  <div className="text-[10px] text-slate-500">الاتجاه</div>
                  <div className="font-semibold text-white">{selected.heading != null ? `${selected.heading}°` : "—"}</div>
                </div>
                <div className="bg-slate-800/80 rounded-lg p-2">
                  <div className="text-[10px] text-slate-500">الحالة</div>
                  <div className={`font-semibold ${selected.onGround ? "text-amber-300" : "text-emerald-300"}`}>
                    {selected.onGround ? "على الأرض" : "في الجو"}
                  </div>
                </div>
                <div className="bg-slate-800/80 rounded-lg p-2 col-span-2">
                  <div className="text-[10px] text-slate-500">الموقع</div>
                  <div className="font-mono text-xs text-slate-300">{selected.latitude?.toFixed(4)}°, {selected.longitude?.toFixed(4)}°</div>
                </div>
                {selected.squawk && (
                  <div className="bg-slate-800/80 rounded-lg p-2 col-span-2">
                    <div className="text-[10px] text-slate-500">Squawk</div>
                    <div className="font-mono text-sm text-white">{selected.squawk}</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <footer className="shrink-0 border-t border-slate-800 py-1.5 px-3 text-[10px] text-slate-500 flex items-center justify-between">
        <span>بيانات حقيقية من OpenSky Network (ADS-B) · تحديث كل 12 ثانية</span>
        <span className="hidden sm:inline">مشابه لـ Flightradar24 · مجاني</span>
      </footer>
    </div>
  );
}
