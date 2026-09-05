export interface CollectionFlightRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface CollectionFlightTransform {
  x: number;
  y: number;
  scale: number;
}

export function calculateCollectionFlight(
  source: CollectionFlightRect,
  target: CollectionFlightRect
): CollectionFlightTransform {
  const sourceCenterX = source.left + source.width / 2;
  const sourceCenterY = source.top + source.height / 2;
  const targetCenterX = target.left + target.width / 2;
  const targetCenterY = target.top + target.height / 2;
  const hasSourceSize = source.width > 0 && source.height > 0;

  return {
    x: targetCenterX - sourceCenterX,
    y: targetCenterY - sourceCenterY,
    scale: hasSourceSize ? Math.min(target.width / source.width, target.height / source.height) : 1
  };
}

export function collectionFlightTiming(reducedMotion: boolean): { travelMs: number; settleMs: number } {
  return reducedMotion ? { travelMs: 0, settleMs: 0 } : { travelMs: 700, settleMs: 400 };
}
