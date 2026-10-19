import pandas as pd
import sys

with open('inspect_output_utf8.txt', 'w', encoding='utf-8') as out:
    xl = pd.ExcelFile('센서 스무딩.xlsx')
    out.write(f"Sheets: {xl.sheet_names}\n")

    for sheet in xl.sheet_names:
        out.write(f"\n========================================\n")
        out.write(f"--- Sheet: {sheet} ---\n")
        df = pd.read_excel('센서 스무딩.xlsx', sheet_name=sheet)
        out.write(f"Shape: {df.shape}\n")
        out.write(f"Columns: {list(df.columns)}\n")
        out.write("Dtypes:\n" + str(df.dtypes) + "\n")
        out.write("Head(5):\n" + str(df.head(5)) + "\n")
        out.write("Tail(5):\n" + str(df.tail(5)) + "\n")
        out.write("Null count:\n" + str(df.isnull().sum()) + "\n")
        out.write("Describe:\n" + str(df.describe(include='all')) + "\n")
        if '이벤트' in df.columns:
            out.write("Event value counts:\n" + str(df['이벤트'].value_counts(dropna=False)) + "\n")
