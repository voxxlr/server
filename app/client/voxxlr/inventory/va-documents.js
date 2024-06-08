class VaDocuments extends HTMLElement 
{
    static get observedAttributes() 
    {
        return ['processing'];
    }
    
    constructor() 
    {
        super();
        
        this.dom = this.attachShadow({mode: 'open'});
        
        this.dom.innerHTML = `

            <link rel="stylesheet" href="${window.app_domain}/ui.css">
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css">
            <style>
            
                :host
                {
                    display: flex;
                    flex-direction: column;
                    overflow-y: hidden;
                }
    
                header
                {
                    display: flex;
                    align-items:stretch;
                    justify-content:flex-start;
                    margin-bottom: 0.5em;
                    margin-top: 0.5em;
                }
                
                header ui-tag-list
                { 
                    display: flex;
                }

                header ui-tag-input
                { 
                    width: 6em
                    margin-right: 0.5em; 
                }

                header > div.filter { flex-basis: 70% }

                header > div.delete {
                    flex-basis: 30%;
                    display: flex;
                    height: 100%;
                    margin-right: 1em;
                    justify-content: flex-end;
                    align-items: center;
                }

                :host-context([permission=R]) header > div.delete { display: none; }

                header > div.delete i { font-size: 2em; }

                ui-collapsible > div.content
                {
                    display: flex;
                    flex-direction: column;
                    margin: 0.5em;
                }

                /*
                ui-collapsible div[slot=header] i
                {
                    cursor: pointer;
                    color: var(--primary);
                    padding: 0.3em;
                }

                ui-collapsible div[slot=header] i
                {
                    vertical-align: middle;
                    font-family: "Font Awesome 5 Free";
                    display: inline-block;
                    color: var(--border);
                }

                ui-collapsible[type=cloud] div[slot=header] i:before { content: "\\f0c2"; }
                ui-collapsible[type=map] div[slot=header] i:before { content: "\\f279"; }
                */
                ui-collapsible div[slot=header] input 
                {
                    border: none;
                    background-color: transparent;	
                    flex: 1;
                }        

                ui-collapsible img
                {
                    margin: 0px;
                    padding: 0px;
                    width: 100%;
                    height: 100%;
                }

                :host-context([permission=R]) ui-collapsible input { display: none; }

                ui-collapsible-list { overflow: auto; }

                    
            </style>
            
            <header>
                <div class="filter">
                    <ui-selection-list single>
                        <button name="cloud" class="vx-secondary">Cloud</button>
                        <button name="model" class="vx-secondary">Model</button>
                        <button name="map" class="vx-secondary">Map</button>
                        <button name="panorama" class="vx-secondary">360</button>
                    </ui-selection-list>
                    <ui-tag-list>
                        <ui-tag-input  placeholder="tags..." type="text" ></ui-tag-input>
                    </ui-tag-list>
                </div>
                <div class="delete">
                    <button disabled class="vx-secondary" name="delete"><i class="fas fa-trash"></i></button>
                </div>
            </header>	

            <ui-collapsible-list selectable>
            </ui-collapsible-list>

            <template>
                <ui-collapsible>
                    <div class="content">
                        <img src="${window.app_domain}/voxxlr/inventory/images/camera.webp"/>
                        <ui-tag-list tags="">
                            <ui-tag-input type="text" ></ui-tag-input>
                        </ui-tag-list>
                        <textarea rows="3" placeholder="Description ..." cols="50" tabindex="-1"></textarea>
                    </div>
                    <div slot="header">
                        <input type="checkbox"/>
                        <input type="text"/>
                    </div>
                </ui-collapsible>
            </template>

        `;		
 
        //
        // Search
        //
        
        this.dom.querySelector("ui-tag-list").addEventListener("tags-changed", event =>  
        {
            this.tags = event.detail;
            this.clear()
            this.load();
        })
        
        let group = this.dom.querySelector("ui-selection-list");
        group.addEventListener("change", event => 
        {
            let button = group.querySelector("button[active]");
            if (button)
            {
                this.type = button.getAttribute("name");
            }
            else
            {
                this.type = null;
            }
            
            this.clear()
            this.load();
        });

        this.delete = this.dom.querySelector("button[name='delete']");
        this.delete.addEventListener("click", async (event) =>
        {
            this.delete.disabled = true;

            let list = this.dom.querySelectorAll("ui-collapsible input:checked");
            for (var i = 0; i < list.length; i++)
            {
                var collapsible = list[i].closest("ui-collapsible");
                if (collapsible.hasAttribute("selected"))
                {
                    this.dispatchEvent(new CustomEvent("unselect", { detail: collapsible.content }));
                }
                collapsible.remove();

                await fetch(`${window.doc_domain}/`,
                {
                    method: 'DELETE',
                    headers: new Headers({ 'x-doc-token': collapsible.content.token })
                }).then(async response => 
                {
                });
            }
        });

        
        //
        //  List
        //
        
        this.capacity = 0;
        this.cursor = null;
        this.limit = 10;
        this.tags = [];

        this.list = this.dom.querySelector("ui-collapsible-list");
        this.list.addEventListener('scroll', (event) =>
        {
            if(event.currentTarget.scrollHeight - (event.currentTarget.clientHeight + event.currentTarget.scrollTop) < 50)
            {
                this.load();
            }
        });

        this.list.addEventListener("select", event =>
        {
            this.dispatchEvent(new CustomEvent('select', { detail: event.target.content }));
        });

        this.list.addEventListener("unselect", event =>
        {
            this.dispatchEvent(new CustomEvent('unselect', { detail: event.target.content }));
        });

        this.list.addEventListener("open", async (event) =>
        {
            if ( this.list.select(event.target))
            {
                this.dispatchEvent(new CustomEvent('select', { detail: event.target.content }));
            }
        });
    }
    
    connectedCallback() 
    {
        let observer = new ResizeObserver(entries => 
        {
            let rect = entries[0].contentRect;
            // observe resize and adjust style
            this.capacity = Math.ceil(rect.height/20);
            if (this.capacity >= this.list.children.length)
            {
                this.load();
            }
        });
        observer.observe(this.list);
    }
    
    attributeChangedCallback(name, oldValue, newValue)
    {
        if (name == "processing")
        {
            this.clear();
            this.load();
        }
    }

    clear()
    {
        this.dispatchEvent(new CustomEvent('clear-datasets', { bubbles: true, composed: true }));

        while (this.list.firstElementChild)
        {
            this.list.firstElementChild.remove();
        }

        this.allLoaded = false;
        this.cursor = null;
    }
    
    add(entry)
    {
        let template = this.dom.querySelector("template")
        let div = template.content.cloneNode(true);

        let collapsible = div.querySelector("ui-collapsible");
        collapsible.setAttribute("id", entry.id);
        collapsible.setAttribute("type", entry.type);
        collapsible.content = entry;
        collapsible.toggleAttribute("editable", this.getAttribute("permission") == "W");

        let input = collapsible.querySelector("div[slot=header] input[type=text]");
        input.value = entry.meta.name;
        input.addEventListener("blur", event => 
        { 
            let collapsible = event.target.closest("ui-collapsible");
            fetch(`${window.doc_domain }/meta`,
            {
                method: 'PATCH',
                headers: new Headers({
                    'x-doc-token': collapsible.content.token,
                    'Content-Type': "application/json"
                }),
                body: JSON.stringify([{ op: "replace", path: "/name", value: event.currentTarget.value }])
            });
        });

        
        let checkbox = collapsible.querySelector("div[slot=header] input");
        checkbox.addEventListener("change", event =>
        {
            this.delete.disabled = this.dom.querySelector('ui-collapsible input:checked') == null;
            event.stopPropagation();
        })
        checkbox.addEventListener("click", event => { event.stopPropagation(); })

        let textarea = collapsible.querySelector("textarea")
        textarea.addEventListener("change", event =>
        {
            let collapsible = event.currentTarget.closest("ui-collapsible");
 
            fetch(`${window.doc_domain}/meta`,
            {
                method: 'PATCH',
                headers: new Headers({
                    'x-doc-token': collapsible.content.token,
                    'Content-Type': "application/json"
                }),
                body: JSON.stringify([{ op: "replace", path: "/description", value: textarea.value }])
            });
        });
        textarea.value = entry.meta.description || '';
        
        let tags = collapsible.querySelector("ui-tag-list");
        tags.addEventListener("tags-changed", event =>
        {
            let collapsible = event.target.closest("ui-collapsible")
            fetch(`${window.doc_domain}/tag`,
            {
                method: 'PATCH',
                headers: new Headers({
                    'x-doc-token': collapsible.content.token,
                    'Content-Type': "application/json"
                }),
                body: JSON.stringify({ tags: event.detail })
            });
        });
        tags.setAttribute("tags", entry.tags)

        var image = collapsible.querySelector("img");
        if (entry.files.hasOwnProperty("preview.jpg"))
        {
            image.src = entry.files["preview.jpg"];
        }
        image.onerror = function ()
        {
            this.src = `${window.app_domain}/voxxlr/inventory/images/camera.webp`;
        }
  
        this.list.appendChild(div);
    }
        
    
    load()
    {
        if (!this.loading && !this.allLoaded)
        { 
            this.loading = true;
            //this.dom.querySelector("#search").toggleAttribute("disabled", true);
            fetch(`${window.doc_domain}/list`, 
            { 
                method: 'POST', 
                headers: new Headers({
                 'x-api-key': this.getAttribute("key"), 
                 'Content-Type': "application/json",
                }),
                body: JSON.stringify({
                    type: this.type,
                    tags: this.tags,
                    limit: this.limit,
                    cursor: this.cursor,
                    token: 3600,
                    select: {
                        meta: ["name", "description"],
                        files: ["preview.jpg"]
                    }
                })
            }).then(async (response) => 
            {
                if (response.ok)
                {
                    let set = await response.json();
                    
                    this.cursor = set.cursor;
                    this.allLoaded = set.cursor == null;
                    
                    this.dispatchEvent(new CustomEvent('load-datasets', { bubbles: true, composed: true, detail: JSON.stringify(set.content) }));

                    set.content.forEach(entry => this.add(entry));

                    if (this.capacity >= this.list.children.length)
                    {
                        this.loading = false;
                        if (set.cursor)
                        {
                            this.load();
                        }
                    }
                    else
                    {
                        this.loading = false;
                        //this.dom.querySelector("#search").toggleAttribute("disabled", false);
                    }
                }
                else
                {
                    this.loading = false;
                    //this.dom.querySelector("#search").toggleAttribute("disabled", false);
                }
            });
        }
        else if (this.allLoaded)
        {
            //this.dom.querySelector("#search").toggleAttribute("disabled", false);
        }
    }

    setPreview(image)
    {
        let selected = this.list.querySelector("[selected]");
        selected.content.files["preview.jpg"] = image;
        selected.querySelector("img").src = image;
        if (!selected.hasAttribute("open"))
        {
            selected.toggleAttribute("open");
        }
    }

    getSelected()
    {
        let selected = this.list.querySelector("[selected]");
        if (selected)
        {
            return selected.content;
        }
        return null;
    }
}

customElements.define("va-documents", VaDocuments);

