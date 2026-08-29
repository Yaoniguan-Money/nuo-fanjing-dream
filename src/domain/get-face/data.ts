export interface FaceMaskVisual {
  tint: string;
  pattern: string;
  emblem: string;
  card: {
    primary: string;
    secondary: string;
    glyph: string;
  };
  relief: {
    depth: number;
    resolution: number;
    threshold: number;
  };
}

export interface FaceMask {
  id: string;
  name: string;
  asset: string;
  views: { front: string; side: string; back: string };
  artwork?: {
    card: string;
  };
  themes: readonly string[];
  visual: FaceMaskVisual;
}

export interface FaceStoryAct {
  eyebrow: string;
  title: string;
  desc: string;
  choices: readonly string[];
}

export type FaceRoleKind = "traditional_reference" | "project_creation";

export interface FaceRole {
  id: string;
  name: string;
  duty: string;
  maskIndex: number;
  kind: FaceRoleKind;
  triggers: readonly string[];
  choiceWeights: readonly number[];
  signs: readonly string[];
  background: string;
  sources: readonly string[];
  reason: string;
}

export interface FaceSource {
  id: string;
  title: string;
  institution: string;
  url: string;
  accessedAt: string;
  meaning: string;
  imageRights: string;
}

export interface FaceCodexConfig {
  storageKey: string;
  slots: readonly { id: string; kind: "mask" | "reserved" }[];
  relief: {
    rotationX: number;
    rotationY: number;
    minDistance: number;
    maxDistance: number;
    light: string;
  };
  altar: {
    background: string;
    focalPoint: string;
    veilOpacity: number;
  };
}

export interface FaceData {
  promptVersion: string;
  masks: readonly FaceMask[];
  story: readonly FaceStoryAct[];
  roles: readonly FaceRole[];
  sources: readonly FaceSource[];
  codex: FaceCodexConfig;
  localAssetNotice: string;
}

export const faceData: FaceData = {
  promptVersion: "nuo-omen-v1",
  masks: [
    { id: "crown-beard", name: "开路将军", asset: "/dream-assets/ui/codex/details/kailu-jiangjun/main-mask-v3.png", views: { front: "/dream-assets/ui/codex/details/kailu-jiangjun/main-mask-v3.png", side: "/dream-assets/codex/masks/kailu-jiangjun/side.png", back: "/dream-assets/codex/masks/kailu-jiangjun/back.png" }, artwork: { card: "/dream-assets/ui/codex/fronts/kailu-jiangjun-v2.png" }, themes: ["前路", "选择", "未来", "迷茫", "卡住", "出发", "方向"], visual: { tint: "amber", pattern: "山纹", emblem: "路印", card: { primary: "#c99b3d", secondary: "#89a99b", glyph: "mountain" }, relief: { depth: 0.34, resolution: 56, threshold: 24 } } },
    { id: "square-crown", name: "先锋小姐", asset: "/dream-assets/ui/codex/details/xianfeng-xiaojie/main-mask.png", views: { front: "/dream-assets/ui/codex/details/xianfeng-xiaojie/main-mask.png", side: "/dream-assets/codex/masks/xianfeng-xiaojie/side.png", back: "/dream-assets/codex/masks/xianfeng-xiaojie/back.png" }, artwork: { card: "/dream-assets/ui/codex/fronts/xianfeng-xiaojie-v2.png" }, themes: ["感情", "关系", "边界", "拒绝", "强迫", "压力", "自由"], visual: { tint: "vermilion", pattern: "合纹", emblem: "结印", card: { primary: "#c99b3d", secondary: "#a65c48", glyph: "knot" }, relief: { depth: 0.30, resolution: 56, threshold: 24 } } },
    { id: "bound-hair", name: "九位土地神", asset: "/dream-assets/ui/codex/details/yabing-tudi/main-mask.png", views: { front: "/dream-assets/ui/codex/details/yabing-tudi/main-mask.png", side: "/dream-assets/codex/masks/yabing-tudi/side.png", back: "/dream-assets/codex/masks/yabing-tudi/back.png" }, artwork: { card: "/dream-assets/ui/codex/fronts/yabing-tudi-v2.png" }, themes: ["工作", "事业", "同辈", "比较", "位置", "边界", "价值"], visual: { tint: "iron", pattern: "衡纹", emblem: "尺印", card: { primary: "#c99b3d", secondary: "#6f847b", glyph: "scale" }, relief: { depth: 0.28, resolution: 56, threshold: 24 } } },
    { id: "high-crown", name: "唐氏太婆", asset: "/dream-assets/ui/codex/details/tangshi-taipo/main-mask-v2.png", views: { front: "/dream-assets/ui/codex/details/tangshi-taipo/main-mask-v2.png", side: "/dream-assets/codex/masks/tangshi-taipo/side.png", back: "/dream-assets/codex/masks/tangshi-taipo/back.png" }, artwork: { card: "/dream-assets/ui/codex/fronts/tangshi-taipo-v2.png" }, themes: ["否定", "自我", "评价", "失去", "重建", "不安", "找回"], visual: { tint: "bone", pattern: "回纹", emblem: "灯印", card: { primary: "#c99b3d", secondary: "#88aa97", glyph: "lamp" }, relief: { depth: 0.26, resolution: 56, threshold: 24 } } },
    { id: "gou-bu-pan-guan", name: "勾簿判官", asset: "/dream-assets/ui/codex/details/gou-bu-pan-guan/main-mask.png", views: { front: "/dream-assets/ui/codex/details/gou-bu-pan-guan/main-mask.png", side: "/dream-assets/ui/codex/details/gou-bu-pan-guan/main-mask.png", back: "/dream-assets/ui/codex/details/gou-bu-pan-guan/main-mask.png" }, artwork: { card: "/dream-assets/ui/codex/fronts/gou-bu-pan-guan-v3.png" }, themes: [], visual: { tint: "vermilion", pattern: "朱笔", emblem: "簿印", card: { primary: "#c99b3d", secondary: "#7f6255", glyph: "lamp" }, relief: { depth: 0.30, resolution: 56, threshold: 24 } } },
    { id: "sao-di-he-shang", name: "扫地和尚", asset: "/dream-assets/ui/codex/details/sao-di-he-shang/main-mask.png", views: { front: "/dream-assets/ui/codex/details/sao-di-he-shang/main-mask.png", side: "/dream-assets/ui/codex/details/sao-di-he-shang/main-mask.png", back: "/dream-assets/ui/codex/details/sao-di-he-shang/main-mask.png" }, artwork: { card: "/dream-assets/ui/codex/fronts/sao-di-he-shang-v6.png" }, themes: [], visual: { tint: "earth", pattern: "尘环", emblem: "扫印", card: { primary: "#c99b3d", secondary: "#9a8060", glyph: "mountain" }, relief: { depth: 0.24, resolution: 56, threshold: 24 } } },
    { id: "liu-yi", name: "柳毅", asset: "/dream-assets/ui/codex/details/liu-yi/main-mask.png", views: { front: "/dream-assets/ui/codex/details/liu-yi/main-mask.png", side: "/dream-assets/ui/codex/details/liu-yi/main-mask.png", back: "/dream-assets/ui/codex/details/liu-yi/main-mask.png" }, artwork: { card: "/dream-assets/ui/codex/fronts/liu-yi-v2.png" }, themes: ["沟通", "求助", "传递"], visual: { tint: "ink", pattern: "书信纹", emblem: "信印", card: { primary: "#c99b3d", secondary: "#687879", glyph: "knot" }, relief: { depth: 0.26, resolution: 56, threshold: 24 } } },
    { id: "abu-mo", name: "阿布摩", asset: "/dream-assets/ui/codex/details/abu-mo/main-mask.png", views: { front: "/dream-assets/ui/codex/details/abu-mo/main-mask.png", side: "/dream-assets/ui/codex/details/abu-mo/main-mask.png", back: "/dream-assets/ui/codex/details/abu-mo/main-mask.png" }, artwork: { card: "/dream-assets/ui/codex/fronts/abu-mo-v2.png" }, themes: [], visual: { tint: "charcoal", pattern: "白波", emblem: "种印", card: { primary: "#c99b3d", secondary: "#8b8170", glyph: "scale" }, relief: { depth: 0.22, resolution: 56, threshold: 24 } } }
  ],
  story: [
    { eyebrow: "入 · 山门", title: "第一幕 · 山门问路", desc: "黑暗里，鼓声从远处一下一下逼近。你必须决定，是循声直入，还是先问清来路。", choices: ["循鼓声直入", "先停下问来路"] },
    { eyebrow: "照 · 心火", title: "第二幕 · 火堂试心", desc: "火光照出来的不是吉凶，而是你最不愿承认的那一部分。", choices: ["直视那团火", "先避开它"] },
    { eyebrow: "对 · 影", title: "第三幕 · 对影受面", desc: "影子从脚下站起来。它不追你，只问：你到底愿意舍掉什么，又要守住什么？", choices: ["承认恐惧", "守住所求"] }
  ],
  roles: [
    { id: "path-general", name: "开路将军", duty: "开障引路", maskIndex: 0, kind: "traditional_reference", triggers: ["前路", "选择", "未来", "迷茫", "出发", "方向", "上岸"], choiceWeights: [2, 1, 1], signs: ["翘冠", "山纹", "路印"], background: "借“开路将军”扫清障碍、驱邪开道的职能而设；本次授面只取其开障前行的叙事意义。", sources: ["ich-dejiang-2018"], reason: "你在山门前没有把脚步交给黑暗，仍在为下一步辨路。" },
    { id: "path-gatherer", name: "拾途使", duty: "收拢散失的方向", maskIndex: 0, kind: "project_creation", triggers: ["迷路", "找", "方向", "不知道", "犹豫", "选择"], choiceWeights: [0, 2, 1], signs: ["长须", "山纹", "路印"], background: "项目新创角色：替那些尚未能走出去的人，把零散的路标一一拾回。", sources: ["ich-dejiang-2018"], reason: "你没有急着把未知当作答案，而是先听见了自己迟疑的回声。" },
    { id: "wish-harmonizer", name: "和愿使", duty: "调停愿望与回应", maskIndex: 1, kind: "project_creation", triggers: ["感情", "关系", "沟通", "和好", "喜欢", "家人", "朋友"], choiceWeights: [1, 1, 2], signs: ["方冠", "合纹", "结印"], background: "项目新创角色：不替人与人裁定结果，只替两端的愿望留出可说话的缝隙。", sources: ["gz-cppcc-nuo"], reason: "你仍想守住一段关系，也愿意先承认其中尚未说出的部分。" },
    { id: "boundary-keeper", name: "守界人", duty: "分清守护与止步", maskIndex: 1, kind: "project_creation", triggers: ["分手", "边界", "离开", "消耗", "吵架", "不想"], choiceWeights: [1, 2, 0], signs: ["方冠", "合纹", "界印"], background: "项目新创角色：在靠近与退后之间，替来者看守一条不必解释的界线。", sources: ["gz-cppcc-nuo"], reason: "你在火前停了一步，说明有些靠近需要先知道自己的边界。" },
    { id: "balance-general", name: "定衡将", duty: "衡量进退与担当", maskIndex: 2, kind: "project_creation", triggers: ["工作", "事业", "面试", "项目", "钱", "决定", "创业"], choiceWeights: [2, 0, 2], signs: ["束发", "衡纹", "尺印"], background: "项目新创角色：不替人选择成败，只把事情两端的重量重新交回掌中。", sources: ["gz-cppcc-nuo"], reason: "你选择守住所求，说明你已经知道有一件事值得为之承担。" },
    { id: "residue-sweeper", name: "扫余人", duty: "清理事后滞留的牵挂", maskIndex: 2, kind: "project_creation", triggers: ["结束", "放下", "离职", "遗憾", "过去", "忘不掉"], choiceWeights: [0, 2, 1], signs: ["圆目", "衡纹", "扫印"], background: "项目新创角色：事情结束以后，仍替来者清扫心里没有散去的余响。", sources: ["gz-cppcc-nuo"], reason: "你没有强迫自己立刻跨过火堂，而是承认有些余烬仍需收拾。" },
    { id: "soul-returner", name: "归魂使", duty: "认回散失的自我", maskIndex: 3, kind: "project_creation", triggers: ["失去", "自己", "空", "找回", "想念", "孤独", "害怕"], choiceWeights: [1, 1, 2], signs: ["高冠", "回纹", "灯印"], background: "项目新创角色：不召唤任何超自然回应，只替迷失的人记住自己曾经留下的灯。", sources: ["gz-cppcc-nuo"], reason: "你在影前承认了恐惧，于是那部分被藏起的自己终于可以被认回。" },
    { id: "fear-watcher", name: "照惧使", duty: "照见恐惧而不替它作主", maskIndex: 3, kind: "project_creation", triggers: ["焦虑", "压力", "恐惧", "失败", "不安", "害怕"], choiceWeights: [1, 2, 0], signs: ["静相", "回纹", "灯印"], background: "项目新创角色：把恐惧放在灯下，不驱赶，也不让它替人下令。", sources: ["gz-cppcc-nuo"], reason: "你选择先看清来路，说明你愿意让恐惧露出它真正的形状。" },
    { id: "neutral-questioner", name: "照问者", duty: "暂存未成形的疑问", maskIndex: 3, kind: "project_creation", triggers: [], choiceWeights: [0, 0, 0], signs: ["静相", "回纹", "问印"], background: "项目新创角色：当愿望尚未命名，先替来者留下一个可以继续发问的位置。", sources: ["gz-cppcc-nuo"], reason: "你的愿望还没有落进既定的名字里；这一面只替你把疑问安放下来。" },
    { id: "return-scribe", name: "勾簿判官", duty: "归档旧事，认回自己", maskIndex: 4, kind: "traditional_reference", triggers: ["归魂", "归档", "名字", "旧事"], choiceWeights: [1, 1, 2], signs: ["官帽", "朱笔", "簿册"], background: "德江傩堂戏勾簿判官的传统职能转译。", sources: ["gz-cppcc-nuo"], reason: "把散乱的名字重新写回自己的簿册。" },
    { id: "residue-sweeper-real", name: "扫地和尚", duty: "清理事后滞留的牵挂", maskIndex: 5, kind: "traditional_reference", triggers: ["扫余", "结束", "放下", "余响"], choiceWeights: [1, 1, 1], signs: ["圆脸", "竹帚", "尘环"], background: "德江傩堂戏扫地和尚的清宅减灾职能。", sources: ["gz-cppcc-nuo"], reason: "把已经结束却仍滞留身边的余响扫出场外。" },
    { id: "message-bearer", name: "柳毅", duty: "传声", maskIndex: 7, kind: "traditional_reference", triggers: ["沟通", "求助", "传递"], choiceWeights: [1, 1, 1], signs: ["方巾", "长髭", "书信"], background: "《柳毅传书》中承担传信之责的书生形象。", sources: ["gz-cppcc-nuo"], reason: "让受阻的声音抵达能够回应的人。" },
    { id: "seed-keeper", name: "阿布摩", duty: "在失序之后保存未来", maskIndex: 6, kind: "traditional_reference", triggers: ["留种", "延续", "灾后", "未来"], choiceWeights: [1, 1, 1], signs: ["黑木", "白波", "种袋"], background: "威宁彝族撮泰吉阿布摩的灾后复耕形象。", sources: ["gz-cppcc-nuo"], reason: "不要求世界立刻复原，只先把下一季的种子留下。" }
  ],
  sources: [
    { id: "ich-dejiang-2018", title: "千年腔调 穿越古今——走近中国戏剧活化石德江傩戏", institution: "中国非物质文化遗产网·中国非物质文化遗产数字博物馆", url: "https://www.ihchina.cn/Article/Index/detail?id=9598", accessedAt: "2026-08-28", meaning: "介绍德江傩堂戏的仪式、面具制作和开路将军扫清障碍、驱邪除恶的表演情景。", imageRights: "页面原图未获本项目复用授权，仅链接原页。" },
    { id: "gz-cppcc-nuo", title: "隐藏在面具后的非物质文化遗产——傩堂戏", institution: "贵州省政协", url: "https://www.gzszx.gov.cn/gzzxb/web/doc/detail/d_1407350046982176", accessedAt: "2026-08-28", meaning: "说明贵州傩堂戏的面具表演传统、角色差异与面具数量并非固定。", imageRights: "页面原图未获本项目复用授权，仅链接原页。" }
  ],
  codex: {
    storageKey: "nuo.codex.v2",
    slots: [
      { id: "crown-beard", kind: "mask" }, { id: "square-crown", kind: "mask" }, { id: "high-crown", kind: "mask" }, { id: "gou-bu-pan-guan", kind: "mask" },
      { id: "sao-di-he-shang", kind: "mask" }, { id: "bound-hair", kind: "mask" }, { id: "liu-yi", kind: "mask" }, { id: "abu-mo", kind: "mask" }
    ],
    relief: { rotationX: 0.16, rotationY: -0.32, minDistance: 2.25, maxDistance: 4.25, light: "#f0ce87" },
    altar: { background: "/dream-assets/altar/dragon-altar-style.png", focalPoint: "50% 50%", veilOpacity: 0.62 }
  },
  localAssetNotice: "本地视觉母体，历史身份及授权来源未提供。"
};

export const getFaceData = faceData;
