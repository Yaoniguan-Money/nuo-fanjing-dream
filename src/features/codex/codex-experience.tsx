"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, RefObject } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import { MaskReliefViewer } from "./mask-relief-viewer";
import type { CodexCollection, CodexEntry, StorageLike } from "@/domain/codex";
import { createCodexCollection } from "@/domain/codex";
import { faceData, getCodexDetail, type FaceData, type FaceMask } from "@/domain/get-face";
import { normalizeCodexEntry, type CodexEntryInput } from "@/domain/codex";
import { buildCodexSlots, collectedCount, codexNumber, slotLabel, type CodexSlotView } from "./codex-model";
import "./codex.css";

export interface CodexExperienceProps {
  data?: FaceData;
  entries?: Record<string, CodexEntry>;
  collection?: CodexCollection;
  storage?: StorageLike;
  onRestart?: () => void;
  newlyCollectedMaskId?: string;
  initiallyOpenMaskId?: string;
  demoMode?: boolean;
}

type PresentationState = "empty" | "selected" | "opening" | "revealed";

function defaultStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

function codexGlyph(mask: FaceMask | null): string {
  return mask?.visual.card.glyph === "mountain" ? "⌁" : mask?.visual.card.glyph === "knot" ? "∞" : mask?.visual.card.glyph === "scale" ? "⚖" : mask?.visual.card.glyph === "lamp" ? "◉" : "?";
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const DEMO_ROLE_OVERRIDES: Record<string, { name: string; duty: string; background: string; reason: string }> = {
  "crown-beard": { name: "开路将军", duty: "勇气与开始", background: "德江傩堂戏开路将军的开障引路职司。", reason: "先迈出一步，再让路显现。" },
  "square-crown": { name: "先锋小姐", duty: "建立边界、拒绝强迫", background: "以先锋小姐的端正面相与先行职司为视觉母体。", reason: "你可以在靠近之前先认领自己的决定。" },
  "bound-hair": { name: "九位土地神", duty: "同辈比较与寻找位置", background: "以土地神亲近、稳重的共同母型表现九方分职。", reason: "你无需挤进别人的坛位，先找到自己所守的一方。" },
  "high-crown": { name: "唐氏太婆", duty: "被否定后的自我重建", background: "以唐氏太婆的温和老者面相表现守界与自我重建。", reason: "温和与拒绝可以同时成立，你仍能重新定义自己。" }
};

function buildDemoEntries(data: FaceData): Record<string, CodexEntry> {
  return Object.fromEntries(data.masks.map((mask, maskIndex) => {
    const fallbackRole = data.roles.find((candidate) => candidate.name === mask.name) ?? data.roles.find((candidate) => candidate.maskIndex === maskIndex) ?? data.roles[0];
    const override = DEMO_ROLE_OVERRIDES[mask.id];
    const role = override ? { ...fallbackRole, ...override } : fallbackRole;
    const input: CodexEntryInput = {
      mask: { id: mask.id, name: mask.name, asset: mask.asset, visual: mask.visual },
      role: { id: role.id, name: role.name, duty: role.duty, kind: role.kind, signs: role.signs, background: role.background },
      visualText: "演示版卡面资产预览：用于检验图鉴点亮、翻转与详情页联动。",
      reasonText: role.reason,
      sources: role.sources.map((id) => data.sources.find((source) => source.id === id)).filter(Boolean),
      omen: { status: "demo", qian: "此面已至，先看清再前行。", grade: "演示签", interpretation: "这是一条用于演示图鉴交互的傩解。", reflection: "收录面具，回到自己的故事。" }
    };
    return [mask.id, normalizeCodexEntry(input)];
  }).filter((item): item is [string, CodexEntry] => Boolean(item[1])));
}

const SLOT_NAMES = ["开路将军", "先锋小姐", "唐氏太婆", "勾簿判官", "扫地和尚", "九位土地神", "柳毅", "阿布摩"] as const;
const STORY_PATHS = [
  ["开路将军", "dream.kailu-jiangjun.du-shan-ji"],
  ["先锋小姐", "dream.xianfeng-xiaojie.qian-jie-qiao"],
  ["九位土地神", "dream.jiu-wei-tu-di-shen.di-jiu-tan"],
  ["唐氏太婆", "dream.tangshi-taipo.zhi-hun-ji"]
] as const;

type DetailCallout = { label: string; note: string };
const DETAIL_CALLOUTS: Record<string, DetailCallout[]> = {
  "开路将军": [
    { label: "额冠与角翅", note: "楔入山隙" },
    { label: "暴眼、竖眉与獠牙", note: "先行动，再成路" },
    { label: "背面系绳与木纹", note: "戴起，召回力量" },
  ],
  "先锋小姐": [
    { label: "凤冠与额带", note: "愿已认领" },
    { label: "弯眉、秀目与微收唇", note: "作出决定" },
    { label: "发带封签纹样", note: "朱印封愿" },
  ],
  "九位土地神": [
    { label: "长耳、安详眼与眉骨", note: "安住其位" },
    { label: "帽饰与九方印", note: "各归其位" },
    { label: "活动眼与下颌连接", note: "分职逐一唤醒" },
  ],
  "唐氏太婆": [
    { label: "发髻与门环", note: "内外两层门槛" },
    { label: "眼尾、皱纹与缺齿笑意", note: "温和，也可拒绝" },
    { label: "木面剥落与系绳结", note: "缝合，封存" },
  ],
  "勾簿判官": [
    { label: "官帽与中轴额纹", note: "落座，点名" },
    { label: "火焰眉、凸眼与獠牙", note: "核验旧事" },
    { label: "朱笔勾销痕与印记", note: "散乱归档" },
  ],
  "扫地和尚": [
    { label: "额部鼓包与圆脸", note: "保留民间诙谐" },
    { label: "笑口、大耳与下颌弧线", note: "扫尽余响" },
    { label: "竹帚纤维与尘环", note: "中央留净" },
  ],
  "阿布摩": [
    { label: "黑木横向白波纹", note: "地层、风雪与年轮" },
    { label: "圆锥包头、长鼻与无口", note: "沉默地背负" },
    { label: "白须、种袋与少量谷粒", note: "荒年留种" },
  ],
  "柳毅": [
    { label: "方巾冠帽与横向层叠", note: "书生身份与端正气度" },
    { label: "垂眼、直鼻与收唇", note: "倾听，传递，不越界" },
    { label: "双束长髭与旧漆木纹", note: "一诺渡水，守住真意" },
  ],
};

const DEFAULT_DETAIL_CALLOUTS: DetailCallout[] = [
  { label: "主要纹样", note: "职司线索" },
  { label: "面部结构", note: "角色神韵" },
  { label: "材质细节", note: "佩戴痕迹" },
];

const DETAIL_ASSETS: Record<string, { mainMask: string; originalMask: string; background: string; callouts?: string[] }> = {
  "crown-beard": { mainMask: "/dream-assets/ui/codex/details/kailu-jiangjun/main-mask-v3.png", originalMask: "/dream-assets/ui/codex/mask-original/crown-beard.jpg", background: "/dream-assets/ui/codex/details/kailu-jiangjun/atmosphere.png", callouts: ["/dream-assets/ui/codex/details/kailu-jiangjun/callouts/crown-earwings.png", "/dream-assets/ui/codex/details/kailu-jiangjun/callouts/fierce-eyes.png", "/dream-assets/ui/codex/details/kailu-jiangjun/callouts/back-rope-wood.png"] },
  "square-crown": { mainMask: "/dream-assets/ui/codex/details/xianfeng-xiaojie/main-mask.png", originalMask: "/dream-assets/ui/codex/mask-original/square-crown.jpg", background: "/dream-assets/ui/codex/details/xianfeng-xiaojie/atmosphere.png", callouts: ["/dream-assets/ui/codex/details/xianfeng-xiaojie/callouts/hairband.png", "/dream-assets/ui/codex/details/xianfeng-xiaojie/callouts/eyes.png", "/dream-assets/ui/codex/details/xianfeng-xiaojie/callouts/aged-paint.png"] },
  "bound-hair": { mainMask: "/dream-assets/ui/codex/details/yabing-tudi/main-mask.png", originalMask: "/dream-assets/ui/codex/mask-original/bound-hair.jpg", background: "/dream-assets/ui/codex/details/yabing-tudi/atmosphere.png", callouts: ["/dream-assets/ui/codex/details/yabing-tudi/callouts/five-peak-crown.png", "/dream-assets/ui/codex/details/yabing-tudi/callouts/eye-hollows.png", "/dream-assets/ui/codex/details/yabing-tudi/callouts/fiber-beard.png"] },
  "high-crown": { mainMask: "/dream-assets/ui/codex/details/tangshi-taipo/main-mask-v2.png", originalMask: "/dream-assets/ui/codex/mask-original/high-crown.jpg", background: "/dream-assets/ui/codex/details/tangshi-taipo/atmosphere.png", callouts: ["/dream-assets/ui/codex/details/tangshi-taipo/callouts/cap-emblem.png", "/dream-assets/ui/codex/details/tangshi-taipo/callouts/smile-ears.png", "/dream-assets/ui/codex/details/tangshi-taipo/callouts/teeth-smile.png"] },
  "gou-bu-pan-guan": { mainMask: "/dream-assets/ui/codex/details/gou-bu-pan-guan/main-mask.png", originalMask: "/dream-assets/ui/codex/mask-original/gou-bu-pan-guan.jpg", background: "/dream-assets/ui/codex/details/gou-bu-pan-guan/atmosphere.png", callouts: ["/dream-assets/ui/codex/details/gou-bu-pan-guan/callouts/official-hat.png", "/dream-assets/ui/codex/details/gou-bu-pan-guan/callouts/brow-orbits.png", "/dream-assets/ui/codex/details/gou-bu-pan-guan/callouts/teeth-line.png"] },
  "sao-di-he-shang": { mainMask: "/dream-assets/ui/codex/details/sao-di-he-shang/main-mask.png", originalMask: "/dream-assets/ui/codex/mask-original/sao-di-he-shang.jpg", background: "/dream-assets/ui/codex/details/sao-di-he-shang/atmosphere.png", callouts: ["/dream-assets/ui/codex/details/sao-di-he-shang/callouts/rounded-brow.png", "/dream-assets/ui/codex/details/sao-di-he-shang/callouts/curved-eyes.png", "/dream-assets/ui/codex/details/sao-di-he-shang/callouts/smile-mouth.png"] },
  "liu-yi": { mainMask: "/dream-assets/ui/codex/details/liu-yi/main-mask.png", originalMask: "/dream-assets/ui/codex/mask-original/liu-yi.jpg", background: "/dream-assets/ui/codex/details/liu-yi/atmosphere.png", callouts: ["/dream-assets/ui/codex/details/liu-yi/callouts/headscarf.png", "/dream-assets/ui/codex/details/liu-yi/callouts/features.png", "/dream-assets/ui/codex/details/liu-yi/callouts/moustache.png"] },
  "abu-mo": { mainMask: "/dream-assets/ui/codex/details/abu-mo/main-mask.png", originalMask: "/dream-assets/ui/codex/mask-original/abu-mo.png", background: "/dream-assets/ui/codex/details/abu-mo/atmosphere.png", callouts: ["/dream-assets/ui/codex/details/abu-mo/callouts/white-headwrap.png", "/dream-assets/ui/codex/details/abu-mo/callouts/white-nose.png", "/dream-assets/ui/codex/details/abu-mo/callouts/beard-fibers.png"] }
};

type RelatedAsset = { label: string; note: string; src: string; originalSrc: string };

const RELATED_ASSETS: Record<string, RelatedAsset[]> = {
  "crown-beard": [
    { label: "令旗", note: "故事一仪式旗具", src: "/dream-assets/ui/codex/related/kailu-jiangjun/lingqi.png", originalSrc: "/dream-assets/ui/codex/related-original/kailu-jiangjun/lingqi.jpg" },
    { label: "开山斧", note: "开障动作溯源", src: "/dream-assets/ui/codex/related/kailu-jiangjun/kaishanfu-clean.png", originalSrc: "/dream-assets/ui/codex/related-original/kailu-jiangjun/kaishanfu.jpg" },
    { label: "诸神图傩案图", note: "开洞场域图录", src: "/dream-assets/ui/codex/related/kailu-jiangjun/zhushen-altar.png", originalSrc: "/dream-assets/ui/codex/related-original/kailu-jiangjun/zhushen-altar.jpg" }
  ],
  "square-crown": [
    { label: "令旗", note: "先锋号令语汇", src: "/dream-assets/ui/codex/related/xianfeng-xiaojie/lingqi.png", originalSrc: "/dream-assets/ui/codex/related-original/xianfeng-xiaojie/lingqi.jpg" },
    { label: "令牌", note: "愿已认领", src: "/dream-assets/ui/codex/related/xianfeng-xiaojie/lingpai.png", originalSrc: "/dream-assets/ui/codex/related-original/xianfeng-xiaojie/lingpai.jpg" },
    { label: "木鱼", note: "故事二节奏道具", src: "/dream-assets/ui/codex/related/xianfeng-xiaojie/muyu.png", originalSrc: "/dream-assets/ui/codex/related-original/xianfeng-xiaojie/muyu.jpg" }
  ],
  "bound-hair": [
    { label: "傩案画", note: "九坛空间图录", src: "/dream-assets/ui/codex/related/jiu-wei-tu-di-shen/nuo-altar-painting-clean.png", originalSrc: "/dream-assets/ui/codex/related-original/jiu-wei-tu-di-shen/nuo-altar-painting.jpg" },
    { label: "桥头画", note: "故事三场域图录", src: "/dream-assets/ui/codex/related/jiu-wei-tu-di-shen/qiaotou-painting-clean.png", originalSrc: "/dream-assets/ui/codex/related-original/jiu-wei-tu-di-shen/qiaotou-painting.jpg" }
  ],
  "high-crown": [
    { label: "令牌", note: "故事四仪式物件", src: "/dream-assets/ui/codex/related/tangshi-taipo/lingpai.png", originalSrc: "/dream-assets/ui/codex/related-original/tangshi-taipo/lingpai.jpg" },
    { label: "木鱼", note: "故事四节奏道具", src: "/dream-assets/ui/codex/related/tangshi-taipo/muyu.png", originalSrc: "/dream-assets/ui/codex/related-original/tangshi-taipo/muyu.jpg" },
    { label: "法铃", note: "归魂仪式语汇", src: "/dream-assets/ui/codex/related/tangshi-taipo/faling.png", originalSrc: "/dream-assets/ui/codex/related-original/tangshi-taipo/faling.jpg" }
  ],
  "gou-bu-pan-guan": [
    { label: "令牌", note: "归名与核验", src: "/dream-assets/ui/codex/related/gou-bu-pan-guan/lingpai.png", originalSrc: "/dream-assets/ui/codex/related-original/gou-bu-pan-guan/lingpai.jpg" },
    { label: "师刀", note: "仪式动作图录", src: "/dream-assets/ui/codex/related/gou-bu-pan-guan/shidao-clean.png", originalSrc: "/dream-assets/ui/codex/related-original/gou-bu-pan-guan/shidao.jpg" },
    { label: "傩案画", note: "傩坛关系图录", src: "/dream-assets/ui/codex/related/gou-bu-pan-guan/nuo-altar-painting-clean.png", originalSrc: "/dream-assets/ui/codex/related-original/gou-bu-pan-guan/nuo-altar-painting.jpg" }
  ],
  "sao-di-he-shang": [
    { label: "小钹", note: "扫余节奏", src: "/dream-assets/ui/codex/related/sao-di-he-shang/xiaobo.png", originalSrc: "/dream-assets/ui/codex/related-original/sao-di-he-shang/xiaobo.jpg" },
    { label: "木鱼", note: "净场声响", src: "/dream-assets/ui/codex/related/sao-di-he-shang/muyu.png", originalSrc: "/dream-assets/ui/codex/related-original/sao-di-he-shang/muyu.jpg" },
    { label: "小锣", note: "傩堂音响", src: "/dream-assets/ui/codex/related/sao-di-he-shang/xiaoluo-clean.png", originalSrc: "/dream-assets/ui/codex/related-original/sao-di-he-shang/xiaoluo.jpg" }
  ],
  "abu-mo": [
    { label: "牛角", note: "远处回应", src: "/dream-assets/ui/codex/related/abu-mo/niujiao.png", originalSrc: "/dream-assets/ui/codex/related-original/abu-mo/niujiao.jpg" },
    { label: "诸神图傩案图", note: "仪式空间图录", src: "/dream-assets/ui/codex/related/abu-mo/zhushen-altar.png", originalSrc: "/dream-assets/ui/codex/related-original/abu-mo/zhushen-altar.jpg" }
  ]
};

function CodexCard({ slot, selected, newlyCollected, onOpen }: { slot: CodexSlotView; selected: boolean; newlyCollected: boolean; onOpen: (slot: CodexSlotView, trigger: HTMLButtonElement) => void }) {
  const collected = slot.state === "collected";
  const cardName = collected ? slot.entry?.role.name : SLOT_NAMES[slot.index];
  return <li className={`codex-slot codex-slot-${slot.state} ${collected ? "" : "codex-slot-locked-ui"}${newlyCollected ? " codex-slot-newly-collected" : ""}`} data-state={collected ? "collected" : "locked"} style={{ "--card-a": slot.mask?.visual.card.primary ?? "#61594d", "--card-b": slot.mask?.visual.card.secondary ?? "#766f63" } as CSSProperties}>
    <button
      className={`codex-card ${selected ? "is-selected" : ""}`}
      type="button"
      disabled={!collected}
      aria-label={collected ? slotLabel(slot) : `${cardName}，尚未解锁`}
      aria-pressed={collected ? selected : undefined}
      onClick={(event) => onOpen(slot, event.currentTarget)}
      onKeyDown={(event) => {
        if (collected && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onOpen(slot, event.currentTarget);
        }
      }}
    >
      <span className="codex-card-inner">
        <span className="codex-card-face codex-card-front">
          <span className="codex-card-frame-art" aria-hidden="true" />
          {collected && slot.mask?.artwork?.card ? <Image className={`codex-card-mask codex-card-mask-${slot.mask.id}`} src={slot.mask.artwork.card} alt={`${cardName}面具卡面`} fill sizes="(max-width: 700px) 29vw, (max-width: 900px) 20vw, 14vw" /> : <span className="codex-card-lock-art"><span className="codex-card-glyph">{codexGlyph(slot.mask)}</span><i aria-hidden="true" /></span>}
          <span className="codex-card-veil" />
          <span className="codex-card-index">傩谱 · {codexNumber(slot.index)}</span>
          <span className="codex-card-meta"><strong>{cardName}</strong><span>{collected ? "已收录" : "尚未入戏"}</span></span>
          <span className="codex-card-state" aria-hidden="true">{collected ? "◇" : "锁"}</span>
        </span>
        <span className="codex-card-face codex-card-back" aria-hidden="true">
          <span className="codex-card-back-art" aria-hidden="true" />
          <span className="codex-card-back-title">傩谱封印<small>傩 · 谱 · 封 · 印</small></span>
        </span>
      </span>
  </button>
  </li>;
}

interface CodexDetailProps {
  slot: CodexSlotView | null;
  presentation: PresentationState;
  stageRef: RefObject<HTMLDivElement | null>;
  copyRef: RefObject<HTMLDivElement | null>;
  onClose: () => void;
}

function CodexDetail({ slot, presentation, stageRef, copyRef, onClose }: CodexDetailProps) {
  const closeButton = useRef<HTMLButtonElement>(null);
  const viewerHost = useRef<HTMLDivElement>(null);
  const [viewerFailed, setViewerFailed] = useState(false);
  const [selectedRelated, setSelectedRelated] = useState<RelatedAsset | null>(null);
  const [showRelatedOriginal, setShowRelatedOriginal] = useState(false);
  const [showOriginalMask, setShowOriginalMask] = useState(false);
  const entry = slot?.entry ?? null;
  const mask = slot?.mask ?? null;
  const detailAssets = mask ? DETAIL_ASSETS[mask.id] : null;

  useEffect(() => {
    if (slot) closeButton.current?.focus();
  }, [slot]);

  useEffect(() => {
    const host = viewerHost.current;
    if (!slot || !mask || !host || detailAssets) return;
    setViewerFailed(false);
    const viewer = new MaskReliefViewer(host);
    let cancelled = false;
    viewer.mount(mask).catch(() => {
      if (!cancelled) setViewerFailed(true);
    });
    return () => {
      cancelled = true;
      viewer.dispose();
    };
  }, [slot, mask, detailAssets]);

  const detailCallouts = entry ? DETAIL_CALLOUTS[entry.role.name] ?? DEFAULT_DETAIL_CALLOUTS : DEFAULT_DETAIL_CALLOUTS;
  const detail = mask ? getCodexDetail(mask.id) : null;
  const relatedAssets = mask ? RELATED_ASSETS[mask.id] ?? [] : [];
  return <section className="codex-detail" data-presentation={presentation} role="dialog" aria-modal="true" aria-label={slot && entry && mask ? `${entry.role.name}傩面详情` : "傩面详情"} style={detailAssets ? { "--codex-detail-bg": `url("${detailAssets.background}")` } as CSSProperties : undefined}>
    {slot ? <button ref={closeButton} className="codex-close" type="button" onClick={onClose} aria-label="关闭傩面详情">×</button> : null}
    {!slot || !entry || !mask ? null : <>
      <header className="codex-detail-head">
        <div className="codex-detail-num">第 {codexNumber(slot.index)} 面 · 已收录</div>
        <h3>{detail?.name ?? entry.role.name}</h3>
        <p className="codex-detail-duty">职司 · {detail?.duty ?? entry.role.duty}</p>
      </header>
      <div className="codex-detail-body">
        <aside className="codex-slip-column" aria-label="梦签">
          <div className="codex-slip-placeholder">
            <div className="codex-slip-paper">
              <Image className="codex-slip-art" src="/dream-assets/ui/codex/omen/omen-slip-abu-mo-v2.png" alt="梦签签条底图" fill sizes="(max-width: 760px) 64vw, 250px" />
              <span className="codex-slip-placeholder-label">大傩幻梦 · 梦签</span>
              <span className="codex-slip-kicker">幻 · 梦 · 回 · 响</span>
              <strong className="codex-slip-qian">{detail?.qian ?? entry.omen.qian}</strong>
              <small>请 · 面 · 得 · 签</small>
              <i aria-hidden="true">印</i>
            </div>
          </div>
        </aside>
        <div className="codex-viewer-column">
          <div ref={stageRef} className="codex-viewer-frame">
            <div className="codex-detail-callouts" aria-label="面具细节图占位">
              {detailCallouts.map((detail, index) => <figure className={`codex-callout codex-callout-${index + 1}`} key={detail.label} data-asset-slot={`mask-detail-${index + 1}`}><div className="codex-callout-image">{detailAssets?.callouts?.[index] ? <Image src={detailAssets.callouts[index]} alt="" fill sizes="126px" /> : <span>细节图 {String(index + 1).padStart(2, "0")}</span>}</div><figcaption>{detail.label}<small>{detail.note}</small></figcaption></figure>)}
            </div>
            {detailAssets ? <><div className={`codex-main-mask-art${showOriginalMask ? " is-original" : ""}`} data-mask-side={showOriginalMask ? "original" : "enhanced"}><div className="codex-mask-flip-stage"><span className="codex-mask-face codex-mask-face-enhanced"><Image src={detailAssets.mainMask} alt={showOriginalMask ? "" : `${entry.role.name}优化傩面`} aria-hidden={showOriginalMask} fill sizes="(max-width: 760px) 72vw, 36vw" priority /></span><span className="codex-mask-face codex-mask-face-original"><Image src={detailAssets.originalMask} alt={showOriginalMask ? `${entry.role.name}实物傩面` : ""} aria-hidden={!showOriginalMask} fill sizes="(max-width: 760px) 72vw, 36vw" priority /></span></div></div><button className="codex-mask-flip" type="button" aria-label={showOriginalMask ? "返回优化后的游戏面具" : "查看美化前的实物面具"} aria-pressed={showOriginalMask} onClick={() => setShowOriginalMask((current) => !current)}><span aria-hidden="true">↻</span>{showOriginalMask ? "返回优化面" : "翻看实物面"}</button></> : <div ref={viewerHost} className="codex-mask-viewer" />}
            {!detailAssets && viewerFailed ? <div className="codex-mask-fallback"><Image src={mask.asset} alt={`${entry.role.name}傩面`} width={1086} height={1448} priority /></div> : null}
          </div>
        </div>
        <div ref={copyRef} className="codex-detail-copy">
          <div className="codex-detail-scroll">
            <section className="codex-detail-section codex-interpretation"><span>◇ 签 · 解</span><p className="codex-detail-quote">{detail?.jie ?? entry.omen.jie}</p></section>
            <div className="codex-detail-facts">
              <section className="codex-detail-section"><span>外 · 貌 · 描 · 述</span><p>{detail?.appearance ?? entry.visualText}</p>{relatedAssets.length ? <div className="codex-related-assets"><span>相 · 关 · 图 · 录</span><div className="codex-related-grid">{relatedAssets.map((asset) => <figure key={asset.src}><button type="button" aria-label={`放大图录：${asset.label}`} onClick={() => { setShowRelatedOriginal(false); setSelectedRelated(asset); }}><Image src={asset.src} alt={`${detail?.name ?? entry.role.name}相关图录：${asset.label}`} fill sizes="96px" /></button><figcaption>{asset.label}<small>{asset.note}</small></figcaption></figure>)}</div></div> : null}</section>
              <section className="codex-detail-section"><span>真 · 实 · 故 · 事</span><p>{detail?.story ?? entry.role.background}</p></section>
              <section className="codex-detail-section"><span>资 · 料 · 链 · 接</span><div className="codex-sources">{detail?.links.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer"><strong>{source.title}</strong></a>)}</div></section>
            </div>
          </div>
        </div>
      </div>
      {selectedRelated ? <div className="codex-related-preview" role="dialog" aria-modal="true" aria-label={`${selectedRelated.label}图录放大预览`} onPointerDown={(event) => { if (event.currentTarget === event.target) setSelectedRelated(null); }}><button className="codex-related-preview-close" type="button" aria-label="关闭图录预览" onClick={() => setSelectedRelated(null)}>×</button><div className="codex-related-preview-art"><Image src={showRelatedOriginal ? selectedRelated.originalSrc : selectedRelated.src} alt={`${entry.role.name}相关图录：${selectedRelated.label}·${showRelatedOriginal ? "实物图" : "优化图"}`} fill sizes="(max-width: 760px) 84vw, 520px" priority /><button className="codex-related-preview-flip" type="button" aria-label={showRelatedOriginal ? "返回优化后的游戏美术图" : "查看美化前的实物图"} onClick={() => setShowRelatedOriginal((current) => !current)}><span aria-hidden="true">↻</span>{showRelatedOriginal ? "返回优化图" : "翻看实物图"}</button></div><p>{selectedRelated.label}<small>{showRelatedOriginal ? "美化前实物图 · 用于溯源对照" : selectedRelated.note}</small></p></div> : null}
    </>}
  </section>;
}

export function CodexExperience({ data = faceData, entries: controlledEntries, collection, storage, onRestart, newlyCollectedMaskId, initiallyOpenMaskId, demoMode = false }: CodexExperienceProps) {
  const router = useRouter();
  const [localEntries, setLocalEntries] = useState<Record<string, CodexEntry>>(controlledEntries ?? {});
  const [activeSlot, setActiveSlot] = useState<CodexSlotView | null>(null);
  const [presentation, setPresentation] = useState<PresentationState>("empty");
  const [demoVariant, setDemoVariant] = useState<"normal" | "all">("normal");
  const focusReturn = useRef<HTMLButtonElement | null>(null);
  const activeId = useRef<string | null>(null);
  const sourceRect = useRef<DOMRect | null>(null);
  const timeline = useRef<{ kill: () => void } | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const browserStorage = defaultStorage();
  const codex = useMemo(() => collection ?? ((storage ?? browserStorage) ? createCodexCollection(storage ?? browserStorage!) : null), [browserStorage, collection, storage]);
  const baseEntries = controlledEntries ?? localEntries;
  const demoEntries = useMemo(() => buildDemoEntries(data), [data]);
  const entries = useMemo(() => demoMode && demoVariant === "all" ? demoEntries : baseEntries, [baseEntries, demoEntries, demoMode, demoVariant]);
  const slots = useMemo(() => buildCodexSlots(data, entries), [data, entries]);
  const count = collectedCount(slots);

  const unlockAll = useCallback(() => {
    setDemoVariant("all");
  }, []);

  const leaveDemo = useCallback(() => {
    setDemoVariant("normal");
  }, []);

  useEffect(() => {
    if (!initiallyOpenMaskId || activeId.current) return;
    const initial = slots.find((slot) => slot.id === initiallyOpenMaskId && slot.entry);
    if (!initial) return;
    const timer = window.setTimeout(() => {
      activeId.current = initial.id;
      setActiveSlot(initial);
      setPresentation("selected");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initiallyOpenMaskId, slots]);

  useEffect(() => {
    if (controlledEntries || !codex) return;
    const timer = window.setTimeout(() => setLocalEntries(codex.list(data.codex.storageKey)), 0);
    return () => window.clearTimeout(timer);
  }, [codex, controlledEntries, data.codex.storageKey]);

  const killPresentation = useCallback(() => {
    timeline.current?.kill();
    timeline.current = null;
    if (stageRef.current) gsap.set(stageRef.current, { clearProps: "transform,opacity" });
    if (copyRef.current) gsap.set(copyRef.current, { clearProps: "transform,opacity" });
  }, []);

  const open = useCallback((slot: CodexSlotView, trigger: HTMLButtonElement) => {
    if (!slot.entry) return;
    if (activeId.current === slot.id && (presentation === "opening" || presentation === "revealed")) return;
    killPresentation();
    activeId.current = slot.id;
    sourceRect.current = trigger.getBoundingClientRect();
    focusReturn.current = trigger;
    setActiveSlot(slot);
    setPresentation("selected");
  }, [killPresentation, presentation]);

  const close = useCallback(() => {
    killPresentation();
    activeId.current = null;
    sourceRect.current = null;
    setActiveSlot(null);
    setPresentation("empty");
    window.setTimeout(() => focusReturn.current?.focus(), 0);
  }, [killPresentation]);

  useLayoutEffect(() => {
    if (!activeSlot || !stageRef.current) return;
    const stage = stageRef.current;
    const copy = copyRef.current;
    const source = sourceRect.current;
    const target = stage.getBoundingClientRect();
    const dx = source ? source.left + source.width / 2 - (target.left + target.width / 2) : 0;
    const dy = source ? source.top + source.height / 2 - (target.top + target.height / 2) : 0;
    const reduced = prefersReducedMotion();
    gsap.set(stage, { x: dx, y: dy, scale: source ? Math.max(0.16, source.width / Math.max(target.width, 1)) : 0.3, rotateY: 180, opacity: 0.25, transformPerspective: 1000 });
    if (copy) gsap.set(copy, { y: 18, opacity: 0 });
    setPresentation("opening");
    const next = gsap.timeline({
      defaults: { ease: "power3.inOut" },
      onComplete: () => {
        timeline.current = null;
        setPresentation("revealed");
      }
    });
    next.to(stage, { x: 0, y: 0, scale: 1, rotateY: 360, opacity: 1, duration: reduced ? 0.01 : 0.72 }, 0);
    if (copy) next.to(copy, { y: 0, opacity: 1, duration: reduced ? 0.01 : 0.34, ease: "power2.out" }, reduced ? 0 : 0.52);
    timeline.current = next;
    return () => {
      next.kill();
      if (timeline.current === next) timeline.current = null;
    };
  }, [activeSlot]);

  useEffect(() => () => {
    timeline.current?.kill();
    timeline.current = null;
  }, []);

  const clear = useCallback(() => {
    if (!window.confirm("清空本机已收录的傩面与幻梦回响？此操作无法恢复。")) return;
    codex?.clear(data.codex.storageKey);
    setLocalEntries({});
    close();
  }, [close, codex, data.codex.storageKey]);

  useEffect(() => {
    if (!activeSlot) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); close(); } };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeSlot, close]);

  return <main
    aria-label="面具图鉴滚动区域"
    className="codex-experience"
    style={{ "--codex-altar": `url("${data.codex.altar.background}")` } as CSSProperties}
    tabIndex={0}
  >
    <header className="codex-title"><div className="codex-kicker">傩 · 谱 · 收 · 录</div><h1>面具图鉴 <span className="codex-title-count">({count} / {data.codex.slots.length})</span></h1><p>完成一条幻梦，点亮一位历史角色。点击已收录卡面，可旋转傩面并重读故事回响。</p></header>
    <div className="codex-actions"><p aria-live="polite">已收录 {count} / {data.codex.slots.length}</p><button className="codex-reset-button" type="button" onClick={clear} aria-label="清空本机收录" title="清空本机收录">↻</button>{demoMode ? <label className="codex-demo-select">演示 <select value={demoVariant} onChange={(event) => event.target.value === "all" ? unlockAll() : leaveDemo()}><option value="normal">普通模式</option><option value="all">解锁全部面具</option></select></label> : null}<label className="codex-story-select">剧情体验 <select defaultValue="" onChange={(event) => { if (event.target.value) router.push(`/dream/${encodeURIComponent(event.target.value)}`); }}><option value="">选择已制作剧情</option>{STORY_PATHS.map(([name, id]) => <option value={id} key={id}>{name}</option>)}</select></label><Link className="codex-nav-link" href="/">返回首页</Link></div>
    {demoMode && demoVariant === "all" ? <p className="codex-demo-hint">演示版：全部可用面具已点亮，可点击卡面查看翻转与详情；也可关闭演示恢复本机收录。</p> : null}
    <div className="codex-layout"><ol className="codex-wall" aria-label="傩面图鉴">{slots.map((slot) => <CodexCard key={slot.id} slot={slot} selected={activeSlot?.id === slot.id} newlyCollected={slot.id === newlyCollectedMaskId} onOpen={open} />)}</ol></div>
    {activeSlot ? <div className="codex-modal" role="presentation" onPointerDown={(event) => { if (event.currentTarget === event.target) close(); }}>
      <CodexDetail key={activeSlot.id} slot={activeSlot} presentation={presentation} stageRef={stageRef} copyRef={copyRef} onClose={close} />
    </div> : null}
    {onRestart ? <button className="codex-restart" type="button" onClick={onRestart}>重新开始</button> : null}
  </main>;
}

export { CodexDetail, CodexCard };
