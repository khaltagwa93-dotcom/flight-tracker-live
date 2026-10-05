import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lamin = searchParams.get("lamin");
    const lomin = searchParams.get("lomin");
    const lamax = searchParams.get("lamax");
    const lomax = searchParams.get("lomax");
    const icao = searchParams.get("icao");

    let url = "https://opensky-network.org/api/states/all";

    if (lamin && lomin && lamax && lomax) {
      url += `?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;
    }

    const res = await fetch(url, {
      headers: { "User-Agent": "FlightTrackerLive/1.0" },
      next: { revalidate: 8 },
    });

    if (!res.ok) {
      if (res.status === 429 || res.status === 503) {
        return NextResponse.json({
          success: false,
          error: "Rate limit – حاول بعد ثوانٍ",
          states: [],
          time: Date.now() / 1000,
        });
      }
      throw new Error(`OpenSky ${res.status}`);
    }

    const data = await res.json();

    let states = (data.states || []).map((s: any[]) => ({
      icao24: s[0],
      callsign: (s[1] || "").trim() || "N/A",
      originCountry: s[2] || "Unknown",
      timePosition: s[3],
      lastContact: s[4],
      longitude: s[5],
      latitude: s[6],
      altitude: s[7] != null ? Math.round(s[7]) : null,
      altitudeFt: s[7] != null ? Math.round(s[7] * 3.28084) : null,
      onGround: s[8],
      velocity: s[9] != null ? Math.round(s[9] * 1.94384) : null,
      velocityKmh: s[9] != null ? Math.round(s[9] * 3.6) : null,
      heading: s[10] != null ? Math.round(s[10]) : null,
      verticalRate: s[11],
      geoAltitude: s[13],
      squawk: s[14],
    }));

    states = states.filter(
      (f: any) =>
        f.latitude != null &&
        f.longitude != null &&
        !isNaN(f.latitude) &&
        !isNaN(f.longitude)
    );

    if (icao) {
      states = states.filter(
        (f: any) =>
          f.icao24?.toLowerCase() === icao.toLowerCase() ||
          f.callsign?.toLowerCase().includes(icao.toLowerCase())
      );
    }

    states.sort((a: any, b: any) => {
      if (a.onGround !== b.onGround) return a.onGround ? 1 : -1;
      return (b.altitude || 0) - (a.altitude || 0);
    });

    return NextResponse.json({
      success: true,
      time: data.time,
      count: states.length,
      states,
      source: "OpenSky Network (ADS-B)",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch flights", states: [] },
      { status: 500 }
    );
  }
}
