
class VaLine extends HTMLElement 
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
                    overflow: auto;
                    display: flex;
                    flex-direction: row;
                    padding:  0.5em 1em; 
                }
                
                :host-context(ui-collapsible[open]) ui-selection-list { visibility: visible; }
                
            </style>
                
            <div>
                <ui-selection-list multi>
                    <button name="angle" class="vx-secondary">Angle</button>
                    <button name="distance" class="vx-secondary">Distance</button>
                </ui-selection-list>	
            </div>

            `;			
            
        this.dom.querySelectorAll("ui-selection-list").forEach(group =>  
        {
            group.addEventListener("down", event =>
            {
                this.viewer.post("line.update", { id: this.id, mode: { [event.detail.getAttribute("name")] : true }});
            });
            
            group.addEventListener("up", event =>
            {
                this.viewer.post("line.update", { id: this.id, mode: { [event.detail.getAttribute("name")] : false }});
            });
        });
    }

    attach(viewer, meta)
    {
        this.viewer = viewer;
        
        this.viewer.on("line.update", (args, custom) =>
        {
            if (args.id != this.id)
            {
                return;
            }
        });
        
        viewer.on("line.create", (args, meta) =>
        {
            if (args.id != this.id)
            {
                return;
            }
            
            if (args.mode)
            {
                this.dom.querySelector("button[name='distance']").toggleAttribute("active", args.mode["distance"]);
                this.dom.querySelector("button[name='angle']").toggleAttribute("active", args.mode["angle"]);
            }
        });
        
        this.meta = meta;
    }
    
    static init(viewer) 
    {
        viewer.on("viewer.load", async (args) => 
        { 
            for (var id in args.meta.line || {})
            {
                let entry = args.meta.line[id];
                let meta = entry.meta || {};
                
                meta.vxOpen = false;
                meta.vxPanel = "va-line";
                meta.vxIcon = "fa-pencil-ruler";
                viewer.post("line.create", entry, meta);			
            }
        });
        
        viewer.on("line.record", (geometry, meta) =>
        {
            meta.vxOpen = true;
            meta.vxPanel = "va-line";
            meta.vxIcon = "fa-pencil-ruler";
            viewer.post("line.create", geometry, meta);			
        });
    }
}

customElements.define("va-line", VaLine);


