import requests
from skyfield.api import load, EarthSatellite
from datetime import datetime, timezone
import math

INDIAN_SATELLITES = [
    "CARTOSAT-3",
    "EOS-04",
    "EOS-06",
    "RESOURCESAT-2A",
    "OCEANSAT-3",
]

FALLBACK_NAMES = ["CARTOSAT", "EOS", "RESOURCESAT", "OCEANSAT", "RISAT"]

ts = load.timescale()

def fetch_tles():
    url = "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle"
    try:
        resp = requests.get(url, timeout=15)
        resp.raise_for_status()
        return resp.text
    except Exception as e:
        print(f"TLE fetch error: {e}")
        return None

def parse_tles(raw_text):
    lines = [l.strip() for l in raw_text.strip().splitlines() if l.strip()]
    sats = {}
    i = 0
    while i < len(lines) - 2:
        if not lines[i].startswith("1 ") and not lines[i].startswith("2 "):
            name = lines[i]
            l1 = lines[i+1] if i+1 < len(lines) else ""
            l2 = lines[i+2] if i+2 < len(lines) else ""
            if l1.startswith("1 ") and l2.startswith("2 "):
                sats[name.upper()] = (name, l1, l2)
                i += 3
                continue
        i += 1
    return sats

def find_indian_satellites(sats_dict):
    found = []
    search_terms = ["CARTOSAT", "EOS", "RESOURCESAT", "OCEANSAT", "RISAT", "INSAT", "GSAT"]
    for term in search_terms:
        for key, val in sats_dict.items():
            if term in key and len(found) < 5:
                if val not in found:
                    found.append(val)
        if len(found) >= 5:
            break
    # fill remaining with any leo satellites
    if len(found) < 5:
        for key, val in list(sats_dict.items())[:100]:
            if val not in found and len(found) < 5:
                found.append(val)
    return found[:5]

def get_satellite_positions():
    raw = fetch_tles()
    if not raw:
        return get_mock_positions()

    all_sats = parse_tles(raw)
    indian_sats = find_indian_satellites(all_sats)

    if not indian_sats:
        return get_mock_positions()

    now = ts.now()
    results = []

    for (name, l1, l2) in indian_sats:
        try:
            sat = EarthSatellite(l1, l2, name, ts)
            geo = sat.at(now)
            subpoint = geo.subpoint()
            lat = float(subpoint.latitude.degrees)
            lon = float(subpoint.longitude.degrees)
            alt = float(subpoint.elevation.km)

            # generate orbit path (next 90 min = one orbit approx)
            orbit_lats, orbit_lons = [], []
            for minutes in range(0, 95, 3):
                t_step = ts.utc(
                    datetime.now(timezone.utc).year,
                    datetime.now(timezone.utc).month,
                    datetime.now(timezone.utc).day,
                    datetime.now(timezone.utc).hour,
                    datetime.now(timezone.utc).minute + minutes
                )
                try:
                    g = sat.at(t_step).subpoint()
                    orbit_lats.append(float(g.latitude.degrees))
                    orbit_lons.append(float(g.longitude.degrees))
                except:
                    pass

            results.append({
                "name": name,
                "lat": lat,
                "lon": lon,
                "alt_km": round(alt, 1),
                "orbit_lats": orbit_lats,
                "orbit_lons": orbit_lons,
                "norad_id": l1[2:7].strip()
            })
        except Exception as e:
            print(f"Error processing {name}: {e}")

    return results if results else get_mock_positions()

def get_mock_positions():
    """Fallback mock data if CelesTrak is unreachable"""
    import random
    mocks = [
        {"name": "CARTOSAT-3", "lat": 23.5, "lon": 80.2, "alt_km": 509.0},
        {"name": "EOS-04",      "lat": -12.3, "lon": 95.1, "alt_km": 529.0},
        {"name": "RESOURCESAT-2A","lat": 45.1,"lon": 110.3,"alt_km": 817.0},
        {"name": "OCEANSAT-3",  "lat": 8.7,  "lon": 65.4, "alt_km": 742.0},
        {"name": "RISAT-2BR1",  "lat": -33.2,"lon": 145.6,"alt_km": 556.0},
    ]
    results = []
    for m in mocks:
        orbit_lats = [m["lat"] + math.sin(i * 0.3) * 30 for i in range(32)]
        orbit_lons = [(m["lon"] + i * 11.25) % 360 - 180 for i in range(32)]
        results.append({**m, "orbit_lats": orbit_lats, "orbit_lons": orbit_lons, "norad_id": "XXXXX"})
    return results