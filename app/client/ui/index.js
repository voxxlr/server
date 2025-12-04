/**
 * UI Components Library - Lit Edition
 * 
 * This is the Lit-based version of ui.js components.
 * Uses DaisyUI CSS variables for theming.
 * 
 * Usage:
 *   <script type="module" src="ui/index.js"></script>
 *   
 *   <!-- Then use components -->
 *   <ui-panel-lit name="My Panel">Content</ui-panel-lit>
 *   <ui-checkbox-lit name="Check me"></ui-checkbox-lit>
 */

export { UiPanel } from './ui-panel.js';
export { UiCheckbox } from './ui-checkbox.js';

// Re-export for convenience
export * from 'lit';
