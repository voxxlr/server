import { LitElement, html } from 'https://cdn.jsdelivr.net/npm/lit@3/+esm';

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
      
      <div class="modal modal-open">
        <div class="modal-box relative max-w-[calc(100vw-9rem)] w-auto" @click=${(e) => e.stopPropagation()}>
          ${this.close ? html`
            <button 
              class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
              @click=${this._handleClose}
            >✕</button>
          ` : ''}
          <slot></slot>
        </div>
        <div class="modal-backdrop" @click=${this._handleClose}></div>
      </div>
    `;
  }
}

customElements.define('vx-modal', VxModal);
