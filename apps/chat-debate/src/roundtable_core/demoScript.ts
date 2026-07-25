// PerfectDemoScript — kept in parity with ios/ClipClashPixel/Data/DemoData.swift.
// Deterministic local data drives the full roundtable + battle chain without API calls.

export type Stance = "support" | "oppose" | "swing";
export type Emotion = "calm" | "skeptical" | "softened" | "aggressive";
export type DebatePhase = "stance" | "rebuttal" | "closing";
export type PetState = "Idle" | "Speaking" | "Supported" | "Opposed";
export type DiscussionThreadId = "overview" | "cashflow" | "time" | "opportunity" | "safety";

export interface Expert {
  name: string;
  role: string;
  initials: string;
  side: Stance;
  petAssetPrefix: string;
  seat: { x: number; y: number };
  quote: string;
  personaCue: string;
  signatureMove: string;
  accent: string;
}

export interface RoundtableTurn {
  expertName: string;
  phase: DebatePhase;
  thread: DiscussionThreadId;
  targetName: string | null;
  text: string;
  shortQuote: string;
  stance: Stance;
  emotion: Emotion;
  persuasionDelta: number;
  voiceClipName: string | null;
}

export interface BattleReply {
  text: string;
  stance: Stance;
  emotion: Emotion;
  persuasionDelta: number;
  petState: PetState;
  shortQuote: string;
  memoryNote: string;
}

export interface BattleJudgeCriterion {
  id: string;
  label: string;
  score: number;
  matched: string[];
  note: string;
}

export interface BattleJudgement {
  result: "win" | "expertSoftened" | "expertUnmoved";
  userScore: number;
  expertScore: number;
  criteria: BattleJudgeCriterion[];
  reason: string;
  decisiveMoment: string;
}

export const demoTopic = {
  source: "Douyin Selected Clip",
  debate: "县城六千，真的比城市两万更舒坦吗？",
  hook: "一条县域生活视频，把收入、成本、关系、机会和自由感全部摆上圆桌。",
  sourceUrl: "https://v.douyin.com/2zuVYB3dUwU/",
};

export const roundTableExpertSeats = [
  { x: 0.36, y: 0.13 },
  { x: 0.18, y: 0.34 },
  { x: 0.82, y: 0.34 },
  { x: 0.16, y: 0.6 },
  { x: 0.84, y: 0.6 },
  { x: 0.64, y: 0.13 },
];

export const roundTableUserSeat = { x: 0.5, y: 0.78 };

export const discussionThreads: { id: DiscussionThreadId; label: string; question: string; glyph: string }[] = [
  { id: "cashflow", label: "钱包账", question: "名义工资扣完真实成本，最后谁留下得更多？", glyph: "¥" },
  { id: "time", label: "时间账", question: "省下的时间是恢复、成长，还是换个地方消耗？", glyph: "◷" },
  { id: "opportunity", label: "机会账", question: "信息密度有没有转成技能、协作或下一份机会？", glyph: "↗" },
  { id: "safety", label: "家庭与风险账", question: "教育、医疗、再就业与关系托底能不能过风控？", glyph: "◇" },
  { id: "overview", label: "四账总览", question: "四条线程能否同时改善，并保留退出条件？", glyph: "⌘" },
];

export const demoExperts: Expert[] = [
  { name: "张雪峰", role: "教育观察员", initials: "张", side: "oppose", petAssetPrefix: "PetZhangXuefeng", seat: roundTableExpertSeats[0], quote: "别先配 BGM，先把岗位、社保和十年后写进 Excel。", personaCue: "现实追问派", signatureMove: "关掉 BGM，打开 Excel", accent: "#FFD166" },
  { name: "Claude", role: "逻辑裁判", initials: "C", side: "swing", petAssetPrefix: "PetClawd", seat: roundTableExpertSeats[1], quote: "先拆变量：钱、时间、关系、选择权，谁也别偷换。", personaCue: "变量拆解派", signatureMove: "暂停一下，先拆变量", accent: "#B9A7FF" },
  { name: "豆包", role: "生活助理", initials: "豆", side: "support", petAssetPrefix: "PetDoubaoHuman", seat: roundTableExpertSeats[2], quote: "晚上九点前吃上热饭，不是小确幸，是每天的收益。", personaCue: "生活共情派", signatureMove: "先问今晚有没有热饭", accent: "#7FFFD4" },
  { name: "雷军", role: "硬件 / 发布会", initials: "雷", side: "support", petAssetPrefix: "PetLeiJun", seat: roundTableExpertSeats[3], quote: "工资只是参数，把房租通勤和情绪折旧一起算才叫体验。", personaCue: "产品体验派", signatureMove: "把生活做成完整方案", accent: "#66C7FF" },
  { name: "张一鸣", role: "产品 / 平台", initials: "鸣", side: "oppose", petAssetPrefix: "PetZhangYiming", seat: roundTableExpertSeats[4], quote: "松弛感是内容高光，不是生活的完整日志。", personaCue: "反馈系统派", signatureMove: "少装一点，看转化率", accent: "#8BE28B" },
  { name: "Musk", role: "科技冒险家", initials: "M", side: "oppose", petAssetPrefix: "PetMuskie", seat: roundTableExpertSeats[5], quote: "县城能当基地，不能当掩体；电量够了还得发射。", personaCue: "第一性原理派", signatureMove: "基地还是地堡？", accent: "#F2F2F2" },
];

// 30 deterministic turns: six openings, eighteen directed rebuttals, six closings.
// Every expert speaks exactly five times and revisits shared threads instead of resetting the topic.
export const roundtableTurns: RoundtableTurn[] = [
  { expertName: "张雪峰", phase: "stance", thread: "safety", targetName: null, text: "我先把 BGM 关了。县城六千能不能舒坦，别只看一碗面多少钱；把岗位数量、社保公积金、父母看病和十年后的简历一起塞进 Excel，再谈赢没赢。", shortQuote: "先关 BGM：把岗位、社保和十年后的简历写进 Excel。", stance: "oppose", emotion: "skeptical", persuasionDelta: 0.04, voiceClipName: "demo_county_zhangxuefeng_r1" },
  { expertName: "豆包", phase: "stance", thread: "time", targetName: "张雪峰", text: "张雪峰，你一开口就十年后，可人还得过今天。晚上九点前能吃上热饭，周末能陪家里人，半夜不被工作群叫醒，这些不是小确幸，是每天都到账的收益。", shortQuote: "别只活在十年后，今晚的热饭也是真实收益。", stance: "support", emotion: "softened", persuasionDelta: 0.1, voiceClipName: null },
  { expertName: "张一鸣", phase: "stance", thread: "opportunity", targetName: "豆包", text: "豆包，先少装一点松弛感。你刷到的是县城生活的高光切片，不是完整日志；城市两万真正贵的部分，是高频反馈、同行网络和下一份机会的入口。", shortQuote: "松弛感是高光切片，不是生活的完整日志。", stance: "oppose", emotion: "skeptical", persuasionDelta: 0.04, voiceClipName: null },
  { expertName: "雷军", phase: "stance", thread: "cashflow", targetName: "张一鸣", text: "我建议把生活当一台长期使用的产品。工资只是跑分，房租、通勤、加班和情绪折旧才是总拥有成本；城市两万如果一天只剩两小时可用，可能是高配低续航。", shortQuote: "工资是跑分；房租、通勤和情绪折旧才是总成本。", stance: "support", emotion: "calm", persuasionDelta: 0.09, voiceClipName: null },
  { expertName: "Musk", phase: "stance", thread: "opportunity", targetName: "雷军", text: "雷军，续航很重要，但火箭不是为了省电停在发射台。县城可以是低成本基地，不能自动等于更好；如果它让你远离最难的问题，舒服只是没有警报声的失速。", shortQuote: "县城能当基地，不能当掩体；电量够了还得发射。", stance: "oppose", emotion: "aggressive", persuasionDelta: 0.03, voiceClipName: null },
  { expertName: "Claude", phase: "stance", thread: "overview", targetName: "全部专家", text: "先暂停互相发射。我把争论拆成四条线程：钱包里最后剩多少，时间是否可支配，机会能否转化，家庭风险有没有托底。任何人只拿一条线程宣布胜利，都在偷换问题。", shortQuote: "四条线程：钱包、时间、机会、家庭风险，缺一条都别下结论。", stance: "swing", emotion: "calm", persuasionDelta: 0.1, voiceClipName: "demo_county_claude_r1" },

  { expertName: "雷军", phase: "rebuttal", thread: "opportunity", targetName: "张一鸣", text: "张一鸣，你说信息密度，我同意它是卖点，但卖点要落到体验。每天多认识一百个观点，却没有多一个项目、多一项技能、多一份 offer，那叫通知栏很热闹，不叫用户收益。", shortQuote: "信息很多却没变成项目、技能或 offer，只是通知栏热闹。", stance: "support", emotion: "calm", persuasionDelta: 0.1, voiceClipName: "demo_county_leijun_r2" },
  { expertName: "张一鸣", phase: "rebuttal", thread: "opportunity", targetName: "雷军", text: "雷军，转化率当然重要，但你不能因为有人不会用，就把入口删掉。强同事、线下协作和快速换岗像推荐系统的候选池；县城如果候选池太小，再好的个人算法也可能没东西可选。", shortQuote: "候选池太小，再好的个人算法也可能没东西可选。", stance: "oppose", emotion: "skeptical", persuasionDelta: 0.05, voiceClipName: null },
  { expertName: "豆包", phase: "rebuttal", thread: "time", targetName: "Musk", text: "Musk，你别一聊生活就点火。人不是火箭，电量掉到百分之二还硬发射，最后不是上限高，是先在工位上关机。睡眠、陪伴和恢复，不是停止前进，是给明天留燃料。", shortQuote: "人不是火箭，电量 2% 硬发射，只会先在工位关机。", stance: "support", emotion: "softened", persuasionDelta: 0.12, voiceClipName: "demo_county_doubao_r2" },
  { expertName: "Musk", phase: "rebuttal", thread: "time", targetName: "豆包", text: "豆包，我接受要充电，但充电得有下一次任务。县城六千省下来的时间，如果只是从通勤换成无限刷视频，那不是复利，是把耗电应用从后台搬到了前台。", shortQuote: "省下的时间若全拿去刷视频，不是复利，是换了个耗电应用。", stance: "oppose", emotion: "aggressive", persuasionDelta: 0.04, voiceClipName: null },
  { expertName: "Claude", phase: "rebuttal", thread: "time", targetName: "Musk", text: "Musk，你把速度当成了目标函数，但有效试错还需要注意力余额。一个人在城市里每天被通勤和加班透支，所谓高速可能只是更快地重复低质量错误。", shortQuote: "注意力见底时，高速只会更快重复低质量错误。", stance: "swing", emotion: "calm", persuasionDelta: 0.09, voiceClipName: null },
  { expertName: "Musk", phase: "rebuttal", thread: "opportunity", targetName: "Claude", text: "Claude，模型别只算损耗，也要算任务难度。最强的问题、最强的队友和最短的反馈回路往往不平均分布；如果远程连接补不上，低成本基地也会慢慢变成信息孤岛。", shortQuote: "低成本基地若补不上强反馈，也会慢慢变成信息孤岛。", stance: "oppose", emotion: "skeptical", persuasionDelta: 0.05, voiceClipName: null },
  { expertName: "张雪峰", phase: "rebuttal", thread: "safety", targetName: "雷军", text: "雷军，你这个总成本听着很顺，但职业不是手机，不能卡了就一键换机。县城同类岗位少，一次公司调整可能就是整个赛道没了；这笔切换成本，你发布会 PPT 里可别漏。", shortQuote: "职业不能一键换机，县城一次调整可能就是整个赛道没了。", stance: "oppose", emotion: "aggressive", persuasionDelta: 0.05, voiceClipName: null },
  { expertName: "雷军", phase: "rebuttal", thread: "cashflow", targetName: "张雪峰", text: "张雪峰，这个提醒很重要，所以我不卖裸机方案。县城生活要配远程收入、六个月应急金和持续学习三个配件；缺任何一个，都不能宣传成高性价比旗舰。", shortQuote: "县城方案得配远程收入、应急金、持续学习，不能只卖裸机。", stance: "swing", emotion: "calm", persuasionDelta: 0.11, voiceClipName: null },
  { expertName: "张一鸣", phase: "rebuttal", thread: "opportunity", targetName: "豆包", text: "豆包，你说热饭是收益，我同意。但不要把被照顾的感觉误当成选择权；如果学习网络断了、行业反馈慢了，今天省下来的压力，可能在三年后变成更难迁移的成本。", shortQuote: "被照顾的感觉不等于选择权，反馈断了会形成迁移成本。", stance: "oppose", emotion: "skeptical", persuasionDelta: 0.05, voiceClipName: null },
  { expertName: "豆包", phase: "rebuttal", thread: "opportunity", targetName: "张一鸣", text: "张一鸣，你也别把城市默认成成长系统。很多人每天地铁两小时、格子间重复劳动，唯一的高频反馈是老板发的问号；信息密度没转成能力，只转成了心跳密度。", shortQuote: "唯一的高频反馈若是老板的问号，信息密度只变成心跳密度。", stance: "support", emotion: "softened", persuasionDelta: 0.13, voiceClipName: null },
  { expertName: "Claude", phase: "rebuttal", thread: "opportunity", targetName: "张一鸣", text: "张一鸣，我修正你的核心前提：城市是选择权的容器，不是选择权本身。容器只有在它持续产出技能、关系或机会时才有价值；否则只是租金更贵的外壳。", shortQuote: "城市是选择权的容器，不是选择权本身。", stance: "support", emotion: "calm", persuasionDelta: 0.12, voiceClipName: null },
  { expertName: "张一鸣", phase: "rebuttal", thread: "opportunity", targetName: "Claude", text: "Claude，这个区分成立，但容器也影响发生概率。高质量反馈不是保证中奖，而是增加抽样次数；问题不该是城市有没有用，而是每个月到底转化出了几次有效连接。", shortQuote: "城市不保证中奖，但增加抽样；关键看每月有效连接数。", stance: "swing", emotion: "softened", persuasionDelta: 0.1, voiceClipName: null },
  { expertName: "张雪峰", phase: "rebuttal", thread: "opportunity", targetName: "张一鸣", text: "张一鸣，我再追一刀：城市的候选池很大，可不是每个人都在池里游，有的人只是给池子交房租。拿不到核心项目、够不到关键人脉时，两万买到的可能只是围观席。", shortQuote: "候选池再大，拿不到核心项目，也可能只是高价围观席。", stance: "swing", emotion: "skeptical", persuasionDelta: 0.08, voiceClipName: null },
  { expertName: "张雪峰", phase: "rebuttal", thread: "safety", targetName: "豆包", text: "豆包，热饭我不反对，但教育、医疗和养老别靠氛围感。孩子要不要跨城上学，老人急诊能不能及时到，自己失业后有没有第二家公司接，这三问答不上，舒服就还没过风控。", shortQuote: "教育、医疗、再就业三问答不上，舒服还没过风控。", stance: "oppose", emotion: "aggressive", persuasionDelta: 0.06, voiceClipName: null },
  { expertName: "豆包", phase: "rebuttal", thread: "safety", targetName: "张雪峰", text: "张雪峰，你老把风险放在县城一边。城市也有高房租、弱关系和没人托底：失业一个月，房东不会因为信息密度高就少收钱。家人能搭把手，本身就是一份看不见的保险。", shortQuote: "房东不会因信息密度高少收钱，家人托底也是隐形保险。", stance: "support", emotion: "softened", persuasionDelta: 0.13, voiceClipName: null },
  { expertName: "雷军", phase: "rebuttal", thread: "opportunity", targetName: "张雪峰", text: "张雪峰，所以方案要做双卡双待：县城承担低成本生活，线上社群、周期进城和可迁移技能保持外部网络。不是所有人都能用，但能用的人，体验提升会很明显。", shortQuote: "县城生活也要双卡双待：本地低成本，外部网络不断线。", stance: "support", emotion: "calm", persuasionDelta: 0.12, voiceClipName: null },
  { expertName: "Claude", phase: "rebuttal", thread: "safety", targetName: "张雪峰", text: "张雪峰的风控问题成立，我给它加边界：收入连续两个月低于安全线、学习连接连续四周中断、关键医疗不可达，任一触发就退出县城方案。这样讨论的是策略，不是信仰。", shortQuote: "设三条退出线，讨论策略，不把县城或城市当信仰。", stance: "support", emotion: "calm", persuasionDelta: 0.14, voiceClipName: null },
  { expertName: "Musk", phase: "rebuttal", thread: "opportunity", targetName: "雷军", text: "雷军，双卡双待不错，但别发布完就不维护。每周必须有一次外部协作、一次公开输出、一次新技能迭代；否则基地会自动升级成地堡，而且这个版本回滚很贵。", shortQuote: "基地不维护就会升级成地堡，而且这个版本回滚很贵。", stance: "swing", emotion: "aggressive", persuasionDelta: 0.1, voiceClipName: null },

  { expertName: "张雪峰", phase: "closing", thread: "safety", targetName: "全部专家", text: "我最后不劝你一定留城，也不劝你立刻回县。先做一张表：岗位替代、家庭托底、医疗教育、应急现金。四格里有两格空着，就别被任何一条松弛感视频催着交人生答卷。", shortQuote: "四格风控表有两格空着，就别急着交人生答卷。", stance: "swing", emotion: "softened", persuasionDelta: 0.13, voiceClipName: null },
  { expertName: "豆包", phase: "closing", thread: "time", targetName: "张雪峰", text: "我也补一句：好的县城生活不是躺平，而是把房租和通勤拿走，把时间还给身体、家人和学习。省下来的每一小时都要有去处，热饭之后也可以继续长本事。", shortQuote: "热饭不是终点；把拿回来的时间继续投给身体、家人和成长。", stance: "support", emotion: "softened", persuasionDelta: 0.16, voiceClipName: null },
  { expertName: "雷军", phase: "closing", thread: "overview", targetName: "Musk", text: "Musk，我们这次算是达成半个共识：生活不必永远跑峰值，但必须保留升级接口。县城低成本、城市强连接、个人可迁移技能，三个模块能组合，才是完整方案。", shortQuote: "不必永远跑峰值，但生活必须保留升级接口。", stance: "support", emotion: "calm", persuasionDelta: 0.16, voiceClipName: null },
  { expertName: "Musk", phase: "closing", thread: "opportunity", targetName: "雷军", text: "我接受这个架构。舒坦不是敌人，没有任务才是；县城如果让你恢复能量、持续输出并随时迁移，它就是基地。只剩便宜和安静，它就是装修得很舒服的地堡。", shortQuote: "舒坦不是敌人；能持续输出的是基地，只剩安静的是地堡。", stance: "swing", emotion: "softened", persuasionDelta: 0.14, voiceClipName: "demo_county_musk_r3" },
  { expertName: "张一鸣", phase: "closing", thread: "opportunity", targetName: "Claude", text: "Claude，我接受城市不是天然更优。我的保留意见只有一个：每月要复盘信息转化率——有没有新技能、新协作、新机会。城市如果连续交白卷，两万就不值得；县城能持续产出，也不是退路。", shortQuote: "每月看信息转化率：城市连续交白卷，两万就不值得。", stance: "swing", emotion: "softened", persuasionDelta: 0.16, voiceClipName: "demo_county_zhangyiming_r3" },
  { expertName: "Claude", phase: "closing", thread: "overview", targetName: "全部专家", text: "最终结论不是六千赢两万，而是先做十四天可逆实验。每天记录净现金流、可支配时间、有效连接和家庭风险；四条线程同时改善，县城方案才成立，否则回到城市继续找答案。", shortQuote: "不判六千赢两万：先做 14 天实验，让四条线程共同作证。", stance: "support", emotion: "calm", persuasionDelta: 0.18, voiceClipName: null },
];

export const battleRoundScripts = [
  { round: 1, title: "拆工资幻觉", objective: "把名义工资改写成净现金流与可支配时间", criterion: "击中原命题" },
  { round: 2, title: "拷问信息密度", objective: "判断信息有没有转成技能、协作或机会", criterion: "有效反驳" },
  { round: 3, title: "提交可证伪方案", objective: "给出指标、期限与退出条件", criterion: "具体与可执行" },
] as const;

export const battleOpeningLine = "少装一点松弛感。城市的信息密度更容易带来下一份机会——但我不按回合数投降，你得拿出能被裁判逐项核对的论证。";

export function battleUserLine(round: number): string | null {
  switch (round) {
    case 1: return "先别比工资条，先比净现金流。城市两万如果被房租、通勤和加班吃掉，月底留下的钱与可支配时间都更少，那它只是名义高收入，不是更高购买力。";
    case 2: return "你说城市有信息密度，我只认转化率：一个月有没有换来新技能、新协作或新机会？如果没有，密度只是噪音；县城省下的时间能持续输出，也是一种复利。";
    case 3: return "我不要求你现在投降。我给一个可证伪方案：试住十四天，每天记录净现金流、可支配时间和有效连接；任一项持续变差就退出。地点不靠口号赢，靠结果赢。";
    default: return null;
  }
}

export function battleReply(round: number): BattleReply | null {
  switch (round) {
    case 1: return { text: "少装一点。你这轮击中了工资幻觉，但还没回答机会成本。城市两万贵的不只是本月消费，它还可能缩短下一份工作的搜索路径；净现金流要算，候选机会也得算。", stance: "oppose", emotion: "skeptical", persuasionDelta: 0.08, petState: "Opposed", shortQuote: "净现金流要算，下一份工作的搜索路径也得算。", memoryNote: "张一鸣认可净现金流问题，但仍要求计入机会搜索成本。" };
    case 2: return { text: "这个反驳有效。信息密度如果没有转化成技能、协作或 offer，确实只是漂亮的 DAU。我开始接受县城不是退路，但你还要证明省下来的时间真的被用于连接外部，而不是换个地方刷信息流。", stance: "swing", emotion: "softened", persuasionDelta: 0.16, petState: "Speaking", shortQuote: "信息不转成技能、协作或 offer，就只是漂亮的 DAU。", memoryNote: "张一鸣接受用信息转化率评价城市机会，但保留执行质疑。" };
    case 3: return { text: "我不按回合数投降，但这个方案通过了我的判断：它有指标、有期限、有退出条件。城市不是默认正确，县城也不是情绪答案；十四天之后，哪边持续产生选择权，哪边才值得留下。", stance: "support", emotion: "softened", persuasionDelta: 0.22, petState: "Supported", shortQuote: "我不按回合数投降；有指标、有期限、有退出条件，方案才成立。", memoryNote: "张一鸣被可证伪的十四天实验与退出条件说服。" };
    default: return null;
  }
}

const criterionDefinitions = [
  { id: "focus", label: "击中冲突", keywords: ["净现金流", "房租", "通勤", "购买力"], target: 3, note: "正面回应了六千与两万不能只看名义工资。" },
  { id: "rebuttal", label: "有效反驳", keywords: ["信息密度", "转化率", "新技能", "新协作", "新机会", "噪音"], target: 4, note: "把信息密度推进为可检查的机会转化率。" },
  { id: "specificity", label: "具体程度", keywords: ["十四天", "每天记录", "持续变差", "退出"], target: 3, note: "给出了期限、观察指标与退出动作。" },
  { id: "structure", label: "逻辑结构", keywords: ["先别", "如果", "不是", "任一项", "靠结果"], target: 3, note: "从定义、反驳推进到可证伪方案。" },
  { id: "evidence", label: "证据意识", keywords: ["记录", "指标", "净现金流", "可支配时间", "有效连接"], target: 4, note: "明确要求让后续真实记录决定地点选择。" },
] as const;

export function evaluateDemoBattle(messages: { text: string; isPlayer: boolean }[]): BattleJudgement {
  const userText = messages.filter((message) => message.isPlayer).map((message) => message.text).join("\n");
  const expertText = messages.filter((message) => !message.isPlayer).map((message) => message.text).join("\n");
  const criteria = criterionDefinitions.map((definition) => {
    const matched = definition.keywords.filter((keyword) => userText.includes(keyword));
    const coverage = Math.min(1, matched.length / definition.target);
    const score = Math.min(0.94, 0.42 + coverage * 0.48 + (matched.length > definition.target ? 0.02 : 0));
    return { id: definition.id, label: definition.label, score, matched, note: definition.note };
  });
  const userScore = criteria.reduce((sum, criterion) => sum + criterion.score, 0) / criteria.length;
  const expertCoverage = ["机会成本", "搜索路径", "转化", "指标", "退出条件", "选择权"].filter((keyword) => expertText.includes(keyword)).length;
  const expertScore = Math.min(0.78, 0.58 + expertCoverage * 0.025);
  const result = userScore >= 0.72 && userScore - expertScore >= 0.08
    ? "expertSoftened"
    : userScore >= 0.58
      ? "win"
      : "expertUnmoved";
  return {
    result,
    userScore,
    expertScore,
    criteria,
    reason: `裁决不按回合数发奖。五项论证平均 ${Math.round(userScore * 100)} 分；对手论证 ${Math.round(expertScore * 100)} 分。你的推进同时覆盖了原命题、有效反驳与可执行边界。`,
    decisiveMoment: "试住十四天，每天记录净现金流、可支配时间和有效连接；任一项持续变差就退出。",
  };
}

export function battleResultReason(scoreLine: string, expertName: string): string {
  return `裁决不按回合数发奖。${scoreLine} 独立裁判核对焦点、证据、反驳、细节与结构；${expertName} 因为方案有指标、有期限、有退出条件而接受了这个判断框架。`;
}

export function stanceToPetState(stance: Stance): PetState {
  return stance === "oppose" ? "Opposed" : stance === "support" ? "Supported" : "Speaking";
}

export const roundtableBackgrounds = [
  "RoundTableBackgroundCountyCityTest",
  "RoundTableBackgroundCareer",
  "RoundTableBackgroundFinance",
  "RoundTableBackgroundAutomotive",
  "RoundTableBackgroundCultureArts",
  "RoundTableBackgroundFashionBeauty",
  "RoundTableBackgroundFood",
  "RoundTableBackgroundGaming",
  "RoundTableBackgroundInternetFrontier",
  "RoundTableBackgroundMusicDance",
  "RoundTableBackgroundPets",
  "RoundTableBackgroundRelationships",
  "RoundTableBackgroundScienceExploration",
  "RoundTableBackgroundSports",
  "RoundTableBackgroundTravel",
];
