class IvMap extends HTMLElement 
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
                }
    
            </style>
            
            <vx-viewer></vx-viewer>
          `;
                
        this.selected = null;
   
        //
        // Map
        // 
 
        this.pin = {  type: "point", };
        this.pin.code =
        {
             render2d: encodeURI(function(ctx, state)
             {
                let a = this.radius/2;
            
                ctx.drawImage(U.icon[this.status], -a, -a, this.radius, this.radius);
                if (this.selected)
                {
                    ctx.beginPath();
                    ctx.strokeStyle = "#0075FF";
                    ctx.lineWidth = 4;
                    ctx.arc(0, 0, this.radius/1.47, 0, 2*Math.PI);
                    ctx.stroke();
                }
                return false;
             }.toString()),
         
             intersect: encodeURI(function(ctx, x, y, state)
             {
                var r = this.radius/1.47*state.scale;
                var dx = state.x - x;
                var dy = state.y - y;
                return dx*dx+dy*dy < r*r;
             }.toString()),
        }
        this.pin.scope = { radius: 30 };
        this.pin.activation = { easing: "Linear", p0: 2, p1: 6 }

        this.viewer = this.dom.querySelector("vx-viewer");
        this.viewer.on("viewer.load", async  (args, custom) => 
        {
            this.viewer.post("splitter", { u: 1, v: 1, visible:false });
            
            //"https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}.png?access_token=pk.eyJ1Ijoiam9jaGVuc3RpZXIiLCJhIjoiY2s4cTZweWh4MDBycDNlcThtdGtkNzAwbyJ9.sSmRS_ITSl95JqGyOaPbcA" })));
            //"https://tile.stamen.com/toner/{z}/{x}/{y}.png" })));
            
            this.viewer.post("import.create", { id: "map", source: "https://tile.openstreetmap.org/{z}/{x}/{y}.png", type: "wmts", maxZoom: 19 });
            
            this.viewer.post("viewer.update", { code: encodeURI(function()
                     {
                        U.icon = [
                            new Image(),
                            new Image(),
                            new Image(),
                            new Image(),
                            new Image(),
                        ];
                        U.icon[0].src = `https://app.voxxlr.com/voxxlr/inspect/pinGrey.webp`;  
                        U.icon[1].src = `https://app.voxxlr.com/voxxlr/inspect/pinGreen.webp`; 
                        U.icon[2].src = `https://app.voxxlr.com/voxxlr/inspect/pinBlue.webp`; 
                        U.icon[3].src = `https://app.voxxlr.com/voxxlr/inspect/pinOrange.webp`;  
                        U.icon[4].src = `https://app.voxxlr.com/voxxlr/inspect/pinRed.webp`;  
                        
                        U.redIcon = new Image();
                        U.redIcon.src = `https://app.voxxlr.com/voxxlr/inspect/pinRed.webp`;
                     }.toString())
            });
            
            this.setView(0, 40.5768877, 3);
            
        });

        // 
        this.viewer.on(["point.click"], async (args)=>
        {
            if (this.selected)
            {
                this.viewer.post(`point.update`, { id: this.selected.id, scope: { selected: false } });
                this.unselectOnList(this.selected);
            }
            
            this.selected = args;
            
            // not so nice but necessary
            this.selected.token = args.meta.token;
            delete args.meta.token;
            // not so nice but necessary
            
            this.dispatchEvent(new CustomEvent('dataset-select', { bubbles: true, composed: true, detail: args.meta }));
            this.viewer.post(`point.update`, { id: args.id, scope: { selected: true } });
        });

    }
        
    connectedCallback() 
    {
        this.viewer.init("map");
    }
    
    setView(lon,lat, zoom)
    {
        let x = 256*((lon+180)/360); 
        let y = 256*((1-Math.log(Math.tan(lat*Math.PI/180) + (1/Math.cos(lat*Math.PI/180)))/Math.PI)/2);
        this.viewer.post("camera.set", { position: { x,y }, zoom });
    }

    //
    // Map
    //
    
    unselectOnMap(dataset)
    {
        if (dataset.location)
        {
            this.viewer.post(`point.update`, { id: dataset.id, scope: { selected: false } });
        }
    }
        
    selectOnMap(dataset)
    {
        if (dataset.location)
        {
            this.setView(dataset.location.lon, dataset.location.lat, 17)
            this.viewer.post(`point.update`, { id: dataset.id, scope: { selected: true } });
        }
        else
        {
            this.setView(0, 40.5768877, 3);
        }
    }
    

    attributeChangedCallback(name, oldValue, newValue)
    {
        if (name === "key")
        {
            this.load();
        }
    }

    async load()
    {
        return fetch(`${window.doc_domain}/search`, 
        { 
            method: 'POST', 
            headers: new Headers({
             'x-api-key': this.getAttribute("key"), 
             'Content-Type': "application/json",
             }),
            body: JSON.stringify({ type: this.getAttribute("type"), tags: this.tags, meta: this.meta, files: this.files })
        }).then(async (response) => 
        {
            if (response.ok)
            {
                let set = await response.json();
                set.forEach(entry => 
                {
                    this.pin.id = entry.id;
                    this.pin.point = {
                            x: 256*((entry.location.lon+180)/360),
                            y: 256*((1-Math.log(Math.tan(entry.location.lat*Math.PI/180) + (1/Math.cos(entry.location.lat*Math.PI/180)))/Math.PI)/2), 
                            z: 0
                        }
                    this.pin.meta = entry;
                    this.pin.scope.status = entry.meta.status || 0;
                    this.viewer.post("point.create", this.pin, {});		
                })
            }
        });
    }

    update(id, status)
    {
        this.viewer.post(`point.update`, { id, scope: { status } });
    }
}
customElements.define("iv-map", IvMap);


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





class VxInventory extends HTMLElement 
{
    static get observedAttributes() 
    {
        return ['key','files','meta','type'];
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
                    width: 80vw;
                    height: 80vh;
                    display: flex;
                }
                
                aside
                {
                    width: 20em;
                    display: flex;
                    flex-direction: column;
                    align-items: stretch;
                }
                aside > div
                {
                    position: relative;
                    overflow-y: auto;
                    padding-left: 1em;
                    margin-bottom: 1em;
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                }
                aside > button { margin-left: 1em; }

                ui-tab-list { 
                    flex: 2; 
                    height: 100%;
                }
                
    
            </style>
            
            <ui-tab-list>
                <span slot="header" active>List</span>
                <span slot="header">Map</span>
                <iv-list slot="content" active></iv-list>
                <iv-map slot="content"></iv-map>
            </ui-tab-list>
            
            <aside>
                <div>
                    <slot></slot>
                </div>
                <button disabled class="vx-primary">Load Dataset...</button>
            </aside>
            
        `;
                
        this.selected = null;
   
        this.map = this.dom.querySelector("iv-map");
        this.list = this.dom.querySelector("iv-list");

        this.list.addEventListener('dataset-unselect', (event) =>
        {
            this.map.unselectOnMap(event.detail);
            this.dom.querySelector("aside > button").disabled = true;
        })

        this.list.addEventListener('dataset-select', (event) =>
        {
            this.selected = event.detail;
            this.map.selectOnMap(event.detail);
            this.dom.querySelector("aside > button").disabled = false;
        })

        this.dom.querySelector("aside > button").addEventListener("click", event =>
        {
            this.dispatchEvent(new CustomEvent('dataset-load', { detail: this.selected }));
            window.parent.postMessage({ action: "dataset-load", dataset: this.selected }, "*");
        });
    }
    
    connectedCallback(name, oldValue, newValue)
    {
        for (const attribute of ['tags', 'files', 'meta', 'type'])
        {
            if (this.hasAttribute(attribute))
            {
                this.map.setAttribute(attribute,  this.getAttribute(attribute));
                this.list.setAttribute(attribute, this.getAttribute(attribute));
            }
        }

        this.list.setAttribute("key", this.getAttribute("key"));
        this.map.setAttribute("key",  this.getAttribute("key"));
    }

    async getToken(dataset)
    {
        if (!dataset.token)
        {
            await fetch(`${window.doc_domain}/token/${dataset.id}`,
            {
                headers: new Headers({ 'x-api-key': this.getAttribute("key") })
            }).then(async (response) =>
            {
                dataset.token = await response.text();
            });
        }
        return dataset.token;
    }

    async reload()
    {
        for (const attribute of ['tags', 'files', 'meta', 'type'])
        {
            if (this.hasAttribute(attribute))
            {
                this.map.setAttribute(attribute,  this.getAttribute(attribute));
                this.list.setAttribute(attribute, this.getAttribute(attribute));
            }
        }

        this.list.setAttribute("key", this.getAttribute("key"));
        this.map.setAttribute("key",  this.getAttribute("key"));
    }

    async select(dataset)
    {
        console.log("implement me")
    }    
}

customElements.define("vx-inventory", VxInventory);



class VxDatasetInfo extends HTMLElement 
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
                }
    
            </style>

            <h3></h3>
            <p></p>			
            <div>
            </div>
        `;
        
    }
        
    connectedCallback() 
    {
        this.parentElement.addEventListener("dataset-select", event=>
        {
            this.dom.querySelector("h3").textContent = event.detail.meta.name;
            this.dom.querySelector("p").textContent = event.detail.meta.description;
            
            let div = this.dom.querySelector("div");
            while (div.firstElementChild)
            {
                div.firstElementChild.remove();
            }
            
            let tags = event.detail.tags || [];
            tags.forEach(entry =>
            {
                if (entry.length > 0) // remove this test sometimes
                {
                    let tag = document.createElement("ui-tag");
                    tag.textContent = entry;
                    tag.toggleAttribute("disabled", true);
                    div.appendChild(tag);
                } 
            });
        });
    }
}

customElements.define("vx-dataset-info", VxDatasetInfo);




class VxSearchFilter extends HTMLElement 
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
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                }
            
                header { margin-top: 1em }
                main { margin-top: 1em }
                
                ui-tag-list { margin-top: 0.5em }
    
            </style>

            <main>
                <ui-selection-list single>
                    <button name="cloud" class="vx-secondary">Cloud</button>
                    <button name="model" class="vx-secondary">Model</button>
                    <button name="map" class="vx-secondary">Map</button>
                    <button name="panorama" class="vx-secondary">360</button>
                </ui-selection-list>
                <ui-tag-list>
                    <ui-tag-input  placeholder="tags..." type="text" ></ui-tag-input>
                </ui-tag-list>
            </main>	

        `;
        
        this.dom.querySelector("ui-tag-list").addEventListener("tags-changed", event =>  
        {
            this.parentElement.setAttribute("tags", event.detail);
            this.parentElement.reload();
        })
        
        let group = this.dom.querySelector("ui-selection-list");
        group.addEventListener("change", event => 
        {
            let button = group.querySelector("button[active]");
            if (button)
            {
                this.parentElement.setAttribute("type", button.getAttribute("name"));
            }
            else
            {
                this.parentElement.removeAttribute("type");
            }
            this.parentElement.reload();
        });
        
    }
        
    connectedCallback() 
    {
    }
}

customElements.define("vx-search-filter", VxSearchFilter);
