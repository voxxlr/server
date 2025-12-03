import { LitElement, html } from 'https://cdn.jsdelivr.net/npm/lit@3/+esm';

/**
 * A modal dialog component built with Lit and Tailwind
 * @fires open - Fired when the modal is opened
 * @fires close - Fired when the modal is closed
 * @slot - Default slot for modal content
 */
export class VxModal extends LitElement {
  static properties = {
    hidden: { type: Boolean, reflect: true },
    close: { type: Boolean, reflect: true },
    local: { type: Boolean, reflect: true }
  };

  constructor() {
    super();
    this.hidden = true;
    this.close = false;
    this.local = false;
  }

  updated(changedProperties) {
    if (changedProperties.has('hidden')) {
      if (this.hidden) {
        this.dispatchEvent(new CustomEvent('close', { bubbles: true }));
      } else {
        this.dispatchEvent(new CustomEvent('open', { bubbles: true }));
      }
    }
  }

  _handleClose() {
    this.hidden = true;
  }

  render() {
    if (this.hidden) {
      return html``;
    }

    return html`
      <link rel="stylesheet" href="/styles-built.css">
      
      <div 
        class="${this.local ? 'absolute' : 'fixed'} inset-0 bg-black/50 flex justify-center items-center z-[99]"
        @click=${this._handleClose}
      >
        <div 
          class="relative p-8 bg-white shadow-2xl box-border"
          @click=${(e) => e.stopPropagation()}
        >
          ${this.close ? html`
            <button 
              class="absolute top-2 right-2 w-6 h-6 p-0 rounded-full border border-border cursor-pointer flex items-center justify-center text-sm text-primary bg-gradient-to-b from-white to-gray-200 hover:bg-gradient-to-t active:scale-95 transition-all"
              @click=${this._handleClose}
              aria-label="Close modal"
            >✕</button>
          ` : ''}
          <slot></slot>
        </div>
      </div>
    `;
  }
}

customElements.define('vx-modal', VxModal);
