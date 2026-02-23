/**
 * 生成 24 节气表 CSV（与 Supabase solar_terms 表一致：id, name, principle, recommend_text, avoid_text, image_url）
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const terms = [
  { name: '立春', principle: '春气之始，肝气渐旺。此时养生应顺应阳气生发，疏肝理气。', recommend_text: '韭菜、香椿、豆芽、百合', avoid_text: '酸辣、生冷海鲜、大补之物', image_url: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=800' },
  { name: '雨水', principle: '降雨渐增，湿气以此始。养生重点在于健脾祛湿、顾护脾胃。', recommend_text: '薏米、红枣、菠菜、山药', avoid_text: '油腻、辛辣、生冷瓜果', image_url: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800' },
  { name: '惊蛰', principle: '春雷乍动，万物生机盎然。饮食宜清淡，少酸多甘以养脾。', recommend_text: '梨、枇杷、莲子、水萝卜', avoid_text: '动物脂肪、辛辣刺激', image_url: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=800' },
  { name: '春分', principle: '阴阳平分，昼夜等长。宜平调阴阳，疏肝健脾。', recommend_text: '荠菜、春笋、蜂蜜、枸杞', avoid_text: '大热大寒、过酸过辣', image_url: 'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?w=800' },
  { name: '清明', principle: '气清景明，草木繁茂。宜柔肝养肺、清热祛湿。', recommend_text: '艾叶、青团、螺蛳、香椿', avoid_text: '发物、海鲜、辛辣', image_url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800' },
  { name: '谷雨', principle: '雨生百谷，湿气渐重。宜健脾化湿、养肝明目。', recommend_text: '绿茶、香椿、菠菜、黄豆', avoid_text: '生冷、油腻、过甜', image_url: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=800' },
  { name: '立夏', principle: '夏气之始，心气渐旺。宜养心安神、清热解暑。', recommend_text: '绿豆、莲子、苦瓜、荷叶', avoid_text: '燥热、肥腻、过饱', image_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800' },
  { name: '小满', principle: '麦粒初满，湿热交织。宜清热利湿、健脾和胃。', recommend_text: '赤小豆、冬瓜、黄瓜、丝瓜', avoid_text: '辛辣、烧烤、冷饮过量', image_url: 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=800' },
  { name: '芒种', principle: '有芒作物成熟，劳逸结合。宜益气生津、清心除烦。', recommend_text: '梅子、桑葚、木耳、番茄', avoid_text: '大汗后冷饮、熬夜', image_url: 'https://images.unsplash.com/photo-1500387467466-e703c7cdd287?w=800' },
  { name: '夏至', principle: '阳气最盛，昼最长。宜养心护阳、清热解暑。', recommend_text: '荷叶、莲子、西瓜、酸梅汤', avoid_text: '冰镇过度、夜食过饱', image_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800' },
  { name: '小暑', principle: '暑热渐盛。宜清热解暑、养心健脾。', recommend_text: '绿豆、莲藕、黄鳝、冬瓜', avoid_text: '生冷过度、油腻', image_url: 'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=800' },
  { name: '大暑', principle: '一年最热。宜清热祛暑、益气生津。', recommend_text: '冬瓜、绿豆、百合、鸭肉', avoid_text: '辛辣燥热、暴饮暴食', image_url: 'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=800' },
  { name: '立秋', principle: '秋气之始，燥气渐生。宜养阴润燥、收敛肺气。', recommend_text: '百合、银耳、梨、蜂蜜', avoid_text: '辛辣、烧烤、生冷', image_url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800' },
  { name: '处暑', principle: '暑气将退。宜滋阴润肺、健脾祛湿。', recommend_text: '莲藕、菱角、山药、芝麻', avoid_text: '油腻、冷饮、熬夜', image_url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800' },
  { name: '白露', principle: '露凝而白，秋燥明显。宜养阴润燥、益胃生津。', recommend_text: '梨、百合、银耳、蜂蜜', avoid_text: '辛辣、燥热、过饱', image_url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800' },
  { name: '秋分', principle: '阴阳平分，秋燥加重。宜滋阴润肺、平补为宜。', recommend_text: '秋梨、柿子、山药、核桃', avoid_text: '辛辣、寒凉、过补', image_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800' },
  { name: '寒露', principle: '露气寒冷，将凝为霜。宜养阴防燥、润肺益胃。', recommend_text: '芝麻、核桃、糯米、山药', avoid_text: '生冷、辛辣、燥热', image_url: 'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=800' },
  { name: '霜降', principle: '气肃而凝，露结为霜。宜平补脾胃、养阴润燥。', recommend_text: '柿子、栗子、山药、牛肉', avoid_text: '寒凉、生冷、过辣', image_url: 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=800' },
  { name: '立冬', principle: '冬气之始，闭藏为主。宜温补养藏、补肾益气。', recommend_text: '羊肉、核桃、大枣、桂圆', avoid_text: '生冷、寒凉、过汗', image_url: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=800' },
  { name: '小雪', principle: '雪未大，寒未深。宜温补肝肾、养阴防寒。', recommend_text: '牛肉、黑木耳、黑芝麻、核桃', avoid_text: '生冷、燥热、熬夜', image_url: 'https://images.unsplash.com/photo-1491002052546-bf38f186af56?w=800' },
  { name: '大雪', principle: '雪盛寒深。宜温阳补肾、养血暖身。', recommend_text: '羊肉、萝卜、枸杞、生姜', avoid_text: '生冷、黏腻、过饱', image_url: 'https://images.unsplash.com/photo-1542202229-7d93c33f5d07?w=800' },
  { name: '冬至', principle: '阳气始生，一阳来复。宜温补养藏、益肾填精。', recommend_text: '羊肉汤、饺子、桂圆、核桃', avoid_text: '生冷、寒凉、过汗', image_url: 'https://images.unsplash.com/photo-1512389142860-9c449e58a943?w=800' },
  { name: '小寒', principle: '寒而未大。宜温补散寒、养肾防寒。', recommend_text: '羊肉、生姜、大枣、桂圆', avoid_text: '生冷、黏腻、过劳', image_url: 'https://images.unsplash.com/photo-1482517967863-00e15c9b44be?w=800' },
  { name: '大寒', principle: '一年最寒。宜温补驱寒、养精蓄锐。', recommend_text: '羊肉、鸡肉、糯米、黄芪', avoid_text: '生冷、寒凉、熬夜', image_url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800' }
];

function escapeCsv(str) {
  if (str == null) return '';
  const s = String(str);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

const header = 'id,name,principle,recommend_text,avoid_text,image_url';
const rows = terms.map((t, i) =>
  [i + 1, t.name, t.principle, t.recommend_text, t.avoid_text, t.image_url].map(escapeCsv).join(',')
);
const csv = '\uFEFF' + header + '\n' + rows.join('\n');

const outPath = path.join(__dirname, '..', '二十四节气_solar_terms_utf8.csv');
fs.writeFileSync(outPath, csv, 'utf8');

console.log('已生成: 二十四节气_solar_terms_utf8.csv（共24条）');
