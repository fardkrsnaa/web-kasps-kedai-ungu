import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpenIcon,
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { db } from '../database';
import type { Product, Ingredient } from '../types';
import { formatCurrency } from '../utils/format';
import {
  getRecipeByProduct,
  saveRecipe,
  getHppProfitForProduct,
  type RecipeFormItem,
} from '../services/hppEngine';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';

interface ProductWithRecipe {
  product: Product;
  recipeCount: number;
  hpp: number;
  profit: number;
  margin: number;
}

export default function RecipesPage() {
  const [products, setProducts] = useState<ProductWithRecipe[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [recipeItems, setRecipeItems] = useState<RecipeFormItem[]>([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [allProducts, allIngredients] = await Promise.all([
        db.products.toArray(),
        db.ingredients.toArray(),
      ]);

      const productsWithRecipe: ProductWithRecipe[] = [];
      for (const product of allProducts) {
        if (!product.id) continue;
        const recipes = await db.recipes
          .where('productId')
          .equals(product.id)
          .count();
        const { hpp, profit, margin } = await getHppProfitForProduct(product.id);
        productsWithRecipe.push({
          product,
          recipeCount: recipes,
          hpp,
          profit,
          margin,
        });
      }

      setProducts(productsWithRecipe.reverse());
      setIngredients(allIngredients);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openRecipeModal = async (product: Product) => {
    if (!product.id) return;
    setSelectedProduct(product);
    const recipes = await getRecipeByProduct(product.id);
    const formItems: RecipeFormItem[] = recipes.map((r) => ({
      productId: r.productId,
      ingredientId: r.ingredientId,
      quantity: r.quantity,
      ingredientName: r.ingredientName,
      ingredientUnit: r.ingredientUnit,
      purchasePrice: r.purchasePrice,
    }));
    setRecipeItems(formItems);

    // If no recipes exist, add empty slots
    if (recipes.length === 0) {
      setRecipeItems([]);
    }
    setShowModal(true);
  };

  const handleAddIngredient = () => {
    setRecipeItems((prev) => [
      ...prev,
      {
        productId: selectedProduct?.id ?? 0,
        ingredientId: 0,
        quantity: 0,
        ingredientName: '',
        ingredientUnit: '',
        purchasePrice: 0,
      },
    ]);
  };

  const handleRemoveIngredient = (index: number) => {
    setRecipeItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleIngredientChange = (index: number, ingredientId: number) => {
    const ingredient = ingredients.find((i) => i.id === ingredientId);
    setRecipeItems((prev) => {
      const current = prev[index] as RecipeFormItem;
      const updated = [...prev];
      updated[index] = {
        ingredientId,
        ingredientName: ingredient?.name ?? '',
        ingredientUnit: ingredient?.unit ?? '',
        purchasePrice: ingredient?.purchasePrice ?? 0,
        productId: current.productId,
        quantity: current.quantity,
      };
      return updated;
    });
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    setRecipeItems((prev) => {
      const current = prev[index] as RecipeFormItem;
      const updated = [...prev];
      updated[index] = { ...current, quantity };
      return updated;
    });
  };

  const handleSaveRecipe = async () => {
    if (!selectedProduct?.id) return;

    const validItems = recipeItems.filter(
      (item) => item.ingredientId > 0 && item.quantity > 0
    );

    if (validItems.length === 0) {
      toast.error('Tambahkan minimal 1 bahan');
      return;
    }

    try {
      await saveRecipe(
        selectedProduct.id,
        validItems.map((item) => ({
          ingredientId: item.ingredientId,
          quantity: item.quantity,
        }))
      );
      toast.success('Resep berhasil disimpan');
      setShowModal(false);
      await loadData();
    } catch (error) {
      console.error('Failed to save recipe:', error);
      toast.error('Gagal menyimpan resep');
    }
  };

  const availableIngredients = (index: number) => {
    const selectedIds = recipeItems.map((item) => item.ingredientId);
    return ingredients.filter(
      (ing) => !selectedIds.includes(ing.id ?? 0) || ing.id === recipeItems[index]?.ingredientId
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Resep Produk
        </h1>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
          <BookOpenIcon className="w-16 h-16 mb-4 opacity-50" />
          <p className="text-lg font-medium">Belum ada produk</p>
          <p className="text-sm mt-1">Tambahkan produk terlebih dahulu</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map(({ product, recipeCount, hpp, profit, margin }, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.03 }}
              className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                    <BookOpenIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white text-sm">
                      {product.name}
                    </h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {recipeCount} bahan | HPP: {formatCurrency(hpp)}
                    </span>
                  </div>
                </div>
                <span className="text-xs text-gray-400">{product.category}</span>
              </div>

              <div className="space-y-1 mb-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400">Harga Jual</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatCurrency(product.price)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400">HPP</span>
                  <span className="font-medium text-orange-600">{formatCurrency(hpp)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400">Profit</span>
                  <span className={`font-medium ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(profit)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400">Margin</span>
                  <span className={`font-medium ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {margin.toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mb-3">
                <div
                  className={`h-1.5 rounded-full transition-all ${
                    profit >= 0 ? 'bg-green-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(Math.max(margin, 0), 100)}%` }}
                />
              </div>

              <button
                onClick={() => openRecipeModal(product)}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900 transition-colors"
              >
                <BookOpenIcon className="w-4 h-4" />
                {recipeCount > 0 ? 'Edit Resep' : 'Atur Resep'}
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Recipe Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={`Resep: ${selectedProduct?.name ?? ''}`}
        size="lg"
      >
        <div className="space-y-4">
          {recipeItems.length === 0 && (
            <div className="text-center py-6 text-gray-400 dark:text-gray-500">
              <p className="text-sm">Belum ada bahan untuk produk ini</p>
              <p className="text-xs mt-1">Klik "Tambah Bahan" untuk menambahkan</p>
            </div>
          )}

          {recipeItems.map((item, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <div className="flex-1">
                <select
                  value={item.ingredientId}
                  onChange={(e) => handleIngredientChange(index, Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                >
                  <option value={0}>Pilih bahan...</option>
                  {availableIngredients(index).map((ing) => (
                    <option key={ing.id} value={ing.id ?? 0}>
                      {ing.name} (Stok: {ing.stock} {ing.unit})
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-24">
                <input
                  type="number"
                  value={item.quantity || ''}
                  onChange={(e) => handleQuantityChange(index, Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                  placeholder="Qty"
                  min="0"
                  step="0.1"
                />
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400 w-8">
                {item.ingredientUnit}
              </span>
              <button
                onClick={() => handleRemoveIngredient(index)}
                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          ))}

          <button
            onClick={handleAddIngredient}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium text-primary-600 dark:text-primary-400 border-2 border-dashed border-primary-200 dark:border-primary-800 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-950 transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            Tambah Bahan
          </button>

          {recipeItems.length > 0 && (
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Total HPP:</span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {formatCurrency(
                    recipeItems.reduce((sum, item) => {
                      return sum + item.purchasePrice * item.quantity;
                    }, 0)
                  )}
                </span>
              </div>
              {selectedProduct && (
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-gray-500 dark:text-gray-400">Harga Jual:</span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {formatCurrency(selectedProduct.price)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm mt-1 pt-1 border-t border-gray-200 dark:border-gray-700">
                <span className="text-gray-500 dark:text-gray-400">Estimasi Profit:</span>
                <span className="font-bold text-green-600">
                  {formatCurrency(
                    (selectedProduct?.price ?? 0) -
                      recipeItems.reduce((sum, item) => {
                        return sum + item.purchasePrice * item.quantity;
                      }, 0)
                  )}
                </span>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowModal(false)}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleSaveRecipe}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
            >
              <CheckCircleIcon className="w-4 h-4" />
              Simpan Resep
            </button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}