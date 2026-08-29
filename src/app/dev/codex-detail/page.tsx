import { normalizeCodexEntry, type CodexEntry } from "@/domain/codex";
import { faceData } from "@/domain/get-face";
import { CodexExperience } from "@/features/codex/codex-experience";

const mask = faceData.masks[0];
const role = faceData.roles[0];
const entry = normalizeCodexEntry({
  mask: { id: mask.id, name: mask.name, asset: mask.asset, visual: mask.visual },
  role,
  visualText: "翘冠、圆目与獠牙保留开路将军的历史形制；雾金线描用于傩谱卡面。",
  reasonText: role.reason,
  omen: { status: "story", qian: "斧落千嶂裂，人行万径开", grade: "上吉之象，先动者得。", interpretation: "山石不会自己裂开，是因为斧头到了；路原本无名，是因为有人走出了它。", reflection: "你这一步落下去，那些否定的话，就都退成了身后的风。", jie: "山石不会自己裂开，是因为斧头到了。" },
  sources: faceData.sources
}) as CodexEntry;

export default function CodexDetailDevPage() {
  return <CodexExperience entries={{ [mask.id]: entry }} initiallyOpenMaskId={mask.id} demoMode />;
}
