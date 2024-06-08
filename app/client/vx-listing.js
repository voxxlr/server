class VxListing extends HTMLElement 
{
    static get observedAttributes() 
    {
        return ['tags', 'exclude'];
    }
    constructor() 
    {
        super();
        
        this.dom = this.attachShadow({mode: 'open'});
        
        this.dom.innerHTML = `

            <style>
            
                :host
                {
                    display: flex;
                    overflow: hidden;
                }
    
                :host > div
                {
                    flex: 1;
                    overflow-y: scroll;
                    display: flex;
                    flex-direction: column;
                    justify-content: flex-start;
                }
                
                div.entry 
                {
                    cursor: pointer;
                    float: left;
                    margin: 0px;
                    margin: 8px 4px 0px 4px;				    
                    overflow: hidden;
                    position: relative;
                    box-sizing: border-box; 
                    height: 200px;
                }
                
                img 
                {
                    margin: 0px;
                    padding: 0px;
                    width: 100%;
                    height: 100%;
                }
                                
                p 
                {
                    position:relative; 
                    bottom: 2em;
                    height: 2em;
                    line-height: 2em;
                    padding: 0px;
                    margin: 0px;
                    text-align: center;
                    vertical-align: middle;
                    color: white;			
                    display:block;
                    background-color: rgba(0, 0, 0, 0.5);
                }
    
                div.entry.selected { border: 2px solid var(--primary); }
                div.entry.selected > p
                {
                    background-color: var(--primary);
                    opacity: 0.5;
                }
                
                :host([draggable]) div.entry.selected { cursor: move }		
                    
            </style>
            
            <slot name="actions"></slot>
            <div>
            </div>
            <slot></slot>
        `;		
        
        this.capacity = 0;
        this.cursor = null;
        this.limit = 10;
        this.tags = [];
        this.exclude = [];
        
        this.container = this.dom.querySelector(":host > div");
        
        this.scrollHandler = async (event) =>
        {
            if(event.currentTarget.scrollHeight - (event.currentTarget.clientHeight + event.currentTarget.scrollTop) < 50)
            {
                this.container.removeEventListener('scroll',this.scrollHandler);
                await this.load();
                this.container.addEventListener('scroll',this.scrollHandler);
            }
        }
        this.container.addEventListener('scroll',this.scrollHandler); 
        
        this.dom.addEventListener("click", this.click.bind(this));
        this.dom.addEventListener("dblclick", this.dblclick.bind(this));
        this.dom.addEventListener("dragstart", event => 
        {
            event.dataTransfer.setData("json/content", event.target.closest("div").content.token);
        })
        this.dom.addEventListener("dragend",  event => 
        {
            this.dispatchEvent(new CustomEvent('dragend', { bubbles: true, composed: true, detail: event.target.closest("div").content.token }));
        });
        
        this.overlay = this.dom.querySelector('slot[name="actions"]');
        this.overlay.remove();
    }
    
    connectedCallback() 
    {
        this.meta = ["name", "description", "preview"];
        if (this.hasAttribute("meta"))
        {
            this.meta.push(...this.getAttribute("meta").split(","))
        }
        
        this.dragEnabled = this.hasAttribute("draggable");
        //this.removeAttribute("draggable");
        
        this.exclude = [];
    }
    
    attributeChangedCallback(name, oldValue, newValue) 
    {
        if (name == "tags")
        {
            if (newValue)
            {
                this.tags = newValue.split(",");	
            }
            else
            {
                this.tags = [];			
            }
        }
        else if (name == "exclude")
        {
            if (newValue)
            {
                this.exclude = [];
                newValue.split(",").forEach(id =>
                {
                    this.exclude.push(parseInt(id));
                })
            }
            else
            {
                this.exclude = [];
            }
        }
    }
    
    clear()
    {
        let selected = this.container.querySelector("div.selected");
        if (selected)
        {
            this.dispatchEvent(new CustomEvent('dataset-unselect', { bubbles: true, composed: true, detail: selected.content }));
            this.dispatchEvent(new CustomEvent('dataset-change', { bubbles: true, composed: true, detail: { from: selected.content, to: null }} ));
        }
        
        this.container.querySelectorAll("div").forEach(entry => entry.remove());
        this.allLoaded = false;
        this.cursor = null;
    }
    
    add(entry)
    {
        var div = document.createElement("div");
        div.classList.add('entry');
        div.id = entry.id; 
        div.content = entry;
        
        var image = document.createElement("img");
        image.toggleAttribute("draggable", this.dragEnabled)
        if (entry.files["preview.jpg"])
        {
            image.src = entry.files["preview.jpg"];
        }
        image.onerror = function()
        { 
            this.src=`${window.app_domain}/voxxlr/inventory/images/camera.webp`;
        }
        div.appendChild(image);
        
        var p = document.createElement("p");
        p.textContent = entry.meta.name;
        div.appendChild(p);

        this.container.appendChild(div);
    }
    
    async load()
    {
        if (!this.allLoaded)
        { 
            return fetch(`${window.doc_domain}/list`, 
            { 
                method: 'POST', 
                headers: new Headers({
                 'x-api-key': this.getAttribute("key"), 
                 'Content-Type': "application/json",
                 }),
                body: JSON.stringify({
                    type: this.getAttribute("type"),
                    tags: this.tags,
                    limit: this.limit,
                    cursor: this.cursor,
                    token: 3600,
                    select: {
                        meta: this.meta,
                        files: ["preview.jpg"]
                    }
                })
            }).then(async (response) => 
            {
                if (response.ok)
                {
                    let set = await response.json();
                    set.content.forEach(entry => 
                    {
                        if (!this.exclude.includes(entry.id))
                        {
                            this.add(entry);	
                        }				
                    });
                    
                    this.cursor = set.cursor;
                    this.allLoaded = this.cursor == null;
                    if (this.container.scrollHeight < this.container.clientHeight)
                    {
                        await this.load();
                    }
                }
            });
        }
        else
        {
            return Promise.resolve();
        }
    }

    get(id)
    {
        return this.dom.getElementById(id);
    }
    
    unselect(notify)
    {
        let div = this.container.querySelector("div.selected");
        if (div)
        {
            this.overlay.remove();
            div.classList.toggle("selected", false);
            if (notify)
            {
                this.dispatchEvent(new CustomEvent('dataset-unselect', { bubbles: true, composed: true, detail: div.content }));
                this.dispatchEvent(new CustomEvent('dataset-change', { bubbles: true, composed: true, detail: { from: div.content, to: null  }} ));
            }
            return div.content;
        }		
        return null;
    }
        
    select(id, notify)
    {
        let from;
        let to;
        
        let selected = this.container.querySelector("div.selected");
        if (selected && selected.content.id != id)
        {
            from = selected.content;
            this.overlay.remove();
            selected.classList.toggle("selected", false);
            if (notify)
            {
                this.dispatchEvent(new CustomEvent('dataset-unselect', { bubbles: true, composed: true, detail: selected.content }));
            }
        }
                
        if (id)
        {
            let div = this.dom.getElementById(id);
            if (div)
            {
                to = div.content;
                div.appendChild(this.overlay);
                div.classList.toggle("selected", true);		
                if (notify)
                {
                    this.dispatchEvent(new CustomEvent('dataset-select', { bubbles: true, composed: true, detail: div.content }));
                }
            }
        }
        
        if (from || to)
        {
            if (notify)
            {
                this.dispatchEvent(new CustomEvent('dataset-change', { bubbles: true, composed: true, detail: { from, to } }));
            }
        }
    }

    remove(document)
    {
        let div = this.dom.getElementById(document.id);
        if (div)
        {
            div.remove();
        }		
    }

    click(event)
    {
        let div = event.target.closest("div.entry");
        if (div)
        {
            let selected = this.container.querySelector("div.selected");
            if (selected)
            {
                if (selected != div)
                {
                    this.dispatchEvent(new CustomEvent('dataset-unselect', { bubbles: true, composed: true, detail: selected.content }));
                    selected.classList.toggle("selected", false);

                    div.appendChild(this.overlay);
                    this.dispatchEvent(new CustomEvent('dataset-select', { bubbles: true, composed: true, detail: div.content }));
                    div.classList.toggle("selected", true);
                    
                    this.dispatchEvent(new CustomEvent('dataset-change', { bubbles: true, composed: true, detail: { from: selected.content, to: div.content }} ));
                }
            }
            else
            {
                div.appendChild(this.overlay);
                this.dispatchEvent(new CustomEvent('dataset-select', { bubbles: true, composed: true, detail: div.content }));
                div.classList.toggle("selected", true);
                
                this.dispatchEvent(new CustomEvent('dataset-change', { bubbles: true, composed: true, detail: { from: null, to: div.content }} ));
            }
        }
    }
    
    dblclick(event)
    {
        let div = event.target.closest("div.entry");
        if (div)
        {
            this.dispatchEvent(new CustomEvent('dataset-dblclick', { bubbles: true, composed: true, detail: div.content }));
        }
    }
    
    empty()
    {
        return this.container.firstElementChild == null;
    }
}

customElements.define("vx-listing", VxListing);









/*

class IvList extends HTMLElement 
{
    static get observedAttributes() 
    {
        return ['key'];
    }

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
                }
                
                #list 
                { 
                    width: 100%; 
                    height: 100%;
                    display: grid;
                    grid-template-columns: 1fr 1fr 1fr 1fr;
                    grid-auto-rows: 170px;
                    grid-gap: 4px;
                    overflow-y: scroll;
                    background: var(--border);
                }
                    
                div.entry 
                {
                    position: relative;
                    cursor: pointer;
                    transition: .5s ease;
                    text-align: center
                }
                div.entry.no-image img { opacity: 1.0; }
                div.entry.no-image div { opacity: 1.0; }
                div.entry:hover img { opacity: 0.3; }
                div.entry:hover div { opacity: 1.0; }
                div.entry[selected] img { opacity: 0.3; }
                div.entry[selected] div { opacity: 1.0; }
                div.entry[selected] { background-color: var(--primary-transparent) }
                
                div.entry > div
                {
                    opacity: 0;
                    transition: .5s ease;
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    text-align: center;
                }
                
                div.entry .text
                {
                    background-color: var(--primary);
                    transition: .5s ease;
                    color: white;
                    padding: 0.5em 1em;
                }

                div.entry > img
                {
                    transition: .5s ease;
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                
    
            </style>
            
            <div id="list"></div>
            
            <template>
                <div class="entry">
                    <img>
                    <div>
                        <div class="text"><div>
                    </div>
                </div>
            </template>
            
        `;
                
        this.selected = null;
   
        this.template = this.dom.querySelector("template");

        this.listing = this.dom.getElementById("list");
        this.scrollHandler = async (event) =>
        {
            if(event.currentTarget.scrollHeight - (event.currentTarget.clientHeight + event.currentTarget.scrollTop) < 50)
            {
                this.listing.removeEventListener('scroll',this.scrollHandler);
                await this.load();
                this.listing.addEventListener('scroll',this.scrollHandler);
            }
        }
        this.listing.addEventListener('scroll',this.scrollHandler); 
        this.listing.addEventListener("click", async (event) =>
        {
            let div = event.target.closest("div.entry");
            if (div)
            {
                let selected = this.listing.querySelector("div[selected]");
                if (selected)
                {
                    if (selected != div)
                    {
                        this.dispatchEvent(new CustomEvent('dataset-unselect', { bubbles: true, composed: true, detail: selected.content }));
                        selected.toggleAttribute("selected", false);

                        this.dispatchEvent(new CustomEvent('dataset-select', { bubbles: true, composed: true, detail: div.content }));
                        div.toggleAttribute("selected", true);
                    }
                }
                else
                {
                    this.dispatchEvent(new CustomEvent('dataset-select', { bubbles: true, composed: true, detail: div.content }));
                    div.toggleAttribute("selected", true);
                }
            }
        });
        this.listing.addEventListener("dblclick", async (event) =>
        {
            let div = event.target.closest("div.entry");
            this.dispatchEvent(new CustomEvent('dataset-load', { bubbles: true, composed: true, detail: div.content }));
            window.parent.postMessage({ action: "dataset-load", dataset: div.content }, "*");
        });
    }

    attributeChangedCallback(name, oldValue, newValue)
    {
        if (name === "key")
        {
            while (this.listing.firstElementChild)
            {
                this.listing.firstElementChild.remove();
            }
    
            this.allLoaded = false;
            this.cursor = null;
    
            this.load();
        }
    }    


    selectOnList(dataset)
    {
        let selected = this.dom.getElementById(dataset.id);
        if (selected)
        {
            selected.toggleAttribute("selected", true);
        }
    }

    unselectOnList(dataset)
    {
        let selected = this.dom.getElementById(dataset.id);
        if (selected)
        {
            selected.toggleAttribute("selected", false);
        }		
    }

    async load()
    {
        if (!this.allLoaded)
        {
            let meta = ["name"];
            if (this.hasAttribute("meta"))
            {
                meta.push(...this.getAttribute("meta").split(","))
            }
    
            let files = ["preview.jpg"];
            if (this.hasAttribute("files"))
            {
                files.push(...this.getAttribute("files").split(","))
            }
    
            let tags = [];
            if (this.hasAttribute("tags"))
            {
                tags.push(...this.getAttribute("tags").split(","))
            }

            return fetch(`${window.doc_domain}/list`, 
            { 
                method: 'POST', 
                headers: new Headers({
                 'x-api-key': this.getAttribute("key"), 
                 'Content-Type': "application/json",
                }),
                body: JSON.stringify({
                    type: this.getAttribute("type"),
                    tags: tags,
                    limit: 30,
                    cursor: this.cursor,
                    token: 3600,
                    select: {
                        meta: meta,
                        files: files
                    }
                })
            }).then(async (response) => 
            {
                if (response.ok)
                {
                    let set = await response.json();
                   
                    set.content.forEach(entry => 
                    {
                        let template = this.template.content.cloneNode(true);
            
                        let div = template.firstElementChild; 
                        div.classList.add('entry');
                        div.id = entry.id; 
                        div.content = entry; 
                        var image = div.querySelector("img");

                        if (entry.files.hasOwnProperty("preview.jpg"))
                        {
                            image.src = entry.files["preview.jpg"];
                            image.onerror = function()
                            { 
                                this.src=`${window.app_domain}/voxxlr/inventory/images/camera.webp`;
                                this.parentElement.classList.add("no-image")
                            }
                        }
                        else
                        {
                            image.src=`${window.app_domain}/voxxlr/inventory/images/camera.webp`;
                            image.parentElement.classList.add("no-image")
                        }

                        div.querySelector(".text").textContent = entry.meta.name;
                        this.listing.appendChild(template);
                    });
                    
                    this.cursor = set.cursor;
                    this.allLoaded = set.cursor == null;
                    if (this.listing.scrollHeight < this.listing.clientHeight)
                    {
                        await this.load();
                    }
                }
            });
        }
        else
        {
            return Promise.resolve();
        }
    }
}

customElements.define("iv-list", IvList);

*/