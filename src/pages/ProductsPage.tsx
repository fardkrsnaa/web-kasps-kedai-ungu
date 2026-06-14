import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  CubeIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { db } from '../database';
import type { Product, Category } from '../types';
import { formatCurrency } from '../utils/format';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formIsActive, setFormIsActive] = useState<number>(1);

  // Category management state
  const [showManageCatsModal, setShowManageCatsModal] = useState(false);
  const [showAddCatModal, setShowAddCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingCatName, setEditingCatName] = useState('');

  // Delete confirmation modal state
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState('');

  // Category delete modal state
  const [deleteCatTarget, setDeleteCatTarget] = useState<Category | null>(null);

  // Computed unique category list: merge DB categories + defaults, deduplicated
  const categoryOptions = useMemo(() => {
    const defaults = ['Makanan', 'Minuman', 'Camilan', 'Lainnya'];
    const seen = new Set<string>();
    const result: { id: number | undefined; name: string }[] = [];

    // Add defaults first, tracking normalized names
    for (const name of defaults) {
      const key = name.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        // Check if there's a DB category with this name
        const dbCat = categories.find(c => c.name.trim().toLowerCase() === key);
        result.push({ id: dbCat?.id, name: name.trim() });
      }
    }
    // Add remaining DB categories not covered by defaults
    for (const cat of categories) {
      const key = cat.name.trim().toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        result.push({ id: cat.id, name: cat.name.trim() });
      }
    }

    return result;
  }, [categories]);

  const loadCategories = useCallback(async () => {
    try {
      const data = await db.categories.toArray();
      setCategories(data);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await db.products.toArray();
      setProducts(data.reverse());
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, [loadProducts, loadCategories]);

  const resetForm = () => {
    setFormName('');
    setFormPrice('');
    setFormCategory('');
    setFormIsActive(1);
    setEditingProduct(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormName(product.name);
    setFormPrice(product.price.toString());
    setFormCategory(product.category);
    setFormIsActive(product.isActive);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formName.trim()) {
      toast.error('Nama produk harus diisi');
      return;
    }
    const price = Number(formPrice);
    if (price <= 0) {
      toast.error('Harga jual harus lebih dari 0');
      return;
    }

    try {
      if (editingProduct?.id) {
        await db.products.update(editingProduct.id, {
          name: formName.trim(),
          price,
          category: (formCategory || 'Lainnya').trim(),
          isActive: formIsActive,
          updatedAt: new Date(),
        });
        await db.auditLogs.add({
          action: 'EDIT_PRODUK',
          transactionId: 0,
          invoiceNumber: '',
          timestamp: new Date(),
          description: `Edit produk: ${editingProduct.name} -> ${formName.trim()}`,
        });
        toast.success('Produk berhasil diperbarui');
      } else {
        await db.products.add({
          name: formName.trim(),
          price,
          category: (formCategory || 'Lainnya').trim(),
          isActive: formIsActive,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        await db.auditLogs.add({
          action: 'TAMBAH_PRODUK',
          transactionId: 0,
          invoiceNumber: '',
          timestamp: new Date(),
          description: `Tambah produk: ${formName.trim()}`,
        });
        toast.success('Produk berhasil ditambahkan');
      }
      setShowModal(false);
      resetForm();
      await loadProducts();
    } catch (error) {
      console.error('Failed to save product:', error);
      toast.error('Gagal menyimpan produk');
    }
  };

  const handleDelete = async (product: Product) => {
    // Replaced by openDeleteModal with confirmation popup
    await openDeleteModal(product);
  };

  const openDeleteModal = async (product: Product) => {
    if (!product.id) return;
    
    // Validate: check if product is linked to any stock
    const linkedStock = await db.ingredients
      .where('productId')
      .equals(product.id)
      .toArray();
    
    if (linkedStock.length > 0) {
      const stockNames = linkedStock.map(s => s.name).join(', ');
      setDeleteErrorMessage(
        `Produk tidak dapat dihapus karena masih terhubung dengan stok:\n\n${stockNames}\n\nSilakan lepaskan hubungan dengan stok terlebih dahulu.`
      );
      return;
    }

    setDeleteTarget(product);
    setDeleteErrorMessage('');
  };

  const confirmDeleteProduct = async () => {
    if (!deleteTarget?.id) return;

    try {
      await db.products.delete(deleteTarget.id);
      await db.auditLogs.add({
        action: 'HAPUS_PRODUK',
        transactionId: 0,
        invoiceNumber: '',
        timestamp: new Date(),
        description: [
          'Hapus Produk',
          `Nama: ${deleteTarget.name}`,
          `Kategori: ${deleteTarget.category}`,
          `Harga: ${formatCurrency(deleteTarget.price)}`,
          `\nTanggal: ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })}`,
          `Jam: ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`,
        ].join('\n'),
        beforeData: JSON.stringify(deleteTarget),
      });
      toast.success('Produk berhasil dihapus');
      setDeleteTarget(null);
      await loadProducts();
    } catch (error) {
      console.error('Failed to delete product:', error);
      toast.error('Gagal menghapus produk');
    }
  };

  const handleToggleActive = async (product: Product) => {
    if (!product.id) return;
    try {
      await db.products.update(product.id, {
        isActive: product.isActive ? 0 : 1,
        updatedAt: new Date(),
      });
      toast.success(product.isActive ? 'Produk dinonaktifkan' : 'Produk diaktifkan');
      await loadProducts();
    } catch (error) {
      console.error('Failed to toggle product:', error);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) return;

    try {
      // Check for existing category (case-insensitive)
      const existing = await db.categories
        .filter(cat => cat.name.trim().toLowerCase() === trimmed.toLowerCase())
        .count();
      
      if (existing > 0) {
        toast.error('Kategori sudah ada.');
        return;
      }

      await db.categories.add({ name: trimmed });
      await db.auditLogs.add({
        action: 'TAMBAH_KATEGORI',
        transactionId: 0,
        invoiceNumber: '',
        timestamp: new Date(),
        description: `Tambah kategori produk: ${trimmed}`,
      });
      toast.success('Kategori berhasil ditambahkan');
      setNewCatName('');
      setShowAddCatModal(false);
      await loadCategories();
      // Auto select it if from product form
      if (showModal) {
        setFormCategory(trimmed);
      }
    } catch (error) {
      console.error('Failed to add category:', error);
      toast.error('Gagal menambah kategori');
    }
  };

  const handleEditCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory?.id || !editingCatName.trim()) return;
    try {
      const oldName = editingCategory.name;
      const newName = editingCatName.trim();

      // Check if new name already exists (case-insensitive, excluding self)
      const duplicate = await db.categories
        .filter(cat => cat.id !== editingCategory.id && cat.name.trim().toLowerCase() === newName.toLowerCase())
        .count();
      if (duplicate > 0) {
        toast.error('Kategori sudah ada.');
        return;
      }

      await db.categories.update(editingCategory.id, { name: newName });
      
      // Update all products using this category
      await db.products.where('category').equals(oldName).modify({ category: newName });
      
      await db.auditLogs.add({
        action: 'EDIT_KATEGORI',
        transactionId: 0,
        invoiceNumber: '',
        timestamp: new Date(),
        description: `Edit kategori produk: ${oldName} -> ${newName}`,
      });
      
      toast.success('Kategori berhasil diperbarui');
      setEditingCategory(null);
      await loadCategories();
      await loadProducts();
    } catch (error) {
      console.error('Failed to edit category:', error);
      toast.error('Gagal memperbarui kategori');
    }
  };

  const handleDeleteCategory = async (category: Category) => {
    if (!category.id) return;
    
    // Check usage
    const count = await db.products.where('category').equals(category.name).count();
    if (count > 0) {
      toast.error('Kategori masih digunakan oleh produk. Pindahkan produk terlebih dahulu.');
      return;
    }
    
    // Open confirmation modal instead of window.confirm
    setDeleteCatTarget(category);
  };

  const confirmDeleteCategory = async () => {
    if (!deleteCatTarget?.id) return;

    try {
      await db.categories.delete(deleteCatTarget.id);
      await db.auditLogs.add({
        action: 'HAPUS_KATEGORI',
        transactionId: 0,
        invoiceNumber: '',
        timestamp: new Date(),
        description: `Hapus kategori produk: ${deleteCatTarget.name}`,
      });
      toast.success('Kategori berhasil dihapus');
      setDeleteCatTarget(null);
      await loadCategories();
    } catch (error) {
      console.error('Failed to delete category:', error);
      toast.error('Gagal menghapus kategori');
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Produk
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowManageCatsModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
          >
            Kelola Kategori
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
          >
            <PlusIcon className="w-4 h-4" />
            Tambah Produk
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Cari produk..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
        />
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-32 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
          <CubeIcon className="w-16 h-16 mb-4 opacity-50" />
          <p className="text-lg font-medium">Belum ada produk</p>
          <p className="text-sm mt-1">Tambahkan produk pertama Anda</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.03 }}
              className={`bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-5 ${
                !product.isActive ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                    <CubeIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white text-sm">
                      {product.name}
                    </h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {product.category}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleToggleActive(product)}
                  className="p-1"
                  title={product.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                >
                  {product.isActive ? (
                    <CheckCircleIcon className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircleIcon className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </div>

              <p className="text-lg font-bold text-primary-600 dark:text-primary-400 mb-3">
                {formatCurrency(product.price)}
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => openEditModal(product)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <PencilSquareIcon className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(product)}
                  className="flex items-center justify-center px-3 py-2 text-sm font-medium text-red-600 bg-red-50 dark:bg-red-950 rounded-lg hover:bg-red-100 dark:hover:bg-red-900 transition-colors"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editingProduct ? 'Edit Produk' : 'Tambah Produk'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nama Produk
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
              placeholder="Nama produk"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Harga Jual (Rp)
            </label>
            <input
              type="number"
              value={formPrice}
              onChange={(e) => setFormPrice(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
              placeholder="0"
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Kategori
            </label>
            <select
              value={formCategory}
              onChange={(e) => {
                if (e.target.value === '+add') {
                  setShowAddCatModal(true);
                } else {
                  setFormCategory(e.target.value);
                }
              }}
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
            >
              <option value="">Pilih kategori</option>
              {categoryOptions.map((cat) => (
                <option key={cat.id ?? cat.name} value={cat.name}>
                  {cat.name}
                </option>
              ))}
              <option value="+add" className="text-primary-600 font-semibold">+ Tambah Kategori</option>
            </select>
          </div>

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
              {editingProduct ? 'Simpan' : 'Tambah'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Kelola Kategori */}
      <Modal
        isOpen={showManageCatsModal}
        onClose={() => setShowManageCatsModal(false)}
        title="Kelola Kategori Produk"
        size="md"
      >
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Daftar Kategori</h3>
            <button
              onClick={() => setShowAddCatModal(true)}
              className="px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-xs font-medium"
            >
              + Tambah Kategori
            </button>
          </div>
          
          <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-64 overflow-y-auto">
            {categories.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">Belum ada kategori.</p>
            ) : (
              categories.map((cat) => (
                <div key={cat.id} className="py-2.5 flex items-center justify-between gap-3">
                  {editingCategory?.id === cat.id ? (
                    <form onSubmit={handleEditCategory} className="flex gap-2 w-full">
                      <input
                        type="text"
                        value={editingCatName}
                        onChange={(e) => setEditingCatName(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm dark:text-white"
                        autoFocus
                      />
                      <button
                        type="submit"
                        className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-xs font-medium hover:bg-primary-700"
                      >
                        Simpan
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingCategory(null)}
                        className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium hover:bg-gray-200 dark:hover:bg-gray-750"
                      >
                        Batal
                      </button>
                    </form>
                  ) : (
                    <>
                      <span className="text-sm text-gray-900 dark:text-white font-medium">{cat.name}</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            setEditingCategory(cat);
                            setEditingCatName(cat.name);
                          }}
                          className="px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat)}
                          className="px-2.5 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg"
                        >
                          Hapus
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={() => setShowManageCatsModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: Tambah Kategori */}
      <Modal
        isOpen={showAddCatModal}
        onClose={() => {
          setShowAddCatModal(false);
          setNewCatName('');
        }}
        title="Tambah Kategori Baru"
        size="sm"
      >
        <form onSubmit={handleAddCategory} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nama Kategori
            </label>
            <input
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
              placeholder="Contoh: Desert, Minuman, dll."
              autoFocus
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowAddCatModal(false);
                setNewCatName('');
              }}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
            >
              Simpan
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Konfirmasi Hapus Kategori */}
      <Modal
        isOpen={deleteCatTarget !== null}
        onClose={() => setDeleteCatTarget(null)}
        title="Hapus Kategori"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Apakah Anda yakin ingin menghapus kategori ini?
          </p>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Nama Kategori:</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{deleteCatTarget?.name}</p>
          </div>
          <p className="text-xs text-red-500">Tindakan ini tidak dapat dibatalkan.</p>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setDeleteCatTarget(null)}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={confirmDeleteCategory}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
            >
              Hapus
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: Konfirmasi Hapus Produk */}
      <Modal
        isOpen={deleteTarget !== null || !!deleteErrorMessage}
        onClose={() => { setDeleteTarget(null); setDeleteErrorMessage(''); }}
        title={deleteErrorMessage ? 'Tidak Dapat Menghapus' : 'Hapus Produk'}
        size="sm"
      >
        {deleteErrorMessage ? (
          <div className="space-y-4">
            <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
              {deleteErrorMessage}
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteErrorMessage('')}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        ) : deleteTarget ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Apakah Anda yakin ingin menghapus produk ini?
            </p>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Nama Produk:</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{deleteTarget.name}</p>
            </div>
            <p className="text-xs text-red-500">Tindakan ini tidak dapat dibatalkan.</p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeleteProduct}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Hapus
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </motion.div>
  );
}