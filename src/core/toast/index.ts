/**
 * Toast System - First-time user guidance toasts
 *
 * Toasts are now rendered inline within components using CSS positioning.
 * Global toast CSS variables are defined in toast-styles.css.
 *
 * Usage:
 * ```tsx
 * import { hasShown, markShown, getToastConfig } from '@core/toast';
 *
 * // In component - render inline toast with CSS positioning:
 * {showToast && (
 *   <div className="button-toast" onClick={() => setShowToast(false)}>
 *     {message}
 *     <div className="button-toast__arrow" />
 *   </div>
 * )}
 * ```
 *
 * CSS Variables (in toast-styles.css):
 * - --toast-bg-color: Background color with alpha
 * - --toast-bg-blur: Backdrop blur amount
 * - --toast-border-radius: Corner radius
 * - --toast-shadow: Box shadow
 * - --toast-text-color: Text color
 * - --toast-font-family: Font family
 * - --toast-font-size: Font size
 * - --toast-padding: Internal padding
 * - --toast-arrow-size: Arrow/pointer size
 * - --toast-arrow-color: Arrow color
 */

export {
  type ToastKey,
  type ToastConfig,
  hasShown,
  markShown,
  shouldShowAndMark,
  getToastConfig,
  resetAllToasts,
  resetToast,
  getShownToasts,
  TOAST_DEFINITIONS
} from './ToastMemory';
