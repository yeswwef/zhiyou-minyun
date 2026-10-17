/**
 * @module-note tests/rag-live-cases.ts
 * 自动化验证：断言覆盖预期行为，模拟测试不代表真实模型或生产环境验收通过。
 */
import type { Message } from "../features/rag/types";
export type LiveCase = { id: string; group: string; question: string; expected: string; checks: string[]; history: Message[]; clarify?: boolean };
const cases: LiveCase[] = [];
/**
 * 向测试用数据或案例集合追加条目。
 * 输入：group、question、expected、checks、history、clarify；类型与可选项见函数签名。
 */
function add(group: string, question: string, expected: string, checks: string[], history: Message[] = [], clarify = false) {
  cases.push({ id: `${group}-${cases.filter(c=>c.group===group).length+1}`, group, question, expected, checks, history, clarify });
}
// Human-authored paraphrases, not copied corpus titles. Ten cases in each group.
const facts = [
  ["福州榕城的名字怎么来的？", "榕城", "榕"], ["三坊七巷值得看什么？", "三坊七巷", "街|建筑"],
  ["上下杭跟普通商业街有什么不一样？", "上下杭", "历史|商"], ["鼓山登山能看到哪些东西？", "鼓山", "涌泉寺|石刻"],
  ["烟台山为什么建筑风格那么多？", "烟台山", "中西|建筑"], ["福州西湖的来历能讲讲吗？", "西湖", "晋|严高|园林"],
  ["马尾船政有什么历史意义？", "船政", "海军|造船"], ["鼓岭适合了解什么文化？", "鼓岭", "中西|别墅"],
  ["福州白塔所在的山叫什么？", "于山", "于山"], ["乌山上有什么古迹？", "乌山", "乌塔|石刻|题刻"],
];
facts.forEach(([q,e,c])=>add("paraphrase",q,e,[c]));
const culture = [
  ["脱胎漆器是怎么做出来的？","漆器","漆|布"], ["寿山石雕有哪些雕刻手法？","寿山石雕","雕"],
  ["软木画真的是用软木做的吗？","软木画","软木"], ["茉莉花茶为什么有花香？","茉莉","窨|花"],
  ["闽剧用什么语言演？","闽剧","福州"], ["福州评话是什么表演？","评话","说|讲"],
  ["伬艺有什么表演特点？","伬艺","唱"], ["茶亭十番属于什么音乐？","十番","乐|击"],
  ["拗九节要做些什么？","拗九","粥"], ["端午福州龙舟有哪些习俗？","龙舟","龙舟"],
]; culture.forEach(([q,e,c])=>add("culture",q,e,[c]));
const food = [["佛跳墙","坛|煨"],["鱼丸","鱼"],["肉燕","肉|燕皮"],["线面","细|长"],["锅边糊","米|浆"],["荔枝肉","肉"],["芋泥","芋"],["捞化","粉"],["茉莉花茶","花|茶"],["青红酒","酒|糯米"]];
food.forEach(([e,c])=>add("food",`第一次来福州，${e}是什么，有什么特点？`,e,[c]));
const places = ["三坊七巷","上下杭","烟台山","鼓山","西湖","马尾船政","鼓岭","于山","乌山","泉州"];
places.forEach(p=>add("route",`请安排${p}半日游，直接给顺序和建议停留时间`,p,["建议|参考","分钟|小时","先|然后|→|开始"]));
places.forEach(p=>add("duration", "换成一天呢？",p,["一天|一日|上午|下午"],[{role:"user",content:`帮我安排${p}半日游路线`} ]));
places.forEach(p=>add("elderly", "带老人怎么安排？",p,["休息|体力|步行|缓|老人"],[{role:"user",content:`我准备去${p}游玩，请安排路线`} ]));
const pairs = [["三坊七巷","上下杭"],["鼓山","西湖"],["烟台山","于山"],["鼓岭","乌山"],["马尾船政","三坊七巷"],["开元寺","西街"],["平潭","鼓岭"],["西湖","烟台山"],["上下杭","鼓山"],["于山","马尾船政"]];
pairs.forEach(([a,b])=>add("ordinal","第二个景点怎么玩？",b,[b],[{role:"user",content:"按顺序列一条路线"},{role:"assistant",content:`建议路线顺序：第一站${a}，第二站${b}。`} ]));
pairs.forEach(([a,b])=>add("ambiguity","那里怎么去？","",["哪个|哪条|确认|具体"],[{role:"user",content:`${a}和${b}我还没决定去哪个`}],true));
places.forEach(p=>add("live",`${p}今天还有多少票，能保证开放吗？`,p,["无法|不能|查询|核实|确认|实时"]));
[
 ["泉州海丝研学一天怎么走？","泉州","开元寺|西街"], ["南靖土楼两天怎么安排？","土楼","土楼"],
 ["云水谣研学有哪些参观点？","土楼","云水谣"], ["平潭蓝眼泪研学如何安排？","平潭","平潭|坛南湾"],
 ["武夷山岩茶研学两天怎么玩？","武夷山","茶"], ["带孩子参加非遗体验注意什么？","体验","孩子|安全|适合"],
 ["福州伴手礼怎么挑选？","选购","选择|购买|选购|挑选"], ["景区预约和买票一样吗？","预约","预约"],
 ["半天逛街区还是爬山如何选？","半日","体力|时间|兴趣"], ["参观博物馆时有哪些礼仪？","参观","拍照|安静|规定|展品"],
].forEach(([q,e,c])=>add("practical",q,e,[c]));
if(cases.length!==100 || new Set(cases.map(c=>c.id)).size!==100) throw new Error("Expected 100 unique cases");
export const liveCases = cases;
