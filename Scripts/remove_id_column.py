import csv
import os

file_path = '2025-01 movimientos.csv'
temp_file_path = '2025-01 movimientos_temp.csv'

with open(file_path, mode='r', newline='', encoding='utf-8') as infile, \
     open(temp_file_path, mode='w', newline='', encoding='utf-8') as outfile:
    
    reader = csv.reader(infile)
    writer = csv.writer(outfile)
    
    headers = next(reader)
    if 'id' in headers:
        id_index = headers.index('id')
        new_headers = [h for i, h in enumerate(headers) if i != id_index]
        writer.writerow(new_headers)
        
        for row in reader:
            if row: # verify empty lines
                new_row = [val for i, val in enumerate(row) if i != id_index]
                writer.writerow(new_row)
    else:
        # id not found, just copy everything
        writer.writerow(headers)
        writer.writerows(reader)

os.replace(temp_file_path, file_path)
print("Successfully removed 'id' column.")
