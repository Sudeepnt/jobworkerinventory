'use client';

import { useState, useEffect } from 'react';
import { Plus, Save, Trash2, ArrowLeft, Home } from 'lucide-react';
import { addSupplyInvoice, getGoods } from './lib/storage';

interface GoodsRow {
  id: string;
  goodsName: string;
  quantity: number | string;
}

interface SupplyFormProps {
  onNavigate: (page: string) => void;
}

export default function SupplyForm({ onNavigate }: SupplyFormProps) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [jobWorker, setJobWorker] = useState('');
  const [narration, setNarration] = useState('');
  const [rows, setRows] = useState<GoodsRow[]>([
    { id: Date.now().toString(), goodsName: '', quantity: '' }
  ]);
  const [saving, setSaving] = useState(false);
  const [goodsList, setGoodsList] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const goods = await getGoods();
      setGoodsList(goods.map(g => g.name));
    })();
  }, []);

  const addRow = () => {
    setRows([...rows, { id: Date.now().toString(), goodsName: '', quantity: '' }]);
  };

  const removeRow = (id: string) => {
    if (rows.length > 1) {
      setRows(rows.filter(row => row.id !== id));
    }
  };

  const updateRow = (id: string, field: keyof GoodsRow, value: any) => {
    setRows(rows.map(row => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const handleSave = async () => {
    if (!invoiceNumber.trim()) {
      alert('Please enter invoice number');
      return;
    }
    const validRows = rows.filter(row => row.goodsName.trim() && Number(row.quantity) > 0);
    if (validRows.length === 0) {
      alert('Please add at least one item with goods name and quantity');
      return;
    }

    setSaving(true);
    try {
      await addSupplyInvoice({
        date,
        invoiceNumber,
        jobWorker,
        narration,
        items: validRows.map(r => ({
          goodsName: r.goodsName,
          quantity: Number(r.quantity)
        }))
      });
      alert('Supply invoice saved successfully!');
      onNavigate('dashboard');
    } catch (error: any) {
      alert(`Failed to save: ${error.message}`);
      console.error('Save Error:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex gap-3 items-center mb-6">
        <button
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <Home className="w-4 h-4" /> Home
        </button>
        <h1 className="text-2xl font-bold text-gray-900 ml-3">
          New Supply Invoice
        </h1>
      </div>

      {/* Form */}
      <form
        onSubmit={e => {
          e.preventDefault();
          handleSave();
        }}
        className="bg-white rounded-lg shadow-md p-6 mb-6"
      >
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Number</label>
            <input
              type="text"
              value={invoiceNumber}
              onChange={e => setInvoiceNumber(e.target.value)}
              placeholder="Invoice Number"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Job Worker (Optional)</label>
            <input
              type="text"
              value={jobWorker}
              onChange={e => setJobWorker(e.target.value)}
              placeholder="Job Worker Name"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Narration</label>
          <textarea
            value={narration}
            onChange={e => setNarration(e.target.value)}
            placeholder="Additional notes..."
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <span className="block text-xs text-gray-500 mb-2">Goods</span>
        <div className="overflow-x-auto">
          <table className="w-full border">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Goods Name</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Quantity</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={row.goodsName}
                      onChange={e => updateRow(row.id, 'goodsName', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Select or type goods name"
                      list="goods-list"
                    />
                    <datalist id="goods-list">
                      {goodsList.map((g, i) => (
                        <option key={i} value={g} />
                      ))}
                    </datalist>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      value={row.quantity}
                      onChange={e =>
                        updateRow(
                          row.id,
                          'quantity',
                          e.target.value === '' ? '' : Number(e.target.value)
                        )}
                      placeholder="0"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      disabled={rows.length === 1}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <button
          type="button"
          onClick={addRow}
          className="mt-2 flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
        >
          <Plus className="w-4 h-4" /> Add Row
        </button>

        <div className="flex gap-4 mt-6">
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 disabled:opacity-50"
          >
            <ArrowLeft className="w-4 h-4" /> Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Invoice'}
          </button>
        </div>
      </form>
    </div>
  );
}