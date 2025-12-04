import { LitElement, html, css } from 'lit';

/**
 * A checkbox component with optional indeterminate state.
 * 
 * @element ui-checkbox
 * @attr {String} name - The label text
 * @attr {Boolean} disabled - If present, disables the checkbox
 * @fires change - Fired when checkbox state changes
 * 
 * @slot - Optional slot for additional content (replaces name attribute)
 */
export class UiCheckbox extends LitElement {
  static properties = {
    name: { type: String },
    checked: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    indeterminate: { type: Boolean, reflect: true },
  };

  static styles = css`
    :host {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
    }

    :host([disabled]) {
      opacity: 0.5;
      cursor: not-allowed;
      pointer-events: none;
    }

    /* DaisyUI checkbox styling using CSS variables */
    input[type="checkbox"] {
      --chkbg: oklch(var(--p));
      --chkfg: oklch(var(--pc));
      
      appearance: none;
      width: 1.5rem;
      height: 1.5rem;
      border: 2px solid oklch(var(--bc) / 0.2);
      border-radius: 0.25rem;
      cursor: pointer;
      flex-shrink: 0;
      transition: all 0.2s ease-in-out;
    }

    input[type="checkbox"]:checked {
      background-color: var(--chkbg);
      border-color: var(--chkbg);
      background-image: url("data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e");
      background-size: 100% 100%;
      background-repeat: no-repeat;
      background-position: center;
    }

    input[type="checkbox"]:indeterminate {
      background-color: var(--chkbg);
      border-color: var(--chkbg);
      background-image: url("data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M4 8a1 1 0 011-1h6a1 1 0 110 2H5a1 1 0 01-1-1z'/%3e%3c/svg%3e");
      background-size: 100% 100%;
      background-repeat: no-repeat;
      background-position: center;
    }

    input[type="checkbox"]:focus-visible {
      outline: 2px solid oklch(var(--p));
      outline-offset: 2px;
    }

    label {
      cursor: pointer;
      user-select: none;
    }
  `;

  constructor() {
    super();
    this.checked = false;
    this.disabled = false;
    this.indeterminate = false;
  }

  get value() {
    return this.checked;
  }

  set value(val) {
    this.checked = val;
    this.indeterminate = false;
  }

  _handleChange(e) {
    this.checked = e.target.checked;
    this.indeterminate = false;
    
    this.dispatchEvent(new CustomEvent('change', {
      detail: { checked: this.checked },
      bubbles: true,
      composed: true
    }));
  }

  _handleClick() {
    if (!this.disabled) {
      this.checked = !this.checked;
      this.indeterminate = false;
      
      this.dispatchEvent(new CustomEvent('change', {
        detail: { checked: this.checked },
        bubbles: true,
        composed: true
      }));
    }
  }

  updated(changedProperties) {
    if (changedProperties.has('indeterminate')) {
      const checkbox = this.shadowRoot.querySelector('input');
      if (checkbox) {
        checkbox.indeterminate = this.indeterminate;
      }
    }
  }

  render() {
    return html`
      <input 
        type="checkbox" 
        .checked=${this.checked}
        ?disabled=${this.disabled}
        @change=${this._handleChange}
      />
      <label @click=${this._handleClick}>
        <slot>${this.name}</slot>
      </label>
    `;
  }
}

customElements.define('ui-checkbox-lit', UiCheckbox);
