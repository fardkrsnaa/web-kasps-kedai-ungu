import Dexie, { type EntityTable } from 'dexie';
import type {
  Product,
  Ingredient,
  Transaction,
  TransactionItem,
  StockMovement,
  AppSettings,
  AuditLog,
  Category,
} from '../types';

class KedaiUnguDB extends Dexie {
  products!: EntityTable<Product, 'id'>;
  ingredients!: EntityTable<Ingredient, 'id'>;
  transactions!: EntityTable<Transaction, 'id'>;
  transactionItems!: EntityTable<TransactionItem, 'id'>;
  stockMovements!: EntityTable<StockMovement, 'id'>;
  settings!: EntityTable<AppSettings, 'id'>;
  auditLogs!: EntityTable<AuditLog, 'id'>;
  categories!: EntityTable<Category, 'id'>;

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

    this.version(2).stores({
      products: '++id, name, category, isActive',
      ingredients: '++id, name, unit',
      recipes: '++id, productId, ingredientId',
      transactions: '++id, invoiceNumber, status, createdAt',
      transactionItems: '++id, transactionId, productId',
      stockMovements: '++id, ingredientId, type, createdAt',
      settings: '++id',
    }).upgrade(async (tx) => {
      try {
        const ingredients = await tx.table('ingredients').toArray();
        for (const ing of ingredients) {
          try {
            const pp = ing.purchasePrice || 0;
            await tx.table('ingredients').update(ing.id, {
              purchaseCost: ing.purchaseCost ?? pp,
              purchaseQuantity: ing.purchaseQuantity ?? 1,
              unitCost: ing.unitCost ?? pp,
            });
          } catch { /* skip */ }
        }
      } catch { /* */ }

      try {
        const recipes = await tx.table('recipes').toArray();
        for (const recipe of recipes) {
          try {
            await tx.table('recipes').update(recipe.id, {
              productionQuantity: recipe.productionQuantity ?? 1,
            });
          } catch { /* skip */ }
        }
      } catch { /* */ }

      // Migrate 'cancelled' and 'void' → 'deleted'
      try {
        const transactions = await tx.table('transactions').toArray();
        for (const t of transactions) {
          try {
            if (t.status === 'cancelled' || t.status === 'void') {
              await tx.table('transactions').update(t.id, {
                status: 'deleted',
                deletedAt: t.deletedAt ?? new Date(),
              });
            }
          } catch { /* skip */ }
        }
      } catch { /* */ }
    });

    this.version(3).stores({
      products: '++id, name, category, isActive',
      ingredients: '++id, name, unit',
      recipes: '++id, productId, ingredientId',
      transactions: '++id, invoiceNumber, status, createdAt',
      transactionItems: '++id, transactionId, productId',
      stockMovements: '++id, ingredientId, type, createdAt',
      settings: '++id',
    });

    this.version(4).stores({
      products: '++id, name, category, isActive',
      ingredients: '++id, name, unit',
      recipes: '++id, productId, ingredientId',
      transactions: '++id, invoiceNumber, status, createdAt',
      transactionItems: '++id, transactionId, productId',
      stockMovements: '++id, ingredientId, type, createdAt',
      settings: '++id',
      auditLogs: '++id, action, transactionId, invoiceNumber, timestamp',
    });

    // Version 5: Remove recipes table, HPP/profit fields
    this.version(5).stores({
      products: '++id, name, category, isActive',
      ingredients: '++id, name, unit',
      transactions: '++id, invoiceNumber, status, createdAt',
      transactionItems: '++id, transactionId, productId',
      stockMovements: '++id, ingredientId, type, createdAt',
      settings: '++id',
      auditLogs: '++id, action, transactionId, invoiceNumber, timestamp',
    });

    // Version 6: Add productId index for ingredients (POS stock deduction)
    this.version(6).stores({
      products: '++id, name, category, isActive',
      ingredients: '++id, productId, name, unit',
      transactions: '++id, invoiceNumber, status, createdAt',
      transactionItems: '++id, transactionId, productId',
      stockMovements: '++id, ingredientId, type, createdAt',
      settings: '++id',
      auditLogs: '++id, action, transactionId, invoiceNumber, timestamp',
    });

    // Version 7: Add categories table for user-managed categories
    this.version(7).stores({
      products: '++id, name, category, isActive',
      ingredients: '++id, productId, name, unit',
      transactions: '++id, invoiceNumber, status, createdAt',
      transactionItems: '++id, transactionId, productId',
      stockMovements: '++id, ingredientId, type, createdAt',
      settings: '++id',
      auditLogs: '++id, action, transactionId, invoiceNumber, timestamp',
      categories: '++id, name',
    });
  }
}

export const db = new KedaiUnguDB();

// ── Database Ready Gate ────────────────────────────────────────────
let dbReady: Promise<void> | null = null;

export async function ensureDatabaseReady(): Promise<void> {
  if (!dbReady) {
    dbReady = (async () => {
      if (!db.isOpen()) {
        await db.open();
      }

      // Migrate any remaining 'void' transactions to 'deleted'
      try {
        const voidTx = await db.transactions
          .where('status')
          .equals('void' as any)
          .toArray();
        for (const t of voidTx) {
          await db.transactions.update(t.id!, {
            status: 'deleted',
            deletedAt: t.deletedAt ?? new Date(),
          });
        }
      } catch { /* */ }
    })();
  }
  return dbReady;
}

export async function initializeDatabase(): Promise<void> {
  await ensureDatabaseReady();

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

  // Runtime migration for ingredients
  const ingredients = await db.ingredients.toArray();
  for (const ing of ingredients) {
    if (ing.purchaseCost === undefined || ing.purchaseQuantity === undefined || ing.unitCost === undefined) {
      const legacyPrice = ing.purchasePrice || 0;
      await db.ingredients.update(ing.id!, {
        purchaseCost: ing.purchaseCost ?? legacyPrice,
        purchaseQuantity: ing.purchaseQuantity ?? 1,
        unitCost: ing.unitCost ?? legacyPrice,
      });
    }
  }

  // Prepopulate default categories if empty
  const categoryCount = await db.categories.count();
  if (categoryCount === 0) {
    const defaultCategories = ['Makanan', 'Minuman', 'Camilan', 'Lainnya'];
    for (const name of defaultCategories) {
      await db.categories.add({ name });
    }
  }

  // ── Deduplicate categories on startup ──────────────────────────────
  const allCats = await db.categories.toArray();
  const seen = new Map<string, number>(); // normalized name → first id to keep
  const toDelete: number[] = [];

  for (const cat of allCats) {
    const key = cat.name.trim().toLowerCase();
    if (cat.id === undefined) continue;
    if (seen.has(key)) {
      // Duplicate found — mark for deletion
      toDelete.push(cat.id);
      // Update products using this category name to the canonical version
      const canonicalName = allCats.find(c => c.id === seen.get(key))?.name.trim() || cat.name.trim();
      await db.products.where('category').equals(cat.name).modify({ category: canonicalName });
    } else {
      seen.set(key, cat.id);
      // Trim whitespace from canonical entry
      const trimmed = cat.name.trim();
      if (trimmed !== cat.name) {
        await db.categories.update(cat.id, { name: trimmed });
        // Update products with the untrimmed version
        await db.products.where('category').equals(cat.name).modify({ category: trimmed });
      }
    }
  }

  // Delete duplicates
  for (const id of toDelete) {
    await db.categories.delete(id);
  }

  if (toDelete.length > 0) {
    console.log(`Cleaned up ${toDelete.length} duplicate categories`);
  }
}