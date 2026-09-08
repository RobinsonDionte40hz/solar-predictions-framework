# Solar Prediction Framework

**Real-time solar flare and geomagnetic storm prediction system**

Author: Dionte Robinson  
Track Record: **88% accuracy** (223/254 points across 27 scored predictions)

**Live dashboard:** https://robinsondionte40hz.github.io/solar-predictions-framework/

---

## What This Does

Predicts solar activity and geomagnetic storms using physics-based analysis:
- **M/X-class flare probability** (24-hour window)
- **CME arrival timing** (typically ±2 hours)
- **Geomagnetic storm intensity** (G-scale)
- **Multi-timescale forecasts** (hours to years)

## Track Record Highlights

| Date | Prediction | Outcome |
|------|------------|---------|
| Feb 14 | CME arrival Feb 16 ~02:33 UTC, G2-G3 | ✓ Storm onset 02:33 UTC, G1-G2 |
| Feb 13 | M1.0 recharge, 1-2 M-class | ✓ M1.0 from AR4373 |
| Feb 4 | No X-class in 3h (post-flare depletion) | ✓ Only M1.8 |
| Feb 3 | No CME impact (no shock at L1) | ✓ Quiet conditions |

Called CME arrival **2 days ahead of NOAA's revised forecast**.

See [PREDICTION_LOG.md](PREDICTION_LOG.md) for complete timestamped record.

---

## Key Innovation

The framework identifies the Sun as a **multi-scale impedance oscillator** with measurable state signatures:

- **σ_log** (sigma-log): Solar cycle bandwidth metric. 1.5 at minimum, ~0.85 at maximum.
- **Hardness ratio**: Pre-flare detection via spectral state transitions (BUILDING → SOFTENING → DISCHARGE)
- **Thermalization index**: Energy storage phase identification
- **Top-down energy budget**: Disk-level constraint on regional flare production

This is **physics-first prediction**, not pattern matching.

---

## Documentation

- [PREDICTION_LOG.md](PREDICTION_LOG.md) — Full prediction history with scores
- [docs/SOLAR_SIGMA_LOG_DISCOVERY.md](docs/SOLAR_SIGMA_LOG_DISCOVERY.md) — Core theory paper
- [docs/SOLAR_IMPEDANCE_THEORY.md](docs/SOLAR_IMPEDANCE_THEORY.md) — Impedance matching framework
- [docs/MAGNETOSPHERIC_SATURATION_PAPER.md](docs/MAGNETOSPHERIC_SATURATION_PAPER.md) — Geomagnetic response model
- [output/samples/](output/samples/) — Example prediction outputs

## Dashboard

`dashboard/` is a static, dependency-free site (navy / light-yellow) showing current conditions, the
24-hour forecast, Earth-directed CMEs, active regions, trends, and the scored track record.
It reads `dashboard/data/{latest,history,log}.json`, which `scripts/build_dashboard.py` generates.

`.github/workflows/pages.yml` runs hourly: it checks out the private prediction engine (via the
`ENGINE_TOKEN` secret), runs a fresh prediction, rebuilds the data files, commits them, and deploys to
GitHub Pages. Without the secret it still deploys from the last committed data.

```bash
python scripts/build_dashboard.py --output path/to/engine/output
python -m http.server 8765 --directory dashboard   # preview
```

---

## Technical Skills Demonstrated

- **Python**: Data pipelines, API integration, real-time analysis
- **Scientific Computing**: NumPy, SciPy, NetCDF4, statistical modeling
- **Domain Expertise**: Space weather, heliophysics, magnetospheric physics
- **Systems Thinking**: Multi-scale dynamics, impedance matching, energy budgets
- **Public Accountability**: Timestamped predictions with transparent scoring

---

## About

This is a portfolio showcase of the prediction framework's results and methodology.

The full implementation (source code, trained models, analysis modules) is proprietary.

For licensing inquiries or collaboration: [Contact via GitHub]

---

Copyright © 2026 Dionte Robinson. All rights reserved.
