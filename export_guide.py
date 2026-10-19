import pandas as pd

df_guide = pd.read_excel('센서 스무딩.xlsx', sheet_name='활용가이드')
with open('guide_full.txt', 'w', encoding='utf-8') as f:
    f.write(df_guide.to_string())

df_data = pd.read_excel('센서 스무딩.xlsx', sheet_name='센서_시계열')
with open('data_summary.txt', 'w', encoding='utf-8') as f:
    f.write(df_data.describe().to_string() + "\n\n")
    f.write(df_data.head(20).to_string() + "\n\n")
    f.write(str(df_data.groupby('이벤트').mean(numeric_only=True)) + "\n")
