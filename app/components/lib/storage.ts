import { supabase } from './supabase';

// --- TYPES ---

export interface Goods {
  id: string;
  name: string;
}

export interface SupplyInvoiceItem {
  id?: string;
  goodsName: string;
  quantity: number;
}

export interface SupplyInvoice {
  id: string;
  date: string;
  invoiceNumber: string;
  jobWorker?: string;
  narration: string;
  items: SupplyInvoiceItem[];
  createdAt: string;
}

export interface ReceiptInvoiceItem {
  id?: string;
  goodsName: string;
  finishedQuantity: number;
  damagedQuantity: number;
  attributes: string[];
}

export interface ReceiptInvoice {
  id: string;
  date: string;
  receiptInvoiceNumber: string;
  supplyInvoiceId: string;
  supplyInvoiceNumber: string;
  jobWorker?: string;
  narration: string;
  items: ReceiptInvoiceItem[];
  createdAt: string;
}

export interface InvoiceChange {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  changeDate: string;
  reason: string;
  changeDetails: string;
}

export interface BackupHistoryEntry {
  id: string;
  type: 'backup' | 'restore';
  timestamp: string;
  filename: string;
}

// --- HELPER: GENERATE DIFF ---

function generateDiff(oldData: any, newData: any, type: 'supply' | 'receipt') {
  const changes: Array<{ field: string; old: string; new: string }> = [];

  // 1. Compare Header Fields
  if (newData.date && oldData.date !== newData.date) {
    changes.push({ field: 'Date', old: oldData.date, new: newData.date });
  }

  const oldInvNum = type === 'supply' ? oldData.invoice_number : oldData.receipt_invoice_number;
  const newInvNum = type === 'supply' ? newData.invoiceNumber : newData.receiptInvoiceNumber;
  
  if (newInvNum && oldInvNum !== newInvNum) {
    changes.push({ field: 'Invoice Number', old: oldInvNum || 'N/A', new: newInvNum });
  }

  if (type === 'receipt') {
    if (newData.supplyInvoiceNumber && oldData.supply_invoice_number !== newData.supplyInvoiceNumber) {
      changes.push({ field: 'Supply Ref', old: oldData.supply_invoice_number || 'N/A', new: newData.supplyInvoiceNumber });
    }
  }

  if (newData.jobWorker !== undefined && (oldData.job_worker || '') !== newData.jobWorker) {
    changes.push({ field: 'Job Worker', old: oldData.job_worker || 'N/A', new: newData.jobWorker });
  }

  if (newData.narration !== undefined && (oldData.narration || '') !== newData.narration) {
    changes.push({ field: 'Narration', old: oldData.narration || 'N/A', new: newData.narration });
  }

  // 2. Compare Items
  if (newData.items) {
    const oldItems = type === 'supply' 
      ? oldData.supply_invoice_items 
      : oldData.receipt_invoice_items;

    const oldMap = new Map<string, any>(oldItems.map((i: any) => [i.goods_name, i]));
    const newMap = new Map<string, any>(newData.items.map((i: any) => [i.goodsName, i]));

    newMap.forEach((newItem: any, name: string) => {
      const oldItem = oldMap.get(name);
      
      if (!oldItem) {
        const desc = type === 'supply' 
          ? `Qty: ${newItem.quantity}` 
          : `Fin: ${newItem.finishedQuantity}, Dmg: ${newItem.damagedQuantity}`;
        changes.push({ 
          field: `Item Added: ${name}`, 
          old: '-', 
          new: desc
        });
      } else {
        if (type === 'supply') {
          if (Number(oldItem.quantity) !== Number(newItem.quantity)) {
            changes.push({ 
              field: `Item Qty: ${name}`, 
              old: oldItem.quantity.toString(), 
              new: newItem.quantity.toString() 
            });
          }
        } else {
          if (Number(oldItem.finished_quantity) !== Number(newItem.finishedQuantity)) {
            changes.push({ 
              field: `Item Finished: ${name}`, 
              old: oldItem.finished_quantity?.toString() || '0', 
              new: newItem.finishedQuantity?.toString() || '0'
            });
          }
          if (Number(oldItem.damaged_quantity) !== Number(newItem.damagedQuantity)) {
            changes.push({ 
              field: `Item Damaged: ${name}`, 
              old: oldItem.damaged_quantity?.toString() || '0', 
              new: newItem.damagedQuantity?.toString() || '0'
            });
          }
          
          const oldAttrs = Array.isArray(oldItem.attributes) ? oldItem.attributes.sort().join(',') : '';
          const newAttrs = Array.isArray(newItem.attributes) ? newItem.attributes.sort().join(',') : '';
          
          if (oldAttrs !== newAttrs) {
             changes.push({ 
               field: `Item Attrs: ${name}`, 
               old: oldAttrs || 'None', 
               new: newAttrs || 'None' 
             });
          }
        }
      }
    });

    oldMap.forEach((oldItem: any, name: string) => {
      if (!newMap.has(name)) {
        changes.push({ field: `Item Removed: ${name}`, old: 'Present', new: 'Removed' });
      }
    });
  }

  return JSON.stringify(changes);
}

// --- GOODS ---

export async function getGoods(): Promise<Goods[]> {
  const { data, error } = await supabase
    .from('goods')
    .select('*')
    .order('name', { ascending: true });
    
  if (error) throw new Error(`Error fetching goods: ${error.message}`);
  return data || [];
}

export async function addGoods(name: string): Promise<Goods | null> {
  const { data: existing } = await supabase
    .from('goods')
    .select('*')
    .eq('name', name)
    .single();
  
  if (existing) return existing;

  const { data, error } = await supabase
    .from('goods')
    .insert([{ name }])
    .select()
    .single();

  if (error) throw new Error(`Error adding goods: ${error.message}`);
  return data;
}

// --- SUPPLY INVOICES ---

export async function getSupplyInvoices(): Promise<SupplyInvoice[]> {
  const { data: invoices, error } = await supabase
    .from('supply_invoices')
    .select(`
      *,
      supply_invoice_items (
        id,
        goods_name,
        quantity
      )
    `)
    .order('date', { ascending: false });

  if (error) throw new Error(`Error fetching supply invoices: ${error.message}`);

  return (invoices || []).map((inv: any) => ({
    id: inv.id,
    date: inv.date,
    invoiceNumber: inv.invoice_number,
    jobWorker: inv.job_worker,
    narration: inv.narration || '',
    createdAt: inv.created_at,
    items: (inv.supply_invoice_items || []).map((item: any) => ({
      id: item.id,
      goodsName: item.goods_name,
      quantity: item.quantity
    }))
  }));
}

export async function addSupplyInvoice(invoice: Omit<SupplyInvoice, 'id' | 'createdAt'>): Promise<SupplyInvoice | null> {
  const { data: invoiceData, error: invoiceError } = await supabase
    .from('supply_invoices')
    .insert([{
      date: invoice.date,
      invoice_number: invoice.invoiceNumber,
      job_worker: invoice.jobWorker,
      narration: invoice.narration
    }])
    .select()
    .single();

  if (invoiceError) throw new Error(`Error adding supply invoice header: ${invoiceError.message}`);

  const itemsToInsert = invoice.items.map(item => ({
    supply_invoice_id: invoiceData.id,
    goods_name: item.goodsName,
    quantity: item.quantity
  }));

  const { error: itemsError } = await supabase
    .from('supply_invoice_items')
    .insert(itemsToInsert);

  if (itemsError) {
    await supabase.from('supply_invoices').delete().eq('id', invoiceData.id);
    throw new Error(`Error adding supply invoice items: ${itemsError.message}`);
  }

  for (const item of invoice.items) {
    await addGoods(item.goodsName);
  }

  return {
    ...invoice,
    id: invoiceData.id,
    createdAt: invoiceData.created_at
  };
}

export async function updateSupplyInvoice(id: string, update: Partial<Omit<SupplyInvoice, 'id' | 'createdAt'>>, reason: string) {
  const { data: oldData } = await supabase
    .from('supply_invoices')
    .select('*, supply_invoice_items(*)')
    .eq('id', id)
    .single();

  if (!oldData) throw new Error('Invoice not found');

  const changeDetails = generateDiff(oldData, update, 'supply');

  const { error: invoiceError } = await supabase
    .from('supply_invoices')
    .update({
      date: update.date,
      invoice_number: update.invoiceNumber,
      job_worker: update.jobWorker,
      narration: update.narration
    })
    .eq('id', id);

  if (invoiceError) throw new Error(`Error updating supply invoice: ${invoiceError.message}`);

  if (update.items) {
    await supabase.from('supply_invoice_items').delete().eq('supply_invoice_id', id);
    
    const itemsToInsert = update.items.map(item => ({
      supply_invoice_id: id,
      goods_name: item.goodsName,
      quantity: item.quantity
    }));

    await supabase.from('supply_invoice_items').insert(itemsToInsert);

    for (const item of update.items) {
      await addGoods(item.goodsName);
    }
  }

  await addInvoiceChange({
    invoiceId: id,
    invoiceNumber: update.invoiceNumber || oldData.invoice_number,
    changeDate: new Date().toISOString(),
    reason,
    changeDetails
  });
}

export async function deleteSupplyInvoice(id: string) {
  await supabase.from('supply_invoice_items').delete().eq('supply_invoice_id', id);
  const { error } = await supabase.from('supply_invoices').delete().eq('id', id);
  if (error) throw new Error(`Error deleting supply invoice: ${error.message}`);
}

// --- RECEIPT INVOICES ---

export async function getReceiptInvoices(): Promise<ReceiptInvoice[]> {
  const { data: invoices, error } = await supabase
    .from('receipt_invoices')
    .select(`
      *,
      receipt_invoice_items (
        id,
        goods_name,
        finished_quantity,
        damaged_quantity,
        attributes
      )
    `)
    .order('date', { ascending: false });

  if (error) throw new Error(`Error fetching receipt invoices: ${error.message}`);

  return (invoices || []).map((inv: any) => ({
    id: inv.id,
    date: inv.date,
    receiptInvoiceNumber: inv.receipt_invoice_number,
    supplyInvoiceId: inv.supply_invoice_id,
    supplyInvoiceNumber: inv.supply_invoice_number,
    jobWorker: inv.job_worker,
    narration: inv.narration || '',
    createdAt: inv.created_at,
    items: (inv.receipt_invoice_items || []).map((item: any) => ({
      id: item.id,
      goodsName: item.goods_name,
      finishedQuantity: item.finished_quantity,
      damagedQuantity: item.damaged_quantity,
      attributes: item.attributes || []
    }))
  }));
}

export async function addReceiptInvoice(invoice: Omit<ReceiptInvoice, 'id' | 'createdAt'>): Promise<ReceiptInvoice | null> {
  const { data: invoiceData, error: invoiceError } = await supabase
    .from('receipt_invoices')
    .insert([{
      date: invoice.date,
      receipt_invoice_number: invoice.receiptInvoiceNumber,
      supply_invoice_id: invoice.supplyInvoiceId,
      supply_invoice_number: invoice.supplyInvoiceNumber,
      job_worker: invoice.jobWorker,
      narration: invoice.narration
    }])
    .select()
    .single();

  if (invoiceError) throw new Error(`Error adding receipt invoice header: ${invoiceError.message}`);

  const itemsToInsert = invoice.items.map(item => ({
    receipt_invoice_id: invoiceData.id,
    goods_name: item.goodsName,
    finished_quantity: item.finishedQuantity,
    damaged_quantity: item.damagedQuantity,
    attributes: item.attributes
  }));

  const { error: itemsError } = await supabase
    .from('receipt_invoice_items')
    .insert(itemsToInsert);

  if (itemsError) {
    await supabase.from('receipt_invoices').delete().eq('id', invoiceData.id);
    throw new Error(`Error adding receipt invoice items: ${itemsError.message}`);
  }

  return {
    ...invoice,
    id: invoiceData.id,
    createdAt: invoiceData.created_at
  };
}

export async function updateReceiptInvoice(id: string, update: Partial<Omit<ReceiptInvoice, 'id' | 'createdAt'>>, reason: string) {
  const { data: oldData } = await supabase
    .from('receipt_invoices')
    .select('*, receipt_invoice_items(*)')
    .eq('id', id)
    .single();

  if (!oldData) throw new Error('Invoice not found');

  const changeDetails = generateDiff(oldData, update, 'receipt');

  const { error: invoiceError } = await supabase
    .from('receipt_invoices')
    .update({
      date: update.date,
      receipt_invoice_number: update.receiptInvoiceNumber,
      supply_invoice_number: update.supplyInvoiceNumber,
      job_worker: update.jobWorker,
      narration: update.narration
    })
    .eq('id', id);

  if (invoiceError) throw new Error(`Error updating receipt invoice: ${invoiceError.message}`);

  if (update.items) {
    await supabase.from('receipt_invoice_items').delete().eq('receipt_invoice_id', id);
    
    const itemsToInsert = update.items.map(item => ({
      receipt_invoice_id: id,
      goods_name: item.goodsName,
      finished_quantity: item.finishedQuantity,
      damaged_quantity: item.damagedQuantity,
      attributes: item.attributes
    }));

    await supabase.from('receipt_invoice_items').insert(itemsToInsert);
  }

  await addInvoiceChange({
    invoiceId: id,
    invoiceNumber: update.receiptInvoiceNumber || oldData.receipt_invoice_number,
    changeDate: new Date().toISOString(),
    reason,
    changeDetails
  });
}

export async function deleteReceiptInvoice(id: string) {
  await supabase.from('receipt_invoice_items').delete().eq('receipt_invoice_id', id);
  const { error } = await supabase.from('receipt_invoices').delete().eq('id', id);
  if (error) throw new Error(`Error deleting receipt invoice: ${error.message}`);
}

// --- HISTORY & BACKUP ---

export async function getInvoiceChanges(): Promise<InvoiceChange[]> {
  const { data, error } = await supabase
    .from('invoice_changes')
    .select('*')
    .order('change_date', { ascending: false });
    
  if (error) throw new Error(`Error fetching invoice changes: ${error.message}`);
  
  return (data || []).map((change: any) => ({
    id: change.id,
    invoiceId: change.invoice_id || '',
    invoiceNumber: change.invoice_number,
    changeDate: change.change_date,
    reason: change.reason,
    changeDetails: change.change_details
  }));
}

export async function addInvoiceChange(change: Omit<InvoiceChange, 'id'>): Promise<void> {
  const { error } = await supabase
    .from('invoice_changes')
    .insert([{
      invoice_id: change.invoiceId,
      invoice_number: change.invoiceNumber,
      change_date: change.changeDate,
      reason: change.reason,
      change_details: change.changeDetails
    }]);
  if (error) console.error('Error logging change (non-fatal):', error);
}

export async function getBackupHistory(): Promise<BackupHistoryEntry[]> {
  const { data, error } = await supabase
    .from('backup_history')
    .select('*')
    .order('timestamp', { ascending: false });

  if (error) {
    console.error('Error fetching backup history:', error);
    return [];
  }

  return (data || []).map((entry: any) => ({
    id: entry.id,
    type: entry.type,
    filename: entry.filename,
    timestamp: entry.timestamp
  }));
}

export async function addBackupHistoryEntry(entry: Omit<BackupHistoryEntry, 'id'>): Promise<void> {
  const { error } = await supabase
    .from('backup_history')
    .insert([{
      type: entry.type,
      filename: entry.filename,
      timestamp: entry.timestamp
    }]);

  if (error) {
    console.error('Error adding backup history:', error);
  }
}

export async function exportAllData(): Promise<string> {
  const goods = await getGoods();
  const supplyInvoices = await getSupplyInvoices();
  const receiptInvoices = await getReceiptInvoices();
  const invoiceChanges = await getInvoiceChanges();
  const data = {
    goods,
    supplyInvoices,
    receiptInvoices,
    invoiceChanges,
    exportDate: new Date().toISOString(),
  };
  return JSON.stringify(data, null, 2);
}

export async function importAllData(jsonData: string): Promise<boolean> {
  try {
    const data = JSON.parse(jsonData);
    if (data.goods) {
      for (const good of data.goods) {
        await addGoods(good.name);
      }
    }
    if (data.supplyInvoices) {
      for (const invoice of data.supplyInvoices) {
        await addSupplyInvoice(invoice);
      }
    }
    if (data.receiptInvoices) {
      for (const invoice of data.receiptInvoices) {
        await addReceiptInvoice(invoice);
      }
    }
    if (data.invoiceChanges && Array.isArray(data.invoiceChanges)) {
      const { error } = await supabase
        .from('invoice_changes')
        .insert(data.invoiceChanges.map((change: any) => ({
          invoice_id: change.invoiceId,
          invoice_number: change.invoiceNumber,
          change_date: change.changeDate,
          reason: change.reason,
          change_details: change.changeDetails
        })));
      
      if (error) console.error('Error restoring history:', error);
    }
    return true;
  } catch (error) {
    console.error('Error importing data:', error);
    return false;
  }
}

export async function clearDatabase(): Promise<boolean> {
  try {
    await supabase.from('receipt_invoice_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('supply_invoice_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('receipt_invoices').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('supply_invoices').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('invoice_changes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('goods').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    return true;
  } catch (error) {
    console.error('Error clearing database:', error);
    return false;
  }
}