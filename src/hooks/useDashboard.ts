import { useState, useEffect, useCallback } from 'react';
import { db } from '../database';
import { getTodayRange, getWeekRange, getMonthRange } from '../utils/format';

interface DashboardData {
  todayOmzet: number;
  todayProfit: number;
  todayHpp: number;
  todayTransactions: number;
  topProducts: { name: string; quantity: number; total: number }[];
  weeklySales: { date: string; omzet: number; profit: number }[];
  monthlySales: { date: string; omzet: number; profit: number }[];
}

export function useDashboard() {
  const [data, setData] = useState<DashboardData>({
    todayOmzet: 0,
    todayProfit: 0,
    todayHpp: 0,
    todayTransactions: 0,
    topProducts: [],
    weeklySales: [],
    monthlySales: [],
  });
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const today = getTodayRange();
      const week = getWeekRange();
      const month = getMonthRange();

      // Get today's transactions
      const todayTransactions = await db.transactions
        .where('createdAt')
        .between(today.start, today.end)
        .and((t) => t.status === 'completed')
        .toArray();

      const todayOmzet = todayTransactions.reduce((sum, t) => sum + t.totalAmount, 0);
      const todayProfit = todayTransactions.reduce((sum, t) => sum + t.totalProfit, 0);
      const todayHpp = todayTransactions.reduce((sum, t) => sum + t.totalHpp, 0);

      // Get weekly transactions
      const weekTransactions = await db.transactions
        .where('createdAt')
        .between(week.start, week.end)
        .and((t) => t.status === 'completed')
        .toArray();

      // Build weekly sales data
      const weeklyMap = new Map<string, { omzet: number; profit: number }>();
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        weeklyMap.set(key, { omzet: 0, profit: 0 });
      }
      for (const t of weekTransactions) {
        const d = new Date(t.createdAt);
        const key = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        const existing = weeklyMap.get(key);
        if (existing) {
          existing.omzet += t.totalAmount;
          existing.profit += t.totalProfit;
        }
      }
      const weeklySales = Array.from(weeklyMap.entries()).map(([date, val]) => ({
        date,
        ...val,
      }));

      // Get monthly transactions
      const monthTransactions = await db.transactions
        .where('createdAt')
        .between(month.start, month.end)
        .and((t) => t.status === 'completed')
        .toArray();

      const monthlyMap = new Map<string, { omzet: number; profit: number }>();
      const daysInMonth = new Date(month.start.getFullYear(), month.start.getMonth() + 1, 0).getDate();
      for (let i = 1; i <= daysInMonth; i++) {
        const key = `${i}`;
        monthlyMap.set(key, { omzet: 0, profit: 0 });
      }
      for (const t of monthTransactions) {
        const d = new Date(t.createdAt);
        const key = `${d.getDate()}`;
        const existing = monthlyMap.get(key);
        if (existing) {
          existing.omzet += t.totalAmount;
          existing.profit += t.totalProfit;
        }
      }
      const monthlySales = Array.from(monthlyMap.entries()).map(([date, val]) => ({
        date,
        ...val,
      }));

      // Get top products from today's transaction items
      const todayItemIds = todayTransactions
        .map((t) => t.id)
        .filter((id): id is number => id !== undefined);

      const todayItems = await db.transactionItems
        .where('transactionId')
        .anyOf(todayItemIds)
        .toArray();

      const productMap = new Map<string, { name: string; quantity: number; total: number }>();
      for (const item of todayItems) {
        const existing = productMap.get(item.productName);
        if (existing) {
          existing.quantity += item.quantity;
          existing.total += item.price * item.quantity;
        } else {
          productMap.set(item.productName, {
            name: item.productName,
            quantity: item.quantity,
            total: item.price * item.quantity,
          });
        }
      }

      const topProducts = Array.from(productMap.values())
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

      setData({
        todayOmzet,
        todayProfit,
        todayHpp,
        todayTransactions: todayTransactions.length,
        topProducts,
        weeklySales,
        monthlySales,
      });
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  return { data, loading, refresh: loadDashboard };
}