'use client';

import { useMemo, useState, useEffect } from 'react';
import {
  PackageOpen,
  PackagePlus,
  DollarSign,
  PackageCheck,
  PackageX,
  Clock,
  FileText,
  Receipt,
} from 'lucide-react';
import { getSupplyInvoices, getReceiptInvoices, SupplyInvoice, ReceiptInvoice } from './lib/storage';
import { formatDate } from './lib/date-utils';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface DashboardProps {
  onNavigate: (page: string) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [chartPeriod, setChartPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [supplyInvoices, setSupplyInvoices] = useState<SupplyInvoice[]>([]);
  const [receiptInvoices, setReceiptInvoices] = useState<ReceiptInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [supplies, receipts] = await Promise.all([
        getSupplyInvoices(),
        getReceiptInvoices(),
      ]);
      setSupplyInvoices(supplies);
      setReceiptInvoices(receipts);
      setLoading(false);
    }
    loadData();
  }, []);

  const stats = useMemo(() => {
    const totalSent = supplyInvoices.reduce(
      (sum, inv) => sum + inv.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
      0
    );
    const finishedReturns = receiptInvoices.reduce(
      (sum, inv) => sum + inv.items.reduce((itemSum, item) => itemSum + item.finishedQuantity, 0),
      0
    );
    const damagedReturns = receiptInvoices.reduce(
      (sum, inv) => sum + inv.items.reduce((itemSum, item) => itemSum + item.damagedQuantity, 0),
      0
    );
    const pending = totalSent - finishedReturns - damagedReturns;
    return {
      totalSent: Math.round(totalSent),
      finishedReturns: Math.round(finishedReturns),
      damagedReturns: Math.round(damagedReturns),
      pending: Math.round(pending),
    };
  }, [supplyInvoices, receiptInvoices]);

  // Recent Invoices for list
  const recentInvoices = useMemo(() => {
    const allInvoices = [
      ...supplyInvoices.map(inv => ({
        ...inv,
        type: 'supply' as const,
        totalQty: inv.items.reduce((sum, item) => sum + item.quantity, 0),
      })),
      ...receiptInvoices.map(inv => ({
        ...inv,
        type: 'receipt' as const,
        totalFinished: inv.items.reduce((sum, item) => sum + item.finishedQuantity, 0),
        totalDamaged: inv.items.reduce((sum, item) => sum + item.damagedQuantity, 0),
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
    return allInvoices;
  }, [supplyInvoices, receiptInvoices]);

  // Chart Data
  const chartData = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();

    if (chartPeriod === 'monthly') {
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      return months.map((month, index) => {
        const monthInvoices = supplyInvoices.filter(inv => {
          const invDate = new Date(inv.date);
          return invDate.getFullYear() === currentYear && invDate.getMonth() === index;
        });
        const total = monthInvoices.reduce(
          (sum, inv) => sum + inv.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
          0
        );
        return { name: month, value: total };
      });
    } else if (chartPeriod === 'weekly') {
      // last 4 weeks
      const weeks: Date[] = [];
      for (let i = 4; i > 0; i--) {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - i * 7);
        weeks.push(weekStart);
      }
      return weeks.map((weekStart, index) => {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        const weekInvoices = supplyInvoices.filter(inv => {
          const invDate = new Date(inv.date);
          return invDate >= weekStart && invDate <= weekEnd;
        });
        const total = weekInvoices.reduce(
          (sum, inv) => sum + inv.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
          0
        );
        const startDay = weekStart.getDate();
        const startMonth = weekStart.toLocaleString(undefined, { month: 'short' });
        return { name: `${startDay} ${startMonth}`, value: total };
      });
    } else {
      // yearly (last 4 years)
      const years: number[] = [];
      for (let i = 4; i > 0; i--) {
        years.push(currentYear - i + 1);
      }
      return years.map(year => {
        const yearInvoices = supplyInvoices.filter(inv => {
          const invDate = new Date(inv.date);
          return invDate.getFullYear() === year;
        });
        const total = yearInvoices.reduce(
          (sum, inv) => sum + inv.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
          0
        );
        return { name: year.toString(), value: total };
      });
    }
  }, [chartPeriod, supplyInvoices]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-gray-900 mb-8">Dashboard</h1>
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mb-8">
        <button
          onClick={() => onNavigate('supply')}
          className="group relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl p-8 transition-all shadow-lg hover:shadow-xl"
        >
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 bg-white/20 rounded-full">
              <PackagePlus className="w-12 h-12" />
            </div>
            <h2 className="text-white">New Supply</h2>
            <p className="text-blue-100 text-sm">Create new supply invoice</p>
          </div>
        </button>
        <button
          onClick={() => onNavigate('receipt')}
          className="group relative overflow-hidden bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl p-8 transition-all shadow-lg hover:shadow-xl"
        >
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 bg-white/20 rounded-full">
              <PackageOpen className="w-12 h-12" />
            </div>
            <h2 className="text-white">New Receipt</h2>
            <p className="text-green-100 text-sm">Create new receipt invoice</p>
          </div>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Total Products Sent</p>
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-blue-600">{stats.totalSent}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Finished Returns</p>
            <div className="p-2 bg-green-100 rounded-lg">
              <PackageCheck className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <p className="text-green-600">{stats.finishedReturns}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Damaged Returns</p>
            <div className="p-2 bg-red-100 rounded-lg">
              <PackageX className="w-5 h-5 text-red-600" />
            </div>
          </div>
          <p className="text-red-600">{stats.damagedReturns}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Pending</p>
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
          </div>
          <p className="text-yellow-600">{stats.pending}</p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-lg border border-gray-200 mb-8">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-gray-900">Total Supply Activity</h2>
            <div className="flex items-center gap-2 mt-2">
              <p className="text-gray-900">{stats.totalSent}</p>
              <span className="text-sm text-green-600">units sent</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setChartPeriod('weekly')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                chartPeriod === 'weekly'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setChartPeriod('monthly')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                chartPeriod === 'monthly'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setChartPeriod('yearly')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                chartPeriod === 'yearly'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Yearly
            </button>
          </div>
        </div>
        <div className="p-6">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={{ stroke: '#e5e7eb' }} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={{ stroke: '#e5e7eb' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
                labelStyle={{ color: '#374151' }}
              />
              <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} fill="url(#colorValue)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Invoice Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-gray-900">Recent Invoices</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-6 text-sm text-gray-600">Type</th>
                <th className="text-left py-3 px-6 text-sm text-gray-600">Invoice Number</th>
                <th className="text-left py-3 px-6 text-sm text-gray-600">Date</th>
                <th className="text-left py-3 px-6 text-sm text-gray-600">Details</th>
                <th className="text-left py-3 px-6 text-sm text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentInvoices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-500">
                    No invoices yet. Create your first supply or receipt invoice!
                  </td>
                </tr>
              ) : (
                recentInvoices.map((invoice: any) => (
                  <tr key={invoice.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-6">
                      {invoice.type === 'supply' ? (
                        <span className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                          <FileText className="w-4 h-4" /> Supply
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                          <Receipt className="w-4 h-4" /> Receipt
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      {invoice.type === 'supply' ? invoice.invoiceNumber : invoice.receiptInvoiceNumber}
                    </td>
                    <td className="py-4 px-6 text-gray-600">
                      {formatDate(invoice.date)}
                    </td>
                    <td className="py-4 px-6 text-gray-600">
                      {invoice.type === 'supply'
                        ? (
                          <span>
                            {invoice.items.length} items • {invoice.totalQty} units
                          </span>
                        ) : (
                          <span>
                            Finished: {invoice.totalFinished} • Damaged: {invoice.totalDamaged}
                          </span>
                        )}
                    </td>
                    <td className="py-4 px-6">
                      {invoice.type === 'supply' ? (
                        <span className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 rounded text-sm">
                          Sent
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 bg-green-50 text-green-700 rounded text-sm">
                          Received
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}