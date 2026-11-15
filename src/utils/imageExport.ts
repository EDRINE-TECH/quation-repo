import html2canvas from 'html2canvas';
import { toCanvas as toCanvasHtml, toBlob as toBlobHtml, toPng as toPngHtml } from 'html-to-image';

export interface GeneratedImageResult {
  blob: Blob;
  dataUrl: string;
  file: File;
}

const TAILWIND_FONT_PX: Record<string, number> = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
};

function parseTailwindFontToken(token: string): number | null {
  if (token in TAILWIND_FONT_PX) {
    return TAILWIND_FONT_PX[token];
  }
  const match = /^\[([0-9.]+)px\]$/.exec(token);
  if (match) {
    const parsed = parseFloat(match[1]);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function getEffectiveBaseFontPx(el: HTMLElement, useSmBreakpoint: boolean): number | null {
  let basePx: number | null = null;
  let smPx: number | null = null;

  el.classList.forEach((cls) => {
    if (cls.startsWith('text-')) {
      const parsed = parseTailwindFontToken(cls.slice(5));
      if (parsed !== null) {
        basePx = parsed;
      }
    } else if (useSmBreakpoint && cls.startsWith('sm:text-')) {
      const parsed = parseTailwindFontToken(cls.slice(8));
      if (parsed !== null) {
        smPx = parsed;
      }
    }
  });

  return smPx !== null ? smPx : basePx;
}

/**
 * Bakes scaled font sizes directly as inline `!important` styles onto the cloned export card
 * and strips inline `<style>` media queries so rendered images always match the exact Profile
 * `font_size_percent` regardless of viewport width or renderer quirks.
 */
function applyScaledTypographyToClone(
  root: HTMLElement,
  flyerWidth: number,
  fontSizePercent: number,
  stripStyles: boolean = true
): void {
  const safePercent =
    Number.isFinite(fontSizePercent) && fontSizePercent >= 50 && fontSizePercent <= 200
      ? fontSizePercent
      : 100;
  const fontScale = safePercent / 100;
  const useSmBreakpoint = flyerWidth >= 640;
  const scalePxNum = (px: number) => Math.round(px * fontScale * 10) / 10;

  root.style.setProperty('--bq-font-scale', String(fontScale));
  root.style.setProperty('font-size', `${scalePxNum(13)}px`, 'important');

  const elements: HTMLElement[] = [root];
  const styleNodes: Element[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  let current = walker.nextNode();
  while (current) {
    if (current instanceof Element && current.tagName.toUpperCase() === 'STYLE') {
      styleNodes.push(current);
    } else if (current instanceof HTMLElement) {
      elements.push(current);
    }
    current = walker.nextNode();
  }

  for (const el of elements) {
    const tag = el.tagName.toUpperCase();
    if (tag === 'STYLE' || tag === 'SCRIPT' || tag === 'SVG') continue;

    const basePx = getEffectiveBaseFontPx(el, useSmBreakpoint);
    if (basePx !== null) {
      const scaledPx = scalePxNum(basePx);
      el.style.setProperty('font-size', `${scaledPx}px`, 'important');

      if (stripStyles && fontScale > 1.01) {
        const computedLh = window.getComputedStyle(el).lineHeight;
        if (computedLh && computedLh.endsWith('px')) {
          const lhPx = parseFloat(computedLh);
          if (Number.isFinite(lhPx) && lhPx < scaledPx * 1.15) {
            el.style.setProperty(
              'line-height',
              `${Math.round(scaledPx * 1.25 * 10) / 10}px`,
              'important'
            );
          }
        }
      }
    }
  }

  // Remove card-local <style> rules after baking final inline font sizes
  if (stripStyles) {
    for (const styleEl of styleNodes) {
      styleEl.parentNode?.removeChild(styleEl);
    }
  }
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), 'image/png', 1.0);
  });
}

/**
 * Captures an HTML element as a razor-sharp corporate PNG quotation image.
 * Fits baseline card proportions to Profile Height, then applies exact Profile Font Size and Zoom on top.
 */
export async function captureElementAsImage(
  element: HTMLElement,
  fileName: string = 'quotation.png',
  exportScale: number = 2.5,
  targetFlyerWidth: number = 720,
  targetFlyerHeight?: number,
  targetZoom: number = 1.0,
  fontSizePercent: number = 100
): Promise<GeneratedImageResult> {
  const safeFileName = fileName.endsWith('.png') ? fileName : `${fileName}.png`;
  const scale = exportScale || 2.5;
  const flyerWidth = targetFlyerWidth && targetFlyerWidth >= 480 ? targetFlyerWidth : 720;
  const flyerHeight = targetFlyerHeight && targetFlyerHeight >= 500 ? targetFlyerHeight : undefined;
  const zoom = targetZoom && targetZoom >= 0.6 && targetZoom <= 1.8 ? targetZoom : 1.0;

  const stagingWrapper = document.createElement('div');
  stagingWrapper.style.position = 'fixed';
  stagingWrapper.style.left = '0px';
  stagingWrapper.style.top = '0px';
  stagingWrapper.style.width = `${flyerWidth}px`;
  stagingWrapper.style.minWidth = `${flyerWidth}px`;
  stagingWrapper.style.maxWidth = `${flyerWidth}px`;
  stagingWrapper.style.zIndex = '-99999';
  stagingWrapper.style.opacity = '1';
  stagingWrapper.style.pointerEvents = 'none';
  stagingWrapper.style.backgroundColor = '#ffffff';
  stagingWrapper.style.boxSizing = 'border-box';
  stagingWrapper.style.overflow = 'visible';

  const clone = element.cloneNode(true) as HTMLElement;
  clone.id = 'bq-quotation-card-export';
  clone.style.width = `${flyerWidth}px`;
  clone.style.minWidth = `${flyerWidth}px`;
  clone.style.maxWidth = `${flyerWidth}px`;
  clone.style.height = 'auto';
  clone.style.minHeight = '';
  clone.style.margin = '0 auto';
  clone.style.boxSizing = 'border-box';
  clone.style.overflow = 'visible';
  clone.style.maxHeight = 'none';
  clone.style.transform = 'none';
  clone.style.transition = 'none';
  clone.style.zoom = '1';

  stagingWrapper.appendChild(clone);
  document.body.appendChild(stagingWrapper);

  // Pass 1 baseline: normalize to 100% font so height-fit never cancels user Font Size or Zoom
  applyScaledTypographyToClone(clone, flyerWidth, 100, false);

  let fittedBaselineWidth = flyerWidth;
  let unzoomedWidth = Math.max(400, Math.round(flyerWidth / zoom));
  let effectiveZoom = flyerWidth / unzoomedWidth;
  let finalLayoutHeight = flyerHeight || 860;

  try {
    if (typeof document !== 'undefined' && 'fonts' in document && document.fonts?.ready) {
      await Promise.race([
        document.fonts.ready,
        new Promise((resolve) => setTimeout(resolve, 350)),
      ]);
    }

    const images = Array.from(clone.querySelectorAll('img'));
    await Promise.all(
      images.map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
          setTimeout(resolve, 500);
        });
      })
    );
    await new Promise((r) => setTimeout(r, 50));

    // Measure baseline (100% font, 1.0 zoom) natural height against target flyerHeight
    const baselineNaturalH = Math.max(clone.offsetHeight, clone.scrollHeight);
    if (flyerHeight && baselineNaturalH > flyerHeight + 4) {
      const pass1Ratio = Math.min(2.4, baselineNaturalH / flyerHeight);
      const pass1Width = Math.round(flyerWidth * pass1Ratio);
      stagingWrapper.style.width = `${pass1Width}px`;
      stagingWrapper.style.minWidth = `${pass1Width}px`;
      stagingWrapper.style.maxWidth = `${pass1Width}px`;
      clone.style.width = `${pass1Width}px`;
      clone.style.minWidth = `${pass1Width}px`;
      clone.style.maxWidth = `${pass1Width}px`;

      const pass1H = Math.max(clone.offsetHeight, clone.scrollHeight);
      const refinedRatio = Math.max(1, Math.min(2.4, pass1H / flyerHeight));
      fittedBaselineWidth = Math.round(flyerWidth * refinedRatio);

      if (fittedBaselineWidth !== pass1Width) {
        stagingWrapper.style.width = `${fittedBaselineWidth}px`;
        stagingWrapper.style.minWidth = `${fittedBaselineWidth}px`;
        stagingWrapper.style.maxWidth = `${fittedBaselineWidth}px`;
        clone.style.width = `${fittedBaselineWidth}px`;
        clone.style.minWidth = `${fittedBaselineWidth}px`;
        clone.style.maxWidth = `${fittedBaselineWidth}px`;
      }

      const checkScale = flyerWidth / fittedBaselineWidth;
      const checkH = Math.max(clone.offsetHeight, clone.scrollHeight);
      if (checkH * checkScale > flyerHeight + 4) {
        const cappedMaxW = Math.round(flyerWidth * 2.4);
        const exactW = Math.min(cappedMaxW, Math.round((checkH * flyerWidth) / flyerHeight));
        if (exactW > fittedBaselineWidth) {
          fittedBaselineWidth = exactW;
        }
      }
    }

    // Apply user's Zoom and Font Size ON TOP of baseline-fitted width
    unzoomedWidth = Math.max(400, Math.round(fittedBaselineWidth / zoom));
    effectiveZoom = flyerWidth / unzoomedWidth;

    stagingWrapper.style.width = `${unzoomedWidth}px`;
    stagingWrapper.style.minWidth = `${unzoomedWidth}px`;
    stagingWrapper.style.maxWidth = `${unzoomedWidth}px`;
    clone.style.width = `${unzoomedWidth}px`;
    clone.style.minWidth = `${unzoomedWidth}px`;
    clone.style.maxWidth = `${unzoomedWidth}px`;

    // Bake user's actual font_size_percent and strip card-local <style>
    applyScaledTypographyToClone(clone, flyerWidth, fontSizePercent, true);

    const baselineFitZoom = flyerWidth / fittedBaselineWidth;
    const unzoomedMinHeight = flyerHeight ? Math.round(flyerHeight / baselineFitZoom) : undefined;
    if (unzoomedMinHeight) {
      clone.style.minHeight = `${unzoomedMinHeight}px`;
    }

    const unscaledHeight = Math.max(clone.offsetHeight, clone.scrollHeight);
    finalLayoutHeight = unzoomedMinHeight
      ? Math.max(unscaledHeight, unzoomedMinHeight)
      : unscaledHeight;

    const outputCanvasWidth = flyerWidth;
    const outputCanvasHeight = Math.max(1, Math.round(finalLayoutHeight * effectiveZoom));

    clone.style.height = `${finalLayoutHeight}px`;
    stagingWrapper.style.height = `${finalLayoutHeight}px`;

    let dataUrl = '';
    let blob: Blob | null = null;

    // Primary: Single-pass html-to-image toCanvas (full Tailwind v4 oklch support + exact canvasWidth/canvasHeight zoom)
    try {
      const renderedCanvas = await toCanvasHtml(clone, {
        quality: 0.98,
        pixelRatio: scale,
        backgroundColor: '#ffffff',
        cacheBust: true,
        skipFonts: true,
        width: unzoomedWidth,
        height: finalLayoutHeight,
        canvasWidth: outputCanvasWidth,
        canvasHeight: outputCanvasHeight,
      });

      if (renderedCanvas && renderedCanvas.width > 0 && renderedCanvas.height > 0) {
        dataUrl = renderedCanvas.toDataURL('image/png', 1.0);
        blob = await canvasToPngBlob(renderedCanvas);
      }
    } catch (htiErr) {
      console.warn('html-to-image single-pass failed, trying html2canvas fallback:', htiErr);
    }

    // Fallback: html2canvas if toCanvas failed
    if (!blob || !dataUrl || dataUrl.length < 500) {
      try {
        const h2cCanvas = await html2canvas(clone, {
          scale: scale * effectiveZoom,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          scrollX: 0,
          scrollY: 0,
          width: unzoomedWidth,
          height: finalLayoutHeight,
          windowWidth: flyerWidth >= 640 ? 1024 : 480,
        });

        if (h2cCanvas && h2cCanvas.width > 0 && h2cCanvas.height > 0) {
          dataUrl = h2cCanvas.toDataURL('image/png', 1.0);
          blob = await canvasToPngBlob(h2cCanvas);
        }
      } catch (h2cErr) {
        console.warn('html2canvas fallback also failed:', h2cErr);
      }
    }

    if (!blob) {
      const options = {
        quality: 0.98,
        pixelRatio: scale,
        backgroundColor: '#ffffff',
        cacheBust: true,
        skipFonts: true,
        width: unzoomedWidth,
        height: finalLayoutHeight,
        canvasWidth: outputCanvasWidth,
        canvasHeight: outputCanvasHeight,
      };
      dataUrl = await toPngHtml(clone, options);
      blob = await toBlobHtml(clone, options);
    }

    if (!blob) {
      throw new Error('Failed to generate image blob');
    }

    const file = new File([blob], safeFileName, {
      type: 'image/png',
    });

    return { blob, dataUrl, file };
  } catch (err) {
    console.warn('Rendering encountered issue, using direct element fallback:', err);

    const targetFallback = clone && clone.isConnected ? clone : element;
    const unscaledHeight = Math.max(targetFallback.offsetHeight, targetFallback.scrollHeight);
    const fallbackMinHeight = flyerHeight ? Math.round(flyerHeight / effectiveZoom) : undefined;
    const fallbackLayoutHeight = fallbackMinHeight
      ? Math.max(unscaledHeight, fallbackMinHeight)
      : unscaledHeight;

    const options = {
      quality: 0.98,
      pixelRatio: scale,
      backgroundColor: '#ffffff',
      cacheBust: true,
      skipFonts: true,
      width: unzoomedWidth,
      height: fallbackLayoutHeight,
      canvasWidth: flyerWidth,
      canvasHeight: Math.max(1, Math.round(fallbackLayoutHeight * effectiveZoom)),
    };

    const dataUrl = await toPngHtml(targetFallback, options);
    const blob = await toBlobHtml(targetFallback, options);
    if (!blob) {
      throw new Error('Failed to generate image blob');
    }

    const file = new File([blob], safeFileName, {
      type: 'image/png',
    });

    return { blob, dataUrl, file };
  } finally {
    if (stagingWrapper.parentNode) {
      document.body.removeChild(stagingWrapper);
    }
  }
}

/**
 * Downloads a Blob as a file in the browser.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Copies a PNG Blob to the system clipboard as an image.
 */
export async function copyImageBlobToClipboard(blob: Blob): Promise<boolean> {
  try {
    if (typeof window !== 'undefined') {
      try {
        window.focus();
      } catch {
        // ignore focus errors
      }
    }

    if (typeof navigator === 'undefined' || !navigator.clipboard || !navigator.clipboard.write) {
      console.warn('Clipboard write API not available in this environment');
      return false;
    }

    const pngBlob = blob.type === 'image/png' ? blob : new Blob([blob], { type: 'image/png' });

    if (typeof ClipboardItem !== 'undefined') {
      try {
        const item = new ClipboardItem({ 'image/png': pngBlob });
        await navigator.clipboard.write([item]);
        return true;
      } catch (directErr) {
        console.warn('Direct ClipboardItem write failed, trying Promise strategy:', directErr);
      }

      try {
        const item = new ClipboardItem({ 'image/png': Promise.resolve(pngBlob) });
        await navigator.clipboard.write([item]);
        return true;
      } catch (promiseErr) {
        console.warn('Promise-wrapped ClipboardItem write failed:', promiseErr);
      }
    }

    return false;
  } catch (err) {
    console.warn('Clipboard writeImage failed:', err);
    return false;
  }
}

/**
 * Copies an asynchronously generated PNG Blob to the clipboard while preserving the synchronous
 * user-gesture activation inside click handlers (via ClipboardItem with Promise<Blob>).
 */
export async function copyImagePromiseToClipboard(
  createPngBlob: () => Promise<Blob | null>
): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.clipboard || !navigator.clipboard.write) {
    await createPngBlob();
    return false;
  }

  if (typeof ClipboardItem !== 'undefined') {
    const blobPromise = createPngBlob().then((b) => {
      if (!b) throw new Error('No image blob generated');
      return b.type === 'image/png' ? b : new Blob([b], { type: 'image/png' });
    });

    try {
      const item = new ClipboardItem({ 'image/png': blobPromise });
      await navigator.clipboard.write([item]);
      return true;
    } catch {
      // Browser doesn't support Promise in ClipboardItem; wait for blob and try direct write
      try {
        const resolvedBlob = await blobPromise;
        return await copyImageBlobToClipboard(resolvedBlob);
      } catch {
        return false;
      }
    }
  }

  return false;
}
