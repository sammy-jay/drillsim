import {
  Activity,
  BookOpen,
  Calculator,
  ChartSpline,
  ClipboardList,
  Cylinder,
  FlaskConical,
  Layers,
  Link2,
  RotateCw,
  Route,
  ShieldAlert,
  TrendingUp,
  Waves,
  Zap,
  type LucideProps,
} from "lucide-react";
import type { NavItem } from "@/lib/nav";

const MAP = {
  activity: Activity,
  shield: ShieldAlert,
  waves: Waves,
  route: Route,
  rotate: RotateCw,
  layers: Layers,
  trend: TrendingUp,
  cylinder: Cylinder,
  flask: FlaskConical,
  link: Link2,
  zap: Zap,
  calculator: Calculator,
  plot: ChartSpline,
  report: ClipboardList,
  book: BookOpen,
} as const;

export function NavIcon({ name, ...props }: { name: NavItem["icon"] } & LucideProps) {
  const Icon = MAP[name];
  return <Icon {...props} />;
}
