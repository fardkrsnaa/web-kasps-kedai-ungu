import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  BeakerIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { db } from '../database';
import type { Ingredient } from '../types';
import { UNIT_OPTIONS } from '../types';
import { formatCurrency } from '../utils/format';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';

export default function IngredientsPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formPurchaseCost, setFormPurchaseCost] = useState('');
  const [formPurchaseQuantity, setFormPurchaseQuantity] = useState('');
  const [formUnit, setFormUnit] = useState('pcs');
  const [formStock, setFormStock] = useState('');
  const [formMinStock, setFormMinStock] = useState('');

  // Auto-calculated unit cost preview
  const previewUnitCost = useMemo(() => {
    const cost = Number(formPurchaseCost) || 0;
    const qty = Number(formPurchaseQuantity) || 0;
    if (qty <= 0) return 0;
    return cost / qty;
  }, [formPurchaseCost, formPurchaseQuantity]);

  const loadIngredients = useCallback(async () => {
    try {
      setLoading(true);
      const data = await db.ingredients.toArray();
      setIngredients(data.reverse());
    } catch (error) {
      console.error('Failed to load ingredients:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIngredients();
  }, [loadIngredients]);

  const resetForm = () => {
    setFormName('');
    setFormPurchaseCost('');
    setFormPurchaseQuantity('');
    setFormUnit('pcs');
    setFormStock('');
    setFormMinStock('');
    setEditingIngredient(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (ingredient: Ingredient) => {
    setEditingIngredient(ingredient);
    setFormName(ingredient.name);
    setFormPurchaseCost((ingredient.purchaseCost || ingredient.purchasePrice).toString());
    setFormPurchaseQuantity((ingredient.purchaseQuantity || 1).toString());
    setFormUnit(ingredient.unit);
    setFormStock(ingredient.stock.toString());
    setFormMinStock(ingredient.minStock.toString());
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formName.trim()) {
      toast.error('Nama bahan harus diisi');
      return;
    }
    const cost = Number(formPurchaseCost);
    if (cost <= 0) {
      toast.error('Masukkan total harga pembelian');
      return;
    }
    const qty = Number(formPurchaseQuantity);
    if (qty <= 0) {
      toast.error('Masukkan jumlah pembelian');
      return;
    }

    const unitCost = cost / qty;

    try {
      if (editingIngredient?.id) {
        await db.ingredients.update(editingIngredient.id, {
          name: formName.trim(),
          purchasePrice: unitCost,
          purchaseCost: cost,
          purchaseQuantity: qty,
          unitCost,
          stock: Number(formStock) || 0,
          unit: formUnit,
          minStock: Number(formMinStock) || 0,
          updatedAt: new Date(),
        });
        toast.success('Bahan berhasil diperbarui');
      } else {
        await db.ingredients.add({
          name: formName.trim(),
          purchasePrice: unitCost,
          purchaseCost: cost,
          purchaseQuantity: qty,
          unitCost,
          stock: Number(formStock) || 0,
          unit: formUnit,
          minStock: Number(formMinStock) || 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        toast.success('Bahan berhasil ditambahkan');
      }
      setShowModal(false);
      resetForm();
      await loadIngredients();
    } catch (error) {
      console.error('Failed to save ingredient:', error);
      toast.error('Gagal menyimpan bahan');
    }
  };

  const handleDelete = async (ingredient: Ingredient) => {
    if (!ingredient.id) return;
    if (!window.confirm(`Hapus bahan "${ingredient.name}"?`)) return;

    try {
      await db.ingredients.delete(ingredient.id);
      toast.success('Bahan berhasil dihapus');
      await loadIngredients();
    } catch (error) {
      console.error('Failed to delete ingredient:', error);
      toast.error('Gagal menghapus bahan');
    }
  };

  const filteredIngredients = ingredients.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Bahan Baku
        </h1>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
        >
          <PlusIcon className="w-4 h-4" />
          Tambah Bahan
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Cari bahan..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredIngredients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
          <BeakerIcon className="w-16 h-16 mb-4 opacity-50" />
          <p className="text-lg font-medium">Belum ada bahan baku</p>
          <p className="text-sm mt-1">Tambahkan bahan baku pertama Anda</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredIngredients.map((ingredient, index) => {
            const isLowStock = ingredient.stock <= ingredient.minStock;
            const unitCost = ingredient.unitCost || ingredient.purchasePrice;

            return (
              <motion.div
                key={ingredient.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.02 }}
                className={`bg-white dark:bg-gray-900 rounded-xl shadow-sm border p-4 ${
                  isLowStock
                    ? 'border-red-200 dark:border-red-900'
                    : 'border-gray-100 dark:border-gray-800'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isLowStock
                          ? 'bg-red-50 dark:bg-red-950'
                          : 'bg-blue-50 dark:bg-blue-950'
                      }`}
                    >
                      <BeakerIcon
                        className={`w-5 h-5 ${
                          isLowStock ? 'text-red-500' : 'text-blue-500'
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900 dark:text-white text-sm">
                          {ingredient.name}
                        </h3>
                        {isLowStock && (
                          <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950 rounded-full">
                            <ExclamationTriangleIcon className="w-3 h-3" />
                            Stok Menipis
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                        <span>
                          Stok:{' '}
                          <strong className={isLowStock ? 'text-red-500' : 'text-gray-900 dark:text-white'}>
                            {ingredient.stock} {ingredient.unit}
                          </strong>
                        </span>
                        <span>
                          Min:{' '}
                          <strong className="text-gray-900 dark:text-white">
                            {ingredient.minStock} {ingredient.unit}
                          </strong>
                        </span>
                        <span>
                          Harga/satuan:{' '}
                          <strong className="text-primary-600 dark:text-primary-400">
                            {formatCurrency(unitCost)}/{ingredient.unit}
                          </strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 ml-3">
                    <button
                      onClick={() => openEditModal(ingredient)}
                      className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      <PencilSquareIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(ingredient)}
                      className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editingIngredient ? 'Edit Bahan Baku' : 'Tambah Bahan Baku'}
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nama Bahan
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                placeholder="Contoh: Kebab Mini Frozen"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Total Harga Pembelian (Rp)
              </label>
              <input
                type="number"
                value={formPurchaseCost}
                onChange={(e) => setFormPurchaseCost(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                placeholder="Contoh: 25000"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Jumlah Pembelian
              </label>
              <input
                type="number"
                value={formPurchaseQuantity}
                onChange={(e) => setFormPurchaseQuantity(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                placeholder="Contoh: 10"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Satuan
              </label>
              <select
                value={formUnit}
                onChange={(e) => setFormUnit(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
              >
                {UNIT_OPTIONS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </div>

            {/* Harga per Satuan - Auto-calculated preview */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Harga per Satuan (otomatis)
              </label>
              <div className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-bold text-primary-600 dark:text-primary-400">
                {previewUnitCost > 0
                  ? `${formatCurrency(previewUnitCost)} / ${formUnit}`
                  : '- / ' + formUnit}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Stok Saat Ini
              </label>
              <input
                type="number"
                value={formStock}
                onChange={(e) => setFormStock(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                placeholder="0"
                min="0"
                step="0.1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Stok Minimum
              </label>
              <input
                type="number"
                value={formMinStock}
                onChange={(e) => setFormMinStock(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                placeholder="0"
                min="0"
                step="0.1"
              />
            </div>
          </div>

          {/* Live preview */}
          <AnimatePresence>
            {previewUnitCost > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 bg-primary-50 dark:bg-primary-950 border border-primary-200 dark:border-primary-800 rounded-xl"
              >
                <p className="text-xs text-primary-600 dark:text-primary-400 mb-1 font-medium">
                  Harga per {formUnit}
                </p>
                <p className="text-2xl font-bold text-primary-700 dark:text-primary-300">
                  {formatCurrency(previewUnitCost)}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
            >
              {editingIngredient ? 'Simpan' : 'Tambah'}
            </button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
}