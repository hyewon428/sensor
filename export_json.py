import pandas as pd
import json

df = pd.read_excel('센서 스무딩.xlsx', sheet_name='센서_시계열')
df['측정시각'] = df['측정시각'].dt.strftime('%Y-%m-%d %H:%M:%S')

data_records = df.to_dict(orient='records')

with open('sensor_data.json', 'w', encoding='utf-8') as f:
    json.dump(data_records, f, ensure_ascii=False, indent=2)

print(f"Exported {len(data_records)} records to sensor_data.json successfully.")
