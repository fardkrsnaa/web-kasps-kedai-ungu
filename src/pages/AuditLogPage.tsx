import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ClockIcon,
  CheckCircleIcon,
  NoSymbolIcon,
  ArrowUturnLeftIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { db } from '../database';
import type { AuditLog } from '../types';
import { formatDateTime } from '../utils/format';

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await db.auditLogs.orderBy('timestamp').reverse().toArray();
      setLogs(data);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const getActionConfig = (action: string) => {
    switch (action) {
      case 'CREATE_TRANSACTION':
        return { icon: CheckCircleIcon, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900', label: 'CREATE', badge: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' };
      case 'VOID_TRANSACTION':
        return { icon: NoSymbolIcon, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900', label: 'VOID', badge: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' };
      case 'RESTORE_TRANSACTION':
        return { icon: ArrowUturnLeftIcon, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900', label: 'RESTORE', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' };
      case 'DELETE_TRANSACTION':
        return { icon: TrashIcon, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900', label: 'DELETE', badge: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' };
      case 'STOCK_RETURN':
        return { icon: ArrowUturnLeftIcon, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900', label: 'STOCK +', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' };
      case 'STOCK_DEDUCTION':
        return { icon: ArrowUturnLeftIcon, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900', label: 'STOCK -', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' };
      default:
        return { icon: ClockIcon, color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-900', label: action, badge: 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300' };
    }
  };

  // Group logs by date
  const groupedLogs = logs.reduce((groups, log) => {
    const date = new Date(log.timestamp).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    if (!groups[date]) groups[date] = [];
    groups[date].push(log);
    return groups;
  }, {} as Record<string, AuditLog[]>);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Log Aktivitas</h1>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
          <ClockIcon className="w-16 h-16 mb-4 opacity-50" />
          <p className="text-sm">Belum ada log aktivitas</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedLogs).map(([date, dayLogs]) => (
            <div key={date}>
              <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-3">
                {date}
              </h3>
              <div className="relative pl-6 border-l-2 border-gray-200 dark:border-gray-700 space-y-4">
                {dayLogs.map((log) => {
                  const config = getActionConfig(log.action);
                  const Icon = config.icon;
                  return (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="relative"
                    >
                      {/* Timeline dot */}
                      <div className={`absolute -left-[31px] w-4 h-4 rounded-full ${config.bg} flex items-center justify-center`}>
                        <Icon className={`w-2.5 h-2.5 ${config.color}`} />
                      </div>

                      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full ${config.badge}`}>
                            {config.label}
                          </span>
                          <span className="text-xs font-medium text-gray-900 dark:text-white">
                            {log.invoiceNumber}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {formatDateTime(log.timestamp)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {log.description}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}