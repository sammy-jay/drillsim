# DrillSim — Drilling Engineering Simulation Suite

Interactive drilling-engineering simulations and design tools built with Next.js 16, React 19, TypeScript and Tailwind CSS v4. Everything runs in the browser in oilfield units (ft, ppg, psi, gpm, bbl) — hover or focus any unit symbol to see what it means and how it converts.

## Modules

| Route | Module | Highlights |
| --- | --- | --- |
| `/simulator` | Live Rig Simulator | Real-time drilling with WOB/RPM/flow/MW controls, Bourgoyne-Young ROP, bit wear, auto connections, lag-tracked gas, kicks, losses, shut-in and an automated Wait & Weight kill, d-exponent mud log, three scenarios |
| `/well-control` | Well Control & Kill Sheet | KMW, ICP/FCP, MAASP, influx type, step-down schedule, single-bubble Boyle's-law kill simulation comparing Wait & Weight vs Driller's |
| `/hydraulics` | Drilling Hydraulics | API RP 13D power-law losses, bit hydraulics (TFA, HSI, jet velocity, impact), ECD, flow sweep, nozzle optimization |
| `/trajectory` | Well Trajectory | J / S / horizontal planners, minimum-curvature surveys, editable survey table, orbitable 3D view, section/plan/DLS |
| `/well-plot` | Well Plotter | Enter or paste MD / Inc / Azi (+ optional TVD, VSec, N/S, E/W) to draw a true-scale well diagram with casing, formation tops and targets; plan, 3D, inclination and DLS views; QC of entered values against minimum curvature; CSV export |
| `/torque-drag` | Torque & Drag | Johancsik soft-string model, broomstick plot, axial force & torque profiles, sinusoidal/helical buckling |
| `/casing` | Casing Design | Burst / collapse / tension load lines, design factors, API biaxial collapse, grade screening |
| `/pore-pressure` | Pore Pressure & Frac Gradient | Synthetic sonic log, Eaton pore pressure and fracture gradient, mud window, bottom-up casing seats |
| `/cementing` | Cementing | Lead/tail volumes, sacks, mix water, displacement, animated job with U-tube pressure |
| `/reports` | Daily Drilling Reports | Three annotated example DDRs from a training well (drilling, casing & cement, kick & kill), a section-by-section reading guide, writing rules, abbreviations, IADC codes and dull grading, plus a guided editor that saves your own reports in the browser and prints to PDF |
| `/volumes` | Volumes & Capacities | Pump output, string/annular volumes, strokes & lag, AV, trip-tank fill, slug design |
| `/drillstring` | Drill String & BHA | Buoyancy, BHA length, neutral point, MOP, tension profile |
| `/rop` | ROP Optimizer | Bourgoyne-Young model, bit-wear economics, WOB × RPM cost-per-foot map, MSE |
| `/toolbox` | Toolbox | Oilfield ↔ SI unit converter and searchable formula reference |

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build (all routes prerender statically)
npm run lint
```

## Project layout

```
src/
  app/                 routes (one folder per module) + root layout
  components/
    charts/            XYChart (crosshair, table view, depth mode), Gauge, Heatmap, Trajectory3D
    modules/           one client component per engineering module
    sim/               live simulator UI, store and formation column
    shell/             sidebar, mobile nav, theme toggle
    ui/                panels, fields, stats, tables
  lib/
    calc/              pure engineering calculations (hydraulics, well control, casing, …)
    sim/               rig simulator engine and scenarios
```

The calculation libraries in `src/lib/calc` are framework-free TypeScript and can be reused or tested on their own.

## Learning progress storage

Learning progress is saved in the browser by default. To enable MongoDB sync, copy `.env.example` to `.env.local`, replace the placeholder URI with your MongoDB connection string, then restart the dev server. The URI is only read by the server. `MONGODB_DB` defaults to `drillsim`.

Progress is associated with a random ID stored in the browser, not a user account. Different browsers and devices will have separate progress until authentication is added.

## Disclaimer

DrillSim is an educational tool. Models are simplified and catalog data is representative; verify against company standards and manufacturer data before any operational use.
