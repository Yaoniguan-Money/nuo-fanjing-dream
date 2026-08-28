export interface RuntimeSnapshot {
  activeScenes: number;
  activeRafLoops: number;
  activeGlobalListeners: number;
}

const runtime: RuntimeSnapshot = { activeScenes: 0, activeRafLoops: 0, activeGlobalListeners: 0 };

export function trackScene() {
  runtime.activeScenes += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    runtime.activeScenes -= 1;
  };
}

export function startTrackedRafLoop(
  render: FrameRequestCallback,
  requestFrame: typeof requestAnimationFrame = requestAnimationFrame,
  cancelFrame: typeof cancelAnimationFrame = cancelAnimationFrame
) {
  runtime.activeRafLoops += 1;
  let active = true;
  let frameId = 0;
  const frame: FrameRequestCallback = (time) => {
    if (!active) return;
    render(time);
    frameId = requestFrame(frame);
  };
  frameId = requestFrame(frame);
  return () => {
    if (!active) return;
    active = false;
    cancelFrame(frameId);
    runtime.activeRafLoops -= 1;
  };
}

export function addTrackedListener(
  target: Pick<EventTarget, "addEventListener" | "removeEventListener">,
  type: string,
  listener: EventListener
) {
  target.addEventListener(type, listener);
  runtime.activeGlobalListeners += 1;
  let removed = false;
  return () => {
    if (removed) return;
    removed = true;
    target.removeEventListener(type, listener);
    runtime.activeGlobalListeners -= 1;
  };
}

export function getThresholdRuntimeSnapshot(): RuntimeSnapshot {
  return { ...runtime };
}
