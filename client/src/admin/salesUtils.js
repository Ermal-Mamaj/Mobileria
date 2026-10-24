import { isOnSale } from '../lib/price.js';

// Formatted by hand rather than with toLocaleString: browsers ship
// different (or no) Albanian locale data, which turned "1 250,00 €" into
// "1,250.00 €" and dates into US order on some machines. Documents must
// print the same everywhere.
function pad(n) {
  return String(n).padStart(2, '0');
}

// Money on sale documents always shows cents: "1 250,00 €".
export function formatMoney(value) {
  const n = Number(value) || 0;
  const [whole, cents] = Math.abs(n).toFixed(2).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');
  return `${n < 0 ? '−' : ''}${grouped},${cents} €`;
}

export function saleNumber(id) {
  return String(id).padStart(5, '0');
}

// 24.10.2026
export function formatDate(value) {
  const d = new Date(value);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

// 22:11 (24-hour)
export function formatTime(value) {
  const d = new Date(value);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function saleTotal(sale) {
  return Math.max(Number(sale.subtotal ?? 0) - Number(sale.discount ?? 0), 0);
}

// The price a catalog product sells for right now: its sale price while a
// real discount is set, otherwise the regular price.
export function catalogPrice(product) {
  if (!product) return 0;
  if (isOnSale(product)) return Number(product.sale_price);
  return product.price == null ? 0 : Number(product.price);
}

// Lowercase without Albanian diacritics, so typing "komode" finds "Komodë".
export function searchKey(value) {
  return String(value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

// yyyy-mm-dd in the browser's local time (what <input type="date"> uses).
export function toDateInput(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function datePresets(now = new Date()) {
  const today = toDateInput(now);
  const daysAgo = (n) => toDateInput(new Date(now.getFullYear(), now.getMonth(), now.getDate() - n));
  const monthStart = toDateInput(new Date(now.getFullYear(), now.getMonth(), 1));
  const lastMonthStart = toDateInput(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const lastMonthEnd = toDateInput(new Date(now.getFullYear(), now.getMonth(), 0));
  const yearStart = toDateInput(new Date(now.getFullYear(), 0, 1));
  return [
    { key: 'today', label: 'Sot', from: today, to: today },
    { key: '7d', label: '7 ditët e fundit', from: daysAgo(6), to: today },
    { key: 'month', label: 'Ky muaj', from: monthStart, to: today },
    { key: 'last-month', label: 'Muaji i kaluar', from: lastMonthStart, to: lastMonthEnd },
    { key: 'year', label: 'Ky vit', from: yearStart, to: today },
    { key: 'all', label: 'Të gjitha', from: '', to: '' },
  ];
}

export function formatDateInput(value) {
  if (!value) return '';
  const [y, m, d] = value.split('-');
  return `${d}.${m}.${y}`;
}

// CSV for Excel in Kosovo/Albania: semicolon-separated with decimal commas
// (the regional Excel default, so numbers land in their own columns as
// numbers), UTF-8 with a BOM so ë and ç display correctly.
export function salesToCsv(sales) {
  const num = (n) => (Number(n) || 0).toFixed(2).replace('.', ',');
  const cell = (v) => {
    const s = String(v ?? '');
    return /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = ['Nr.', 'Data', 'Ora', 'Blerësi', 'Telefoni', 'Produktet', 'Nëntotali (€)', 'Zbritja (€)', 'Totali (€)'];
  const rows = sales.map((s) => [
    saleNumber(s.id),
    formatDate(s.created_at),
    formatTime(s.created_at),
    s.customer_name,
    s.customer_phone,
    s.product_names,
    num(s.subtotal),
    num(s.discount),
    num(saleTotal(s)),
  ]);
  const grand = sales.reduce((sum, s) => sum + saleTotal(s), 0);
  rows.push(['', '', '', '', '', 'TOTALI', '', '', num(grand)]);
  return '﻿' + [header, ...rows].map((r) => r.map(cell).join(';')).join('\r\n');
}

export function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
