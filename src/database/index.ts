import Dexie, { type EntityTable } from 'dexie';
import type {
  Product,
  Ingredient,
  Recipe,
  Transaction,
  TransactionItem,
  StockMovement,
  AppSettings,
  AuditLog,
} from '../types';

class KedaiUnguDB extends Dexie {
  products!: EntityTable<Product, 'id'>;
  ingredients!: EntityTable<Ingredient, 'id'>;
  recipes!: EntityTable<Recipe, 'id'>;
  transactions!: EntityTable<Transaction, 'id'>;
  transactionItems!: EntityTable<TransactionItem, 'id'>;
  stockMovements!: EntityTable<StockMovement, 'id'>;
  settings!: EntityTable<AppSettings, 'id'>;
  auditLogs!: EntityTable<AuditLog, 'id'>;

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

      // auditLogs table was removed previously; version 4 re-adds it properly
      try {
        // no-op: table drop not possible in Dexie upgrade
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
      // Note: auditLogs removed from schema but table may still exist in IndexedDB
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

  // Runtime migration for recipes
  const recipes = await db.recipes.toArray();
  for (const recipe of recipes) {
    if (recipe.productionQuantity === undefined) {
      await db.recipes.update(recipe.id!, { productionQuantity: 1 });
    }
  }
}