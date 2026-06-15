import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from './format';

// ────────────────────────────────────────────────────────────
// Types for PDF report data
// ────────────────────────────────────────────────────────────

export interface PdfTransactionItem {
  productName: string;
  quantity: number;
  price: number;
}

export interface PdfTransaction {
  invoiceNumber: string;
  createdAt: Date;
  totalAmount: number;
  paymentMethod: string;
  itemCount: number;
  items?: PdfTransactionItem[];
}

export interface PdfReportData {
  period: 'daily' | 'weekly' | 'monthly';
  storeName: string;
  storeAddress: string;
  transactions: PdfTransaction[];
  totalOmzet: number;
  totalTransactions: number;
  avgTransaction: number;
}

// ────────────────────────────────────────────────────────────
// Helper: computed product ranking from transaction items
// ────────────────────────────────────────────────────────────

interface ProductRank {
  name: string;
  quantity: number;
  total: number;
}

function computeTopProducts(transactions: PdfTransaction[]): ProductRank[] {
  const map = new Map<string, ProductRank>();
  for (const tx of transactions) {
    if (!tx.items) continue;
    for (const item of tx.items) {
      const existing = map.get(item.productName);
      if (existing) {
        existing.quantity += item.quantity;
        existing.total += item.price * item.quantity;
      } else {
        map.set(item.productName, {
          name: item.productName,
          quantity: item.quantity,
          total: item.price * item.quantity,
        });
      }
    }
  }
  return Array.from(map.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);
}

// ────────────────────────────────────────────────────────────
// Helper: period label
// ────────────────────────────────────────────────────────────

function periodLabelShort(p: string): string {
  if (p === 'daily') return 'Harian';
  if (p === 'weekly') return 'Mingguan';
  return 'Bulanan';
}

// ────────────────────────────────────────────────────────────
// Style constants
// ────────────────────────────────────────────────────────────

const PRIMARY: [number, number, number] = [124, 58, 237]; // #7c3aed
const DARK: [number, number, number] = [30, 30, 40];
const GRAY: [number, number, number] = [100, 100, 120];
const LIGHT_GRAY: [number, number, number] = [220, 220, 230];
const WHITE: [number, number, number] = [255, 255, 255];

// ────────────────────────────────────────────────────────────
// Page footer
// ────────────────────────────────────────────────────────────

function addFooter(pdf: jsPDF, pageNum: number, totalPages: number): void {
  const dateStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  pdf.setFontSize(7);
  pdf.setTextColor(GRAY[0], GRAY[1], GRAY[2]);

  // Left: system name
  pdf.text('Kasir Kedai Ungu POS System', 14, 290);

  // Center: generation date
  pdf.text(`Dicetak: ${dateStr}`, 105, 290, { align: 'center' });

  // Right: page number
  pdf.text(`Halaman ${pageNum} / ${totalPages}`, 196, 290, { align: 'right' });

  // Line above footer
  pdf.setDrawColor(LIGHT_GRAY[0], LIGHT_GRAY[1], LIGHT_GRAY[2]);
  pdf.line(14, 286, 196, 286);
}

// ────────────────────────────────────────────────────────────
// MAIN EXPORT FUNCTION
// ────────────────────────────────────────────────────────────

export async function exportToPdf(data: PdfReportData, filename: string): Promise<void> {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const centerX = pageWidth / 2;

  // Total pages placeholder — we'll update after generating
  let totalPages = 0;

  // ── WATERMARK (light, every page) ──────────────────────────
  const addPageWatermark = () => {
    pdf.saveGraphicsState();
    pdf.setGState(new (pdf as any).GState({ opacity: 0.06 }));
    pdf.setFontSize(50);
    pdf.setTextColor(0, 0, 0);
    pdf.text('KASIR KEDAI UNGU', centerX, 140, {
      align: 'center',
      angle: 30,
    });
    pdf.restoreGraphicsState();
  };

  // ── PAGE 1: COVER (no addPage — jsPDF already has page 1) ──
  (() => {
    // Decorative top bar
    pdf.setFillColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
    pdf.rect(0, 0, pageWidth, 6, 'F');

    // ── Brand ─────────────────────────────────────────────────
    pdf.setFontSize(26);
    pdf.setTextColor(DARK[0], DARK[1], DARK[2]);
    pdf.text('KASIR KEDAI UNGU', centerX, 55, { align: 'center' });

    pdf.setFontSize(12);
    pdf.setTextColor(GRAY[0], GRAY[1], GRAY[2]);
    pdf.text('POS SYSTEM', centerX, 63, { align: 'center' });

    // Divider
    pdf.setDrawColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
    pdf.setLineWidth(0.5);
    pdf.line(centerX - 30, 70, centerX + 30, 70);

    // ── Report Title ──────────────────────────────────────────
    pdf.setFontSize(22);
    pdf.setTextColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
    pdf.text('LAPORAN PENJUALAN', centerX, 92, { align: 'center' });

    // ── Period & Date ─────────────────────────────────────────
    pdf.setFontSize(11);
    pdf.setTextColor(DARK[0], DARK[1], DARK[2]);
    const periodText = `Periode: ${periodLabelShort(data.period)}`;
    pdf.text(periodText, centerX, 112, { align: 'center' });

    const printDate = new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    pdf.text(`Tanggal Cetak: ${printDate}`, centerX, 124, { align: 'center' });

    // ── Store Info ────────────────────────────────────────────
    let infoY = 148;
    pdf.setFontSize(10);
    pdf.setTextColor(GRAY[0], GRAY[1], GRAY[2]);
    if (data.storeName) {
      pdf.text(data.storeName, centerX, infoY, { align: 'center' });
      infoY += 7;
    }
    if (data.storeAddress) {
      pdf.text(data.storeAddress, centerX, infoY, { align: 'center' });
      infoY += 7;
    }
    pdf.text(`Versi Sistem: ${APP_VERSION}`, centerX, infoY, { align: 'center' });

    // ── Attribution ───────────────────────────────────────────
    const attrY = 215;
    pdf.setFontSize(8);
    pdf.setTextColor(GRAY[0], GRAY[1], GRAY[2]);
    pdf.text('Dibuat secara otomatis oleh', centerX, attrY, { align: 'center' });
    pdf.setFontSize(10);
    pdf.setTextColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
    pdf.text('Kasir Kedai Ungu POS System', centerX, attrY + 7, { align: 'center' });

    pdf.setFontSize(8);
    pdf.setTextColor(GRAY[0], GRAY[1], GRAY[2]);
    pdf.text('Website Ide By:', centerX, attrY + 20, { align: 'center' });
    pdf.setFontSize(10);
    pdf.setTextColor(DARK[0], DARK[1], DARK[2]);
    pdf.text('Farid Krisna (@fardkrsna_)', centerX, attrY + 28, { align: 'center' });

    pdf.setFontSize(8);
    pdf.setTextColor(GRAY[0], GRAY[1], GRAY[2]);
    pdf.text('Powered by Artificial Intelligence', centerX, attrY + 40, { align: 'center' });

    // Bottom bar
    pdf.setFillColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
    pdf.rect(0, 290, pageWidth, 7, 'F');

    addPageWatermark();
  })();

  // ── PAGE 2: BUSINESS SUMMARY ──────────────────────────────
  (() => {
    pdf.addPage();

    pdf.setFontSize(18);
    pdf.setTextColor(DARK[0], DARK[1], DARK[2]);
    pdf.text('Ringkasan Bisnis', centerX, 20, { align: 'center' });

    // Divider
    pdf.setDrawColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
    pdf.setLineWidth(0.8);
    pdf.line(14, 24, 196, 24);

    // Summary cards
    const cardW = 87;
    const cardH = 30;
    const cardY = 32;
    const cardGap = 4;

    // Card helper
    const drawCard = (x: number, y: number, w: number, h: number) => {
      pdf.setFillColor(WHITE[0], WHITE[1], WHITE[2]);
      pdf.setDrawColor(LIGHT_GRAY[0], LIGHT_GRAY[1], LIGHT_GRAY[2]);
      pdf.roundedRect(x, y, w, h, 2, 2, 'FD');
    };

    // Row 1: 2 cards
    drawCard(14, cardY, cardW, cardH);
    pdf.setFontSize(8);
    pdf.setTextColor(GRAY[0], GRAY[1], GRAY[2]);
    pdf.text('TOTAL OMZET', 20, cardY + 8);
    pdf.setFontSize(16);
    pdf.setTextColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
    pdf.text(formatCurrency(data.totalOmzet), 20, cardY + 22);

    drawCard(14 + cardW + cardGap, cardY, cardW, cardH);
    pdf.setFontSize(8);
    pdf.setTextColor(GRAY[0], GRAY[1], GRAY[2]);
    pdf.text('TOTAL TRANSAKSI', 20 + cardW + cardGap, cardY + 8);
    pdf.setFontSize(16);
    pdf.setTextColor(DARK[0], DARK[1], DARK[2]);
    pdf.text(String(data.totalTransactions), 20 + cardW + cardGap, cardY + 22);

    // Row 2: 2 cards
    const cardY2 = cardY + cardH + 6;

    drawCard(14, cardY2, cardW, cardH);
    pdf.setFontSize(8);
    pdf.setTextColor(GRAY[0], GRAY[1], GRAY[2]);
    pdf.text('RATA-RATA BELANJA PELANGGAN', 20, cardY2 + 8);
    pdf.setFontSize(14);
    pdf.setTextColor(DARK[0], DARK[1], DARK[2]);
    pdf.text(formatCurrency(data.avgTransaction), 20, cardY2 + 22);

    drawCard(14 + cardW + cardGap, cardY2, cardW, cardH);
    pdf.setFontSize(8);
    pdf.setTextColor(GRAY[0], GRAY[1], GRAY[2]);
    pdf.text('TOTAL PRODUK TERJUAL', 20 + cardW + cardGap, cardY2 + 8);
    const totalItems = data.transactions.reduce((s, t) => s + (t.itemCount || 0), 0);
    pdf.setFontSize(16);
    pdf.setTextColor(DARK[0], DARK[1], DARK[2]);
    pdf.text(String(totalItems), 20 + cardW + cardGap, cardY2 + 22);

    addPageWatermark();
  })();

  // ── PAGE 3+: TOP PRODUCTS ────────────────────────────────
  const topProducts = computeTopProducts(data.transactions);
  if (topProducts.length > 0) {
    pdf.addPage();
    addPageWatermark();

    pdf.setFontSize(18);
    pdf.setTextColor(DARK[0], DARK[1], DARK[2]);
    pdf.text('Produk Terlaris', centerX, 20, { align: 'center' });

    pdf.setDrawColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
    pdf.setLineWidth(0.8);
    pdf.line(14, 24, 196, 24);

    autoTable(pdf, {
      startY: 32,
      head: [['No', 'Nama Produk', 'Jumlah Terjual', 'Total Penjualan']],
      body: topProducts.map((p, i) => [
        String(i + 1),
        p.name,
        String(p.quantity),
        formatCurrency(p.total),
      ]),
      theme: 'grid',
      headStyles: {
        fillColor: [PRIMARY[0], PRIMARY[1], PRIMARY[2]],
        textColor: WHITE,
        fontStyle: 'bold',
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 9,
      },
      columnStyles: {
        0: { cellWidth: 14, halign: 'center' },
        1: { cellWidth: 80 },
        2: { cellWidth: 40, halign: 'center' },
        3: { cellWidth: 45, halign: 'right' },
      },
      margin: { left: 14, right: 14 },
      didDrawPage: () => {
        addPageWatermark();
      },
    });
  }

  // ── PAGE 4+: TRANSACTION DETAILS ─────────────────────────
  if (data.transactions.length > 0) {
    pdf.addPage();
    addPageWatermark();

    pdf.setFontSize(18);
    pdf.setTextColor(DARK[0], DARK[1], DARK[2]);
    pdf.text('Daftar Transaksi', centerX, 20, { align: 'center' });

    pdf.setDrawColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
    pdf.setLineWidth(0.8);
    pdf.line(14, 24, 196, 24);

    const txBody = data.transactions.map((t, i) => {
      const d = new Date(t.createdAt);
      const dateStr = d.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      const timeStr = d.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      });
      return [
        String(i + 1),
        t.invoiceNumber,
        dateStr,
        timeStr,
        String(t.itemCount || 0),
        formatCurrency(t.totalAmount),
      ];
    });

    autoTable(pdf, {
      startY: 32,
      head: [['No', 'Invoice', 'Tanggal', 'Jam', 'Item', 'Total']],
      body: txBody,
      theme: 'grid',
      headStyles: {
        fillColor: [PRIMARY[0], PRIMARY[1], PRIMARY[2]],
        textColor: WHITE,
        fontStyle: 'bold',
        fontSize: 8,
      },
      bodyStyles: {
        fontSize: 8,
      },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 40 },
        2: { cellWidth: 35, halign: 'center' },
        3: { cellWidth: 25, halign: 'center' },
        4: { cellWidth: 20, halign: 'center' },
        5: { cellWidth: 40, halign: 'right' },
      },
      margin: { left: 14, right: 14 },
      didDrawPage: () => {
        addPageWatermark();
      },
    });
  }

  // ── ADD FOOTERS TO ALL PAGES ─────────────────────────────
  totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    addFooter(pdf, i, totalPages);
  }

  // ── TRIGGER DOWNLOAD ─────────────────────────────────────
  pdf.save(filename);
}

// ────────────────────────────────────────────────────────────
// APP VERSION
// ────────────────────────────────────────────────────────────
// Inline version constant — avoid importing package.json
const APP_VERSION = '2.1.0 — Beta';

// ────────────────────────────────────────────────────────────
// Excel export (unchanged)
// ────────────────────────────────────────────────────────────

interface ExportRow {
  [key: string]: string | number;
}

export function exportToExcel(data: ExportRow[], filename: string): void {
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

  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
