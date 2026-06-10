interface ExportRow {
  [key: string]: string | number;
}

export function exportToExcel(
  data: ExportRow[],
  filename: string
): void {
  if (data.length === 0) return;

  const headers = Object.keys(data[0] as object);
  const headerRow = headers.map((h) => `<th>${h}</th>`).join('');
  const bodyRows = data
    .map((row) => {
      const cells = headers
        .map((h) => {
          const val = row[h] ?? '';
          return `<td>${val}</td>`;
        })
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" 
          xmlns:x="urn:schemas-microsoft-com:office:excel" 
          xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="UTF-8">
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>Laporan</x:Name>
              <x:WorksheetOptions>
                <x:DisplayGridlines/>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        th { background: #7c3aed; color: white; padding: 8px; font-weight: bold; }
        td { padding: 6px 8px; border: 1px solid #ccc; }
        table { border-collapse: collapse; font-family: Arial; font-size: 12px; }
      </style>
    </head>
    <body>
      <table>${headerRow}${bodyRows}</table>
    </body>
    </html>
  `;

  const blob = new Blob([html], {
    type: 'application/vnd.ms-excel;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportToPdf(elementId: string, title: string): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const element = document.getElementById(elementId);
  if (!element) return;

  const styles = Array.from(document.styleSheets)
    .map((sheet) => {
      try {
        return Array.from(sheet.cssRules || [])
          .map((rule) => rule.cssText)
          .join('');
      } catch {
        return '';
      }
    })
    .join('');

  const content = element.innerHTML;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        ${styles}
        @media print {
          body { padding: 20px; font-family: Arial, sans-serif; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          @page { margin: 15mm; }
        }
        .print-only { display: none; }
      </style>
    </head>
    <body>
      <div class="print-only" style="text-align:center;margin-bottom:20px;">
        <h1 style="color:#7c3aed;margin:0;">Kasir Kedai Ungu</h1>
        <h2 style="margin:5px 0;font-size:16px;">${title}</h2>
        <hr style="border:1px solid #7c3aed;" />
      </div>
      ${content}
    </body>
    </html>
  `);

  printWindow.document.close();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 500);
}