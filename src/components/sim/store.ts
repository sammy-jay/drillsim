import { createSim, simAction, stepSim, type SimAction, type SimState } from "@/lib/sim/engine";

/** Mutable simulation wrapped as an external store (rendered at ~10 Hz). */
export class SimStore {
  sim: SimState;
  version = 0;
  private listeners = new Set<() => void>();
  private lastNotify = 0;

  constructor(id: string) {
    this.sim = createSim(id);
  }

  subscribe = (l: () => void) => {
    this.listeners.add(l);
    return () => {
      this.listeners.delete(l);
    };
  };

  getVersion = () => this.version;

  notify = () => {
    this.version++;
    this.listeners.forEach((l) => l());
  };

  advance(simSeconds: number, now: number) {
    stepSim(this.sim, simSeconds);
    if (now - this.lastNotify > 100 || this.sim.ended) {
      this.lastNotify = now;
      this.notify();
    }
  }

  reset(id: string) {
    this.sim = createSim(id);
    this.notify();
  }

  act(a: SimAction) {
    simAction(this.sim, a);
    this.notify();
  }

  setCtrl(patch: Partial<SimState["ctrl"]>) {
    Object.assign(this.sim.ctrl, patch);
    this.notify();
  }
}
