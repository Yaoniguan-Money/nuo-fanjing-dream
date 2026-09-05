import Image from "next/image";
import type { CSSProperties } from "react";
import { getFaceData, RITUAL_MASK_THUMBNAILS } from "@/domain/get-face";
import "./ritual-confirmation-board.css";

const sceneLabels = ["八面候坛", "匹配命中", "故事收束"] as const;

function orbitStyle(index: number): CSSProperties {
  const angle = -90 + index * 45;
  const radians = angle * Math.PI / 180;
  const y = Math.sin(radians);
  return {
    "--mask-x": `${50 + Math.cos(radians) * 36}%`,
    "--mask-y": `${48 + y * 31}%`,
    "--mask-scale": String((0.78 + (y + 1) * 0.12) * (index === 6 ? .72 : 1)),
    "--mask-z": String(Math.round((y + 1) * 10))
  } as CSSProperties;
}

function MaskOrbit({ scene }: { scene: (typeof sceneLabels)[number] }) {
  const selected = scene !== "八面候坛";
  return <div className={`ritual-board__orbit${selected ? " is-selected" : ""}`}>
    {getFaceData.masks.map((mask, index) => <div
      className={`ritual-board__mask${selected && index === 0 ? " is-hit" : ""}`}
      data-testid="ritual-mask"
      data-mask-id={mask.id}
      key={mask.id}
      style={orbitStyle(index)}
    >
      <Image src={RITUAL_MASK_THUMBNAILS[index] ?? mask.asset} alt="" fill sizes="18vw" priority={index < 4} unoptimized />
    </div>)}
  </div>;
}

function Scene({ index, label }: { index: number; label: (typeof sceneLabels)[number] }) {
  const letter = String.fromCharCode(65 + index);
  return <section className="ritual-board__scene" role="region" aria-label={label}>
    <header><span>{letter}</span><strong>{label}</strong></header>
    <div className="ritual-board__altar" aria-hidden="true" />
    <MaskOrbit scene={label} />
    {label === "匹配命中" ? <div className="ritual-board__copy"><small>此面与你所问相照</small><strong>开路将军</strong><span>职司 · 开障引路</span><b className="ritual-board__hanging-cta ritual-board__hanging-cta--enter">入 戏</b></div> : null}
    {label === "故事收束" ? <div className="ritual-board__copy ritual-board__copy--collect"><small>幻梦已尽 · 得面已成</small><strong>开路将军</strong><span>职司 · 开障引路</span><b className="ritual-board__hanging-cta ritual-board__hanging-cta--collect">收 录 此 面</b><i aria-hidden="true" /></div> : null}
    {label === "八面候坛" ? <div className="ritual-board__seal">八面依次候坛<br /><span>45° 等距 · 真素材</span></div> : null}
    <footer><Image src="/dream-assets/brand/nuo-dream-logo-cover-clean.png" alt="大傩幻梦" width={344} height={126} /></footer>
  </section>;
}

export function RitualConfirmationBoard() {
  return <main className="ritual-board">
    {sceneLabels.map((label, index) => <Scene key={label} index={index} label={label} />)}
  </main>;
}
