export type NavItem = {
  href: string;
  title: string;
  short: string;
  description: string;
  icon:
    | "activity"
    | "shield"
    | "waves"
    | "route"
    | "rotate"
    | "layers"
    | "trend"
    | "cylinder"
    | "flask"
    | "link"
    | "zap"
    | "calculator"
    | "plot"
    | "report"
    | "book";
  tags: string[];
};

export type NavGroup = { label: string; items: NavItem[] };

export const NAV: NavGroup[] = [
  {
    label: "Learn",
    items: [
      {
        href: "/learn",
        title: "Learning Center",
        short: "Learning Center",
        description:
          "Build drilling engineering understanding through guided lessons, worked examples, knowledge checks and simulator practice.",
        icon: "book",
        tags: ["Guided lessons", "Knowledge checks", "Practice"],
      },
    ],
  },
  {
    label: "Simulate",
    items: [
      {
        href: "/simulator",
        title: "Live Rig Simulator",
        short: "Rig Simulator",
        description:
          "Drill a well in real time. Steer WOB, RPM, flow and mud weight through a formation column with overpressure, losses and kicks.",
        icon: "activity",
        tags: ["Real-time", "Kick detection", "d-exponent"],
      },
      {
        href: "/well-control",
        title: "Well Control & Kill Sheet",
        short: "Well Control",
        description:
          "Wait & Weight and Driller's method kill sheets with a gas-expansion model of casing, shoe and pit response.",
        icon: "shield",
        tags: ["KMW / ICP / FCP", "MAASP", "Gas migration"],
      },
    ],
  },
  {
    label: "Engineer",
    items: [
      {
        href: "/hydraulics",
        title: "Drilling Hydraulics",
        short: "Hydraulics",
        description:
          "API power-law pressure losses, bit hydraulics, ECD and flow-rate optimization for max HHP or jet impact.",
        icon: "waves",
        tags: ["Power law", "ECD", "Nozzles"],
      },
      {
        href: "/trajectory",
        title: "Well Trajectory",
        short: "Trajectory",
        description:
          "Plan J, S and horizontal wells, compute surveys by minimum curvature and inspect them in 3D.",
        icon: "route",
        tags: ["Min. curvature", "DLS", "3D view"],
      },
      {
        href: "/well-plot",
        title: "Well Plotter",
        short: "Well Plotter",
        description:
          "Enter or paste your own MD, inclination, azimuth, TVD and vertical section to draw a well diagram with casing, tops and targets.",
        icon: "plot",
        tags: ["Your data", "Well diagram", "Survey QC"],
      },
      {
        href: "/torque-drag",
        title: "Torque & Drag",
        short: "Torque & Drag",
        description:
          "Soft-string model for pick-up, slack-off and rotating loads with broomstick plots and buckling checks.",
        icon: "rotate",
        tags: ["Johancsik", "Broomstick", "Buckling"],
      },
      {
        href: "/casing",
        title: "Casing Design",
        short: "Casing Design",
        description:
          "Burst, collapse and tension load lines against API ratings with biaxial correction and grade selection.",
        icon: "layers",
        tags: ["Burst", "Collapse", "Tension"],
      },
      {
        href: "/pore-pressure",
        title: "Pore Pressure & Fracture Gradient",
        short: "Pore Pressure",
        description:
          "Eaton pore pressure from sonic logs, fracture gradient, mud-weight window and casing seat selection.",
        icon: "trend",
        tags: ["Eaton", "Mud window", "Casing seats"],
      },
      {
        href: "/cementing",
        title: "Cementing",
        short: "Cementing",
        description:
          "Slurry volumes, sacks and mix water, displacement and a U-tube pressure simulation of the job.",
        icon: "cylinder",
        tags: ["Slurry", "Displacement", "U-tube"],
      },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        href: "/reports",
        title: "Daily Drilling Reports",
        short: "Daily Reports",
        description:
          "Learn to read and write a daily drilling report: annotated examples from a training well, a writing guide and a guided editor.",
        icon: "report",
        tags: ["DDR", "Time log", "IADC codes"],
      },
    ],
  },
  {
    label: "Calculate",
    items: [
      {
        href: "/volumes",
        title: "Volumes & Capacities",
        short: "Volumes",
        description:
          "String, annular and pit volumes, pump output, bottoms-up and circulation strokes and times.",
        icon: "flask",
        tags: ["Capacity", "Strokes", "Lag time"],
      },
      {
        href: "/drillstring",
        title: "Drill String & BHA",
        short: "Drill String",
        description:
          "Buoyancy, BHA length for target WOB, neutral point, tension profile and margin of overpull.",
        icon: "link",
        tags: ["Neutral point", "MOP", "Buoyancy"],
      },
      {
        href: "/rop",
        title: "ROP Optimizer",
        short: "ROP Optimizer",
        description:
          "Bourgoyne-Young penetration model with bit-wear economics to find the minimum cost per foot.",
        icon: "zap",
        tags: ["Bourgoyne-Young", "Cost/ft", "MSE"],
      },
      {
        href: "/toolbox",
        title: "Toolbox",
        short: "Toolbox",
        description: "Oilfield unit converter and a searchable reference of drilling formulas.",
        icon: "calculator",
        tags: ["Units", "Formulas"],
      },
    ],
  },
];

export const ALL_ITEMS = NAV.flatMap((g) => g.items.map((i) => ({ ...i, group: g.label })));
