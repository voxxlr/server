
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
                    
                table 
                { 
                    flex-basis: 45%;
                    border-collapse:collapse; 
                    border-spacing: 0px;
                    font-size: 0.83em;
                }
                
                tr { line-height: 1.8em; }
                tr:not(:last-child) td { border-bottom: 2px solid var(--border); }
                
                :host-context([measure]) td.label { color: var(--active); }
                :host-context([compare]) td.label { color: var(--important); }
            
                td:nth-child(1) 
                { 
                }
                td:nth-child(2) 
                { 
                    text-align: right; 
                }
                
                :host > div
                {
                    flex-basis: 55%;
                    display: flex;
                    flex-direction: column;
                    align-items:  stretch;
                    justify-content: flex-end;
                    padding-left: 1em;
                }
                
                ui-selection-list 
                {
                    visibility: hidden; 
                    margin-top: 1em 
                }
                ui-selection-list button { flex: 1 }
                
                :host-context(ui-collapsible[open]) ui-selection-list { visibility: visible; }
                :host-context([measure]) { background-color: #228B2211; }
                :host-context([compare]) { background-color: #FFA50011; }
                
            </style>
            
            <table>
                <!--
                <tr>
                    <td class="label">dx</td><td id="dx">N/A</td>
                </tr>
                <tr>
                    <td class="label">dy</td><td id="dy">N/A</td>
                </tr>
                -->
                <tr>
                    <td class="label">min Height</td><td id="minH">N/A</td>
                </tr>
                <tr>
                    <td class="label">max Height</td><td id="maxH">N/A</td>
                </tr>
            </table>
            <div>
                <ui-selection-list single>
                    <button name="line" class="vx-primary">Show Profile</button>
                </ui-selection-list>	
            </div>

            `;			

        this.table = this.dom.querySelector("table");
        
        let button = this.dom.querySelector("ui-selection-list");
        button.addEventListener("down", async (event)=>
        {
            this.viewer.post("line.scan.start", { id: this.id, resolution: 1/500.0, direction: { x:0, y:1, z:0 } });
        });
        button.addEventListener("up", async (event)=>
        {
            this.viewer.post("line.scan.stop", { id: this.id });
        });
    }

        
    updateTable()
    {
        //this.dom.getElementById("dx").textContent = this.hasOwnProperty("aboveV") ? this.viewer.toString(this.dx,1) : "N/A";
        //delete this.dx;
        //this.dom.getElementById("dy").textContent = this.hasOwnProperty("belowV") ? this.viewer.toString(this.dy,1) : "N/A";
        //delete this.dy;
        this.dom.getElementById("minH").textContent = this.meta.hasOwnProperty("minH") ? this.viewer.toString(this.meta.minH,0) : "N/A";
        delete this.minH;
        this.dom.getElementById("maxH").textContent = this.meta.hasOwnProperty("maxH") ? this.viewer.toString(this.meta.maxH,0) : "N/A";
        delete this.maxH;
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
            
            if (!custom.hasOwnProperty("preserve"))
            {
                delete this.meta.minH;
                delete this.meta.maxH;
                this.updateTable();
            }
        });
        
        this.viewer.on("line.scan.start", (args) =>
        {
            this.dx = 0; 
            this.dy = 0;
            this.minH = Number.POSITIVE_INFINITY;
            this.maxH = Number.NEGATIVE_INFINITY;
        });
        
        this.viewer.on("line.scan.end", (args) =>
        {
            if (args.id != this.id)
            {
                return;
            }
            
            this.dom.querySelector("button[name='line']").removeAttribute("active");
            
            for (var id in args.samples)
            {
                let points = args.samples[id]; 
                    
                for (var i=0; i<args.count; i++)
                {
                    let height = points[i];
                    
                    if (height != Number.POSITIVE_INFINITY)
                    {
                        this.minH = Math.min(this.minH, height);
                        this.maxH = Math.max(this.maxH, height);
                    }
                }
            }
            
            this.meta.minH = this.minH;
            this.meta.maxH = this.maxH;
            this.updateTable();
        });
        
        this.viewer.on("line.scan.stop", (args) =>
        {
            if (args.id != this.id)
            {
                return;
            }
            
            this.dom.querySelector("button[name='line']").removeAttribute("active");
        });
        
        this.meta = meta;
        this.updateTable();
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
