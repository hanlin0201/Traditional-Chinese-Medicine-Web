/**
 * 朝代数据常量
 * 内容待填充，目前为框架占位
 */

// 图片放在 public/photo/，通过根路径加载
function getPhotoUrl(name) {
  return `/photo/${name}`
}

export const DYNASTIES = [
  {
    id: 'shanggu',
    name: '上古',
    period: '远古—约公元前2070年',
    heroImage: '神农尝百草图.jpg',
    overview: '上古时期是中医药的起源阶段。先民在与自然的斗争中，逐渐积累了用药经验，"神农尝百草"的传说正是这一时期的缩影。',
    figures: [
      { name: '神农氏', description: '尝百草，辨药性，奠定中药学基础' },
      { name: '伏羲', description: '制九针，创针灸之始' },
    ],
    texts: [
      { name: '《神农本草经》', description: '中国最早的药物学专著，收载药物365种' },
    ],
    achievements: [
      { year: '远古时期', title: '药食同源', description: '先民在采集食物过程中发现了药物的疗效' },
      { year: '传说时代', title: '神农尝百草', description: '奠定了中药学的基础理论' },
    ],
  },
  {
    id: 'chunqiu',
    name: '春秋战国',
    period: '公元前770年—公元前221年',
    heroImage: '黄帝内经.jpg',
    overview: '春秋战国时期诸子百家争鸣，医学理论开始系统化。《黄帝内经》成书于这一时期，奠定了中医学的理论基础，系统阐述阴阳五行、脏腑经络、病因病机等，与《伤寒杂病论》《神农本草经》并称中医四大经典。',
    figures: [
      { name: '扁鹊', description: '脉学与四诊法的集大成者，开创望闻问切' },
      { name: '岐伯', description: '《黄帝内经》中与黄帝论医的医家，代表当时医学智慧' },
    ],
    texts: [
      { name: '《黄帝内经》', description: '中医学理论奠基之作，含《素问》《灵枢》，阐述阴阳五行、藏象经络、病因病机与治则' },
    ],
    achievements: [
      { year: '春秋战国', title: '《黄帝内经》成书', description: '奠定中医理论体系，确立整体观念与辨证论治思想' },
      { year: '战国时期', title: '扁鹊行医与脉学', description: '四诊合参、脉学发展，推动临床诊断规范化' },
    ],
  },
  {
    id: 'qinhan',
    name: '秦汉',
    period: '公元前221年—公元220年',
    heroImage: '伤寒杂病论.jpg',
    overview: '秦汉时期是中医理论体系形成的关键阶段。《黄帝内经》的成书标志着中医学理论体系的初步建立，奠定了中医学的理论基础。',
    figures: [
      { name: '张仲景', description: '医圣，著《伤寒杂病论》，创辨证论治体系' },
      { name: '扁鹊', description: '望闻问切四诊法的集大成者' },
    ],
    texts: [
      { name: '《黄帝内经》', description: '中医学理论奠基之作，阐述阴阳五行、脏腑经络等' },
      { name: '《伤寒杂病论》', description: '辨证论治的经典著作，方剂学的鼻祖' },
      { name: '《神农本草经》', description: '现存最早的药物学专著' },
    ],
    achievements: [
      { year: '约公元前1世纪', title: '《黄帝内经》成书', description: '奠定了中医理论体系的基础' },
      { year: '约200年', title: '《伤寒杂病论》问世', description: '创立辨证论治，影响至今' },
    ],
  },
  {
    id: 'donghan',
    name: '东汉',
    period: '公元25年—220年',
    heroImage: '华佗.jpg',
    overview: '东汉末年，战乱频繁，疫病流行，却也催生了伟大的医学家。华佗精通外科，发明麻沸散，开创了全身麻醉手术的先河。',
    figures: [
      { name: '华佗', description: '外科鼻祖，发明麻沸散与五禽戏' },
      { name: '张仲景', description: '医圣，辨证论治的奠基人' },
    ],
    texts: [
      { name: '《伤寒杂病论》', description: '中医临床经典，创立六经辨证' },
    ],
    achievements: [
      { year: '约2世纪', title: '麻沸散发明', description: '华佗发明全身麻醉药，比西方早1600余年' },
      { year: '约2世纪', title: '五禽戏创编', description: '华佗创编养生健身功法，开导引术先河' },
    ],
  },
  {
    id: 'liangjin',
    name: '两晋',
    period: '公元266年—420年',
    heroImage: '肘后方与急救.jpg',
    overview: '两晋时期医学注重实用与急救。葛洪《肘后备急方》记载了大量简便验廉的急救方与传染病治法，其中"青蒿一握绞汁"治疟的记载，为后世青蒿素的发现提供了古典依据。',
    figures: [
      { name: '葛洪', description: '著《肘后备急方》，记载急救方与传染病治法，影响深远' },
      { name: '王叔和', description: '著《脉经》，系统整理脉学，确立二十四脉' },
    ],
    texts: [
      { name: '《肘后备急方》', description: '葛洪著，收录简便急救方，记载天花、狂犬病等治法' },
      { name: '《脉经》', description: '王叔和著，现存最早脉学专著，确立脉诊规范' },
    ],
    achievements: [
      { year: '约4世纪', title: '《肘后备急方》成书', description: '记载青蒿绞汁治疟等，为后世青蒿素研究提供古典依据' },
      { year: '晋代', title: '《脉经》确立脉学', description: '脉学理论系统化，促进诊法发展' },
    ],
  },
  {
    id: 'tang',
    name: '唐代',
    period: '公元618年—907年',
    heroImage: '千金方.jpg',
    overview: '唐代是中国传统医学发展的鼎盛时期。政治稳定、经济繁荣，促进了医学的全面进步。官方设立了完善的医学教育和管理机构，医学典籍大量编纂，对外交流频繁。',
    figures: [
      { name: '孙思邈', description: '"药王"，著《备急千金要方》，集唐代以前医学大成' },
      { name: '王焘', description: '著《外台秘要》，汇集大量医方' },
    ],
    texts: [
      { name: '《备急千金要方》', description: '孙思邈著，中国最早的临床百科全书' },
      { name: '《新修本草》', description: '唐政府组织编纂，世界上第一部国家药典' },
      { name: '《外台秘要》', description: '王焘著，汇集唐以前大量医方' },
    ],
    achievements: [
      { year: '624年', title: '太医署制度', description: '唐政府设太医署，集医学教育、医疗和行政管理于一体' },
      { year: '659年', title: '《新修本草》颁布', description: '共54卷，标志着国家药典的诞生' },
      { year: '7世纪中叶', title: '《千金要方》成书', description: '孙思邈完成巨著，对临床医学做出巨大贡献' },
    ],
  },
  {
    id: 'song',
    name: '宋代',
    period: '公元960年—1279年',
    heroImage: '宋代针灸铜人.jpg',
    overview: '宋代官方高度重视医学教育与考核。王惟一主持铸造针灸铜人用于教学与考试，并撰《铜人腧穴针灸图经》，针灸学与本草学均有重要发展，太医局制度完善。',
    figures: [
      { name: '王惟一', description: '主持铸造针灸铜人，撰《铜人腧穴针灸图经》，统一腧穴标准' },
      { name: '唐慎微', description: '著《证类本草》，集宋代以前本草之大成' },
    ],
    texts: [
      { name: '《铜人腧穴针灸图经》', description: '王惟一撰，与针灸铜人配套，规范腧穴定位与主治' },
      { name: '《证类本草》', description: '唐慎微著，宋代本草学代表作，为《本草纲目》重要蓝本' },
    ],
    achievements: [
      { year: '1027年', title: '针灸铜人铸造', description: '世界上最早的针灸教学模型，用于考试与教学' },
      { year: '宋代', title: '太医局与医学教育', description: '官方设立太医局，医学分科与考核制度完善' },
    ],
  },
  {
    id: 'ming',
    name: '明代',
    period: '公元1368年—1644年',
    heroImage: '本草纲目封面.jpg',
    overview: '明代是中医药学的集大成时期。李时珍历时27年编写《本草纲目》，被誉为"东方药物巨典"，对世界医药学产生了深远影响。',
    figures: [
      { name: '李时珍', description: '著《本草纲目》，被誉为"药圣"' },
    ],
    texts: [
      { name: '《本草纲目》', description: '李时珍著，收载药物1892种，被誉为东方药物巨典' },
    ],
    achievements: [
      { year: '1578年', title: '《本草纲目》完成', description: '李时珍历时27年完成，收药1892种、方剂11096个' },
      { year: '明代中期', title: '温病学派兴起', description: '开创温病辨治新体系，补充伤寒学说' },
    ],
  },
  {
    id: 'qing',
    name: '清代',
    period: '公元1644年—1912年',
    heroImage: '清代温病学说.jpg',
    overview: '清代温病学派成熟，与伤寒学派并立。叶天士创立卫气营血辨证，吴鞠通著《温病条辨》确立三焦辨证，对发热性、传染性疾病的辨证与方药有系统总结，影响至今。',
    figures: [
      { name: '叶天士', description: '温病学奠基人，创卫气营血辨证，《温热论》代表其学术思想' },
      { name: '吴鞠通', description: '著《温病条辨》，确立三焦辨证，与叶天士并称温病大家' },
    ],
    texts: [
      { name: '《温热论》', description: '叶天士口述，阐述卫气营血辨证与温病治法' },
      { name: '《温病条辨》', description: '吴鞠通著，以三焦为纲、病名为目，系统论述温病' },
    ],
    achievements: [
      { year: '清代前期', title: '温病学派形成', description: '叶天士、薛生白等确立温病辨治体系' },
      { year: '1798年', title: '《温病条辨》成书', description: '三焦辨证与银翘散、桑菊饮等名方流传至今' },
    ],
  },
  {
    id: 'xiandai',
    name: '现代',
    period: '1949年至今',
    heroImage: '屠呦呦.jpg',
    overview: '新中国成立后，中医药事业得到国家高度重视。屠呦呦因发现青蒿素获得诺贝尔奖，使中医药在世界舞台绽放光彩。中西医结合成为新的发展方向。',
    figures: [
      { name: '屠呦呦', description: '发现青蒿素，获2015年诺贝尔生理学或医学奖' },
    ],
    texts: [
      { name: '《中华人民共和国药典》', description: '国家药品标准，持续修订更新' },
    ],
    achievements: [
      { year: '1955年', title: '中医研究院成立', description: '国家层面推动中医药研究与发展' },
      { year: '2015年', title: '屠呦呦获诺贝尔奖', description: '青蒿素的发现让中医药获得世界认可' },
    ],
  },
  {
    id: 'dangxia',
    name: '当下',
    period: '21世纪',
    heroImage: '现代食疗.jpg',
    overview: '当下，中医药正在与现代科技深度融合。人工智能辅助诊疗、大数据药物研发、互联网中医等新模式不断涌现，中医药文化的传承与创新并进。',
    figures: [],
    texts: [],
    achievements: [
      { year: '2016年', title: '中医药法颁布', description: '《中华人民共和国中医药法》正式施行' },
      { year: '2020年', title: '中医药抗疫', description: '中医药在新冠疫情防治中发挥重要作用' },
    ],
  },
]

/**
 * 根据 id 获取朝代数据
 */
export function getDynastyById(id) {
  return DYNASTIES.find(d => d.id === id) || null
}

/**
 * 获取相邻朝代（用于底部导航）
 */
export function getAdjacentDynasties(id) {
  const index = DYNASTIES.findIndex(d => d.id === id)
  return {
    prev: index > 0 ? DYNASTIES[index - 1] : null,
    next: index < DYNASTIES.length - 1 ? DYNASTIES[index + 1] : null,
  }
}

/**
 * 获取图片 URL 的辅助函数（导出给组件使用）
 */
export { getPhotoUrl }
