import React, { useState } from 'react';
import { SavedItem, Profile } from '../types';
import { formatCurrency, formatWithCommas, parseFormattedNumber } from '../utils/formatters';
import { 
  Package, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Layers, 
  Tag,
  X,
  Check,
  Hash,
  Lock,
  Unlock
} from 'lucide-react';

interface SavedItemsManagerProps {
  items: SavedItem[];
  profile: Profile;
  onAddItem: (item: SavedItem) => void;
  onUpdateItem: (item: SavedItem) => void;
  onDeleteItem: (id: string) => void;
  onNavigateToProfile?: () => void;
}

export const SavedItemsManager: React.FC<SavedItemsManagerProps> = ({
  items,
  profile,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onNavigateToProfile,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [editingItem, setEditingItem] = useState<SavedItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string>('');

  const currency = profile.currency || 'UGX';

  const userCategories = profile.categories && profile.categories.length > 0
    ? profile.categories
    : ['Materials', 'Labour', 'Transport', 'Equipment', 'Services', 'Other'];

  const categories = ['All', ...userCategories];

  // Form Fields as requested:
  // 1. Item / Service Name *
  // 2. Category
  // 3. Unit name
  // 4. Quantity
  // 5. Price
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>(userCategories[0] || 'Materials');
  const [unit, setUnit] = useState('pcs');
  const [quantity, setQuantity] = useState<number>(1);
  const [quantityStr, setQuantityStr] = useState<string>('1');
  const [price, setPrice] = useState<number>(0);
  const [priceStr, setPriceStr] = useState<string>('');
  const [lockUnitQty, setLockUnitQty] = useState<boolean>(false);

  const [formError, setFormError] = useState<string>('');

  const openAddModal = () => {
    setEditingItem(null);
    setName('');
    const defaultCat = userCategories[0] || 'Materials';
    setCategory(defaultCat);
    const isLabourOrService = defaultCat.toLowerCase().includes('labour') || defaultCat.toLowerCase().includes('service');
    setLockUnitQty(isLabourOrService);
    setUnit(isLabourOrService ? 'lump sum' : 'pcs');
    setQuantity(1);
    setQuantityStr('1');
    setPrice(0);
    setPriceStr('');
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (item: SavedItem) => {
    setEditingItem(item);
    setName(item.name);
    setCategory(item.category || userCategories[0] || 'Materials');
    setUnit(item.unit || (item.lock_unit_qty ? 'lump sum' : 'pcs'));
    const itemQty = item.quantity || item.default_quantity || 1;
    setQuantity(itemQty);
    setQuantityStr(formatWithCommas(itemQty));
    const itemPrice = item.default_price || 0;
    setPrice(itemPrice);
    setPriceStr(itemPrice > 0 ? formatWithCommas(itemPrice) : '');
    setLockUnitQty(!!item.lock_unit_qty);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleCategoryChange = (newCat: string) => {
    setCategory(newCat);
    // Auto-suggest locking for categories that don't need quantity & unit
    if (!editingItem && (newCat.toLowerCase().includes('labour') || newCat.toLowerCase().includes('service') || newCat.toLowerCase().includes('flat'))) {
      setLockUnitQty(true);
      if (unit === 'pcs') setUnit('lump sum');
    }
  };

  const handleToggleLock = () => {
    const nextLocked = !lockUnitQty;
    setLockUnitQty(nextLocked);
    if (nextLocked) {
      if (!unit || unit === 'pcs') {
        setUnit('lump sum');
      }
      setQuantity(1);
    } else {
      if (unit === 'lump sum') {
        setUnit('pcs');
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Item / Service Name is required.');
      return;
    }
    setFormError('');

    const itemQty = lockUnitQty ? 1 : Math.max(1, Number(quantity) || 1);
    const itemUnit = lockUnitQty ? (unit.trim() || 'lump sum') : (unit.trim() || 'pcs');
    const itemPrice = Math.max(0, Number(price) || 0);

    if (editingItem) {
      onUpdateItem({
        ...editingItem,
        name: name.trim(),
        category,
        unit: itemUnit,
        quantity: itemQty,
        default_quantity: itemQty,
        default_price: itemPrice,
        lock_unit_qty: lockUnitQty,
      });
      setFeedbackMsg(`Updated "${name.trim()}"`);
    } else {
      const newItem: SavedItem = {
        id: `itm_${Math.random().toString(36).substring(2, 9)}`,
        name: name.trim(),
        category,
        unit: itemUnit,
        quantity: itemQty,
        default_quantity: itemQty,
        default_price: itemPrice,
        lock_unit_qty: lockUnitQty,
      };
      onAddItem(newItem);
      setFeedbackMsg(`Added "${name.trim()}" to price list`);
    }

    setTimeout(() => setFeedbackMsg(''), 2500);
    setIsModalOpen(false);
  };

  const handleExecuteDelete = (id: string, itemName: string) => {
    onDeleteItem(id);
    setConfirmDeleteId(null);
    setFeedbackMsg(`Deleted "${itemName}"`);
    setTimeout(() => setFeedbackMsg(''), 2500);
  };

  const filteredItems = items.filter((item) => {
    const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <span>Price List</span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-800 text-amber-400 rounded-full">
              {items.length}
            </span>
          </h1>
          <p className="text-xs text-slate-400">Save frequent items, quantities, and rates for fast quoting</p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl flex items-center gap-1.5 shadow-lg shadow-amber-500/20 text-sm active:scale-95 transition-all"
        >
          <Plus size={16} />
          <span>Add Item</span>
        </button>
      </div>

      {/* Action feedback toast */}
      {feedbackMsg && (
        <div className="p-2.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
          <Check size={14} className="shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-3 text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search items by name..."
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400"
        />
      </div>

      {/* Category Tabs */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-0.5 text-[11px]">
          <span className="font-bold text-slate-400 uppercase tracking-wider">
            Categories
          </span>
          {onNavigateToProfile && (
            <button
              type="button"
              onClick={onNavigateToProfile}
              className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 active:scale-95"
            >
              <Tag size={12} />
              <span>Edit Categories in Profile</span>
            </button>
          )}
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl font-medium shrink-0 transition-all ${
                selectedCategory === cat
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Items List */}
      {filteredItems.length === 0 ? (
        <div className="p-8 text-center bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl space-y-3">
          <Package size={32} className="mx-auto text-slate-600" />
          <p className="text-slate-400 text-sm">No items found in price list.</p>
          <button
            type="button"
            onClick={openAddModal}
            className="text-xs bg-slate-800 text-amber-400 hover:text-amber-300 px-4 py-2 rounded-xl font-bold inline-flex items-center gap-1.5"
          >
            <Plus size={14} />
            <span>Add First Item</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {filteredItems.map((item) => {
            const itemQty = item.quantity || item.default_quantity || 1;
            const isConfirmingDelete = confirmDeleteId === item.id;

            return (
              <div
                key={item.id}
                className={`bg-slate-900 border rounded-2xl p-3 space-y-2 flex flex-col justify-between transition-all ${
                  isConfirmingDelete ? 'border-rose-500/60 bg-rose-950/20' : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {isConfirmingDelete ? (
                  /* Reliable Inline Delete Confirmation (No window.confirm) */
                  <div className="p-2 space-y-2 text-center my-auto">
                    <p className="text-xs font-semibold text-rose-300">
                      Delete "{item.name}" from price list?
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleExecuteDelete(item.id, item.name)}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs active:scale-95 shadow-sm"
                      >
                        Yes, Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs active:scale-95"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-amber-300 font-semibold uppercase tracking-wider">
                          {item.category}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 active:scale-95"
                            title="Edit item"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(item.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 active:scale-95"
                            title="Delete item"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      <h3 className="font-bold text-white text-sm mt-1.5 leading-snug">
                        {item.name}
                      </h3>

                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                        {item.lock_unit_qty ? (
                          <span className="inline-flex items-center gap-1 bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-md font-mono text-[11px] font-semibold">
                            <Lock size={10} className="text-amber-400" />
                            <span>Lump Sum / Flat Rate (No Unit & Qty)</span>
                          </span>
                        ) : (
                          <span className="bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800 font-mono text-slate-300 text-[11px]">
                            Qty: <strong>{itemQty}</strong> {item.unit}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Price details */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[9px] text-slate-500 block uppercase font-bold">Price</span>
                        <span className="font-mono font-bold text-amber-400 text-sm">
                          {formatCurrency(item.default_price, currency)}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* =========================================================================
          ADD / EDIT PRICE LIST ITEM MODAL
          Requested Fields:
          1. Item / Service Name *
          2. Category
          3. Unit name
          4. Quantity
          5. Price
          ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
          <div 
            className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl max-h-[90vh] flex flex-col shadow-2xl text-white overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900 shrink-0">
              <h3 className="font-bold text-base text-amber-400 flex items-center gap-2">
                <Package size={18} />
                <span>{editingItem ? 'Edit Price List Item' : 'New Price List Item'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSubmit} className="p-4 overflow-y-auto space-y-4 flex-1 overscroll-contain">
              {formError && (
                <div className="p-2.5 bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs rounded-xl flex items-center gap-2">
                  <X size={14} className="shrink-0 text-rose-400" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Field 1: Item / Service Name * */}
              <div>
                <label className="text-xs font-semibold text-slate-200 block mb-1">
                  Item / Service Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Tororo Portland Cement 32.5R"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-white focus:outline-hidden focus:border-amber-400"
                />
              </div>

              {/* Field 2: Category */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-200">
                    Category
                  </label>
                  {onNavigateToProfile && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsModalOpen(false);
                        onNavigateToProfile();
                      }}
                      className="text-[10px] text-amber-400 hover:underline"
                    >
                      + Manage Categories
                    </button>
                  )}
                </div>
                <select
                  value={category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-white focus:outline-hidden focus:border-amber-400"
                >
                  {userCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Lock Unit & Quantity Option (Requested for Labour, Services, Lump Sum) */}
              <div className={`p-3 rounded-xl border transition-all ${
                lockUnitQty 
                  ? 'bg-amber-950/20 border-amber-500/40 shadow-xs' 
                  : 'bg-slate-950 border-slate-800'
              }`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className={`p-2 rounded-lg shrink-0 mt-0.5 transition-colors ${
                      lockUnitQty ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {lockUnitQty ? <Lock size={16} /> : <Unlock size={16} />}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5 flex-wrap">
                        <span>Lock Unit & Quantity</span>
                        {lockUnitQty ? (
                          <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded font-semibold uppercase tracking-wider">
                            Locked (Flat / Labour)
                          </span>
                        ) : (
                          <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded font-normal">
                            Unlocked
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                        {lockUnitQty
                          ? 'Unit and quantity locked as 1 Lump Sum. Perfect for Labour, Flat Services & Fixed Fees.'
                          : 'Use for Labour, Services, or Flat Fees where quantity & unit are not needed.'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleToggleLock}
                    className={`px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition-all active:scale-95 flex items-center gap-1.5 shadow-sm ${
                      lockUnitQty
                        ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                    }`}
                  >
                    {lockUnitQty ? (
                      <>
                        <Lock size={13} />
                        <span>Locked</span>
                      </>
                    ) : (
                      <>
                        <Unlock size={13} />
                        <span>Lock Fields</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Row: Field 3 (Unit name) & Field 4 (Quantity) */}
              <div className={`grid grid-cols-2 gap-3 transition-opacity ${lockUnitQty ? 'opacity-65' : ''}`}>
                {/* Field 3: Unit name */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-200">
                      Unit Name
                    </label>
                    {lockUnitQty && (
                      <span className="text-[10px] text-amber-400 font-mono flex items-center gap-0.5">
                        <Lock size={10} /> Fixed
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    disabled={lockUnitQty}
                    required={!lockUnitQty}
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder={lockUnitQty ? 'lump sum' : 'e.g. bags, trips, pcs'}
                    className={`w-full border rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-hidden focus:border-amber-400 ${
                      lockUnitQty 
                        ? 'bg-slate-900 border-slate-800 cursor-not-allowed text-slate-400 italic' 
                        : 'bg-slate-950 border-slate-700'
                    }`}
                  />
                  {/* Quick Unit Presets */}
                  {!lockUnitQty ? (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {['pcs', 'bags', 'trips', 'days', 'hrs'].map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => setUnit(u)}
                          className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                            unit === u
                              ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                              : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                          }`}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Locked (Lump sum service)
                    </span>
                  )}
                </div>

                {/* Field 4: Quantity */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-200">
                      Quantity
                    </label>
                    {lockUnitQty && (
                      <span className="text-[10px] text-amber-400 font-mono flex items-center gap-0.5">
                        <Lock size={10} /> Fixed
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={lockUnitQty}
                      onClick={() => {
                        const newQ = Math.max(1, quantity - 1);
                        setQuantity(newQ);
                        setQuantityStr(formatWithCommas(newQ));
                      }}
                      className="w-8 h-9 bg-slate-800 hover:bg-slate-750 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700 rounded-lg text-slate-200 font-bold flex items-center justify-center active:scale-95"
                    >
                      -
                    </button>
                    <input
                      type="text"
                      inputMode="numeric"
                      disabled={lockUnitQty}
                      required={!lockUnitQty}
                      value={lockUnitQty ? '1' : quantityStr}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^\d]/g, '');
                        const formatted = formatWithCommas(raw);
                        setQuantityStr(formatted);
                        setQuantity(Math.max(1, parseFormattedNumber(raw)));
                      }}
                      className={`w-full text-center border rounded-xl py-2 text-xs sm:text-sm text-white font-mono focus:outline-hidden focus:border-amber-400 ${
                        lockUnitQty
                          ? 'bg-slate-900 border-slate-800 cursor-not-allowed text-slate-400'
                          : 'bg-slate-950 border-slate-700'
                      }`}
                    />
                    <button
                      type="button"
                      disabled={lockUnitQty}
                      onClick={() => {
                        const newQ = quantity + 1;
                        setQuantity(newQ);
                        setQuantityStr(formatWithCommas(newQ));
                      }}
                      className="w-8 h-9 bg-slate-800 hover:bg-slate-750 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700 rounded-lg text-slate-200 font-bold flex items-center justify-center active:scale-95"
                    >
                      +
                    </button>
                  </div>
                  {/* Quick Quantity presets */}
                  {!lockUnitQty ? (
                    <div className="flex gap-1 mt-1.5 justify-center">
                      {[1, 5, 10, 20, 100].map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => {
                            setQuantity(q);
                            setQuantityStr(formatWithCommas(q));
                          }}
                          className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                            quantity === q
                              ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                              : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                          }`}
                        >
                          {formatWithCommas(q)}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-500 mt-1 block text-center">
                      Fixed at 1
                    </span>
                  )}
                </div>
              </div>

              {/* Field 5: Price */}
              <div>
                <label className="text-xs font-semibold text-amber-400 block mb-1">
                  Price ({currency}) *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={priceStr}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^\d.]/g, '');
                      const formatted = formatWithCommas(raw);
                      setPriceStr(formatted);
                      setPrice(parseFormattedNumber(raw));
                    }}
                    placeholder="e.g. 36,000"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-3 pr-14 py-2.5 text-sm sm:text-base text-white font-mono focus:outline-hidden focus:border-amber-400 font-bold"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-amber-400/80 pointer-events-none">
                    {currency}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Amounts format automatically with commas (e.g. 1,000, 36,000, 1,200,000)
                </p>
              </div>

              {/* Modal Actions */}
              <div className="flex gap-2 pt-3 border-t border-slate-800 sticky bottom-0 bg-slate-900">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold rounded-xl text-xs active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 active:scale-95 shadow-md shadow-amber-500/20"
                >
                  <Check size={16} />
                  <span>{editingItem ? 'Save Changes' : 'Add Item'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
