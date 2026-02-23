/**
 * 生成养生膳食广场 20 道菜谱 xlsx
 * 格式与 Supabase recipes 表一致，efficacy/ingredients/steps 为 JSON 字符串便于导入
 */
import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const HERB_NAMES = new Set([
  '山药', '枸杞子', '菊花', '莲子', '百合', '黄芪', '当归', '茯苓', '红枣', '党参',
  '山楂', '陈皮', '酸枣仁', '玉竹', '沙参', '石斛', '麦冬', '桑葚', '生姜', '桂圆',
  '玫瑰花', '薏苡仁', '银耳', '白术', '芡实', '决明子'
]);

function ing(name, amount) {
  return { name, amount, isHerb: HERB_NAMES.has(name) };
}

const recipes = [
  {
    name: '山药排骨汤',
    image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800',
    time: '约60分钟',
    body_type: '气虚',
    efficacy: ['健脾养胃', '补气养血', '滋阴润燥'],
    ingredients: [
      ing('山药', '300克'), ing('排骨', '500克'), ing('枸杞子', '15克'),
      ing('红枣', '5枚'), ing('生姜', '3片'), ing('葱', '2根'), ing('盐', '适量'), ing('料酒', '1汤匙')
    ],
    steps: [
      '排骨斩段冷水下锅，加料酒、姜片焯水，撇浮沫后捞出洗净。',
      '山药去皮切滚刀块，泡淡盐水防氧化。',
      '排骨、姜片入锅，加足量水，大火烧开转小火炖40分钟。',
      '放入山药、红枣，再炖15～20分钟至山药软糯。',
      '加枸杞炖5分钟，盐调味，撒葱花即可。'
    ],
    rating: 9.0,
    cooked_count: 0,
    solar_term: '霜降'
  },
  {
    name: '枸杞菊花茶',
    image: 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=800',
    time: '约15分钟',
    body_type: '阴虚',
    efficacy: ['养肝明目', '滋阴润燥', '清热降火'],
    ingredients: [ing('枸杞子', '10克'), ing('菊花', '5克'), ing('冰糖', '适量')],
    steps: [
      '枸杞、菊花用清水略冲洗。',
      '壶中放菊花，冲入沸水，加盖焖3～5分钟。',
      '加入枸杞和冰糖，再焖2分钟即可，可反复冲泡。'
    ],
    rating: 8.8,
    cooked_count: 0,
    solar_term: '秋分'
  },
  {
    name: '莲子百合银耳羹',
    image: 'https://images.unsplash.com/photo-1470124182917-cc6e71b22ecc?w=800',
    time: '约90分钟',
    body_type: '阴虚',
    efficacy: ['养心安神', '润肺止咳', '滋阴养颜'],
    ingredients: [
      ing('莲子', '30克'), ing('百合', '20克'), ing('银耳', '半朵'),
      ing('枸杞子', '10克'), ing('冰糖', '适量')
    ],
    steps: [
      '银耳泡发撕小朵；莲子、百合洗净。',
      '银耳、莲子入锅，加足量水大火烧开转小火炖约1小时。',
      '放入百合、冰糖再炖20分钟，加枸杞炖5分钟即可。'
    ],
    rating: 9.2,
    cooked_count: 0,
    solar_term: '白露'
  },
  {
    name: '黄芪炖鸡汤',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800',
    time: '约2小时',
    body_type: '气虚',
    efficacy: ['补气固表', '健脾升阳', '增强免疫'],
    ingredients: [
      ing('黄芪', '20克'), ing('老母鸡', '1只'), ing('红枣', '5枚'),
      ing('生姜', '4片'), ing('枸杞子', '10克'), ing('盐', '适量')
    ],
    steps: [
      '鸡斩块焯水去血沫，洗净。',
      '鸡块、黄芪、红枣、姜片入炖盅，加足量清水。',
      '大火烧开转小火炖1.5小时，加枸杞再炖10分钟，盐调味。'
    ],
    rating: 9.1,
    cooked_count: 0,
    solar_term: '立冬'
  },
  {
    name: '当归生姜羊肉汤',
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800',
    time: '约2小时',
    body_type: '血虚',
    efficacy: ['温经养血', '散寒止痛', '补虚暖身'],
    ingredients: [
      ing('当归', '15克'), ing('羊肉', '500克'), ing('生姜', '30克'),
      ing('红枣', '5枚'), ing('盐', '适量')
    ],
    steps: [
      '羊肉切块焯水去膻，洗净。',
      '羊肉、当归、生姜片、红枣入锅，加足量水。',
      '大火烧开转小火炖1.5小时，盐调味即可。'
    ],
    rating: 9.3,
    cooked_count: 0,
    solar_term: '冬至'
  },
  {
    name: '茯苓薏米粥',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800',
    time: '约50分钟',
    body_type: '痰湿',
    efficacy: ['健脾利湿', '宁心安神', '渗湿消肿'],
    ingredients: [
      ing('茯苓', '15克'), ing('薏苡仁', '50克'), ing('大米', '80克'),
      ing('红枣', '3枚'), ing('冰糖', '适量')
    ],
    steps: [
      '薏苡仁提前浸泡2小时；茯苓略洗。',
      '大米、薏苡仁、茯苓、红枣入锅，加适量水。',
      '大火烧开转小火煮至粥稠，加冰糖调味。'
    ],
    rating: 8.7,
    cooked_count: 0,
    solar_term: '小暑'
  },
  {
    name: '红枣桂圆茶',
    image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800',
    time: '约20分钟',
    body_type: '血虚',
    efficacy: ['补血安神', '养心健脾', '益气养血'],
    ingredients: [ing('红枣', '5枚'), ing('桂圆', '10颗'), ing('枸杞子', '5克'), ing('冰糖', '适量')],
    steps: [
      '红枣去核，桂圆剥壳，与枸杞一起洗净。',
      '材料入壶，加沸水焖10～15分钟。',
      '加冰糖调味即可饮用。'
    ],
    rating: 8.9,
    cooked_count: 0,
    solar_term: '大寒'
  },
  {
    name: '党参乌鸡汤',
    image: 'https://images.unsplash.com/photo-1604329760661-e71dc83f2b26?w=800',
    time: '约2小时',
    body_type: '气虚',
    efficacy: ['补中益气', '健脾益肺', '养血生津'],
    ingredients: [
      ing('党参', '20克'), ing('乌鸡', '1只'), ing('红枣', '5枚'),
      ing('生姜', '4片'), ing('枸杞子', '10克'), ing('盐', '适量')
    ],
    steps: [
      '乌鸡斩块焯水洗净。',
      '乌鸡、党参、红枣、姜片入锅，加足量水。',
      '大火烧开转小火炖1.5小时，加枸杞炖10分钟，盐调味。'
    ],
    rating: 9.0,
    cooked_count: 0,
    solar_term: '立春'
  },
  {
    name: '百合莲子瘦肉汤',
    image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800',
    time: '约1小时',
    body_type: '阴虚',
    efficacy: ['养心安神', '润肺止咳', '健脾养胃'],
    ingredients: [
      ing('百合', '20克'), ing('莲子', '30克'), ing('瘦肉', '200克'),
      ing('生姜', '2片'), ing('盐', '适量')
    ],
    steps: [
      '莲子、百合洗净；瘦肉切块焯水。',
      '瘦肉、莲子、姜片入锅，加足量水大火烧开转小火炖40分钟。',
      '放入百合再炖20分钟，盐调味即可。'
    ],
    rating: 8.8,
    cooked_count: 0,
    solar_term: '处暑'
  },
  {
    name: '银耳雪梨羹',
    image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800',
    time: '约45分钟',
    body_type: '阴虚',
    efficacy: ['润肺止咳', '滋阴生津', '养颜润燥'],
    ingredients: [
      ing('银耳', '半朵'), ing('雪梨', '1个'), ing('枸杞子', '10克'),
      ing('冰糖', '适量')
    ],
    steps: [
      '银耳泡发撕小朵；雪梨去皮去核切块。',
      '银耳入锅加足量水，大火烧开转小火炖30分钟。',
      '放入雪梨、冰糖再炖15分钟，加枸杞即可。'
    ],
    rating: 9.0,
    cooked_count: 0,
    solar_term: '秋分'
  },
  {
    name: '山楂麦芽饮',
    image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800',
    time: '约25分钟',
    body_type: '气郁',
    efficacy: ['消食化积', '健脾开胃', '行气散瘀'],
    ingredients: [ing('山楂', '15克'), ing('麦芽', '15克'), ing('冰糖', '适量')],
    steps: [
      '山楂、麦芽洗净。',
      '材料入锅加适量水，大火烧开转小火煮15分钟。',
      '滤渣加冰糖调味，代茶饮。'
    ],
    rating: 8.5,
    cooked_count: 0,
    solar_term: '谷雨'
  },
  {
    name: '陈皮红豆沙',
    image: 'https://images.unsplash.com/photo-1470124182917-cc6e71b22ecc?w=800',
    time: '约90分钟',
    body_type: '痰湿',
    efficacy: ['理气健脾', '燥湿化痰', '消食化积'],
    ingredients: [
      ing('陈皮', '5克'), ing('红豆', '150克'), ing('冰糖', '适量')
    ],
    steps: [
      '红豆浸泡4小时以上；陈皮泡软刮去白瓤。',
      '红豆、陈皮入锅加足量水，大火烧开转小火煮至豆烂。',
      '加冰糖搅至融化，可压成泥或保留颗粒。'
    ],
    rating: 8.9,
    cooked_count: 0,
    solar_term: '小满'
  },
  {
    name: '冬瓜薏米排骨汤',
    image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800',
    time: '约70分钟',
    body_type: '痰湿',
    efficacy: ['清热利湿', '健脾消肿', '解暑生津'],
    ingredients: [
      ing('冬瓜', '500克'), ing('薏苡仁', '50克'), ing('排骨', '300克'),
      ing('生姜', '3片'), ing('盐', '适量')
    ],
    steps: [
      '薏苡仁浸泡2小时；排骨焯水洗净；冬瓜连皮切块。',
      '排骨、薏苡仁、姜片入锅，加足量水炖约50分钟。',
      '放入冬瓜再炖15分钟，盐调味即可。'
    ],
    rating: 8.8,
    cooked_count: 0,
    solar_term: '大暑'
  },
  {
    name: '黑豆核桃粥',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800',
    time: '约60分钟',
    body_type: '阳虚',
    efficacy: ['补肾益精', '乌发健脑', '润肠通便'],
    ingredients: [
      ing('黑豆', '50克'), ing('核桃仁', '30克'), ing('大米', '80克'),
      ing('冰糖', '适量')
    ],
    steps: [
      '黑豆提前浸泡4小时。',
      '黑豆、大米入锅加适量水，大火烧开转小火煮40分钟。',
      '加入核桃仁、冰糖再煮10分钟即可。'
    ],
    rating: 8.7,
    cooked_count: 0,
    solar_term: '寒露'
  },
  {
    name: '玫瑰花茶',
    image: 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=800',
    time: '约10分钟',
    body_type: '气郁',
    efficacy: ['疏肝理气', '活血调经', '养颜安神'],
    ingredients: [ing('玫瑰花', '5克'), ing('冰糖', '适量')],
    steps: [
      '玫瑰花用温水略冲洗。',
      '放入杯中冲入沸水，加盖焖5～8分钟。',
      '加冰糖调味即可。'
    ],
    rating: 8.6,
    cooked_count: 0,
    solar_term: '惊蛰'
  },
  {
    name: '酸枣仁小米粥',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800',
    time: '约40分钟',
    body_type: '阴虚',
    efficacy: ['养心安神', '助眠宁心', '补肝敛汗'],
    ingredients: [
      ing('酸枣仁', '15克'), ing('小米', '80克'), ing('红枣', '3枚'),
      ing('冰糖', '适量')
    ],
    steps: [
      '酸枣仁捣碎或包入纱布；小米、红枣洗净。',
      '酸枣仁入锅加水先煮15分钟，去渣留汁。',
      '药汁中放入小米、红枣煮至粥稠，加冰糖调味。'
    ],
    rating: 9.0,
    cooked_count: 0,
    solar_term: '秋分'
  },
  {
    name: '玉竹沙参老鸭汤',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800',
    time: '约2小时',
    body_type: '阴虚',
    efficacy: ['养阴润燥', '生津止渴', '润肺益胃'],
    ingredients: [
      ing('玉竹', '20克'), ing('沙参', '20克'), ing('老鸭', '半只'),
      ing('生姜', '4片'), ing('盐', '适量')
    ],
    steps: [
      '老鸭斩块焯水去血沫，洗净。',
      '鸭块、玉竹、沙参、姜片入锅，加足量水。',
      '大火烧开转小火炖1.5小时，盐调味即可。'
    ],
    rating: 9.1,
    cooked_count: 0,
    solar_term: '立秋'
  },
  {
    name: '石斛麦冬茶',
    image: 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=800',
    time: '约15分钟',
    body_type: '阴虚',
    efficacy: ['滋阴清热', '益胃生津', '润肺养阴'],
    ingredients: [ing('石斛', '10克'), ing('麦冬', '10克'), ing('冰糖', '适量')],
    steps: [
      '石斛、麦冬略冲洗。',
      '放入壶中冲入沸水，加盖焖10～15分钟。',
      '加冰糖调味，可反复冲泡。'
    ],
    rating: 8.8,
    cooked_count: 0,
    solar_term: '夏至'
  },
  {
    name: '桑葚枸杞茶',
    image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800',
    time: '约10分钟',
    body_type: '阴虚',
    efficacy: ['滋补肝肾', '养血明目', '生津润燥'],
    ingredients: [ing('桑葚', '15克'), ing('枸杞子', '10克'), ing('冰糖', '适量')],
    steps: [
      '桑葚、枸杞洗净。',
      '放入杯中冲入沸水，焖5～8分钟。',
      '加冰糖调味即可。'
    ],
    rating: 8.7,
    cooked_count: 0,
    solar_term: '清明'
  },
  {
    name: '生姜红糖水',
    image: 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=800',
    time: '约15分钟',
    body_type: '阳虚',
    efficacy: ['温中散寒', '活血暖宫', '健脾和胃'],
    ingredients: [ing('生姜', '20克'), ing('红糖', '30克'), ing('红枣', '3枚')],
    steps: [
      '生姜切片或拍松；红枣去核。',
      '生姜、红枣入锅加适量水，大火烧开转小火煮10分钟。',
      '加入红糖搅匀即可。'
    ],
    rating: 8.5,
    cooked_count: 0,
    solar_term: '小雪'
  },
  {
    name: '黄芪红枣茶',
    image: 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=800',
    time: '约20分钟',
    body_type: '气虚',
    efficacy: ['补气固表', '健脾养血', '增强免疫'],
    ingredients: [ing('黄芪', '15克'), ing('红枣', '5枚'), ing('冰糖', '适量')],
    steps: ['黄芪、红枣洗净。', '入壶加沸水焖15分钟。', '加冰糖调味即可。'],
    rating: 8.6,
    cooked_count: 0,
    solar_term: '春分'
  },
  {
    name: '桂圆莲子粥',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800',
    time: '约50分钟',
    body_type: '血虚',
    efficacy: ['养心安神', '健脾补血', '益肾固精'],
    ingredients: [ing('桂圆', '15克'), ing('莲子', '30克'), ing('大米', '80克'), ing('冰糖', '适量')],
    steps: ['莲子浸泡2小时；桂圆剥壳。', '大米、莲子入锅加水煮至半熟。', '加桂圆、冰糖煮至粥稠即可。'],
    rating: 8.9,
    cooked_count: 0,
    solar_term: '小寒'
  },
  {
    name: '茯苓山药粥',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800',
    time: '约45分钟',
    body_type: '气虚',
    efficacy: ['健脾渗湿', '宁心安神', '补肺益肾'],
    ingredients: [ing('茯苓', '15克'), ing('山药', '100克'), ing('大米', '80克'), ing('冰糖', '适量')],
    steps: ['山药去皮切小块；茯苓略洗。', '大米、茯苓入锅加水煮开，转小火煮30分钟。', '加山药、冰糖再煮15分钟即可。'],
    rating: 8.8,
    cooked_count: 0,
    solar_term: '雨水'
  },
  {
    name: '百合雪梨汤',
    image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800',
    time: '约35分钟',
    body_type: '阴虚',
    efficacy: ['润肺止咳', '养阴清心', '生津止渴'],
    ingredients: [ing('百合', '20克'), ing('雪梨', '1个'), ing('冰糖', '适量')],
    steps: ['百合泡软；雪梨去皮去核切块。', '百合入锅加水煮20分钟。', '加雪梨、冰糖再煮10分钟即可。'],
    rating: 8.7,
    cooked_count: 0,
    solar_term: '白露'
  },
  {
    name: '党参黄芪炖鸡',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800',
    time: '约2小时',
    body_type: '气虚',
    efficacy: ['补中益气', '健脾升阳', '养血安神'],
    ingredients: [ing('党参', '15克'), ing('黄芪', '15克'), ing('鸡肉', '500克'), ing('生姜', '3片'), ing('盐', '适量')],
    steps: ['鸡斩块焯水洗净。', '鸡块、党参、黄芪、姜片入锅，加足量水。', '大火烧开转小火炖1.5小时，盐调味即可。'],
    rating: 9.0,
    cooked_count: 0,
    solar_term: '立冬'
  },
  {
    name: '陈皮生姜茶',
    image: 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=800',
    time: '约15分钟',
    body_type: '痰湿',
    efficacy: ['理气健脾', '温中散寒', '燥湿化痰'],
    ingredients: [ing('陈皮', '5克'), ing('生姜', '3片'), ing('红糖', '适量')],
    steps: ['陈皮、生姜入壶。', '冲入沸水焖10分钟。', '加红糖调味即可。'],
    rating: 8.5,
    cooked_count: 0,
    solar_term: '大雪'
  },
  {
    name: '薏米绿豆汤',
    image: 'https://images.unsplash.com/photo-1470124182917-cc6e71b22ecc?w=800',
    time: '约60分钟',
    body_type: '痰湿',
    efficacy: ['清热解暑', '健脾利湿', '解毒消肿'],
    ingredients: [ing('薏苡仁', '50克'), ing('绿豆', '50克'), ing('冰糖', '适量')],
    steps: ['薏苡仁、绿豆分别浸泡2小时。', '入锅加足量水大火烧开转小火煮至豆烂。', '加冰糖调味即可。'],
    rating: 8.7,
    cooked_count: 0,
    solar_term: '夏至'
  },
  {
    name: '当归红枣鸡蛋',
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800',
    time: '约40分钟',
    body_type: '血虚',
    efficacy: ['补血活血', '调经止痛', '养颜润燥'],
    ingredients: [ing('当归', '10克'), ing('红枣', '5枚'), ing('鸡蛋', '2个'), ing('红糖', '适量')],
    steps: ['鸡蛋煮熟去壳；当归、红枣洗净。', '当归、红枣入锅加水煮20分钟。', '放入鸡蛋、红糖再煮10分钟即可。'],
    rating: 8.8,
    cooked_count: 0,
    solar_term: '大寒'
  },
  {
    name: '菊花决明子茶',
    image: 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=800',
    time: '约10分钟',
    body_type: '阴虚',
    efficacy: ['清肝明目', '清热降火', '润肠通便'],
    ingredients: [ing('菊花', '5克'), ing('决明子', '10克'), ing('冰糖', '适量')],
    steps: ['菊花、决明子略洗。', '入杯冲沸水焖8分钟。', '加冰糖调味即可。'],
    rating: 8.6,
    cooked_count: 0,
    solar_term: '秋分'
  },
  {
    name: '莲子芡实排骨汤',
    image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800',
    time: '约90分钟',
    body_type: '气虚',
    efficacy: ['健脾止泻', '益肾固精', '养心安神'],
    ingredients: [ing('莲子', '30克'), ing('芡实', '20克'), ing('排骨', '400克'), ing('生姜', '3片'), ing('盐', '适量')],
    steps: ['莲子、芡实浸泡1小时；排骨焯水洗净。', '排骨、莲子、芡实、姜片入锅，加足量水。', '大火烧开转小火炖1小时，盐调味即可。'],
    rating: 8.9,
    cooked_count: 0,
    solar_term: '处暑'
  },
  {
    name: '山楂陈皮饮',
    image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800',
    time: '约20分钟',
    body_type: '气郁',
    efficacy: ['消食化积', '理气健脾', '活血散瘀'],
    ingredients: [ing('山楂', '15克'), ing('陈皮', '5克'), ing('冰糖', '适量')],
    steps: ['山楂、陈皮洗净。', '入锅加水煮15分钟。', '滤渣加冰糖调味即可。'],
    rating: 8.5,
    cooked_count: 0,
    solar_term: '谷雨'
  },
  {
    name: '银耳莲子羹',
    image: 'https://images.unsplash.com/photo-1470124182917-cc6e71b22ecc?w=800',
    time: '约80分钟',
    body_type: '阴虚',
    efficacy: ['养心安神', '滋阴润肺', '健脾益肾'],
    ingredients: [ing('银耳', '半朵'), ing('莲子', '30克'), ing('枸杞子', '10克'), ing('冰糖', '适量')],
    steps: ['银耳泡发撕小朵；莲子洗净。', '银耳、莲子入锅加足量水炖约1小时。', '加枸杞、冰糖再炖10分钟即可。'],
    rating: 9.0,
    cooked_count: 0,
    solar_term: '寒露'
  },
  {
    name: '黄芪枸杞茶',
    image: 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=800',
    time: '约15分钟',
    body_type: '气虚',
    efficacy: ['补气固表', '滋补肝肾', '明目养血'],
    ingredients: [ing('黄芪', '10克'), ing('枸杞子', '10克'), ing('冰糖', '适量')],
    steps: ['黄芪、枸杞略洗。', '入壶冲沸水焖10分钟。', '加冰糖调味即可。'],
    rating: 8.7,
    cooked_count: 0,
    solar_term: '立春'
  },
  {
    name: '茯苓白术粥',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800',
    time: '约50分钟',
    body_type: '痰湿',
    efficacy: ['健脾燥湿', '利水渗湿', '宁心安神'],
    ingredients: [ing('茯苓', '15克'), ing('白术', '10克'), ing('大米', '80克'), ing('冰糖', '适量')],
    steps: ['茯苓、白术略洗。', '与大米同入锅加水煮至粥稠。', '加冰糖调味即可。'],
    rating: 8.6,
    cooked_count: 0,
    solar_term: '小暑'
  },
  {
    name: '百合绿豆汤',
    image: 'https://images.unsplash.com/photo-1470124182917-cc6e71b22ecc?w=800',
    time: '约45分钟',
    body_type: '阴虚',
    efficacy: ['清心润肺', '清热解毒', '养阴安神'],
    ingredients: [ing('百合', '20克'), ing('绿豆', '60克'), ing('冰糖', '适量')],
    steps: ['绿豆浸泡2小时；百合泡软。', '绿豆入锅加水煮至半烂，加百合再煮20分钟。', '加冰糖调味即可。'],
    rating: 8.8,
    cooked_count: 0,
    solar_term: '大暑'
  },
  {
    name: '党参红枣茶',
    image: 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=800',
    time: '约20分钟',
    body_type: '气虚',
    efficacy: ['补中益气', '健脾养血', '生津安神'],
    ingredients: [ing('党参', '15克'), ing('红枣', '5枚'), ing('冰糖', '适量')],
    steps: ['党参、红枣洗净。', '入壶加沸水焖15分钟。', '加冰糖调味即可。'],
    rating: 8.6,
    cooked_count: 0,
    solar_term: '惊蛰'
  },
  {
    name: '山药薏米粥',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800',
    time: '约55分钟',
    body_type: '气虚',
    efficacy: ['健脾渗湿', '补肺益肾', '养胃生津'],
    ingredients: [ing('山药', '150克'), ing('薏苡仁', '50克'), ing('大米', '60克'), ing('冰糖', '适量')],
    steps: ['薏苡仁浸泡2小时；山药去皮切块。', '大米、薏苡仁入锅加水煮40分钟。', '加山药、冰糖再煮15分钟即可。'],
    rating: 8.9,
    cooked_count: 0,
    solar_term: '清明'
  },
  {
    name: '麦冬玉竹茶',
    image: 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=800',
    time: '约15分钟',
    body_type: '阴虚',
    efficacy: ['养阴生津', '润肺益胃', '清心除烦'],
    ingredients: [ing('麦冬', '10克'), ing('玉竹', '10克'), ing('冰糖', '适量')],
    steps: ['麦冬、玉竹略洗。', '入壶冲沸水焖10分钟。', '加冰糖调味即可。'],
    rating: 8.7,
    cooked_count: 0,
    solar_term: '立秋'
  },
  {
    name: '红枣花生粥',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800',
    time: '约50分钟',
    body_type: '血虚',
    efficacy: ['补血养血', '健脾和胃', '润肺止咳'],
    ingredients: [ing('红枣', '8枚'), ing('花生', '50克'), ing('大米', '80克'), ing('冰糖', '适量')],
    steps: ['花生浸泡2小时；红枣去核。', '大米、花生入锅加水煮至半熟。', '加红枣、冰糖煮至粥稠即可。'],
    rating: 8.6,
    cooked_count: 0,
    solar_term: '霜降'
  },
  {
    name: '陈皮山楂茶',
    image: 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=800',
    time: '约15分钟',
    body_type: '气郁',
    efficacy: ['消食导滞', '理气化痰', '活血散瘀'],
    ingredients: [ing('陈皮', '5克'), ing('山楂', '10克'), ing('冰糖', '适量')],
    steps: ['陈皮、山楂洗净。', '入壶加沸水焖10分钟。', '加冰糖调味即可。'],
    rating: 8.5,
    cooked_count: 0,
    solar_term: '小满'
  },
  {
    name: '枸杞红枣茶',
    image: 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=800',
    time: '约15分钟',
    body_type: '阴虚',
    efficacy: ['滋补肝肾', '养血安神', '明目润燥'],
    ingredients: [ing('枸杞子', '15克'), ing('红枣', '5枚'), ing('冰糖', '适量')],
    steps: ['枸杞、红枣洗净，红枣去核。', '入壶冲沸水焖10分钟。', '加冰糖调味即可。'],
    rating: 8.8,
    cooked_count: 0,
    solar_term: '冬至'
  },
  {
    name: '茯苓山药排骨汤',
    image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800',
    time: '约75分钟',
    body_type: '痰湿',
    efficacy: ['健脾利湿', '宁心安神', '补肺益肾'],
    ingredients: [ing('茯苓', '15克'), ing('山药', '250克'), ing('排骨', '400克'), ing('生姜', '3片'), ing('盐', '适量')],
    steps: ['排骨焯水洗净；山药去皮切块；茯苓略洗。', '排骨、茯苓、姜片入锅，加足量水炖50分钟。', '加山药再炖20分钟，盐调味即可。'],
    rating: 8.9,
    cooked_count: 0,
    solar_term: '雨水'
  },
  {
    name: '百合莲子瘦肉粥',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800',
    time: '约60分钟',
    body_type: '阴虚',
    efficacy: ['养心安神', '润肺止咳', '健脾养胃'],
    ingredients: [ing('百合', '20克'), ing('莲子', '30克'), ing('瘦肉', '100克'), ing('大米', '80克'), ing('盐', '适量')],
    steps: ['莲子浸泡2小时；百合泡软；瘦肉切丝。', '大米、莲子入锅加水煮40分钟。', '加百合、瘦肉再煮15分钟，盐调味即可。'],
    rating: 8.8,
    cooked_count: 0,
    solar_term: '白露'
  },
  {
    name: '石斛枸杞茶',
    image: 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=800',
    time: '约15分钟',
    body_type: '阴虚',
    efficacy: ['滋阴清热', '益胃生津', '滋补肝肾'],
    ingredients: [ing('石斛', '10克'), ing('枸杞子', '10克'), ing('冰糖', '适量')],
    steps: ['石斛、枸杞略洗。', '入壶冲沸水焖10分钟。', '加冰糖调味即可。'],
    rating: 8.7,
    cooked_count: 0,
    solar_term: '夏至'
  },
  {
    name: '当归黄芪茶',
    image: 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=800',
    time: '约20分钟',
    body_type: '血虚',
    efficacy: ['补血活血', '补气固表', '调经止痛'],
    ingredients: [ing('当归', '10克'), ing('黄芪', '15克'), ing('冰糖', '适量')],
    steps: ['当归、黄芪洗净。', '入壶加沸水焖15分钟。', '加冰糖调味即可。'],
    rating: 8.8,
    cooked_count: 0,
    solar_term: '小雪'
  },
  {
    name: '莲子桂圆红枣汤',
    image: 'https://images.unsplash.com/photo-1470124182917-cc6e71b22ecc?w=800',
    time: '约50分钟',
    body_type: '血虚',
    efficacy: ['养心安神', '健脾补血', '益肾固精'],
    ingredients: [ing('莲子', '30克'), ing('桂圆', '15克'), ing('红枣', '5枚'), ing('冰糖', '适量')],
    steps: ['莲子浸泡2小时；桂圆剥壳；红枣去核。', '莲子入锅加水煮30分钟。', '加桂圆、红枣、冰糖再煮15分钟即可。'],
    rating: 8.9,
    cooked_count: 0,
    solar_term: '大寒'
  },
  {
    name: '菊花枸杞茶',
    image: 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=800',
    time: '约10分钟',
    body_type: '阴虚',
    efficacy: ['清肝明目', '滋阴润燥', '清热降火'],
    ingredients: [ing('菊花', '5克'), ing('枸杞子', '10克'), ing('冰糖', '适量')],
    steps: ['菊花、枸杞略洗。', '入杯冲沸水焖5～8分钟。', '加冰糖调味即可。'],
    rating: 8.8,
    cooked_count: 0,
    solar_term: '秋分'
  },
  {
    name: '黄芪山药乌鸡汤',
    image: 'https://images.unsplash.com/photo-1604329760661-e71dc83f2b26?w=800',
    time: '约2小时',
    body_type: '气虚',
    efficacy: ['补气固表', '健脾益肾', '养血滋阴'],
    ingredients: [ing('黄芪', '20克'), ing('山药', '300克'), ing('乌鸡', '半只'), ing('生姜', '4片'), ing('盐', '适量')],
    steps: ['乌鸡斩块焯水洗净；山药去皮切块。', '乌鸡、黄芪、姜片入锅，加足量水炖1小时。', '加山药再炖30分钟，盐调味即可。'],
    rating: 9.1,
    cooked_count: 0,
    solar_term: '立冬'
  },
  {
    name: '酸枣仁百合粥',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800',
    time: '约45分钟',
    body_type: '阴虚',
    efficacy: ['养心安神', '助眠宁心', '润肺清心'],
    ingredients: [ing('酸枣仁', '15克'), ing('百合', '20克'), ing('大米', '80克'), ing('冰糖', '适量')],
    steps: ['酸枣仁捣碎包纱布煮15分钟取汁；百合泡软。', '药汁中加大米煮至半熟。', '加百合、冰糖煮至粥稠即可。'],
    rating: 8.9,
    cooked_count: 0,
    solar_term: '寒露'
  },
  {
    name: '玉竹百合茶',
    image: 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=800',
    time: '约15分钟',
    body_type: '阴虚',
    efficacy: ['养阴润燥', '润肺清心', '生津止渴'],
    ingredients: [ing('玉竹', '10克'), ing('百合', '10克'), ing('冰糖', '适量')],
    steps: ['玉竹、百合略洗。', '入壶冲沸水焖10分钟。', '加冰糖调味即可。'],
    rating: 8.6,
    cooked_count: 0,
    solar_term: '处暑'
  },
  {
    name: '党参山药粥',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800',
    time: '约50分钟',
    body_type: '气虚',
    efficacy: ['补中益气', '健脾养胃', '生津益肺'],
    ingredients: [ing('党参', '15克'), ing('山药', '150克'), ing('大米', '80克'), ing('冰糖', '适量')],
    steps: ['山药去皮切块；党参略洗。', '大米、党参入锅加水煮35分钟。', '加山药、冰糖再煮15分钟即可。'],
    rating: 8.8,
    cooked_count: 0,
    solar_term: '春分'
  },
  {
    name: '桑葚红枣茶',
    image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800',
    time: '约15分钟',
    body_type: '阴虚',
    efficacy: ['滋补肝肾', '养血安神', '滋阴润燥'],
    ingredients: [ing('桑葚', '15克'), ing('红枣', '5枚'), ing('冰糖', '适量')],
    steps: ['桑葚、红枣洗净，红枣去核。', '入壶冲沸水焖10分钟。', '加冰糖调味即可。'],
    rating: 8.7,
    cooked_count: 0,
    solar_term: '清明'
  },
  {
    name: '茯苓莲子汤',
    image: 'https://images.unsplash.com/photo-1470124182917-cc6e71b22ecc?w=800',
    time: '约55分钟',
    body_type: '痰湿',
    efficacy: ['健脾渗湿', '养心安神', '宁心安神'],
    ingredients: [ing('茯苓', '15克'), ing('莲子', '30克'), ing('冰糖', '适量')],
    steps: ['莲子浸泡2小时；茯苓略洗。', '茯苓、莲子入锅加水煮45分钟。', '加冰糖调味即可。'],
    rating: 8.7,
    cooked_count: 0,
    solar_term: '小暑'
  },
  {
    name: '麦冬沙参茶',
    image: 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=800',
    time: '约15分钟',
    body_type: '阴虚',
    efficacy: ['养阴润肺', '益胃生津', '清心除烦'],
    ingredients: [ing('麦冬', '10克'), ing('沙参', '10克'), ing('冰糖', '适量')],
    steps: ['麦冬、沙参略洗。', '入壶冲沸水焖10分钟。', '加冰糖调味即可。'],
    rating: 8.6,
    cooked_count: 0,
    solar_term: '立秋'
  },
  {
    name: '玫瑰花枸杞茶',
    image: 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=800',
    time: '约10分钟',
    body_type: '气郁',
    efficacy: ['疏肝理气', '滋补肝肾', '养颜活血'],
    ingredients: [ing('玫瑰花', '5克'), ing('枸杞子', '10克'), ing('冰糖', '适量')],
    steps: ['玫瑰花、枸杞略洗。', '入杯冲沸水焖5～8分钟。', '加冰糖调味即可。'],
    rating: 8.8,
    cooked_count: 0,
    solar_term: '惊蛰'
  }
];

function row(r) {
  return {
    name: r.name,
    image: r.image,
    time: r.time,
    body_type: r.body_type,
    efficacy: JSON.stringify(r.efficacy),
    ingredients: JSON.stringify(r.ingredients),
    steps: JSON.stringify(r.steps),
    rating: r.rating,
    cooked_count: r.cooked_count,
    solar_term: r.solar_term || ''
  };
}

const ws = XLSX.utils.json_to_sheet(recipes.map(row));
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, '食谱');

const outPath = path.join(__dirname, '..', '养生膳食广场-食谱50道.xlsx');
XLSX.writeFile(wb, outPath);

console.log('已生成: 养生膳食广场-食谱50道.xlsx（共50道）');
