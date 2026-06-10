import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  MinusIcon,
  TrashIcon,
  ShoppingCartIcon,
  BanknotesIcon,
  QrCodeIcon,
  ArrowPathIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { db } from '../database';
import type { Product } from '../types';
import { formatCurrency } from '../utils/format';
import {
  processCheckout,
  checkLowStockIngredients,
  type CartItem,
} from '../services/transactionService';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';

export default function PosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [loading, setLoading] = useState(true);

  // Checkout state
  const [showCheckout, setShowCheckout] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris' | 'transfer'>('cash');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastInvoice, setLastInvoice] = useState('');

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await db.products
        .where('isActive')
        .equals(1)
        .toArray();
      setProducts(data);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const categories = [
    'Semua',
    ...Array.from(new Set(products.map((p) => p.category))),
  ];

  const filteredProducts = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchCategory = selectedCategory === 'Semua' || p.category === selectedCategory;
    return matchSearch && matchCategory;
  });

  const addToCart = (product: Product) => {
    const productId = product.id as number;
    if (!productId) return;
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === productId);
      if (existing) {
        return prev.map((item) =>
          item.productId === productId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          productId,
          productName: product.name,
          price: product.price,
          quantity: 1,
          hpp: 0,
        },
      ];
    });
    toast.success(`${product.name} ditambahkan`);
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.productId === productId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const finalTotal = Math.max(0, cartTotal - discount);
  const changeAmount = paymentMethod === 'cash'
    ? Math.max(0, Number(paymentAmount || 0) - finalTotal)
    : 0;

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Keranjang kosong');
      return;
    }

    setProcessingPayment(true);
    try {
      const result = await processCheckout({
        items: cart,
        discount,
        paymentMethod,
        paymentAmount: paymentMethod === 'cash' ? Number(paymentAmount || 0) : finalTotal,
      });

      setLastInvoice(result.invoiceNumber);
      setShowCheckout(false);
      setShowReceipt(true);

      // Check low stock
      const lowStock = await checkLowStockIngredients();
      if (lowStock.length > 0) {
        toast(
          () => (
            <div>
              <p className="font-medium mb-1">⚠️ Stok Menipis:</p>
              {lowStock.map((s) => (
                <p key={s.name} className="text-xs">
                  - {s.name}: {s.stock} {s.unit}
                </p>
              ))}
            </div>
          ),
          { duration: 5000 }
        );
      } else {
        toast.success('Transaksi berhasil!');
      }
    } catch (error) {
      console.error('Checkout failed:', error);
      toast.error('Gagal memproses transaksi');
    } finally {
      setProcessingPayment(false);
    }
  };

  const resetPos = () => {
    setCart([]);
    setDiscount(0);
    setPaymentMethod('cash');
    setPaymentAmount('');
    setShowReceipt(false);
    setLastInvoice('');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col lg:flex-row gap-4 h-full"
    >
      {/* Products Panel */}
      <div className="flex-1 min-w-0">
        {/* Search */}
        <div className="relative mb-4">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Cari produk..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
            autoFocus
          />
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
            <ShoppingCartIcon className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-sm">Produk tidak ditemukan</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filteredProducts.map((product, index) => (
              <motion.button
                key={product.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.15, delay: index * 0.02 }}
                onClick={() => addToCart(product)}
                whileTap={{ scale: 0.95 }}
                className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-3 text-left hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900 flex items-center justify-center mb-2">
                  <span className="text-primary-600 dark:text-primary-400 font-bold text-sm">
                    {product.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {product.name}
                </p>
                <p className="text-sm font-bold text-primary-600 dark:text-primary-400 mt-1">
                  {formatCurrency(product.price)}
                </p>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* Cart Panel */}
      <div className="w-full lg:w-96 flex flex-col bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <ShoppingCartIcon className="w-5 h-5 text-primary-600" />
              Keranjang
            </h2>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {cartItemCount} item
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400 dark:text-gray-500">
              <ShoppingCartIcon className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-xs">Keranjang kosong</p>
              <p className="text-xs">Pilih produk untuk memulai</p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.productId}
                className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {item.productName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatCurrency(item.price)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateQuantity(item.productId, -1)}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500"
                  >
                    <MinusIcon className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center text-sm font-medium text-gray-900 dark:text-white">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.productId, 1)}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500"
                  >
                    <PlusIcon className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white w-20 text-right">
                  {formatCurrency(item.price * item.quantity)}
                </p>
                <button
                  onClick={() => removeFromCart(item.productId)}
                  className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Total & Checkout */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Total</span>
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              {formatCurrency(cartTotal)}
            </span>
          </div>

          <button
            onClick={() => {
              if (cart.length === 0) {
                toast.error('Keranjang kosong');
                return;
              }
              setShowCheckout(true);
            }}
            disabled={cart.length === 0}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
          >
            <BanknotesIcon className="w-5 h-5" />
            Bayar ({cartItemCount} item)
          </button>
        </div>
      </div>

      {/* Checkout Modal */}
      <Modal
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
        title="Checkout"
        size="lg"
      >
        <div className="space-y-4">
          {/* Order Summary */}
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {cart.map((item) => (
              <div key={item.productId} className="flex items-center justify-between text-sm">
                <span className="text-gray-700 dark:text-gray-300">
                  {item.productName} x{item.quantity}
                </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatCurrency(item.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-3 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
              <span className="text-gray-900 dark:text-white font-medium">
                {formatCurrency(cartTotal)}
              </span>
            </div>

            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                Diskon (Rp)
              </label>
              <input
                type="number"
                value={discount || ''}
                onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                placeholder="0"
                min="0"
              />
            </div>

            <div className="flex items-center justify-between text-sm font-bold">
              <span className="text-gray-900 dark:text-white">Total Bayar</span>
              <span className="text-lg text-primary-600">
                {formatCurrency(finalTotal)}
              </span>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-2">
              Metode Pembayaran
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['cash', 'qris', 'transfer'] as const).map((method) => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-lg border text-xs font-medium transition-colors ${
                    paymentMethod === method
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {method === 'cash' ? (
                    <BanknotesIcon className="w-5 h-5" />
                  ) : method === 'qris' ? (
                    <QrCodeIcon className="w-5 h-5" />
                  ) : (
                    <ArrowPathIcon className="w-5 h-5" />
                  )}
                  {method === 'cash' ? 'Tunai' : method === 'qris' ? 'QRIS' : 'Transfer'}
                </button>
              ))}
            </div>
          </div>

          {/* Payment Amount (for cash) */}
          {paymentMethod === 'cash' && (
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                Jumlah Dibayar
              </label>
              <input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-lg font-bold focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                placeholder="Masukkan jumlah"
                min="0"
                inputMode="numeric"
              />
            </div>
          )}

          {/* Kembalian - Prominent Card */}
          {paymentMethod === 'cash' && Number(paymentAmount) >= finalTotal && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="p-4 bg-green-50 dark:bg-green-950 border-2 border-green-300 dark:border-green-700 rounded-xl"
            >
              <div className="text-center">
                <p className="text-sm font-medium text-green-700 dark:text-green-300 mb-1">
                  Kembalian
                </p>
                <motion.p
                  key={changeAmount}
                  initial={{ scale: 1.1 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                  className="text-3xl font-bold text-green-600 dark:text-green-400 tabular-nums"
                >
                  {formatCurrency(changeAmount)}
                </motion.p>
              </div>
            </motion.div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowCheckout(false)}
              className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleCheckout}
              disabled={processingPayment || (paymentMethod === 'cash' && Number(paymentAmount) < finalTotal)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {processingPayment ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Memproses...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-4 h-4" />
                  Konfirmasi Bayar
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Receipt Modal */}
      <Modal
        isOpen={showReceipt}
        onClose={resetPos}
        title="Transaksi Berhasil"
        size="sm"
      >
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mx-auto">
            <CheckCircleIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>

          <div>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              Pembayaran Berhasil
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {lastInvoice}
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Total</span>
              <span className="font-bold text-gray-900 dark:text-white">
                {formatCurrency(finalTotal)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Pembayaran</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {paymentMethod === 'cash' ? 'Tunai' : paymentMethod === 'qris' ? 'QRIS' : 'Transfer'}
              </span>
            </div>
            {paymentMethod === 'cash' && (
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Kembalian</span>
                <span className="font-medium text-green-600">
                  {formatCurrency(changeAmount)}
                </span>
              </div>
            )}
          </div>

          <button
            onClick={resetPos}
            className="w-full px-4 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
          >
            Transaksi Baru
          </button>
        </div>
      </Modal>
    </motion.div>
  );
}