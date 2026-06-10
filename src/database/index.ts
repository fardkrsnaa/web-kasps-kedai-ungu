import Dexie, { type EntityTable } from 'dexie';
import type {
  Product,
  Ingredient,
  Recipe,
  Transaction,
  TransactionItem,
  StockMovement,
  AppSettings,
} from '../types';

class KedaiUnguDB extends Dexie {
  products!: EntityTable<Product, 'id'>;
  ingredients!: EntityTable<Ingredient, 'id'>;
  recipes!: EntityTable<Recipe, 'id'>;
  transactions!: EntityTable<Transaction, 'id'>;
  transactionItems!: EntityTable<TransactionItem, 'id'>;
  stockMovements!: EntityTable<StockMovement, 'id'>;
  settings!: EntityTable<AppSettings, 'id'>;

  constructor() {
    super('KedaiUnguDB');

    this.version(1).stores({
      products: '++id, name, category, isActive',
      ingredients: '++id, name, unit',
      recipes: '++id, productId, ingredientId',
      transactions: '++id, invoiceNumber, status, createdAt',
      transactionItems: '++id, transactionId, productId',
      stockMovements: '++id, ingredientId, type, createdAt',
      settings: '++id',
    });
  }
}

export const db = new KedaiUnguDB();

export async function initializeDatabase(): Promise<void> {
  const settingsCount = await db.settings.count();
  if (settingsCount === 0) {
    await db.settings.add({
      storeName: 'Kedai Ungu',
      address: '',
      theme: 'light',
      taxRate: 0,
      currency: 'IDR',
    });
  }
}