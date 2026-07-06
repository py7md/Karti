export enum CalculatorType {
  REGULAR = 'REGULAR',
  PRO = 'PRO'
}

export interface CardCategory {
  id: number;
  label: string;
  price: number;
}

export interface SaleRecord {
  date: string;
  type: CalculatorType;
  category: number;
  quantity: number;
  total: number;
  shopName?: string;
  paymentType?: 'نقد' | 'آجل';
  receivedAmount?: number;
  remainingAmount?: number;
  invoiceId?: string;
  totalInvoiceAmount?: number;
}

export interface ShopTransaction {
  id: string;
  date: string;
  type: 'sale' | 'payment';
  amount: number;
  notes: string;
  invoiceId?: string;
  items?: {
    label: string;
    category: number;
    quantity: number;
    price: number;
    total: number;
  }[];
}

export interface ShopAccount {
  id: string;
  name: string;
  phone?: string;
  emoji?: string;
  isPro?: boolean;
  totalSales: number;
  totalPayments: number;
  currentBalance: number; // outstanding amount they owe (totalSales - totalPayments)
  createdAt: string;
  transactions: ShopTransaction[];
}

export interface DailySummary {
  [key: string]: {
    [CalculatorType.REGULAR]: { [category: number]: number };
    [CalculatorType.PRO]: { [category: number]: number };
    totalAmount: number;
  }
}

export interface TrashItem {
  id: string;
  deletedAt: string;
  type: 'transaction' | 'shop';
  data: any; // ShopTransaction or ShopAccount
  shopId?: string; // Optional parent shop ID for transactions
  shopName?: string; // Optional parent shop Name for transactions
}

