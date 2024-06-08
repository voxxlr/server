//
//ui-panel
//

(function() {

    const template = document.createElement('template');

    template.innerHTML = `

        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css" >
        <link rel="stylesheet" href="${window.app_domain}/ui.css">

        <style>

            :host
            {
                position: relative;
                border: 1px solid var(--border);
                padding: 1.4em 1em 1em 1em;
                margin-top: 1em;
                box-sizing: border-box;
            }
        
            span 
            { 
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

            :host-context([important])  { border-color: var(--important); }
            :host-context([active])  { border-color: var(--active); }
            slot
            {
                position: relative;
                overflow: hidden;
            }

        </style>
        
        <span></span>
        <slot></slot>
        `;


    class UiPanel extends HTMLElement 
    {
        static get observedAttributes() 
        {
            return ['name'];
        }
        
        constructor() 
        {
            super();
                
            this.dom = this.attachShadow({mode: 'open'});
            this.dom.appendChild(template.content.cloneNode(true));
        }
        
        attributeChangedCallback(name, oldValue, newValue)
        {	
            if (name === "name")
            {
                this.dom.querySelector("span").textContent = newValue;
            }
        }
    }

    customElements.define("ui-panel", UiPanel);
})();
    
//
//ui-option
//
(function() {

    const template = document.createElement('template');

    template.innerHTML = `

        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css" >
        <link rel="stylesheet" href="${window.app_domain}/ui.css">

        <style>

            :host
            {
                display: block;
                border: 1px solid var(--border);
            }

            :host(:hover) { background-color: var(--hover) }
            :host([active]) { background-color: var(--selected) }

            div { padding: 0.2em 1.0em 0.2em 1.0em; }
            
            i 
            { 
                color: var(--primary);
                cursor: pointer;
                float: right; 
            }
            :host(:not([deletable])) i { display: none }
            
        </style>

        <div><slot></slot><i class="fas fa-times"></i></div>
        `;


    class UiOption extends HTMLElement 
    {
        constructor() 
        {
            super();
                
            this.dom = this.attachShadow({mode: 'open'});
            this.dom.appendChild(template.content.cloneNode(true));
            
            // attach to shadow dom root ? 
            this.dom.querySelector("div").addEventListener("click", (event) =>
            {
                if (event.target.tagName == "I")
                {
                    this.dispatchEvent(new CustomEvent('option-delete', { bubbles: true, detail: this }));
                }
                else
                {
                    this.dispatchEvent(new CustomEvent('option-click', { bubbles: true, detail: this }));
                }
            });
        }
    }

    customElements.define("ui-option", UiOption);

})();


//
//ui-dropdown
//
(function() {

    const template = document.createElement('template');
    
    template.innerHTML = `
    
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css" >
        <link rel="stylesheet" href="${window.app_domain}/ui.css">
    
        <style>
        
            :host
            {
                position: relative;
                display: flex;
            }
            
            button { border-top-right-radius: 4px; }
            
            button:before 
            {
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

            main
            {
                position:absolute;
                width: 100%;
                z-index: 17;
                background-color: white;
                flex-direction: column;
                align-items: stretch;
            }

            :host([open]) main { display: flex; }
            :host(:not([open])) main { display: none; }


        </style>
        
        <div>
            <slot name="selected">
            </slot>
            <main>
                <slot>
                </slot>
            </main>
        </div>
        <button class="vx-secondary"></button>
    `;
    
    
    class UiDropdown extends HTMLElement 
    {
        constructor() 
        {
            super();

            this.dom = this.attachShadow({mode: 'open'});
            this.dom.appendChild(template.content.cloneNode(true));

            this.dom.querySelector("button").addEventListener("click", event => 
            {
                if (this.toggleAttribute("open"))
                {
                    this.dispatchEvent(new CustomEvent('open', { bubbles: true }));
                }
                else
                {
                    this.dispatchEvent(new CustomEvent('close', { bubbles: true }));
                }
            });

            this.dom.addEventListener('slotchange', event => 
            {
                event.target.assignedElements().forEach(node =>
                {
                    if (!node["ui-dropdown"])
                    {
                        if (node.hasAttribute("active"))
                        {
                            node.setAttribute("slot", "selected");
                        }

                        node.addEventListener("click", event => 
                        {
                            if (this.dom.host.toggleAttribute("open"))
                            {
                                this.dispatchEvent(new CustomEvent('open', { bubbles: true }));
                            }
                            else
                            {
                                let list = this.dom.querySelector("div > slot").assignedElements();
                                if (list.length > 0)
                                {
                                    list[0].removeAttribute("active");
                                    list[0].removeAttribute("slot");
                                }
                                node.setAttribute("slot", "selected");
                                node.toggleAttribute("active", true);

                                this.dispatchEvent(new CustomEvent('close', { bubbles: true }));
                            }
                        });

                        node["ui-dropdown"] = true;
                    };
                });
            });		
        }

        getActive()
        {
            let list = this.dom.querySelector("div > slot").assignedElements();
            if (list.length > 0)
            {
                return list[0]
            }
            return null;
        }
    }
    
    customElements.define("ui-dropdown", UiDropdown);
    
})();
    
//
// ui-checkbox
//
(function() {

    const template = document.createElement('template');
    
    template.innerHTML = `
    
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css" >
        <link rel="stylesheet" href="${window.app_domain}/ui.css">
    
        <style>
        
            :host
            {
                display: inline-block;
                height: inherit;
                width: inherit;
                font-size: inherit;
                border: 2px solid var(--primary);
                border-radius: 4px;
                line-height: 1;
            }
    
            input 
            {
                font-size: inherit;
                min-height: 1em;
                min-width: 1em;
                height: 100%;
                width: 100%;
                appearance: none;
                outline: none;
                transition-duration: 0.3s;
                cursor: pointer;
                margin: 0;
                background-clip: content-box;
            }
    
            input:checked:after
            {
                font-family: "Font Awesome 5 Free" !important;
                font-weight: 900;
                content: "\\f00c";
                font-size: 0.7em;
                margin-left: 0.15em;
                margin-top: 0.28em;
                color: var(--primary);
                position: absolute;
            }
                    
        </style>
        
        <input type="checkbox" />
            
        `;
    
    class UiCheckbox extends HTMLElement 
    {
        static get observedAttributes() 
        {
            return ['checked'];
        }
        
        constructor() 
        {
            super();
            
            this.dom = this.attachShadow({mode: 'open'});
            this.dom.appendChild(template.content.cloneNode(true));
            
            this.dom.querySelector("input").addEventListener("change", event=>
            {
                this.toggleAttribute("checked", event.currentTarget.checked);	
                this.dispatchEvent(new CustomEvent(event.type, event));
            });
        }
        
        
        attributeChangedCallback(name, oldValue, newValue)
        {
            this.dom.querySelector("input").checked = newValue != null && newValue != "false";
        } 
    
    }
    
    customElements.define("ui-checkbox", UiCheckbox);
    
})();



//
// ui-collapsible
//
(function() {

    const template = document.createElement('template');
    
    template.innerHTML = `
    
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css" >
        <link rel="stylesheet" href="${window.app_domain}/ui.css">
    
        <style>
        
            :host
            {
                position: relative;
                display: flex;
                flex-direction: column;
                justify-content: stretch;
                width: 100%;
                box-sizing: border-box;
                border: 1px solid var(--border);
            }
                        
            :host([selected]) { border: 2px solid var(--primary) }

            header 
            {
                display: flex;
                align-items: center;
                padding: 0.2em 0.3em;
                text-align: left;
            }
            
            :host([open]) header 
            {
                background-color: var(--panel-header);
                box-shadow: inset 0 -1px 0 rgb(0 0 0 / 13%);
            }
            
            :host(:not([open])) header  { background-color: white; }
        
            i 
            {     
                cursor: pointer; 
                color: var(--primary);
                margin-left: 0.5em;
                padding: 0.3em;
            }
            
            i:after 
            {
                font-family: "Font Awesome 5 Free";
                font-weight: 900;
                color: var(--primary);
                display: inline-block;
                vertical-align: middle;
                float: right;
            }
            :host([open]) i:after { content: "\\f107"; }
            :host(:not([open])) i:after { content: "\\f106"; }
    
            main 
            { 
                overflow: hidden;
                transition: max-height 0.25s;
            }
            
            :host([open]) main  { max-height: 50em; }
            :host(:not([open])) main { max-height:0; }
            
            ::slotted([slot=header])  { flex: 1 }

        </style>

        <header>
            <slot name="header"></slot>
            <i class="fas opener"></i>
        </header>

        <main>
            <slot></slot>
        </main>
    `;
    
    
    class UiCollapsible extends HTMLElement 
    {
        static get observedAttributes() 
        {
            return ['label', 'open', 'selected'];
        }
        
        constructor() 
        {
            super();
                
            this.dom = this.attachShadow({mode: 'open'});
            this.dom.appendChild(template.content.cloneNode(true));
                        
            this.dom.querySelector("header").addEventListener("click", event=>
            {
                this.dispatchEvent(new CustomEvent('header-click', { bubbles: true }));
            });

            this.dom.querySelector("i").addEventListener("click", event =>
            {
                this.dispatchEvent(new CustomEvent('button-click', { bubbles: true }));
                event.stopPropagation();
                event.preventDefault();	
            });		
        }
    }
    
    customElements.define("ui-collapsible", UiCollapsible);
    
})();
    


//
// ui-collapsible-list
//
(function() {

    const template = document.createElement('template');
    
    template.innerHTML = `
    
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css" >
        <link rel="stylesheet" href="${window.app_domain}/ui.css">
    
        <style>
        
            :host
            {
            }
                                    
        </style>
        
        <slot></slot>
        `;
    
    
    class UiCollapsibleList extends HTMLElement 
    {
        constructor() 
        {
            super();
                
            this.dom = this.attachShadow({mode: 'open'});
            this.dom.appendChild(template.content.cloneNode(true));

            this.dom.addEventListener("header-click", event => 
            { 
                if (this.hasAttribute("selectable"))
                {
                    let open = this._getselected();
                    if (open)
                    {
                        this._select(open, false);
                    }
                    this._select(event.target, !event.target.hasAttribute("selected"));
                }
                else
                {
                    let open = this._getopen();
                    if (open)
                    {
                        this._open(open, false)
                    }
                    if (event.target != open)
                    {
                        this._open(event.target, true);
                    }
                }
            });

            this.dom.addEventListener('button-click', event =>
            {
                let open = this._getopen();
                if (open)
                {
                    this._open(open, false)
                }
                if (event.target != open)
                {
                    this._open(event.target, true);
                }
            });
        }

        open(collapsible)
        {
            let open = this._getopen();
            if (open && open != collapsible)
            {
                open.toggleAttribute("open", false);
            }
            collapsible.toggleAttribute("open", true);
            return open != collapsible;
        }

        close(collapsible)
        {
            collapsible.toggleAttribute("open", false);
        }

        select(collapsible)
        {
            let selected = this._getselected();
            if (selected && selected != collapsible)
            {
                selected.toggleAttribute("selected", false);
            }
            collapsible.toggleAttribute("selected", true);
            return selected != collapsible;

        }

        unselect(collapsible)
        {
            collapsible.toggleAttribute("selected", false);
        }


        _open(collapsible, state)
        {
            collapsible.toggleAttribute("open", state);
            collapsible.dispatchEvent(new CustomEvent(state ? 'open': 'close', { bubbles: true }));
        }

        _getopen()
        {
            let slot = this.dom.querySelector("slot");
            return slot.assignedElements().find(node => node.hasAttribute("open"));
        }

        _select(collapsible, state)
        {
            collapsible.toggleAttribute("selected", state);
            collapsible.dispatchEvent(new CustomEvent(state ? 'select': 'unselect', { bubbles: true }));
        }

        _getselected()
        {
            let slot = this.dom.querySelector("slot");
            return slot.assignedElements().find(node => node.hasAttribute("selected"));
        }
    }
    
    customElements.define("ui-collapsible-list", UiCollapsibleList);
    
})();
    



//
// ui-selection-list
//

(function() {

    const template = document.createElement('template');
    
    template.innerHTML = `
    
        <link rel="stylesheet" href="${window.app_domain}/ui.css">
    
        <style>
        
            :host {  display: flex; }
    
        </style>
    
        <slot></slot>
        
        `;
    
    
    class UiSelectionList extends HTMLElement 
    {
        constructor() 
        {
            super();
                
            this.dom = this.attachShadow({mode: 'open'});
            this.dom.appendChild(template.content.cloneNode(true));
            
            this.buttons = this.dom.querySelector("slot").addEventListener("click", event=>
            {
                let target = event.target;
                while (target.parentElement != this)
                {
                    target = target.parentElement;
                }
        
                this.select(target, true);
            });
        }
        
        
        select(target, notify)
        {
            target = target instanceof HTMLElement ? target : this.host.querySelector(target);

            let items = this.dom.querySelector("slot").assignedElements();
            items.forEach(item =>
            {
                if (item != target)
                {
                    if (item.hasAttribute("active"))
                    {
                        if (this.hasAttribute("single"))
                        {
                            item.toggleAttribute("active");
                            if (notify)
                            {
                                this.dispatchEvent(new CustomEvent("up", { detail: item } ));
                            }
                        }
                    }
                }
                else 
                {
                    if (item.hasAttribute("active"))
                    {
                        if (!this.hasAttribute("required"))
                        {
                            item.toggleAttribute("active");
                            if (notify)
                            {
                                this.dispatchEvent(new CustomEvent("up", { detail: item } ));
                            }
                        }
                    }
                    else
                    {
                        item.toggleAttribute("active");
    
                        if (notify)
                        {
                            this.dispatchEvent(new CustomEvent("down", { detail: item } ));
                        }
                    }
                }
            })
            this.dispatchEvent(new CustomEvent("change"));
        }
    }
    
    customElements.define("ui-selection-list", UiSelectionList);
    
})();


//
// ui-tab-list
//

(function() {
    
    const template = document.createElement('template');
    
    template.innerHTML = `
    
        <style>
        
            :host
            {
                display: flex;
                flex-direction: column;
            }

            header { display:flex; }
            main 
            {  
                flex: 1;  
                overflow: auto;
                position: relative; 
            }
    
            ::slotted([slot=content]:not([active])) { display: none !important;  }
            ::slotted([slot=content]) { height: 100%;  }
          
        </style>
        
        <header>
            <slot name="header"></slot>
            <slot></slot>
        </header>
        <main>
            <slot name="content"></slot>
        </main>
    `;
    
    class UiTabList extends HTMLElement 
    {
        constructor() 
        {
            super();
            
            this.dom = this.attachShadow({mode: 'open'});
            this.dom.appendChild(template.content.cloneNode(true));

            this.content = this.dom.querySelector("slot[name=content]");

            this.header = this.dom.querySelector("slot[name=header]");
            this.header.addEventListener("click", event=>
            {
                this.header.assignedNodes().forEach((node,index) =>
                {
                    if (node != event.target)
                    {
                        if (node.hasAttribute("active"))
                        {
                            node.removeAttribute("active");
                            this.content.assignedElements()[index].toggleAttribute("active", false);
                            node.dispatchEvent(new CustomEvent("change", { detail: false, bubbles: true } ));
                        }
                    }
                    else
                    {
                        event.target.toggleAttribute("active", true);
                        this.content.assignedElements()[index].toggleAttribute("active", true);
                        event.target.dispatchEvent(new CustomEvent("change", { detail: true, bubbles: true } ));
                    }
                });
            })
        }
    }
    
    customElements.define("ui-tab-list", UiTabList);
    
})();
    

//
// ui-stack
//

(function() {
    
const template = document.createElement('template');

template.innerHTML = `

    <style>
    
        :host
        {
            position: relative;
            overflow: hidden;
        }

        ::slotted(:not([active])) { display: none !important;  }
 
    </style>

    <slot></slot>	
        
    `;

class UiStack extends HTMLElement 
{
    static get observedAttributes() 
    {
        return ['top'];
    }
    
    constructor() 
    {
        super();
        
        this.dom = this.attachShadow({mode: 'open'});
        this.dom.appendChild(template.content.cloneNode(true));
        
        this.stack = this.dom.querySelector("slot");
    }
        
    show(element)
    {
        let top = element instanceof HTMLElement ? element :  typeof element == "string" ? this.querySelector(element) : null;
        this.stack.assignedElements().forEach(node =>
        {
            node.toggleAttribute("active", top === node);
        });
    }
}

customElements.define("ui-stack", UiStack);

})();


//
// ui-toggle
//
(function() {

const template = document.createElement('template');

template.innerHTML = `

    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css" >
    <link rel="stylesheet" href="${window.app_domain}/ui.css">

    <style>
    
        :host
        {
            position: relative;
            display: block;
        }

        :host(:hover)  div { background: var(--hover); }

        main
        {
            overflow: hidden;
            height: 100%;
            width: 100%;
        }

        aside 
        {
            position: absolute;
            overflow: hidden;
            height: 4em;
            width: 4em;
        }

        :host([right]) aside, :host([left]) aside  {  top: calc(50% - 2em);  }
        :host([top]) aside, :host([bottom]) aside  {  left: calc(50% - 2em);  }

        aside div 
        {
            position: relative;
            overflow: hidden;
            width: 4em;
            height: 4em;
            background: var(--border);
            transform: rotate(-45deg);
            border-radius: 0.8em;
        }

        aside i
        {
            position: relative;
            color: var(--primary);
        }
        
        i:before
        {
            font-family: "Font Awesome 5 Free" !important;
            font-weight: 900;
            content: "\\f057";
        }


        :host([right]) aside { left: -4em; }
        :host([left]) aside { right: -4em; }
        :host([bottom]) aside { bottom: -4em; }
        :host([top]) aside { top: -4em; }

        :host([left]) div { right: 2.8em; }
        :host([left])  i { left: 0.2em; }
        :host([right]) div { left: 2.8em; }
        :host([right])  i { left: 2.8em; }
        
        :host([left]) i, :host([right]) i { top: -2.5em; }

        :host([top]) div { bottom: -2.8em; }
        :host([bottom]) div { top: -2.8em; }
        :host([top])  i { bottom: 1.3em; }
        :host([bottom])  i { top: -3.7em; } 

        :host([top]) i, :host([bottom]) i { left: 1.5em; }
    
        :host-context([close]) i:before
        {
            font-family: "Font Awesome 5 Free" !important;
            font-weight: 900;
            content: "\\f141";
        }        

    </style>
    
    <aside>
        <div></div>
        <i class="fas"></i>
    </aside>
    <main>
        <slot></slot>
    </main>
        
    `;

class UiToggle extends HTMLElement 
{
    constructor() 
    {
        super();
        
        this.dom = this.attachShadow({mode: 'open'});
        this.dom.appendChild(template.content.cloneNode(true));
        
        this.dom.querySelector("aside").addEventListener("click", event =>
        {
            if (this.hasAttribute("open"))
            {
                this.toggleAttribute("open", false);
                this.toggleAttribute("close", true);
                this.dispatchEvent(new CustomEvent('toggle', { bubbles: true, detail: "close" }));
                event.stopPropagation();
            }	
            else
            {
                this.toggleAttribute("open", true);
                this.toggleAttribute("close", false);
                this.dispatchEvent(new CustomEvent('toggle', { bubbles: true, detail: "open" }));
                event.stopPropagation();
            }
        });
    }
    
    close()
    {
        if (this.hasAttribute("open"))
        {
            this.dom.dispatchEvent(new CustomEvent("click", { bubbles: false }));
        }
    }
    
    open()
    {
        if (this.hasAttribute("close"))
        {
            this.dom.dispatchEvent(new CustomEvent("click", { bubbles: false }));
        }
    }
}

customElements.define("ui-toggle", UiToggle);

})();
    


//
// ui-taglist
//
   
(function() {

const template = document.createElement('template');

template.innerHTML = `

    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css" >
    <link rel="stylesheet" href="${window.app_domain}/ui.css">

    <style>
    
        :host
        {
            display: inline-flex;		
            align-items: center;
            border: 1px solid var(--border);
            border-radius: 0.5em;
            color: var(--primary);
            background: var(--panel-header);
            box-sizing: border-box;
            font-size: 0.8em;
            line-height: 0.8em;
        }
        
        span 
        { 
            display: inline-block;
            margin: 0.1em 0.2em 0.1em 0.3em;
        }
        
        i 
        { 
            cursor: pointer;
            float: right; 
            margin: 0.2em 0.2em 0.2em 0.2em;
        }
        
        :host-context([disabled]) i { visibility: hidden; }
        
    </style>
        
    <span><slot></slot></span><i class="fas fa-times-circle"></i>
    `;

class UiTag extends HTMLElement 
{
    constructor() 
    {
        super();
        
        this.dom = this.attachShadow({mode: 'open'});
        this.dom.appendChild(template.content.cloneNode(true));
        
        this.dom.querySelector("i").addEventListener("click", event =>
        {
            this.dispatchEvent(new CustomEvent('tag-delete', { bubbles: true, detail: this }));
        });
    }
}

customElements.define("ui-tag", UiTag);

})();



(function() {

const template = document.createElement('template');

template.innerHTML = `

    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css" >
    <link rel="stylesheet" href="${window.app_domain}/ui.css">

    <style>
    
        :host
        {
        }
        
        :host > ui-tag:not(:nth-of-type(1)) { margin-left: 0.2em; }
        
    </style>
            
    <slot></slot>

    `;

class UiTagList extends HTMLElement 
{
    static get observedAttributes() 
    {
        return ['tags'];
    }
    
    constructor() 
    {
        super();
        
        this.dom = this.attachShadow({mode: 'open'});
        this.dom.appendChild(template.content.cloneNode(true));
        this.dom.addEventListener("tag-delete", event =>
        {
            let tags = this.getAttribute("tags").split(",");
            tags.splice(tags.indexOf(event.target.textContent),1);
            if (tags.length)
            {
                this.setAttribute("tags", tags.join(","));
            }
            else
            {
                this.removeAttribute("tags");
            }
            
            this.dispatchEvent(new CustomEvent('tag-delete', { bubbles: true, detail: event.target }));
            this.dispatchEvent(new CustomEvent('tags-changed', { bubbles: true, detail: tags }));			
        });
    }

    attributeChangedCallback(name, oldValue, newValue)
    {
        if (name == "tags")
        {
            let newTags = newValue ? newValue.split(",") : [];
            let oldTags = oldValue ? oldValue.split(",") : [];
            
            this.dom.querySelectorAll("ui-tag").forEach(tag =>
            {
                if (!newTags.includes(tag.textContent))
                {
                    tag.remove();
                    oldTags.splice(oldTags.indexOf(tag.textContent),1);
                } 
            });
        
            newTags.forEach((newTag, index, object) =>
            {
                if (newTag.length > 0)
                {
                    if (!oldTags.includes(newTag))
                    {
                        let tag = document.createElement("ui-tag");
                        tag.textContent = newTag;
                        this.dom.appendChild(tag);
                        oldTags.push(newTag);
                    }
                }
            });
        }
    } 
    
    add(newTags)
    {
        for (var i=0; i<newTags.length; i++)
        {
            newTags[i] = newTags[i].toLowerCase();
        }
        newTags = newTags.filter(tag => { return tag !== "" });
        
        if (newTags.length)
        {
            let oldTags = [];
            if (this.hasAttribute("tags"))
            {
                let string = this.getAttribute("tags");
                if (string.length > 0)
                {
                    oldTags = string.split(",");			
                }
            }
            let tags = newTags.concat(oldTags);
            this.setAttribute("tags", `${tags.join(",")}`);
            this.dispatchEvent(new CustomEvent('tags-changed', { bubbles: true, detail: this.getAttribute("tags").split(",") }));
        }
    }
    
    get()
    {
        let result = [];
        if (this.hasAttribute("tags"))
        {
            this.getAttribute("tags").split(",").forEach(entry =>
            {
                if (entry.length > 0)
                {
                    result.push(entry);
                }
            });
        }
            
        return result;
    }
    
}

customElements.define("ui-tag-list", UiTagList);

})();




(function() {

const template = document.createElement('template');

template.innerHTML = `

    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css" >
    <link rel="stylesheet" href="${window.app_domain}/ui.css">

    <style>
        
        input 
        {
            width: 100%;
            box-sizing:border-box
        }
        
    </style>
    
        <input placeholder="tags..." type="text" autocomplete="nope">
    `;

class UiTagInput extends HTMLElement 
{
    static get observedAttributes() 
    {
        return ['tags'];
    }
    
    constructor() 
    {
        super();
        
        this.dom = this.attachShadow({mode: 'open'});
        this.dom.appendChild(template.content.cloneNode(true));
    
        let input = this.dom.querySelector("input");
        input.addEventListener('focusout', event =>
        {
            this.dom.host.parentNode.add(event.currentTarget.value.split(' '));
            event.currentTarget.value = "";	
        });
        input.addEventListener('keyup', event =>
        {
            if (event.keyCode == 13) 
            {
                this.dom.host.parentNode.add(event.currentTarget.value.split(' '));
                event.currentTarget.value = "";	
            }
        });
    }

    attributeChangedCallback(name, oldValue, newValue)
    {
        if (name == "tags")
        {
            this.dom.querySelector("ui-tag-list").setAttribute("tags", newValue);
        }
        else if (name == "disabled")
        {
            let input = this.dom.querySelector("input");
            input.toggleAttribute("disabled", newValue != null);
        }
    } 
}

customElements.define("ui-tag-input", UiTagInput);

})();



(function() {

    const template = document.createElement('template');
    
    template.innerHTML = `
    
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css" >
        <link rel="stylesheet" href="${window.app_domain}/ui.css">
    
        <style>
        
            :host
            {
                display: flex;
                flex-direction: row;
            }
    
            input 
            {
                flex-grow: 1;
            }
            
        </style>
        
        <input type="text" placeholder="search tags.." name="search">
        <button class="vx-secondary"><i class="fas fa-sync"></i></button>
            
        `;
    
    class UiSearch extends HTMLElement 
    {
        constructor() 
        {
            super();
            
            this.dom = this.attachShadow({mode: 'open'});
            this.dom.appendChild(template.content.cloneNode(true));
            
            this.tags = [];
        }
        
        connectedCallback() 
        {
            let input = this.dom.querySelector("input");
            input.addEventListener("focusout", (event) =>
            {
                if (this.changed)
                {
                    this.tags = this.parse(event.currentTarget.value);
                    this.changed = false;
                    this.dispatchEvent(new CustomEvent('changed', {  detail: this.tags }));
                }
            });
    
            input.addEventListener("keyup", (event) =>
            {
                if(event.keyCode == 13)
                {
                    this.tags = this.parse(event.currentTarget.value);
                    this.changed = false;
                    this.dispatchEvent(new CustomEvent('changed', { detail: this.tags}));
                }
                else 
                {
                    this.changed = true;
                }
            });
    
            this.dom.querySelector("button").addEventListener("click", (event) =>
            {
                this.dispatchEvent(new CustomEvent('changed', { detail: this.tags }));
            });
        }
        
        parse(string)
        {
            var tags = string.split(' ');
            var array = [];
            for (var i=0; i<tags.length; i++)
            {
                if (tags[i].length > 0)
                {
                    array.push(tags[i].toLowerCase());
                }
            }
            return array;
        }
        
        
        clear()
        {
            let input = this.dom.querySelector("input");
            input.value = "";
    
            this.tags = [];
        }
    }

customElements.define("ui-tag-search", UiSearch);

})();
    



(function() {

const template = document.createElement('template');

template.innerHTML = `

    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css" >
    <link rel="stylesheet" href="${window.app_domain}/ui.css">

    <style>
    
        :host
        {
            display: flex;
            align-items: center;
        }
        
        :host([horz])
        {
            flex-direction: row;
            padding: 0 8px 0 8px;
        }	

        :host([vert])
        {
            flex-direction: column;
            padding: 8px 0 8px 0;
        }
        
        .segment:first-of-type 
        { 
            background: #40C4FF;
            overflow: visible;
        }

        .segment:last-of-type  { background: var(--border); }

            
        .handle 
        {
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
        :host([horz]) .handle 
        { 
            margin-left: -8px;
            margin-right: -8px;
        }
        
        :host([vert]) { width: 16px; }
        :host([vert]) .segment { width: 2px;  } 
        :host([vert]) .segment.slider { flex-direction: column; } 
        :host([vert]) .handle 
        { 
            margin-top: -8px;
            margin-bottom: -8px;
        }		
        
        :host > div:nth-of-type(3) { flex-grow: 1 }
        
    </style>
    
    <div class="segment"></div>
    <div class="handle"></div>
    <div class="segment"></div>
    `;


class UiSlider extends HTMLElement 
{
    constructor() 
    {
        super();
        
        this.dom = this.attachShadow({mode: 'open'});
        this.dom.appendChild(template.content.cloneNode(true));
        
        this.range1 = this.dom.querySelector('.segment:nth-of-type(1)');
        this.handle = this.dom.querySelector('.handle');
        this.range2 = this.dom.querySelector('.segment:nth-of-type(2)');
        
        this.move = (event)  =>
        {
            if (this.orient == "vert")
            {
                let top = this.bounds.top + 8;
                let bottom = this.bounds.bottom - 8;
                let height = bottom - top;
                
                var position = Math.min(Math.max(top, event.pageY), bottom) - top;
                this.range1.style.height = Math.max(0, position) + "px";
                
                this.dispatchEvent(new CustomEvent('change', 
                {
                    bubbles: true,
                    composed: true,
                    detail: 1.0-position/(height)
                }));
            }
            else
            {
                let left = this.bounds.left + 8;
                let right = this.bounds.right - 8;
                let width = right - left;
                
                var position = Math.min(Math.max(left, event.pageX), right) - left;
                this.range1.style.width = Math.max(0, position) + "px";
                
                this.dispatchEvent(new CustomEvent('change', 
                {
                    bubbles: true,
                    composed: true,
                    detail: position/width
                }));
            }
        };
        
        this.up = (event) =>
        {
            document.removeEventListener('mousemove', this.move);
            document.removeEventListener('mouseup', this.up);
            if (this.hasAttribute("mouseout"))
            {
                document.removeEventListener("mouseout",this.out);
            }
        };
        
        this.out = (event)  =>
        {
            document.removeEventListener('mousemove', this.move);
            document.removeEventListener('mouseup', this.up);
            if (this.hasAttribute("mouseout"))
            {
                document.removeEventListener("mouseout",this.out);
            }
        };
        
        this.handle.addEventListener('mousedown', (event)=>
        {
            this.bounds = this.dom.host.getBoundingClientRect();
            document.addEventListener('mousemove', this.move);
            document.addEventListener('mouseup', this.up);
            if (this.hasAttribute("mouseout"))
            {
                document.addEventListener("mouseout",this.out);
            }
        });
        
        this.A = 12; // px handle size
    }
    
    connectedCallback() 
    {
        this.orient = this.getAttribute("horz") != null ? "horz" : "vert";
    }
    
    set(value, update)
    {
        this.bounds = this.dom.host.getBoundingClientRect();
        if (this.orient == "vert")
        {
            this.range1.style.height = `${value*100}%`;//`${value*(this.bounds.height-12)}px`;
        }
        else
        {
            this.range1.style.width = `${value*100}%`;//`${value*(this.bounds.width-12)}px`;
        }
    }			
}

customElements.define("ui-slider", UiSlider);

})();

    
    
(function() {

const template = document.createElement('template');

template.innerHTML = `

    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css" >
    <link rel="stylesheet" href="${window.app_domain}/ui.css">

    <style>
    
        :host
        {
            display: flex;
            align-items: center;
        }
        
        :host([horz])
        {
            flex-direction: row;
        }	

        :host([vert])
        {
            flex-direction: column;
        }
        
        
        .segment { overflow: visible; }
        .segment.range 
        {
            background: #40C4FF;
            flex-grow: 1;
            position:relative;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .segment:not(.range) { background: var(--border); }
        
        .handle 
        {
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
        
    
    </style>
    
        <div class="segment"></div>
        <div class="segment range">
            <div class="handle A"></div>
            <div class="handle B"></div>
        </div>
        <div class="segment"></div>
        
    `;


class UiRange extends HTMLElement 
{
    constructor() 
    {
        super();
            
        this.dom = this.attachShadow({mode: 'open'});
        this.dom.appendChild(template.content.cloneNode(true));
    
        this.range1 = this.dom.querySelector('.segment:nth-of-type(1)');
        this.range2 = this.dom.querySelector('.segment:nth-of-type(2)');
        this.range3 = this.dom.querySelector('.segment:nth-of-type(3)');
        
        this.A = 0;
        this.handleA = this.dom.querySelector('.handle.A');
        this.B = 1;
        this.handleB = this.dom.querySelector('.handle.B');

        this.moveA = (event) =>
        {
            if (this.hasAttribute("horz"))
            {
                let pos = Math.min(Math.max(this.bounds.left, event.pageX), this.boundsMax.left-this.SIZE) - this.bounds.left;
                this.range1.style.width = pos + "px";
                this.A = pos/(this.bounds.width-2*this.SIZE);
                this.dispatchEvent(new CustomEvent('change', { detail: { min: this.A, max: this.B } }));
            }
            else
            {
                let pos = Math.min(Math.max(this.bounds.top, event.pageY), this.boundsMax.top-this.SIZE) - this.bounds.top;
                this.range1.style.height = pos + "px";
                this.A = pos/(this.bounds.height-2*this.SIZE);
                this.dispatchEvent(new CustomEvent('change',  { detail: { min: 1-this.B, max: 1-this.A } }));
            }
        };
        
        this.upA = (event) =>
        {
            document.removeEventListener('mousemove', this.moveA);
            document.removeEventListener('mouseup', this.upA);
            if (this.hasAttribute("strict"))
            {
                this.dom.host.removeEventListener('mouseleave', this.upA);
            }
        };
        
        this.handleA.addEventListener('mousedown', (event) =>
        {
            this.bounds = this.dom.host.getBoundingClientRect();
            this.boundsMax = this.handleB.getBoundingClientRect();
            document.addEventListener('mousemove', this.moveA);
            document.addEventListener('mouseup', this.upA);
            if (this.hasAttribute("strict"))
            {
                this.dom.host.addEventListener('mouseleave', this.upA);
            }
        });

        this.moveB = (event) =>
        {
            if (this.hasAttribute("horz"))
            {
                let pos = Math.max(Math.min(this.bounds.right, event.pageX), this.boundsMin.right+this.SIZE) - this.bounds.left;
                this.range3.style.width = (this.bounds.width-pos) + "px";
                this.B = (pos-2*this.SIZE)/(this.bounds.width-2*this.SIZE);
                this.dispatchEvent(new CustomEvent('change', { detail: { min: this.A, max: this.B } }));
            }
            else
            {
                let pos = Math.max(Math.min(this.bounds.bottom, event.pageY), this.boundsMin.bottom+this.SIZE) - this.bounds.top;
                this.range3.style.height = (this.bounds.height-pos) + "px";
                this.B = (pos-2*this.SIZE)/(this.bounds.height-2*this.SIZE);
                this.dispatchEvent(new CustomEvent('change', {detail: { min: 1-this.B, max: 1-this.A } }));
            }
        };
        
        this.upB = (event)  =>
        {
            document.removeEventListener('mousemove', this.moveB);
            document.removeEventListener('mouseup', this.upB);
            if (this.hasAttribute("strict"))
            {
                this.dom.host.removeEventListener('mouseleave', this.upB);
            }
        };
        
        this.handleB.addEventListener('mousedown', (event) =>
        {
            this.bounds = this.dom.host.getBoundingClientRect();
            this.boundsMin = this.handleA.getBoundingClientRect();
            document.addEventListener('mousemove', this.moveB);
            document.addEventListener('mouseup', this.upB);
            if (this.hasAttribute("strict"))
            {
                this.dom.host.addEventListener('mouseleave', this.upB);
            }
        });

        this.SIZE = 16; // px handle size		
    }
    
    set(min, max, update)
    {
        this.bounds = this.getBoundingClientRect();
    
        if (this.hasAttribute("horz"))
        {
            let width = this.bounds.width - 2*this.SIZE;
            this.range1.style.width = width*min + "px";
            this.range3.style.width = width*(1.0-max) + "px";
            this.A = min;
            this.B = max;
        }
        else
        {
            let height = this.bounds.height - 2*this.SIZE;
            this.range1.style.height = height*(1.0-max) + "px";
            this.range3.style.height = height*min + "px";
            this.A = 1-max;
            this.B = 1-min;
        }
        if (update)
        {
            this.dispatchEvent(new CustomEvent('change', { detail: { min, max } }));
        }
    }			
}

customElements.define("ui-range", UiRange);

})();
    


(function() {

    const template = document.createElement('template');
    
    template.innerHTML = `
    
        <style>
        
            :host
            {
                position: fixed;
                padding: 1em  1em  1em  1em;
                background: white;
                z-index: 9999; 
                /*box-shadow: 5px 0px 10px 0px var(--border);*/
                border: 1px solid var(--border)
            }
            
                                        
        </style>
        
        <slot></slot>
        
        `;
    
    
    class UiPopup extends HTMLElement 
    {
        constructor() 
        {
            super();
                
            this.dom = this.attachShadow({mode: 'open'});
            this.dom.appendChild(template.content.cloneNode(true));
        }
        
        connectedCallback() 
        {
            if (!this.hasAttribute("manual"))
            {
                this.dom.host.addEventListener("mouseleave", event =>
                {
                    this.dispatchEvent(new CustomEvent("close"));
                    this.toggleAttribute("hidden", true);
                });
            }
        }
    
        open(x, y)
        {
            this.dom.host.style.left = `${x}px`;
            this.dom.host.style.top = `${y}px`;;
            this.toggleAttribute("hidden", false);
        }
        
        openAt(u, v, dom)
        {
            let box = dom.getBoundingClientRect();
            
            if (u == "left")
            {
                this.dom.host.style.left = `${box.left}px`;
            }
            if (v == "bottom")
            {
                this.dom.host.style.top = `${box.bottom}px`;;
            }
            
            this.toggleAttribute("hidden", false);
        }
        
        close()
        {
            this.toggleAttribute("hidden", true);
        }
    }
    
    customElements.define("ui-popup", UiPopup);

})();
    



(function() {

const template = document.createElement('template');

template.innerHTML = `

    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css" >
    <link rel="stylesheet" href="${window.app_domain}/ui.css">

    <style>
    
        :host {
            position: fixed;
            left: 0;
            top: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0,0,0,.5);
            pointer-events: auto;
            opacity: 1;
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 99;
        }
        
        :host([local]) { position: absolute; }
        
        div 
        {
            position:relative;
            padding: 2.1em 2.1em 2.1em 2.1em;
            border: none;
            background: #ffffff;
            opacity: 1.0;
            overflow: hidden;
            box-sizing: border-box;
            box-shadow: 0 9px 46px 8px rgba(0,0,0,.14), 0 11px 15px -7px rgba(0,0,0,.12), 0 24px 38px 3px rgba(0,0,0,.2);
        }
        
        button 
        {
            position: absolute;
            top: 0.5em;
            right: 0.5em;
        }
        
        :host(:not([close])) button { display: none; }
            
    </style>
        
    <div>
        <button class="vx-round vx-secondary"><i class="fas fa-times-circle"></i></button>
        <slot></slot>
    </div>
    
    `;


class UiModal extends HTMLElement 
{
    static get observedAttributes() 
    {
        return ['hidden'];
    }
    
    constructor() 
    {
        super();
            
        this.dom = this.attachShadow({mode: 'open'});
        this.dom.appendChild(template.content.cloneNode(true));
        
        this.dom.querySelector("button").addEventListener("click", event=>
        {
            this.hidden = true;
            
            this.dispatchEvent(new CustomEvent("close"));
        });
    }
    
    attributeChangedCallback(name, oldValue, newValue)
    {
        if (name === "hidden")
        {
            if (newValue != null)
            {
                this.dispatchEvent(new CustomEvent("close"));
            }
            else
            {
                this.dispatchEvent(new CustomEvent("open"));
            }
        }
    }
}

customElements.define("ui-modal", UiModal);

})();




(function() {

    const template = document.createElement('template');
    
    template.innerHTML = `
    
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css">
        <link rel="stylesheet" href="${window.app_domain}/ui.css">
    
        <style>
        
            :host
            {
                position: fixed;
                color: white;
                background: black;
                font-size: 1em;
                z-index: 99;
                padding:  0 1.0em;
                border-radius: 0.5em;
            }
            
            i
            {
                margin-right: 0.5em;
            }
            
            ::slotted(*)
            {
                font-size: 1em;
            }
    
        </style>
    
        <div>
            <slot></slot>
        </div>
        `;
    
    
    class UiTooltip extends HTMLElement 
    {
        constructor() 
        {
            super();
                
            this.dom = this.attachShadow({mode: 'open'});
            this.dom.appendChild(template.content.cloneNode(true));
            
            this.timer = null;
            
            this.scrollEvent = (event)=>
            {
                if (this.timer)
                {
                    clearTimeout(this.timer);				
                }
                
                document.removeEventListener('scroll', this.scrollEvent);
                this.hidden = true;
            }
        }
        
        connectedCallback()
        {
            
            this.parentElement.addEventListener("mouseenter", event =>
            {
                if (this.timer)
                {
                    clearTimeout(this.timer);				
                }
    
                this.timer = setTimeout(() => 
                {
                    let rect = this.parentElement.getBoundingClientRect();
                    
                    let style = this.dom.host.style;
                    
                    if (window.innerWidth - rect.right < 100)
                    {
                        style.right = `${window.innerWidth-rect.right+8}px`;
                        style.removeProperty("left");
                    } 
                    else
                    {
                        style.left = `${rect.left}px`;
                        style.removeProperty("right");
                    }
                    
                
                    if (rect.bottom > window.innerHeight/2)
                    {
                        style.bottom = `${window.innerHeight-rect.top+8}px`;
                        style.removeProperty("top");
                    } 
                    else
                    {
                        style.top = `${rect.bottom+8}px`;
                        style.removeProperty("bottom");
                    }
    
                    document.addEventListener('scroll', this.scrollEvent);
                    this.hidden = false;
                    this.timer = null;
                }, 700);
            });
            
            this.parentElement.addEventListener("mouseleave", event =>
            {
                if (this.timer)
                {
                    clearTimeout(this.timer);				
                }
                
                document.removeEventListener('scroll', this.scrollEvent);
                this.hidden = true;
            });
        }
    }

customElements.define("ui-tooltip", UiTooltip);

})();

//---------------------------------------------------------------------------------------------------
//---------------------------------------------------------------------------------------------------
//---------------------------------------------------------------------------------------------------
//---------------------------------------------------------------------------------------------------
//---------------------------------------------------------------------------------------------------
//---------------------------------------------------------------------------------------------------
//---------------------------------------------------------------------------------------------------
//---------------------------------------------------------------------------------------------------
//---------------------------------------------------------------------------------------------------
//---------------------------------------------------------------------------------------------------
//---------------------------------------------------------------------------------------------------
//---------------------------------------------------------------------------------------------------
//---------------------------------------------------------------------------------------------------
//---------------------------------------------------------------------------------------------------
//---------------------------------------------------------------------------------------------------

(function() {

const template = document.createElement('template');

template.innerHTML = `

    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css" >
    <link rel="stylesheet" href="${window.app_domain}/ui.css">

    <style>
    
        :host
        {
            position:absolute;
            left: 0;
            top: 0;
            right: 0;
            bottom: 0;
            background: white;
            z-index: 1030;
            align-items: center;
            display: flex;			
        }

        button 
        { 
            font-size: 1.25rem; 
            width: 100%;
            margin-top: 20px;
            padding: 0 40px;
            line-height: 53px;
        }
                
        input 
        { 
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

         h3 
        { 
            text-align: center!important;
            font-size: 1.5rem;
            line-height: 1.4;
        }	
                                
    </style>

    <ui-modal>		
        <h3>Password Required</h3>
        <input type="password">	
        <button>Verify</button>
    </ui-modal>
    `;


class UiPassword extends HTMLElement 
{
    constructor() 
    {
        super();
            
        this.dom = this.attachShadow({mode: 'open'});
        this.dom.appendChild(template.content.cloneNode(true));
        
        this.dom.querySelector("button").addEventListener("click", ()=>this.validate());
        this.dom.querySelector("input").addEventListener("keyup", (event) =>
        {
            if (event.keyCode == 13) 
            {
                this.validate();
            }
        });
    }

    validate()
    {
        var password = CryptoJS.MD5(this.dom.querySelector("input").value);
        if (password.toString() === this.getAttribute("password"))
        {
            this.remove();
            this.dispatchEvent(new CustomEvent("verified"));
        }
    }; 
}

customElements.define("ui-password", UiPassword);

})();




(function() {

const template = document.createElement('template');

template.innerHTML = `

    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css" >
    <link rel="stylesheet" href="${window.app_domain}/ui.css">

    <style>
    
        :host
        {
            position: relative;
            border: 1px solid var(--border);
            padding: 0.3em 0.3em 0.3em 0.3em;
            display: flex;
            flex-direction: column;
            overflow-y: hidden;
            box-sizing: border-box;
        }
        span
        {
            background-color: var(--hover);
            color: var(--primary);
            padding: 0.3em 0.3em 0.3em 0.3em;
        }
        
    </style>
    
    <span>
    </span>
    <slot></slot>
`;


class UiSection extends HTMLElement 
{
    static get observedAttributes() 
    {
        return ['label'];
    }
    
    constructor() 
    {
        super();
            
        this.dom = this.attachShadow({mode: 'open'});
        this.dom.appendChild(template.content.cloneNode(true));
    }
    
    attributeChangedCallback(name, oldValue, newValue)
    {	
        if (name === "label")
        {
            this.dom.querySelector("span").textContent = newValue;
        }
    }

}

customElements.define("ui-section", UiSection);

})();




