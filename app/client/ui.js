//
// UI Components Library (ES Module)
//

// Import Lit once for all components
const { LitElement, html, css, unsafeCSS } = await import('https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js');

// Load shared styles once via Constructable Stylesheets
const [daisyCSS, fontAwesomeCSS] = await Promise.all([
    fetch(`${window.app_domain}/styles-built.css`).then(r => r.text()),
    fetch('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css').then(r => r.text())
]);

// For Lit components
const sharedStyles = css`${unsafeCSS(fontAwesomeCSS)}${unsafeCSS(daisyCSS)}`;

// For vanilla web components - Constructable Stylesheet
const sharedSheet = new CSSStyleSheet();
sharedSheet.replaceSync(fontAwesomeCSS + daisyCSS);

//
//ui-panel
//
class UiPanel extends LitElement {
    static properties = {
        name: { type: String, reflect: true }
    };

    static styles = [
        sharedStyles,
        css`
            :host {
                position: relative;
                display: block;
                box-sizing: border-box;
            }
        
            span { 
                position: absolute;
                top: -0.6em !important; 
                left: 0.6em !important; 
                background-color: white;
                z-index: 10;
                color: var(--border);
                padding-left: 0.2em;
                padding-right: 0.2em;
            }
            :host-context([important]) span { color: var(--important); }
            :host-context([active]) span { color: var(--active); }

            :host-context([important]) { border-color: var(--important); }
            :host-context([active]) { border-color: var(--active); }
            
            slot {
                position: relative;
                overflow: hidden;
            }
        `
    ];

    constructor() {
        super();
        this.name = '';
    }

    render() {
        return html`
            <span>${this.name}</span>
            <slot></slot>
        `;
    }
}

customElements.define("ui-panel", UiPanel);
    
//
//ui-option
//
class UiOption extends LitElement {
    static properties = {
        active: { type: Boolean, reflect: true },
        deletable: { type: Boolean, reflect: true }
    };

    static styles = [
        sharedStyles,
        css`
            :host {
                display: block;
            }

            :host(:hover) { background-color: var(--hover) }
            :host([active]) { background-color: var(--selected) }

            div { padding: 0.2em 1.0em 0.2em 1.0em; }
            
            :host(:not([deletable])) i { display: none }
        `
    ];

    constructor() {
        super();
        this.active = false;
        this.deletable = false;
    }

    render() {
        return html`
            <div @click=${this._onClick}>
                <slot></slot>
                <i class="fas fa-times cursor-pointer text-primary float-right"></i>
            </div>
        `;
    }

    _onClick(event) {
        if (event.target.tagName == "I") {
            this.dispatchEvent(new CustomEvent('option-delete', { bubbles: true, detail: this }));
        } else {
            this.dispatchEvent(new CustomEvent('option-click', { bubbles: true, detail: this }));
        }
    }
}

customElements.define("ui-option", UiOption);


//
//ui-dropdown
//
class UiDropdown extends LitElement {
    static properties = {
        open: { type: Boolean, reflect: true }
    };

    static styles = [
        sharedStyles,
        css`
            :host {
                position: relative;
                display: flex;
            }
            
            button { border-top-right-radius: 4px; }
            
            button:before {
                font-family: "Font Awesome 5 Free";
                font-weight: 900;
                display: inline-block;
                vertical-align: middle;
                color: var(--primary);
            }
            :host([open]) button:before { content: "\\f150"; }
            :host(:not([open])) button:before { content: "\\f151"; }
            
            div { 
                position: relative;
                flex: 2; 
            }

            main {
                position: absolute;
                width: 100%;
                z-index: 17;
                background-color: white;
                flex-direction: column;
                align-items: stretch;
            }

            :host([open]) main { display: flex; }
            :host(:not([open])) main { display: none; }
        `
    ];

    constructor() {
        super();
        this.open = false;
        this._slotInitialized = false;
    }

    render() {
        return html`
            <div>
                <slot name="selected"></slot>
                <main>
                    <slot @slotchange=${this._onSlotChange}></slot>
                </main>
            </div>
            <button class="vx-secondary" @click=${this._onButtonClick}></button>
        `;
    }

    _onButtonClick(event) {
        this.open = !this.open;
        if (this.open) {
            this.dispatchEvent(new CustomEvent('open', { bubbles: true }));
        } else {
            this.dispatchEvent(new CustomEvent('close', { bubbles: true }));
        }
    }

    _onSlotChange(event) {
        event.target.assignedElements().forEach(node => {
            if (!node["ui-dropdown"]) {
                if (node.hasAttribute("active")) {
                    node.setAttribute("slot", "selected");
                }

                node.addEventListener("click", event => {
                    this.open = !this.open;
                    if (this.open) {
                        this.dispatchEvent(new CustomEvent('open', { bubbles: true }));
                    } else {
                        let list = this.shadowRoot.querySelector("div > slot").assignedElements();
                        if (list.length > 0) {
                            list[0].removeAttribute("active");
                            list[0].removeAttribute("slot");
                        }
                        node.setAttribute("slot", "selected");
                        node.toggleAttribute("active", true);

                        this.dispatchEvent(new CustomEvent('close', { bubbles: true }));
                    }
                });

                node["ui-dropdown"] = true;
            }
        });
    }

    getActive() {
        let list = this.shadowRoot.querySelector("div > slot").assignedElements();
        if (list.length > 0) {
            return list[0];
        }
        return null;
    }
}

customElements.define("ui-dropdown", UiDropdown);
    
//
// ui-checkbox
//
class UiCheckbox extends LitElement {
    static properties = {
        checked: { type: Boolean, reflect: true }
    };

    static styles = [
        sharedStyles,
        css`
            :host {
                display: inline-block;
                height: inherit;
                width: inherit;
                font-size: inherit;
                line-height: 1;
            }
        `
    ];

    constructor() {
        super();
        this.checked = false;
    }

    render() {
        return html`
            <input type="checkbox" 
                   class="checkbox checkbox-primary checkbox-sm"
                   .checked=${this.checked}
                   @change=${this._onChange}>
        `;
    }

    _onChange(e) {
        this.checked = e.target.checked;
        this.dispatchEvent(new CustomEvent('change', { 
            bubbles: true,
            composed: true,
            detail: this 
        }));
    }
}

customElements.define("ui-checkbox", UiCheckbox);


//
// ui-collapsible
//
class UiCollapsible extends LitElement {
    static properties = {
        open: { type: Boolean, reflect: true },
        selected: { type: Boolean, reflect: true }
    };

    static styles = [
        sharedStyles,
        css`
        :host {
            position: relative;
            display: flex;
            flex-direction: column;
            justify-content: stretch;
            width: 100%;
            box-sizing: border-box;
        }
                    
        :host([selected]) { border-width: 2px; border-color: var(--primary); }
        
        :host([open]) header {
            background-color: var(--panel-header);
            box-shadow: inset 0 -1px 0 rgb(0 0 0 / 13%);
        }
        
        :host(:not([open])) header { background-color: white; }
    
        header { padding: 0.2em 0.3em; }
        i { margin-left: 0.5em; padding: 0.3em; }
        
        i:after {
            font-family: "Font Awesome 5 Free";
            font-weight: 900;
            color: var(--primary);
            display: inline-block;
            vertical-align: middle;
            float: right;
        }
        :host([open]) i:after { content: "\\f107"; }
        :host(:not([open])) i:after { content: "\\f106"; }

        main { transition: max-height 0.25s; }
        
        :host([open]) main { max-height: 50em; }
        :host(:not([open])) main { max-height: 0; }
        
        ::slotted([slot=header]) { flex: 1 }
        `
    ];

    constructor() {
        super();
        this.open = false;
        this.selected = false;
    }

    render() {
        return html`
            <header class="flex items-center text-left" @click=${this._onHeaderClick}>
                <slot name="header"></slot>
                <i class="fas opener cursor-pointer text-primary" @click=${this._onButtonClick}></i>
            </header>
            <main class="overflow-hidden">
                <slot></slot>
            </main>
        `;
    }

    _onHeaderClick(e) {
        this.dispatchEvent(new CustomEvent('header-click', { bubbles: true }));
    }

    _onButtonClick(e) {
        this.dispatchEvent(new CustomEvent('button-click', { bubbles: true }));
        e.stopPropagation();
        e.preventDefault();
    }
}

customElements.define("ui-collapsible", UiCollapsible);



//
// ui-collapsible-list
//
class UiCollapsibleList extends LitElement {
    static properties = {
        selectable: { type: Boolean, reflect: true }
    };

    static styles = [
        sharedStyles,
        css`
            :host {
                display: block;
            }
        `
    ];

    constructor() {
        super();
        this.selectable = false;
    }

    render() {
        return html`<slot></slot>`;
    }

    firstUpdated() {
        this.shadowRoot.addEventListener("header-click", e => this._onHeaderClick(e));
        this.shadowRoot.addEventListener("button-click", e => this._onButtonClick(e));
    }

    _onHeaderClick(event) {
        if (this.selectable) {
            let selected = this._getselected();
            if (selected) {
                this._select(selected, false);
            }
            this._select(event.target, !event.target.hasAttribute("selected"));
        } else {
            let open = this._getopen();
            if (open) {
                this._open(open, false);
            }
            if (event.target != open) {
                this._open(event.target, true);
            }
        }
    }

    _onButtonClick(event) {
        let open = this._getopen();
        if (open) {
            this._open(open, false);
        }
        if (event.target != open) {
            this._open(event.target, true);
        }
    }

    open(collapsible) {
        let open = this._getopen();
        if (open && open != collapsible) {
            open.toggleAttribute("open", false);
        }
        collapsible.toggleAttribute("open", true);
        return open != collapsible;
    }

    close(collapsible) {
        collapsible.toggleAttribute("open", false);
    }

    select(collapsible) {
        let selected = this._getselected();
        if (selected && selected != collapsible) {
            selected.toggleAttribute("selected", false);
        }
        collapsible.toggleAttribute("selected", true);
        return selected != collapsible;
    }

    unselect(collapsible) {
        collapsible.toggleAttribute("selected", false);
    }

    _open(collapsible, state) {
        collapsible.toggleAttribute("open", state);
        collapsible.dispatchEvent(new CustomEvent(state ? 'open' : 'close', { bubbles: true }));
    }

    _getopen() {
        let slot = this.shadowRoot.querySelector("slot");
        return slot.assignedElements().find(node => node.hasAttribute("open"));
    }

    _select(collapsible, state) {
        collapsible.toggleAttribute("selected", state);
        collapsible.dispatchEvent(new CustomEvent(state ? 'select' : 'unselect', { bubbles: true }));
    }

    _getselected() {
        let slot = this.shadowRoot.querySelector("slot");
        return slot.assignedElements().find(node => node.hasAttribute("selected"));
    }
}

customElements.define("ui-collapsible-list", UiCollapsibleList);
    



//
// ui-selection-list
//
class UiSelectionList extends LitElement {
    static styles = [
        sharedStyles,
        css`
            :host { display: flex; }
        `
    ];

    render() {
        return html`<slot @click=${this._onClick}></slot>`;
    }

    _onClick(event) {
        let target = event.target;
        while (target.parentElement != this) {
            target = target.parentElement;
        }
        this.select(target, true);
    }

    select(target, notify) {
        target = target instanceof HTMLElement ? target : this.querySelector(target);

        let items = this.shadowRoot.querySelector("slot").assignedElements();
        items.forEach(item => {
            if (item != target) {
                if (item.hasAttribute("active")) {
                    if (this.hasAttribute("single")) {
                        item.toggleAttribute("active");
                        if (notify) {
                            this.dispatchEvent(new CustomEvent("up", { detail: item }));
                        }
                    }
                }
            } else {
                if (item.hasAttribute("active")) {
                    if (!this.hasAttribute("required")) {
                        item.toggleAttribute("active");
                        if (notify) {
                            this.dispatchEvent(new CustomEvent("up", { detail: item }));
                        }
                    }
                } else {
                    item.toggleAttribute("active");
                    if (notify) {
                        this.dispatchEvent(new CustomEvent("down", { detail: item }));
                    }
                }
            }
        });
        this.dispatchEvent(new CustomEvent("change"));
    }
}

customElements.define("ui-selection-list", UiSelectionList);


//
// ui-tab-list
//
class UiTabList extends LitElement {
    static styles = [
        sharedStyles,
        css`
            :host {
                display: flex;
                flex-direction: column;
            }

            /* em-based values stay in CSS */
            main { flex: 1; }
    
            ::slotted([slot=content]:not([active])) { display: none !important; }
            ::slotted([slot=content]) { height: 100%; }
        `
    ];

    render() {
        return html`
            <header class="flex">
                <slot name="header"></slot>
                <slot></slot>
            </header>
            <main class="overflow-auto relative">
                <slot name="content"></slot>
            </main>
        `;
    }

    firstUpdated() {
        this._content = this.shadowRoot.querySelector("slot[name=content]");
        this._header = this.shadowRoot.querySelector("slot[name=header]");
        this._header.addEventListener("click", e => this._onHeaderClick(e));
    }

    _onHeaderClick(event) {
        this._header.assignedNodes().forEach((node, index) => {
            if (node != event.target) {
                if (node.hasAttribute("active")) {
                    node.removeAttribute("active");
                    this._content.assignedElements()[index].toggleAttribute("active", false);
                    node.dispatchEvent(new CustomEvent("change", { detail: false, bubbles: true }));
                }
            } else {
                event.target.toggleAttribute("active", true);
                this._content.assignedElements()[index].toggleAttribute("active", true);
                event.target.dispatchEvent(new CustomEvent("change", { detail: true, bubbles: true }));
            }
        });
    }
}

customElements.define("ui-tab-list", UiTabList);
    

//
// ui-stack
//
class UiStack extends LitElement {
    static styles = [
        sharedStyles,
        css`
            :host {
                position: relative;
                overflow: hidden;
            }

            ::slotted(:not([active])) { display: none !important; }
        `
    ];

    render() {
        return html`<slot></slot>`;
    }

    show(element) {
        let top = element instanceof HTMLElement ? element : typeof element == "string" ? this.querySelector(element) : null;
        this.shadowRoot.querySelector("slot").assignedElements().forEach(node => {
            node.toggleAttribute("active", top === node);
        });
    }
}

customElements.define("ui-stack", UiStack);


//
// ui-toggle
//
class UiToggle extends LitElement {
    static properties = {
        open: { type: Boolean, reflect: true },
        close: { type: Boolean, reflect: true }
    };

    static styles = [
        sharedStyles,
        css`
            :host {
                position: relative;
                display: block;
            }

            :host(:hover) div { background: var(--hover); }

            main {
                overflow: hidden;
                height: 100%;
                width: 100%;
            }

            aside {
                position: absolute;
                overflow: hidden;
                height: 4em;
                width: 4em;
            }

            :host([right]) aside, :host([left]) aside { top: calc(50% - 2em); }
            :host([top]) aside, :host([bottom]) aside { left: calc(50% - 2em); }

            aside div {
                position: relative;
                overflow: hidden;
                width: 4em;
                height: 4em;
                background: var(--border);
                transform: rotate(-45deg);
                border-radius: 0.8em;
            }

            aside i {
                position: relative;
                color: var(--primary);
            }
            
            i:before {
                font-family: "Font Awesome 5 Free" !important;
                font-weight: 900;
                content: "\\f057";
            }

            :host([right]) aside { left: -4em; }
            :host([left]) aside { right: -4em; }
            :host([bottom]) aside { bottom: -4em; }
            :host([top]) aside { top: -4em; }

            :host([left]) div { right: 2.8em; }
            :host([left]) i { left: 0.2em; }
            :host([right]) div { left: 2.8em; }
            :host([right]) i { left: 2.8em; }
            
            :host([left]) i, :host([right]) i { top: -2.5em; }

            :host([top]) div { bottom: -2.8em; }
            :host([bottom]) div { top: -2.8em; }
            :host([top]) i { bottom: 1.3em; }
            :host([bottom]) i { top: -3.7em; } 

            :host([top]) i, :host([bottom]) i { left: 1.5em; }
        
            :host([close]) i:before {
                font-family: "Font Awesome 5 Free" !important;
                font-weight: 900;
                content: "\\f141";
            }
        `
    ];

    constructor() {
        super();
        this.open = false;
        this.close = false;
    }

    render() {
        return html`
            <aside @click=${this._onAsideClick}>
                <div></div>
                <i class="fas"></i>
            </aside>
            <main>
                <slot></slot>
            </main>
        `;
    }

    _onAsideClick(event) {
        if (this.open) {
            this.open = false;
            this.close = true;
            this.dispatchEvent(new CustomEvent('toggle', { bubbles: true, detail: "close" }));
        } else {
            this.open = true;
            this.close = false;
            this.dispatchEvent(new CustomEvent('toggle', { bubbles: true, detail: "open" }));
        }
        event.stopPropagation();
    }

    closeToggle() {
        if (this.open) {
            this._onAsideClick(new Event('click'));
        }
    }
    
    openToggle() {
        if (this.close) {
            this._onAsideClick(new Event('click'));
        }
    }
}

customElements.define("ui-toggle", UiToggle);
    


//
// ui-tag
//
class UiTag extends LitElement {
    static styles = [
        sharedStyles,
        css`
            :host {
                display: inline-flex;
                align-items: center;
                color: var(--ui-tag-color, var(--primary));
                background: var(--ui-tag-bg, var(--panel-header));
                box-sizing: border-box;
                font-size: var(--ui-tag-font-size, 0.8em);
                line-height: var(--ui-tag-line-height, 0.8em);
            }
            
            span { 
                display: inline-block;
                margin: 0.1em 0.2em 0.1em 0.3em;
            }
            
            i { 
                cursor: pointer;
                float: right; 
                margin: 0.2em 0.2em 0.2em 0.2em;
            }
            
            :host-context([disabled]) i { visibility: hidden; }
        `
    ];

    render() {
        return html`
            <span><slot></slot></span>
            <i class="fas fa-times-circle" @click=${this._onDelete}></i>
        `;
    }

    _onDelete(event) {
        this.dispatchEvent(new CustomEvent('tag-delete', { bubbles: true, detail: this }));
    }
}

customElements.define("ui-tag", UiTag);


//
// ui-tag-list
//
class UiTagList extends LitElement {
    static properties = {
        tags: { type: String, reflect: true }
    };

    static styles = [
        sharedStyles,
        css`
            :host > ui-tag:not(:nth-of-type(1)) { margin-left: 0.2em; }
        `
    ];

    constructor() {
        super();
        this.tags = '';
    }

    render() {
        return html`<slot></slot>`;
    }

    firstUpdated() {
        this.shadowRoot.addEventListener("tag-delete", event => {
            let tags = this.tags ? this.tags.split(",") : [];
            tags.splice(tags.indexOf(event.target.textContent), 1);
            if (tags.length) {
                this.tags = tags.join(",");
            } else {
                this.tags = '';
                this.removeAttribute("tags");
            }
            
            this.dispatchEvent(new CustomEvent('tag-delete', { bubbles: true, detail: event.target }));
            this.dispatchEvent(new CustomEvent('tags-changed', { bubbles: true, detail: tags }));
        });
    }

    updated(changedProperties) {
        if (changedProperties.has('tags')) {
            const oldValue = changedProperties.get('tags');
            const newValue = this.tags;
            
            let newTags = newValue ? newValue.split(",") : [];
            let oldTags = oldValue ? oldValue.split(",") : [];
            
            this.shadowRoot.querySelectorAll("ui-tag").forEach(tag => {
                if (!newTags.includes(tag.textContent)) {
                    tag.remove();
                    oldTags.splice(oldTags.indexOf(tag.textContent), 1);
                } 
            });
        
            newTags.forEach((newTag, index, object) => {
                if (newTag.length > 0) {
                    if (!oldTags.includes(newTag)) {
                        let tag = document.createElement("ui-tag");
                        tag.textContent = newTag;
                        this.shadowRoot.appendChild(tag);
                        oldTags.push(newTag);
                    }
                }
            });
        }
    }
    
    add(newTags) {
        for (var i = 0; i < newTags.length; i++) {
            newTags[i] = newTags[i].toLowerCase();
        }
        newTags = newTags.filter(tag => tag !== "");
        
        if (newTags.length) {
            let oldTags = [];
            if (this.tags && this.tags.length > 0) {
                oldTags = this.tags.split(",");
            }
            let tags = newTags.concat(oldTags);
            this.tags = tags.join(",");
            this.dispatchEvent(new CustomEvent('tags-changed', { bubbles: true, detail: this.tags.split(",") }));
        }
    }
    
    get() {
        let result = [];
        if (this.tags) {
            this.tags.split(",").forEach(entry => {
                if (entry.length > 0) {
                    result.push(entry);
                }
            });
        }
        return result;
    }
}

customElements.define("ui-tag-list", UiTagList);




//
// ui-tag-input
//
class UiTagInput extends LitElement {
    static properties = {
        tags: { type: String, reflect: true },
        disabled: { type: Boolean, reflect: true }
    };

    static styles = [
        sharedStyles,
        css`
            :host {
                display: block;
            }

            input {
                width: 100%;
                box-sizing: border-box;
            }
        `
    ];

    constructor() {
        super();
        this.tags = '';
        this.disabled = false;
    }

    render() {
        return html`
            <input 
                placeholder="tags..." 
                type="text" 
                autocomplete="nope"
                ?disabled=${this.disabled}
                @focusout=${this._onFocusout}
                @keyup=${this._onKeyup}
            >
        `;
    }

    _onFocusout(event) {
        this.parentNode.add(event.currentTarget.value.split(' '));
        event.currentTarget.value = "";
    }

    _onKeyup(event) {
        if (event.keyCode == 13) {
            this.parentNode.add(event.currentTarget.value.split(' '));
            event.currentTarget.value = "";
        }
    }

    updated(changedProperties) {
        if (changedProperties.has('tags')) {
            const tagList = this.shadowRoot.querySelector("ui-tag-list");
            if (tagList) {
                tagList.setAttribute("tags", this.tags);
            }
        }
    }
}

customElements.define("ui-tag-input", UiTagInput);


//
// ui-tag-search
//
class UiTagSearch extends LitElement {
    static styles = [
        sharedStyles,
        css`
            :host {
                display: flex;
                flex-direction: row;
            }

            input {
                flex-grow: 1;
            }
        `
    ];

    constructor() {
        super();
        this.tags = [];
        this.changed = false;
    }

    render() {
        return html`
            <input type="text" placeholder="search tags.." name="search" @focusout=${this._onFocusout} @keyup=${this._onKeyup}>
            <button class="vx-secondary" @click=${this._onButtonClick}><i class="fas fa-sync"></i></button>
        `;
    }

    _onFocusout(event) {
        if (this.changed) {
            this.tags = this._parse(event.currentTarget.value);
            this.changed = false;
            this.dispatchEvent(new CustomEvent('changed', { detail: this.tags }));
        }
    }

    _onKeyup(event) {
        if (event.keyCode == 13) {
            this.tags = this._parse(event.currentTarget.value);
            this.changed = false;
            this.dispatchEvent(new CustomEvent('changed', { detail: this.tags }));
        } else {
            this.changed = true;
        }
    }

    _onButtonClick(event) {
        this.dispatchEvent(new CustomEvent('changed', { detail: this.tags }));
    }

    _parse(string) {
        var tags = string.split(' ');
        var array = [];
        for (var i = 0; i < tags.length; i++) {
            if (tags[i].length > 0) {
                array.push(tags[i].toLowerCase());
            }
        }
        return array;
    }

    clear() {
        let input = this.shadowRoot.querySelector("input");
        input.value = "";
        this.tags = [];
    }
}

customElements.define("ui-tag-search", UiTagSearch);
    



//
// ui-slider
//
class UiSlider extends LitElement {
    static styles = [
        sharedStyles,
        css`
            :host {
                display: flex;
                align-items: center;
            }
            
            :host([horz]) {
                flex-direction: row;
            }

            :host([vert]) {
                flex-direction: column;
            }
            
            .segment:first-of-type { 
                background: #40C4FF;
                overflow: visible;
            }

            .segment:last-of-type { background: var(--border); }
                
            .handle {
                background: var(--primary);
                width: 16px;
                height: 16px;
                cursor: pointer;
                z-index: 9;
                border-radius: 8px;
                overflow: visible;
            }
            
            :host([horz]) { height: 16px; }
            :host([horz]) .segment { height: 2px; } 
            :host([horz]) .segment.slider { flex-direction: row; } 
            :host([horz]) .handle { 
                margin-left: -8px;
                margin-right: -8px;
            }
            
            :host([vert]) { width: 16px; }
            :host([vert]) .segment { width: 2px; } 
            :host([vert]) .segment.slider { flex-direction: column; } 
            :host([vert]) .handle { 
                margin-top: -8px;
                margin-bottom: -8px;
            }
            
            :host > div:nth-of-type(3) { flex-grow: 1 }
        `
    ];

    constructor() {
        super();
        this._handleSize = 12; // px handle size
    }

    render() {
        return html`
            <div class="segment"></div>
            <div class="handle" @mousedown=${this._onMouseDown}></div>
            <div class="segment"></div>
        `;
    }

    firstUpdated() {
        this.orient = this.hasAttribute("horz") ? "horz" : "vert";
        this.range1 = this.shadowRoot.querySelector('.segment:nth-of-type(1)');
        this.handle = this.shadowRoot.querySelector('.handle');
        this.range2 = this.shadowRoot.querySelector('.segment:nth-of-type(2)');
    }

    _onMouseDown(event) {
        this.bounds = this.getBoundingClientRect();
        document.addEventListener('mousemove', this._move);
        document.addEventListener('mouseup', this._up);
        if (this.hasAttribute("mouseout")) {
            document.addEventListener("mouseout", this._out);
        }
    }

    _move = (event) => {
        if (this.orient == "vert") {
            let top = this.bounds.top + 8;
            let bottom = this.bounds.bottom - 8;
            let height = bottom - top;
            
            var position = Math.min(Math.max(top, event.pageY), bottom) - top;
            this.range1.style.height = Math.max(0, position) + "px";
            
            this.dispatchEvent(new CustomEvent('change', {
                bubbles: true,
                composed: true,
                detail: 1.0 - position / height
            }));
        } else {
            let left = this.bounds.left + 8;
            let right = this.bounds.right - 8;
            let width = right - left;
            
            var position = Math.min(Math.max(left, event.pageX), right) - left;
            this.range1.style.width = Math.max(0, position) + "px";
            
            this.dispatchEvent(new CustomEvent('change', {
                bubbles: true,
                composed: true,
                detail: position / width
            }));
        }
    };

    _up = (event) => {
        document.removeEventListener('mousemove', this._move);
        document.removeEventListener('mouseup', this._up);
        if (this.hasAttribute("mouseout")) {
            document.removeEventListener("mouseout", this._out);
        }
    };

    _out = (event) => {
        document.removeEventListener('mousemove', this._move);
        document.removeEventListener('mouseup', this._up);
        if (this.hasAttribute("mouseout")) {
            document.removeEventListener("mouseout", this._out);
        }
    };

    set(value, update) {
        this.bounds = this.getBoundingClientRect();
        if (this.orient == "vert") {
            this.range1.style.height = `${value * 100}%`;
        } else {
            this.range1.style.width = `${value * 100}%`;
        }
    }
}

customElements.define("ui-slider", UiSlider);

    
    
//
// ui-range
//
class UiRange extends LitElement {
    static styles = [
        sharedStyles,
        css`
            :host {
                display: flex;
                align-items: center;
            }
            
            :host([horz]) {
                flex-direction: row;
            }

            :host([vert]) {
                flex-direction: column;
            }
            
            .segment { overflow: visible; }
            .segment.range {
                background: #40C4FF;
                flex-grow: 1;
                position: relative;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .segment:not(.range) { background: var(--border); }
            
            .handle {
                background: var(--primary);
                width: 16px;
                height: 16px;
                border-radius: 8px;
                cursor: pointer;
                z-index: 9;
                overflow: visible;
            }
            
            :host([horz]) { height: 1em; }
            :host([horz]) .segment.range { flex-direction: row; } 
            :host([horz]) .segment { height: 2px; } 
            
            :host([vert]) { width: 1em; }
            :host([vert]) .segment { width: 2px; } 
            :host([vert]) .segment.range { flex-direction: column; }
        `
    ];

    constructor() {
        super();
        this._minVal = 0;
        this._maxVal = 1;
        this.SIZE = 16; // px handle size
    }

    render() {
        return html`
            <div class="segment"></div>
            <div class="segment range">
                <div class="handle A" @mousedown=${this._onMouseDownA}></div>
                <div class="handle B" @mousedown=${this._onMouseDownB}></div>
            </div>
            <div class="segment"></div>
        `;
    }

    firstUpdated() {
        this.range1 = this.shadowRoot.querySelector('.segment:nth-of-type(1)');
        this.range2 = this.shadowRoot.querySelector('.segment:nth-of-type(2)');
        this.range3 = this.shadowRoot.querySelector('.segment:nth-of-type(3)');
        this.handleA = this.shadowRoot.querySelector('.handle.A');
        this.handleB = this.shadowRoot.querySelector('.handle.B');
    }

    _onMouseDownA(event) {
        this.bounds = this.getBoundingClientRect();
        this.boundsMax = this.handleB.getBoundingClientRect();
        document.addEventListener('mousemove', this._moveA);
        document.addEventListener('mouseup', this._upA);
        if (this.hasAttribute("strict")) {
            this.addEventListener('mouseleave', this._upA);
        }
    }

    _moveA = (event) => {
        if (this.hasAttribute("horz")) {
            let pos = Math.min(Math.max(this.bounds.left, event.pageX), this.boundsMax.left - this.SIZE) - this.bounds.left;
            this.range1.style.width = pos + "px";
            this._minVal = pos / (this.bounds.width - 2 * this.SIZE);
            this.dispatchEvent(new CustomEvent('change', { detail: { min: this._minVal, max: this._maxVal } }));
        } else {
            let pos = Math.min(Math.max(this.bounds.top, event.pageY), this.boundsMax.top - this.SIZE) - this.bounds.top;
            this.range1.style.height = pos + "px";
            this._minVal = pos / (this.bounds.height - 2 * this.SIZE);
            this.dispatchEvent(new CustomEvent('change', { detail: { min: 1 - this._maxVal, max: 1 - this._minVal } }));
        }
    };

    _upA = (event) => {
        document.removeEventListener('mousemove', this._moveA);
        document.removeEventListener('mouseup', this._upA);
        if (this.hasAttribute("strict")) {
            this.removeEventListener('mouseleave', this._upA);
        }
    };

    _onMouseDownB(event) {
        this.bounds = this.getBoundingClientRect();
        this.boundsMin = this.handleA.getBoundingClientRect();
        document.addEventListener('mousemove', this._moveB);
        document.addEventListener('mouseup', this._upB);
        if (this.hasAttribute("strict")) {
            this.addEventListener('mouseleave', this._upB);
        }
    }

    _moveB = (event) => {
        if (this.hasAttribute("horz")) {
            let pos = Math.max(Math.min(this.bounds.right, event.pageX), this.boundsMin.right + this.SIZE) - this.bounds.left;
            this.range3.style.width = (this.bounds.width - pos) + "px";
            this._maxVal = (pos - 2 * this.SIZE) / (this.bounds.width - 2 * this.SIZE);
            this.dispatchEvent(new CustomEvent('change', { detail: { min: this._minVal, max: this._maxVal } }));
        } else {
            let pos = Math.max(Math.min(this.bounds.bottom, event.pageY), this.boundsMin.bottom + this.SIZE) - this.bounds.top;
            this.range3.style.height = (this.bounds.height - pos) + "px";
            this._maxVal = (pos - 2 * this.SIZE) / (this.bounds.height - 2 * this.SIZE);
            this.dispatchEvent(new CustomEvent('change', { detail: { min: 1 - this._maxVal, max: 1 - this._minVal } }));
        }
    };

    _upB = (event) => {
        document.removeEventListener('mousemove', this._moveB);
        document.removeEventListener('mouseup', this._upB);
        if (this.hasAttribute("strict")) {
            this.removeEventListener('mouseleave', this._upB);
        }
    };

    set(min, max, update) {
        this.bounds = this.getBoundingClientRect();

        if (this.hasAttribute("horz")) {
            let width = this.bounds.width - 2 * this.SIZE;
            this.range1.style.width = width * min + "px";
            this.range3.style.width = width * (1.0 - max) + "px";
            this._minVal = min;
            this._maxVal = max;
        } else {
            let height = this.bounds.height - 2 * this.SIZE;
            this.range1.style.height = height * (1.0 - max) + "px";
            this.range3.style.height = height * min + "px";
            this._minVal = 1 - max;
            this._maxVal = 1 - min;
        }
        if (update) {
            this.dispatchEvent(new CustomEvent('change', { detail: { min, max } }));
        }
    }
}

customElements.define("ui-range", UiRange);
    


//
// ui-popup
//
class UiPopup extends LitElement {
    static properties = {
        hidden: { type: Boolean, reflect: true },
        manual: { type: Boolean, reflect: true }
    };

    static styles = [
        sharedStyles,
        css`
            :host {
                position: fixed;
                background: var(--ui-popup-bg, white);
                z-index: 9999;
            }
        `
    ];

    constructor() {
        super();
        this.hidden = true;
        this.manual = false;
    }

    render() {
        return html`<slot></slot>`;
    }

    firstUpdated() {
        if (!this.manual) {
            this.addEventListener("mouseleave", event => {
                this.dispatchEvent(new CustomEvent("close"));
                this.hidden = true;
            });
        }
    }

    open(x, y) {
        this.style.left = `${x}px`;
        this.style.top = `${y}px`;
        this.hidden = false;
    }
    
    openAt(u, v, dom) {
        let box = dom.getBoundingClientRect();
        
        if (u == "left") {
            this.style.left = `${box.left}px`;
        }
        if (v == "bottom") {
            this.style.top = `${box.bottom}px`;
        }
        
        this.hidden = false;
    }
    
    close() {
        this.hidden = true;
    }
}

customElements.define("ui-popup", UiPopup);


//
// ui-modal
//
class UiModal extends LitElement {
    static properties = {
        hidden: { type: Boolean, reflect: true },
        close: { type: Boolean, reflect: true },
        local: { type: Boolean, reflect: true }
    };

    static styles = [
        sharedStyles,
        css`
            :host {
                position: fixed;
                left: 0;
                top: 0;
                right: 0;
                bottom: 0;
                background-color: var(--ui-modal-overlay, rgba(0,0,0,.5));
                pointer-events: auto;
                opacity: 1;
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 99;
            }
            
            :host([local]) { position: absolute; }
            
            div {
                position: relative;
                padding: 2.1em 2.1em 2.1em 2.1em;
                border: none;
                background: #ffffff;
                opacity: 1.0;
                overflow: hidden;
                box-sizing: border-box;
                box-shadow: 0 9px 46px 8px rgba(0,0,0,.14), 0 11px 15px -7px rgba(0,0,0,.12), 0 24px 38px 3px rgba(0,0,0,.2);
            }
            
            button {
                position: absolute;
                top: 0.5em;
                right: 0.5em;
            }
            
            :host(:not([close])) button { display: none; }
        `
    ];

    constructor() {
        super();
        this.hidden = true;
        this.close = false;
        this.local = false;
    }

    render() {
        return html`
            <div>
                <button class="vx-round vx-secondary" @click=${this._onClose}>
                    <i class="fas fa-times-circle"></i>
                </button>
                <slot></slot>
            </div>
        `;
    }

    _onClose(event) {
        this.hidden = true;
        this.dispatchEvent(new CustomEvent("close"));
    }

    updated(changedProperties) {
        if (changedProperties.has('hidden')) {
            if (this.hidden) {
                this.dispatchEvent(new CustomEvent("close"));
            } else {
                this.dispatchEvent(new CustomEvent("open"));
            }
        }
    }
}

customElements.define("ui-modal", UiModal);




//
// ui-tooltip
//
class UiTooltip extends LitElement {
    static properties = {
        hidden: { type: Boolean, reflect: true }
    };

    static styles = [
        sharedStyles,
        css`
            :host {
                position: fixed;
                color: var(--ui-tooltip-color, white);
                background: var(--ui-tooltip-bg, black);
                font-size: var(--ui-tooltip-font-size, 1em);
                z-index: 99;
            }
            
            i {
                margin-right: 0.5em;
            }
            
            ::slotted(*) {
                font-size: 1em;
            }
        `
    ];

    constructor() {
        super();
        this.hidden = true;
        this.timer = null;
    }

    render() {
        return html`
            <div>
                <slot></slot>
            </div>
        `;
    }

    connectedCallback() {
        super.connectedCallback();
        
        this._scrollEvent = (event) => {
            if (this.timer) {
                clearTimeout(this.timer);
            }
            document.removeEventListener('scroll', this._scrollEvent);
            this.hidden = true;
        };

        this.parentElement.addEventListener("mouseenter", event => {
            if (this.timer) {
                clearTimeout(this.timer);
            }

            this.timer = setTimeout(() => {
                let rect = this.parentElement.getBoundingClientRect();
                
                if (window.innerWidth - rect.right < 100) {
                    this.style.right = `${window.innerWidth - rect.right + 8}px`;
                    this.style.removeProperty("left");
                } else {
                    this.style.left = `${rect.left}px`;
                    this.style.removeProperty("right");
                }
                
                if (rect.bottom > window.innerHeight / 2) {
                    this.style.bottom = `${window.innerHeight - rect.top + 8}px`;
                    this.style.removeProperty("top");
                } else {
                    this.style.top = `${rect.bottom + 8}px`;
                    this.style.removeProperty("bottom");
                }

                document.addEventListener('scroll', this._scrollEvent);
                this.hidden = false;
                this.timer = null;
            }, 700);
        });
        
        this.parentElement.addEventListener("mouseleave", event => {
            if (this.timer) {
                clearTimeout(this.timer);
            }
            document.removeEventListener('scroll', this._scrollEvent);
            this.hidden = true;
        });
    }
}

customElements.define("ui-tooltip", UiTooltip);

//
// ui-password
//
class UiPassword extends LitElement {
    static properties = {
        password: { type: String, reflect: true }
    };

    static styles = [
        sharedStyles,
        css`
            :host {
                position: absolute;
                left: 0;
                top: 0;
                right: 0;
                bottom: 0;
                background: var(--ui-password-bg, white);
                z-index: 1030;
                align-items: center;
                display: flex;
            }

            button { 
                font-size: 1.25rem; 
                width: 100%;
                margin-top: 20px;
                padding: 0 40px;
                line-height: 53px;
            }
                    
            input { 
                font-size: 1.25rem; 
                width: 100%;
                padding: 0 10px;
                height: 55px;
                margin: 0;
                background: #fff;
                color: #666;
                border: 1px solid #e5e5e5;
                box-sizing: border-box;
                font: inherit;
            }

            h3 { 
                text-align: center !important;
                font-size: 1.5rem;
                line-height: 1.4;
            }
        `
    ];

    constructor() {
        super();
        this.password = '';
    }

    render() {
        return html`
            <ui-modal>
                <h3>Password Required</h3>
                <input type="password" @keyup=${this._onKeyup}>
                <button @click=${this._validate}>Verify</button>
            </ui-modal>
        `;
    }

    _onKeyup(event) {
        if (event.keyCode == 13) {
            this._validate();
        }
    }

    _validate() {
        var passwordHash = CryptoJS.MD5(this.shadowRoot.querySelector("input").value);
        if (passwordHash.toString() === this.password) {
            this.remove();
            this.dispatchEvent(new CustomEvent("verified"));
        }
    }
}

customElements.define("ui-password", UiPassword);




//
// ui-section
//
class UiSection extends LitElement {
    static properties = {
        label: { type: String, reflect: true }
    };

    static styles = [
        sharedStyles,
        css`
            :host {
                position: relative;
                display: flex;
                flex-direction: column;
                overflow-y: hidden;
                box-sizing: border-box;
            }
            span {
                background-color: var(--hover);
                color: var(--primary);
                padding: 0.3em 0.3em 0.3em 0.3em;
            }
        `
    ];

    constructor() {
        super();
        this.label = '';
    }

    render() {
        return html`
            <span>${this.label}</span>
            <slot></slot>
        `;
    }
}

customElements.define("ui-section", UiSection);







