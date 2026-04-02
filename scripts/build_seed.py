# -*- coding: utf-8 -*-
import json, os
PAIRINGS = [
  {"type": "good", "left_herb": "鏋告潪", "right_herb": "鑿婅姳", "effect": "娓呰倽鏄庣洰", "description": "鏋告潪婊嬭ˉ鑲濊偩锛岃強鑺辩枏鏁ｉ鐑紝浜岃€呯浉杈呫€?},
]
MYTHS = [
  {"emoji": "鉂?, "question": "鎰熷啋浜嗗氨瑕佺珛鍒诲枬濮滄堡鍙戞睏锛?, "answer_text": "閿欙紒", "detail": "濮滄堡涓昏閫傜敤浜?span class=\"hl\">椋庡瘨鎰熷啋</span>锛涢鐑劅鍐掍笉瀹溿€?, "type": "danger"},
]
base = r"d:\Traditional-Chinese-Medicine-Web\scripts"
os.makedirs(os.path.join(base, "seed-data"), exist_ok=True)
with open(os.path.join(base, "seed-data", "pairings.json"), "w", encoding="utf-8") as f:
    json.dump(PAIRINGS, f, ensure_ascii=False, indent=2)
with open(os.path.join(base, "seed-data", "myths.json"), "w", encoding="utf-8") as f:
    json.dump(MYTHS, f, ensure_ascii=False, indent=2)
print("ok", len(PAIRINGS), len(MYTHS))