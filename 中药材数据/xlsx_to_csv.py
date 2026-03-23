# -*- coding: utf-8 -*-
"""
将 xlsx 文件转换为 UTF-8 编码的 CSV 文件
"""

import pandas as pd

input_file = r'D:\Traditional-Chinese-Medicine-Web\中药材数据\added_images.xlsx'
output_file = r'D:\Traditional-Chinese-Medicine-Web\中药材数据\added_images_utf8.csv'

# 读取 Excel 文件
df = pd.read_excel(input_file)

# 保存为 UTF-8 编码的 CSV（不带 BOM）
df.to_csv(output_file, index=False, encoding='utf-8')

print(f'转换完成！')
print(f'输出文件: {output_file}')
print(f'共 {len(df)} 行数据')
