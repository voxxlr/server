class VxViewpoint extends HTMLElement 
{
    constructor() 
    {
        super();
        
        this.dom = this.attachShadow({mode: 'open'});
        
        this.dom.innerHTML = `

            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css">
            <link rel="stylesheet" href="${window.app_domain}/ui.css">
   
            <style>
            
                :host
                {
                    position: relative;
                    display: inline-block;
                }
                                
                div 
                {
                    flex: 1;
                    position: relative;
                    display: flex;
                    align-items: center;
                    float: left;
                    padding: 0 0.1em;
                    cursor: pointer;
                    color: black;
                    border-top-left-radius: 6px;
                    border-top-right-radius: 6px;
                    background-color: white;
                    border: 1px solid var(--border);
                }    	
                
                div:not(:first-child):not([selected]):before 
                {
                    content: "";
                    position: absolute;
                    left: 0px;
                    top: 0.4em;
                    bottom: 0.1em;
                    border-left: 2px solid var(--border) 
                }
                div[selected] { background-color: var(--panel-header); }
                
                div > a
                {
                    float: right;
                    border: none;
                    background-color: Transparent;
                    background-repeat:no-repeat;
                    background-image: none;
                    visibility:hidden;
                    color: var(--primary);
                }
                
                div > a:not(:nth-of-type(1)) { padding: 5px 8px 5px 0; }
                div > a:nth-of-type(1) { padding: 5px 8px 5px 8px; }
                        
                div[selected] a { visibility:visible; }
                
                :host(:not([editable])) a.close { display: none; }
                :host(:not([editable])) a.save { display: none; }
                :host(:not([comments])) a.comment { display: none; }
                
                input[type=text]
                {
                    flex: 1;
                    padding: 0;
                    margin-right: 5px;
                    background: transparent;
                    border: none;
                    pointer-events: none;
                    text-align: center;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }		
                div[selected] input[type=text]:focus
                {
                    /*
                    background-color: white;
                    color: black;
                    */
                }
                /*
                div[selected] > input[type=text] { color: white; }
                */
                button.add 
                { 
                    float: left; 
                    background-color: transparent;
                    border: none;
                    margin-top: 0.3em;
                }
                
                button.add i 
                {
                    color: var(--primary);
                    font-size: 2.1em;
                }
                        
            </style>
            
            <template>
                <div>
                    <a class="comment">
                        <i class="fas fa-comment"></i>
                        <ui-tooltip hidden>
                            <p>Edit Comments</p>
                        </ui-tooltip>
                    </a>
                    <input type="text">
                    <a class="save">
                        <i class="fas fa-sync-alt"></i>
                        <ui-tooltip hidden>
                            <p>Update Viewpoint</p>
                        </ui-tooltip>
                    </a>
                    <a class="close">
                        <i class="fas fa-window-close"></i>
                        <ui-tooltip hidden>
                            <p>Delete Viewpoint</p>
                        </ui-tooltip>
                    </a>
                </div>
            </template>
            
            <button class="add" hidden>
                <i class="fas fa-plus-circle"></i>
                <ui-tooltip hidden>
                    <p>Create a new Viewpoint to save the current location and settings</p>
                </ui-tooltip>
            </button>
 
            <ui-modal hidden close>
                <textarea rows="12" placeholder="Add text here..." cols="50" tabindex="-1"></textarea>
            </ui-modal>

            `;		
        
        this.plus = this.dom.querySelector("button.add");
        this.plus.addEventListener("click", async event=>
        {
            let viewpoint = await this.viewer.get("viewpoint", { id: new Date().getTime(), name: "viewpoint", comment: "" });

    //		this.viewer.wait("*.unselect");

            // hide everything
            /*
            let list = await this.viewer.wait("*.get", "");
            for (var id in list)
            {
                if (id != "profile")
                {
                    viewpoint.hidden[id] = true;
                }
            };
            */
            
            let tab = this.dom.insertBefore(this.createTab(viewpoint), this.plus);
            
            tab.dispatchEvent(new CustomEvent("click", { bubbles: true }));
            
            this.dispatchEvent(new CustomEvent("tab-add", { bubbles: true, composed: true, detail: viewpoint }));		
        });
        
                        
        this.dom.querySelector("ui-modal").addEventListener("close", event=>
        {
            let tab = this.dom.querySelector("div[selected]");
            if (tab)
            {
                let textarea = event.currentTarget.querySelector("textarea");
                tab.content.comment = textarea.value;
                let button = tab.querySelector("a.comment");
                button.toggleAttribute("active", tab.content.comment.length > 0);
            };
        });
    }

    connectedCallback() 
    {
        if (this.hasAttribute("editable"))
        {
            this.dom.addEventListener("dblclick", (event)=>
            {
                let tab = event.target.closest("div");
                if (tab)
                {
                    let input = tab.querySelector("input");
                    input.focus();
                    input.style.pointerEvents = "auto";	
                    input.setSelectionRange(0, input.value.length)
                }
            });
        }
    
        this.viewer = this.hasAttribute("viewer") ?  document.querySelector(this.getAttribute("target")) : this.closest("vx-viewer");
        
        this.viewer.on("viewer.load", (document) =>
        {
            let meta = document.meta;
            if (meta && meta.viewpoints)
            {
                meta.viewpoints.forEach(viewpoint => this.dom.insertBefore(this.createTab(viewpoint), this.plus));
            }
            
            let selected = this.getAttribute("selected");
            if (selected)
            {
                selected = this.dom.getElementById(selected);
                if (selected)
                {
                    selected.dispatchEvent(new CustomEvent("click", { bubbles: true }));
                }
            }		
            
            if (this.hasAttribute("editable"))
            {
                this.plus.hidden = false;
            }
        });
        
        this.viewer.on("viewer.unload", (args) =>
        {
            this.dom.querySelectorAll("div").forEach(div => div.remove());
            if (args.reset)
            {
                this.plus.hidden = true;
            }
        });
    
        this.viewer.on("viewpoint", (args) =>
        {
            let tab = this.dom.querySelector("div[selected]");
            if (tab)
            {
                tab.toggleAttribute("selected");
            }
            tab = this.dom.getElementById(args.id);
            tab.toggleAttribute("selected");
        })

        this.viewer.on(["line.create", "polygon.create", "elevation.create", "floodfill.create"], (geometry, custom) =>
        {
            if (custom.domain === "measurement")
            {
                let selected = this.dom.querySelector("div[selected]");
                if (selected)
                {
                    // hide measurement in all other viewpoints
                    this.dom.querySelectorAll(":host > div").forEach(item =>
                    {
                        if (item != selected)
                        {
                            let hidden = item.content.hidden;
                            if (!hidden.hasOwnProperty(geometry.id))
                            {
                                hidden[geometry.id] = true;
                            }
                        }
                    });
                }
            }
        });
        
    }
    
    createTab(viewpoint)
    {
        // TODO legave fix remove
        viewpoint.hidden = viewpoint.hidden || {};

        
        let template = this.dom.querySelector("template");
        let root = template.content.cloneNode(true);
        
        let tab = root.querySelector("div"); 
        tab.id = viewpoint.id;
        tab.content = viewpoint;
        tab.addEventListener("click",  async (event) =>
        {
            let tab = event.currentTarget;
            
            this.viewer.post("viewpoint", tab.content);

            let selected = this.dom.querySelector("div[selected]");
            if (selected != tab)
            {
                this.dispatchEvent(new CustomEvent("tab-change", { bubbles: true, composed: true, detail: tab.content }));		
            }
        });
        
        let input = tab.querySelector("input")
        input.value = viewpoint.name;
        input.addEventListener("blur", event => 
        { 
            let tab = event.currentTarget.closest("div");
            tab.content.name = event.currentTarget.value;
            event.currentTarget.style.pointerEvents = "none";	
        });
        input.addEventListener('keyup', event =>
        {
            if (event.keyCode == 13) 
            {
                let tab = event.currentTarget.closest("div");
                tab.content.name = event.currentTarget.value;
                event.currentTarget.style.pointerEvents = "none";	
            }
        });
        
        let button = tab.querySelector("a.comment");
        button.toggleAttribute("active", viewpoint.comment != null && viewpoint.comment.length > 0);
        button.addEventListener("click", event =>
        {
            event.stopPropagation();
            let tab = event.target.closest("div");
            //this.dispatchEvent(new CustomEvent("tab-comment", { bubbles: true, composed: true, detail: tab.content }));
            
            let dialog = this.dom.querySelector("ui-modal");
            dialog.querySelector("textarea").value =  tab.content.comment;
            dialog.hidden = false;
        })
        button = tab.querySelector("a.close");
        button.addEventListener("click", event =>
        {
            event.stopPropagation();
            let tab = event.target.closest("div");
            tab.remove();
        })
        
        button = tab.querySelector("a.save");
        button.addEventListener("click", async event =>
        {
            event.stopPropagation();
            let tab = event.target.closest("div");
            tab.content = await this.viewer.get("viewpoint", tab.content);
        })
        
        return tab;
    }
    
    setItem(key, value)
    {
        let selected = this.dom.querySelector("div[selected]");
        if (selected)
        {
            selected.content[key] = value;
        }
    }
    
    clrItem(key, value)
    {
        let selected = this.dom.querySelector("div[selected]");
        if (selected)
        {
            delete selected.content[key];
        }
    }
    
    
    getSelected()
    {
        let selected = this.dom.querySelector("div[selected]");
        if (selected)
        {
            return selected.content;
        }
        return null;
    }
    
    async save(patch)
    {
        let selected = this.dom.querySelector("div[selected]");
        if (selected)
        {
            selected.content =  await this.viewer.get("viewpoint", selected.content);
        }

        let list = []
        this.dom.querySelectorAll(":host > div").forEach(item =>
        {
            list.push(item.content);	
        });
        patch.push({ op: "replace", path: "/viewpoints", value: list })
    }
}

customElements.define("vx-viewpoint", VxViewpoint);


