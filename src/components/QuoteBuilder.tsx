import React, { useState, useEffect, useRef } from 'react';
import { 
  Quote, 
  QuoteType, 
  QuoteSection, 
  QuoteLine, 
  LineType, 
  Client, 
  SavedItem, 
  Profile, 
  ClientViewMode,
  PaymentStage,
  CurrencyCode,
  DurationFrequency,
  DurationSegment,
  ExpectedDuration
} from '../types';
import { recalculateQuote, createDefaultSectionsForType, DEFAULT_CATEGORIES } from '../services/storage';
import { formatCurrency, formatWithCommas, parseFormattedNumber, formatExpectedDuration } from '../utils/formatters';
import { NumericKeypadModal } from './NumericKeypadModal';
import { ClientCardPreview } from './ClientCardPreview';
import { 
  Plus, 
  Trash2, 
  DollarSign, 
  Layers, 
  Sparkles, 
  Calendar, 
  MapPin, 
  Clock, 
  Percent, 
  ChevronDown, 
  ChevronUp, 
  Check, 
  CheckCircle2,
  UserPlus, 
  Package, 
  ArrowLeft,
  Copy,
  FileCheck2,
  AlertCircle,
  X,
  Lock,
  Users,
  Tag,
  Search
} from 'lucide-react';

interface QuoteBuilderProps {
  initialQuote: Quote;
  clients: Client[];
  savedItems: SavedItem[];
  profile: Profile;
  onSaveQuote: (quote: Quote) => void;
  onBack: () => void;
  onAddNewClient: (clientData: Partial<Client>) => Client;
  onAddSavedItem?: (item: SavedItem) => void;
  onUpdateProfile?: (profile: Profile) => void;
}

export const QuoteBuilder: React.FC<QuoteBuilderProps> = ({
  initialQuote,
  clients,
  savedItems,
  profile,
  onSaveQuote,
  onBack,
  onAddNewClient,
  onAddSavedItem,
  onUpdateProfile,
}) => {
  const [quote, setQuote] = useState<Quote>(() => recalculateQuote(initialQuote, profile.tax_rate));
  const [showMoreOptions, setShowMoreOptions] = useState<boolean>(false);
  const [showClientPreview, setShowClientPreview] = useState<boolean>(false);
  const [activeCatalogSectionId, setActiveCatalogSectionId] = useState<string | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<string>('Saved');
  const [showSavedToast, setShowSavedToast] = useState<boolean>(false);
  const [showQuickClientModal, setShowQuickClientModal] = useState<boolean>(false);
  const [newClientName, setNewClientName] = useState<string>('');
  const [newClientPhone, setNewClientPhone] = useState<string>('');

  // User categories from profile or default categories
  const userCategories = profile.categories && profile.categories.length > 0
    ? profile.categories
    : DEFAULT_CATEGORIES;

  // Add Section Modal State
  const [isAddSectionModalOpen, setIsAddSectionModalOpen] = useState<boolean>(false);
  const [sectionModalCategory, setSectionModalCategory] = useState<string>(userCategories[0] || 'Materials');
  const [sectionModalName, setSectionModalName] = useState<string>(userCategories[0] || 'Materials');
  const [selectedModalItemIds, setSelectedModalItemIds] = useState<string[]>([]);
  
  // Inline category creation in modal
  const [showAddCategoryInline, setShowAddCategoryInline] = useState<boolean>(false);
  const [newCategoryNameInput, setNewCategoryNameInput] = useState<string>('');
  
  // Inline price item creation in modal
  const [showAddPriceInline, setShowAddPriceInline] = useState<boolean>(false);
  const [newPriceName, setNewPriceName] = useState<string>('');
  const [newPriceLockUnitQty, setNewPriceLockUnitQty] = useState<boolean>(false);
  const [newPriceUnit, setNewPriceUnit] = useState<string>('pcs');
  const [newPriceQtyStr, setNewPriceQtyStr] = useState<string>('1');
  const [newPricePriceStr, setNewPricePriceStr] = useState<string>('');
  const [newPriceError, setNewPriceError] = useState<string>('');

  // Add Line Modal State
  const [addLineSectionId, setAddLineSectionId] = useState<string | null>(null);
  const [addLineCategory, setAddLineCategory] = useState<string>('');
  const [addLineSearch, setAddLineSearch] = useState<string>('');
  const [selectedAddLineItemIds, setSelectedAddLineItemIds] = useState<string[]>([]);
  const [showAddLineNewPriceInline, setShowAddLineNewPriceInline] = useState<boolean>(false);

  // Keypad State
  const [keypadConfig, setKeypadConfig] = useState<{
    isOpen: boolean;
    title: string;
    initialValue: number;
    isCurrency: boolean;
    currency?: CurrencyCode;
    unitLabel?: string;
    onApply: (val: number) => void;
  }>({
    isOpen: false,
    title: '',
    initialValue: 0,
    isCurrency: false,
    onApply: () => {},
  });

  const currency = profile.currency || 'UGX';

  // Keep refs up-to-date synchronously
  const latestQuoteRef = useRef<Quote>(quote);
  latestQuoteRef.current = quote;

  const onSaveQuoteRef = useRef(onSaveQuote);
  onSaveQuoteRef.current = onSaveQuote;

  // Sync quote changes immediately to parent state and localStorage without calling parent setState inside updater
  const updateQuote = (updater: (prev: Quote) => Quote) => {
    const nextQuote = updater(latestQuoteRef.current);
    latestQuoteRef.current = nextQuote;
    setQuote(nextQuote);
    onSaveQuoteRef.current(nextQuote);
    setAutoSaveStatus('Saved');
  };

  const handleManualSave = () => {
    onSaveQuoteRef.current(latestQuoteRef.current);
    setAutoSaveStatus('Saved just now');
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2500);
  };

  const handleBack = () => {
    onSaveQuoteRef.current(latestQuoteRef.current);
    onBack();
  };

  // Update client if changed in clients list or dropdown
  const handleClientChange = (clientId: string) => {
    const selected = clients.find((c) => c.id === clientId);
    updateQuote((prev) => recalculateQuote({
      ...prev,
      client_id: clientId,
      client: selected,
    }, profile.tax_rate));
  };

  // Change quote type
  const handleQuoteTypeChange = (newType: QuoteType) => {
    if (newType === quote.quote_type) return;

    updateQuote((prev) => recalculateQuote({
      ...prev,
      quote_type: newType,
    }, profile.tax_rate));
  };

  // Add line to section
  const handleAddLine = (sectionId: string, lineType: LineType = 'item') => {
    updateQuote((prev) => {
      const updatedSections = prev.sections.map((section) => {
        if (section.id !== sectionId) return section;
        const newLine: QuoteLine = {
          id: `line_${Math.random().toString(36).substring(2, 9)}`,
          section_id: sectionId,
          line_type: lineType,
          description: '',
          quantity: 1,
          unit: lineType === 'hours' ? 'hours' : lineType === 'fixed' ? 'lump sum' : 'pcs',
          unit_price: 0,
          total_price: 0,
          unit_cost: 0,
          total_cost: 0,
          position: section.lines.length,
        };
        return {
          ...section,
          lines: [...section.lines, newLine],
        };
      });
      return recalculateQuote({ ...prev, sections: updatedSections }, profile.tax_rate);
    });
  };

  // Update line field
  const handleUpdateLine = (sectionId: string, lineId: string, updates: Partial<QuoteLine>) => {
    updateQuote((prev) => {
      const updatedSections = prev.sections.map((section) => {
        if (section.id !== sectionId) return section;
        const updatedLines = section.lines.map((line) => {
          if (line.id !== lineId) return line;
          return { ...line, ...updates };
        });
        return { ...section, lines: updatedLines };
      });
      return recalculateQuote({ ...prev, sections: updatedSections }, profile.tax_rate);
    });
  };

  // Remove line
  const handleRemoveLine = (sectionId: string, lineId: string) => {
    updateQuote((prev) => {
      const updatedSections = prev.sections.map((section) => {
        if (section.id !== sectionId) return section;
        return {
          ...section,
          lines: section.lines.filter((l) => l.id !== lineId),
        };
      });
      return recalculateQuote({ ...prev, sections: updatedSections }, profile.tax_rate);
    });
  };

  // Open Add Section Modal
  const handleOpenAddSectionModal = () => {
    const defaultCat = userCategories[0] || 'Materials';
    setSectionModalCategory(defaultCat);
    setSectionModalName(defaultCat);
    setSelectedModalItemIds([]);
    setShowAddCategoryInline(false);
    setShowAddPriceInline(false);
    setIsAddSectionModalOpen(true);
  };

  const handleSelectModalCategory = (cat: string) => {
    setSectionModalCategory(cat);
    setSectionModalName(cat);
    setShowAddCategoryInline(false);
    setShowAddPriceInline(false);
  };

  const handleSaveNewCategoryFromModal = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategoryNameInput.trim();
    if (!trimmed) return;
    if (!userCategories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      const updatedCategories = [...userCategories, trimmed];
      onUpdateProfile?.({
        ...profile,
        categories: updatedCategories,
      });
    }
    setSectionModalCategory(trimmed);
    setSectionModalName(trimmed);
    setNewCategoryNameInput('');
    setShowAddCategoryInline(false);
  };

  const handleOpenNewPriceInline = () => {
    setNewPriceName('');
    const isLabour = (sectionModalCategory || '').toLowerCase().includes('labour') || (sectionModalCategory || '').toLowerCase().includes('service');
    setNewPriceLockUnitQty(isLabour);
    setNewPriceUnit(isLabour ? 'lump sum' : 'pcs');
    setNewPriceQtyStr('1');
    setNewPricePriceStr('');
    setNewPriceError('');
    setShowAddPriceInline(true);
  };

  const handleSaveNewPriceFromModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPriceName.trim()) {
      setNewPriceError('Item / Service Name is required');
      return;
    }
    const cat = sectionModalCategory || userCategories[0] || 'Materials';
    const isLocked = newPriceLockUnitQty;
    const qty = isLocked ? 1 : Math.max(1, parseFormattedNumber(newPriceQtyStr) || 1);
    const price = Math.max(0, parseFormattedNumber(newPricePriceStr) || 0);
    const unit = isLocked ? (newPriceUnit.trim() || 'lump sum') : (newPriceUnit.trim() || 'pcs');

    const newItem: SavedItem = {
      id: `itm_${Math.random().toString(36).substring(2, 9)}`,
      name: newPriceName.trim(),
      category: cat,
      unit,
      quantity: qty,
      default_quantity: qty,
      default_price: price,
      lock_unit_qty: isLocked,
    };

    onAddSavedItem?.(newItem);
    setSelectedModalItemIds((prev) => [...prev, newItem.id]);
    setShowAddPriceInline(false);
    setNewPriceName('');
    setNewPricePriceStr('');
    setNewPriceError('');
  };

  const handleConfirmAddSection = () => {
    const finalSectionName = (sectionModalName || sectionModalCategory || 'New Section').trim();
    const finalSectionCategory = (sectionModalCategory || finalSectionName).trim();
    const newSectionId = `sec_${Math.random().toString(36).substring(2, 9)}`;

    const selectedItems = savedItems.filter((item) => selectedModalItemIds.includes(item.id));
    const linesToAdd: QuoteLine[] = selectedItems.map((item, idx) => {
      const isLocked = !!item.lock_unit_qty;
      const qty = isLocked ? 1 : Math.max(1, Number(item.quantity || item.default_quantity || 1));
      const price = Math.max(0, Number(item.default_price || 0));
      return {
        id: `line_${Math.random().toString(36).substring(2, 9)}_${idx}`,
        section_id: newSectionId,
        line_type: isLocked ? 'fixed' : 'item',
        description: item.name,
        quantity: qty,
        unit: isLocked ? (item.unit || 'lump sum') : (item.unit || 'pcs'),
        unit_price: price,
        total_price: qty * price,
        unit_cost: 0,
        total_cost: 0,
        position: idx,
      };
    });

    const newSection: QuoteSection = {
      id: newSectionId,
      quote_id: quote.id,
      name: finalSectionName,
      category: finalSectionCategory,
      position: quote.sections.length,
      lines: linesToAdd,
    };

    updateQuote((prev) => recalculateQuote({
      ...prev,
      sections: [...prev.sections, newSection],
    }, profile.tax_rate));

    setIsAddSectionModalOpen(false);
  };

  // Remove section
  const handleRemoveSection = (sectionId: string) => {
    updateQuote((prev) => {
      const updatedSections = prev.sections.filter((s) => s.id !== sectionId);
      return recalculateQuote({ ...prev, sections: updatedSections }, profile.tax_rate);
    });
  };

  // Insert item from catalog / price list
  const handleInsertSavedItem = (sectionId: string, item: SavedItem) => {
    const isLocked = !!item.lock_unit_qty;
    const itemQty = isLocked ? 1 : Math.max(1, Number(item.quantity || item.default_quantity || 1));
    const itemPrice = Math.max(0, Number(item.default_price || 0));

    updateQuote((prev) => {
      const updatedSections = prev.sections.map((section) => {
        if (section.id !== sectionId) return section;
        const newLine: QuoteLine = {
          id: `line_${Math.random().toString(36).substring(2, 9)}`,
          section_id: sectionId,
          line_type: isLocked ? 'fixed' : 'item',
          description: item.name,
          quantity: itemQty,
          unit: isLocked ? (item.unit || 'lump sum') : (item.unit || 'pcs'),
          unit_price: itemPrice,
          total_price: itemQty * itemPrice,
          unit_cost: 0,
          total_cost: 0,
          position: section.lines.length,
        };
        return {
          ...section,
          lines: [...section.lines, newLine],
        };
      });
      return recalculateQuote({ ...prev, sections: updatedSections }, profile.tax_rate);
    });
    setActiveCatalogSectionId(null);
  };

  // Helper to resolve section category
  const resolveSectionCategory = (section: QuoteSection): string => {
    if (section.category && section.category.trim()) {
      return section.category.trim();
    }
    const exact = userCategories.find(
      (c) => c.toLowerCase() === section.name.trim().toLowerCase()
    );
    if (exact) return exact;

    const partial = userCategories.find(
      (c) =>
        section.name.toLowerCase().includes(c.toLowerCase()) ||
        c.toLowerCase().includes(section.name.toLowerCase())
    );
    if (partial) return partial;

    for (const line of section.lines) {
      const itemMatch = savedItems.find(
        (it) => it.name.toLowerCase() === line.description.toLowerCase()
      );
      if (itemMatch?.category) return itemMatch.category;
    }

    return userCategories[0] || 'Materials';
  };

  // Open Add Line modal for a section pre-filtered to that section's category
  const handleOpenAddLineModal = (section: QuoteSection) => {
    const cat = resolveSectionCategory(section);
    setAddLineSectionId(section.id);
    setAddLineCategory(cat);
    setAddLineSearch('');
    setSelectedAddLineItemIds([]);
    setShowAddLineNewPriceInline(false);
    setNewPriceName('');
    const isLabour = cat.toLowerCase().includes('labour') || cat.toLowerCase().includes('service');
    setNewPriceLockUnitQty(isLabour);
    setNewPriceUnit(isLabour ? 'lump sum' : 'pcs');
    setNewPriceQtyStr('1');
    setNewPricePriceStr('');
    setNewPriceError('');
  };

  // Toggle item selection in Add Line modal
  const handleToggleAddLineItemId = (itemId: string, isAlreadyAdded?: boolean) => {
    if (isAlreadyAdded) return;
    setSelectedAddLineItemIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  // Quick insert single item into section (locked if already in section)
  const handleQuickAddSingleItem = (sectionId: string, item: SavedItem) => {
    updateQuote((prev) => {
      const updatedSections = prev.sections.map((section) => {
        if (section.id !== sectionId) return section;
        const alreadyExists = section.lines.some(
          (l) => l.description.trim().toLowerCase() === item.name.trim().toLowerCase()
        );
        if (alreadyExists) return section;

        const isLocked = !!item.lock_unit_qty;
        const itemQty = isLocked ? 1 : Math.max(1, Number(item.quantity || item.default_quantity || 1));
        const itemPrice = Math.max(0, Number(item.default_price || 0));

        const newLine: QuoteLine = {
          id: `line_${Math.random().toString(36).substring(2, 9)}`,
          section_id: sectionId,
          line_type: isLocked ? 'fixed' : 'item',
          description: item.name,
          quantity: itemQty,
          unit: isLocked ? (item.unit || 'lump sum') : (item.unit || 'pcs'),
          unit_price: itemPrice,
          total_price: itemQty * itemPrice,
          unit_cost: 0,
          total_cost: 0,
          position: section.lines.length,
        };
        return {
          ...section,
          lines: [...section.lines, newLine],
        };
      });
      return recalculateQuote({ ...prev, sections: updatedSections }, profile.tax_rate);
    });
  };

  // Insert multiple checked items into section (excluding already added items)
  const handleAddItemsToSection = (sectionId: string, itemsToAdd: SavedItem[]) => {
    if (itemsToAdd.length === 0) return;

    updateQuote((prev) => {
      const updatedSections = prev.sections.map((section) => {
        if (section.id !== sectionId) return section;

        const filteredItems = itemsToAdd.filter(
          (item) => !section.lines.some((l) => l.description.trim().toLowerCase() === item.name.trim().toLowerCase())
        );
        if (filteredItems.length === 0) return section;

        const startIdx = section.lines.length;
        const newLines: QuoteLine[] = filteredItems.map((item, idx) => {
          const isLocked = !!item.lock_unit_qty;
          const qty = isLocked ? 1 : Math.max(1, Number(item.quantity || item.default_quantity || 1));
          const price = Math.max(0, Number(item.default_price || 0));
          return {
            id: `line_${Math.random().toString(36).substring(2, 9)}_${idx}`,
            section_id: sectionId,
            line_type: isLocked ? 'fixed' : 'item',
            description: item.name,
            quantity: qty,
            unit: isLocked ? (item.unit || 'lump sum') : (item.unit || 'pcs'),
            unit_price: price,
            total_price: qty * price,
            unit_cost: 0,
            total_cost: 0,
            position: startIdx + idx,
          };
        });

        return {
          ...section,
          lines: [...section.lines, ...newLines],
        };
      });

      return recalculateQuote({ ...prev, sections: updatedSections }, profile.tax_rate);
    });

    setAddLineSectionId(null);
  };

  // Save brand new price from within Add Line modal and automatically add it into the section
  const handleSaveNewPriceFromAddLineModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPriceName.trim()) {
      setNewPriceError('Item / Service Name is required');
      return;
    }
    const cat = addLineCategory || userCategories[0] || 'Materials';
    const isLocked = newPriceLockUnitQty;
    const qty = isLocked ? 1 : Math.max(1, parseFormattedNumber(newPriceQtyStr) || 1);
    const price = Math.max(0, parseFormattedNumber(newPricePriceStr) || 0);
    const unit = isLocked ? (newPriceUnit.trim() || 'lump sum') : (newPriceUnit.trim() || 'pcs');

    const newItem: SavedItem = {
      id: `itm_${Math.random().toString(36).substring(2, 9)}`,
      name: newPriceName.trim(),
      category: cat,
      unit,
      quantity: qty,
      default_quantity: qty,
      default_price: price,
      lock_unit_qty: isLocked,
    };

    onAddSavedItem?.(newItem);

    if (addLineSectionId) {
      handleQuickAddSingleItem(addLineSectionId, newItem);
      setSelectedAddLineItemIds((prev) => [...prev, newItem.id]);
    }
    setShowAddLineNewPriceInline(false);
    setNewPriceName('');
    setNewPricePriceStr('');
    setNewPriceError('');
  };

  const [quickClientError, setQuickClientError] = useState<string>('');

  // Quick Client Creation
  const handleCreateQuickClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim() || !newClientPhone.trim()) {
      setQuickClientError('Client Name and Phone are required.');
      return;
    }
    setQuickClientError('');
    const created = onAddNewClient({
      name: newClientName.trim(),
      phone: newClientPhone.trim(),
    });
    updateQuote((prev) => recalculateQuote({
      ...prev,
      client_id: created.id,
      client: created,
    }, profile.tax_rate));
    setShowQuickClientModal(false);
    setNewClientName('');
    setNewClientPhone('');
  };

  // Duration segments helpers
  const getDurationSegments = (): DurationSegment[] => {
    if (quote.expected_duration?.segments && quote.expected_duration.segments.length > 0) {
      return quote.expected_duration.segments;
    }
    if (quote.expected_duration?.value || quote.expected_duration?.frequency) {
      const s1Freq = (quote.expected_duration.frequency && quote.expected_duration.frequency !== 'years_months'
        ? quote.expected_duration.frequency
        : 'years') as DurationSegment['frequency'];
      const s1Val = quote.expected_duration.value ?? '';
      const s2Val = quote.expected_duration.secondary_value ?? '';
      return [
        { id: 'dur_1', frequency: s1Freq, value: s1Val },
        { id: 'dur_2', frequency: 'months', value: s2Val }
      ];
    }
    return [
      { id: 'dur_1', frequency: 'years', value: '' as const },
      { id: 'dur_2', frequency: 'months', value: '' as const }
    ];
  };

  const handleUpdateDurationSegment = (id: string, field: 'frequency' | 'value', val: any) => {
    const currentSegments = getDurationSegments();
    const updated: DurationSegment[] = currentSegments.map((seg) => {
      if (seg.id === id) {
        return { ...seg, [field]: val };
      }
      return seg;
    });

    updateQuote((prev) => ({
      ...prev,
      expected_duration: {
        ...prev.expected_duration,
        segments: updated,
        frequency: updated[0]?.frequency,
        value: updated[0]?.value ?? '',
        secondary_value: updated[1]?.value ?? '',
      },
    }));
  };

  const handleAddDurationSegment = () => {
    const currentSegments = getDurationSegments();
    const nextId = `dur_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const lastFreq = currentSegments[currentSegments.length - 1]?.frequency;
    const nextFreq: DurationSegment['frequency'] =
      lastFreq === 'years' ? 'months' :
      lastFreq === 'months' ? 'weeks' :
      lastFreq === 'weeks' ? 'days' :
      lastFreq === 'days' ? 'hours' : 'days';

    const newSeg: DurationSegment = { id: nextId, frequency: nextFreq, value: '' };
    const updated: DurationSegment[] = [...currentSegments, newSeg];

    updateQuote((prev) => ({
      ...prev,
      expected_duration: {
        ...prev.expected_duration,
        segments: updated,
        frequency: updated[0]?.frequency,
        value: updated[0]?.value ?? '',
        secondary_value: updated[1]?.value ?? '',
      },
    }));
  };

  const handleRemoveDurationSegment = (id: string) => {
    const currentSegments = getDurationSegments();
    if (currentSegments.length <= 1) {
      handleUpdateDurationSegment(id, 'value', '');
      return;
    }
    const updated: DurationSegment[] = currentSegments.filter((s) => s.id !== id);
    updateQuote((prev) => ({
      ...prev,
      expected_duration: {
        ...prev.expected_duration,
        segments: updated,
        frequency: updated[0]?.frequency,
        value: updated[0]?.value ?? '',
        secondary_value: updated[1]?.value ?? '',
      },
    }));
  };

  return (
    <div className="pb-36 max-w-2xl mx-auto">
      {/* Floating Save Toast Notification */}
      {showSavedToast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-slate-950 font-black px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 text-xs sm:text-sm animate-in fade-in slide-in-from-top-4 duration-200 border-2 border-emerald-300">
          <CheckCircle2 size={18} className="stroke-[3]" />
          <span>Quotation Saved Successfully!</span>
        </div>
      )}

      {/* =========================================================================
          ALWAYS-VISIBLE STICKY TOP BAR (Running Total + Quick Save)
          ========================================================================= */}
      <div className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-3 py-2.5 shadow-xl transition-all">
        <div className="flex items-center justify-between gap-2">
          {/* Back button and quote number */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBack}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 active:scale-95"
              title="Back to Quotation list"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-amber-400 text-sm tracking-wide">
                  {quote.quote_number}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">
                  {quote.status.toUpperCase()}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                <span>{autoSaveStatus}</span>
              </p>
            </div>
          </div>

          {/* Right side: Running Total + Prominent Save Quotation Button */}
          <div className="flex items-center gap-2">
            <div className="text-right">
              <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">
                Total
              </span>
              <span className="text-sm sm:text-base font-black font-mono text-emerald-400 leading-none">
                {formatCurrency(quote.total, currency)}
              </span>
            </div>

            <button
              type="button"
              onClick={handleManualSave}
              className="py-2 px-3 sm:px-4 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black rounded-xl text-xs sm:text-sm flex items-center gap-1.5 shadow-lg shadow-emerald-500/25 transition-all shrink-0 cursor-pointer"
            >
              <Check size={16} className="stroke-[3]" />
              <span>Save Quotation</span>
            </button>
          </div>
        </div>

        {/* Action Toggles Strip */}
        <div className="mt-2 flex items-center justify-between gap-1.5 pt-1 text-xs">
          <div className="flex items-center gap-1.5">
            {/* Client View Mode indicator */}
            <span className="text-[11px] text-slate-400">
              Card Mode: <strong className="text-amber-400 font-semibold">{quote.client_view_mode.replace('_', ' ')}</strong>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Secondary Save Button in sub-bar */}
            <button
              type="button"
              onClick={handleManualSave}
              className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold rounded-lg text-xs flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
            >
              <Check size={12} />
              <span>Save Quotation</span>
            </button>

            {/* Preview Card Button */}
            <button
              type="button"
              onClick={() => setShowClientPreview(!showClientPreview)}
              className={`px-3 py-1 rounded-lg font-medium flex items-center gap-1 transition-all ${
                showClientPreview
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
            >
              <FileCheck2 size={13} />
              <span>{showClientPreview ? 'Edit Quote' : 'Preview Card'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          IF PREVIEW CARD TOGGLED: SHOW CLIENT CARD PREVIEW
          ========================================================================= */}
      {showClientPreview ? (
        <div className="p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <FileCheck2 size={16} className="text-amber-400" />
              <span>Client Card Output</span>
            </h3>
            <button
              type="button"
              onClick={() => setShowClientPreview(false)}
              className="text-xs text-amber-400 hover:underline font-semibold"
            >
              Back to Editor
            </button>
          </div>

          <ClientCardPreview
            quote={quote}
            profile={profile}
            onUpdateProfile={onUpdateProfile}
            onViewModeChange={(mode) => {
              updateQuote((prev) => recalculateQuote({ ...prev, client_view_mode: mode }, profile.tax_rate));
            }}
          />
        </div>
      ) : (
        /* =========================================================================
            EDITOR MODE
            ========================================================================= */
        <div className="p-3 sm:p-4 space-y-4">
          {/* Quote Type Selector */}
          <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-2xl">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2 px-1">
              Select Quote Type
            </span>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => handleQuoteTypeChange('materials_labour')}
                className={`p-2.5 rounded-xl text-center font-medium transition-all ${
                  quote.quote_type === 'materials_labour'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Materials + Labour
              </button>
              <button
                type="button"
                onClick={() => handleQuoteTypeChange('service_package')}
                className={`p-2.5 rounded-xl text-center font-medium transition-all ${
                  quote.quote_type === 'service_package'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Service / Package
              </button>
            </div>
          </div>

          {/* =========================================================================
              CLIENT'S DETAILS (Required Client + Quick Add + Project Scope)
              ========================================================================= */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3.5 shadow-md">
            {/* Header: Client's details & + Quick Add */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Users size={17} className="text-amber-400" />
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Client's details
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickClientModal(true)}
                className="px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 hover:text-amber-200 rounded-xl text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-xs"
              >
                <UserPlus size={14} />
                <span>+ Quick Add</span>
              </button>
            </div>

            {/* Field: Client (Required) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1">
                  <span>Client (Required)</span>
                  <span className="text-rose-400">*</span>
                </label>
                {quote.client?.phone && (
                  <span className="text-[11px] text-emerald-400 font-medium">
                    {quote.client.phone}
                  </span>
                )}
              </div>
              <select
                value={quote.client_id || ''}
                onChange={(e) => handleClientChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-sm text-white font-medium focus:outline-hidden transition-colors cursor-pointer"
                required
              >
                <option value="">-- Select Client (Required) --</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `(${c.phone})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Field: Project Name/ Job Name */}
            <div>
              <label className="text-xs font-bold text-slate-200 block mb-1.5">
                Project Name/ Job Name
              </label>
              <input
                type="text"
                value={quote.job_title}
                onChange={(e) => updateQuote((prev) => ({ ...prev, job_title: e.target.value }))}
                placeholder="e.g. Wall Plastering & Painting / Roofing / 3-Bedroom Construction"
                className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-hidden transition-colors"
              />
            </div>

            {/* Field: Project Location */}
            <div>
              <label className="text-xs font-bold text-slate-200 block mb-1.5 flex items-center gap-1.5">
                <MapPin size={13} className="text-amber-400" />
                <span>Project Location</span>
              </label>
              <input
                type="text"
                value={quote.job_location || ''}
                onChange={(e) => updateQuote((prev) => ({ ...prev, job_location: e.target.value }))}
                placeholder="e.g. Ntinda Plot 14, Kampala"
                className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-hidden transition-colors"
              />
            </div>

            {/* Service / Package specific fields (Event date, time, venue) */}
            {quote.quote_type === 'service_package' && (
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] font-medium text-slate-400 flex items-center gap-1 mb-1">
                    <Calendar size={12} className="text-amber-400" />
                    <span>Event Date</span>
                  </label>
                  <input
                    type="date"
                    value={quote.event_date || ''}
                    onChange={(e) => updateQuote((prev) => ({ ...prev, event_date: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-400 flex items-center gap-1 mb-1">
                    <Clock size={12} className="text-amber-400" />
                    <span>Event Time</span>
                  </label>
                  <input
                    type="text"
                    value={quote.event_time || ''}
                    onChange={(e) => updateQuote((prev) => ({ ...prev, event_time: e.target.value }))}
                    placeholder="e.g. 2:00 PM - 10:00 PM"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-400 flex items-center gap-1 mb-1">
                    <MapPin size={12} className="text-amber-400" />
                    <span>Venue</span>
                  </label>
                  <input
                    type="text"
                    value={quote.event_venue || ''}
                    onChange={(e) => updateQuote((prev) => ({ ...prev, event_venue: e.target.value }))}
                    placeholder="e.g. Speke Resort Munyonyo"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* =========================================================================
              SECTIONS & LINES BUILDER
              ========================================================================= */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                <Layers size={16} className="text-amber-400" />
                <span>Quotation Sections ({quote.sections.length})</span>
              </h3>
              <button
                type="button"
                onClick={handleOpenAddSectionModal}
                className="text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-black shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
              >
                <Plus size={15} className="stroke-[3]" />
                <span>Add Section</span>
              </button>
            </div>

            {quote.sections.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/60 border-2 border-dashed border-slate-800 rounded-2xl space-y-3 animate-in fade-in">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                  <Layers size={24} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">No sections added yet</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    This quotation is empty. Tap "+ Add Section" to choose your price list categories and items.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenAddSectionModal}
                  className="py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs sm:text-sm inline-flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
                >
                  <Plus size={16} className="stroke-[3]" />
                  <span>+ Add Section from Price List</span>
                </button>
              </div>
            ) : (
              quote.sections.map((section, sIdx) => {
                const sectionTotal = section.lines.reduce((acc, l) => acc + (Number(l.total_price) || 0), 0);

                return (
                  <div
                    key={section.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm"
                  >
                    {/* Section Header */}
                    <div className="bg-slate-850 px-3 py-2.5 border-b border-slate-800 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 text-xs font-mono font-bold flex items-center justify-center">
                          {sIdx + 1}
                        </span>
                        <input
                          type="text"
                          value={section.name}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateQuote((prev) => ({
                              ...prev,
                              sections: prev.sections.map((s) => (s.id === section.id ? { ...s, name: val } : s)),
                            }));
                          }}
                          className="font-bold text-sm text-white bg-transparent border-none focus:outline-hidden focus:ring-1 focus:ring-amber-400 px-1 py-0.5 rounded-sm max-w-[160px] sm:max-w-none"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-amber-400">
                          {formatCurrency(sectionTotal, currency)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSection(section.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 rounded-md transition-colors"
                          title="Delete section"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                  {/* Lines list inside section */}
                  <div className="p-2 sm:p-3 space-y-2.5">
                    {section.lines.length === 0 ? (
                      <div className="p-4 text-center border-2 border-dashed border-slate-800 rounded-xl bg-slate-950/40 space-y-2.5">
                        <p className="text-xs text-slate-400">
                          No items in <span className="font-bold text-white">{section.name}</span> yet.
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenAddLineModal(section)}
                            className="py-1.5 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-xs inline-flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-md shadow-amber-500/20"
                          >
                            <Plus size={14} className="stroke-[3]" />
                            <span>Add Line from {resolveSectionCategory(section)} Price List</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddLine(section.id, 'item')}
                            className="py-1.5 px-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 font-medium rounded-lg text-xs inline-flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                          >
                            <Plus size={12} />
                            <span>Blank Line</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      section.lines.map((line, lIdx) => {
                        return (
                          <div
                            key={line.id}
                            className="p-2.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2"
                          >
                            {/* Top row: Description & delete */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <input
                                  type="text"
                                  value={line.description}
                                  onChange={(e) =>
                                    handleUpdateLine(section.id, line.id, { description: e.target.value })
                                  }
                                  placeholder="Item / service description..."
                                  className="w-full bg-slate-900 border border-slate-800 focus:border-amber-400 text-xs sm:text-sm text-white px-2.5 py-1.5 rounded-lg focus:outline-hidden"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveLine(section.id, line.id)}
                                className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg bg-slate-900"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>

                            {/* Middle row: Quantity, Unit, Unit Price */}
                            <div className="grid grid-cols-12 gap-1.5 items-center">
                              {/* Quantity button (tap to open keypad) */}
                              <div className={line.line_type === 'fixed' ? "col-span-4" : "col-span-4"}>
                                {line.line_type === 'fixed' ? (
                                  <div className="text-[11px] text-center text-slate-400 py-2 bg-slate-900 border border-slate-800 rounded-lg font-medium flex items-center justify-center gap-1">
                                    <Lock size={10} className="text-amber-400" />
                                    <span>Flat</span>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setKeypadConfig({
                                        isOpen: true,
                                        title: `Quantity for: ${line.description || 'Line item'}`,
                                        initialValue: line.quantity,
                                        isCurrency: false,
                                        unitLabel: line.unit,
                                        onApply: (val) =>
                                          handleUpdateLine(section.id, line.id, { quantity: val || 1 }),
                                      })
                                    }
                                    className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-700/80 px-2 py-1.5 rounded-lg text-center active:scale-95 transition-transform cursor-pointer"
                                  >
                                    <span className="text-[9px] text-slate-400 block leading-tight">Quantity</span>
                                    <span className="font-bold font-mono text-xs text-white">
                                      {formatWithCommas(line.quantity)}
                                    </span>
                                  </button>
                                )}
                              </div>

                              {/* Unit Name (editable) */}
                              <div className="col-span-3">
                                <div className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-center">
                                  <span className="text-[9px] text-slate-400 block leading-tight">Unit</span>
                                  <input
                                    type="text"
                                    value={line.unit}
                                    onChange={(e) => handleUpdateLine(section.id, line.id, { unit: e.target.value })}
                                    placeholder="pcs"
                                    className="w-full bg-transparent text-center font-bold text-xs text-white focus:outline-hidden"
                                  />
                                </div>
                              </div>

                              {/* Unit Price button */}
                              <div className="col-span-5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setKeypadConfig({
                                      isOpen: true,
                                      title: `Unit Price for: ${line.description || 'Line item'}`,
                                      initialValue: line.unit_price,
                                      isCurrency: true,
                                      currency,
                                      unitLabel: line.unit,
                                      onApply: (val) =>
                                        handleUpdateLine(section.id, line.id, { unit_price: val }),
                                    })
                                  }
                                  className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-700/80 px-2 py-1.5 rounded-lg text-right active:scale-95 transition-transform cursor-pointer"
                                >
                                  <span className="text-[9px] text-slate-400 block leading-tight">
                                    {line.line_type === 'fixed' ? 'Fixed Price' : 'Unit Price'}
                                  </span>
                                  <span className="font-bold font-mono text-xs text-amber-400">
                                    {formatCurrency(line.unit_price, currency)}
                                  </span>
                                </button>
                              </div>
                            </div>

                            {/* Line Total display */}
                            <div className="flex justify-between items-center text-[11px] text-slate-400 pt-0.5">
                              <span>
                                {line.line_type !== 'fixed' && `${formatWithCommas(line.quantity)} × ${formatWithCommas(line.unit_price)}`}
                              </span>
                              <span className="font-mono font-bold text-slate-200 text-xs">
                                = {formatCurrency(line.total_price, currency)}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}

                    {/* Section Add Buttons: Add Line from Price List of that section OR Blank Line */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleOpenAddLineModal(section)}
                        className="flex-1 py-2.5 px-3 bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 active:scale-95 border border-amber-500/30 transition-all cursor-pointer shadow-xs"
                      >
                        <Plus size={15} className="stroke-[3]" />
                        <span>Add Line ({resolveSectionCategory(section)} Price List)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAddLine(section.id, 'item')}
                        className="py-2.5 px-3 bg-slate-800 hover:bg-slate-750 text-slate-300 font-medium rounded-xl text-xs flex items-center justify-center gap-1.5 active:scale-95 border border-slate-700/60 transition-all cursor-pointer shrink-0"
                        title="Add blank custom line"
                      >
                        <Plus size={13} className="text-slate-400" />
                        <span>Blank Line</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          </div>

          {/* =========================================================================
              COLLAPSED "MORE OPTIONS" (Discount, Tax, Deposit, Valid Until, Notes)
              ========================================================================= */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-3.5 flex items-center justify-between text-left hover:bg-slate-800/20 transition-colors">
              <div
                onClick={() => {
                  updateQuote((prev) => ({
                    ...prev,
                    show_options_and_terms: !(prev.show_options_and_terms !== false),
                  }));
                }}
                className="flex items-center gap-2 flex-1 cursor-pointer select-none"
              >
                <Percent size={16} className="text-amber-400" />
                <span className="font-bold text-sm text-slate-200">
                  More Options & Terms
                </span>
                {(quote.discount_amount > 0 || quote.deposit_amount > 0 || quote.tax_rate > 0 || !!quote.notes_terms) && (
                  <span className="text-[10px] px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-full font-bold">
                    Configured
                  </span>
                )}
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1 ${
                    quote.show_options_and_terms !== false
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {quote.show_options_and_terms !== false ? 'Show: Enabled' : 'Show: Disabled'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Enable / Disable Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    updateQuote((prev) => ({
                      ...prev,
                      show_options_and_terms: !(prev.show_options_and_terms !== false),
                    }));
                  }}
                  className={`py-1.5 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-xs ${
                    quote.show_options_and_terms !== false
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-emerald-500/20'
                      : 'bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700'
                  }`}
                  title={
                    quote.show_options_and_terms !== false
                      ? 'Terms are shown on quotation. Click to disable.'
                      : 'Terms are hidden on quotation. Click to enable.'
                  }
                >
                  {quote.show_options_and_terms !== false ? (
                    <>
                      <CheckCircle2 size={13} className="stroke-[3]" />
                      <span>Enabled</span>
                    </>
                  ) : (
                    <>
                      <X size={13} />
                      <span>Disabled</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {quote.show_options_and_terms !== false ? (
              <div className="p-3 sm:p-4 border-t border-slate-800 space-y-4 bg-slate-950/40">
                {/* Enable/Disable Banner */}
                <div className="p-3 rounded-xl border bg-emerald-500/10 border-emerald-500/30 flex items-center justify-between gap-3">
                  <div>
                    <span className="font-bold text-xs block text-white flex items-center gap-1.5">
                      <span>Show on Quotation:</span>
                      <span className="text-emerald-400">Enabled</span>
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Duration, discount, tax, deposit, payment stages, and notes are shown on the quotation.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      updateQuote((prev) => ({
                        ...prev,
                        show_options_and_terms: false,
                      }))
                    }
                    className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer shrink-0 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40"
                  >
                    Disable
                  </button>
                </div>
                {/* Job Location */}
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">
                    Job Location
                  </label>
                  <input
                    type="text"
                    value={quote.job_location || ''}
                    onChange={(e) => updateQuote((prev) => ({ ...prev, job_location: e.target.value }))}
                    placeholder="e.g. Ntinda Plot 14, Kampala"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                {/* Expected Duration of the Job */}
                <div className="pt-2 border-t border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Clock size={13} className="text-amber-400" />
                      <span>Expected Duration of the job</span>
                    </label>
                    {quote.expected_duration && formatExpectedDuration(quote.expected_duration) && (
                      <span className="text-[11px] font-bold text-amber-400 font-mono bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                        {formatExpectedDuration(quote.expected_duration)}
                      </span>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    {getDurationSegments().map((seg) => (
                      <div
                        key={seg.id}
                        className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800 grid grid-cols-12 gap-2.5 items-end"
                      >
                        {/* Frequency Field */}
                        <div className="col-span-6 sm:col-span-5">
                          <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                            Frequency
                          </label>
                          <select
                            value={seg.frequency}
                            onChange={(e) =>
                              handleUpdateDurationSegment(
                                seg.id,
                                'frequency',
                                e.target.value as any
                              )
                            }
                            className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-lg px-2.5 py-2 text-xs text-white cursor-pointer"
                          >
                            <option value="hours">Hours</option>
                            <option value="days">Days</option>
                            <option value="weeks">Weeks</option>
                            <option value="months">Months</option>
                            <option value="years">Years</option>
                          </select>
                        </div>

                        {/* Type in Field */}
                        <div className="col-span-5 sm:col-span-6">
                          <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                            {seg.frequency === 'hours'
                              ? 'Number of Hours'
                              : seg.frequency === 'days'
                              ? 'Number of Days'
                              : seg.frequency === 'weeks'
                              ? 'Number of Weeks'
                              : seg.frequency === 'months'
                              ? 'Number of Months'
                              : 'Number of Years'}
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={formatWithCommas(seg.value)}
                            onChange={(e) => {
                              const val = parseFormattedNumber(e.target.value);
                              handleUpdateDurationSegment(
                                seg.id,
                                'value',
                                e.target.value.trim() === '' ? '' : val
                              );
                            }}
                            placeholder="e.g. 1"
                            className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-lg px-2.5 py-2 text-xs text-white font-mono"
                          />
                        </div>

                        {/* Remove button if more than 1 row */}
                        <div className="col-span-1 sm:col-span-1 flex justify-center pb-1">
                          {getDurationSegments().length > 1 ? (
                            <button
                              type="button"
                              onClick={() => handleRemoveDurationSegment(seg.id)}
                              className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Remove this frequency"
                            >
                              <Trash2 size={14} />
                            </button>
                          ) : (
                            <div className="w-5" />
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Button to add another one */}
                    <div className="pt-0.5">
                      <button
                        type="button"
                        onClick={handleAddDurationSegment}
                        className="px-3 py-1.5 bg-slate-800/90 hover:bg-slate-750 border border-slate-700 text-amber-300 hover:text-amber-200 rounded-xl text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-xs"
                      >
                        <Plus size={13} className="stroke-[3]" />
                        <span>+ Add another frequency</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Discount & Tax */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                  {/* Discount */}
                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1">
                      Discount
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={quote.discount_type}
                        onChange={(e) =>
                          updateQuote((prev) =>
                            recalculateQuote(
                              { ...prev, discount_type: e.target.value as 'percentage' | 'fixed' },
                              profile.tax_rate
                            )
                          )
                        }
                        className="bg-slate-900 border border-slate-700 text-xs text-white rounded-xl px-2 py-2"
                      >
                        <option value="percentage">% Percent</option>
                        <option value="fixed">Fixed {currency}</option>
                      </select>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formatWithCommas(quote.discount_value ?? '')}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^\d.]/g, '');
                          const num = parseFormattedNumber(raw);
                          updateQuote((prev) =>
                            recalculateQuote(
                              { ...prev, discount_value: num },
                              profile.tax_rate
                            )
                          );
                        }}
                        placeholder="0"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  {/* Tax */}
                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1">
                      Tax Rate (%)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formatWithCommas(quote.tax_rate ?? 0)}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^\d.]/g, '');
                        const num = parseFormattedNumber(raw);
                        updateQuote((prev) =>
                          recalculateQuote(
                            { ...prev, tax_rate: num },
                            num
                          )
                        );
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                </div>

                {/* Deposit Required */}
                <div className="pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-slate-400">
                      Deposit Required
                    </label>
                    {quote.deposit_amount > 0 && (
                      <span className="text-xs font-mono font-bold text-amber-400">
                        {formatCurrency(quote.deposit_amount, currency)}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={quote.deposit_type}
                      onChange={(e) =>
                        updateQuote((prev) =>
                          recalculateQuote(
                            { ...prev, deposit_type: e.target.value as 'percentage' | 'fixed' },
                            profile.tax_rate
                          )
                        )
                      }
                      className="bg-slate-900 border border-slate-700 text-xs text-white rounded-xl px-2 py-2"
                    >
                      <option value="percentage">% Percent</option>
                      <option value="fixed">Fixed {currency}</option>
                    </select>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formatWithCommas(quote.deposit_value ?? '')}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^\d.]/g, '');
                        const num = parseFormattedNumber(raw);
                        updateQuote((prev) =>
                          recalculateQuote(
                            { ...prev, deposit_value: num },
                            profile.tax_rate
                          )
                        );
                      }}
                      placeholder={quote.deposit_type === 'percentage' ? 'e.g. 50' : 'e.g. 100,000'}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                  {/* Quick deposit presets */}
                  <div className="flex gap-1.5 mt-2">
                    {[30, 50, 70].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() =>
                          updateQuote((prev) =>
                            recalculateQuote(
                              { ...prev, deposit_type: 'percentage', deposit_value: pct },
                              profile.tax_rate
                            )
                          )
                        }
                        className="px-2.5 py-1 text-[11px] bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-750 active:scale-95"
                      >
                        {pct}% Deposit
                      </button>
                    ))}
                  </div>
                </div>

                {/* Payment Stages */}
                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-slate-400">
                      Payment Stages
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const newStage: PaymentStage = {
                          id: `ps_${Date.now()}`,
                          name: `Milestone ${quote.payment_stages.length + 1}`,
                          percent: 25,
                          amount: (quote.total * 25) / 100,
                        };
                        updateQuote((prev) =>
                          recalculateQuote(
                            { ...prev, payment_stages: [...prev.payment_stages, newStage] },
                            profile.tax_rate
                          )
                        );
                      }}
                      className="text-[11px] text-amber-400 hover:underline font-semibold"
                    >
                      + Add Stage
                    </button>
                  </div>

                  {quote.payment_stages.map((stage) => (
                    <div key={stage.id} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={stage.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateQuote((prev) =>
                            recalculateQuote(
                              {
                                ...prev,
                                payment_stages: prev.payment_stages.map((s) =>
                                  s.id === stage.id ? { ...s, name: val } : s
                                ),
                              },
                              profile.tax_rate
                            )
                          );
                        }}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white"
                        placeholder="Stage Name"
                      />
                      <div className="flex items-center gap-1 w-24">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formatWithCommas(stage.percent ?? 0)}
                          onChange={(e) => {
                            const val = parseFormattedNumber(e.target.value);
                            updateQuote((prev) =>
                              recalculateQuote(
                                {
                                  ...prev,
                                  payment_stages: prev.payment_stages.map((s) =>
                                    s.id === stage.id ? { ...s, percent: val, amount: (prev.total * val) / 100 } : s
                                  ),
                                },
                                profile.tax_rate
                              )
                            );
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white text-right font-mono"
                        />
                        <span className="text-xs text-slate-400">%</span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          updateQuote((prev) =>
                            recalculateQuote(
                              {
                                ...prev,
                                payment_stages: prev.payment_stages.filter((s) => s.id !== stage.id),
                              },
                              profile.tax_rate
                            )
                          )
                        }
                        className="text-slate-500 hover:text-rose-400 p-1"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Notes and Terms */}
                <div className="pt-2 border-t border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-slate-400">
                      Notes and Terms
                    </label>
                  </div>
                  <textarea
                    rows={3}
                    value={quote.notes_terms || ''}
                    onChange={(e) => updateQuote((prev) => ({ ...prev, notes_terms: e.target.value }))}
                    placeholder="e.g. 50% deposit before mobilization. Balance payable on completion..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white leading-relaxed"
                  />
                  {/* Preset Buttons */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        updateQuote((prev) => ({
                          ...prev,
                          notes_terms:
                            '50% deposit required upon signing to mobilize materials. Balance payable on completion and inspection. Quotation valid for 14 days.',
                        }))
                      }
                      className="px-2 py-1 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md"
                    >
                      50% Upfront Preset
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateQuote((prev) => ({
                          ...prev,
                          notes_terms:
                            'Materials prices subject to market fluctuation after 14 days. Site water and electricity provided by client.',
                        }))
                      }
                      className="px-2 py-1 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md"
                    >
                      Building Works Terms
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* When Disabled: Hide the form */
              <div className="p-4 border-t border-slate-800 bg-slate-950/40 text-center space-y-2">
                <p className="text-xs text-slate-400">
                  More Options & Terms are currently <strong className="text-rose-400 font-semibold">Disabled</strong> and hidden from this quotation.
                </p>
                <button
                  type="button"
                  onClick={() =>
                    updateQuote((prev) => ({
                      ...prev,
                      show_options_and_terms: true,
                    }))
                  }
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs inline-flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <CheckCircle2 size={14} className="stroke-[3]" />
                  <span>Enable More Options & Terms</span>
                </button>
              </div>
            )}
          </div>

          {/* Action buttons at bottom */}
          <div className="pt-4 p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white">Save Quotation</h4>
                <p className="text-xs text-slate-400">Save all edits made to items, pricing, notes, and clients</p>
              </div>
              <span className="text-[11px] font-mono font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                <span>{autoSaveStatus}</span>
              </span>
            </div>

            <button
              type="button"
              onClick={handleManualSave}
              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black rounded-xl text-sm sm:text-base flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/25 transition-all cursor-pointer"
            >
              <Check size={20} className="stroke-[3]" />
              <span>Save Quotation</span>
            </button>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleBack}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 active:scale-95 border border-slate-700 cursor-pointer"
              >
                <ArrowLeft size={16} />
                <span>Back to Quotation List</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  handleManualSave();
                  setShowClientPreview(true);
                }}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 active:scale-95 shadow-md shadow-amber-500/20 cursor-pointer"
              >
                <FileCheck2 size={16} />
                <span>Save & Preview Card</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          KEYPAD MODAL
          ========================================================================= */}
      <NumericKeypadModal
        isOpen={keypadConfig.isOpen}
        title={keypadConfig.title}
        initialValue={keypadConfig.initialValue}
        isCurrency={keypadConfig.isCurrency}
        currency={currency}
        unitLabel={keypadConfig.unitLabel}
        onSave={(val) => keypadConfig.onApply(val)}
        onClose={() => setKeypadConfig((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* =========================================================================
          ADD SECTION FROM PRICE LIST CATEGORIES MODAL
          ========================================================================= */}
      {isAddSectionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl text-white overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-4 py-3 bg-slate-850 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Layers size={18} className="text-amber-400" />
                <div>
                  <h3 className="font-bold text-sm text-white">Add Section from Price List</h3>
                  <p className="text-[11px] text-slate-400">Select price list category & items to add to this section</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddSectionModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Category Selection Header + Add Category Button */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                    <Tag size={14} className="text-amber-400" />
                    <span>Price List Categories</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddCategoryInline(!showAddCategoryInline)}
                    className="text-amber-400 hover:text-amber-300 font-bold text-xs flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 active:scale-95 transition-all cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>Add New Category</span>
                  </button>
                </div>

                {/* Inline Add New Category Box */}
                {showAddCategoryInline && (
                  <form
                    onSubmit={handleSaveNewCategoryFromModal}
                    className="p-3 bg-slate-950 border border-amber-500/40 rounded-xl space-y-2 animate-in fade-in"
                  >
                    <span className="text-[11px] font-bold text-amber-400 block">
                      Create New Price List Category
                    </span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newCategoryNameInput}
                        onChange={(e) => setNewCategoryNameInput(e.target.value)}
                        placeholder="e.g. Roofing, Electrical, Tiling, Plumbing..."
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-hidden focus:border-amber-400"
                        autoFocus
                      />
                      <button
                        type="submit"
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs active:scale-95 cursor-pointer"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddCategoryInline(false);
                          setNewCategoryNameInput('');
                        }}
                        className="px-2.5 py-1.5 bg-slate-800 text-slate-400 rounded-lg text-xs hover:text-white"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {/* Categories Grid */}
                <div className="flex flex-wrap gap-1.5">
                  {userCategories.map((cat) => {
                    const isSelected = (sectionModalCategory || '').toLowerCase() === cat.toLowerCase();
                    const count = savedItems.filter(
                      (i) => (i.category || '').toLowerCase() === cat.toLowerCase()
                    ).length;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => handleSelectModalCategory(cat)}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                            : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800'
                        }`}
                      >
                        {isSelected && <Check size={13} className="stroke-[3]" />}
                        <span>{cat}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                            isSelected ? 'bg-slate-950/20 text-slate-900 font-bold' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section Name Editable Input */}
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">
                  Section Name in Quotation
                </label>
                <input
                  type="text"
                  value={sectionModalName}
                  onChange={(e) => setSectionModalName(e.target.value)}
                  placeholder="e.g. Materials or Ground Floor Labour"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-400 font-bold"
                />
              </div>

              {/* Items Under Selected Category */}
              {sectionModalCategory && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="font-bold text-slate-200 text-xs block">
                        Price Lists in "{sectionModalCategory}"
                      </label>
                      <span className="text-[10px] text-slate-400">
                        Check items to include in this section
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleOpenNewPriceInline}
                      className="text-amber-400 hover:text-amber-300 font-bold text-xs flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 active:scale-95 transition-all cursor-pointer"
                    >
                      <Plus size={13} />
                      <span>Add New Price</span>
                    </button>
                  </div>

                  {/* Inline Form to Add a New Price item */}
                  {showAddPriceInline && (
                    <form
                      onSubmit={handleSaveNewPriceFromModal}
                      className="p-3 bg-slate-950 border border-amber-500/40 rounded-xl space-y-3 animate-in fade-in"
                    >
                      <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                        <span className="font-bold text-xs text-amber-400">
                          Add New Price under "{sectionModalCategory}"
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowAddPriceInline(false)}
                          className="text-slate-400 hover:text-white"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      {newPriceError && (
                        <div className="p-2 bg-rose-500/20 border border-rose-500/30 text-rose-300 rounded-lg text-xs">
                          {newPriceError}
                        </div>
                      )}

                      <div>
                        <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                          Item / Service Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={newPriceName}
                          onChange={(e) => setNewPriceName(e.target.value)}
                          placeholder="e.g. Portland Cement 50kg / Masonry Daily Labour"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-hidden focus:border-amber-400"
                          autoFocus
                        />
                      </div>

                      {/* Lock unit & quantity toggle */}
                      <div className="flex items-center gap-2 p-2 bg-slate-900/80 rounded-lg border border-slate-800">
                        <input
                          type="checkbox"
                          id="modalNewPriceLock"
                          checked={newPriceLockUnitQty}
                          onChange={(e) => {
                            const val = e.target.checked;
                            setNewPriceLockUnitQty(val);
                            if (val) {
                              setNewPriceUnit('lump sum');
                              setNewPriceQtyStr('1');
                            } else {
                              setNewPriceUnit('pcs');
                            }
                          }}
                          className="rounded-sm accent-amber-500 w-3.5 h-3.5 cursor-pointer"
                        />
                        <label htmlFor="modalNewPriceLock" className="text-[11px] text-slate-300 cursor-pointer">
                          Lock Unit name & Quantity (e.g. for Labour / Lump Sum)
                        </label>
                      </div>

                      {!newPriceLockUnitQty && (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                              Unit Name
                            </label>
                            <input
                              type="text"
                              value={newPriceUnit}
                              onChange={(e) => setNewPriceUnit(e.target.value)}
                              placeholder="e.g. pcs, bags, trips"
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                              Default Quantity
                            </label>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={newPriceQtyStr}
                              onChange={(e) => {
                                const parsed = parseFormattedNumber(e.target.value);
                                setNewPriceQtyStr(parsed > 0 ? formatWithCommas(parsed) : e.target.value);
                              }}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                            />
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                          Price ({currency})
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={newPricePriceStr}
                          onChange={(e) => {
                            const parsed = parseFormattedNumber(e.target.value);
                            setNewPricePriceStr(parsed > 0 ? formatWithCommas(parsed) : e.target.value);
                          }}
                          placeholder="e.g. 35,000"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono text-emerald-400 font-bold"
                        />
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setShowAddPriceInline(false)}
                          className="flex-1 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 font-medium rounded-lg text-xs"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs active:scale-95 cursor-pointer shadow-md shadow-emerald-500/20"
                        >
                          Save to Price List & Select
                        </button>
                      </div>
                    </form>
                  )}

                  {/* List of items in selected category */}
                  {(() => {
                    const itemsInCat = savedItems.filter(
                      (i) => (i.category || '').toLowerCase() === (sectionModalCategory || '').toLowerCase()
                    );

                    if (itemsInCat.length === 0) {
                      return (
                        <div className="p-4 bg-slate-950/70 border border-dashed border-slate-800 rounded-xl text-center space-y-2">
                          <p className="text-slate-400 text-xs">
                            No price list items found in "{sectionModalCategory}".
                          </p>
                          <button
                            type="button"
                            onClick={handleOpenNewPriceInline}
                            className="text-xs bg-slate-800 hover:bg-slate-750 text-amber-400 hover:text-amber-300 px-3 py-1.5 rounded-lg font-bold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Plus size={13} />
                            <span>Add First Item</span>
                          </button>
                        </div>
                      );
                    }

                    const allSelected = itemsInCat.every((i) => selectedModalItemIds.includes(i.id));

                    return (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between px-1">
                          <span className="text-[11px] text-slate-400">
                            {selectedModalItemIds.filter((id) => itemsInCat.some((i) => i.id === id)).length} of {itemsInCat.length} selected
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (allSelected) {
                                setSelectedModalItemIds((prev) =>
                                  prev.filter((id) => !itemsInCat.some((i) => i.id === id))
                                );
                              } else {
                                const newIds = new Set([...selectedModalItemIds, ...itemsInCat.map((i) => i.id)]);
                                setSelectedModalItemIds(Array.from(newIds));
                              }
                            }}
                            className="text-[11px] text-amber-400 hover:underline font-semibold cursor-pointer"
                          >
                            {allSelected ? 'Deselect All' : 'Select All'}
                          </button>
                        </div>

                        <div className="max-h-52 overflow-y-auto space-y-1.5 pr-0.5">
                          {itemsInCat.map((item) => {
                            const isChecked = selectedModalItemIds.includes(item.id);
                            return (
                              <div
                                key={item.id}
                                onClick={() => {
                                  setSelectedModalItemIds((prev) =>
                                    isChecked ? prev.filter((id) => id !== item.id) : [...prev, item.id]
                                  );
                                }}
                                className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all active:scale-98 ${
                                  isChecked
                                    ? 'bg-amber-500/15 border-amber-500/50 text-white'
                                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-300'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                  <div
                                    className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                                      isChecked
                                        ? 'bg-amber-500 border-amber-400 text-slate-950 font-bold'
                                        : 'border-slate-700 bg-slate-900'
                                    }`}
                                  >
                                    {isChecked && <Check size={12} className="stroke-[3]" />}
                                  </div>
                                  <div className="truncate">
                                    <span className="font-semibold block truncate text-xs text-white">
                                      {item.name}
                                    </span>
                                    {item.lock_unit_qty ? (
                                      <span className="text-[10px] text-amber-400 flex items-center gap-0.5 font-medium">
                                        <Lock size={9} /> Flat / Lump Sum
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-slate-400">
                                        Qty: {formatWithCommas(item.quantity || item.default_quantity || 1)} {item.unit || 'pcs'}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="text-right shrink-0">
                                  <span className="font-mono text-emerald-400 font-bold text-xs block">
                                    {formatCurrency(item.default_price || 0, currency)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="px-4 py-3 bg-slate-850 border-t border-slate-800 flex items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsAddSectionModalOpen(false)}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold rounded-xl text-xs active:scale-95 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAddSection}
                className="py-2.5 px-5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black rounded-xl text-xs sm:text-sm flex items-center gap-1.5 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
              >
                <Plus size={16} className="stroke-[3]" />
                <span>
                  {selectedModalItemIds.length > 0
                    ? `Add Section (${selectedModalItemIds.length} item${selectedModalItemIds.length === 1 ? '' : 's'})`
                    : 'Add Section'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          ADD LINE FROM PRICE LIST MODAL
          ========================================================================= */}
    {addLineSectionId && (() => {
      const targetSection = quote.sections.find((s) => s.id === addLineSectionId);
      if (!targetSection) return null;

      const currentCategory = addLineCategory || resolveSectionCategory(targetSection);
      const categoryItems = savedItems.filter((item) => {
        const matchCat = (item.category || '').toLowerCase() === currentCategory.toLowerCase();
        if (!matchCat) return false;
        if (!addLineSearch.trim()) return true;
        return item.name.toLowerCase().includes(addLineSearch.trim().toLowerCase());
      });

      const unaddedCategoryItems = categoryItems.filter(
        (i) => !targetSection.lines.some((l) => l.description.trim().toLowerCase() === i.name.trim().toLowerCase())
      );
      const allCatSelected = unaddedCategoryItems.length > 0 && unaddedCategoryItems.every((i) => selectedAddLineItemIds.includes(i.id));

      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl text-white overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-4 py-3 bg-slate-850 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                  <Package size={17} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                    <span>Add Line to</span>
                    <span className="text-amber-400">"{targetSection.name}"</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Category: <span className="font-bold text-slate-200">{currentCategory}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAddLineSectionId(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Category Pills Switcher */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                    <Tag size={13} className="text-amber-400" />
                    <span>Price List Categories</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const isLabour = currentCategory.toLowerCase().includes('labour') || currentCategory.toLowerCase().includes('service');
                        setNewPriceLockUnitQty(isLabour);
                        setNewPriceUnit(isLabour ? 'lump sum' : 'pcs');
                        setNewPriceQtyStr('1');
                        setNewPricePriceStr('');
                        setNewPriceName('');
                        setNewPriceError('');
                        setShowAddLineNewPriceInline(!showAddLineNewPriceInline);
                      }}
                      className="text-amber-400 hover:text-amber-300 font-bold text-xs flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 active:scale-95 transition-all cursor-pointer"
                    >
                      <Plus size={13} />
                      <span>Add New Price</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleAddLine(targetSection.id, 'item');
                        setAddLineSectionId(null);
                      }}
                      className="text-slate-400 hover:text-white font-medium text-xs flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 transition-all cursor-pointer"
                      title="Add blank custom line"
                    >
                      <Plus size={12} />
                      <span>Blank Line</span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {userCategories.map((cat) => {
                    const isSelected = currentCategory.toLowerCase() === cat.toLowerCase();
                    const count = savedItems.filter(
                      (i) => (i.category || '').toLowerCase() === cat.toLowerCase()
                    ).length;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setAddLineCategory(cat);
                          setShowAddLineNewPriceInline(false);
                          setNewPriceError('');
                        }}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                            : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800'
                        }`}
                      >
                        {isSelected && <Check size={12} className="stroke-[3]" />}
                        <span>{cat}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                            isSelected ? 'bg-slate-950/25 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Inline Form to Add a New Price item under this category */}
              {showAddLineNewPriceInline && (
                <form
                  onSubmit={handleSaveNewPriceFromAddLineModal}
                  className="p-3 bg-slate-950 border border-amber-500/40 rounded-xl space-y-3 animate-in fade-in"
                >
                  <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                    <span className="font-bold text-xs text-amber-400">
                      Add New Price under "{currentCategory}"
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAddLineNewPriceInline(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {newPriceError && (
                    <div className="p-2 bg-rose-500/20 border border-rose-500/30 text-rose-300 rounded-lg text-xs">
                      {newPriceError}
                    </div>
                  )}

                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Item / Service Name *
                    </label>
                    <input
                      type="text"
                      value={newPriceName}
                      onChange={(e) => setNewPriceName(e.target.value)}
                      placeholder="e.g. Portland Cement, Sand, Timber..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-hidden focus:border-amber-400"
                      autoFocus
                    />
                  </div>

                  {/* Lock Unit & Quantity Option */}
                  <label className="flex items-center gap-2 p-2 bg-slate-900/80 rounded-lg border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newPriceLockUnitQty}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setNewPriceLockUnitQty(checked);
                        if (checked) {
                          setNewPriceUnit('lump sum');
                          setNewPriceQtyStr('1');
                        } else {
                          setNewPriceUnit('pcs');
                        }
                      }}
                      className="w-3.5 h-3.5 rounded-sm border-slate-700 text-amber-500 focus:ring-amber-400 accent-amber-500 cursor-pointer"
                    />
                    <div className="flex-1">
                      <span className="text-xs font-bold text-white flex items-center gap-1">
                        <Lock size={12} className="text-amber-400" />
                        Lock Unit Name & Quantity
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        For fixed-price services, lump sum labour, etc.
                      </span>
                    </div>
                  </label>

                  {!newPriceLockUnitQty && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                          Unit Name
                        </label>
                        <input
                          type="text"
                          value={newPriceUnit}
                          onChange={(e) => setNewPriceUnit(e.target.value)}
                          placeholder="e.g. pcs, bags, trips..."
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                          Default Quantity
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={newPriceQtyStr}
                          onChange={(e) => {
                            const parsed = parseFormattedNumber(e.target.value);
                            setNewPriceQtyStr(parsed > 0 ? formatWithCommas(parsed) : e.target.value);
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Price ({currency}) *
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={newPricePriceStr}
                      onChange={(e) => {
                        const parsed = parseFormattedNumber(e.target.value);
                        setNewPricePriceStr(parsed > 0 ? formatWithCommas(parsed) : e.target.value);
                      }}
                      placeholder="e.g. 35,000"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono text-emerald-400 font-bold"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddLineNewPriceInline(false)}
                      className="flex-1 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 font-medium rounded-lg text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs active:scale-95 cursor-pointer shadow-md shadow-emerald-500/20"
                    >
                      Save to Price List & Add to Section
                    </button>
                  </div>
                </form>
              )}

              {/* Search Bar if category has items */}
              {savedItems.some((i) => (i.category || '').toLowerCase() === currentCategory.toLowerCase()) && (
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={addLineSearch}
                    onChange={(e) => setAddLineSearch(e.target.value)}
                    placeholder={`Search ${currentCategory} items...`}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400"
                  />
                  {addLineSearch && (
                    <button
                      type="button"
                      onClick={() => setAddLineSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              )}

              {/* Items in Selected Category */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200 text-xs">
                    Price Lists in "{currentCategory}" ({categoryItems.length})
                  </span>
                  {unaddedCategoryItems.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        const availableIds = unaddedCategoryItems.map((i) => i.id);
                        if (allCatSelected) {
                          setSelectedAddLineItemIds((prev) =>
                            prev.filter((id) => !availableIds.includes(id))
                          );
                        } else {
                          const newIds = new Set([...selectedAddLineItemIds, ...availableIds]);
                          setSelectedAddLineItemIds(Array.from(newIds));
                        }
                      }}
                      className="text-[11px] text-amber-400 hover:underline font-semibold cursor-pointer"
                    >
                      {allCatSelected ? 'Deselect Available' : 'Select All Available'}
                    </button>
                  ) : categoryItems.length > 0 ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold inline-flex items-center gap-1">
                      <Check size={11} className="stroke-[3]" /> All items in section
                    </span>
                  ) : null}
                </div>

                {categoryItems.length === 0 ? (
                  <div className="p-6 bg-slate-950/70 border border-dashed border-slate-800 rounded-xl text-center space-y-2.5">
                    <p className="text-slate-400 text-xs">
                      No price list items found in <span className="font-bold text-white">"{currentCategory}"</span>.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        const isLabour = currentCategory.toLowerCase().includes('labour') || currentCategory.toLowerCase().includes('service');
                        setNewPriceLockUnitQty(isLabour);
                        setNewPriceUnit(isLabour ? 'lump sum' : 'pcs');
                        setNewPriceQtyStr('1');
                        setNewPricePriceStr('');
                        setNewPriceName('');
                        setNewPriceError('');
                        setShowAddLineNewPriceInline(true);
                      }}
                      className="text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 px-3.5 py-1.5 rounded-lg font-bold inline-flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-md shadow-amber-500/20"
                    >
                      <Plus size={14} className="stroke-[3]" />
                      <span>Add First Price to {currentCategory}</span>
                    </button>
                  </div>
                ) : (
                  <div className="max-h-60 overflow-y-auto space-y-1.5 pr-0.5">
                    {categoryItems.map((item) => {
                      const isAlreadyAdded = targetSection.lines.some(
                        (l) => l.description.trim().toLowerCase() === item.name.trim().toLowerCase()
                      );
                      const isChecked = selectedAddLineItemIds.includes(item.id);

                      return (
                        <div
                          key={item.id}
                          className={`p-2.5 rounded-xl border flex items-center justify-between gap-2.5 transition-all ${
                            isAlreadyAdded
                              ? 'bg-slate-900/40 border-slate-800/80 opacity-65 cursor-not-allowed select-none'
                              : isChecked
                              ? 'bg-amber-500/15 border-amber-500/50 text-white'
                              : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 text-slate-300'
                          }`}
                        >
                          <label
                            className={`flex items-center gap-2.5 min-w-0 flex-1 ${
                              isAlreadyAdded ? 'cursor-not-allowed' : 'cursor-pointer'
                            }`}
                          >
                            {isAlreadyAdded ? (
                              <div
                                className="w-4 h-4 rounded-sm border border-slate-700 bg-slate-800 flex items-center justify-center shrink-0 text-amber-400"
                                title="Item already added to this section (Locked)"
                              >
                                <Lock size={10} />
                              </div>
                            ) : (
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleAddLineItemId(item.id, isAlreadyAdded)}
                                className="w-4 h-4 rounded-sm border-slate-700 text-amber-500 focus:ring-amber-400 accent-amber-500 cursor-pointer shrink-0"
                              />
                            )}

                            <div className="truncate flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`font-semibold block truncate text-xs ${isAlreadyAdded ? 'text-slate-400' : 'text-white'}`}>
                                  {item.name}
                                </span>
                                {item.lock_unit_qty && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-slate-800 text-amber-300 font-medium inline-flex items-center gap-0.5">
                                    <Lock size={9} /> Flat
                                  </span>
                                )}
                                {isAlreadyAdded && (
                                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold inline-flex items-center gap-1">
                                    <Lock size={9} /> Added (Locked)
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                {item.lock_unit_qty ? (
                                  <span>Fixed lump sum</span>
                                ) : (
                                  <span>
                                    Qty: <b className="text-slate-300">{formatWithCommas(item.quantity || item.default_quantity || 1)}</b> {item.unit || 'pcs'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </label>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-mono text-emerald-400 font-bold text-xs">
                              {formatCurrency(item.default_price || 0, currency)}
                            </span>
                            {isAlreadyAdded ? (
                              <span
                                className="px-2.5 py-1 bg-slate-850 text-slate-400 font-bold rounded-lg text-xs border border-slate-800 inline-flex items-center gap-1 select-none cursor-not-allowed"
                                title="This item is already added to this section and is locked"
                              >
                                <Check size={12} className="text-emerald-400 stroke-[3]" />
                                <span>Locked</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleQuickAddSingleItem(targetSection.id, item)}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 font-bold rounded-lg text-xs transition-colors active:scale-95 cursor-pointer"
                                title="Add to section immediately"
                              >
                                + Add
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-3 bg-slate-850 border-t border-slate-800 flex items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setAddLineSectionId(null)}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold rounded-xl text-xs active:scale-95 cursor-pointer"
              >
                Done
              </button>
              {selectedAddLineItemIds.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    const itemsToAdd = savedItems.filter((i) => selectedAddLineItemIds.includes(i.id));
                    handleAddItemsToSection(targetSection.id, itemsToAdd);
                  }}
                  className="py-2.5 px-5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black rounded-xl text-xs sm:text-sm flex items-center gap-1.5 shadow-lg shadow-amber-500/25 transition-all cursor-pointer"
                >
                  <Plus size={16} className="stroke-[3]" />
                  <span>
                    Add {selectedAddLineItemIds.length} Item{selectedAddLineItemIds.length === 1 ? '' : 's'} to {targetSection.name}
                  </span>
                </button>
              ) : (
                <span className="text-[11px] text-slate-400">
                  Tap '+ Add' or select checkboxes above
                </span>
              )}
            </div>
          </div>
        </div>
      );
    })()}

    {/* =========================================================================
        QUICK ADD CLIENT MODAL
        ========================================================================= */}
      {showQuickClientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-4 shadow-2xl text-white">
            <h3 className="font-bold text-base text-amber-400 mb-3">Add Client</h3>
            {quickClientError && (
              <div className="mb-3 p-2.5 bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs rounded-xl flex items-center gap-2">
                <X size={14} className="shrink-0 text-rose-400" />
                <span>{quickClientError}</span>
              </div>
            )}
            <form onSubmit={handleCreateQuickClient} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Client Name *
                </label>
                <input
                  type="text"
                  required
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="e.g. Ronald Musoke"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Phone / WhatsApp Number *
                </label>
                <input
                  type="tel"
                  required
                  value={newClientPhone}
                  onChange={(e) => setNewClientPhone(e.target.value)}
                  placeholder="e.g. +256 700 000 000"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowQuickClientModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 rounded-xl text-xs font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-500 rounded-xl text-xs font-bold text-slate-950"
                >
                  Save & Select
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          ALWAYS-VISIBLE FLOATING BOTTOM ACTION BAR (STICKY & IN FRONT)
          ========================================================================= */}
      <div className="fixed bottom-0 left-0 right-0 z-50 w-full max-w-[430px] mx-auto bg-slate-900/98 backdrop-blur-xl border-t border-slate-800 px-3 py-2.5 shadow-[0_-8px_30px_rgba(0,0,0,0.85)] pb-[max(0.6rem,env(safe-area-inset-bottom))]">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleBack}
            className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs flex items-center gap-1.5 border border-slate-700 active:scale-95 transition-all shrink-0 cursor-pointer"
            title="Back to Quotation list"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Back</span>
          </button>

          <div className="flex items-center gap-2 flex-1 justify-end">
            <button
              type="button"
              onClick={() => setShowClientPreview(!showClientPreview)}
              className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-xl text-xs flex items-center gap-1.5 border border-slate-700 active:scale-95 transition-all shrink-0 cursor-pointer"
            >
              <FileCheck2 size={15} className="text-amber-400" />
              <span>{showClientPreview ? 'Edit Quote' : 'Preview Card'}</span>
            </button>

            <button
              type="button"
              onClick={handleManualSave}
              className="flex-1 max-w-[240px] py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 transition-all cursor-pointer"
            >
              <Check size={18} className="stroke-[3]" />
              <span>Save Quotation</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
