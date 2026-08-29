export interface DetailCallout { label: string; note: string }
export interface CodexDetailAssetSet { mainMask: string; originalMask: string; background: string; callouts?: string[] }
export interface RelatedAsset { label: string; note: string; src: string; originalSrc: string }

export const CARD_TO_CODEX_MASK_ID: Record<string, string> = {
  "dream.kailu-jiangjun.du-shan-ji": "crown-beard",
  "dream.xianfeng-xiaojie.yi-suo-hua": "square-crown",
  "dream.jiu-wei-tu-di-shen.di-jiu-tan": "bound-hair",
  "dream.tangshi-taipo.gui-zheng-ji": "high-crown",
  "dream.goubu-panguan.he-ye-ji": "gou-bu-pan-guan",
  "dream.saodi-heshang.yu-huo-ji": "sao-di-he-shang",
  "dream.liuyi.yi-xin-du-shui": "liu-yi",
  "dream.abumo.huang-nian-kai-huo": "abu-mo"
};

export const DETAIL_CALLOUTS: Record<string, DetailCallout[]> = {
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

export const DEFAULT_DETAIL_CALLOUTS: DetailCallout[] = [
  { label: "主要纹样", note: "职司线索" },
  { label: "面部结构", note: "角色神韵" },
  { label: "材质细节", note: "佩戴痕迹" },
];

export const DETAIL_ASSETS: Record<string, CodexDetailAssetSet> = {
  "crown-beard": { mainMask: "/dream-assets/ui/codex/details/kailu-jiangjun/main-mask-v3.png", originalMask: "/dream-assets/ui/codex/mask-original/crown-beard.jpg", background: "/dream-assets/ui/codex/details/shared/atmosphere.png", callouts: ["/dream-assets/ui/codex/details/kailu-jiangjun/callouts/crown-earwings.png", "/dream-assets/ui/codex/details/kailu-jiangjun/callouts/fierce-eyes.png", "/dream-assets/ui/codex/details/kailu-jiangjun/callouts/back-rope-wood.png"] },
  "square-crown": { mainMask: "/dream-assets/ui/codex/details/xianfeng-xiaojie/main-mask.png", originalMask: "/dream-assets/ui/codex/mask-original/square-crown.jpg", background: "/dream-assets/ui/codex/details/shared/atmosphere.png", callouts: ["/dream-assets/ui/codex/details/xianfeng-xiaojie/callouts/hairband.png", "/dream-assets/ui/codex/details/xianfeng-xiaojie/callouts/eyes.png", "/dream-assets/ui/codex/details/xianfeng-xiaojie/callouts/aged-paint.png"] },
  "bound-hair": { mainMask: "/dream-assets/ui/codex/details/yabing-tudi/main-mask.png", originalMask: "/dream-assets/ui/codex/mask-original/bound-hair.jpg", background: "/dream-assets/ui/codex/details/shared/atmosphere.png", callouts: ["/dream-assets/ui/codex/details/yabing-tudi/callouts/five-peak-crown.png", "/dream-assets/ui/codex/details/yabing-tudi/callouts/eye-hollows.png", "/dream-assets/ui/codex/details/yabing-tudi/callouts/fiber-beard.png"] },
  "high-crown": { mainMask: "/dream-assets/ui/codex/details/tangshi-taipo/main-mask-v2.png", originalMask: "/dream-assets/ui/codex/mask-original/high-crown.jpg", background: "/dream-assets/ui/codex/details/shared/atmosphere.png", callouts: ["/dream-assets/ui/codex/details/tangshi-taipo/callouts/cap-emblem.png", "/dream-assets/ui/codex/details/tangshi-taipo/callouts/smile-ears.png", "/dream-assets/ui/codex/details/tangshi-taipo/callouts/teeth-smile.png"] },
  "gou-bu-pan-guan": { mainMask: "/dream-assets/ui/codex/details/gou-bu-pan-guan/main-mask.png", originalMask: "/dream-assets/ui/codex/mask-original/gou-bu-pan-guan.jpg", background: "/dream-assets/ui/codex/details/shared/atmosphere.png", callouts: ["/dream-assets/ui/codex/details/gou-bu-pan-guan/callouts/official-hat.png", "/dream-assets/ui/codex/details/gou-bu-pan-guan/callouts/brow-orbits.png", "/dream-assets/ui/codex/details/gou-bu-pan-guan/callouts/teeth-line.png"] },
  "sao-di-he-shang": { mainMask: "/dream-assets/ui/codex/details/sao-di-he-shang/main-mask.png", originalMask: "/dream-assets/ui/codex/mask-original/sao-di-he-shang.jpg", background: "/dream-assets/ui/codex/details/shared/atmosphere.png", callouts: ["/dream-assets/ui/codex/details/sao-di-he-shang/callouts/rounded-brow.png", "/dream-assets/ui/codex/details/sao-di-he-shang/callouts/curved-eyes.png", "/dream-assets/ui/codex/details/sao-di-he-shang/callouts/smile-mouth.png"] },
  "liu-yi": { mainMask: "/dream-assets/ui/codex/details/liu-yi/main-mask.png", originalMask: "/dream-assets/ui/codex/mask-original/liu-yi.jpg", background: "/dream-assets/ui/codex/details/shared/atmosphere.png", callouts: ["/dream-assets/ui/codex/details/liu-yi/callouts/headscarf.png", "/dream-assets/ui/codex/details/liu-yi/callouts/features.png", "/dream-assets/ui/codex/details/liu-yi/callouts/moustache.png"] },
  "abu-mo": { mainMask: "/dream-assets/ui/codex/details/abu-mo/main-mask.png", originalMask: "/dream-assets/ui/codex/mask-original/abu-mo.png", background: "/dream-assets/ui/codex/details/shared/atmosphere.png", callouts: ["/dream-assets/ui/codex/details/abu-mo/callouts/white-headwrap.png", "/dream-assets/ui/codex/details/abu-mo/callouts/white-nose.png", "/dream-assets/ui/codex/details/abu-mo/callouts/beard-fibers.png"] }
};

export const RELATED_ASSETS: Record<string, RelatedAsset[]> = {
  "crown-beard": [
    { label: "令旗", note: "故事一仪式旗具", src: "/dream-assets/ui/codex/related/shared/lingqi.png", originalSrc: "/dream-assets/ui/codex/related-original/shared/lingqi.jpg" },
    { label: "开山斧", note: "开障动作溯源", src: "/dream-assets/ui/codex/related/kailu-jiangjun/kaishanfu-clean.png", originalSrc: "/dream-assets/ui/codex/related-original/kailu-jiangjun/kaishanfu.jpg" },
    { label: "诸神图傩案图", note: "开洞场域图录", src: "/dream-assets/ui/codex/related/shared/zhushen-altar.png", originalSrc: "/dream-assets/ui/codex/related-original/shared/zhushen-altar.jpg" }
  ],
  "square-crown": [
    { label: "令旗", note: "先锋号令语汇", src: "/dream-assets/ui/codex/related/shared/lingqi.png", originalSrc: "/dream-assets/ui/codex/related-original/shared/lingqi.jpg" },
    { label: "令牌", note: "愿已认领", src: "/dream-assets/ui/codex/related/shared/lingpai.png", originalSrc: "/dream-assets/ui/codex/related-original/shared/lingpai.jpg" },
    { label: "木鱼", note: "故事二节奏道具", src: "/dream-assets/ui/codex/related/shared/muyu.png", originalSrc: "/dream-assets/ui/codex/related-original/shared/muyu.jpg" }
  ],
  "bound-hair": [
    { label: "傩案画", note: "九坛空间图录", src: "/dream-assets/ui/codex/related/shared/nuo-altar-painting-clean.png", originalSrc: "/dream-assets/ui/codex/related-original/shared/nuo-altar-painting.jpg" },
    { label: "桥头画", note: "故事三场域图录", src: "/dream-assets/ui/codex/related/jiu-wei-tu-di-shen/qiaotou-painting-clean.png", originalSrc: "/dream-assets/ui/codex/related-original/jiu-wei-tu-di-shen/qiaotou-painting.jpg" }
  ],
  "high-crown": [
    { label: "令牌", note: "故事四仪式物件", src: "/dream-assets/ui/codex/related/shared/lingpai.png", originalSrc: "/dream-assets/ui/codex/related-original/shared/lingpai.jpg" },
    { label: "木鱼", note: "故事四节奏道具", src: "/dream-assets/ui/codex/related/shared/muyu.png", originalSrc: "/dream-assets/ui/codex/related-original/shared/muyu.jpg" },
    { label: "法铃", note: "归魂仪式语汇", src: "/dream-assets/ui/codex/related/tangshi-taipo/faling.png", originalSrc: "/dream-assets/ui/codex/related-original/tangshi-taipo/faling.jpg" }
  ],
  "gou-bu-pan-guan": [
    { label: "令牌", note: "归名与核验", src: "/dream-assets/ui/codex/related/gou-bu-pan-guan/lingpai.png", originalSrc: "/dream-assets/ui/codex/related-original/gou-bu-pan-guan/lingpai.jpg" },
    { label: "师刀", note: "仪式动作图录", src: "/dream-assets/ui/codex/related/gou-bu-pan-guan/shidao-clean.png", originalSrc: "/dream-assets/ui/codex/related-original/gou-bu-pan-guan/shidao.jpg" },
    { label: "傩案画", note: "傩坛关系图录", src: "/dream-assets/ui/codex/related/shared/nuo-altar-painting-clean.png", originalSrc: "/dream-assets/ui/codex/related-original/shared/nuo-altar-painting.jpg" }
  ],
  "sao-di-he-shang": [
    { label: "小钹", note: "扫余节奏", src: "/dream-assets/ui/codex/related/sao-di-he-shang/xiaobo.png", originalSrc: "/dream-assets/ui/codex/related-original/sao-di-he-shang/xiaobo.jpg" },
    { label: "木鱼", note: "净场声响", src: "/dream-assets/ui/codex/related/shared/muyu.png", originalSrc: "/dream-assets/ui/codex/related-original/shared/muyu.jpg" },
    { label: "小锣", note: "傩堂音响", src: "/dream-assets/ui/codex/related/sao-di-he-shang/xiaoluo-clean.png", originalSrc: "/dream-assets/ui/codex/related-original/sao-di-he-shang/xiaoluo.jpg" }
  ],
  "abu-mo": [
    { label: "牛角", note: "远处回应", src: "/dream-assets/ui/codex/related/abu-mo/niujiao.png", originalSrc: "/dream-assets/ui/codex/related-original/abu-mo/niujiao.jpg" },
    { label: "诸神图傩案图", note: "仪式空间图录", src: "/dream-assets/ui/codex/related/shared/zhushen-altar.png", originalSrc: "/dream-assets/ui/codex/related-original/shared/zhushen-altar.jpg" }
  ]
};

export function getCodexPreloadUrlsForCard(cardId: string): string[] {
  const maskId = CARD_TO_CODEX_MASK_ID[cardId];
  if (!maskId) return [];
  const detail = DETAIL_ASSETS[maskId];
  const related = RELATED_ASSETS[maskId] ?? [];
  return [...new Set([
    "/dream-assets/ui/codex/omen/omen-slip-abu-mo-v2.png",
    detail?.background,
    detail?.mainMask,
    detail?.originalMask,
    ...(detail?.callouts ?? []),
    ...related.flatMap((asset) => [asset.src, asset.originalSrc])
  ].filter((url): url is string => Boolean(url)))];
}
