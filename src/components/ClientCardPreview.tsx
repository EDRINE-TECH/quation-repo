import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Quote, Profile, ClientViewMode, QuotationLayoutSettings } from '../types';
import { DEFAULT_QUOTATION_LAYOUT } from '../services/storage';
import { 
  formatCurrency, 
  formatDate, 
  formatWithCommas, 
  formatExpectedDuration, 
  getWhatsAppUrl 
} from '../utils/formatters';
import { 
  captureElementAsImage, 
  downloadBlob, 
  copyImageBlobToClipboard,
  copyImagePromiseToClipboard,
  GeneratedImageResult 
} from '../utils/imageExport';
import { 
  Phone, 
  MapPin, 
  CheckCircle2, 
  Eye, 
  MessageCircle, 
  Send, 
  Mail, 
  Download,
  Image as ImageIcon,
  Loader2,
  Briefcase,
  User,
  CreditCard,
  Wallet,
  Landmark,
  Info,
  Handshake,
  FileText
} from 'lucide-react';

interface ClientCardPreviewProps {
  quote: Quote;
  profile: Profile;
  onViewModeChange?: (mode: ClientViewMode) => void;
  onUpdateProfile?: (profile: Profile) => void;
  interactive?: boolean;
}

export const ClientCardPreview: React.FC<ClientCardPreviewProps> = ({
  quote,
  profile,
  onViewModeChange,
  onUpdateProfile,
  interactive = true,
}) => {
  const currency = profile.currency || 'UGX';
  const showTerms = quote.show_options_and_terms !== false;

  const [whatsappNumber, setWhatsappNumber] = useState(quote.client?.phone || '');
  const [emailAddress, setEmailAddress] = useState(quote.client?.email || '');
  const [feedbackToast, setFeedbackToast] = useState<{ message: string; type: 'success' | 'info' | 'warning' } | null>(null);
  const [copiedImage, setCopiedImage] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  const cachedImageRef = useRef<{
    result: GeneratedImageResult;
    signature: string;
  } | null>(null);
  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  const cardElementRef = useRef<HTMLDivElement | null>(null);
  const [previewContainerWidth, setPreviewContainerWidth] = useState<number>(380);
  const [measuredCardHeight, setMeasuredCardHeight] = useState<number>(0);
  const [fittedCardWidth, setFittedCardWidth] = useState<number>(0);
  const [fittedBaselineWidth, setFittedBaselineWidth] = useState<number>(0);

  // Read layout settings directly from Profile (managed solely under Profile page)
  const resolvedLayout: QuotationLayoutSettings = {
    ...DEFAULT_QUOTATION_LAYOUT,
    ...(profile.quotation_layout || {}),
  };

  const scaleMap = { compact: 85, standard: 100, medium: 110, large: 120, extra_large: 135 };
  const currentFontPercent =
    resolvedLayout.font_size_percent ||
    (resolvedLayout.font_size_scale ? scaleMap[resolvedLayout.font_size_scale] : 100) ||
    100;
  const currentZoom = resolvedLayout.card_scale || 1.0;
  const currentCardWidth = resolvedLayout.card_width || 720;
  const currentCardHeight = resolvedLayout.card_height;
  const currentLengthMode = resolvedLayout.length_mode || 'compact';
  const currentVerticalSpacing = resolvedLayout.vertical_spacing || 'tight';
  const currentExportScale = resolvedLayout.export_scale || 2.5;

  const baseFlyerWidth = currentCardWidth >= 480 ? currentCardWidth : 720;
  const baseFlyerHeight = currentCardHeight && currentCardHeight >= 500 ? currentCardHeight : undefined;
  const baseZoomFactor = currentZoom >= 0.6 && currentZoom <= 1.8 ? currentZoom : 1.0;
  const baseLayoutWidth = Math.max(400, Math.round(baseFlyerWidth / baseZoomFactor));
  const baseEffectiveZoom = baseFlyerWidth / baseLayoutWidth;

  const layoutFitSignature = [
    quote.id,
    quote.updated_at || '',
    quote.total,
    quote.client_view_mode,
    quote.sections.map((s) => `${s.id}:${s.lines.length}`).join(','),
    quote.notes_terms || '',
    profile.business_name || '',
    profile.logo_url || '',
    profile.signature_url || '',
    profile.payment_details?.methods?.length || 0,
    baseFlyerWidth,
    baseFlyerHeight ?? 'auto',
    baseZoomFactor,
    currentFontPercent,
    currentLengthMode,
    currentVerticalSpacing,
    resolvedLayout.table_density || '',
    resolvedLayout.padding_density || '',
    String(resolvedLayout.compact_terms ?? ''),
    String(resolvedLayout.compact_payment ?? ''),
    String(resolvedLayout.show_decorations ?? true),
  ].join('|');

  // Synchronously fit baseline (100% font, 1.0 zoom) width to Profile Height before paint,
  // then apply user Font Size & Zoom on top so increases always visibly enlarge preview & WhatsApp PNG.
  useLayoutEffect(() => {
    const cardEl = cardElementRef.current;
    if (!cardEl) return;

    const fontScale = currentFontPercent / 100;

    // Pass 1 baseline: measure at 100% font & 1.0 zoom
    cardEl.style.setProperty('--bq-font-scale', '1');
    cardEl.style.width = `${baseFlyerWidth}px`;
    cardEl.style.minWidth = `${baseFlyerWidth}px`;
    cardEl.style.maxWidth = `${baseFlyerWidth}px`;
    cardEl.style.minHeight = '';

    const baselineNaturalH = Math.max(cardEl.offsetHeight, cardEl.scrollHeight);
    let nextBaselineW = baseFlyerWidth;

    if (baseFlyerHeight && baselineNaturalH > baseFlyerHeight + 4) {
      const pass1Ratio = Math.min(2.4, baselineNaturalH / baseFlyerHeight);
      const pass1Width = Math.round(baseFlyerWidth * pass1Ratio);
      cardEl.style.width = `${pass1Width}px`;
      cardEl.style.minWidth = `${pass1Width}px`;
      cardEl.style.maxWidth = `${pass1Width}px`;

      const pass1H = Math.max(cardEl.offsetHeight, cardEl.scrollHeight);
      const refinedRatio = Math.max(1, Math.min(2.4, pass1H / baseFlyerHeight));
      nextBaselineW = Math.round(baseFlyerWidth * refinedRatio);

      if (nextBaselineW !== pass1Width) {
        cardEl.style.width = `${nextBaselineW}px`;
        cardEl.style.minWidth = `${nextBaselineW}px`;
        cardEl.style.maxWidth = `${nextBaselineW}px`;
      }

      const checkScale = baseFlyerWidth / nextBaselineW;
      const checkH = Math.max(cardEl.offsetHeight, cardEl.scrollHeight);
      if (checkH * checkScale > baseFlyerHeight + 4) {
        const cappedMaxW = Math.round(baseFlyerWidth * 2.4);
        const exactW = Math.min(cappedMaxW, Math.round((checkH * baseFlyerWidth) / baseFlyerHeight));
        if (exactW > nextBaselineW) {
          nextBaselineW = exactW;
        }
      }
    }

    // Restore user's actual Font Size and apply Zoom on top of baseline-fitted width
    cardEl.style.setProperty('--bq-font-scale', String(fontScale));
    const nextWidth = Math.max(400, Math.round(nextBaselineW / baseZoomFactor));
    const baselineFitZoom = baseFlyerWidth / nextBaselineW;
    const nextMinHeight = baseFlyerHeight ? Math.round(baseFlyerHeight / baselineFitZoom) : undefined;

    cardEl.style.width = `${nextWidth}px`;
    cardEl.style.minWidth = `${nextWidth}px`;
    cardEl.style.maxWidth = `${nextWidth}px`;
    cardEl.style.minHeight = nextMinHeight ? `${nextMinHeight}px` : '';

    const finalH = Math.max(cardEl.offsetHeight, cardEl.scrollHeight);
    setFittedBaselineWidth(nextBaselineW);
    setFittedCardWidth(nextWidth);
    if (finalH > 0) setMeasuredCardHeight(finalH);
  }, [layoutFitSignature, baseLayoutWidth, baseFlyerWidth, baseFlyerHeight, baseZoomFactor, currentFontPercent]);

  // Measure preview viewport width & card natural height for true WYSIWYG scaled display
  useEffect(() => {
    const containerEl = previewContainerRef.current;
    const cardEl = cardElementRef.current;
    if (!containerEl && !cardEl) return;

    const updateSizes = () => {
      if (previewContainerRef.current) {
        const nextW = previewContainerRef.current.clientWidth;
        if (nextW > 0) setPreviewContainerWidth(nextW);
      }
      if (cardElementRef.current) {
        const nextH = Math.max(cardElementRef.current.offsetHeight, cardElementRef.current.scrollHeight);
        if (nextH > 0) setMeasuredCardHeight(nextH);
      }
    };

    updateSizes();

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(updateSizes);
      if (containerEl) ro.observe(containerEl);
      if (cardEl) ro.observe(cardEl);
      return () => ro.disconnect();
    }
  }, [layoutFitSignature, fittedCardWidth]);

  // Keep state in sync if quote changes
  useEffect(() => {
    if (quote.client?.phone && !whatsappNumber) {
      setWhatsappNumber(quote.client.phone);
    }
    if (quote.client?.email && !emailAddress) {
      setEmailAddress(quote.client.email);
    }
  }, [quote.client?.phone, quote.client?.email]);

  const showNotification = (message: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setFeedbackToast({ message, type });
    setTimeout(() => {
      setFeedbackToast(null);
    }, 4000);
  };

  const layoutCaptureSignature = [
    quote.id,
    quote.updated_at || '',
    quote.total,
    quote.subtotal,
    quote.client_view_mode,
    quote.sections.map((s) => `${s.id}:${s.lines.length}`).join(','),
    quote.notes_terms || '',
    profile.business_name || '',
    profile.phone || '',
    profile.email || '',
    profile.address || '',
    profile.tagline || '',
    profile.authorized_signatory || '',
    profile.logo_url || '',
    JSON.stringify(profile.logo_settings || {}),
    profile.signature_url || '',
    currentCardWidth,
    currentCardHeight ?? 'auto',
    currentZoom,
    currentFontPercent,
    currentLengthMode,
    currentVerticalSpacing,
    resolvedLayout.table_density || '',
    resolvedLayout.padding_density || '',
    String(resolvedLayout.compact_terms ?? ''),
    String(resolvedLayout.compact_payment ?? ''),
    String(resolvedLayout.show_decorations ?? true),
    currentExportScale,
  ].join('|');

  // Helper: Captures the quotation card as a high-resolution PNG using Profile Sizing format
  const generateCardImage = async (): Promise<GeneratedImageResult | null> => {
    const cardEl = document.getElementById('bq-quotation-card');
    if (!cardEl) {
      showNotification('Preview card element not found', 'warning');
      return null;
    }
    const safeNumber = (quote.quote_number || 'Quotation').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${safeNumber}.png`;
    return await captureElementAsImage(
      cardEl,
      fileName,
      currentExportScale,
      currentCardWidth,
      currentCardHeight,
      currentZoom,
      currentFontPercent
    );
  };

  // Pre-warm and auto-copy quotation image when preview opens or Profile sizing changes
  useEffect(() => {
    if (!interactive) return;

    if (cachedImageRef.current && cachedImageRef.current.signature !== layoutCaptureSignature) {
      cachedImageRef.current = null;
    }

    let isMounted = true;
    const timer = setTimeout(async () => {
      try {
        const cardEl = document.getElementById('bq-quotation-card');
        if (!cardEl || !isMounted) return;

        const result = await generateCardImage();
        if (!result || !isMounted) return;

        cachedImageRef.current = {
          result,
          signature: layoutCaptureSignature,
        };

        const copied = await copyImageBlobToClipboard(result.blob);
        if (copied && isMounted) {
          setCopiedImage(true);
          showNotification('✓ Quotation image copied to clipboard!', 'success');
          setTimeout(() => {
            if (isMounted) setCopiedImage(false);
          }, 4500);
        }
      } catch (err) {
        console.log('Preview auto-copy notice:', err);
      }
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [interactive, layoutCaptureSignature]);

  /**
   * Primary Action: Send to WhatsApp
   * 1. Generates (or uses signature-matched) quotation card image with Profile font size & zoom.
   * 2. Copies image directly to system clipboard while preserving click user-gesture.
   * 3. Opens WhatsApp chat ready to paste.
   */
  const handleSendToWhatsApp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsCapturing(true);

    try {
      const targetPhone = whatsappNumber.trim() || quote.client?.phone || '';
      const whatsappUrl = getWhatsAppUrl(targetPhone);

      const cached =
        cachedImageRef.current && cachedImageRef.current.signature === layoutCaptureSignature
          ? cachedImageRef.current.result
          : null;

      let copied = false;

      if (cached) {
        copied = await copyImageBlobToClipboard(cached.blob);
      } else {
        copied = await copyImagePromiseToClipboard(async () => {
          const result = await generateCardImage();
          if (!result) return null;
          cachedImageRef.current = {
            result,
            signature: layoutCaptureSignature,
          };
          return result.blob;
        });
      }

      if (copied) {
        setCopiedImage(true);
        showNotification('✓ Quotation image copied to clipboard! Opening WhatsApp...', 'success');
        setTimeout(() => setCopiedImage(false), 5000);
      } else {
        showNotification('Clipboard blocked by browser — tap Download PNG to attach image.', 'warning');
      }

      try {
        window.open(whatsappUrl, '_blank');
      } catch (popupErr) {
        console.warn('Popup blocked by browser:', popupErr);
      }
    } catch (err) {
      console.error('Error sending to WhatsApp:', err);
      showNotification('Failed to generate quotation image', 'warning');
    } finally {
      setIsCapturing(false);
    }
  };

  /**
   * Optional Web Share API sharing when supported
   */
  const handleShareViaWebShare = async () => {
    setIsCapturing(true);
    try {
      const result = await generateCardImage();
      if (!result) return;

      const safeNumber = (quote.quote_number || 'Quotation').replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `${safeNumber}.png`;
      const file = new File([result.blob], fileName, { type: 'image/png' });

      if (
        typeof navigator !== 'undefined' &&
        typeof navigator.share === 'function' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          files: [file],
          title: `Quotation ${quote.quote_number}`,
          text: `Quotation ${quote.quote_number} for ${quote.client?.name || 'Valued Client'} from ${profile.business_name || 'Business'}`,
        });
        showNotification('✓ Quotation image shared!');
      } else {
        // Fallback to clipboard + open WhatsApp
        await handleSendToWhatsApp();
      }
    } catch (err: any) {
      if (err && (err.name === 'AbortError' || err.code === 20)) {
        showNotification('Share cancelled', 'info');
      } else {
        console.warn('Share sheet error, copying to clipboard:', err);
        await handleSendToWhatsApp();
      }
    } finally {
      setIsCapturing(false);
    }
  };


  // Field 2: Send Image via Email
  const handleSendEmailImage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsCapturing(true);
    try {
      const result = await generateCardImage();
      if (!result) return;

      const targetEmail = emailAddress.trim() || quote.client?.email || '';
      
      // Download image file to user's device so it's ready to attach
      downloadBlob(result.blob, result.file.name);
      await copyImageBlobToClipboard(result.blob);

      const subject = `Quotation ${quote.quote_number}: ${quote.job_title || profile.business_name}`;
      const body = `Dear ${quote.client?.name || 'Client'},\n\nPlease find attached the quotation image (${result.file.name}) for ${quote.job_title || 'the project'}.\n\nTotal Quotation: ${formatCurrency(quote.total, currency)}\n\nBest regards,\n${profile.business_name}\n${profile.phone || ''}`;
      const mailtoUrl = `mailto:${encodeURIComponent(targetEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = mailtoUrl;

      showNotification(`Quotation image downloaded! Attach ${result.file.name} to your email.`);
    } catch (err) {
      console.error('Error preparing image for email:', err);
      showNotification('Failed to prepare quotation image', 'warning');
    } finally {
      setIsCapturing(false);
    }
  };

  // Direct Button: Download Quotation Image Only
  const handleDownloadImageOnly = async () => {
    setIsCapturing(true);
    try {
      const result = await generateCardImage();
      if (!result) return;
      downloadBlob(result.blob, result.file.name);
      showNotification(`Downloaded ${result.file.name}`);
    } catch (err) {
      console.error('Download failed:', err);
      showNotification('Failed to download image', 'warning');
    } finally {
      setIsCapturing(false);
    }
  };


  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {feedbackToast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-slate-950 font-bold px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 text-xs sm:text-sm animate-in fade-in slide-in-from-top-4 duration-200 border-2 border-emerald-300">
          <CheckCircle2 size={16} className="stroke-[3]" />
          <span>{feedbackToast.message}</span>
        </div>
      )}

      {/* View Mode Switcher bar if interactive */}
      {interactive && onViewModeChange && (
        <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-2xl flex items-center justify-between gap-1 shadow-md">
          <div className="flex items-center gap-1.5 px-2 text-xs font-semibold text-slate-400">
            <Eye size={14} className="text-amber-400" />
            <span className="hidden sm:inline">Client View Mode:</span>
            <span className="sm:hidden">View:</span>
          </div>
          <div className="flex bg-slate-950 p-1 rounded-xl gap-1 text-xs font-medium">
            <button
              type="button"
              onClick={() => onViewModeChange('full')}
              className={`px-2.5 py-1.5 rounded-lg transition-all ${
                quote.client_view_mode === 'full'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Full Breakdown
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('section_totals')}
              className={`px-2.5 py-1.5 rounded-lg transition-all ${
                quote.client_view_mode === 'section_totals'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Section Totals
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('one_total')}
              className={`px-2.5 py-1.5 rounded-lg transition-all ${
                quote.client_view_mode === 'one_total'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              One Total Only
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          THE CORPORATE QUOTATION CARD (WYSIWYG Flyer Layout & Proportional Scaling)
          Renders at exact Profile layout width/height/font/zoom and scales smoothly
          into any mobile/desktop viewport so preview & copied WhatsApp PNG match 100%.
          ========================================================================= */}
      {(() => {
        const layout = {
          card_width: currentCardWidth,
          card_height: currentCardHeight,
          card_scale: currentZoom,
          length_mode: currentLengthMode,
          vertical_spacing: currentVerticalSpacing,
          table_density: resolvedLayout.table_density || (currentLengthMode === 'compact' ? 'compact' : 'standard'),
          font_size_scale: resolvedLayout.font_size_scale || 'standard',
          font_size_percent: currentFontPercent,
          padding_density: resolvedLayout.padding_density || (currentLengthMode === 'compact' ? 'compact' : 'standard'),
          compact_terms: resolvedLayout.compact_terms ?? (currentLengthMode === 'compact'),
          compact_payment: resolvedLayout.compact_payment ?? (currentLengthMode === 'compact'),
          show_decorations: resolvedLayout.show_decorations ?? true,
          export_scale: currentExportScale,
        };

        const isCompact =
          currentLengthMode === 'compact' ||
          (currentCardHeight !== undefined && currentCardHeight <= 980);
        const isExtraCompact =
          currentCardHeight !== undefined && currentCardHeight <= 820;
        const isTight = currentVerticalSpacing === 'tight';
        const flyerWidth = baseFlyerWidth;
        const effectiveBaselineW = fittedBaselineWidth > 0 ? fittedBaselineWidth : flyerWidth;
        const unzoomedWidth = fittedCardWidth > 0 ? fittedCardWidth : baseLayoutWidth;
        const baselineFitZoom = flyerWidth / effectiveBaselineW;
        const unzoomedMinHeight =
          layout.card_height && layout.card_height >= 500
            ? Math.round(layout.card_height / baselineFitZoom)
            : undefined;

        const fontPercent = currentFontPercent;
        const fontScale = fontPercent / 100;

        const fontClass = layout.font_size_scale === 'compact'
          ? 'text-xs'
          : layout.font_size_scale === 'large' || layout.font_size_scale === 'extra_large'
          ? 'text-base'
          : 'text-sm';

        const verticalSpacingClass = isExtraCompact
          ? 'space-y-1.5'
          : isCompact
          ? (isTight ? 'space-y-2' : 'space-y-2.5')
          : (currentVerticalSpacing === 'spacious' ? 'space-y-6' : 'space-y-4.5');

        const paddingClass = isExtraCompact
          ? 'p-3'
          : isCompact
          ? (isTight ? 'p-3.5' : 'p-4')
          : (layout.padding_density === 'spacious' ? 'p-8' : 'p-6');

        const availableW = previewContainerWidth > 0 ? previewContainerWidth : 380;
        const previewScale = Math.min(1, availableW / unzoomedWidth);
        const displayWidth = Math.round(unzoomedWidth * previewScale);
        const effectiveHeight = measuredCardHeight > 0 ? measuredCardHeight : (unzoomedMinHeight || 860);
        const displayHeight = Math.round(effectiveHeight * previewScale);

        return (
          <div ref={previewContainerRef} className="w-full flex justify-center">
            <div
              style={{
                width: `${displayWidth}px`,
                height: `${displayHeight}px`,
                position: 'relative',
                overflow: 'hidden',
              }}
              className="rounded-2xl shadow-2xl mx-auto"
            >
              <div
                style={{
                  width: `${unzoomedWidth}px`,
                  transform: `scale(${previewScale})`,
                  transformOrigin: 'top left',
                }}
              >
                <div 
                  ref={cardElementRef}
                  id="bq-quotation-card" 
                  className={`bq-quotation-card-root bg-white text-slate-900 rounded-3xl overflow-hidden border border-slate-200 ${fontClass} relative flex flex-col justify-between`}
                  style={{ 
                    width: `${unzoomedWidth}px`,
                    minWidth: `${unzoomedWidth}px`,
                    maxWidth: `${unzoomedWidth}px`,
                    minHeight: unzoomedMinHeight ? `${unzoomedMinHeight}px` : undefined,
                    ['--bq-font-scale' as any]: String(fontScale),
                    fontSize: 'calc(13px * var(--bq-font-scale, 1))',
                  }}
                >
                  {/* Scoped Dynamic Font Size Proportional Scaler (CSS var allows instant baseline measurement) */}
                  <style>{`
                    .bq-quotation-card-root .text-\\[7px\\] { font-size: calc(7px * var(--bq-font-scale, 1)) !important; }
                    .bq-quotation-card-root .text-\\[8px\\] { font-size: calc(8px * var(--bq-font-scale, 1)) !important; }
                    .bq-quotation-card-root .text-\\[8\\.5px\\] { font-size: calc(8.5px * var(--bq-font-scale, 1)) !important; }
                    .bq-quotation-card-root .text-\\[9px\\] { font-size: calc(9px * var(--bq-font-scale, 1)) !important; }
                    .bq-quotation-card-root .text-\\[9\\.5px\\] { font-size: calc(9.5px * var(--bq-font-scale, 1)) !important; }
                    .bq-quotation-card-root .text-\\[10px\\] { font-size: calc(10px * var(--bq-font-scale, 1)) !important; }
                    .bq-quotation-card-root .text-\\[11px\\] { font-size: calc(11px * var(--bq-font-scale, 1)) !important; }
                    .bq-quotation-card-root .text-xs { font-size: calc(12px * var(--bq-font-scale, 1)) !important; }
                    .bq-quotation-card-root .text-sm { font-size: calc(14px * var(--bq-font-scale, 1)) !important; }
                    .bq-quotation-card-root .text-base { font-size: calc(16px * var(--bq-font-scale, 1)) !important; }
                    .bq-quotation-card-root .text-lg { font-size: calc(18px * var(--bq-font-scale, 1)) !important; }
                    .bq-quotation-card-root .text-xl { font-size: calc(20px * var(--bq-font-scale, 1)) !important; }
                    .bq-quotation-card-root .text-2xl { font-size: calc(24px * var(--bq-font-scale, 1)) !important; }
                    .bq-quotation-card-root .text-3xl { font-size: calc(30px * var(--bq-font-scale, 1)) !important; }
                  `}</style>
                  {/* Top-Right Decorative Navy & Gold Wave (Exact visual reference match) */}
                  {layout.show_decorations !== false && (
                    <div className={`absolute top-0 right-0 ${isCompact ? 'w-52 h-20' : 'w-64 h-32'} pointer-events-none overflow-hidden z-0`}>
                      <svg className="w-full h-full" viewBox="0 0 240 120" fill="none" preserveAspectRatio="none">
                        {/* Gold accent curve */}
                        <path d="M40,0 C110,65 160,85 240,45 L240,70 C160,105 110,75 40,0 Z" fill="#F59E0B" />
                        {/* Deep Navy wave */}
                        <path d="M75,0 C135,50 175,65 240,30 L240,0 Z" fill="#0B2545" />
                      </svg>
                    </div>
                  )}

                  <div className={`${paddingClass} ${verticalSpacingClass} relative z-10 flex-1 flex flex-col justify-between`}>
                    {/* HEADER: Business Logo & Brand (Left) | Contact Details (Right) */}
                    <div className={`flex flex-row items-center justify-between gap-3 ${isCompact ? 'pb-1' : 'pb-2'}`}>
                      {/* Left: Logo & Business Branding */}
                      <div className="flex items-center gap-3 min-w-0">
                        {profile.logo_url ? (
                          <div 
                            style={{
                              width: `${Math.min(profile.logo_settings?.width || 56, isCompact ? 48 : 56)}px`,
                              height: `${Math.min(profile.logo_settings?.height || 56, isCompact ? 48 : 56)}px`,
                            }}
                            className="rounded-xl overflow-hidden bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0 shadow-xs"
                          >
                            <img
                              src={profile.logo_url}
                              alt={profile.business_name}
                              crossOrigin="anonymous"
                              style={{
                                transform: `scale(${profile.logo_settings?.zoom || 1})`,
                                transformOrigin: 'center center'
                              }}
                              className="max-w-full max-h-full object-contain"
                            />
                          </div>
                        ) : (
                          /* Dynamic Corporate Architectural Logo Emblem */
                          <div className={`${isCompact ? 'w-12 h-12' : 'w-14 h-14'} rounded-xl bg-[#0B2545] p-2 flex items-center justify-center shrink-0 shadow-sm relative overflow-hidden`}>
                            <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
                              {/* Building pillars */}
                              <rect x="6" y="20" width="8" height="22" rx="1" fill="#FFFFFF" />
                              <rect x="18" y="14" width="8" height="28" rx="1" fill="#CBDDEE" />
                              <rect x="30" y="8" width="8" height="34" rx="1" fill="#FFFFFF" />
                              {/* Roof & gold accent sweep */}
                              <path d="M2 22 L24 4 L46 22" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                        )}

                        <div className="min-w-0">
                          <h1 className={`${isCompact ? 'text-xl' : 'text-2xl'} font-black text-[#0B2545] tracking-tight uppercase leading-tight font-sans`}>
                            {profile.business_name || 'YOUR BUSINESS NAME HERE'}
                          </h1>
                          <div className="flex items-center gap-1 mt-0.5">
                            <p className={`${isCompact ? 'text-xs' : 'text-sm'} font-serif italic text-slate-600 font-medium`}>
                              {profile.tagline || 'Your Success, Our Priority'}
                            </p>
                            <svg className="w-6 h-1.5 text-[#F59E0B]" viewBox="0 0 32 8" fill="none">
                              <path d="M0,4 Q16,8 32,2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      {/* Right: Contact Information (Circular Navy Badges) */}
                      <div className="flex flex-col gap-1 text-xs text-slate-700 items-end shrink-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold">{profile.phone || '+256 700 123 456'}</span>
                          <div className={`${isCompact ? 'w-5 h-5' : 'w-6 h-6'} rounded-full bg-[#0B2545] text-white flex items-center justify-center shrink-0 shadow-xs`}>
                            <Phone size={isCompact ? 10 : 12} />
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold">{profile.email || 'info@yourbusiness.com'}</span>
                          <div className={`${isCompact ? 'w-5 h-5' : 'w-6 h-6'} rounded-full bg-[#0B2545] text-white flex items-center justify-center shrink-0 shadow-xs`}>
                            <Mail size={isCompact ? 10 : 12} />
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-right truncate max-w-[200px]">
                            {profile.address || 'Your Address, City, Country'}
                          </span>
                          <div className={`${isCompact ? 'w-5 h-5' : 'w-6 h-6'} rounded-full bg-[#0B2545] text-white flex items-center justify-center shrink-0 shadow-xs`}>
                            <MapPin size={isCompact ? 10 : 12} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* TITLE BANNER (QUOTATION) & QUOTE META (DATE & NUMBER) */}
                    <div className="grid grid-cols-12 gap-3 items-stretch">
                      {/* Left: QUOTATION Navy Banner with Gold Slice */}
                      <div className={`col-span-8 bg-[#0B2545] text-white rounded-2xl ${isCompact ? 'p-2.5' : 'p-4'} flex items-center justify-between relative overflow-hidden shadow-sm`}>
                        <div className="flex items-center gap-3 relative z-10">
                          <div className={`${isCompact ? 'w-9 h-9' : 'w-10 h-10'} rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white shrink-0`}>
                            <FileText size={isCompact ? 16 : 22} className="stroke-[2.5]" />
                          </div>
                          <div>
                            <h2 className={`${isCompact ? 'text-xl' : 'text-2xl'} font-black tracking-wider text-white uppercase leading-none`}>
                              QUOTATION
                            </h2>
                            <p className="text-[10px] tracking-widest text-slate-200 uppercase font-semibold mt-0.5">
                              PROFESSIONAL • RELIABLE • AFFORDABLE
                            </p>
                          </div>
                        </div>

                        {/* Gold Angled Accent Slice */}
                        <div 
                          className="w-12 bg-[#F59E0B] skew-x-[-22deg] absolute -right-3 top-0 bottom-0 pointer-events-none"
                        />
                      </div>

                      {/* Right: Quotation No & Date Box */}
                      <div className={`col-span-4 bg-[#EBF3FB] border border-[#CBDDEE] rounded-2xl ${isCompact ? 'p-2.5 gap-0.5 text-xs' : 'p-3 gap-1.5 text-xs'} flex flex-col justify-center text-slate-700 shadow-2xs`}>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-600">Quote No:</span>
                          <span className="font-mono font-black text-[#0B2545] text-sm truncate">
                            {quote.quote_number}
                          </span>
                        </div>
                        <div className="flex items-center justify-between border-t border-[#CBDDEE]/80 pt-0.5">
                          <span className="font-semibold text-slate-600">Date:</span>
                          <span className="font-semibold text-slate-900 truncate">
                            {formatDate(quote.date)}
                          </span>
                        </div>
                        {showTerms && quote.valid_until && (
                          <div className="flex items-center justify-between border-t border-[#CBDDEE]/80 pt-0.5 text-[10px]">
                            <span className="text-slate-500">Valid:</span>
                            <span className="font-semibold text-slate-800 truncate">{formatDate(quote.valid_until)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* TWO-COLUMN CARDS: CLIENT DETAILS & PROJECT / JOB DETAILS */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* Card 1: Client Details */}
                      <div>
                        <div className="bg-[#0B2545] text-white px-3 py-0.5 text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 rounded-t-xl rounded-br-xl shadow-xs">
                          <User size={11} />
                          <span>CLIENT DETAILS</span>
                        </div>
                        <div className={`bg-white border border-[#0B2545]/20 rounded-b-xl rounded-tr-xl ${isCompact ? 'p-2.5 space-y-0.5 text-xs' : 'p-3 text-xs space-y-1.5'} shadow-2xs`}>
                          <div className="grid grid-cols-12 gap-1">
                            <span className="col-span-4 text-slate-500 font-semibold truncate">Client</span>
                            <span className="col-span-1 text-slate-400 text-center">:</span>
                            <span className="col-span-7 font-bold text-slate-900 truncate">
                              {quote.client?.name || 'Valued Client'}
                            </span>
                          </div>
                          <div className="grid grid-cols-12 gap-1">
                            <span className="col-span-4 text-slate-500 font-semibold truncate">Phone</span>
                            <span className="col-span-1 text-slate-400 text-center">:</span>
                            <span className="col-span-7 font-mono font-medium text-slate-800 truncate">
                              {quote.client?.phone || '—'}
                            </span>
                          </div>
                          <div className="grid grid-cols-12 gap-1">
                            <span className="col-span-4 text-slate-500 font-semibold truncate">Email</span>
                            <span className="col-span-1 text-slate-400 text-center">:</span>
                            <span className="col-span-7 font-medium text-slate-800 truncate">
                              {quote.client?.email || '—'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Card 2: Project / Job Details */}
                      <div>
                        <div className="bg-[#0B2545] text-white px-3 py-0.5 text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 rounded-t-xl rounded-br-xl shadow-xs">
                          <Briefcase size={11} />
                          <span>PROJECT / JOB</span>
                        </div>
                        <div className={`bg-white border border-[#0B2545]/20 rounded-b-xl rounded-tr-xl ${isCompact ? 'p-2.5 space-y-0.5 text-xs' : 'p-3 text-xs space-y-1.5'} shadow-2xs`}>
                          <div className="grid grid-cols-12 gap-1">
                            <span className="col-span-4 text-slate-500 font-semibold truncate">Project</span>
                            <span className="col-span-1 text-slate-400 text-center">:</span>
                            <span className="col-span-7 font-bold text-slate-900 truncate">
                              {quote.job_title || 'Quotation for Services'}
                            </span>
                          </div>
                          {quote.job_location && (
                            <div className="grid grid-cols-12 gap-1">
                              <span className="col-span-4 text-slate-500 font-semibold truncate">Location</span>
                              <span className="col-span-1 text-slate-400 text-center">:</span>
                              <span className="col-span-7 text-slate-700 truncate">
                                {quote.job_location}
                              </span>
                            </div>
                          )}
                          {showTerms && quote.expected_duration && formatExpectedDuration(quote.expected_duration) && (
                            <div className="grid grid-cols-12 gap-1">
                              <span className="col-span-4 text-slate-500 font-semibold truncate">Duration</span>
                              <span className="col-span-1 text-slate-400 text-center">:</span>
                              <span className="col-span-7 font-semibold text-[#0B2545] truncate">
                                {formatExpectedDuration(quote.expected_duration)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* ITEM BREAKDOWN TABLE (Full Breakdown, Section Totals, or One Total) */}
                    <div className="border border-[#0B2545]/25 rounded-2xl overflow-hidden shadow-xs">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="bg-[#0B2545] text-white text-[11px] font-bold uppercase tracking-wider">
                            <th className="py-1.5 px-2 text-center w-8 border-r border-[#0B2545]/40">#</th>
                            <th className="py-1.5 px-3 border-r border-[#0B2545]/40">DESCRIPTION</th>
                            <th className="py-1.5 px-2 text-center w-16 border-r border-[#0B2545]/40">QTY</th>
                            <th className="py-1.5 px-3 text-right w-[21%] border-r border-[#0B2545]/40">
                              UNIT PRICE ({currency})
                            </th>
                            <th className="py-1.5 px-3 text-right w-[21%]">
                              AMOUNT ({currency})
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#CBDDEE]/80 bg-white">
                          {quote.client_view_mode === 'one_total' ? (
                            /* Mode: One Total Only */
                            <tr>
                              <td className={`${isCompact || layout.table_density === 'compact' ? 'py-1.5' : 'py-2'} px-2 text-center font-bold text-slate-500`}>1</td>
                              <td className={`${isCompact || layout.table_density === 'compact' ? 'py-1.5' : 'py-2'} px-3`}>
                                <p className={`font-bold text-slate-900 ${isCompact ? 'text-[11px]' : 'text-xs'}`}>{quote.job_title || 'Comprehensive Quotation'}</p>
                                <p className="text-[10px] text-slate-500 mt-0.5">
                                  All materials, skilled execution, equipment, transport, and delivery as specified.
                                </p>
                              </td>
                              <td className={`${isCompact || layout.table_density === 'compact' ? 'py-1.5' : 'py-2'} px-2 text-center font-semibold text-slate-700`}>1 Sum</td>
                              <td className={`${isCompact || layout.table_density === 'compact' ? 'py-1.5' : 'py-2'} px-3 text-right font-mono font-medium text-slate-800`}>
                                {formatCurrency(quote.subtotal, currency)}
                              </td>
                              <td className={`${isCompact || layout.table_density === 'compact' ? 'py-1.5' : 'py-2'} px-3 text-right font-mono font-bold text-[#0B2545]`}>
                                {formatCurrency(quote.subtotal, currency)}
                              </td>
                            </tr>
                          ) : quote.client_view_mode === 'section_totals' ? (
                            /* Mode: Section Totals Only */
                            quote.sections
                              .filter((s) => s.lines.length > 0)
                              .map((sec, secIdx) => {
                                const secSum = sec.lines.reduce((a, b) => a + (Number(b.total_price) || 0), 0);
                                return (
                                  <tr key={sec.id}>
                                    <td className={`${isCompact || layout.table_density === 'compact' ? 'py-1.5' : 'py-2'} px-2 text-center font-bold text-slate-500`}>{secIdx + 1}</td>
                                    <td className={`${isCompact || layout.table_density === 'compact' ? 'py-1.5' : 'py-2'} px-3`}>
                                      <p className={`font-bold text-slate-900 ${isCompact ? 'text-[11px]' : 'text-xs'}`}>{sec.name}</p>
                                      <p className="text-[10px] text-slate-500">Includes {sec.lines.length} scheduled items</p>
                                    </td>
                                    <td className={`${isCompact || layout.table_density === 'compact' ? 'py-1.5' : 'py-2'} px-2 text-center font-semibold text-slate-700`}>{sec.lines.length} Items</td>
                                    <td className={`${isCompact || layout.table_density === 'compact' ? 'py-1.5' : 'py-2'} px-3 text-right font-mono text-slate-600`}>—</td>
                                    <td className={`${isCompact || layout.table_density === 'compact' ? 'py-1.5' : 'py-2'} px-3 text-right font-mono font-bold text-[#0B2545]`}>
                                      {formatCurrency(secSum, currency)}
                                    </td>
                                  </tr>
                                );
                              })
                          ) : (
                            /* Mode: Full Itemized Breakdown */
                            (() => {
                              let runningItemNumber = 1;
                              return quote.sections
                                .filter((sec) => sec.lines.length > 0)
                                .map((sec) => {
                                  const secSum = sec.lines.reduce((acc, l) => acc + (Number(l.total_price) || 0), 0);
                                  return (
                                    <React.Fragment key={sec.id}>
                                      {/* Section Header Row */}
                                      <tr className="bg-[#EBF3FB] font-bold text-[#0B2545] border-y border-[#CBDDEE]">
                                        <td colSpan={4} className="py-1 px-3 uppercase tracking-wider text-[10px]">
                                          {sec.name}
                                        </td>
                                        <td className="py-1 px-3 text-right font-mono text-xs">
                                          {formatCurrency(secSum, currency)}
                                        </td>
                                      </tr>
                                      {/* Line items in this section */}
                                      {sec.lines.map((line) => {
                                        const currentNum = runningItemNumber++;
                                        return (
                                          <tr key={line.id}>
                                            <td className={`${isCompact || layout.table_density === 'compact' ? 'py-1' : 'py-1.5'} px-2 text-center font-bold text-slate-500 ${isCompact ? 'text-[10px]' : 'text-xs'}`}>
                                              {currentNum}
                                            </td>
                                            <td className={`${isCompact || layout.table_density === 'compact' ? 'py-1' : 'py-1.5'} px-3`}>
                                              <p className={`font-semibold text-slate-900 leading-snug ${isCompact ? 'text-[11px]' : 'text-xs'}`}>
                                                {line.description}
                                              </p>
                                            </td>
                                            <td className={`${isCompact || layout.table_density === 'compact' ? 'py-1' : 'py-1.5'} px-2 text-center text-slate-700 font-medium ${isCompact ? 'text-[10px]' : 'text-xs'}`}>
                                              {line.line_type === 'fixed' ? 'Fixed' : `${formatWithCommas(line.quantity)} ${line.unit || ''}`}
                                            </td>
                                            <td className={`${isCompact || layout.table_density === 'compact' ? 'py-1' : 'py-1.5'} px-3 text-right font-mono text-slate-700 ${isCompact ? 'text-[10px]' : 'text-xs'}`}>
                                              {line.line_type === 'fixed' ? '—' : formatCurrency(line.unit_price, currency)}
                                            </td>
                                            <td className={`${isCompact || layout.table_density === 'compact' ? 'py-1' : 'py-1.5'} px-3 text-right font-mono font-bold text-slate-900 text-xs`}>
                                              {formatCurrency(line.total_price, currency)}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </React.Fragment>
                                  );
                                });
                            })()
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* TOTALS SUMMARY BLOCK (Aligned with table) */}
                    <div className="flex justify-end pt-0.5">
                      <div className={`${isCompact ? 'w-72 text-xs' : 'w-80 text-xs'} border border-[#0B2545]/20 rounded-xl overflow-hidden bg-white shadow-2xs divide-y divide-[#CBDDEE]/80`}>
                        <div className={`flex justify-between ${isCompact ? 'px-3 py-1' : 'px-3 py-2'} text-slate-700 font-semibold`}>
                          <span>Subtotal</span>
                          <span className="font-mono text-slate-900">{formatCurrency(quote.subtotal, currency)}</span>
                        </div>
                        {showTerms && quote.discount_amount > 0 && (
                          <div className={`flex justify-between ${isCompact ? 'px-3 py-1' : 'px-3 py-2'} text-emerald-700 font-semibold`}>
                            <span>Discount {quote.discount_type === 'percentage' ? `(${quote.discount_value}%)` : ''}</span>
                            <span className="font-mono">- {formatCurrency(quote.discount_amount, currency)}</span>
                          </div>
                        )}
                        {showTerms && (
                          <div className={`flex justify-between ${isCompact ? 'px-3 py-1' : 'px-3 py-2'} text-slate-700 font-semibold`}>
                            <span>Tax ({quote.tax_rate}%)</span>
                            <span className="font-mono text-slate-900">{formatCurrency(quote.tax_amount || 0, currency)}</span>
                          </div>
                        )}
                        {/* Grand Total Solid Navy Bar with Gold text */}
                        <div className={`bg-[#0B2545] text-white ${isCompact ? 'px-3 py-1.5' : 'px-3 py-2.5'} flex justify-between items-center`}>
                          <span className="font-black tracking-wide uppercase">Total Quotation</span>
                          <span className={`${isCompact ? 'text-base' : 'text-lg'} font-black font-mono text-[#F59E0B]`}>
                            {formatCurrency(showTerms ? quote.total : quote.subtotal, currency)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* PAYMENT INFORMATION & PAYMENT METHODS (Two-column layout) */}
                    <div className="grid grid-cols-2 gap-3 pt-0.5">
                      {/* Left Column: Payment Information & Deposit & Milestones */}
                      <div className="space-y-2">
                        {/* Deposit Required */}
                        <div>
                          <div className="bg-[#0B2545] text-white px-3 py-0.5 text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 rounded-t-xl rounded-br-xl shadow-xs">
                            <CreditCard size={11} />
                            <span>PAYMENT INFO</span>
                          </div>
                          <div className={`bg-[#FEF3C7] border border-[#FDE68A] text-[#78350F] ${isCompact ? 'p-2' : 'p-3'} rounded-b-xl rounded-tr-xl flex items-center justify-between shadow-2xs`}>
                            <div className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-full bg-[#0B2545] text-[#F59E0B] font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                                $
                              </div>
                              <span className="font-bold text-xs">
                                Deposit ({quote.deposit_type === 'percentage' ? `${quote.deposit_value}%` : 'Advance'})
                              </span>
                            </div>
                            <span className="font-black font-mono text-[#0B2545] text-sm">
                              {formatCurrency(quote.deposit_amount, currency)}
                            </span>
                          </div>
                        </div>

                        {/* Payment Stages & Milestones */}
                        {showTerms && quote.payment_stages && quote.payment_stages.length > 0 && (
                          <div>
                            <div className="bg-[#0B2545] text-white px-3 py-0.5 text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1 rounded-t-xl rounded-br-xl shadow-xs">
                              <CheckCircle2 size={10} />
                              <span>MILESTONES</span>
                            </div>
                            <div className="bg-white border border-[#0B2545]/20 rounded-b-xl rounded-tr-xl overflow-hidden shadow-2xs divide-y divide-[#CBDDEE]">
                              {quote.payment_stages.map((st, idx) => (
                                <div key={st.id || idx} className="grid grid-cols-12 px-2.5 py-1 text-[11px] items-center">
                                  <span className="col-span-1 font-bold text-slate-500">{idx + 1}</span>
                                  <span className="col-span-7 font-medium text-slate-800 truncate">{st.name}</span>
                                  <span className="col-span-4 font-mono font-bold text-slate-900 text-right">
                                    - {st.percent}%
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Right Column: Payment Methods (MTN, Airtel, Bank, Custom) */}
                      <div>
                        <div className="bg-[#0B2545] text-white px-3 py-0.5 text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 rounded-t-xl rounded-br-xl shadow-xs">
                          <Wallet size={11} />
                          <span>PAYMENT METHODS</span>
                        </div>
                        <div className={`bg-white border border-[#0B2545]/20 rounded-b-xl rounded-tr-xl ${isCompact || layout.compact_payment ? 'p-1.5 grid gap-1.5 ' + ((profile.payment_details?.methods?.length || 0) > 1 ? 'grid-cols-2' : 'grid-cols-1') : 'p-3 space-y-2'} text-xs shadow-2xs`}>
                          {profile.payment_details?.methods && profile.payment_details.methods.length > 0 ? (
                            profile.payment_details.methods.map((method) => {
                              const isMtn = method.title.toLowerCase().includes('mtn') || (method.provider && method.provider.toLowerCase().includes('mtn'));
                              const isAirtel = method.title.toLowerCase().includes('airtel') || (method.provider && method.provider.toLowerCase().includes('airtel'));
                              const isBank = method.type === 'bank' || method.title.toLowerCase().includes('bank');

                              return (
                                <div key={method.id} className="flex items-center gap-1.5 p-1 rounded border border-slate-100 min-w-0">
                                  {isMtn ? (
                                    <div className="w-5 h-5 rounded-full bg-[#FFCC00] text-slate-950 font-black text-[7px] flex items-center justify-center shrink-0 border border-amber-300">
                                      MTN
                                    </div>
                                  ) : isAirtel ? (
                                    <div className="w-5 h-5 rounded-full bg-[#E60000] text-white font-black text-[7px] flex items-center justify-center shrink-0 tracking-tighter">
                                      airtel
                                    </div>
                                  ) : isBank ? (
                                    <div className="w-5 h-5 rounded-full bg-[#0B2545] text-white flex items-center justify-center shrink-0">
                                      <Landmark size={11} />
                                    </div>
                                  ) : (
                                    <div className="w-5 h-5 rounded-full bg-slate-800 text-amber-400 flex items-center justify-center shrink-0">
                                      <CreditCard size={11} />
                                    </div>
                                  )}

                                  <div className="flex-1 min-w-0">
                                    <p className="font-bold text-[#0B2545] text-[10px] truncate leading-tight">
                                      {method.title}
                                    </p>
                                    {method.account_number && (
                                      <p className="font-mono font-bold text-slate-900 text-[9.5px] truncate">
                                        {method.account_number}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-[10px] text-slate-500 italic">Configure payment details in Profile.</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* NOTES & TERMS */}
                    <div>
                      <div className="bg-[#0B2545] text-white px-3 py-0.5 text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 rounded-t-xl rounded-br-xl shadow-xs">
                        <Info size={11} />
                        <span>NOTES & TERMS</span>
                      </div>
                      <div className={`bg-[#EBF3FB] border border-[#CBDDEE] rounded-b-xl rounded-tr-xl ${isCompact || layout.compact_terms ? 'p-2 text-[10px]' : 'p-3 text-xs space-y-1'} text-slate-800 shadow-2xs`}>
                        {isCompact || layout.compact_terms ? (
                          <div className="space-y-1">
                            <div className="grid grid-cols-3 gap-2 leading-tight">
                              <p className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#0B2545] shrink-0" />
                                <span>
                                  {quote.deposit_amount > 0 
                                    ? `${quote.deposit_value}% deposit to confirm.` 
                                    : 'Deposit required to confirm.'}
                                </span>
                              </p>
                              <p className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#0B2545] shrink-0" />
                                <span>Balance on completion.</span>
                              </p>
                              <p className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#0B2545] shrink-0" />
                                <span>
                                  Valid: {quote.valid_until ? formatDate(quote.valid_until) : '14 days'}.
                                </span>
                              </p>
                            </div>
                            {quote.notes_terms && (
                              <p className="flex items-start gap-1 pt-0.5 border-t border-[#CBDDEE]/80 font-medium text-slate-900 text-[9.5px] leading-tight">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] mt-0.5 shrink-0" />
                                <span className="whitespace-pre-line">{quote.notes_terms}</span>
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-0.5 pl-1 leading-snug">
                            <p className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#0B2545] shrink-0" />
                              <span>
                                {quote.deposit_amount > 0 
                                  ? `${quote.deposit_value}% deposit required upon signing to confirm quotation.` 
                                  : 'Advance deposit required upon signing to confirm quotation.'}
                              </span>
                            </p>
                            <p className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#0B2545] shrink-0" />
                              <span>Balance payable upon completion & inspection.</span>
                            </p>
                            <p className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#0B2545] shrink-0" />
                              <span>
                                Valid for {quote.valid_until ? formatDate(quote.valid_until) : '14 days'}. Prices subject to validity period.
                              </span>
                            </p>
                            {quote.notes_terms && (
                              <p className="flex items-start gap-1.5 pt-0.5 border-t border-[#CBDDEE]/80 font-medium text-slate-900">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] mt-1 shrink-0" />
                                <span className="whitespace-pre-line">{quote.notes_terms}</span>
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ACCEPTANCE & SIGNATURE BAR */}
                    <div className="grid grid-cols-2 gap-4 items-center pt-0.5">
                      {/* Left: To Accept This Quotation */}
                      <div className={`bg-white border border-[#0B2545]/25 rounded-2xl ${isCompact ? 'p-2.5' : 'p-3'} flex items-center gap-3 shadow-2xs`}>
                        <div className={`${isCompact ? 'w-9 h-9' : 'w-11 h-11'} rounded-full bg-[#0B2545] text-white flex items-center justify-center shrink-0 shadow-xs`}>
                          <Handshake size={isCompact ? 16 : 22} className="text-[#F59E0B]" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-[#0B2545] leading-tight">
                            To Accept This Quotation
                          </h4>
                          <p className="text-[10px] text-slate-600 mt-0.5 leading-tight">
                            Confirm by phone or WhatsApp.
                          </p>
                        </div>
                      </div>

                      {/* Right: Signature Box (Exact match to reference) */}
                      <div className="text-center px-2 py-0.5 space-y-0.5">
                        {profile.signature_url ? (
                          <div className={`${isCompact ? 'h-8' : 'h-10'} flex items-center justify-center`}>
                            <img 
                              src={profile.signature_url} 
                              alt="Signature" 
                              className={`${isCompact ? 'max-h-8' : 'max-h-10'} object-contain`} 
                              crossOrigin="anonymous" 
                            />
                          </div>
                        ) : (
                          <p 
                            className={`${isCompact ? 'text-2xl' : 'text-3xl'} font-serif text-[#0B2545] tracking-wide leading-none`} 
                            style={{ fontFamily: '"Dancing Script", "Playfair Display", Georgia, cursive' }}
                          >
                            {profile.authorized_signatory || profile.business_name || 'Your Signature'}
                          </p>
                        )}
                        <div className={`h-0.5 bg-[#0B2545] ${isCompact ? 'w-40' : 'w-48'} mx-auto`} />
                        <p className="text-[11px] font-bold text-slate-800 uppercase tracking-wider leading-none">
                          Authorized Signature
                        </p>
                        <p className="text-xs font-semibold text-[#0B2545] truncate">
                          {profile.business_name}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* BOTTOM DECORATIVE WAVE & SLOGAN (Exact match to visual reference) */}
                  {layout.show_decorations !== false && (
                    <div className={`relative ${isExtraCompact ? 'mt-0' : 'mt-1'} overflow-hidden`}>
                      <svg className={`w-full ${isExtraCompact ? 'h-10' : isCompact ? 'h-12' : 'h-20'}`} viewBox="0 0 600 80" fill="none" preserveAspectRatio="none">
                        {/* Gold trim curve */}
                        <path d="M0,45 C150,15 350,65 600,30 L600,80 L0,80 Z" fill="#F59E0B" />
                        {/* Navy blue wave */}
                        <path d="M0,35 C180,5 380,55 600,20 L600,80 L0,80 Z" fill="#0B2545" />
                      </svg>
                      <div className={`absolute inset-0 flex items-center justify-center ${isExtraCompact ? 'pt-2' : 'pt-3'} pointer-events-none`}>
                        <span 
                          className={`text-white ${isCompact ? 'text-sm' : 'text-base'} tracking-wide`} 
                          style={{ fontFamily: '"Dancing Script", "Playfair Display", Georgia, cursive' }}
                        >
                          Thank you for your trust and support!
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* =========================================================================
          SEND QUOTATION AS IMAGE PANEL (Bottom after preview)
          ========================================================================= */}
      {interactive && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-4.5 shadow-xl space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <ImageIcon size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white leading-tight">Send Quotation as Image</h3>
                <p className="text-[11px] text-slate-400">Matches preview font size ({currentFontPercent}%) &amp; zoom ({Math.round(currentZoom * 100)}%)</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <button
                type="button"
                onClick={handleDownloadImageOnly}
                disabled={isCapturing}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all border border-slate-700/60 cursor-pointer disabled:opacity-50"
                title="Download Quotation Card as PNG Image file"
              >
                <Download size={14} />
                <span>Download PNG</span>
              </button>
            </div>
          </div>

          {/* Unified Primary 1-Click Action: Send to WhatsApp */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleSendToWhatsApp}
              disabled={isCapturing}
              className="w-full py-4 px-5 bg-[#25D366] hover:bg-[#20bd5a] active:scale-[0.99] text-slate-950 font-black text-sm sm:text-base rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/25 transition-all cursor-pointer disabled:opacity-60"
            >
              {isCapturing ? (
                <>
                  <Loader2 size={22} className="animate-spin stroke-[2.5]" />
                  <span>Preparing Quotation & Opening WhatsApp...</span>
                </>
              ) : (
                <>
                  <MessageCircle size={24} className="stroke-[2.5]" />
                  <div className="text-left">
                    <div className="leading-tight text-slate-950 font-black text-sm sm:text-base">
                      Send to WhatsApp
                    </div>
                    <div className="text-[11px] font-bold text-slate-900/80">
                      Copies image to clipboard &bull; Opens chat ready to paste
                    </div>
                  </div>
                </>
              )}
            </button>

            <div className="flex items-center justify-between text-xs px-1 text-slate-400">
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px]">
                <CheckCircle2 size={13} className="text-emerald-400 stroke-[3]" />
                {copiedImage
                  ? 'Quotation image copied to clipboard!'
                  : 'Copies image with Profile font & zoom & opens WhatsApp'}
              </span>
              <button
                type="button"
                onClick={handleShareViaWebShare}
                className="text-slate-400 hover:text-white underline cursor-pointer text-[10px]"
                title="Use phone native share sheet"
              >
                Or Phone Share Sheet
              </button>
            </div>
          </div>

          {/* Two Fields: WhatsApp Number + Send to WhatsApp, Email Field + Send Image */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {/* Field 1: WhatsApp Number + Send to WhatsApp */}
            <form onSubmit={handleSendToWhatsApp} className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <MessageCircle size={13} className="text-emerald-400" />
                <span>WhatsApp Number</span>
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="tel"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="e.g. +256 700 123456"
                    className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 text-white text-xs rounded-lg pl-8 pr-2.5 py-2 placeholder-slate-500 focus:outline-hidden font-mono"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isCapturing}
                  className="px-3.5 py-2 bg-[#25D366] hover:bg-[#20bd5a] active:scale-95 text-slate-950 text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all cursor-pointer shrink-0 disabled:opacity-50"
                  title="Send quotation image to WhatsApp chat"
                >
                  {isCapturing ? <Loader2 size={13} className="animate-spin" /> : <MessageCircle size={13} />}
                  <span>Send to WhatsApp</span>
                </button>
              </div>
              <p className="text-[10px] text-emerald-400 font-medium">Copies image to clipboard & opens chat ready to paste</p>
            </form>

            {/* Field 2: Email Field + Send Image */}
            <form onSubmit={handleSendEmailImage} className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Mail size={13} className="text-sky-400" />
                <span>Email Field</span>
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    placeholder="e.g. client@email.com"
                    className="w-full bg-slate-900 border border-slate-700 focus:border-sky-500 text-white text-xs rounded-lg pl-8 pr-2.5 py-2 placeholder-slate-500 focus:outline-hidden"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isCapturing}
                  className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 active:scale-95 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-md shadow-sky-600/30 transition-all cursor-pointer shrink-0 disabled:opacity-50"
                >
                  {isCapturing ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  <span>Send Image</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-500">Downloads quotation image & opens your email app</p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
