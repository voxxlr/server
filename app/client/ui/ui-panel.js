import { LitElement, html, css } from 'lit';

/**
 * A panel component with a labeled border.
 * 
 * @element ui-panel
 * @attr {String} name - The label shown in the top-left corner
 * @attr {Boolean} important - If present, uses the important/warning color
 * @attr {Boolean} active - If present, uses the active/success color
 */
export class UiPanel extends LitElement {
  static properties = {
    name: { type: String },
  };

  static styles = css`
    :host {
      position: relative;
      display: block;
      border: 1px solid oklch(var(--bc) / 0.2);
      padding: 1.4em 1em 1em 1em;
      margin-top: 1em;
      box-sizing: border-box;
    }

    :host([important]) {
      border-color: oklch(var(--wa));
    }

    :host([active]) {
      border-color: oklch(var(--su));
    }

    span {
      position: absolute;
      top: -0.6em;
      left: 0.6em;
      background-color: oklch(var(--b1));
      z-index: 10;
      color: oklch(var(--bc) / 0.4);
      padding-left: 0.2em;
      padding-right: 0.2em;
    }

    :host([important]) span {
      color: oklch(var(--wa));
    }

    :host([active]) span {
      color: oklch(var(--su));
    }

    slot {
      position: relative;
      overflow: hidden;
    }
  `;

  render() {
    return html`
      <span>${this.name}</span>
      <slot></slot>
    `;
  }
}

customElements.define('ui-panel-lit', UiPanel);
