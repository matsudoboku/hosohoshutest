// Drawing utilities including DXF generation and export.
// Add future Canvas or SVG drawing functions to this module.
import { saveFile } from './storage.js';

export function generateDXF(siteName) {
  const list = (window.allSites[siteName] && window.allSites[siteName].pave) || [];
  if (list.length < 2) {
    return null;
  }
  const scale = 100;
  const points = [];
  let x = 0;

  const LAYER_FRAME = 'FRAME';
  const LAYER_BASE = '---';
  const LAYER_WIDTH = 'W';
  const LAYER_LEN = 'L';
  const LAYER_STATION = 'No';

  let width0 = parseFloat((list[0].幅員 + '').replace(/[Ａ-Ｚａ-ｚ０-９＋]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)).replace(/[^\d.-]/g, '')) || 0;
  points.push({ x: 0, up: width0 / 2, down: -width0 / 2, width: width0, st: list[0].測点 });

  for (let i = 1; i < list.length; i++) {
    let len = (list[i].単距 + '').replace(/[Ａ-Ｚａ-ｚ０-９＋]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)).replace(/[^\d.-]/g, '');
    let width = (list[i].幅員 + '').replace(/[Ａ-Ｚａ-ｚ０-９＋]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)).replace(/[^\d.-]/g, '');
    len = parseFloat(len) || 0;
    width = parseFloat(width) || 0;
    x += len;
    points.push({ x, up: width / 2, down: -width / 2, width, st: list[i].測点 });
  }

  const lines = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i], p1 = points[i + 1];
    lines.push(`0\nLINE\n8\n${LAYER_FRAME}\n10\n${p0.x * scale}\n20\n${p0.up * scale}\n11\n${p1.x * scale}\n21\n${p1.up * scale}\n`);
    lines.push(`0\nLINE\n8\n${LAYER_FRAME}\n10\n${p1.x * scale}\n20\n${p1.up * scale}\n11\n${p1.x * scale}\n21\n${p1.down * scale}\n`);
    lines.push(`0\nLINE\n8\n${LAYER_FRAME}\n10\n${p1.x * scale}\n20\n${p1.down * scale}\n11\n${p0.x * scale}\n21\n${p0.down * scale}\n`);
    lines.push(`0\nLINE\n8\n${LAYER_FRAME}\n10\n${p0.x * scale}\n20\n${p0.down * scale}\n11\n${p0.x * scale}\n21\n${p0.up * scale}\n`);
  }

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i], p1 = points[i + 1];
    lines.push(`0\nLINE\n8\n${LAYER_BASE}\n10\n${p0.x * scale}\n20\n0\n11\n${p1.x * scale}\n21\n0\n`);
    const len = (p1.x - p0.x).toFixed(2);
    lines.push(`0\nTEXT\n8\n${LAYER_LEN}\n10\n${((p0.x + p1.x) / 2) * scale}\n20\n-35\n40\n7\n1\n${len}m\n50\n0\n`);
  }

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    lines.push(`0\nLINE\n8\n${LAYER_WIDTH}\n10\n${p.x * scale}\n20\n${p.down * scale}\n11\n${p.x * scale}\n21\n${p.up * scale}\n`);
    lines.push(`0\nTEXT\n8\n${LAYER_WIDTH}\n10\n${p.x * scale}\n20\n${((p.up + p.down) / 2) * scale}\n40\n7\n1\n${p.width.toFixed(2)}m\n50\n-90\n`);
    if (p.st && p.st.trim()) {
      lines.push(`0\nTEXT\n8\n${LAYER_STATION}\n10\n${p.x * scale}\n20\n${(p.up * scale + 30)}\n40\n7\n1\n${p.st}\n50\n-90\n`);
    }
  }

  const dxf = '0\nSECTION\n2\nHEADER\n0\nENDSEC\n0\nSECTION\n2\nTABLES\n0\nENDSEC\n0\nSECTION\n2\nBLOCKS\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n'
    + lines.join('')
    + '0\nENDSEC\n0\nEOF\n';
  return dxf;
}

export function exportDXF() {
  const dxf = generateDXF(window.currentSite);
  if (!dxf) {
    alert('最低2行以上必要です');
    return;
  }
  const safeSiteName = window.currentSite.replace(/[\\/:*?"<>|]/g, '_');
  saveFile(new Blob([dxf], { type: 'text/plain' }), safeSiteName + '.dxf');
}
