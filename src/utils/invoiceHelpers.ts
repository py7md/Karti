import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CalculatorType, SaleRecord } from '../types';
import { INITIAL_PRICES } from '../constants';
import { saveFileToKrotFolder } from './filesystemHelpers';
import { registerPlugin } from '@capacitor/core';

const LocalContacts = registerPlugin<any>('LocalContacts');

let cachedCustomLogo: HTMLImageElement | null = null;

export const getCustomLogoImage = (): HTMLImageElement | null => {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem('custom_pdf_logo');
  if (!stored) {
    cachedCustomLogo = null;
    return null;
  }
  if (cachedCustomLogo && cachedCustomLogo.src === stored) {
    return cachedCustomLogo;
  }
  const img = new Image();
  img.src = stored;
  cachedCustomLogo = img;
  return img;
};

export const getNetworkName = (): string => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('network_name') || 'شبكة الدحشة اللاسلكية';
  }
  return 'شبكة الدحشة اللاسلكية';
};

export const getDistributorName = (): string => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('distributor_name') || 'أحمد المنتصر';
  }
  return 'أحمد المنتصر';
};

export const getDistributorPhone = (): string => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('distributor_phone') || '773086403';
  }
  return '773086403';
};

export const getInvoiceFooterNote = (): string => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('pdf_footer_note') || 'شعارنا: [ لسنا الوحيدون ولكننا الافضل ]';
  }
  return 'شعارنا: [ لسنا الوحيدون ولكننا الافضل ]';
};

// --- Sound Chime System (Web Audio API) ---
export const playSuccessSound = (isSoundEnabled: boolean) => {
  if (!isSoundEnabled) return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const audioCtx = new AudioCtx();
    
    const playBeep = (freq: number, duration: number, delayRef: number) => {
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime + delayRef);
      
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime + delayRef);
      gainNode.gain.linearRampToValueAtTime(0.12, audioCtx.currentTime + delayRef + 0.03);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + delayRef + duration);
      
      osc.start(audioCtx.currentTime + delayRef);
      osc.stop(audioCtx.currentTime + delayRef + duration);
    };
    
    // Satisfying cash register double chime:
    playBeep(587.33, 0.15, 0);       // D5
    playBeep(880.00, 0.22, 0.08);     // A5
  } catch (e) {
    console.warn("Audio Context feedback failed:", e);
  }
};

// --- Official Vector Logo drawing function ---
export const drawDahshahLogo = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  isThermal: boolean = false
) => {
  ctx.save();

  const customImg = getCustomLogoImage();
  if (customImg && customImg.complete && customImg.naturalWidth > 0) {
    ctx.drawImage(customImg, x, y, width, height);
    ctx.restore();
    return;
  }
  
  if (isThermal) {
    // Monochrome, crisp line-art representation for thermal printing
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    
    // Outline box (instead of solid heavy dark fill to conserve printer ink)
    ctx.strokeRect(x, y, width, height);
    
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.direction = 'rtl';
    
    const parts = getNetworkName().split(' ');
    let topWord = 'شبكة';
    let mainName = 'الدحشة اللاسلكية';
    if (parts.length > 1) {
      topWord = parts[0];
      mainName = parts.slice(1).join(' ');
    } else if (parts.length === 1) {
      topWord = '';
      mainName = parts[0];
    }

    // Draw top word
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(topWord, x + width / 2 + 15, y + 20);
    
    // Draw mainName
    const fontSize = mainName.length > 12 ? '14px' : mainName.length > 8 ? '17px' : '20px';
    ctx.font = `bold ${fontSize} sans-serif`;
    ctx.fillText(mainName, x + width / 2 + 15, y + 43);
    
    // Draw wifi waves on left
    const centerX = x + 35;
    const centerY = y + 36;
    
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 6, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(centerX, centerY, 11, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(centerX, centerY, 16, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
    
    // Core dot
    ctx.beginPath();
    ctx.arc(centerX, centerY, 2.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Arrows
    // Down Arrow (left of dot)
    ctx.beginPath();
    ctx.moveTo(centerX - 8, centerY + 8);
    ctx.lineTo(centerX - 8, centerY + 18);
    ctx.stroke();
    // arrow head down
    ctx.beginPath();
    ctx.moveTo(centerX - 11, centerY + 14);
    ctx.lineTo(centerX - 8, centerY + 18);
    ctx.lineTo(centerX - 5, centerY + 14);
    ctx.stroke();
    
    // Up Arrow (right of dot)
    ctx.beginPath();
    ctx.moveTo(centerX + 8, centerY + 18);
    ctx.lineTo(centerX + 8, centerY + 8);
    ctx.stroke();
    // arrow head up
    ctx.beginPath();
    ctx.moveTo(centerX + 5, centerY + 12);
    ctx.lineTo(centerX + 8, centerY + 8);
    ctx.lineTo(centerX + 11, centerY + 12);
    ctx.stroke();

    // Subtitle
    ctx.font = 'bold 7px sans-serif';
    ctx.fillText(getNetworkName().toUpperCase(), x + width / 2, y + 71);
    
  } else {
    // --- Premium Full color, styled visual brand banner ---
    
    // Rounded charcoal BG box
    const r = 12; // corner radius
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    
    // Create elegant dark gradient background
    const bgGrad = ctx.createLinearGradient(x, y, x, y + height);
    bgGrad.addColorStop(0, '#2d2e2f');
    bgGrad.addColorStop(1, '#1e2021');
    ctx.fillStyle = bgGrad;
    ctx.fill();
    
    // Draw decorative corner gold visual elements matching original logo style
    // Top-left gold splash
    ctx.beginPath();
    ctx.moveTo(x, y + 25);
    ctx.bezierCurveTo(x + 10, y + 20, x + 20, y + 10, x + 25, y);
    ctx.lineTo(x, y);
    ctx.closePath();
    ctx.fillStyle = '#facc15';
    ctx.fill();
    
    // Bottom-right gold splash
    ctx.beginPath();
    ctx.moveTo(x + width, y + height - 25);
    ctx.bezierCurveTo(x + width - 10, y + height - 20, x + width - 20, y + height - 10, x + width - 25, y + height);
    ctx.lineTo(x + width, y + height);
    ctx.closePath();
    ctx.fillStyle = '#facc15';
    ctx.fill();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.direction = 'rtl';
    
    // Split network name dynamically for high-fidelity vector logo representation
    const parts = getNetworkName().split(' ');
    let topWord = 'شبكة';
    let mainName = 'الدحشة اللاسلكية';
    if (parts.length > 1) {
      topWord = parts[0];
      mainName = parts.slice(1).join(' ');
    } else if (parts.length === 1) {
      topWord = '';
      mainName = parts[0];
    }

    // Draw top word in shining gold/yellow
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 3;
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(topWord, x + width / 2 + 15, y + 20);
    
    // Draw mainName in premium white with clean outlines
    ctx.fillStyle = '#ffffff';
    const fontSize = mainName.length > 12 ? '15px' : mainName.length > 8 ? '18px' : '21px';
    ctx.font = `bold ${fontSize} sans-serif`;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.2;
    ctx.strokeText(mainName, x + width / 2 + 15, y + 43);
    ctx.fillText(mainName, x + width / 2 + 15, y + 43);
    
    // 3 small golden square accent dots (mimicking accents)
    ctx.shadowBlur = 0; // reset shadow
    ctx.fillStyle = '#facc15';
    ctx.fillRect(x + width / 2 + 3, y + 27, 3, 3);
    ctx.fillRect(x + width / 2 + 9, y + 27, 3, 3);
    
    // Draw Wifi network wave concentric circles (on left)
    const centerX = x + 35;
    const centerY = y + 36;
    
    ctx.lineWidth = 3.2;
    ctx.strokeStyle = '#facc15'; // gold wave color
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, 7, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, 13, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, 19, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
    
    // Core dot
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Standard white/silver down arrow and gold up arrow
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(centerX - 8, centerY + 8);
    ctx.lineTo(centerX - 8, centerY + 18);
    ctx.stroke();
    
    // Down Arrowhead icon shape
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(centerX - 11, centerY + 14);
    ctx.lineTo(centerX - 8, centerY + 18);
    ctx.lineTo(centerX - 5, centerY + 14);
    ctx.fill();
    
    // Gold up arrow icon shape
    ctx.strokeStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(centerX + 8, centerY + 18);
    ctx.lineTo(centerX + 8, centerY + 8);
    ctx.stroke();
    
    // Up Arrowhead shape
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(centerX + 5, centerY + 12);
    ctx.lineTo(centerX + 8, centerY + 8);
    ctx.lineTo(centerX + 11, centerY + 12);
    ctx.fill();

    // Subtitle text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 7px sans-serif';
    ctx.fillText(getNetworkName().toUpperCase(), x + width / 2, y + 71);
  }
  
  ctx.restore();
};

// --- Single Invoice Receipt Canvas Drawing & PDF Conversion ---
export const drawInvoiceOnCanvas = (summary: {
  items: { label: string; category: number; quantity: number; price: number; total: number }[];
  totalAmount: number;
  receivedAmount: number;
  remainingAmount: number;
  type: CalculatorType;
  date: string;
  shopName?: string;
  previousBalance?: number;
}, isThermal: boolean = false): HTMLCanvasElement | null => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  
  const items = summary.items;
  const headerHeight = 165;
  const itemRowHeight = 42;
  const footerHeight = 225;
  const canvasWidth = 500;
  const canvasHeight = headerHeight + (items.length * itemRowHeight) + footerHeight;
  
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  
  // Fill background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  
  if (isThermal) {
    // --- POS Thermal Printer Mode: Pure monochrome high-contrast, no heavy black fills ---
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, canvasWidth - 20, canvasHeight - 20);
    
    const drawDashLine = (y: number) => {
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(15, y);
      ctx.lineTo(canvasWidth - 15, y);
      ctx.stroke();
      ctx.setLineDash([]);
    };

    // Draw monochrome black/white network logo
    drawDahshahLogo(ctx, 22, 23, 140, 72, true);

    ctx.fillStyle = '#000000';
    ctx.textBaseline = 'middle';
    ctx.direction = 'rtl';
    
    const isPaymentOnly = summary.totalAmount === 0 || (items.length === 0 && summary.receivedAmount > 0);
    const opNumber = (summary as any).transactionId || 'TX-' + Math.floor(100000 + Math.random() * 900000);
    
    ctx.textAlign = 'right';
    ctx.font = 'bold 21px sans-serif';
    ctx.fillText(getNetworkName(), canvasWidth - 30, 46);
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(isPaymentOnly ? 'سند قبض مالي وإشعار استلام نقدي' : 'فاتورة مبيعات كروت اتصالات وموزعين', canvasWidth - 30, 73);
    
    drawDashLine(100);
    
    // Meta details with shop name custom
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'right';
    if (isPaymentOnly) {
      ctx.fillText(`تاريخ العملية: ${summary.date}  |  رقم العملية: ${opNumber}`, canvasWidth - 30, 118);
    } else {
      ctx.fillText(`التاريخ: ${summary.date}  |  ${summary.type === CalculatorType.PRO ? 'فئة برو Pro' : 'فئة عادية'}`, canvasWidth - 30, 118);
    }
    
    ctx.textAlign = 'left';
    ctx.fillText(`العميل / البقالة: ${summary.shopName || 'بقالة عامة'}`, 30, 118);
    
    drawDashLine(135);
    
    let currentY = 158;
    if (isPaymentOnly) {
      // Custom payment-only receipt layout for thermal mode
      ctx.textAlign = 'center';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText('سند قبض مالي وإشعار استلام نقدي', canvasWidth / 2, currentY);
      
      currentY += 28;
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(`رقم العملية: ${opNumber}`, canvasWidth / 2, currentY);
      
      currentY += 25;
      ctx.font = 'bold 11.5px sans-serif';
      ctx.fillText(`تم استلام مبلغ وقدره: ${summary.receivedAmount} ريال يمني`, canvasWidth / 2, currentY);
      
      currentY += 25;
      ctx.fillText('من الإخوة عملاء وموزعي الشبكة الكرام', canvasWidth / 2, currentY);
      currentY += 20;
      
      drawDashLine(currentY);
      currentY += 25;
      
      ctx.font = 'bold 11.5px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('المبلغ الواصل (الكاش):', canvasWidth - 40, currentY);
      ctx.textAlign = 'left';
      ctx.fillText(`${summary.receivedAmount} ريال`, 40, currentY);
      
      currentY += 25;
      
      const prevBal = summary.previousBalance ?? 0;
      ctx.textAlign = 'right';
      ctx.fillText(prevBal > 0 ? 'الرصيد السابق المستحق عليهم:' : 'رصيدكم الدائن مسبقاً (لكم):', canvasWidth - 40, currentY);
      ctx.textAlign = 'left';
      ctx.fillText(`${Math.abs(prevBal)} ريال`, 40, currentY);
      
      const netRemaining = prevBal - summary.receivedAmount;
      currentY += 25;
      ctx.textAlign = 'right';
      ctx.fillText(netRemaining > 0 ? 'صافي الحساب الكلي المطلوب:' : netRemaining < 0 ? 'صافي رصيدكم الحالي (لكم):' : 'صافي الحساب الكلي:', canvasWidth - 40, currentY);
      ctx.textAlign = 'left';
      ctx.fillText(netRemaining === 0 ? 'خالص مسدد' : `${Math.abs(netRemaining)} ريال`, 40, currentY);
      
      currentY += 15;
    } else {
      // Table Headers
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('الرقم', 450, currentY);
      ctx.fillText('أسم المنتج', 320, currentY);
      ctx.fillText('السعر', 205, currentY);
      ctx.fillText('الكمية', 135, currentY);
      ctx.fillText('اجمالي', 65, currentY);
      
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(25, 172);
      ctx.lineTo(canvasWidth - 25, 172);
      ctx.stroke();
      
      // Table Rows
      currentY = 195;
      items.forEach((item, idx) => {
        ctx.textAlign = 'center';
        ctx.fillText(String(idx + 1), 450, currentY);
        ctx.fillText(item.label, 320, currentY);
        ctx.fillText(`${item.price} ريال`, 205, currentY);
        ctx.fillText(String(item.quantity), 135, currentY);
        ctx.fillText(`${item.total} ريال`, 65, currentY);
        
        ctx.strokeStyle = '#cccccc';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(25, currentY + 15);
        ctx.lineTo(canvasWidth - 25, currentY + 15);
        ctx.stroke();
        
        currentY += itemRowHeight;
      });
      
      // Total summaries
      drawDashLine(currentY - 5);
      currentY += 20;
      
      ctx.font = 'bold 12.5px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('إجمالي قيمة الفاتورة:', canvasWidth - 40, currentY);
      ctx.textAlign = 'left';
      ctx.fillText(`${summary.totalAmount} ريال`, 40, currentY);
      
      currentY += 25;
      ctx.textAlign = 'right';
      ctx.fillText('المبلغ المقبوض (الواصل):', canvasWidth - 40, currentY);
      ctx.textAlign = 'left';
      ctx.fillText(`${summary.receivedAmount} ريال`, 40, currentY);
      
      const invoiceRemaining = summary.totalAmount - summary.receivedAmount;
      currentY += 25;
      ctx.textAlign = 'right';
      ctx.fillText(invoiceRemaining >= 0 ? 'المتبقي من الفاتورة (آجل):' : 'المتبقي من الفاتورة (له):', canvasWidth - 40, currentY);
      ctx.textAlign = 'left';
      ctx.fillText(`${Math.abs(invoiceRemaining)} ريال`, 40, currentY);

      const prevBal = summary.previousBalance ?? 0;
      if (prevBal !== 0) {
        currentY += 25;
        ctx.textAlign = 'right';
        ctx.fillText(prevBal > 0 ? 'الرصيد السابق المستحق:' : 'رصيدكم الدائن مسبقاً (لكم):', canvasWidth - 40, currentY);
        ctx.textAlign = 'left';
        ctx.fillText(`${Math.abs(prevBal)} ريال`, 40, currentY);
      }

      const grandTotalBalance = prevBal + invoiceRemaining;
      currentY += 25;
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(grandTotalBalance > 0 ? 'صافي الحساب الكلي المطلوب:' : grandTotalBalance < 0 ? 'صافي رصيدكم الحالي (له):' : 'صافي الحساب الجاري الكلي:', canvasWidth - 40, currentY);
      ctx.textAlign = 'left';
      ctx.fillText(grandTotalBalance === 0 ? 'خالص مسدد' : `${Math.abs(grandTotalBalance)} ريال`, 40, currentY);
      
      currentY += 20;
    }
    
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    drawDashLine(currentY);
    currentY += 28;
    
    ctx.textAlign = 'center';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('الموزع والوكيل: ' + getDistributorName() + ' - هاتف: ' + getDistributorPhone(), canvasWidth / 2, currentY);
    currentY += 20;
    ctx.font = '10px sans-serif';
    ctx.fillText('نشكر ثقتكم بنا - ' + getNetworkName(), canvasWidth / 2, currentY);
    if (getInvoiceFooterNote()) {
      currentY += 18;
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText(getInvoiceFooterNote(), canvasWidth / 2, currentY);
    }
    
  } else {
    // --- Premium Standard Layout: Clean, Professional, Monochrome Black Texts with Red Bold Figures ---
    const isPaymentOnly = summary.totalAmount === 0 || (items.length === 0 && summary.receivedAmount > 0);
    const opNumber = (summary as any).transactionId || 'TX-' + Math.floor(100000 + Math.random() * 900000);
    
    // Clean thin black framing border
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(15, 15, canvasWidth - 30, canvasHeight - 30);
    
    ctx.fillStyle = '#000000';
    ctx.textBaseline = 'middle';
    ctx.direction = 'rtl';
    
    // Draw premium colorful network logo
    drawDahshahLogo(ctx, 22, 23, 140, 72, false);
    
    ctx.textAlign = 'right';
    ctx.font = 'bold 21px sans-serif';
    ctx.fillText(getNetworkName(), canvasWidth - 30, 46);
    
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(isPaymentOnly ? 'سند قبض مالي وإشعار استلام نقدي' : 'فاتــورة مبيــعـات كروت اتصالات وموزعين كاش', canvasWidth - 30, 73);
    
    // Simple thin horizontal separator line
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(35, 102);
    ctx.lineTo(canvasWidth - 35, 102);
    ctx.stroke();
    
    // Metadata block
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'right';
    if (isPaymentOnly) {
      ctx.fillText(`تاريخ العملية: ${summary.date}  |  رقم العملية: ${opNumber}`, canvasWidth - 40, 122);
    } else {
      ctx.fillText(`تاريخ الفاتورة: ${summary.date}  |  ${summary.type === CalculatorType.PRO ? 'حساب فئة برو Pro' : 'حساب كروت عادية'}`, canvasWidth - 40, 122);
    }
    
    ctx.textAlign = 'left';
    ctx.fillText(`العميل / البقالة: ${summary.shopName || 'بقالة عامة'}`, 40, 122);
    
    let currentY = 155;
    
    if (isPaymentOnly) {
      // Draw customized payment voucher layout in standard mode
      const boxY = 150;
      const boxHeight = 110;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.strokeRect(30, boxY, canvasWidth - 60, boxHeight);
      
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('سند قبض مالي وإشعار استلام نقدي', canvasWidth / 2, boxY + 25);
      
      ctx.font = 'bold 11.5px sans-serif';
      ctx.fillText(`رقم السند/العملية: ${opNumber}`, canvasWidth / 2, boxY + 45);
      
      ctx.font = 'bold 12.5px sans-serif';
      ctx.fillText(`استلمنا من الإخوة: ${summary.shopName || 'بقالة عامة'}`, canvasWidth / 2, boxY + 68);
      ctx.fillText(`دفعة مسددة مقبوضة كاش بقيمة ${summary.receivedAmount} ريال`, canvasWidth / 2, boxY + 90);
      
      currentY = boxY + boxHeight + 40;
      
      // Separator
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(30, currentY - 12);
      ctx.lineTo(canvasWidth - 30, currentY - 12);
      ctx.stroke();
      
      // Summary values
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 12.5px sans-serif';
      
      ctx.textAlign = 'right';
      ctx.fillText('المبلغ المقبوض (الواصل):', canvasWidth - 180, currentY);
      ctx.fillStyle = '#dc2626'; // Red
      ctx.textAlign = 'left';
      ctx.fillText(`${summary.receivedAmount} ريال`, 45, currentY);
      
      const prevBal = summary.previousBalance ?? 0;
      currentY += 24;
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'right';
      ctx.fillText(prevBal > 0 ? 'الرصيد السابق المستحق عليه:' : 'الرصيد الدائن لكم مسبقاً (له):', canvasWidth - 180, currentY);
      ctx.fillStyle = '#dc2626'; // Red
      ctx.textAlign = 'left';
      ctx.fillText(`${Math.abs(prevBal)} ريال`, 45, currentY);
      
      const netRemaining = prevBal - summary.receivedAmount;
      currentY += 24;
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'right';
      ctx.fillText(netRemaining > 0 ? 'صافي الحساب المتبقي الكلي المطلوب:' : netRemaining < 0 ? 'صافي الحساب المتبقي الحالي (له):' : 'صافي الحساب الكلي المطلوب:', canvasWidth - 180, currentY);
      ctx.fillStyle = '#dc2626'; // Red
      ctx.textAlign = 'left';
      ctx.fillText(netRemaining === 0 ? 'خالص مسدد' : `${Math.abs(netRemaining)} ريال`, 45, currentY);
      
      // Display current remaining amount prominently
      currentY += 38;
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 12.5px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(netRemaining > 0 ? 'صافي الحساب المتبقي والمستمر:' : netRemaining < 0 ? 'صافي الرصيد الحالي للعميل (له):' : 'صافي حساب العميل المتبقي:', canvasWidth - 40, currentY);
      
      ctx.fillStyle = '#dc2626'; // Bold red display value
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText(netRemaining === 0 ? 'خالص مسدد بالكامل' : `${Math.abs(netRemaining)} ريال`, canvasWidth - 40, currentY + 24);
    } else {
      // Table Header Area
      const drawHeaderBox = (xStart: number, width: number, label: string) => {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(xStart, currentY - 11, width, 22);
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(label, xStart + (width / 2), currentY + 1);
      };
      
      drawHeaderBox(440, 30, 'م');
      drawHeaderBox(240, 200, 'أسم المنتج / الفئة');
      drawHeaderBox(165, 75, 'السعر');
      drawHeaderBox(105, 60, 'الكمية');
      drawHeaderBox(30, 75, 'الاجمالي');
      
      // Row listings
      currentY = 182;
      items.forEach((item, idx) => {
        currentY += itemRowHeight;
        
        // Horizontal row separator line
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(30, currentY + 12);
        ctx.lineTo(canvasWidth - 30, currentY + 12);
        ctx.stroke();
        
        ctx.font = 'bold 12.5px sans-serif';
        
        // ID Row (Black)
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.fillText(String(idx + 1), 455, currentY);
        
        // Item Name (Black)
        ctx.textAlign = 'right';
        ctx.fillText(item.label, 420, currentY);
        
        // Price (Red)
        ctx.fillStyle = '#dc2626';
        ctx.textAlign = 'center';
        ctx.fillText(`${item.price} ريال`, 202, currentY);
        
        // Quantity (Black)
        ctx.fillStyle = '#000000';
        ctx.fillText(String(item.quantity), 135, currentY);
        
        // Row Total (Red)
        ctx.fillStyle = '#dc2626';
        ctx.fillText(`${item.total} ريال`, 67, currentY);
      });
      
      currentY += 40;
      
      // Bottom separator
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(30, currentY - 12);
      ctx.lineTo(canvasWidth - 30, currentY - 12);
      ctx.stroke();
      
      // Summary values
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 12px sans-serif';
      
      ctx.textAlign = 'right';
      ctx.fillText('الإجمالي الفرعي للفاتورة:', canvasWidth - 180, currentY);
      ctx.fillStyle = '#dc2626'; // Red
      ctx.textAlign = 'left';
      ctx.fillText(`${summary.totalAmount} ريال`, 45, currentY);
      
      currentY += 24;
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'right';
      ctx.fillText('المدفوع (المبلغ الواصل):', canvasWidth - 180, currentY);
      ctx.fillStyle = '#dc2626'; // Red
      ctx.textAlign = 'left';
      ctx.fillText(`${summary.receivedAmount} ريال`, 45, currentY);
      
      const invoiceRemaining = summary.totalAmount - summary.receivedAmount;
      currentY += 24;
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'right';
      ctx.fillText(invoiceRemaining >= 0 ? 'المتبقي من الفاتورة (آجل):' : 'المتبقي من الفاتورة (له):', canvasWidth - 180, currentY);
      ctx.fillStyle = '#dc2626'; // Red
      ctx.textAlign = 'left';
      ctx.fillText(`${Math.abs(invoiceRemaining)} ريال`, 45, currentY);

      const prevBal = summary.previousBalance ?? 0;
      if (prevBal !== 0) {
        currentY += 24;
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'right';
        ctx.fillText(prevBal > 0 ? 'الرصيد السابق المستحق:' : 'الرصيد السابق الدائن له:', canvasWidth - 180, currentY);
        ctx.fillStyle = '#dc2626'; // Red
        ctx.textAlign = 'left';
        ctx.fillText(`${Math.abs(prevBal)} ريال`, 45, currentY);
      }
      
      const grandTotalBalance = prevBal + invoiceRemaining;

      // Outstanding Due Section prominently colored deep red
      currentY += 38;
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(grandTotalBalance > 0 ? 'صافي الحساب الكلي المطلوب (آجل):' : grandTotalBalance < 0 ? 'صافي رصيد العميل الحالي (له):' : 'صافي الحساب الكلي (مسدد بالكامل):', canvasWidth - 40, currentY);
      
      ctx.fillStyle = '#dc2626'; // Bold red display value
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText(grandTotalBalance === 0 ? 'خالص مسدد' : `${Math.abs(grandTotalBalance)} ريال`, canvasWidth - 40, currentY + 24);
    }
    
    // Signature block
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('توقيع الموزع والوكيل المعتمد', 165, currentY + 10);
    
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(35, currentY + 34);
    ctx.lineTo(190, currentY + 34);
    ctx.stroke();
    
    // Distributor details
    currentY += 80;
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'right';
    ctx.font = 'bold 11.5px sans-serif';
    ctx.fillText('الموزع المعترف به والوكيل الحصري: ' + getDistributorName(), canvasWidth - 40, currentY);
    
    ctx.font = 'bold 10.5px sans-serif';
    ctx.fillText('للتواصل ومبيعات الجوال: ' + getDistributorPhone(), canvasWidth - 40, currentY + 16);
    
    ctx.textAlign = 'left';
    ctx.font = 'bold 10.5px sans-serif';
    ctx.fillText(getInvoiceFooterNote(), canvasWidth - 280, currentY + 8);
  }
  
  return canvas;
};

// PDF filename builder utility
export const generateDocFilename = (summary: {
  totalAmount: number;
  receivedAmount: number;
  items: any[];
  shopName?: string;
  date?: string;
  transactionId?: string;
}, defaultValue: string = 'فاتورة', extension: string = 'pdf') => {
  const isPaymentOnly = summary.totalAmount === 0 || (summary.items.length === 0 && summary.receivedAmount > 0);
  const docType = isPaymentOnly ? 'واصل' : defaultValue;
  const shop = (summary.shopName || 'بقالة عامة').trim();
  
  const now = new Date();
  let month = now.getMonth() + 1;
  let day = now.getDate();
  let hour = now.getHours();
  
  if (summary.date) {
    const parts = summary.date.split('-');
    if (parts.length === 3) {
      // YYYY-MM-DD
      month = parseInt(parts[1], 10);
      day = parseInt(parts[2], 10);
    }
  }
  
  return `${shop} ${docType} ${month}\\${day} ${hour}.${extension}`;
};

// PDF Exporter for Single Invoice
export const downloadInvoicePDF = (summary: {
  items: { label: string; category: number; quantity: number; price: number; total: number }[];
  totalAmount: number;
  receivedAmount: number;
  remainingAmount: number;
  type: CalculatorType;
  date: string;
  shopName?: string;
  previousBalance?: number;
  transactionId?: string;
}, isThermal: boolean = false) => {
  const canvas = drawInvoiceOnCanvas(summary, isThermal);
  if (!canvas) return;
  
  const imgData = canvas.toDataURL('image/jpeg', 1.0);
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  
  const pdfWidth = canvasWidth * 0.264583; // px to mm conversion
  const pdfHeight = canvasHeight * 0.264583;
  
  const pdf = new jsPDF({
    orientation: pdfWidth > pdfHeight ? 'l' : 'p',
    unit: 'mm',
    format: [pdfWidth, pdfHeight]
  });
  
  pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
  
  const fileName = generateDocFilename(summary, 'فاتورة', 'pdf');
  pdf.save(fileName);

  // Auto-save to native Krot directory on phone
  const pdfDataUri = pdf.output('datauristring');
  saveFileToKrotFolder(fileName, pdfDataUri, true, true);
};

// Image (PNG) Exporter for Single Invoice
export const downloadInvoicePNG = (summary: {
  items: { label: string; category: number; quantity: number; price: number; total: number }[];
  totalAmount: number;
  receivedAmount: number;
  remainingAmount: number;
  type: CalculatorType;
  date: string;
  shopName?: string;
  previousBalance?: number;
  transactionId?: string;
}, isThermal: boolean = false) => {
  const canvas = drawInvoiceOnCanvas(summary, isThermal);
  if (!canvas) return;
  
  const imgData = canvas.toDataURL('image/png', 1.0);
  const link = document.createElement('a');
  link.setAttribute('href', imgData);
  
  const fileName = generateDocFilename(summary, 'فاتورة', 'png');
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// --- Daily Financial Summary Canvas PDF Drawing ---
export const downloadDailyReportPDF = (report: any, history: SaleRecord[], customDate?: string) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  const today = customDate || new Date().toISOString().split('T')[0];
  const canvasWidth = 600;
  
  // Collect actual sales segments
  const regularItems = INITIAL_PRICES[CalculatorType.REGULAR].map(p => ({
    label: p.label,
    quantity: report[CalculatorType.REGULAR][p.id]?.quantity || 0,
    amount: report[CalculatorType.REGULAR][p.id]?.amount || 0
  })).filter(item => item.quantity > 0);

  const proItems = INITIAL_PRICES[CalculatorType.PRO].map(p => ({
    label: p.label,
    quantity: report[CalculatorType.PRO][p.id]?.quantity || 0,
    amount: report[CalculatorType.PRO][p.id]?.amount || 0
  })).filter(item => item.quantity > 0);

  const totalSalesCount = history.filter(s => s.date === today).reduce((sum, s) => sum + s.quantity, 0);

  const headerHeight = 150;
  const itemRowHeight = 35;
  const footerHeight = 150;
  
  const totalRows = regularItems.length + proItems.length + 
                    (regularItems.length > 0 ? 1 : 0) + 
                    (proItems.length > 0 ? 1 : 0);
  
  const canvasHeight = headerHeight + (totalRows * itemRowHeight) + footerHeight;
  
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  
  // Fill background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  
  // Clean thin border frame
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(15, 15, canvasWidth - 30, canvasHeight - 30);
  
  ctx.textBaseline = 'middle';
  ctx.direction = 'rtl';
  
  // Center Title (No logo as requested)
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(getNetworkName(), canvasWidth / 2, 50);

  const customImg = getCustomLogoImage();
  if (customImg && customImg.complete && customImg.naturalWidth > 0) {
    ctx.drawImage(customImg, 30, 25, 100, 55);
  }
  
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('التقرير الحسابي والمالي اليومي الموحد', canvasWidth / 2, 80);
  
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText(`تاريخ التقرير اليومي: ${today}`, canvasWidth / 2, 108);
  
  // Simple divider
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(30, 125);
  ctx.lineTo(canvasWidth - 30, 125);
  ctx.stroke();
  
  let currentY = 150;
  
  const drawSectionHeader = (y: number, title: string) => {
    ctx.fillStyle = '#000000';
    ctx.fillRect(30, y - 12, canvasWidth - 60, 22);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`  ${title}`, canvasWidth - 45, y);
    ctx.textAlign = 'center';
    ctx.fillText('الكمية المباعة', canvasWidth / 2, y);
    ctx.textAlign = 'left';
    ctx.fillText('إجمالي المبلغ  ', 45, y);
  };
  
  // Draw Regular Section
  if (regularItems.length > 0) {
    drawSectionHeader(currentY, 'قسم كروت الفئات العادية');
    currentY += 30;
    
    regularItems.forEach(item => {
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(30, currentY + 12);
      ctx.lineTo(canvasWidth - 30, currentY + 12);
      ctx.stroke();
      
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 12px sans-serif';
      
      ctx.textAlign = 'right';
      ctx.fillText(item.label, canvasWidth - 45, currentY);
      
      ctx.textAlign = 'center';
      ctx.fillText(String(item.quantity), canvasWidth / 2, currentY);
      
      ctx.fillStyle = '#dc2626'; // Red
      ctx.textAlign = 'left';
      ctx.fillText(`${item.amount} ريال`, 45, currentY);
      
      currentY += itemRowHeight;
    });
    currentY += 15;
  }
  
  // Draw Pro Section
  if (proItems.length > 0) {
    drawSectionHeader(currentY, 'قسم كروت فئة برو Pro');
    currentY += 30;
    
    proItems.forEach(item => {
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(30, currentY + 12);
      ctx.lineTo(canvasWidth - 30, currentY + 12);
      ctx.stroke();
      
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 12px sans-serif';
      
      ctx.textAlign = 'right';
      ctx.fillText(item.label, canvasWidth - 45, currentY);
      
      ctx.textAlign = 'center';
      ctx.fillText(String(item.quantity), canvasWidth / 2, currentY);
      
      ctx.fillStyle = '#dc2626'; // Red
      ctx.textAlign = 'left';
      ctx.fillText(`${item.amount} ريال`, 45, currentY);
      
      currentY += itemRowHeight;
    });
    currentY += 15;
  }
  
  // Separator before stats
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(35, currentY - 15);
  ctx.lineTo(canvasWidth - 35, currentY - 15);
  ctx.stroke();
  
  // Statistics Section
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('إجمالي المبيعات والمدخول المالي الكلي لليوم:', canvasWidth - 50, currentY);
  ctx.fillStyle = '#dc2626'; // Red
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`${report.totalAmount} ريال يمني كامل`, 50, currentY);
  
  currentY += 25;
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('حجم الكروت الكلية المباعة اليوم ككل:', canvasWidth - 50, currentY);
  ctx.fillStyle = '#dc2626'; // Red
  ctx.textAlign = 'left';
  ctx.fillText(`${totalSalesCount} كرت`, 50, currentY);
  
  currentY += 22;
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('توقيع المحاسب / الموزع المسؤول:', canvasWidth - 50, currentY);
  ctx.textAlign = 'left';
  ctx.fillText('توقيع الوكيل المعتمد لشمال اليمن', 190, currentY);
  
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(40, currentY + 18);
  ctx.lineTo(165, currentY + 18);
  ctx.stroke();
  
  currentY += 55;
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('هذا كشف مالي رسمي مبسط ملخص لعمل ' + getNetworkName() + ' - ' + getDistributorName() + ' (' + getDistributorPhone() + ')', canvasWidth / 2, currentY);
  if (getInvoiceFooterNote()) {
    currentY += 15;
    ctx.font = 'bold 8.5px sans-serif';
    ctx.fillText(getInvoiceFooterNote(), canvasWidth / 2, currentY);
  }
  
  const imgData = canvas.toDataURL('image/jpeg', 1.0);
  const pdfWidth = canvasWidth * 0.264583;
  const pdfHeight = canvasHeight * 0.264583;
  const pdf = new jsPDF({
    orientation: pdfWidth > pdfHeight ? 'l' : 'p',
    unit: 'mm',
    format: [pdfWidth, pdfHeight]
  });
  
  const now = new Date();
  let month = now.getMonth() + 1;
  let day = now.getDate();
  const hour = now.getHours();
  
  if (today) {
    const parts = today.split('-');
    if (parts.length === 3) {
      month = parseInt(parts[1], 10);
      day = parseInt(parts[2], 10);
    }
  }
  
  pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
  const reportFileName = `تقرير يومي ${month}_${day} ${hour}.pdf`;
  pdf.save(reportFileName);

  // Auto-save to phone's Krot folder
  const pdfDataUri = pdf.output('datauristring');
  saveFileToKrotFolder(reportFileName, pdfDataUri, true, true);
};

// --- Custom Detailed Daily Report PDF for Date Filtered Report ---
export const downloadDetailedDailyReportPDF = (
  reportDate: string,
  totalCardsQuantity: number,
  totalDebtIncreased: number,
  totalPayments: number,
  totalCashNoDebt: number,
  shopsDetails: { name: string; sales: number; payments: number; net: number; status: string }[],
  regularItems: any[],
  proItems: any[]
) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const canvasWidth = 700;
  
  const headerHeight = 150;
  const summaryHeight = 140;
  const tableHeaderHeight = 40;
  const rowHeight = 35;
  const footerHeight = 160;
  
  const totalTableRows = shopsDetails.length;
  const totalCategoryRows = regularItems.length + proItems.length + (regularItems.length > 0 ? 1 : 0) + (proItems.length > 0 ? 1 : 0);
  
  const canvasHeight = headerHeight + summaryHeight + 40 + tableHeaderHeight + (totalTableRows * rowHeight) + (totalCategoryRows * rowHeight) + footerHeight + 60;
  
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  
  // Fill background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  
  // Outer borders
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(15, 15, canvasWidth - 30, canvasHeight - 30);
  
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(20, 20, canvasWidth - 40, canvasHeight - 40);
  
  ctx.textBaseline = 'middle';
  ctx.direction = 'rtl';
  
  // Title Header
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(getNetworkName(), canvasWidth / 2, 55);
  
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('التقرير المالي والحسابي التفصيلي الموحد لليوم', canvasWidth / 2, 85);
  
  ctx.font = 'bold 11.5px sans-serif';
  ctx.fillText(`تاريخ التقرير المالي: ${reportDate}`, canvasWidth / 2, 110);
  
  // Divider
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(40, 130);
  ctx.lineTo(canvasWidth - 40, 130);
  ctx.stroke();
  
  let currentY = 160;
  
  // Draw Summary Grid (2x2 cards)
  const drawCard = (x: number, y: number, w: number, h: number, title: string, value: string, color: string) => {
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
    
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(title, x + w - 15, y + 25);
    
    ctx.fillStyle = color;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(value, x + 15, y + 55);
  };
  
  const cardW = 310;
  const cardH = 80;
  
  // Card 1: عدد الكروت المباعة
  drawCard(canvasWidth - cardW - 30, currentY, cardW, cardH, 'عدد الكروت المباعة لليوم ككل', `${totalCardsQuantity} كرت`, '#1e293b');
  
  // Card 2: إجمالي المديونية (الآجل الجديد)
  drawCard(30, currentY, cardW, cardH, 'إجمالي المديونية المرتفعة (الآجل الجديد)', `${totalDebtIncreased} ريال`, '#d97706');
  
  currentY += 90;
  
  // Card 3: إجمالي التسديدات والمقبوضات
  drawCard(canvasWidth - cardW - 30, currentY, cardW, cardH, 'إجمالي التسديدات والمقبوضات المستلمة', `${totalPayments} ريال`, '#16a34a');
  
  // Card 4: إجمالي المبالغ الواصلة بدون مديونية
  drawCard(30, currentY, cardW, cardH, 'إجمالي المبالغ الواصلة نقداً (بدون مديونية)', `${totalCashNoDebt} ريال`, '#2563eb');
  
  currentY += 120;
  
  // Section: Shops Table
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('🏪 كشف حركة حسابات البقالات والعملاء اليومية تفصيلياً:', canvasWidth - 35, currentY);
  
  currentY += 20;
  
  // Table Header
  const headers = [
    { label: 'البقالة / العميل', w: 180, align: 'right' as const },
    { label: 'مبيعات اليوم (آجل)', w: 120, align: 'center' as const },
    { label: 'الواصل / التسديد', w: 120, align: 'center' as const },
    { label: 'صافي الفاتورة', w: 110, align: 'center' as const },
    { label: 'حالة الرصيد اليومي', w: 110, align: 'center' as const }
  ];
  
  let startX = canvasWidth - 30;
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(30, currentY, canvasWidth - 60, 25);
  
  headers.forEach(h => {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10.5px sans-serif';
    if (h.align === 'right') {
      ctx.textAlign = 'right';
      ctx.fillText(`   ${h.label}`, startX, currentY + 12.5);
    } else if (h.align === 'center') {
      ctx.textAlign = 'center';
      ctx.fillText(h.label, startX - h.w / 2, currentY + 12.5);
    }
    startX -= h.w;
  });
  
  currentY += 25;
  
  // Table Rows
  if (shopsDetails.length === 0) {
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('لا توجد معاملات مالية أو حركة للبقالات في هذا اليوم المختار.', canvasWidth / 2, currentY + 20);
    currentY += 40;
  } else {
    shopsDetails.forEach(s => {
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(30, currentY + rowHeight);
      ctx.lineTo(canvasWidth - 30, currentY + rowHeight);
      ctx.stroke();
      
      let rowX = canvasWidth - 30;
      
      // Name
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`  ${s.name}`, rowX, currentY + rowHeight / 2);
      rowX -= 180;
      
      // Sales
      ctx.fillStyle = '#475569';
      ctx.textAlign = 'center';
      ctx.fillText(`${s.sales} ريال`, rowX - 60, currentY + rowHeight / 2);
      rowX -= 120;
      
      // Payments
      ctx.fillStyle = '#16a34a';
      ctx.textAlign = 'center';
      ctx.fillText(`${s.payments} ريال`, rowX - 60, currentY + rowHeight / 2);
      rowX -= 120;
      
      // Net
      ctx.fillStyle = s.net > 0 ? '#dc2626' : s.net < 0 ? '#2563eb' : '#475569';
      ctx.textAlign = 'center';
      ctx.fillText(`${s.net} ريال`, rowX - 55, currentY + rowHeight / 2);
      rowX -= 110;
      
      // Status
      const statusColor = s.status === 'رصيد موجب' ? '#dc2626' : s.status === 'رصيد سالب' ? '#2563eb' : '#64748b';
      ctx.fillStyle = statusColor;
      ctx.textAlign = 'center';
      ctx.fillText(s.status, rowX - 55, currentY + rowHeight / 2);
      
      currentY += rowHeight;
    });
  }
  
  currentY += 30;
  
  // Section: Category sales details
  if (regularItems.length > 0 || proItems.length > 0) {
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('📊 توزيع مبيعات فئات الكروت لليوم تفصيلياً:', canvasWidth - 35, currentY);
    
    currentY += 20;
    
    const drawCategoryRows = (items: any[], title: string, fillStyle: string) => {
      ctx.fillStyle = fillStyle;
      ctx.fillRect(30, currentY, canvasWidth - 60, 22);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10.5px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`  ${title}`, canvasWidth - 45, currentY + 11);
      ctx.textAlign = 'center';
      ctx.fillText('الكمية المباعة اليوم', canvasWidth / 2, currentY + 11);
      ctx.textAlign = 'left';
      ctx.fillText('إجمالي المدخول المالي  ', 45, currentY + 11);
      
      currentY += 22;
      
      items.forEach(item => {
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(30, currentY + rowHeight);
        ctx.lineTo(canvasWidth - 30, currentY + rowHeight);
        ctx.stroke();
        
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(item.label, canvasWidth - 45, currentY + rowHeight / 2);
        
        ctx.textAlign = 'center';
        ctx.fillText(`${item.quantity} كرت`, canvasWidth / 2, currentY + rowHeight / 2);
        
        ctx.fillStyle = '#dc2626';
        ctx.textAlign = 'left';
        ctx.fillText(`${item.amount} ريال`, 45, currentY + rowHeight / 2);
        
        currentY += rowHeight;
      });
      currentY += 10;
    };
    
    if (regularItems.length > 0) {
      drawCategoryRows(regularItems, 'الكروت الفئات العادية للشبكة', '#3b82f6');
    }
    if (proItems.length > 0) {
      drawCategoryRows(proItems, 'كروت فئة برو Pro للشبكة والموزعين', '#8b5cf6');
    }
  }
  
  // Accountant Signature & Footer Block
  currentY += 30;
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(35, currentY);
  ctx.lineTo(canvasWidth - 35, currentY);
  ctx.stroke();
  
  currentY += 30;
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('توقيع المحاسب / الموزع المسؤول:', canvasWidth - 50, currentY);
  ctx.textAlign = 'left';
  ctx.fillText('توقيع وإمضاء الوكيل المعتمد بالشبكة', 190, currentY);
  
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(40, currentY + 18);
  ctx.lineTo(165, currentY + 18);
  ctx.stroke();
  
  currentY += 55;
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`هذا كشف رسمي تفصيلي ومطابقة مالية لعمل شبكة: ${getNetworkName()} - بإشراف الموزع: ${getDistributorName()}`, canvasWidth / 2, currentY);
  
  if (getInvoiceFooterNote()) {
    currentY += 15;
    ctx.font = 'bold 8.5px sans-serif';
    ctx.fillText(getInvoiceFooterNote(), canvasWidth / 2, currentY);
  }
  
  // Export as high resolution JPEG image and download PDF
  const imgData = canvas.toDataURL('image/jpeg', 1.0);
  const pdfWidth = canvasWidth * 0.264583;
  const pdfHeight = canvasHeight * 0.264583;
  
  const pdf = new jsPDF({
    orientation: pdfWidth > pdfHeight ? 'l' : 'p',
    unit: 'mm',
    format: [pdfWidth, pdfHeight]
  });
  
  const now = new Date();
  let month = now.getMonth() + 1;
  let day = now.getDate();
  
  if (reportDate) {
    const parts = reportDate.split('-');
    if (parts.length === 3) {
      month = parseInt(parts[1], 10);
      day = parseInt(parts[2], 10);
    }
  }
  
  pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
  const detailReportName = `تقرير حسابي تفصيلي ${month}_${day}.pdf`;
  pdf.save(detailReportName);

  // Auto-save to phone's Krot folder
  const pdfDataUri = pdf.output('datauristring');
  saveFileToKrotFolder(detailReportName, pdfDataUri, true, true);
};

// --- Detailed Grocery Accounts Statement PDF Rendering & Download Helpers ---
export interface ShopAccountDetail {
  id: string;
  name: string;
  totalSales: number;
  totalPayments: number;
  currentBalance: number;
  createdAt: string;
  transactions: { id: string; date: string; type: 'sale' | 'payment'; amount: number; notes: string }[];
}

export const drawShopStatementOnCanvas = (account: ShopAccountDetail): HTMLCanvasElement | null => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  
  const transactions = account.transactions || [];
  const headerHeight = 290; // Expanded to accommodate distinct header and metadata box
  const rowHeight = 35;
  const footerHeight = 150;
  const canvasWidth = 650;
  const canvasHeight = headerHeight + (transactions.length * rowHeight) + footerHeight;
  
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  
  // Fill background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  
  // Double-border official layout frame
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(15, 15, canvasWidth - 30, canvasHeight - 30);
  
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(20, 20, canvasWidth - 40, canvasHeight - 40);
  
  // Set default direction and baseline
  ctx.textBaseline = 'middle';
  ctx.direction = 'rtl';
  
  // Center Title with dual lines
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(getNetworkName(), canvasWidth / 2, 50);

  const customImg = getCustomLogoImage();
  if (customImg && customImg.complete && customImg.naturalWidth > 0) {
    ctx.drawImage(customImg, 30, 25, 100, 55);
  }
  
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('كشف حساب ومطابقة حسابات البقالات والعملاء المعتمدين', canvasWidth / 2, 80);
  
  // Title Parallel Divider lines
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(40, 96);
  ctx.lineTo(canvasWidth - 40, 96);
  ctx.stroke();
  
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(50, 100);
  ctx.lineTo(canvasWidth - 50, 100);
  ctx.stroke();
  
  // --- Beautiful Metadata Box Grid (Bookkeeping Style) ---
  const metaY = 115;
  const metaHeight = 70;
  const metaWidth = 590; // canvasWidth - 60
  
  // Draw metadata bounding box
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1;
  ctx.strokeRect(30, metaY, metaWidth, metaHeight);
  
  // Draw vertical dividers inside metadata box
  ctx.beginPath();
  ctx.moveTo(30 + 200, metaY);
  ctx.lineTo(30 + 200, metaY + metaHeight);
  ctx.moveTo(30 + 400, metaY);
  ctx.lineTo(30 + 400, metaY + metaHeight);
  ctx.stroke();
  
  // Draw horizontal divider inside metadata box
  ctx.beginPath();
  ctx.moveTo(30, metaY + 30);
  ctx.lineTo(30 + metaWidth, metaY + 30);
  ctx.stroke();
  
  // Fill cells titles background
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(31, metaY + 1, 198, 28);
  ctx.fillRect(231, metaY + 1, 198, 28);
  ctx.fillRect(431, metaY + 1, 188, 28);
  
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 11px sans-serif';
  
  // Column 1 Titles
  ctx.textAlign = 'center';
  ctx.fillText('العميل المستعلم وحساب البقالة', 30 + 495, metaY + 15);
  ctx.fillText('تاريخ كشف الحساب والمسؤول', 30 + 300, metaY + 15);
  ctx.fillText('الرصيد والمستحقات الكلية', 30 + 100, metaY + 15);
  
  // Values
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 12px sans-serif';
  // Client values
  ctx.fillText(account.name, 30 + 495, metaY + 48);
  ctx.font = '900 10.5px sans-serif';
  ctx.fillText(`رقم الحساب: ${account.id}`, 30 + 495, metaY + 60);
  
  // Date values
  ctx.fillText(new Date().toISOString().split('T')[0], 30 + 300, metaY + 48);
  ctx.font = '900 10.5px sans-serif';
  ctx.fillText('الموزع: ' + getDistributorName(), 30 + 300, metaY + 60);
  
  // Money values (Highlighted in RED)
  ctx.fillStyle = '#dc2626';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(`${account.currentBalance} ريال`, 30 + 100, metaY + 44);
  ctx.font = 'bold 10px sans-serif';
  ctx.fillText(`إجمالي المبيعات: ${account.totalSales} ريال`, 30 + 100, metaY + 60);
  
  // --- Authentic Accounting Ledger Sheet Grid ---
  let currentY = 205;
  const tableStartY = currentY;
  
  // Column bounds definitions (Left-to-right)
  const cols = [
    { name: 'الرصيد التراكمي', x: 30, width: 85, align: 'center', isAction: false },
    { name: 'المبلغ', x: 115, width: 85, align: 'center', isAction: true },
    { name: 'تفاصيل الحركة والبيان', x: 200, width: 190, align: 'right', isAction: false },
    { name: 'نوع العملية', x: 390, width: 95, align: 'right', isAction: false },
    { name: 'التاريخ واليوم', x: 485, width: 100, align: 'center', isAction: false },
    { name: 'م', x: 585, width: 35, align: 'center', isAction: false }
  ];
  
  // Draw header row background
  ctx.fillStyle = '#000000';
  ctx.fillRect(30, currentY - 12, 590, 24);
  
  // Draw column labels
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px sans-serif';
  cols.forEach(col => {
    ctx.textAlign = col.align as CanvasTextAlign;
    const textX = col.align === 'center' ? col.x + col.width / 2 : col.x + col.width - 12;
    ctx.fillText(col.name, textX, currentY);
  });
  
  // Update starting line post header
  currentY += 12;
  
  let tempRunning = 0;
  
  // Transactions rows loop
  transactions.forEach((tx, idx) => {
    currentY += rowHeight;
    
    // Draw row background alternating highlights
    ctx.fillStyle = idx % 2 === 0 ? '#ffffff' : '#fcfcfc';
    ctx.fillRect(31, currentY - rowHeight + 1, 588, rowHeight - 1);
    
    // Draw row bottom line
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(30, currentY);
    ctx.lineTo(620, currentY);
    ctx.stroke();
    
    // Calculate running balance
    if (tx.type === 'sale') {
      tempRunning += tx.amount;
    } else {
      tempRunning -= tx.amount;
    }
    
    const opLabel = tx.type === 'sale' ? 'فاتورة مبيعات' : 'سداد نقد مستلم';
    
    // Row column values representation
    cols.forEach(col => {
      ctx.textAlign = col.align as CanvasTextAlign;
      const textX = col.align === 'center' ? col.x + col.width / 2 : col.x + col.width - 12;
      
      ctx.font = 'bold 11.5px sans-serif';
      
      if (col.name === 'م') {
        ctx.fillStyle = '#000000';
        ctx.fillText(String(idx + 1), textX, currentY - rowHeight / 2);
      } else if (col.name === 'التاريخ واليوم') {
        ctx.fillStyle = '#000000';
        ctx.fillText(tx.date, textX, currentY - rowHeight / 2);
      } else if (col.name === 'نوع العملية') {
        ctx.fillStyle = tx.type === 'sale' ? '#000000' : '#000000';
        ctx.fillText(opLabel, textX, currentY - rowHeight / 2);
      } else if (col.name === 'تفاصيل الحركة والبيان') {
        ctx.fillStyle = '#000000';
        ctx.fillText(tx.notes || '', textX, currentY - rowHeight / 2);
      } else if (col.name === 'المبلغ') {
        ctx.fillStyle = '#dc2626'; // Red for monetary figure
        const numSign = tx.type === 'sale' ? '+' : '-';
        ctx.fillText(`${numSign}${tx.amount} ريال`, textX, currentY - rowHeight / 2);
      } else if (col.name === 'الرصيد التراكمي') {
        ctx.fillStyle = '#dc2626'; // Red for running balance
        ctx.fillText(`${tempRunning} ريال`, textX, currentY - rowHeight / 2);
      }
    });
  });
  
  // Draw the full bookkeeping vertical grid lines
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.8;
  cols.forEach(col => {
    ctx.beginPath();
    ctx.moveTo(col.x, tableStartY - 12);
    ctx.lineTo(col.x, currentY);
    ctx.stroke();
  });
  // Rightmost end boundary line
  ctx.beginPath();
  ctx.moveTo(620, tableStartY - 12);
  ctx.lineTo(620, currentY);
  ctx.stroke();
  
  // Add some space for the formal signature ledger block
  currentY += 45;
  
  // Bottom summary divider line
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(30, currentY);
  ctx.lineTo(canvasWidth - 30, currentY);
  ctx.stroke();
  
  // Current outstanding highlighted block
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 12.5px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('بصمة رصيد حساب البقالة النهائي المطالب بدفعه وتصفيته حالياً:', canvasWidth - 45, currentY + 22);
  
  ctx.font = 'bold 20px sans-serif';
  ctx.fillStyle = '#dc2626'; // Red
  ctx.textAlign = 'left';
  ctx.fillText(`${account.currentBalance} ريال يمني مستحق للشبكة`, 45, currentY + 22);
  
  // Signatures segment
  currentY += 70;
  
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.5;
  
  // Accountant Signature
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('توقيع وختم الوكيل المعتمد (' + getDistributorName() + '):', canvasWidth - 45, currentY);
  
  ctx.beginPath();
  ctx.moveTo(canvasWidth - 110, currentY + 28);
  ctx.lineTo(canvasWidth - 280, currentY + 28);
  ctx.stroke();
  
  // Customer Signature
  ctx.textAlign = 'left';
  ctx.fillText('توقيع وختم العميل / صاحب البقالة:', 45, currentY);
  
  ctx.beginPath();
  ctx.moveTo(110, currentY + 28);
  ctx.lineTo(280, currentY + 28);
  ctx.stroke();
  
  currentY += 60;
  ctx.textAlign = 'center';
  ctx.font = 'bold 10.5px sans-serif';
  ctx.fillText(getNetworkName() + ' - خدمة متميزة وعمل مستمر هاتف: ' + getDistributorPhone(), canvasWidth / 2, currentY);
  if (getInvoiceFooterNote()) {
    currentY += 15;
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText(getInvoiceFooterNote(), canvasWidth / 2, currentY);
  }
  
  return canvas;
};

export const downloadShopStatementPDF = (account: ShopAccountDetail) => {
  const canvas = drawShopStatementOnCanvas(account);
  if (!canvas) return;
  
  const imgData = canvas.toDataURL('image/jpeg', 1.0);
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  
  const pdfWidth = canvasWidth * 0.264583; // px to mm conversion
  const pdfHeight = canvasHeight * 0.264583;
  
  const pdf = new jsPDF({
    orientation: pdfWidth > pdfHeight ? 'l' : 'p',
    unit: 'mm',
    format: [pdfWidth, pdfHeight]
  });
  
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const hour = now.getHours();
  
  pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
  const statementFileName = `${account.name} كشف حساب ${month}_${day} ${hour}.pdf`;
  pdf.save(statementFileName);

  // Auto-save to phone's Krot folder
  const pdfDataUri = pdf.output('datauristring');
  saveFileToKrotFolder(statementFileName, pdfDataUri, true, true);
};

// --- formatted Text sharing generators ---
export const handleWhatsAppSingleShare = (summary: {
  items: { label: string; category: number; quantity: number; price: number; total: number }[];
  totalAmount: number;
  receivedAmount: number;
  remainingAmount: number;
  type: CalculatorType;
  date: string;
  shopName?: string;
  previousBalance?: number;
}, isThermal: boolean = false) => {
  // 1. Download PDF in parallel
  downloadInvoicePDF(summary, isThermal);
  
  // 2. Prepare text content
  const timestamp = new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' });
  const typeText = summary.type === CalculatorType.PRO ? 'كروت برو PRO🚀' : 'كروت عادية🔹';
  
  let msg = `*📄 فاتورة مبيعات ${getNetworkName()} 📄*\n`;
  msg += `*العميل / البقالة:* ${summary.shopName || 'بقالة عامة'}\n`;
  msg += `*التاريخ:* ${summary.date} - *الوقت:* ${timestamp}\n`;
  msg += `*نوع الحساب:* ${typeText}\n`;
  msg += `------------------------------------\n`;
  
  summary.items.forEach(item => {
    msg += `🔹 *${item.quantity} أبو ${item.category}* = ${item.total} ريال\n`;
  });
  
  msg += `------------------------------------\n`;
  msg += `💵 *الإجمالي الفاتورة:* *${summary.totalAmount} ريال*\n`;
  msg += `📥 *المستلم (الواصل):* *${summary.receivedAmount} ريال*\n`;
  
  const netDue = summary.totalAmount - summary.receivedAmount;
  if (netDue > 0) {
    msg += `🔄 *المتبقي عليه (دين):* *${netDue} ريال*\n`;
  } else if (netDue < 0) {
    msg += `🔄 *الباقي للزبون (فائض):* *${-netDue} ريال*\n`;
  } else {
    msg += `🔄 *حالة الفاتورة:* خالص مسدد بالكامل\n`;
  }
  
  const prevBal = summary.previousBalance ?? 0;
  if (prevBal > 0) {
    msg += `📌 *الرصيد السابق المستحق عليكم:* *${prevBal} ريال*\n`;
    msg += `💰 *صافي الحساب الكلي المطلوب:* *${prevBal + netDue} ريال*\n`;
  }
  
  msg += `------------------------------------\n`;
  msg += `📜 *[ لسنا الوحيدون ولكننا الافضل ]*\n`;
  msg += `📌 _تم حفظ نسخة PDF الفاتورة على جهازك ويمكنك ارفاق ملف الـ PDF الآن في المحادثة مباشرة!_`;
  
  const enc = encodeURIComponent(msg);
  window.open(`whatsapp://send?text=${enc}`, '_blank');
};

export const handleSMSSingleShare = (summary: {
  items: { label: string; category: number; quantity: number; price: number; total: number }[];
  totalAmount: number;
  receivedAmount?: number;
  shopName?: string;
  previousBalance?: number;
}) => {
  const rec = summary.receivedAmount ?? 0;
  const netDue = summary.totalAmount - rec;
  const prevBal = summary.previousBalance ?? 0;
  
  const lines = summary.items.map((item) => `${item.quantity} أبو ${item.category} = ${item.total}`);
  let text = `*فاتورة ${getNetworkName()}*\n`;
  text += `العميل: ${summary.shopName || 'بقالة عامة'}\n`;
  text += `${lines.join('\n')}\nـــــــــــــــــــــ\n`;
  text += `إجمالي الفاتورة: ${summary.totalAmount} ريال\n`;
  text += `الواصل: ${rec} ريال\n`;
  
  if (netDue > 0) {
    text += `المتبقي عليه: ${netDue} ريال\n`;
  } else if (netDue < 0) {
    text += `الفائض للزبون: ${-netDue} ريال\n`;
  }
  
  if (prevBal > 0) {
    text += `الرصيد السابق عليكم: ${prevBal} ريال\n`;
    text += `صافي الحساب الكلي: ${prevBal + netDue} ريال\n`;
  }
  
  text += `ـــــــــــــــــــــ\n`;
  text += `[ لسنا الوحيدون ولكننا الافضل ]`;
  
  const enc = encodeURIComponent(text);
  window.open(`sms:?body=${enc}`, '_blank');
};

export const handleWhatsAppTextSingleShare = (summary: {
  items: { label: string; category: number; quantity: number; price: number; total: number }[];
  totalAmount: number;
  receivedAmount?: number;
  shopName?: string;
  previousBalance?: number;
}) => {
  const rec = summary.receivedAmount ?? 0;
  const netDue = summary.totalAmount - rec;
  const prevBal = summary.previousBalance ?? 0;
  
  const lines = summary.items.map((item) => `${item.quantity} أبو ${item.category} = ${item.total}`);
  let text = `*فاتورة ${getNetworkName()}*\n`;
  text += `العميل: ${summary.shopName || 'بقالة عامة'}\n`;
  text += `${lines.join('\n')}\nـــــــــــــــــــــ\n`;
  text += `إجمالي الفاتورة: ${summary.totalAmount} ريال\n`;
  text += `الواصل: ${rec} ريال\n`;
  
  if (netDue > 0) {
    text += `المتبقي عليه: ${netDue} ريال\n`;
  } else if (netDue < 0) {
    text += `الفائض للزبون: ${-netDue} ريال\n`;
  }
  
  if (prevBal > 0) {
    text += `الرصيد السابق عليكم: ${prevBal} ريال\n`;
    text += `صافي الحساب الكلي: ${prevBal + netDue} ريال\n`;
  }
  
  text += `ـــــــــــــــــــــ\n`;
  text += `[ لسنا الوحيدون ولكننا الافضل ]`;
  
  const enc = encodeURIComponent(text);
  window.open(`whatsapp://send?text=${enc}`, '_blank');
};

// Share WhatsApp full day report
export const handleWhatsAppReportShare = (report: any, history: SaleRecord[], customDate?: string) => {
  const today = customDate || new Date().toISOString().split('T')[0];
  const totalSalesCount = history.filter(s => s.date === today).reduce((sum, s) => sum + s.quantity, 0);
  
  let msg = `*📊 تقرير حركة المبيعات اليومي - ${getNetworkName()} 📊*\n`;
  msg += `*اليوم:* ${today}\n`;
  msg += `------------------------------------\n`;
  
  // Regular
  let hasReg = false;
  let regStr = `*💸 الكروت العادية:* \n`;
  INITIAL_PRICES[CalculatorType.REGULAR].forEach(p => {
    const stats = report[CalculatorType.REGULAR][p.id];
    if (stats && stats.quantity > 0) {
      regStr += `  ▫️ *فئة ${p.id}:* باع ${stats.quantity} | إجمالي ${stats.amount} ريال\n`;
      hasReg = true;
    }
  });
  if (hasReg) msg += regStr + `\n`;
  
  // Pro
  let hasPro = false;
  let proStr = `*⚡ كروت Pro:* \n`;
  INITIAL_PRICES[CalculatorType.PRO].forEach(p => {
    const stats = report[CalculatorType.PRO][p.id];
    if (stats && stats.quantity > 0) {
      proStr += `  ▫️ *فئة ${p.id}:* باع ${stats.quantity} | إجمالي ${stats.amount} ريال\n`;
      hasPro = true;
    }
  });
  if (hasPro) msg += proStr + `\n`;
  
  msg += `------------------------------------\n`;
  msg += `📦 *إجمالي الكروت المباعة:* ${totalSalesCount} كرت\n`;
  msg += `💵 *المبلغ المتسلم (كاش اليوم):* *${report.totalReceivedAmount || 0} ريال*\n`;
  msg += `📈 *المديونية المرتفعة (الآجل الجديد):* *${report.totalDebtIncreased || 0} ريال*\n`;
  
  if (report.shopsWhoBought && report.shopsWhoBought.length > 0) {
    msg += `🏪 *البقالات التي ابتاعت كروت:* \n`;
    report.shopsWhoBought.forEach((shopName: string) => {
      msg += `  ▫️ ${shopName}\n`;
    });
  }
  
  msg += `💰 *إجمالي قيمة مبيعات اليوم:* *${report.totalAmount} ريال يمني*\n`;
  msg += `------------------------------------\n`;
  msg += `📥 _تم استخراج ملف PDF مالي تفصيلي لحساب اليوم المجموع على جهازك!_`;

  downloadDailyReportPDF(report, history, today);
  
  const enc = encodeURIComponent(msg);
  window.open(`whatsapp://send?text=${enc}`, '_blank');
};

// Share SMS full day report
export const handleSMSReportShare = (report: any, history: SaleRecord[]) => {
  const today = new Date().toISOString().split('T')[0];
  const totalSalesCount = history.filter(s => s.date === today).reduce((sum, s) => sum + s.quantity, 0);
  
  let text = `كشف اليوم مبيعات ${getNetworkName()} ${today}\n`;
  text += `إجمالي المبيعات: ${report.totalAmount} ريال\n`;
  text += `حجم الكروت: ${totalSalesCount} كروت\n`;
  
  const enc = encodeURIComponent(text);
  window.open(`sms:?body=${enc}`, '_blank');
};

export const drawAllShopsSummaryOnCanvas = (shopsData: { name: string; balance: number }[]): HTMLCanvasElement | null => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const headerHeight = 180;
  const rowHeight = 35;
  const footerHeight = 120;
  const canvasWidth = 650;
  const canvasHeight = headerHeight + (shopsData.length * rowHeight) + footerHeight;

  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  // Fill background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Borders
  ctx.strokeStyle = '#0f172a'; // Slate 900
  ctx.lineWidth = 1.5;
  ctx.strokeRect(15, 15, canvasWidth - 30, canvasHeight - 30);

  ctx.strokeStyle = '#64748b'; // Slate 500
  ctx.lineWidth = 0.5;
  ctx.strokeRect(20, 20, canvasWidth - 40, canvasHeight - 40);

  // Set default direction and baseline
  ctx.textBaseline = 'middle';
  ctx.direction = 'rtl';

  // Title
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(getNetworkName(), canvasWidth / 2, 55);

  ctx.font = 'bold 12px sans-serif';
  ctx.fillStyle = '#334155';
  ctx.fillText('كشف الحساب الإجمالي وأرصدة البقالات والعملاء المعتمدين', canvasWidth / 2, 85);

  // Export Date
  ctx.font = '9px sans-serif';
  ctx.fillStyle = '#64748b';
  const nowStr = new Date().toLocaleString('ar-YE', { hour12: false });
  ctx.fillText(`تاريخ التصدير: ${nowStr} | المستند: كشف مالي موحد`, canvasWidth / 2, 105);

  // Title line separator
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(35, 120);
  ctx.lineTo(canvasWidth - 35, 120);
  ctx.stroke();

  // Draw Table Headers
  const tableY = 135;
  ctx.fillStyle = '#f1f5f9'; // Slate 100
  ctx.fillRect(35, tableY, canvasWidth - 70, 30);

  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1;
  ctx.strokeRect(35, tableY, canvasWidth - 70, 30);

  ctx.font = 'bold 10px sans-serif';
  ctx.fillStyle = '#0f172a';
  
  // Align right for RTL columns
  ctx.textAlign = 'right';
  ctx.fillText('م', canvasWidth - 65, tableY + 15);
  ctx.fillText('اسم البقالة / العميل', canvasWidth - 250, tableY + 15);
  ctx.fillText('الرصيد المتبقي (ريال يمني)', 160, tableY + 15);

  let currentY = tableY + 30;
  let totalSum = 0;

  shopsData.forEach((shop, index) => {
    totalSum += shop.balance;

    // Zebra row background
    if (index % 2 === 1) {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(35, currentY, canvasWidth - 70, rowHeight);
    }

    // Border line
    ctx.strokeStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(35, currentY + rowHeight);
    ctx.lineTo(canvasWidth - 35, currentY + rowHeight);
    ctx.stroke();

    // Draw index
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText(String(index + 1), canvasWidth - 65, currentY + rowHeight / 2);

    // Draw name
    ctx.font = 'bold 10px sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText(shop.name, canvasWidth - 250, currentY + rowHeight / 2);

    // Draw balance with colors
    ctx.font = 'bold 11px sans-serif';
    if (shop.balance >= 0) {
      ctx.fillStyle = '#16a34a'; // Green 600
    } else {
      ctx.fillStyle = '#dc2626'; // Red 600
    }
    const balanceText = `${shop.balance.toLocaleString('en-US')} ريال`;
    ctx.fillText(balanceText, 160, currentY + rowHeight / 2);

    currentY += rowHeight;
  });

  // Total Summary Row
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(35, currentY, canvasWidth - 70, 40);

  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(35, currentY, canvasWidth - 70, 40);

  ctx.font = 'bold 11px sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.fillText('إجمالي الأرصدة والمديونية المستحقة:', canvasWidth - 250, currentY + 20);

  if (totalSum >= 0) {
    ctx.fillStyle = '#16a34a';
  } else {
    ctx.fillStyle = '#dc2626';
  }
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText(`${totalSum.toLocaleString('en-US')} ريال يمني`, 160, currentY + 20);

  // Footer stamp note
  ctx.font = '8px sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.textAlign = 'center';
  ctx.fillText('تم استخراج هذا الكشف تلقائياً بموجب المطابقات المالية المحلية على الجهاز.', canvasWidth / 2, canvasHeight - 45);

  return canvas;
};

export const downloadAllShopsSummaryPDF = async (shopsData: { name: string; balance: number }[]) => {
  // 1. Filter: show only shops with non-zero balances (containing active debt/credit)
  const filteredShops = shopsData.filter(shop => shop.balance !== 0);

  // 2. Sort: descending by balance (highest debt first)
  filteredShops.sort((a, b) => b.balance - a.balance);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Load Amiri font dynamically for perfect Arabic text rendering in PDF
  try {
    const response = await fetch('https://cdn.jsdelivr.net/npm/@alif-type/amiri@0.1.1/amiri-regular.ttf');
    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      let binary = '';
      const bytes = new Uint8Array(arrayBuffer);
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const fontBase64 = window.btoa(binary);
      doc.addFileToVFS('Amiri-Regular.ttf', fontBase64);
      doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
      doc.setFont('Amiri');
    }
  } catch (err) {
    console.warn('Could not load Amiri font dynamically, falling back to standard font:', err);
  }

  const networkName = getNetworkName();
  const distributorName = getDistributorName();

  // Create table rows
  const tableBody = filteredShops.map((shop, i) => [
    String(i + 1),
    shop.name,
    `${shop.balance.toLocaleString('en-US')} ريال`
  ]);

  // Calculate sum of active balances
  const totalBalance = filteredShops.reduce((sum, s) => sum + s.balance, 0);
  
  // Add final summary row at the bottom
  tableBody.push([
    '',
    'إجمالي الأرصدة والمديونية المستحقة',
    `${totalBalance.toLocaleString('en-US')} ريال`
  ]);

  // Generate multi-page PDF dynamically via jspdf-autotable
  autoTable(doc, {
    startY: 45,
    head: [['م', 'اسم البقالة / العميل', 'الرصيد المتبقي (ريال يمني)']],
    body: tableBody,
    theme: 'striped',
    styles: {
      font: doc.getFont().fontName === 'Amiri' ? 'Amiri' : 'Helvetica',
      halign: 'right',
      fontSize: 10,
      cellPadding: 4,
      textColor: [15, 23, 42]
    },
    headStyles: {
      fillColor: [16, 185, 129], // Emerald 500 matching the premium layout
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'right'
    },
    columnStyles: {
      0: { cellWidth: 15, halign: 'center' },
      2: { halign: 'left', fontStyle: 'bold', textColor: [220, 38, 38] } // Red for debts
    },
    didParseCell: (data) => {
      if (data.row.index === tableBody.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [240, 253, 250]; // emerald-50
        if (data.column.index === 1) {
          data.cell.styles.textColor = [15, 23, 42];
        }
      }
    },
    margin: { top: 40, bottom: 20 },
    didDrawPage: (data) => {
      // Draw Header on each page
      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text(networkName, 105, 15, { align: 'center' });

      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85); // slate-700
      doc.text('كشف الحساب الإجمالي وأرصدة البقالات والعملاء المعتمدين', 105, 22, { align: 'center' });

      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139); // slate-500
      const nowStr = new Date().toLocaleString('ar-YE', { hour12: false });
      doc.text(`تاريخ التصدير: ${nowStr}  |  الموزع: ${distributorName}`, 105, 28, { align: 'center' });

      // Header divider line
      doc.setDrawColor(203, 213, 225); // slate-300
      doc.setLineWidth(0.5);
      doc.line(15, 33, 195, 33);

      // Draw footer on each page
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // slate-400
      const pageStr = `صفحة ${data.pageNumber}  |  الدحشة لخدمات الدفع الإلكتروني والشبكات`;
      doc.text(pageStr, 105, 287, { align: 'center' });
    }
  });

  const now = new Date();
  const statementFileName = `كشف_أرصدة_البقالات_${now.getMonth() + 1}_${now.getDate()}.pdf`;
  doc.save(statementFileName);

  // Auto-save to native downloads if possible
  try {
    const pdfDataUri = doc.output('datauristring');
    saveFileToKrotFolder(statementFileName, pdfDataUri, true, true);
  } catch (err) {
    console.log('Native file saving skipped or not available:', err);
  }

  return { success: true, native: false, fileName: statementFileName };
};

export const downloadPeriodReportPDF = async (params: {
  reportType: 'weekly' | 'monthly';
  startDate: string;
  endDate: string;
  distributorName: string;
  networkName: string;
  cardSales: { label: string; quantity: number; total: number }[];
  groceriesPerformance: { name: string; isPro: boolean; q100: number; q200: number; q250: number; q300: number; q500: number; total: number }[];
  newGroceries: string[];
  inactiveGroceries: string[];
  financials: { totalSales: number; totalCollected: number; totalDebt: number };
}) => {
  const {
    reportType,
    startDate,
    endDate,
    distributorName,
    networkName,
    cardSales,
    groceriesPerformance,
    newGroceries,
    inactiveGroceries,
    financials
  } = params;

  // 1. Try Native capacitor plugin
  try {
    const result = await LocalContacts.generatePdfReport({
      reportType,
      startDate,
      endDate,
      distributorName,
      networkName,
      cardSales,
      groceriesPerformance,
      newGroceries,
      inactiveGroceries,
      financials
    });
    if (result && result.success) {
      return { success: true, native: true, fileName: result.fileName };
    }
  } catch (err) {
    console.log('Native PDF report failed or unavailable, falling back to multi-page Canvas/jsPDF:', err);
  }

  // 2. HTML5 Canvas & Multi-page jsPDF Fallback (Web view)
  const createPageCanvas = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 1130;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 800, 1130);
      
      // Outer border (Slate 900)
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 4;
      ctx.strokeRect(25, 25, 750, 1080);
      
      // Inner subtle border
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(32, 32, 736, 1066);
    }
    return { canvas, ctx };
  };

  // --- Page 1: Card Sales Summary ---
  const page1 = createPageCanvas();
  if (page1.ctx) {
    const ctx = page1.ctx;
    ctx.textBaseline = 'middle';
    
    // Title
    ctx.font = 'bold 22px Arial, sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'center';
    const titleText = `تقرير مبيعات الكروت الموحد - ${reportType === 'weekly' ? 'أسبوعي' : 'شهري'}`;
    ctx.fillText(titleText, 400, 75);
    
    // Subtitles
    ctx.font = 'bold 12px Arial, sans-serif';
    ctx.fillStyle = '#334155';
    ctx.fillText(`الموزع المعتمد: ${distributorName}  |  اسم الشبكة: ${networkName}`, 400, 105);
    
    ctx.font = '10px Arial, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText(`الفترة الزمنية: من ${startDate} إلى ${endDate}  |  تاريخ الإصدار: ${new Date().toLocaleString('ar-YE')}`, 400, 125);
    
    // Separator Line
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(45, 145);
    ctx.lineTo(755, 145);
    ctx.stroke();
    
    // Table Header
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(45, 165, 710, 40);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.strokeRect(45, 165, 710, 40);
    
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 12px Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText("فئة الكرت الكلية", 730, 185);
    ctx.textAlign = 'center';
    ctx.fillText("الكمية المباعة (كرت)", 400, 185);
    ctx.textAlign = 'left';
    ctx.fillText("إجمالي المبيعات (ريال)", 70, 185);
    
    // Rows
    let currentY = 205;
    let rowHeight = 36;
    let totalQty = 0;
    let totalRev = 0;
    
    cardSales.forEach((item, idx) => {
      totalQty += item.quantity;
      totalRev += item.total;
      
      if (idx % 2 === 1) {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(45, currentY, 710, rowHeight);
      }
      
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(45, currentY + rowHeight);
      ctx.lineTo(755, currentY + rowHeight);
      ctx.stroke();
      
      ctx.fillStyle = '#0f172a';
      ctx.font = '12px Arial, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(item.label, 730, currentY + rowHeight / 2);
      
      ctx.textAlign = 'center';
      ctx.fillText(String(item.quantity), 400, currentY + rowHeight / 2);
      
      ctx.textAlign = 'left';
      ctx.font = 'bold 12px Arial, sans-serif';
      ctx.fillText(`${item.total.toLocaleString('ar-YE')} ريال`, 70, currentY + rowHeight / 2);
      
      currentY += rowHeight;
    });
    
    // Totals Row
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(45, currentY, 710, 45);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.strokeRect(45, currentY, 710, 45);
    
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 13px Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText("الإجـمـالـي العـام لكروت الفترة:", 730, currentY + 22.5);
    
    ctx.textAlign = 'center';
    ctx.fillText(String(totalQty), 400, currentY + 22.5);
    
    ctx.textAlign = 'left';
    ctx.fillText(`${totalRev.toLocaleString('ar-YE')} ريال`, 70, currentY + 22.5);
    
    // Page Number
    ctx.textAlign = 'center';
    ctx.font = '10px Arial, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText("صفحة 1 من 3", 400, 1085);
  }

  // --- Page 2: Detailed Grocery Performance Table ---
  const page2 = createPageCanvas();
  if (page2.ctx) {
    const ctx = page2.ctx;
    ctx.textBaseline = 'middle';
    
    // Title
    ctx.font = 'bold 20px Arial, sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'center';
    ctx.fillText("جدول أداء البقالات والعملاء التفصيلي", 400, 75);
    
    // Subtitle
    ctx.font = '10px Arial, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText(`الفترة الزمنية: من ${startDate} إلى ${endDate}  |  مرتبة تنازلياً حسب قيمة مسحوبات الفترة الكلية`, 400, 105);
    
    // Separator Line
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(45, 120);
    ctx.lineTo(755, 120);
    ctx.stroke();
    
    // Table Header
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(45, 135, 710, 35);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.strokeRect(45, 135, 710, 35);
    
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 11px Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText("اسم البقالة / العميل", 730, 152.5);
    
    ctx.textAlign = 'center';
    ctx.fillText("100", 500, 152.5);
    ctx.fillText("200", 435, 152.5);
    ctx.fillText("250", 370, 152.5);
    ctx.fillText("300", 305, 152.5);
    ctx.fillText("500", 240, 152.5);
    
    ctx.textAlign = 'left';
    ctx.fillText("المبلغ الإجمالي", 70, 152.5);
    
    let currentY = 170;
    let rowHeight = 30;
    
    let sum100 = 0, sum200 = 0, sum250 = 0, sum300 = 0, sum500 = 0, sumTotal = 0;
    
    groceriesPerformance.forEach((item, idx) => {
      if (currentY > 980) return; // Prevent overflows
      
      sum100 += item.q100 || 0;
      sum200 += item.q200 || 0;
      sum250 += item.q250 || 0;
      sum300 += item.q300 || 0;
      sum500 += item.q500 || 0;
      sumTotal += item.total || 0;
      
      if (idx % 2 === 1) {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(45, currentY, 710, rowHeight);
      }
      
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(45, currentY + rowHeight);
      ctx.lineTo(755, currentY + rowHeight);
      ctx.stroke();
      
      ctx.fillStyle = '#0f172a';
      ctx.font = item.isPro ? 'bold 11px Arial, sans-serif' : '11px Arial, sans-serif';
      ctx.textAlign = 'right';
      const displayName = item.isPro ? `⭐ ${item.name} [PRO]` : item.name;
      ctx.fillText(displayName, 730, currentY + rowHeight / 2);
      
      ctx.font = '11px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(item.q100 > 0 ? String(item.q100) : "-", 500, currentY + rowHeight / 2);
      ctx.fillText(item.q200 > 0 ? String(item.q200) : "-", 435, currentY + rowHeight / 2);
      ctx.fillText(item.q250 > 0 ? String(item.q250) : "-", 370, currentY + rowHeight / 2);
      ctx.fillText(item.q300 > 0 ? String(item.q300) : "-", 305, currentY + rowHeight / 2);
      ctx.fillText(item.q500 > 0 ? String(item.q500) : "-", 240, currentY + rowHeight / 2);
      
      ctx.textAlign = 'left';
      ctx.font = 'bold 11px Arial, sans-serif';
      ctx.fillText(`${item.total.toLocaleString('ar-YE')} ريال`, 70, currentY + rowHeight / 2);
      
      currentY += rowHeight;
    });
    
    // Totals Row
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(45, currentY, 710, 35);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.strokeRect(45, currentY, 710, 35);
    
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 11px Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText("إجمالي المسحوبات للبقالات:", 730, currentY + 17.5);
    
    ctx.textAlign = 'center';
    ctx.fillText(String(sum100), 500, currentY + 17.5);
    ctx.fillText(String(sum200), 435, currentY + 17.5);
    ctx.fillText(String(sum250), 370, currentY + 17.5);
    ctx.fillText(String(sum300), 305, currentY + 17.5);
    ctx.fillText(String(sum500), 240, currentY + 17.5);
    
    ctx.textAlign = 'left';
    ctx.fillText(`${sumTotal.toLocaleString('ar-YE')} ريال`, 70, currentY + 17.5);
    
    // Page Number
    ctx.textAlign = 'center';
    ctx.font = '10px Arial, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText("صفحة 2 من 3", 400, 1085);
  }

  // --- Page 3: Insights & Financial Metrics Dashboard ---
  const page3 = createPageCanvas();
  if (page3.ctx) {
    const ctx = page3.ctx;
    ctx.textBaseline = 'middle';
    
    // Title
    ctx.font = 'bold 20px Arial, sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'center';
    ctx.fillText("لوحة المؤشرات والتحليلات والمالية الموحدة", 400, 75);
    
    // Subtitle
    ctx.font = '10px Arial, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText(`النطاق الزمني: من ${startDate} إلى ${endDate}  |  المؤشرات والركود والأداء العام للفترة`, 400, 105);
    
    // Separator Line
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(45, 120);
    ctx.lineTo(755, 120);
    ctx.stroke();
    
    // Card 1: New Groceries Box
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(45, 140, 710, 145);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.strokeRect(45, 140, 710, 145);
    
    ctx.fillStyle = '#2563eb';
    ctx.font = 'bold 12px Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText("✨ البقالات والعملاء المشتركون حديثاً في الفترة (العملاء الجدد):", 730, 165);
    
    ctx.fillStyle = '#334155';
    ctx.font = '11px Arial, sans-serif';
    let itemY = 195;
    if (newGroceries.length === 0) {
      ctx.fillText("لم يتم رصد أو تسجيل أي بقالات جديدة في هذا النطاق الزمني.", 730, itemY);
    } else {
      newGroceries.forEach((name, i) => {
        if (i < 4) {
          ctx.fillText(`• ${name} (تم تأسيس الحساب وبدء النشاط والفوترة بنجاح)`, 730, itemY);
          itemY += 24;
        }
      });
    }
    
    // Card 2: Inactive Groceries Box
    ctx.fillStyle = '#fef2f2';
    ctx.fillRect(45, 305, 710, 155);
    ctx.strokeStyle = '#fca5a5';
    ctx.lineWidth = 1;
    ctx.strokeRect(45, 305, 710, 155);
    
    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 12px Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText("⚠️ تنبيهات الركود والتحصيل (بقالات خاملة بدون سحب أو سداد منذ 5 أيام أو أكثر):", 730, 330);
    
    ctx.fillStyle = '#334155';
    ctx.font = '11px Arial, sans-serif';
    let itemY2 = 360;
    if (inactiveGroceries.length === 0) {
      ctx.fillStyle = '#16a34a';
      ctx.fillText("رائع! لا يوجد أي ركود، كل البقالات والعملاء لديهم عمليات مستمرة.", 730, itemY2);
    } else {
      inactiveGroceries.forEach((info, i) => {
        if (i < 4) {
          ctx.fillText(`• ${info}`, 730, itemY2);
          itemY2 += 22;
        }
      });
    }
    
    // Card 3: Financial Summary Box
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(45, 480, 710, 520);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(45, 480, 710, 520);
    
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 13px Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText("📊 الملخص المالي والتحليلي العام للفترة المحددة:", 730, 510);
    
    // Total Sales Sub-Card
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(70, 545, 660, 110);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(70, 545, 660, 110);
    ctx.fillStyle = '#334155';
    ctx.font = 'bold 12px Arial, sans-serif';
    ctx.fillText("إجمالي قيمة المبيعات خلال الفترة المحددة (ريال يمني)", 710, 580);
    ctx.fillStyle = '#2563eb';
    ctx.font = 'bold 22px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${financials.totalSales.toLocaleString('ar-YE')} ريال`, 100, 615);
    
    // Total Collected Sub-Card
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(70, 675, 660, 110);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(70, 675, 660, 110);
    ctx.fillStyle = '#334155';
    ctx.font = 'bold 12px Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText("إجمالي المبالغ المحصلة والمقبوضة (كاش فوري + دفعات سداد المديونية)", 710, 710);
    ctx.fillStyle = '#16a34a';
    ctx.font = 'bold 22px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${financials.totalCollected.toLocaleString('ar-YE')} ريال`, 100, 745);
    
    // Total Debt Sub-Card
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(70, 805, 660, 110);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(70, 805, 660, 110);
    ctx.fillStyle = '#334155';
    ctx.font = 'bold 12px Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText("صافي المديونية الجديدة المتراكمة للفترة المحددة", 710, 840);
    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 22px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${financials.totalDebt.toLocaleString('ar-YE')} ريال`, 100, 875);
    
    // Page Number
    ctx.textAlign = 'center';
    ctx.font = '10px Arial, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText("صفحة 3 من 3", 400, 1085);
  }

  // Draw into jsPDF Document
  const pdf = new jsPDF('p', 'mm', 'a4');
  
  // Page 1
  const imgData1 = page1.canvas.toDataURL('image/jpeg', 1.0);
  pdf.addImage(imgData1, 'JPEG', 0, 0, 210, 297);
  
  // Page 2
  pdf.addPage();
  const imgData2 = page2.canvas.toDataURL('image/jpeg', 1.0);
  pdf.addImage(imgData2, 'JPEG', 0, 0, 210, 297);
  
  // Page 3
  pdf.addPage();
  const imgData3 = page3.canvas.toDataURL('image/jpeg', 1.0);
  pdf.addImage(imgData3, 'JPEG', 0, 0, 210, 297);
  
  const reportFileName = `تقرير_حسابي_${reportType === 'weekly' ? 'أسبوعي' : 'شهري'}_${Date.now()}.pdf`;
  pdf.save(reportFileName);
  
  return { success: true, native: false, fileName: reportFileName };
};

export const generateRegionalReport = async (data: Array<{ name: string; debt: number; region: string }>) => {
  // 1. Group by region and sort descending by debt within each region
  const regionsMap: Record<string, typeof data> = {};
  data.forEach(item => {
    const reg = (item.region || 'غير محددة').trim();
    if (!regionsMap[reg]) {
      regionsMap[reg] = [];
    }
    regionsMap[reg].push(item);
  });

  // Sort each region descending by debt
  Object.keys(regionsMap).forEach(reg => {
    regionsMap[reg].sort((a, b) => b.debt - a.debt);
  });

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Try to load a beautiful Arabic font dynamically for pristine native PDF text rendering
  try {
    const response = await fetch('https://cdn.jsdelivr.net/npm/@alif-type/amiri@0.1.1/amiri-regular.ttf');
    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      // Base64 conversion
      let binary = '';
      const bytes = new Uint8Array(arrayBuffer);
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const fontBase64 = window.btoa(binary);
      doc.addFileToVFS('Amiri-Regular.ttf', fontBase64);
      doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
      doc.setFont('Amiri');
    }
  } catch (err) {
    console.warn('Could not load Amiri font dynamically, falling back to standard font mapping:', err);
  }

  const regions = Object.keys(regionsMap);
  regions.forEach((region, index) => {
    if (index > 0) {
      doc.addPage();
    }

    const regionData = regionsMap[region];
    const networkName = getNetworkName();
    const distributorName = getDistributorName();

    // 1. Title & Header Info for each Region Page
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42); // slate-900
    const titleText = `تقرير ديون البقالات - ${region}`;
    doc.text(titleText, 105, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`الشبكة: ${networkName}  |  الموزع: ${distributorName}`, 105, 28, { align: 'center' });
    doc.text(`تاريخ التصدير: ${new Date().toLocaleDateString('ar-YE')}`, 105, 34, { align: 'center' });

    // Header divider line
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setLineWidth(0.5);
    doc.line(15, 40, 195, 40);

    // 2. Generate striped table for the region using jspdf-autotable
    const tableBody = regionData.map((shop, i) => [
      String(i + 1),
      shop.name,
      `${shop.debt.toLocaleString('en-US')} ريال`
    ]);

    // Calculate sum of debts for the current region
    const totalRegionDebt = regionData.reduce((sum, s) => sum + s.debt, 0);

    // Add general total row at the end
    tableBody.push([
      '',
      'إجمالي مديونية المنطقة',
      `${totalRegionDebt.toLocaleString('en-US')} ريال`
    ]);

    autoTable(doc, {
      startY: 45,
      head: [['م', 'اسم البقالة / العميل', 'المديونية المستحقة']],
      body: tableBody,
      theme: 'striped',
      styles: {
        font: doc.getFont().fontName === 'Amiri' ? 'Amiri' : 'Helvetica',
        halign: 'right',
        fontSize: 10,
        cellPadding: 4,
        textColor: [15, 23, 42]
      },
      headStyles: {
        fillColor: [15, 23, 42], // deep slate header matching premium theme
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'right'
      },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        2: { halign: 'left', fontStyle: 'bold', textColor: [220, 38, 38] } // Red for debts
      },
      didParseCell: (data) => {
        // Style the total summary row differently
        if (data.row.index === tableBody.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [241, 245, 249]; // slate-100
          if (data.column.index === 1) {
            data.cell.styles.textColor = [15, 23, 42];
          }
        }
      }
    });

    // Page footer with watermark and page number
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(`صفحة ${index + 1} من ${regions.length}  |  الدحشة لخدمات الدفع الإلكتروني والشبكات`, 105, 285, { align: 'center' });
  });

  const fileName = `تقرير_المناطق_الموزعة_${Date.now()}.pdf`;
  doc.save(fileName);

  // Also auto-save to device folder on mobile
  try {
    const pdfDataUri = doc.output('datauristring');
    saveFileToKrotFolder(fileName, pdfDataUri, true, true);
  } catch (err) {
    console.log('Native file saving skipped or not available:', err);
  }

  return { success: true, fileName };
};
