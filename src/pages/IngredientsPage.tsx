import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  BeakerIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  ArrowPathIcon,
  MinusIcon,
} from '@heroicons/react/24/outline';
import { db } from '../database';
import type { Ingredient, StockMovement, Product } from '../types';
import { UNIT_OPTIONS } from '../types';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';

type TabType = 'stock' | 'movement';

type StockBadge = 'normal' | 'low' | 'empty';

function getBadge(item: Ingredient): StockBadge {
  if (item.stock <= 0) return 'empty';
  if (item.stock <= item.minStock) return 'low';
  return 'normal';
}

const badgeConfig: Record<StockBadge, { label: string; className: string }> = {
  normal: {
    label: 'Normal',
    className: 'text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/50',
  },
  low: {
    label: 'Hampir Habis',
    className: 'text-orange-700 bg-orange-100 dark:text-orange-300 dark:bg-orange-900/50',
  },
  empty: {
    label: 'Habis',
    className: 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/50',
  },
};

export default function IngredientsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('stock');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal: Create
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newInitialStock, setNewInitialStock] = useState('');
  const [newUnit, setNewUnit] = useState('pcs');
  const [newMinStock, setNewMinStock] = useState('');
  const [newNote, setNewNote] = useState('');
  const [newProductId, setNewProductId] = useState<number | ''>('');

  // Modal: Edit Info
  const [editTarget, setEditTarget] = useState<Ingredient | null>(null);
  const [editName, setEditName] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [editMinStock, setEditMinStock] = useState('');
  const [editProductId, setEditProductId] = useState<number | null>(null);
  const [editNote, setEditNote] = useState('');

  // Modal: Add Stock
  const [addStockTarget, setAddStockTarget] = useState<Ingredient | null>(null);
  const [addStockQty, setAddStockQty] = useState('');
  const [addStockReason, setAddStockReason] = useState('');

  // Modal: Reduce Stock
  const [reduceStockTarget, setReduceStockTarget] = useState<Ingredient | null>(null);
  const [reduceStockQty, setReduceStockQty] = useState('');
  const [reduceStockReason, setReduceStockReason] = useState('');

  // Delete confirmation modal
  const [deleteStockTarget, setDeleteStockTarget] = useState<Ingredient | null>(null);
  const [deleteStockError, setDeleteStockError] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [allIngredients, allMovements, allProducts] = await Promise.all([
        db.ingredients.toArray(),
        db.stockMovements.orderBy('createdAt').reverse().toArray(),
        db.products.toArray(),
      ]);
      setIngredients(allIngredients.reverse());
      setMovements(allMovements);
      setProducts(allProducts.filter(p => p.isActive !== 0));
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredIngredients = ingredients.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  const tabs: { key: TabType; label: string }[] = [
    { key: 'stock', label: 'Stok Saat Ini' },
    { key: 'movement', label: 'Riwayat Stok' },
  ];

  // ── Create Stock ──────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) { toast.error('Nama stok harus diisi'); return; }

    const initialStock = Number(newInitialStock) || 0;
    const minStock = Number(newMinStock) || 0;

    try {
      const id = await db.ingredients.add({
        name: newName.trim(),
        productId: newProductId || undefined,
        // Legacy HPP fields — set to default since HPP is removed
        purchasePrice: 0,
        purchaseCost: 0,
        purchaseQuantity: initialStock || 1,
        unitCost: 0,
        unit: newUnit,
        stock: initialStock,
        minStock,
        note: newNote.trim() || undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Log audit in requested format
      const dateStr = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const auditDesc = [
        `Tambah Stok`,
        newName.trim(),
        `\n+${initialStock} ${newUnit}`,
        `\nCatatan:\n${newNote.trim() || 'Stok Awal'}`,
        `\nTanggal:\n${dateStr}`
      ].join('\n');

      await db.auditLogs.add({
        action: 'TAMBAH_STOK',
        transactionId: 0,
        invoiceNumber: '',
        timestamp: new Date(),
        description: auditDesc,
      });

      // Record incoming stock movement if initial stock > 0
      if (initialStock > 0) {
        await db.stockMovements.add({
          ingredientId: id as number,
          ingredientName: newName.trim(),
          type: 'in',
          quantity: initialStock,
          reference: newNote.trim() || 'Stok Awal',
          createdAt: new Date(),
        });
      }

      setShowCreateModal(false);
      resetCreateForm();
      await loadData();
      toast.success('Stok berhasil ditambahkan');
    } catch (error) {
      console.error('Failed to create stock:', error);
      toast.error('Gagal menambah stok');
    }
  };

  const resetCreateForm = () => {
    setNewName('');
    setNewInitialStock('');
    setNewUnit('pcs');
    setNewMinStock('');
    setNewNote('');
    setNewProductId('');
  };

  // ── Edit Info ─────────────────────────────────────────────────────
  const openEditInfo = (item: Ingredient) => {
    setEditTarget(item);
    setEditName(item.name);
    setEditUnit(item.unit);
    setEditMinStock(item.minStock.toString());
    setEditProductId(item.productId ?? null);
    setEditNote(item.note || '');
  };

  const handleEditInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget?.id) return;
    if (!editName.trim()) { toast.error('Nama stok harus diisi'); return; }

    try {
      const oldName = editTarget.name;
      await db.ingredients.update(editTarget.id, {
        name: editName.trim(),
        productId: editProductId || undefined,
        unit: editUnit,
        minStock: Number(editMinStock) || 0,
        note: editNote.trim() || undefined,
        updatedAt: new Date(),
      });

      const dateStr = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
      await db.auditLogs.add({
        action: 'EDIT_STOK',
        transactionId: 0,
        invoiceNumber: '',
        timestamp: new Date(),
        description: [
          `Edit Stok`,
          `${oldName} → ${editName.trim()}`,
          `\nSatuan: ${editUnit}`,
          `Min Stok: ${Number(editMinStock) || 0}`,
          `\nCatatan:\n${editNote.trim() || '-'}`,
          `\nTanggal:\n${dateStr}`
        ].join('\n'),
      });

      setEditTarget(null);
      await loadData();
      toast.success('Info stok diperbarui');
    } catch (error) {
      console.error('Failed to update stock info:', error);
      toast.error('Gagal memperbarui info stok');
    }
  };

  // ── Add Stock (Adjustment) ────────────────────────────────────────
  const openAddStock = (item: Ingredient) => {
    setAddStockTarget(item);
    setAddStockQty('');
    setAddStockReason('');
  };

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addStockTarget?.id) return;
    const qty = Number(addStockQty);
    if (qty <= 0) { toast.error('Jumlah harus lebih dari 0'); return; }

    try {
      const newStock = addStockTarget.stock + qty;
      await db.ingredients.update(addStockTarget.id, {
        stock: newStock,
        updatedAt: new Date(),
      });

      await db.stockMovements.add({
        ingredientId: addStockTarget.id,
        ingredientName: addStockTarget.name,
        type: 'in',
        quantity: qty,
        reference: addStockReason.trim() || 'Penyesuaian Manual',
        createdAt: new Date(),
      });

      const dateStr = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
      await db.auditLogs.add({
        action: 'TAMBAH_STOK_MANUAL',
        transactionId: 0,
        invoiceNumber: '',
        timestamp: new Date(),
        description: [
          `Tambah Stok`,
          addStockTarget.name,
          `\n+${qty} ${addStockTarget.unit}`,
          `\nCatatan:\n${addStockReason.trim() || 'Penyesuaian Manual'}`,
          `\nTanggal:\n${dateStr}`
        ].join('\n'),
      });

      setAddStockTarget(null);
      await loadData();
      toast.success(`Stok ${addStockTarget.name} ditambah ${qty}`);
    } catch (error) {
      console.error('Failed to add stock:', error);
      toast.error('Gagal menambah stok');
    }
  };

  // ── Reduce Stock (Adjustment) ─────────────────────────────────────
  const openReduceStock = (item: Ingredient) => {
    setReduceStockTarget(item);
    setReduceStockQty('');
    setReduceStockReason('');
  };

  const handleReduceStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reduceStockTarget?.id) return;
    const qty = Number(reduceStockQty);
    if (qty <= 0) { toast.error('Jumlah harus lebih dari 0'); return; }
    if (qty > reduceStockTarget.stock) { toast.error('Stok tidak mencukupi'); return; }

    try {
      const newStock = reduceStockTarget.stock - qty;
      await db.ingredients.update(reduceStockTarget.id, {
        stock: newStock,
        updatedAt: new Date(),
      });

      await db.stockMovements.add({
        ingredientId: reduceStockTarget.id,
        ingredientName: reduceStockTarget.name,
        type: 'out',
        quantity: qty,
        reference: reduceStockReason.trim() || 'Penyesuaian Manual',
        createdAt: new Date(),
      });

      const dateStr = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
      await db.auditLogs.add({
        action: 'KURANGI_STOK',
        transactionId: 0,
        invoiceNumber: '',
        timestamp: new Date(),
        description: [
          `Kurangi Stok`,
          reduceStockTarget.name,
          `\n-${qty} ${reduceStockTarget.unit}`,
          `\nCatatan:\n${reduceStockReason.trim() || 'Penyesuaian Manual'}`,
          `\nTanggal:\n${dateStr}`
        ].join('\n'),
      });

      setReduceStockTarget(null);
      await loadData();
      toast.success(`Stok ${reduceStockTarget.name} dikurangi ${qty}`);
    } catch (error) {
      console.error('Failed to reduce stock:', error);
      toast.error('Gagal mengurangi stok');
    }
  };

  // ── Delete ────────────────────────────────────────────────────────
  const handleDelete = async (item: Ingredient) => {
    // Replaced by openDeleteStockModal with confirmation popup
    await openDeleteStockModal(item);
  };

  const openDeleteStockModal = async (item: Ingredient) => {
    if (!item.id) return;

    // Validate: check if stock is linked to an active product
    if (item.productId) {
      const linkedProduct = await db.products.get(item.productId);
      if (linkedProduct) {
        setDeleteStockError(
          `Stok ini masih terhubung dengan produk:\n\n${linkedProduct.name}\n\nLepaskan hubungan terlebih dahulu sebelum menghapus.`
        );
        return;
      }
    }

    setDeleteStockTarget(item);
    setDeleteStockError('');
  };

  const confirmDeleteStock = async () => {
    if (!deleteStockTarget?.id) return;

    try {
      // Delete related stock movements too
      await db.stockMovements.where('ingredientId').equals(deleteStockTarget.id).delete();
      await db.ingredients.delete(deleteStockTarget.id);

      await db.auditLogs.add({
        action: 'DELETE_STOCK',
        transactionId: 0,
        invoiceNumber: '',
        timestamp: new Date(),
        description: [
          'Hapus Stok',
          `Nama: ${deleteStockTarget.name}`,
          `Stok akhir: ${deleteStockTarget.stock} ${deleteStockTarget.unit}`,
          `\nTanggal: ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })}`,
          `Jam: ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`,
        ].join('\n'),
        beforeData: JSON.stringify(deleteStockTarget),
      });

      await loadData();
      setDeleteStockTarget(null);
      toast.success('Stok berhasil dihapus');
    } catch (error) {
      console.error('Failed to delete stock:', error);
      toast.error('Gagal menghapus stok');
    }
  };

  // ── Movement Display Helpers ──────────────────────────────────────
  function getMovementIcon(type: string, ref: string) {
    if (ref.startsWith('VOID-')) return <ArrowPathIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
    if (ref.startsWith('RESTORE-')) return <ArrowPathIcon className="w-4 h-4 text-orange-600 dark:text-orange-400" />;
    if (ref.startsWith('INV-') || ref.startsWith('INV')) return <ArrowTrendingDownIcon className="w-4 h-4 text-red-600 dark:text-red-400" />;
    if (type === 'in') return <ArrowTrendingUpIcon className="w-4 h-4 text-green-600 dark:text-green-400" />;
    return <ArrowTrendingDownIcon className="w-4 h-4 text-red-600 dark:text-red-400" />;
  }

  function getMovementBg(type: string, ref: string) {
    if (ref.startsWith('VOID-')) return 'bg-purple-50 dark:bg-purple-950';
    if (ref.startsWith('RESTORE-')) return 'bg-orange-50 dark:bg-orange-950';
    if (ref.startsWith('INV-') || ref.startsWith('INV')) return 'bg-red-50 dark:bg-red-950';
    if (type === 'in') return 'bg-green-50 dark:bg-green-950';
    return 'bg-red-50 dark:bg-red-950';
  }

  function getMovementLabel(ref: string): string {
    if (ref.startsWith('VOID-')) return '↩ Void';
    if (ref.startsWith('RESTORE-')) return '↪ Restore';
    if (ref.startsWith('INV-') || ref.startsWith('INV')) return '➖ Keluar';
    if (ref === 'Stok Awal') return '➕ Stok Awal';
    if (ref === 'Penyesuaian Manual') return '✏ Koreksi';
    return '➕ Masuk';
  }

  // ── Render ────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Stok</h1>
        {activeTab === 'stock' && (
          <button
            onClick={() => { resetCreateForm(); setShowCreateModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
          >
            <PlusIcon className="w-4 h-4" />
            Tambah Stok
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-[#111827] rounded-2xl p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === tab.key
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      {activeTab === 'stock' && (
        <div className="relative mb-6">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Cari stok..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
          />
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-gray-200 dark:bg-[#111827] rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : activeTab === 'stock' ? (
        /* ===== STOK SAAT INI ===== */
        filteredIngredients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
            <BeakerIcon className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg font-medium">Belum ada stok</p>
            <p className="text-sm mt-1">Tambahkan item stok pertama Anda</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredIngredients.map((item, index) => {
              const badge = getBadge(item);
              const badgeInfo = badgeConfig[badge];

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.02 }}
                  className={`bg-white dark:bg-gray-900 rounded-2xl shadow-sm border p-4 ${
                    badge === 'low'
                      ? 'border-orange-200 dark:border-orange-900'
                      : badge === 'empty'
                      ? 'border-red-200 dark:border-red-900'
                      : 'border-gray-100 dark:border-gray-800'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        badge === 'normal'
                          ? 'bg-blue-50 dark:bg-blue-950'
                          : badge === 'low'
                          ? 'bg-orange-50 dark:bg-orange-950'
                          : 'bg-red-50 dark:bg-red-950'
                      }`}>
                        <BeakerIcon className={`w-5 h-5 ${
                          badge === 'normal'
                            ? 'text-blue-500'
                            : badge === 'low'
                            ? 'text-orange-500'
                            : 'text-red-500'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium text-gray-900 dark:text-white text-sm">{item.name}</h3>
                          <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full ${badgeInfo.className}`}>
                            {badge === 'empty' && <ExclamationTriangleIcon className="w-3 h-3 mr-1" />}
                            {badgeInfo.label}
                          </span>
                        </div>
                        {item.productId && (() => {
                          const linkedProduct = products.find(p => p.id === item.productId);
                          return linkedProduct ? (
                            <p className="text-[10px] text-primary-600 dark:text-primary-400 mt-0.5">
                              🔗 Terhubung ke: {linkedProduct.name}
                            </p>
                          ) : null;
                        })()}
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                          <span>
                            Stok:{' '}
                            <strong className={badge !== 'normal' ? `font-semibold ${
                              badge === 'empty' ? 'text-red-500' : 'text-orange-600 dark:text-orange-400'
                            }` : 'text-gray-900 dark:text-white'}>
                              {item.stock} {item.unit}
                            </strong>
                          </span>
                          <span>
                            Minimum:{' '}
                            <strong className="text-gray-900 dark:text-white">{item.minStock} {item.unit}</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 ml-3">
                      <button
                        onClick={() => openEditInfo(item)}
                        title="Edit Info"
                        className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openAddStock(item)}
                        title="Tambah Stok"
                        className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950 rounded-lg transition-colors"
                      >
                        <PlusIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openReduceStock(item)}
                        title="Kurangi Stok"
                        className="p-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950 rounded-lg transition-colors"
                      >
                        <MinusIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        title="Hapus"
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
        )
      ) : (
        /* ===== RIWAYAT STOK ===== */
        movements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
            <ArrowTrendingDownIcon className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg font-medium">Belum ada riwayat stok</p>
            <p className="text-sm mt-1">Riwayat stok keluar/masuk akan muncul di sini</p>
          </div>
        ) : (
          <div className="space-y-2">
            {movements.map((movement, index) => (
              <motion.div
                key={movement.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15, delay: index * 0.005 }}
                className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800"
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${getMovementBg(movement.type, movement.reference)}`}>
                  {getMovementIcon(movement.type, movement.reference)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {getMovementLabel(movement.reference)}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{movement.ingredientName}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    <span>{movement.reference}</span>
                    <span>•</span>
                    <span>{new Date(movement.createdAt).toLocaleString('id-ID', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-bold ${
                    movement.type === 'in'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {movement.type === 'in' ? '+' : '-'}{movement.quantity}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )
      )}

      {/* ===== MODAL: TAMBAH STOK (Create) ===== */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); resetCreateForm(); }}
        title="Tambah Stok"
        size="md"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Stok</label>
            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-[#111827] border border-gray-200 dark:border-white/[0.08] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
              placeholder="Contoh: Kebab Mini Frozen" autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Link ke Produk <span className="text-gray-400 font-normal">(opsional — untuk stok POS)</span></label>
            <select value={newProductId} onChange={(e) => setNewProductId(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-[#111827] border border-gray-200 dark:border-white/[0.08] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white">
              <option value="">— Tidak di-link —</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-400">Stok akan otomatis berkurang saat produk ini dijual di POS.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jumlah Masuk</label>
            <input type="number" value={newInitialStock} onChange={(e) => setNewInitialStock(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-[#111827] border border-gray-200 dark:border-white/[0.08] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
              placeholder="0" min="0" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Satuan</label>
            <select value={newUnit} onChange={(e) => setNewUnit(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-[#111827] border border-gray-200 dark:border-white/[0.08] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white">
              {UNIT_OPTIONS.map((unit) => (<option key={unit} value={unit}>{unit}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stok Minimum</label>
            <input type="number" value={newMinStock} onChange={(e) => setNewMinStock(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-[#111827] border border-gray-200 dark:border-white/[0.08] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
              placeholder="0" min="0" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Catatan (Opsional)</label>
            <input type="text" value={newNote} onChange={(e) => setNewNote(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-[#111827] border border-gray-200 dark:border-white/[0.08] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
              placeholder="Catatan..." />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => { setShowCreateModal(false); resetCreateForm(); }}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#111827] rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">Batal</button>
            <button type="submit"
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors">Simpan</button>
          </div>
        </form>
      </Modal>

      {/* ===== MODAL: EDIT INFO ===== */}
      <Modal
        isOpen={editTarget !== null}
        onClose={() => setEditTarget(null)}
        title="Edit Info Stok"
        size="md"
      >
        <form onSubmit={handleEditInfo} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Stok</label>
            <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-[#111827] border border-gray-200 dark:border-white/[0.08] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
              placeholder="Contoh: Kebab Mini Frozen" autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Link ke Produk <span className="text-gray-400 font-normal">(opsional — untuk stok POS)</span></label>
            <select value={editProductId ?? ''} onChange={(e) => setEditProductId(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-[#111827] border border-gray-200 dark:border-white/[0.08] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white">
              <option value="">— Tidak di-link —</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-400">Stok akan otomatis berkurang saat produk ini dijual di POS.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jumlah Stok Saat Ini</label>
            <div className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-white/[0.08] rounded-lg text-sm text-gray-900 dark:text-white font-medium cursor-default select-none">
              {editTarget?.stock ?? '—'} {editTarget?.unit || ''}
            </div>
            <p className="mt-1 text-xs text-gray-400">Stok hanya bisa diubah melalui tombol +Tambah atau -Kurangi.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Satuan</label>
            <select value={editUnit} onChange={(e) => setEditUnit(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-[#111827] border border-gray-200 dark:border-white/[0.08] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white">
              {UNIT_OPTIONS.map((unit) => (<option key={unit} value={unit}>{unit}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stok Minimum</label>
            <input type="number" value={editMinStock} onChange={(e) => setEditMinStock(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-[#111827] border border-gray-200 dark:border-white/[0.08] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
              placeholder="0" min="0" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Catatan (Opsional)</label>
            <input type="text" value={editNote} onChange={(e) => setEditNote(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-[#111827] border border-gray-200 dark:border-white/[0.08] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
              placeholder="Catatan..." />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setEditTarget(null)}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#111827] rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">Batal</button>
            <button type="submit"
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors">Simpan</button>
          </div>
        </form>
      </Modal>

      {/* ===== MODAL: TAMBAH STOK (Adjustment) ===== */}
      <Modal
        isOpen={addStockTarget !== null}
        onClose={() => setAddStockTarget(null)}
        title={`Tambah Stok: ${addStockTarget?.name || ''}`}
        size="sm"
      >
        <form onSubmit={handleAddStock} className="space-y-4">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            Stok saat ini: <strong className="text-gray-900 dark:text-white">{addStockTarget?.stock} {addStockTarget?.unit}</strong>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jumlah</label>
            <input type="number" value={addStockQty} onChange={(e) => setAddStockQty(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-[#111827] border border-gray-200 dark:border-white/[0.08] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
              placeholder="0" min="1" autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Alasan</label>
            <input type="text" value={addStockReason} onChange={(e) => setAddStockReason(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-[#111827] border border-gray-200 dark:border-white/[0.08] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
              placeholder="Contoh: Pembelian Supplier" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setAddStockTarget(null)}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#111827] rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">Batal</button>
            <button type="submit"
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors">Tambah</button>
          </div>
        </form>
      </Modal>

      {/* ===== MODAL: KURANGI STOK (Adjustment) ===== */}
      <Modal
        isOpen={reduceStockTarget !== null}
        onClose={() => setReduceStockTarget(null)}
        title={`Kurangi Stok: ${reduceStockTarget?.name || ''}`}
        size="sm"
      >
        <form onSubmit={handleReduceStock} className="space-y-4">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            Stok saat ini: <strong className="text-gray-900 dark:text-white">{reduceStockTarget?.stock} {reduceStockTarget?.unit}</strong>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jumlah</label>
            <input type="number" value={reduceStockQty} onChange={(e) => setReduceStockQty(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-[#111827] border border-gray-200 dark:border-white/[0.08] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
              placeholder="0" min="1" max={reduceStockTarget?.stock || 0} autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Alasan</label>
            <input type="text" value={reduceStockReason} onChange={(e) => setReduceStockReason(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-[#111827] border border-gray-200 dark:border-white/[0.08] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
              placeholder="Contoh: Barang Rusak" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setReduceStockTarget(null)}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#111827] rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">Batal</button>
            <button type="submit"
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors">Kurangi</button>
          </div>
        </form>
      </Modal>

      {/* ===== MODAL: KONFIRMASI HAPUS STOK ===== */}
      <Modal
        isOpen={deleteStockTarget !== null || !!deleteStockError}
        onClose={() => { setDeleteStockTarget(null); setDeleteStockError(''); }}
        title={deleteStockError ? 'Tidak Dapat Menghapus' : 'Hapus Stok'}
        size="sm"
      >
        {deleteStockError ? (
          <div className="space-y-4">
            <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
              {deleteStockError}
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setDeleteStockError('')}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#111827] rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                Tutup
              </button>
            </div>
          </div>
        ) : deleteStockTarget ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Apakah Anda yakin ingin menghapus data stok ini?
            </p>
            <div className="bg-gray-50 dark:bg-[#111827] rounded-lg p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Nama Stok:</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{deleteStockTarget.name}</p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Riwayat stok akan tetap tersimpan pada Log Aktivitas.</p>
            <p className="text-xs text-red-500">Tindakan ini tidak dapat dibatalkan.</p>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setDeleteStockTarget(null)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#111827] rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                Batal
              </button>
              <button type="button" onClick={confirmDeleteStock}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors">
                Hapus
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </motion.div>
  );
}