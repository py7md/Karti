import ExcelJS from 'exceljs';
import { ShopAccount, SaleRecord } from '../types';
import { getNetworkName, getDistributorName, getDistributorPhone } from './invoiceHelpers';

// Helper to auto-fit columns
const autoFitColumns = (worksheet: ExcelJS.Worksheet) => {
  worksheet.columns.forEach(column => {
    let maxLen = 0;
    column.eachCell({ includeEmpty: true }, cell => {
      if (cell.value) {
        const valStr = cell.value.toString();
        // Arabic characters take more space, so let's multiply length appropriately
        const len = valStr.split('').reduce((acc, char) => {
          return acc + (char.charCodeAt(0) > 128 ? 1.8 : 1);
        }, 0);
        if (len > maxLen) maxLen = len;
      }
    });
    column.width = Math.max(maxLen + 4, 12);
  });
};

/**
 * 1. الكشف المالي الموحد
 * يحتوي على البقالات مرتبة تنازلياً من الأكثر مديونية إلى الأقل مديونية، مع إجمالي المديونيات بالأسفل.
 */
export const downloadFinancialStatementExcel = async (shops: ShopAccount[]) => {
  // Filter and map shops data
  const shopsData = shops.map(s => {
    const totalSales = s.transactions.filter(t => t.type === 'sale').reduce((sum, t) => sum + t.amount, 0);
    const totalPayments = s.transactions.filter(t => t.type === 'payment').reduce((sum, t) => sum + t.amount, 0);
    return {
      name: s.name,
      balance: totalSales - totalPayments
    };
  });

  // Sort descending by outstanding balance (highest debt first)
  shopsData.sort((a, b) => b.balance - a.balance);

  // Create workbook and worksheet
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('الكشف المالي', {
    views: [{ rightToLeft: true }]
  });

  // Network Title Block
  worksheet.mergeCells('A1:D1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = getNetworkName();
  titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E3A8A' } // Dark Blue
  };
  worksheet.getRow(1).height = 40;

  // Report Type Subtitle
  worksheet.mergeCells('A2:D2');
  const subtitleCell = worksheet.getCell('A2');
  subtitleCell.value = `كشف الحساب المالي الإجمالي للبقالات والعملاء المعتمدين - تاريخ: ${new Date().toLocaleDateString('ar-YE')}`;
  subtitleCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF374151' } };
  subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  subtitleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF3F4F6' } // Light Gray
  };
  worksheet.getRow(2).height = 25;

  // Distributor Info
  worksheet.mergeCells('A3:D3');
  const infoCell = worksheet.getCell('A3');
  infoCell.value = `الموزع المسؤول: ${getDistributorName()} | هاتف: ${getDistributorPhone()}`;
  infoCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF4B5563' } };
  infoCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(3).height = 20;

  // Blank Row
  worksheet.addRow([]);

  // Table Headers
  const headers = ['م', 'اسم البقالة / التموينات', 'إجمالي المديونية المتبقية (ريال)', 'حالة الحساب'];
  const headerRow = worksheet.addRow(headers);
  headerRow.height = 28;
  headerRow.eachCell((cell, colNumber) => {
    cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0D9488' } // Teal Header
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF0F766E' } },
      bottom: { style: 'medium', color: { argb: 'FF0F766E' } },
      left: { style: 'thin', color: { argb: 'FF0F766E' } },
      right: { style: 'thin', color: { argb: 'FF0F766E' } }
    };
  });

  // Add Data Rows
  let runningTotalDebt = 0;
  shopsData.forEach((shop, idx) => {
    runningTotalDebt += shop.balance;
    const statusText = shop.balance > 0 ? 'مدين مستحق عليه' : shop.balance < 0 ? 'دائن (له رصيد)' : 'خالص ومسدد';
    const rowData = [idx + 1, shop.name, shop.balance, statusText];
    const row = worksheet.addRow(rowData);
    row.height = 24;

    // Number format for balance
    const balanceCell = row.getCell(3);
    balanceCell.numFmt = '#,##0" ريال"';

    // Highlight debtor rows differently
    const statusCell = row.getCell(4);
    if (shop.balance > 0) {
      statusCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFEE2E2' } // Light Red
      };
      statusCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF991B1B' } };
    } else if (shop.balance < 0) {
      statusCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0F2FE' } // Light Blue
      };
      statusCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF075985' } };
    } else {
      statusCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'D1FAE5' } // Light Green
      };
      statusCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: '065F46' } };
    }

    // Zebra striping for columns 1, 2, 3
    if (idx % 2 === 1) {
      for (let i = 1; i <= 3; i++) {
        row.getCell(i).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF9FAFB' }
        };
      }
    }

    // Alignments & Borders
    row.eachCell((cell, colNumber) => {
      if (colNumber === 2) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
      };
    });
  });

  // Totals Row
  const totalRow = worksheet.addRow(['', 'إجمالي جميع المديونيات المستحقة', runningTotalDebt, '']);
  totalRow.height = 30;
  totalRow.getCell(2).font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF111827' } };
  totalRow.getCell(3).font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF991B1B' } }; // Red Bold
  totalRow.getCell(3).numFmt = '#,##0" ريال"';

  totalRow.eachCell((cell, colNumber) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF1F5F9' } // Slate total row
    };
    cell.alignment = { horizontal: colNumber === 2 ? 'right' : 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF334155' } },
      bottom: { style: 'double', color: { argb: 'FF334155' } },
      left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
    };
  });

  autoFitColumns(worksheet);

  // Generate Excel file download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `الكشف_المالي_الموحد_${new Date().getMonth() + 1}_${new Date().getDate()}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
};

/**
 * 2. التقرير الدوري (شهري، أسبوعي، اختياري) بصيغة الاكسل
 * يحتوي على الكروت المبيعة لكل فئة، إجمالي المبيعات، الواصل، والمتبقي لكل بقالة، مع المجاميع بالأسفل.
 */
export const downloadPeriodReportExcel = async (params: {
  startDate: string;
  endDate: string;
  salesHistory: SaleRecord[];
  shops: ShopAccount[];
  reportType: 'weekly' | 'monthly' | 'custom';
}) => {
  const { startDate, endDate, salesHistory, shops, reportType } = params;

  // Filter sales history for the specified period
  const periodSales = salesHistory.filter(s => s.date >= startDate && s.date <= endDate);

  // Calculate performance per shop
  const performanceData = shops.map(shop => {
    // Sales of cards in period for this shop
    const shopSales = periodSales.filter(s => s.shopName && s.shopName.toLowerCase() === shop.name.toLowerCase());
    
    const q100 = shopSales.filter(s => Number(s.category) === 100).reduce((sum, s) => sum + s.quantity, 0);
    const q200 = shopSales.filter(s => Number(s.category) === 200).reduce((sum, s) => sum + s.quantity, 0);
    const q250 = shopSales.filter(s => Number(s.category) === 250).reduce((sum, s) => sum + s.quantity, 0);
    const q300 = shopSales.filter(s => Number(s.category) === 300).reduce((sum, s) => sum + s.quantity, 0);
    const q500 = shopSales.filter(s => Number(s.category) === 500).reduce((sum, s) => sum + s.quantity, 0);
    
    // Total value of cards taken in period
    const totalSalesAmount = shopSales.reduce((sum, s) => sum + s.total, 0);

    // Payments received in period for this shop
    const shopTransactions = (shop.transactions || []).filter(t => t.date >= startDate && t.date <= endDate);
    const totalPaymentsAmount = shopTransactions
      .filter(t => t.type === 'payment')
      .reduce((sum, t) => sum + t.amount, 0);

    const netPeriodDebt = totalSalesAmount - totalPaymentsAmount;

    return {
      name: shop.name,
      q100,
      q200,
      q250,
      q300,
      q500,
      totalSalesAmount,
      totalPaymentsAmount,
      netPeriodDebt
    };
  });

  // Filter out shops with absolutely no activity during this period to keep the report crisp, 
  // but if all are empty, keep them.
  let filteredPerformance = performanceData.filter(item => 
    item.q100 > 0 || item.q200 > 0 || item.q250 > 0 || item.q300 > 0 || item.q500 > 0 ||
    item.totalSalesAmount > 0 || item.totalPaymentsAmount > 0
  );

  if (filteredPerformance.length === 0) {
    filteredPerformance = performanceData;
  }

  // Sort descending by netPeriodDebt (highest remaining debt at the top)
  filteredPerformance.sort((a, b) => b.netPeriodDebt - a.netPeriodDebt);

  // Setup Workbook
  const workbook = new ExcelJS.Workbook();
  const reportTypeName = reportType === 'weekly' ? 'التقرير الأسبوعي' : reportType === 'monthly' ? 'التقرير الشهري' : 'التقرير الاختياري للفترة';
  const worksheet = workbook.addWorksheet(reportTypeName, {
    views: [{ rightToLeft: true }]
  });

  // Title Block
  worksheet.mergeCells('A1:I1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = getNetworkName();
  titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E1B4B' } // Deep Indigo
  };
  worksheet.getRow(1).height = 42;

  // Period / Subtitle Block
  worksheet.mergeCells('A2:I2');
  const subtitleCell = worksheet.getCell('A2');
  subtitleCell.value = `${reportTypeName} - من تاريخ ${startDate} إلى تاريخ ${endDate}`;
  subtitleCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF1F2937' } };
  subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  subtitleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE5E7EB' }
  };
  worksheet.getRow(2).height = 26;

  // Distributor Block
  worksheet.mergeCells('A3:I3');
  const infoCell = worksheet.getCell('A3');
  infoCell.value = `وكيل التوزيع: ${getDistributorName()} | هاتف: ${getDistributorPhone()}`;
  infoCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF4B5563' } };
  infoCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(3).height = 20;

  worksheet.addRow([]); // Space

  // Headers
  const columnsHeaders = [
    'اسم التموينات / البقالة',
    'كروت فئة 100',
    'كروت فئة 200',
    'كروت فئة 250',
    'كروت فئة 300',
    'كروت فئة 500',
    'إجمالي قيمة المسحوبات (ريال)',
    'إجمالي الواصل والمسدد (ريال)',
    'صافي الدين المتبقي للفترة (ريال)'
  ];

  const headerRow = worksheet.addRow(columnsHeaders);
  headerRow.height = 30;
  headerRow.eachCell((cell, colIdx) => {
    cell.font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    
    // Distinguish card columns vs financial columns using color codes
    let bgColor = 'FF4F46E5'; // Indigo for card counts
    if (colIdx === 1) {
      bgColor = 'FF1E293B'; // Dark Slate for Shop Name
    } else if (colIdx >= 7) {
      bgColor = 'FF0891B2'; // Deep Cyan for Totals
    }

    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: bgColor }
    };

    cell.border = {
      top: { style: 'thin', color: { argb: 'FF334155' } },
      bottom: { style: 'medium', color: { argb: 'FF1E293B' } },
      left: { style: 'thin', color: { argb: 'FF475569' } },
      right: { style: 'thin', color: { argb: 'FF475569' } }
    };
  });

  // Totals accumulators
  let grandQty100 = 0;
  let grandQty200 = 0;
  let grandQty250 = 0;
  let grandQty300 = 0;
  let grandQty500 = 0;
  let grandSalesVal = 0;
  let grandPaidVal = 0;
  let grandNetDebtVal = 0;

  // Populate data
  filteredPerformance.forEach((shop, idx) => {
    grandQty100 += shop.q100;
    grandQty200 += shop.q200;
    grandQty250 += shop.q250;
    grandQty300 += shop.q300;
    grandQty500 += shop.q500;
    grandSalesVal += shop.totalSalesAmount;
    grandPaidVal += shop.totalPaymentsAmount;
    grandNetDebtVal += shop.netPeriodDebt;

    const rowData = [
      shop.name,
      shop.q100 === 0 ? '-' : shop.q100,
      shop.q200 === 0 ? '-' : shop.q200,
      shop.q250 === 0 ? '-' : shop.q250,
      shop.q300 === 0 ? '-' : shop.q300,
      shop.q500 === 0 ? '-' : shop.q500,
      shop.totalSalesAmount,
      shop.totalPaymentsAmount,
      shop.netPeriodDebt
    ];

    const row = worksheet.addRow(rowData);
    row.height = 24;

    // Number formats
    row.getCell(7).numFmt = '#,##0" ريال"';
    row.getCell(8).numFmt = '#,##0" ريال"';
    row.getCell(9).numFmt = '#,##0" ريال"';

    // Highlight final net debt column
    const netDebtCell = row.getCell(9);
    if (shop.netPeriodDebt > 0) {
      netDebtCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF991B1B' } };
      netDebtCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
    } else if (shop.netPeriodDebt < 0) {
      netDebtCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF075985' } };
      netDebtCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2FE' } };
    } else {
      netDebtCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: '065F46' } };
      netDebtCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D1FAE5' } };
    }

    // Zebra pattern for left cells
    if (idx % 2 === 1) {
      for (let i = 1; i <= 8; i++) {
        const cell = row.getCell(i);
        if (i !== 9) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF9FAFB' }
          };
        }
      }
    }

    // Alignment and styling
    row.eachCell((cell, colIdx) => {
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
      };
      if (colIdx === 1) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
    });
  });

  // Grand Totals Row
  const totalsRowData = [
    'الإجمالي العام للفترة ككل',
    grandQty100,
    grandQty200,
    grandQty250,
    grandQty300,
    grandQty500,
    grandSalesVal,
    grandPaidVal,
    grandNetDebtVal
  ];

  const totalRow = worksheet.addRow(totalsRowData);
  totalRow.height = 32;

  // Format Total values
  totalRow.getCell(7).numFmt = '#,##0" ريال"';
  totalRow.getCell(8).numFmt = '#,##0" ريال"';
  totalRow.getCell(9).numFmt = '#,##0" ريال"';

  totalRow.eachCell((cell, colIdx) => {
    cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: colIdx === 9 ? 'FF991B1B' : 'FF1E293B' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF1F5F9' }
    };
    cell.alignment = { horizontal: colIdx === 1 ? 'right' : 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF334155' } },
      bottom: { style: 'double', color: { argb: 'FF1E293B' } },
      left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
    };
  });

  autoFitColumns(worksheet);

  // Generate Excel file download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  
  const formattedType = reportType === 'weekly' ? 'الأسبوعي' : reportType === 'monthly' ? 'الشهري' : 'الاختياري';
  anchor.download = `التقرير_${formattedType}_للفترة_${startDate}_إلى_${endDate}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
};
