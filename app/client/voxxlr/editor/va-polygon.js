
class VaPolygon extends HTMLElement 
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
                     padding:  0.5em 1em; 
                }
                
                :host-context(ui-collapsible[open]) ui-selection-list { visibility: visible; }
    
                :host > div
                {
                    flex-basis: 55%;
                    display: flex;
                    flex-direction: column;
                    align-items:  stretch;
                    justify-content: flex-end;
                    padding-left: 1em;
                }
                
                :host > table
                {
                    flex-basis: 45%;
                }
         
            </style>
                
            <table>
                <tr>
                    <td>Area</td><td id="area"></td>
                </tr>
                <tr>
                    <td>Perimeter</td><td id="perimeter"></td>
                </tr>
            </table>

            <div>
                <ui-selection-list id="line-mode" multi>
                    <button name="angle" class="vx-secondary">Angle</button>
                    <button name="distance" class="vx-secondary">Distance</button>
                </ui-selection-list>	
            </div>
            `;			
        
        this.dom.querySelectorAll("ui-selection-list").forEach(group =>  
        {
            group.addEventListener("down", event =>
            {
                this.viewer.post("polygon.update", { id: this.id, mode: { [event.detail.getAttribute("name")] : true }});
            });
            
            group.addEventListener("up", event =>
            {
                this.viewer.post("polygon.update", { id: this.id, mode: { [event.detail.getAttribute("name")] : false }});
            });
        });
    }

    attach(viewer, meta)
    {
        this.viewer = viewer;
        
        this.viewer.on("polygon.update", (args, custom) =>
        {
            if (args.id != this.id)
            {
                return;
            }

            // make sure area is positive
            this.meta.area = 0;      
            this.meta.perimeter = 0;      
            for (var i=0; i<custom.uv.length-1; i++)
            { 
                let e0 = custom.uv[i];
                let e1 = custom.uv[i+1];
                this.meta.area += (e0.u+e1.u) * (e0.v-e1.v);
                
                let du = e1.u - e0.u;
                let dv = e1.v - e0.v;
                this.meta.perimeter += Math.sqrt(du*du+dv*dv); 
            }
            this.meta.area /= 2;
            
            this.dom.getElementById("area").textContent = this.viewer.toString(this.meta.area,2);
            this.dom.getElementById("perimeter").textContent = this.viewer.toString(this.meta.perimeter,1);
        });
        
        viewer.on("polygon.create", (args, meta) =>
        {
            if (args.id != this.id)
            {
                return;
            }
            
            if (args.mode)
            {
                this.dom.querySelector("button[name='distance']").toggleAttribute("active", args.mode["distance"]);
                this.dom.querySelector("button[name='angle']").toggleAttribute("active", args.mode.hasOwnProperty("angle"));
            }
        });
        
        this.meta = meta;
        this.dom.getElementById("area").textContent = this.viewer.toString(this.meta.area,2);
        this.dom.getElementById("perimeter").textContent = this.viewer.toString(this.meta.perimeter,1);
    }
    
    static create(viewer, args, meta, open) 
    {
        meta.vxNew = open;
        meta.vxPanel = "va-polygon";
        meta.vxIcon = "fa-draw-polygon";
        viewer.post("polygon.create", args, meta);			
    }

    static init(viewer) 
    {
        viewer.on("viewer.load", async (args) => 
        { 
            for (var id in args.meta.polygon || {})
            {
                let entry = args.meta.polygon[id];
                let meta = entry.meta || {};
                
                meta.vxOpen = false;
                meta.vxPanel = "va-polygon";
                meta.vxIcon = "fa-draw-polygon";
                viewer.post("polygon.create", entry, meta);			
            }
        });
        
        viewer.on("polygon.record", (geometry, meta) =>
        {
            meta.vxOpen = true;
            meta.vxPanel = "va-polygon";
            meta.vxIcon = "fa-draw-polygon";
            viewer.post("polygon.create", geometry, meta);
        });
    }
}

customElements.define("va-polygon", VaPolygon);


