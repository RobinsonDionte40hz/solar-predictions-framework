# Prediction Workflow

## Running a Prediction

```bash
cd c:\Users\ROB\Files\Projects\solar-predictions-1
python -m src.prediction.runner
```

One command. Fetches all data, runs the full analysis, prints the report, saves JSON to `output/`.

## What the Predictor Covers

### Flare Forecast (24-hour)
- M-class range and expected count
- X-class probability
- C-class baseline
- Primary source region and energy share
- Disk topology (FOCUSED / DISTRIBUTED / QUIET)
- Per-region M/X probabilities

### Disk Energy Budget
- σ_log (30-day channel bandwidth)
- F10.7 solar radio flux
- Hardness ratio + thermalization index
- Production momentum (7-day trend)
- Energy state and estimator agreement

### Geomagnetic Conditions (L1 Nowcast)
- Solar wind speed, density
- IMF Bz, Bt
- Electric field (mV/m)
- Kp estimate and G-scale
- Dst steady-state estimate

### CME Watch
- Earth-directed CMEs with impact probability
- Arrival time windows (drag-corrected ballistic model)
- Expected G-scale from CME speed
- Threat level: NONE / WATCH / WARNING

### Geomagnetic Forecast (CME arrivals)
- Burton equation + saturation model
- Dst range (optimistic / typical / pessimistic)
- G-scale likely vs worst case
- Based on drag-corrected arrival speed

### Radio Blackout (R-scale)
- R0-R5 from current GOES X-ray flux

### Solar Radiation Storm (S-scale)
- S0-S5 from GOES >10 MeV proton flux
- SEP probability from recent flares
- Magnetic connection assessment (Parker spiral)

### Extended Outlook (Multi-Timescale)
Framework-derived multi-timescale forecasting beyond the 24-hour window.

#### MICRO (0-6 hours)
- Cascade/burst detection from inter-flare timing
- Burst continuation probability (cascade statistics: r=0.387, burst mean 3.4)
- Post-flare recharge progress tracking

#### MESO (1-3 days)
- Thermalization cycle state: CHARGING → STORAGE → THRESHOLD → DISCHARGE → RECOVERY
- M-class recharge window (35h median) and X-class recharge (76h median)
- Activity risk assessment from combined cycle + recharge status

#### ROTATION (11-27 days)
- Far-side region return dates from Carrington rotation (27.3 days)
- Historical production record carried into far side
- HIGH/MODERATE/LOW activity expectation on return

#### CYCLE (months-years)
- σ_log trajectory from accelerating recovery model
- Yearly activity envelope (expected M/day, X probability)
- Estimated minimum year with calibrated uncertainty

## Saved Output

Each run saves a JSON to `output/unified_prediction_YYYYMMDD_HHMM.json` containing:
- `prediction` — flare forecast numbers
- `budget` — disk energy budget
- `sigma_log` — σ_log computation
- `f107` — F10.7 value
- `hardness` — ratio, state, pattern
- `production` — 7-day M-class rates and trend
- `topology` — FOCUSED/DISTRIBUTED/QUIET + dominant region
- `region_predictions` — per-region shares and probabilities
- `xray` — current flux and class
- `solar_wind` — speed, density, temperature
- `imf` — Bz, Bt
- `flare_counts` — 7-day daily counts by class
- `recent_flares` — per-flare detail (class, time, region, location)
- `cme_analysis` — Earth-directed CMEs, threat level, arrival windows
- `geo_nowcast` — L1 conditions, G-scale, Dst estimate
- `geo_forecast` — CME-based storm predictions
- `r_scale` — radio blackout level
- `proton_environment` — S-scale, SEP probability
- `extended_forecast` — multi-timescale outlook (micro, meso, rotation, cycle)

## Prediction → Score Workflow

1. **Run predictor**: `python -m src.prediction.runner`
2. **Post to X**: Draft from output (250 char limit)
3. **Log in PREDICTION_LOG.md**: Record prediction with timestamp
4. **Wait for outcome window** (usually 24-48 hours)
5. **Re-run predictor** to get updated flare data
6. **Score**: Compare outcomes against prediction criteria
7. **Update PREDICTION_LOG.md**: Fill in OUTCOME, SCORE, STATUS
8. **Update README.md**: Running accuracy stats

## Git Push

```bash
git add -A
git commit -m "Prediction #NNN: [brief description]"
git push origin main
```

## Architecture

```
src/
├── prediction/
│   ├── runner.py              # CLI entry point
│   └── unified_predictor.py   # THE prediction engine (16 steps)
├── fetchers/
│   └── solar_data.py          # All external data (DONKI, SWPC, GOES)
├── analysis/
│   ├── disk_energy.py         # Top-down energy budget
│   ├── region_tracker.py      # Bottom-up region analysis
│   ├── cme_analysis.py        # CME Earth-directedness + transit
│   ├── geo_impact.py          # Geomagnetic impact (Burton eq.)
│   ├── proton_analysis.py     # Solar radiation storms (S-scale)
│   ├── cascade_forecast.py    # Burst detection + cascade dynamics
│   ├── thermalization.py      # Thermalization cycle state
│   ├── recharge_estimator.py  # M/X-class recharge windows
│   ├── rotation_return.py     # Far-side region return tracker
│   ├── sigma_trajectory.py    # σ_log multi-year projection
│   └── extended_forecast.py   # Multi-timescale forecast combiner
└── core/
    ├── constants.py            # Framework constants
    └── sigma_log.py            # σ_log computation
```
