class VxOverlay extends HTMLElement 
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
                }
                    
                ui-collapsible div[slot="actions"] i 
                {
                    cursor: pointer; 
                    color: var(--primary);
                    padding: 0.3em;
                }	

                ui-collapsible div[slot="actions"] i.fa-eye-slash 
                {
                    color: var(--border);
                }

                ui-collapsible div[slot="header"] { display: flex; }

                ui-collapsible div[slot="header"] i 
                {     
                    cursor: pointer; 
                    color: var(--primary);
                    margin-left: 0.2em;
                }

                ui-collapsible div[slot="header"] i:first-of-type
                { 
                    color: grey;
                    display: inline-block;
                    margin-right: 0.5em; 
                }
                
                ui-collapsible div[slot="header"] input 
                {
                    border: none;
                    background-color: transparent;	
                    flex: 1;
                    pointer-events:none; 
                }
    

            </style>
            
            <ui-collapsible-list>
            </ui-collapsible-list>
            
            <slot name="actions"></slot>

            <template>
                <div slot="header">
                    <i class="fas"></i>
                    <input/>
                    <i class="fas fa-trash"></i>
                    <i class="fas fa-eye" visibility></i>
                </div>
            </template>                        
    `;
           
        this.list = this.dom.querySelector("ui-collapsible-list")
        this.list.addEventListener("open", event=>
        {
            this.list.select(event.target);
            let panel = event.target.firstElementChild;
            this.viewer.post(panel.type+".select", { id:panel.id });
            this.dispatchEvent(new CustomEvent('item-focus', { bubbles: true, composed: true, detail: { id: panel.id, type: panel.type }} ));
        });
        
        this.list.addEventListener("close", async(event) =>
        {
            this.list.unselect(event.target);
            let panel = event.target.firstElementChild;
            this.viewer.post(panel.type+".unselect", { id:panel.id });
            this.dispatchEvent(new CustomEvent('item-focus', { bubbles: true, composed: true, detail: { id: panel.id, type: panel.type }} ));
        });

        this.list.addEventListener("select", event=>
        {
            let panel = event.target.firstElementChild;
            this.viewer.post(panel.type+".select", { id:panel.id }, {  });
            this.dispatchEvent(new CustomEvent('item-focus', { bubbles: true, composed: true, detail: { id: panel.id, type: panel.type }} ));
        });
        
        this.list.addEventListener("unselect", async(event) =>
        {
            let panel = event.target.firstElementChild;
            this.viewer.post(panel.type+".unselect", { id:panel.id });
            this.dispatchEvent(new CustomEvent('item-focus', { bubbles: true, composed: true, detail: { id: panel.id, type: panel.type }} ));
        });
  
        this.template = this.dom.querySelector("template");
    }
    
    attach(viewer)
    {
        this.viewer = viewer;

        this.viewer.on("viewer.unload", document =>
        {
            while (this.list.firstElementChild)
            {
                this.list.firstElementChild.remove();
            }
        });
        
        this.viewer.on(["line.create", "polygon.create", "floodfill.create", "point.create","import.create"], (geometry, meta, action) =>
        {
            if (!meta.vxPanel)
            {
                return;
            }
            
            let panel = document.createElement(meta.vxPanel);
            if (action == "import.create")
            {
                panel.id = meta.id;
                panel.type = meta.type;
            }
            else
            {
                panel.id = geometry.id;
                panel.type = geometry.type;
            }
            panel.attach(viewer, meta);

            let header =  this.template.content.cloneNode(true).firstElementChild;

            let icon = header.querySelector("i:first-of-type");
            icon.setAttribute("class", `fas ${meta.vxIcon}`);
                
            let input = header.querySelector("input");
            input.value = geometry.type;

            header.querySelector(".fas.fa-trash").addEventListener("click", event =>
            {
                let panel = event.currentTarget.closest("ui-collapsible").firstElementChild;
                this.viewer.post(`${panel.type}.delete`, { id: panel.id  });
                event.stopPropagation();
                event.preventDefault();	
            });

            header.querySelector(".fas.fa-eye").addEventListener("click", event =>
            {
                let panel = event.currentTarget.closest("ui-collapsible").firstElementChild;
                let classList = event.currentTarget.classList;
                if (classList.contains("fa-eye"))
                {
                    this.viewer.post(`${panel.type}.update`, { id: panel.id, visible: false  });
                }
                else if (classList.contains("fa-eye-slash"))
                {
                    this.viewer.post(`${panel.type}.update`, { id: panel.id, visible: true  });
                }
                event.stopPropagation();
                event.preventDefault();	
            });
            
            let collapsible = document.createElement("ui-collapsible");
            collapsible.appendChild(panel)
            collapsible.appendChild(header)
            this.list.insertBefore(collapsible, this.list.firstElementChild);
            if (meta.vxOpen)
            {
                this.list.open(collapsible);
                this.list.select(collapsible);
                delete meta.vxOpen;
            }

            delete meta.vxIcon;
            delete meta.vxPanel;
        });
            
        this.viewer.on(["line.delete", "polygon.delete", "floodfill.delete", "point.delete","import.delete"], (args, custom) =>
        {
            let panel = this.dom.getElementById(args.id);
            if (panel)
            {
                panel.parentElement.remove();
            }
        });

        this.viewer.on(["line.dblclick","polygon.dblclick","floodfill.dblclick","point.dblclick"], (args)=>
        {
            let selected = this.list.querySelector("[selected]");
            if (selected)
            {
                this.viewer.post(selected.firstElementChild.type+".unselect", { id:selected.firstElementChild.id });
            }
            this.viewer.post(args.type+".select", { id:args.id });
            
            let panel = this.dom.getElementById(args.id);
            if (panel)
            {
                this.list.open(panel.parentElement);
                this.list.select(panel.parentElement);
            }
        });
        
        this.viewer.on(["import.dblclick"], (args)=>
        {
            let selected = this.list.querySelector("[selected]");
            if (selected)
            {
                this.viewer.post(selected.firstElementChild.type+".unselect", { id:selected.firstElementChild.id });
            }
            
            this.viewer.post("import.select", { id:args.id });
        });		
        
        
        this.viewer.on(["line.update","polygon.update","floodfill.update","point.update","import.update"], (args)=>
        {
            if (args.hasOwnProperty("visible"))
            {
                let panel = this.dom.getElementById(args.id);
                
                if (panel)
                {
                    let icon = panel.parentElement.querySelector("i[visibility]");
                    
                    let classList = icon.classList;
                    classList.toggle("fa-eye", args.visible)
                    classList.toggle("fa-eye-slash", !args.visible)
                }
            }
        });
        
        this.viewer.on("viewer.dblclick",  (args) =>
        {
            let collapsible = this.list.querySelector("[selected]");
            if (collapsible)
            {
                this.viewer.post(collapsible.firstElementChild.type+".unselect", { id:collapsible.firstElementChild.id });
                this.list.unselect(collapsible);
            }
        });
    }
    
    async save(patch)
    {
        let object = {}
        object.polygon = {};
        object.line = {};
        object.floodfill = {};
        object.point = {};
        object.import = {};
        
        let list = await this.viewer.wait("*.get");
        for (var id in list)
        {
            let element = this.dom.getElementById(id);
            if (element)
            {
                if (element.save)
                {
                    element.save();
                }
                
                let type = object[list[id].type];
                
                type[id] = list[id];
                if (element.meta)
                {
                    type[id].meta = element.meta;
                    type[id].meta.name = element.parentElement.querySelector("input").value;
                }
            }
        }

        patch.push({ op: "replace", path: "/polygon", value: object.polygon })
        patch.push({ op: "replace", path: "/line", value: object.line })
        patch.push({ op: "replace", path: "/floodfill", value: object.floodfill })
        patch.push({ op: "replace", path: "/point", value: object.point })
        patch.push({ op: "replace", path: "/import", value: object.import })
    }
}

customElements.define("vx-overlay", VxOverlay);

