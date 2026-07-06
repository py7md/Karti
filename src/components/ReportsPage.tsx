import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { 
  BarChart3, 
  TrendingUp, 
  CalendarDays, 
  Download, 
  Share2, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  Calculator, 
  Zap, 
  ArrowRightLeft,
  MessageCircle,
  MapPin
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend, 
  LineChart, 
  Line 
} from 'recharts';
import { CalculatorType, SaleRecord, ShopAccount, CardCategory } from '../types';
import { INITIAL_PRICES } from '../constants';
import { 
  downloadDetailedDailyReportPDF, 
  handleWhatsAppReportShare,
  downloadPeriodReportPDF,
  getDistributorName,
  getNetworkName,
  generateRegionalReport
} from '../utils/invoiceHelpers';
import { downloadPeriodReportExcel } from '../utils/excelHelpers';

interface ReportsPageProps {
  salesHistory: SaleRecord[];
  shops: ShopAccount[];
  reportDate: string;
  setReportDate: React.Dispatch<React.SetStateAction<string>>;
  isDark: boolean;
  balanceLimit: number;
  handleLimitChange: (val: number) => void;
  showToast: (m: string, t?: 'success' | 'error' | 'info') => void;
  prices: Record<CalculatorType, CardCategory[]>;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({
  salesHistory,
  shops,
  reportDate,
  setReportDate,
  isDark,
  balanceLimit,
  handleLimitChange,
  showToast,
  prices
}) => {
  const [trendView, setTrendView] = useState<'weekly' | 'monthly'>('weekly');
  const [chartLimit, setChartLimit] = useState<number>(10);
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [shopRegions, setShopRegions] = useState<Record<string, string>>(() => {
    try {
      const stored = localStorage.getItem('dahshah_shop_regions');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const updateShopRegion = (shopId: string, region: string) => {
    const updated = { ...shopRegions, [shopId]: region };
    setShopRegions(updated);
    localStorage.setItem('dahshah_shop_regions', JSON.stringify(updated));
    showToast('تم تحديث منطقة البقالة بنجاح', 'success');
  };

  const handleShareDebtDistributionToWhatsApp = () => {
    const activeDebtors = shops.filter(s => s.currentBalance > 0);
    const totalDebt = activeDebtors.reduce((sum, s) => sum + s.currentBalance, 0);
    const totalDebtorsCount = activeDebtors.length;
    
    const top5 = [...activeDebtors]
      .sort((a, b) => b.currentBalance - a.currentBalance)
      .slice(0, 5);

    if (activeDebtors.length === 0) {
      showToast('لا توجد بقالات قائمة بمديونية حالياً لمشاركتها.', 'info');
      return;
    }

    let msg = `*📊 تقرير إحصائي لتوزيع مديونيات البقالات 📊*\n\n`;
    msg += `📌 *إجمالي المديونية القائمة:* *${totalDebt.toLocaleString('ar-YE')} ريال*\n`;
    msg += `👥 *عدد العملاء المدينين الكلي:* *${totalDebtorsCount} بقالة/عميل*\n`;
    msg += `ــــــــــــــــــــــــــــــــــــــــــــــــ\n\n`;
    msg += `🏆 *أعلى 5 عملاء ذوي مديونية حالية (المدينون الأوائل):*\n\n`;
    
    top5.forEach((shop, index) => {
      const med = shop.currentBalance.toLocaleString('ar-YE');
      const ph = shop.phone ? ` (هاتف: 967${shop.phone.trim()})` : '';
      msg += ` *${index + 1}. ${shop.name}* \n 👈 الرصيد المستحق: *${med} ريال* ${ph}\n\n`;
    });
    
    msg += `ــــــــــــــــــــــــــــــــــــــــــــــــ\n`;
    msg += `⏳ *تاريخ إصدار التقرير:* _${new Date().toLocaleDateString('ar-YE')}_\n`;
    msg += `💡 _يرجى المتابعة والتحصيل والجدولة مع العملاء لتوفير السيولة للشبكة._`;

    const enc = encodeURIComponent(msg);
    const url = `whatsapp://send?text=${enc}`;
    window.open(url, '_blank');
    showToast('تم فتح تطبيق واتساب (الأخضر العادي) لمشاركة تقرير مديونيات توب 5 💬', 'success');
  };

  // 1. Daily Summary Memo (Same logic as DailyReport)
  const dailyReport = useMemo(() => {
    const targetDate = reportDate;
    const dateSales = salesHistory.filter(s => s.date === targetDate);
    
    const summary = {
      [CalculatorType.REGULAR]: { 
        100: { quantity: 0, amount: 0 }, 
        200: { quantity: 0, amount: 0 }, 
        250: { quantity: 0, amount: 0 }, 
        300: { quantity: 0, amount: 0 }, 
        500: { quantity: 0, amount: 0 } 
      },
      [CalculatorType.PRO]: { 
        100: { quantity: 0, amount: 0 }, 
        200: { quantity: 0, amount: 0 }, 
        250: { quantity: 0, amount: 0 }, 
        300: { quantity: 0, amount: 0 }, 
        500: { quantity: 0, amount: 0 } 
      },
      totalAmount: 0,
      totalCardsQuantity: 0,
      shopsWhoBought: [] as string[],
      totalReceivedAmount: 0,
      totalDebtIncreased: 0
    };

    dateSales.forEach(s => {
      // @ts-ignore
      if (summary[s.type]?.[s.category]) {
        // @ts-ignore
        summary[s.type][s.category].quantity += s.quantity;
        // @ts-ignore
        summary[s.type][s.category].amount += s.total;
      }
      summary.totalAmount += s.total;
      summary.totalCardsQuantity += s.quantity;
      if (s.shopName && s.shopName !== 'بقالة عامة' && !summary.shopsWhoBought.includes(s.shopName)) {
        summary.shopsWhoBought.push(s.shopName);
      }
    });

    // Invoices cash vs debt calculations
    const invoicesMap: Record<string, { total: number; received: number; remaining: number }> = {};
    dateSales.forEach(s => {
      const invId = s.invoiceId || (s.date + '-' + (s.shopName || 'بقالة عامة'));
      if (!invoicesMap[invId]) {
        invoicesMap[invId] = {
          total: s.totalInvoiceAmount || s.total,
          received: s.receivedAmount !== undefined ? s.receivedAmount : s.total,
          remaining: s.remainingAmount !== undefined ? s.remainingAmount : 0
        };
      }
    });
    
    const invoiceCash = Object.values(invoicesMap).reduce((sum, inv) => sum + inv.received, 0);
    const invoiceDebt = Object.values(invoicesMap).reduce((sum, inv) => sum + inv.remaining, 0);

    // Direct payments from shops on targetDate
    const directPayments = shops.reduce((sum, s) => {
      const shopPaymentsOnDate = (s.transactions || []).filter(t => t.type === 'payment' && t.date === targetDate);
      return sum + shopPaymentsOnDate.reduce((pSum, t) => pSum + t.amount, 0);
    }, 0);

    summary.totalReceivedAmount = invoiceCash + directPayments;
    summary.totalDebtIncreased = invoiceDebt;

    return summary;
  }, [salesHistory, reportDate, shops]);

  // 2. Today Invoices List
  const todayInvoices = useMemo(() => {
    const targetDate = reportDate;
    const dateSales = salesHistory.filter(s => s.date === targetDate);
    
    const invoicesMap: { [invoiceId: string]: {
      invoiceId: string;
      shopName: string;
      totalInvoiceAmount: number;
      receivedAmount: number;
      remainingAmount: number;
      paymentType: 'نقد' | 'آجل';
      itemsSummary: string;
    }} = {};

    dateSales.forEach(s => {
      const invId = s.invoiceId || (s.date + '-' + (s.shopName || 'بقالة عامة'));
      
      const categoryObj = prices[s.type]?.find(p => p.id === s.category);
      const catLabel = categoryObj ? categoryObj.label : `فئة ${s.category}`;

      if (!invoicesMap[invId]) {
        invoicesMap[invId] = {
          invoiceId: invId,
          shopName: s.shopName || 'بقالة عامة',
          totalInvoiceAmount: s.totalInvoiceAmount || s.total,
          receivedAmount: s.receivedAmount !== undefined ? s.receivedAmount : s.total,
          remainingAmount: s.remainingAmount !== undefined ? s.remainingAmount : 0,
          paymentType: s.paymentType || 'نقد',
          itemsSummary: `${s.quantity}x ${catLabel}`
        };
      } else {
        invoicesMap[invId].itemsSummary += `، ${s.quantity}x ${catLabel}`;
        if (!s.invoiceId) {
          invoicesMap[invId].totalInvoiceAmount += s.total;
          invoicesMap[invId].receivedAmount += s.total;
        }
      }
    });

    return Object.values(invoicesMap);
  }, [salesHistory, prices, reportDate]);

  // 3. Category Data for Bar Chart
  const categoryData = useMemo(() => {
    const targetDate = reportDate;
    const todaySales = salesHistory.filter(s => s.date === targetDate);
    
    return [
      { name: '100', العادية: todaySales.find(s => s.type === CalculatorType.REGULAR && s.category === 100)?.quantity || 0, PRO: todaySales.find(s => s.type === CalculatorType.PRO && s.category === 100)?.quantity || 0 },
      { name: '200', العادية: todaySales.find(s => s.type === CalculatorType.REGULAR && s.category === 200)?.quantity || 0, PRO: todaySales.find(s => s.type === CalculatorType.PRO && s.category === 200)?.quantity || 0 },
      { name: '250', العادية: todaySales.find(s => s.type === CalculatorType.REGULAR && s.category === 250)?.quantity || 0, PRO: todaySales.find(s => s.type === CalculatorType.PRO && s.category === 250)?.quantity || 0 },
      { name: '300', العادية: todaySales.find(s => s.type === CalculatorType.REGULAR && s.category === 300)?.quantity || 0, PRO: todaySales.find(s => s.type === CalculatorType.PRO && s.category === 300)?.quantity || 0 },
      { name: '500', العادية: todaySales.find(s => s.type === CalculatorType.REGULAR && s.category === 500)?.quantity || 0, PRO: todaySales.find(s => s.type === CalculatorType.PRO && s.category === 500)?.quantity || 0 },
    ];
  }, [salesHistory, reportDate]);

  // 4. Trend Data for line chart
  const trends = useMemo(() => {
    const dates = [...new Set(salesHistory.map(s => s.date))].sort() as string[];
    const last7Days = dates.slice(-7);
    const last30Days = dates.slice(-30);

    const getTrendData = (targetDates: string[]) => {
      return targetDates.map(date => {
        const daySales = salesHistory.filter(s => s.date === date);
        const regularTotal = daySales.filter(s => s.type === CalculatorType.REGULAR).reduce((sum, s) => sum + s.total, 0);
        const proTotal = daySales.filter(s => s.type === CalculatorType.PRO).reduce((sum, s) => sum + s.total, 0);
        return {
          date: date.split('-').slice(1).join('/'), // MM/DD
          العادية: regularTotal,
          Pro: proTotal,
          إجمالي: regularTotal + proTotal
        };
      });
    };

    return {
      weekly: getTrendData(last7Days),
      monthly: getTrendData(last30Days)
    };
  }, [salesHistory]);

  // 5. Debtors / Overdue Shops Alert
  const overdueShops = useMemo(() => {
    return shops.filter(shop => shop.currentBalance > balanceLimit);
  }, [shops, balanceLimit]);

  // 6. Shop Debt Distribution (Recharts)
  const debtChartData = useMemo(() => {
    const sorted = [...shops]
      .filter(s => s.currentBalance > 0)
      .sort((a, b) => b.currentBalance - a.currentBalance);
    
    return chartLimit === 0 ? sorted : sorted.slice(0, chartLimit);
  }, [shops, chartLimit]);

  // 7. Date filtered report table calculations (Shops state + status)
  const shopsTodayDetails = useMemo(() => {
    const targetDate = reportDate;
    return shops.map(shop => {
      const txsOnDate = (shop.transactions || []).filter(t => t.date === targetDate);
      if (txsOnDate.length === 0) return null;
      
      const sales = txsOnDate.filter(t => t.type === 'sale').reduce((sum, t) => sum + t.amount, 0);
      const payments = txsOnDate.filter(t => t.type === 'payment').reduce((sum, t) => sum + t.amount, 0);
      
      const net = sales - payments;
      let status = 'نقداً';
      if (net > 0) {
        status = 'رصيد موجب'; // They owe us (debt)
      } else if (net < 0) {
        status = 'رصيد سالب'; // We owe them / surplus credit
      }
      
      return {
        name: shop.name,
        sales,
        payments,
        net,
        status
      };
    }).filter(Boolean) as { name: string; sales: number; payments: number; net: number; status: string }[];
  }, [shops, reportDate]);

  // Calculate: "إجمالي المبالغ الواصلة بدون مديونية" (Total Cash fully received)
  const totalCashNoDebt = useMemo(() => {
    const targetDate = reportDate;
    const dateSales = salesHistory.filter(s => s.date === targetDate);
    
    const invoicesMap: Record<string, { total: number; received: number; remaining: number }> = {};
    dateSales.forEach(s => {
      const invId = s.invoiceId || (s.date + '-' + (s.shopName || 'بقالة عامة'));
      if (!invoicesMap[invId]) {
        invoicesMap[invId] = {
          total: s.totalInvoiceAmount || s.total,
          received: s.receivedAmount !== undefined ? s.receivedAmount : s.total,
          remaining: s.remainingAmount !== undefined ? s.remainingAmount : 0
        };
      }
    });

    return Object.values(invoicesMap)
      .filter(inv => inv.remaining === 0)
      .reduce((sum, inv) => sum + inv.received, 0);
  }, [salesHistory, reportDate]);

  const handleShareDebtDistribution = () => {
    const activeDebts = shops.filter(s => s.currentBalance > 0);
    const totalDebt = activeDebts.reduce((sum, s) => sum + s.currentBalance, 0);
    const totalDebtorsCount = activeDebts.length;
    
    const topDebtors = [...shops]
      .sort((a, b) => b.currentBalance - a.currentBalance)
      .filter(s => s.currentBalance > 0)
      .slice(0, 5);

    let msg = `*📋 تقرير المديونيات الإجمالي للبقالات 📋*\n`;
    msg += `------------------------------------\n`;
    msg += `💰 *إجمالي الديون القائمة:* *${totalDebt.toLocaleString('ar-YE')} ريال*\n`;
    msg += `🏪 *عدد البقالات المديونة:* ${totalDebtorsCount} بقالة\n`;
    msg += `------------------------------------\n`;
    msg += `⚠️ *أعلى 5 مديونيات مطلوبة حالياً:* \n`;
    
    topDebtors.forEach((shop, index) => {
      msg += `*${index + 1}.* *${shop.name}* : ${shop.currentBalance.toLocaleString('ar-YE')} ريال\n`;
      if (shop.phone) {
        msg += `   📞 هاتف: ${shop.phone}\n`;
      }
    });
    
    msg += `------------------------------------\n`;
    msg += `💡 _يرجى التواصل مع البقالات المذكورة أعلاه لجدولة السداد وتصفية الحسابات._`;

    const enc = encodeURIComponent(msg);
    const option = confirm("هل تريد مشاركة تقرير المديونيات عبر الواتساب؟ (إلغاء للمشاركة عبر رسالة SMS)");
    if (option) {
      window.open(`whatsapp://send?text=${enc}`, '_blank');
    } else {
      window.open(`sms:?body=${enc}`, '_blank');
    }
  };

  const handleDownloadDetailedPDF = () => {
    // Generate regular items array for the date
    const regularItems = INITIAL_PRICES[CalculatorType.REGULAR].map(p => ({
      label: p.label,
      quantity: dailyReport[CalculatorType.REGULAR][p.id]?.quantity || 0,
      amount: dailyReport[CalculatorType.REGULAR][p.id]?.amount || 0
    })).filter(item => item.quantity > 0);

    // Generate pro items array for the date
    const proItems = INITIAL_PRICES[CalculatorType.PRO].map(p => ({
      label: p.label,
      quantity: dailyReport[CalculatorType.PRO][p.id]?.quantity || 0,
      amount: dailyReport[CalculatorType.PRO][p.id]?.amount || 0
    })).filter(item => item.quantity > 0);

    downloadDetailedDailyReportPDF(
      reportDate,
      dailyReport.totalCardsQuantity,
      dailyReport.totalDebtIncreased,
      dailyReport.totalReceivedAmount,
      totalCashNoDebt,
      shopsTodayDetails,
      regularItems,
      proItems
    );
    showToast('تم تصدير وتحميل تقرير الأداء والحسابات التفصيلي بنجاح! 📁', 'success');
  };

  const handleGeneratePeriodPDF = async (type: 'weekly' | 'monthly') => {
    try {
      const end = new Date(reportDate);
      const start = new Date(end);
      if (type === 'weekly') {
        start.setDate(end.getDate() - 6);
      } else {
        start.setDate(end.getDate() - 29);
      }
      const startDate = start.toISOString().split('T')[0];
      const endDate = reportDate;

      const periodSales = salesHistory.filter(s => s.date >= startDate && s.date <= endDate);

      const categoriesList = [100, 200, 250, 300, 500];
      const cardSales = categoriesList.map(cat => {
        const catSales = periodSales.filter(s => Number(s.category) === cat);
        const totalQty = catSales.reduce((sum, s) => sum + s.quantity, 0);
        const totalAmount = catSales.reduce((sum, s) => sum + s.total, 0);
        
        let label = `فئة ${cat}`;
        const regObj = prices?.REGULAR?.find(p => p.id === cat);
        const proObj = prices?.PRO?.find(p => p.id === cat);
        if (regObj) label = regObj.label;
        else if (proObj) label = proObj.label;
        
        return {
          label,
          quantity: totalQty,
          total: totalAmount
        };
      });

      const groceriesPerformance = shops.map(shop => {
        const shopSales = periodSales.filter(s => s.shopName === shop.name);
        const q100 = shopSales.filter(s => Number(s.category) === 100).reduce((sum, s) => sum + s.quantity, 0);
        const q200 = shopSales.filter(s => Number(s.category) === 200).reduce((sum, s) => sum + s.quantity, 0);
        const q250 = shopSales.filter(s => Number(s.category) === 250).reduce((sum, s) => sum + s.quantity, 0);
        const q300 = shopSales.filter(s => Number(s.category) === 300).reduce((sum, s) => sum + s.quantity, 0);
        const q500 = shopSales.filter(s => Number(s.category) === 500).reduce((sum, s) => sum + s.quantity, 0);
        const total = shopSales.reduce((sum, s) => sum + s.total, 0);
        return {
          name: shop.name,
          isPro: !!shop.isPro,
          q100,
          q200,
          q250,
          q300,
          q500,
          total
        };
      });

      // Sort descending by total sales
      groceriesPerformance.sort((a, b) => b.total - a.total);

      // New shops in this period
      const newGroceries = shops
        .filter(s => s.createdAt && s.createdAt >= startDate && s.createdAt <= endDate)
        .map(s => s.name);

      // Inactive shops in this period (no sales and no payment transaction in last 5 days)
      const inactiveGroceries = shops.map(shop => {
        const dates: Date[] = [new Date(shop.createdAt)];
        
        const shopSalesAll = salesHistory.filter(s => s.shopName === shop.name);
        shopSalesAll.forEach(s => {
          if (s.date) dates.push(new Date(s.date));
        });
        
        (shop.transactions || []).forEach(t => {
          if (t.date) dates.push(new Date(t.date));
        });
        
        const latestDate = new Date(Math.max(...dates.map(d => d.getTime())));
        const endDay = new Date(reportDate);
        const diffTime = endDay.getTime() - latestDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        return {
          name: shop.name,
          days: diffDays,
          latestDateStr: latestDate.toISOString().split('T')[0]
        };
      })
      .filter(item => item.days >= 5)
      .map(item => `${item.name} (خامل منذ ${item.days} أيام - آخر حركة: ${item.latestDateStr})`);

      // Financials
      const totalSales = periodSales.reduce((sum, s) => sum + s.total, 0);
      
      const invoicesMap: Record<string, { total: number; received: number }> = {};
      periodSales.forEach(s => {
        const invId = s.invoiceId || (s.date + '-' + (s.shopName || 'بقالة عامة'));
        if (!invoicesMap[invId]) {
          invoicesMap[invId] = {
            total: s.totalInvoiceAmount || s.total,
            received: s.receivedAmount !== undefined ? s.receivedAmount : s.total
          };
        }
      });
      const salesCashCollected = Object.values(invoicesMap).reduce((sum, inv) => sum + inv.received, 0);

      const directPayments = shops.reduce((sum, s) => {
        const shopPayments = (s.transactions || []).filter(
          t => t.type === 'payment' && t.date >= startDate && t.date <= endDate
        );
        return sum + shopPayments.reduce((pSum, t) => pSum + t.amount, 0);
      }, 0);

      const totalCollected = salesCashCollected + directPayments;
      const totalDebt = totalSales - totalCollected;

      showToast(`جاري إنشاء وتحميل التقرير الموحد... ⏳`, 'info');

      const result = await downloadPeriodReportPDF({
        reportType: type,
        startDate,
        endDate,
        distributorName: getDistributorName() || "الموزع المعتمد",
        networkName: getNetworkName() || "اسم الشبكة",
        cardSales,
        groceriesPerformance,
        newGroceries,
        inactiveGroceries,
        financials: {
          totalSales,
          totalCollected,
          totalDebt
        }
      });

      if (result.success) {
        showToast(`تم تصدير وتحميل تقرير الفترة الموحد بنجاح! 📁 (${result.fileName})`, 'success');
      } else {
        showToast('فشل في تصدير تقرير الفترة الموحد.', 'error');
      }
    } catch (err: any) {
      console.error(err);
      showToast(`حدث خطأ أثناء تصدير التقرير: ${err.message || err}`, 'error');
    }
  };

  const handleGeneratePeriodExcel = async (type: 'weekly' | 'monthly' | 'custom') => {
    try {
      let startDate = '';
      let endDate = '';

      if (type === 'weekly') {
        const end = new Date(reportDate);
        const start = new Date(end);
        start.setDate(end.getDate() - 6);
        startDate = start.toISOString().split('T')[0];
        endDate = reportDate;
      } else if (type === 'monthly') {
        const end = new Date(reportDate);
        const start = new Date(end);
        start.setDate(end.getDate() - 29);
        startDate = start.toISOString().split('T')[0];
        endDate = reportDate;
      } else {
        if (!customStartDate || !customEndDate) {
          showToast('يرجى تحديد تاريخ البدء وتاريخ الانتهاء للتقرير الاختياري ⚠️', 'error');
          return;
        }
        startDate = customStartDate;
        endDate = customEndDate;
      }

      showToast('جاري توليد التقرير المالي بصيغة Excel... ⏳', 'info');
      await downloadPeriodReportExcel({
        startDate,
        endDate,
        salesHistory,
        shops,
        reportType: type
      });
      showToast('تم تحميل التقرير المالي (Excel) بنجاح! 🟢', 'success');
    } catch (err: any) {
      console.error(err);
      showToast(`حدث خطأ أثناء تصدير ملف Excel: ${err.message || err}`, 'error');
    }
  };

  return (
    <div className="p-4 space-y-6 text-right pb-16" style={{ direction: 'rtl' }}>
      
      {/* 1. إجمالي دخل ومعاملات اليوم (بطاقة ملخص علوية) */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-700 rounded-[2.2rem] text-white shadow-xl shadow-blue-500/10 flex flex-col justify-between relative overflow-hidden"
      >
        <div className="absolute -top-10 -left-10 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
        <div className="space-y-1 relative z-10">
          <span className="text-blue-100 text-xs font-bold block">إجمالي دخل ومعاملات اليوم</span>
          <div className="text-4xl font-black font-sans leading-tight flex items-baseline gap-1">
            {dailyReport.totalAmount.toLocaleString('ar-YE')}
            <span className="text-xs font-normal opacity-80">ريال يمني</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-white/10 relative z-10 text-[11px] text-blue-100">
          <div>
            <span className="opacity-60 block">المبلغ المتسلم (كاش):</span>
            <span className="text-sm font-black font-sans text-green-300">{dailyReport.totalReceivedAmount.toLocaleString('ar-YE')} ريال</span>
          </div>
          <div>
            <span className="opacity-60 block">الآجل والمديونية الجديدة:</span>
            <span className="text-sm font-black font-sans text-amber-300">{dailyReport.totalDebtIncreased.toLocaleString('ar-YE')} ريال</span>
          </div>
        </div>
      </motion.div>

      {/* 2. تنبيه مديونيات البقالات المتجاوزة للحد (تنبيهات مرئية بارزة) */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-slate-900 rounded-[2rem] p-5 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4"
      >
        <div className="flex justify-between items-center border-b border-slate-50 dark:border-slate-800/60 pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-red-500" size={20} />
            <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">البقالات المتجاوزة لحد المديونية</h3>
          </div>
          <span className="text-[10px] font-black bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 px-2.5 py-0.5 rounded-lg font-sans">
            الحد الحالي: {balanceLimit.toLocaleString('ar-YE')} ريال
          </span>
        </div>

        {/* Limit Slider Controls */}
        <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800/50 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleLimitChange(Math.max(1000, balanceLimit - 1000))}
              className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-extrabold text-sm flex items-center justify-center cursor-pointer active:scale-90 select-none transition-transform"
            >
              -
            </button>
            <input 
              type="number"
              value={balanceLimit}
              onChange={(e) => handleLimitChange(Number(e.target.value) || 0)}
              className="w-20 h-8 text-center bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-sans font-black outline-none focus:border-red-500"
            />
            <button
              onClick={() => handleLimitChange(balanceLimit + 1000)}
              className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-extrabold text-sm flex items-center justify-center cursor-pointer active:scale-90 select-none transition-transform"
            >
              +
            </button>
          </div>
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 select-none">تعديل حد الأمان للمديونية:</span>
        </div>

        {overdueShops.length === 0 ? (
          <div className="text-center py-4 bg-emerald-50/30 dark:bg-emerald-950/5 rounded-2xl border border-dashed border-emerald-100 dark:border-emerald-900/20 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            🎉 ممتاز كلياً! جميع البقالات ملتزمة ومستمرة بحد مديونية آمن.
          </div>
        ) : (
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {overdueShops.map(shop => (
              <div 
                key={shop.id} 
                className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-red-100/50 dark:border-red-950/20 flex items-center justify-between text-right gap-3 shadow-sm hover:border-red-200 transition-colors"
              >
                <button
                  onClick={() => {
                    let msg = `*🔄 تذكير مستعجل بسداد المديونية المتراكمة 🔄*\n\n`;
                    msg += `الأخوة الكرام في *${shop.name}* محترمين،\n`;
                    msg += `نود إحاطتكم وتذكيركم بأن مديونيتكم المتراكمة قد تجاوزت حد الأمان المسموح وبلغت حالياً:\n`;
                    msg += `🚨 *${shop.currentBalance.toLocaleString('ar-YE')} ريال يمني*\n\n`;
                    msg += `يرجى التفضل بالمبادرة بسداد الحساب أو دفعة منه لتحديث حساباتكم واستمرار المعاملات وتوريد كروت الشبكة بشكل طبيعي.\n`;
                    msg += `------------------------------------\n`;
                    msg += `شكراً جزيلاً لتعاونكم وثقتكم بنا! ✨`;
                    
                    const enc = encodeURIComponent(msg);
                    const destPhone = shop.phone?.trim() ? shop.phone.trim() : '';
                    const finalUrl = destPhone 
                      ? `whatsapp://send?phone=967${destPhone}&text=${enc}`
                      : `whatsapp://send?text=${enc}`;
                    window.open(finalUrl, '_blank');
                    showToast(`تم فتح واتساب لتنبيه بقالة ${shop.name}`, 'success');
                  }}
                  className="px-2.5 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-[10px] font-black cursor-pointer shadow-sm active:scale-95 transition-all text-center flex items-center justify-center gap-1 shrink-0 font-sans"
                >
                  تنبيه سريع 💬
                </button>

                <div className="space-y-1">
                  <h5 className="text-xs font-black text-slate-900 dark:text-white">{shop.name}</h5>
                  <div className="flex items-center gap-2 justify-end text-[10px] font-sans font-bold">
                    <span className="text-red-500 font-extrabold">{shop.currentBalance.toLocaleString('ar-YE')} ريال مستحق</span>
                    {shop.phone && (
                      <>
                        <span className="text-slate-300 dark:text-slate-700">•</span>
                        <span className="text-slate-400 font-bold">{shop.phone}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* 3. توزيع أرصدة مديونيات البقالات */}
      {shops.length > 0 && (
        <motion.div 
          id="debt-distribution-chart-card"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white dark:bg-slate-900 rounded-[2.2rem] p-5 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4 text-right"
        >
          <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-50 dark:border-slate-800/60 pb-3">
            <div className="flex items-center gap-2">
              <Share2 className="text-indigo-500" size={20} />
              <h4 className="text-sm font-black text-slate-900 dark:text-white">توزيع أرصدة مديونيات البقالات</h4>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleShareDebtDistributionToWhatsApp}
                title="مشاركة تقرير المديونيات وأعلى 5 مدينين عبر واتساب الأخضر"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 active:scale-95 text-white rounded-xl text-[10px] font-black cursor-pointer shadow-sm transition-all"
              >
                <MessageCircle size={14} className="text-white" />
                <span>مشاركة المديونيات (توب 5) 💬</span>
              </button>

              <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-950 p-1 rounded-xl">
                {[5, 10, 0].map((limit) => (
                  <button
                    key={limit}
                    onClick={() => setChartLimit(limit)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                      chartLimit === limit
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    {limit === 0 ? 'الكل' : `${limit} الأكثر`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {debtChartData.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs font-bold leading-normal">
              لا توجد حسابات قائمة بمديونية حالياً لعرض مخطط التوزيع.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="h-64 w-full" style={{ direction: 'ltr' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={debtChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#1e293b" : "#f1f5f9"} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: isDark ? "#94a3b8" : "#64748b" }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: isDark ? "#94a3b8" : "#64748b" }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: isDark ? '#020617' : '#ffffff', 
                        borderRadius: '16px', 
                        border: `1px solid ${isDark ? '#1e293b' : '#f1f5f9'}`,
                        textAlign: 'right'
                      }}
                    />
                    <Bar dataKey="currentBalance" name="الرصيد المستحق" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  onClick={handleShareDebtDistribution}
                  className="w-full py-3 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-2 text-xs font-black cursor-pointer shadow-sm"
                >
                  <Share2 size={14} />
                  <span>تصدير ومشاركة تقرير المديونيات الموزعة 📱</span>
                </button>

                <button
                  onClick={() => {
                    const activeDebts = shops.filter(s => s.currentBalance > 0);
                    const totalDebt = activeDebts.reduce((sum, s) => sum + s.currentBalance, 0);
                    const totalDebtorsCount = activeDebts.length;
                    
                    const topDebtors = [...shops]
                      .sort((a, b) => b.currentBalance - a.currentBalance)
                      .filter(s => s.currentBalance > 0)
                      .slice(0, 5);

                    let msg = `*📋 تقرير المديونيات الإجمالي للبقالات 📋*\n`;
                    msg += `------------------------------------\n`;
                    msg += `💰 *إجمالي الديون القائمة:* *${totalDebt.toLocaleString('ar-YE')} ريال*\n`;
                    msg += `🏪 *عدد البقالات المديونة:* ${totalDebtorsCount} بقالة\n`;
                    msg += `------------------------------------\n`;
                    msg += `⚠️ *أعلى 5 مديونيات مطلوبة حالياً:* \n`;
                    
                    topDebtors.forEach((shop, index) => {
                      msg += `*${index + 1}.* *${shop.name}* : ${shop.currentBalance.toLocaleString('ar-YE')} ريال\n`;
                      if (shop.phone) {
                        msg += `   📞 هاتف: ${shop.phone}\n`;
                      }
                    });
                    
                    msg += `------------------------------------\n`;
                    msg += `💡 _يرجى التواصل مع البقالات المذكورة أعلاه لجدولة السداد وتصفية الحسابات._`;

                    const enc = encodeURIComponent(msg);
                    window.open(`whatsapp://send?text=${enc}`, '_blank');
                    showToast('تم فتح واتساب لمشاركة التقرير 💬', 'success');
                  }}
                  className="w-full py-3 bg-green-50 hover:bg-green-100 dark:bg-green-950/30 dark:hover:bg-green-950 text-green-600 dark:text-green-400 rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-2 text-xs font-black cursor-pointer shadow-sm border border-green-200/50 dark:border-green-900/30"
                >
                  <MessageCircle size={15} className="text-green-600 dark:text-green-400" />
                  <span>مشاركة التقرير عبر الواتساب مباشرة 💬</span>
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* 3.5. إدارة وتوزيع مديونيات البقالات حسب المناطق الجغرافية */}
      {shops.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="bg-white dark:bg-slate-900 rounded-[2.2rem] p-5 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4 text-right"
        >
          <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-800/60 pb-3">
            <div className="flex items-center gap-2">
              <MapPin className="text-amber-500" size={20} />
              <h4 className="text-sm font-black text-slate-900 dark:text-white">توزيع مديونيات البقالات حسب المناطق الجغرافية</h4>
            </div>
            <span className="text-[10px] font-black bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 px-2.5 py-0.5 rounded-lg">
              نظام الفرز والترتيب الديناميكي
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
            قم بتخصيص المنطقة الجغرافية لكل بقالة لتصدير تقرير مالي مرتب تلقائياً تنازلياً حسب قيمة الدين، بحيث يبدأ تقرير كل منطقة في صفحة منفصلة ومنظمة بالكامل.
          </p>

          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {shops.map(shop => {
              const currentRegion = shopRegions[shop.id] || '';
              return (
                <div 
                  key={shop.id} 
                  className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-3 text-right"
                >
                  <div className="flex items-center gap-2 shrink-0">
                    <input 
                      type="text"
                      placeholder="أدخل المنطقة (مثال: الغربية)"
                      value={currentRegion}
                      onChange={(e) => updateShopRegion(shop.id, e.target.value)}
                      className="px-3 py-1.5 w-36 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-black outline-none focus:border-amber-500 text-center transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <h5 className="text-xs font-black text-slate-900 dark:text-white">{shop.name}</h5>
                    <div className="flex items-center gap-2 justify-end text-[10px] font-sans font-bold">
                      <span className="text-red-500 font-extrabold">{shop.currentBalance.toLocaleString('ar-YE')} ريال مستحق</span>
                      <span className="text-slate-300 dark:text-slate-700">•</span>
                      <span className="text-slate-400 font-bold">{currentRegion || 'المنطقة غير محددة'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={async () => {
              const reportData = shops.map(shop => ({
                name: shop.name,
                debt: shop.currentBalance,
                region: (shopRegions[shop.id] || 'المنطقة غير محددة').trim()
              }));
              
              showToast('جاري تحضير وتصدير تقرير مديونيات المناطق بـ PDF...', 'info');
              const res = await generateRegionalReport(reportData);
              if (res && res.success) {
                showToast(`🎉 تم تصدير تقرير المناطق الموزعة بنجاح بملف: ${res.fileName}`, 'success');
              } else {
                showToast('عذراً، فشل تصدير التقرير المالي.', 'error');
              }
            }}
            className="w-full py-4 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 transition-all cursor-pointer"
          >
            <Download size={14} />
            <span>توليد وتصدير تقرير الديون الموزعة حسب المناطق (PDF) 📃</span>
          </button>
        </motion.div>
      )}

      {/* 4. فلترة بالتاريخ لتنزيل التقرير */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white dark:bg-slate-900 rounded-[2.2rem] p-5 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4 text-right"
      >
        <div className="flex justify-between items-center border-b border-slate-50 dark:border-slate-800/60 pb-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="text-blue-500" size={20} />
            <h4 className="text-sm font-black text-slate-900 dark:text-white">فلترة بالتاريخ وتصدير التقارير</h4>
          </div>
          <span className="text-xs font-black text-blue-600 dark:text-blue-400 font-sans">{reportDate}</span>
        </div>

        {/* Date Selector input */}
        <input 
          type="date"
          value={reportDate}
          onChange={(e) => setReportDate(e.target.value)}
          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 text-slate-950 dark:text-white border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-sans font-black outline-none focus:border-blue-500 transition-colors text-right"
        />

        {/* Dynamic visual preview of the filtered report data table */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
          <div className="flex justify-between items-center text-xs font-extrabold text-slate-500 pb-2 border-b border-slate-200/50 dark:border-slate-800">
            <span>بيانات ومعاملات تاريخ: {reportDate}</span>
            <span className="text-blue-600 dark:text-blue-400 font-sans">{shopsTodayDetails.length} حركة مسجلة</span>
          </div>

          {/* Simple Bento stats inside date filter */}
          <div className="grid grid-cols-2 gap-2 text-right">
            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-[9px] text-slate-400 block font-bold">عدد الكروت المباعة</span>
              <span className="text-md font-black font-sans text-slate-800 dark:text-white">{dailyReport.totalCardsQuantity} كرت</span>
            </div>
            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-[9px] text-slate-400 block font-bold">إجمالي المديونية (الآجل)</span>
              <span className="text-md font-black font-sans text-amber-500">{dailyReport.totalDebtIncreased.toLocaleString('ar-YE')} ريال</span>
            </div>
            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-[9px] text-slate-400 block font-bold">إجمالي التسديدات والواصل</span>
              <span className="text-md font-black font-sans text-green-500">{dailyReport.totalReceivedAmount.toLocaleString('ar-YE')} ريال</span>
            </div>
            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-[9px] text-slate-400 block font-bold">المبالغ الواصلة نقداً بالكامل</span>
              <span className="text-md font-black font-sans text-blue-500">{totalCashNoDebt.toLocaleString('ar-YE')} ريال</span>
            </div>
          </div>

          {/* Shops transactions status table as requested */}
          <div className="space-y-2">
            <span className="text-[10px] font-black text-slate-500 block">تفاصيل حركة حسابات البقالات (رصيد سالب، رصيد موجب، نقداً):</span>
            
            {shopsTodayDetails.length === 0 ? (
              <div className="text-center py-4 bg-white/50 dark:bg-slate-900/40 text-xs font-bold text-slate-400 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                لا توجد معاملات حسابية للبقالات في هذا التاريخ.
              </div>
            ) : (
              <div className="max-h-56 overflow-y-auto border border-slate-100 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800">
                {shopsTodayDetails.map((item, idx) => (
                  <div key={idx} className="p-3 bg-white dark:bg-slate-900 flex justify-between items-center text-xs">
                    <div className="flex flex-col gap-0.5 text-right">
                      <span className="font-extrabold text-slate-900 dark:text-white">{item.name}</span>
                      <div className="flex gap-2 text-[9px] font-bold text-slate-400 font-sans">
                        <span>مبيعات: {item.sales}</span>
                        <span>واصل: {item.payments}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black ${
                        item.status === 'رصيد موجب' 
                          ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400' 
                          : item.status === 'رصيد سالب' 
                          ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400' 
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {item.status}
                      </span>
                      <span className="font-black font-sans text-slate-700 dark:text-slate-300">
                        {item.net !== 0 ? `${Math.abs(item.net)} ريال` : 'خالص'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Export PDF Button */}
          <button
            onClick={handleDownloadDetailedPDF}
            className="w-full mt-2 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10 active:scale-95 transition-all cursor-pointer"
          >
            <Download size={14} />
            <span>تنزيل التقرير المالي والحسابي التفصيلي الموحد (PDF) 📁</span>
          </button>

          {/* Excel Reports Section */}
          <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
            <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1">
              <span>📊 تقارير مبيعات وحسابات البقالات (Excel)</span>
            </h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              تنزيل تقارير مبيعات وحسابات الفترات منسقة بالألوان والخطوط مع تفاصيل مبيعات الفئات (100، 200، 250، 300، 500) واصل الحساب وصافي المتبقي لكل بقالة.
            </p>

            {/* Standard Period Reports */}
            <div className="grid grid-cols-2 gap-2 mt-2">
              <button
                onClick={() => handleGeneratePeriodExcel('weekly')}
                className="py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/10 active:scale-95 transition-all cursor-pointer"
              >
                <CalendarDays size={13} />
                <span>تنزيل التقرير الأسبوعي (Excel) 🟢</span>
              </button>
              <button
                onClick={() => handleGeneratePeriodExcel('monthly')}
                className="py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/10 active:scale-95 transition-all cursor-pointer"
              >
                <CalendarDays size={13} />
                <span>تنزيل التقرير الشهري (Excel) 🟢</span>
              </button>
            </div>

            {/* Custom Selective Report Section */}
            <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 mt-2 space-y-2 text-right">
              <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 block">📅 التقرير الاختياري المخصص للفترة (Excel)</span>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1 text-right">
                  <label className="text-[9px] text-slate-500 font-bold">من تاريخ:</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="p-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-white rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex flex-col gap-1 text-right">
                  <label className="text-[9px] text-slate-500 font-bold">إلى تاريخ:</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="p-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-white rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <button
                onClick={() => handleGeneratePeriodExcel('custom')}
                className="w-full mt-1 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
              >
                <Download size={13} />
                <span>تحميل التقرير الاختياري (Excel) 🟢</span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 5. تفاصيل فواتير اليوم وتتبع الديون */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="bg-white dark:bg-slate-900 rounded-[2.2rem] p-5 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4 text-right"
      >
        <div className="flex items-center gap-2 border-b border-slate-50 dark:border-slate-800/60 pb-3">
          <FileText size={20} className="text-indigo-500" />
          <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">تفاصيل فواتير اليوم وتتبع الديون</h3>
        </div>

        <div className="space-y-2.5 max-h-[35rem] overflow-y-auto pr-1">
          {todayInvoices.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs font-bold leading-normal bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              لم يتم تسجيل أي فواتير بيع كروت لهذا اليوم.
            </div>
          ) : (
            todayInvoices.map((inv, idx) => (
              <div key={idx} className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-2 hover:border-slate-200 transition-colors">
                <div className="flex justify-between items-center">
                  <span className="font-sans text-[9px] font-bold text-slate-400">{inv.invoiceId}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                    inv.paymentType === 'آجل' 
                      ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400' 
                      : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400'
                  }`}>
                    {inv.paymentType === 'آجل' ? 'فاتورة آجل (دين)' : 'فاتورة نقدية (خالصة)'}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="font-extrabold text-slate-950 dark:text-white text-sm">{inv.shopName}</span>
                  <span className="font-black text-slate-950 dark:text-white font-sans text-md">{inv.totalInvoiceAmount.toLocaleString('ar-YE')} ريال</span>
                </div>
                
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-extrabold leading-normal bg-slate-50 dark:bg-slate-950 p-2 rounded-lg border border-slate-100 dark:border-slate-900">
                  {inv.itemsSummary}
                </p>
                
                <div className="flex justify-between items-center text-[10px] border-t border-slate-50 dark:border-slate-800/60 pt-2 font-sans text-slate-400">
                  <span>الواصل الكاش: <strong className="text-green-600 dark:text-green-400">{inv.receivedAmount.toLocaleString('ar-YE')} ريال</strong></span>
                  <span>المتبقي عليه آجل: <strong className={inv.remainingAmount > 0 ? "text-red-500 font-extrabold" : "text-emerald-500 font-extrabold"}>{inv.remainingAmount.toLocaleString('ar-YE')} ريال</strong></span>
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>

      {/* 6. توزيع مبيعات اليوم (بالكمية) */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white dark:bg-slate-900 rounded-[2.2rem] p-5 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4 text-right"
      >
        <div className="flex items-center gap-2 border-b border-slate-50 dark:border-slate-800/60 pb-3">
          <BarChart3 size={20} className="text-blue-500" />
          <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">توزيع مبيعات اليوم (بالكمية)</h3>
        </div>

        <div className="h-64 w-full" style={{ direction: 'ltr' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#1e293b" : "#f1f5f9"} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: isDark ? "#94a3b8" : "#64748b" }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: isDark ? "#94a3b8" : "#64748b" }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: isDark ? '#020617' : '#ffffff', 
                  borderRadius: '16px', 
                  border: `1px solid ${isDark ? '#1e293b' : '#f1f5f9'}`,
                }}
              />
              <Legend iconType="circle" />
              <Bar dataKey="العادية" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="PRO" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {trends[trendView].length > 0 && (
          <div className="pt-4 border-t border-slate-50 dark:border-slate-800/60 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp size={18} className="text-green-500" />
                <h3 className="font-extrabold text-slate-900 dark:text-white text-xs">منحنى حركة المبيعات الإجمالية</h3>
              </div>
              <div className="flex bg-slate-50 dark:bg-slate-950 p-1 rounded-xl">
                <button 
                  onClick={() => setTrendView('weekly')}
                  className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all cursor-pointer ${trendView === 'weekly' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-slate-400'}`}
                >
                  أسبوعي
                </button>
                <button 
                  onClick={() => setTrendView('monthly')}
                  className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all cursor-pointer ${trendView === 'monthly' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-slate-400'}`}
                >
                  شهري
                </button>
              </div>
            </div>

            <div className="h-64 w-full" style={{ direction: 'ltr' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends[trendView]} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#1e293b" : "#f1f5f9"} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: isDark ? "#94a3b8" : "#64748b" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: isDark ? "#94a3b8" : "#64748b" }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: isDark ? '#020617' : '#ffffff', 
                      borderRadius: '16px', 
                      border: `1px solid ${isDark ? '#1e293b' : '#f1f5f9'}`,
                      textAlign: 'right'
                    }}
                  />
                  <Line type="monotone" dataKey="إجمالي" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="العادية" stroke="#3b82f6" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                  <Line type="monotone" dataKey="Pro" stroke="#8b5cf6" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </motion.div>

    </div>
  );
};
