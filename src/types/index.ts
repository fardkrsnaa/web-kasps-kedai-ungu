export interface Product {
  id?: number;
  name: string;
  price: number;
  category: string;
  image?: string;
  isActive: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Ingredient {
  id?: number;
  name: string;
  purchasePrice: number;
  purchaseCost: number;
  purchaseQuantity: number;
  unitCost: number;
  unit: string;
  stock: number;
  minStock: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Recipe {
  id?: number;
  productId: number;
  ingredientId: number;
  quantity: number;
  productionQuantity: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id?: number;
  invoiceNumber: string;
  totalAmount: number;
  totalHpp: number;
  totalProfit: number;
  discount: number;
  paymentMethod: 'cash' | 'qris' | 'transfer';
  paymentAmount: number;
  changeAmount: number;
  status: 'draft' | 'queued' | 'completed' | 'deleted';
  itemCount: number;
  notes?: string;
  queueNumber?: string;
  deletedFromStatus?: 'draft' | 'queued' | 'completed';
  deletedAt?: Date;
  voidAt?: Date;
  voidReason?: string;
  restoredAt?: Date;
  restoredReason?: string;
  createdAt: Date;
}


export interface TransactionItem {
  id?: number;
  transactionId: number;
  productId: number;
  productName: string;
  quantity: number;
  price: number;
  hpp: number;
  profit: number;
  notes?: string;
}

export interface StockMovement {
  id?: number;
  ingredientId: number;
  ingredientName: string;
  type: 'in' | 'out';
  quantity: number;
  reference: string;
  createdAt: Date;
}

export interface AppSettings {
  id?: number;
  storeName: string;
  logo?: string;
  address: string;
  theme: 'light' | 'dark';
  taxRate: number;
  currency: string;
}

export interface Backup {
  version: string;
  exportedAt: string;
  products: Product[];
  ingredients: Ingredient[];
  recipes: Recipe[];
  transactions: Transaction[];
  transactionItems: TransactionItem[];
  stockMovements: StockMovement[];
  settings: AppSettings[];
  auditLogs: AuditLog[];
}

export type ProductCategory = string;

export interface DailySummary {
  date: string;
  omzet: number;
  profit: number;
  hpp: number;
  transactions: number;
}

export const UNIT_OPTIONS = [
  'pcs', 'gram', 'kg', 'ml', 'liter', 'botol', 'sachet', 'pack', 'bungkus', 'porsi',
] as const;

export type UnitType = typeof UNIT_OPTIONS[number];

export interface AuditLog {
  id?: number;
  action: string;
  transactionId: number;
  invoiceNumber: string;
  timestamp: Date;
  description: string;
  beforeData?: string;
  afterData?: string;
}