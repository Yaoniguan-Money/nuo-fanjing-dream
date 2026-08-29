export interface StoryOmen {
  qian: string;
  grade: string;
  interpretation: string;
  reflection: string;
}

const STORY_OMENS: Record<string, StoryOmen> = {
  "dream.kailu-jiangjun.du-shan-ji": {
    qian: "斧落千嶂裂，人行万径开",
    grade: "上吉之象，先动者得。",
    interpretation: "山石不会自己裂开，是因为斧头到了；路原本无名，是因为有人走出了它。斧头落下的地方，正是心先落下的地方。这一签不问力气大小，只问行动先后。",
    reflection: "你眼下面对的事，众人都说行不通，你自己心里也疑了一半。可路通不通，从来不由众人的嘴决定，而由先走的人走出来。一万个人说断，也减不掉你脚下的半步；你这一步落下去，那些否定的话，就都退成了身后的风。",
  },
  "dream.xianfeng-xiaojie.qian-jie-qiao": {
    qian: "一刀纵断江心索，千手重牵雾里桥",
    grade: "上吉之象，不跪者渡。",
    interpretation: "一把刀再快，斩断的只是一根绳；千双手相连，牵起的却是一座桥。持刀的人手里只有刀，过江的人手里有彼此。绳索能断在暗夜，桥终究成于天亮。",
    reflection: "拦在你面前的，或许有人立价、有人把守，说“这里由我做主”。这一签想告诉你：强迫能拦住一时的路，拦不住众人的渡口。不必同他争辩谁有理——自己的江，自己结绳渡过。你要赢的从来不是他，而是从此不再需要他。",
  },
  "dream.jiu-wei-tu-di-shen.di-jiu-tan": {
    qian: "界石千年守，寒泉一味清",
    grade: "守正之象，安位者清。",
    interpretation: "界石不说话，一守就是千年；寒泉不争抢，清就清得纯粹。坛分大小，是人分的；地无贵贱，是地自己的性子。别家的坛香火旺，是别人的缘分；这片坡泉眼活，是这片地自己的命。",
    reflection: "你习惯拿别人的香火，来量自家的地；拿旁人的尺子，来裁自己的坡。这一签想告诉你：位置不在高低，在于你认不认它。冷清处的地，未必是薄地；无人问起的那眼泉，冬天暖不暖，守着的人自己知道。",
  },
  "dream.tangshi-taipo.zhi-hun-ji": {
    qian: "风吹散处皆吾影，梭织回时是我身",
    grade: "归魂之象，自收者全。",
    interpretation: "散在风里的，原本是你自己；收回织机上的，也是你自己。碎片由别人的话碰碎，却只能由自己的手收回。一片一片飘在风中，是影子；织成一匹落在机上，才是身子。",
    reflection: "你曾被一句评语碰碎过，许久不敢认领自己，时间久了，竟以为散掉的那些就是全部。这一签想告诉你：散落在外的每一片，都还带着你的名字。不必等谁来还你一句“你很好”——手是自己的，梭也是自己的。",
  },
};

export function getStoryOmen(cardId: string): StoryOmen | null {
  return STORY_OMENS[cardId] ?? null;
}
