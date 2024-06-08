
class VaFloodfill extends HTMLElement 
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
                
                td.above { color: green; }
                td.below { color: red; }
            
                :host-context([measure]) table.compare { display: none; }
                :host-context([compare]) table.measure { display: none; }
            
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
            
            <table class="measure">
                <tr>
                    <td class="above">Volume</td><td id="volume">N/A</td>
                </tr>
                <tr>
                    <td class="above">Area</td><td id="area">N/A</td>
                </tr>
            </table>
        
            <table class="compare">
                <tr>
                    <td class="above">Volume Added</td><td id="addedV">N/A</td>
                </tr>
                <tr>
                    <td class="below">Volume Removed</td><td id="removedV">N/A</td>
                </tr>
            </table>
            
            <div>
                <ui-selection-list single>
                    <button name="upward" class="vx-primary">Scan above</button>
                    <button name="downward" class="vx-primary">Scan below</button>
                </ui-selection-list>	
            </div>

            `;			

        this.table = this.dom.querySelector("table");
        
        let button = this.dom.querySelector("ui-selection-list")
        button.addEventListener("down", async (event)=>
        {
            this.viewer.post("floodfill.scan.start", { id: this.id, mode: event.detail.getAttribute("name") });
        });
        button.addEventListener("up", async (event)=>
        {
            this.viewer.post("floodfill.scan.stop", { id: this.id  });
        });
    }
    
    updateTable()
    {
        // measure		
        this.dom.getElementById("volume").textContent = this.meta.hasOwnProperty("volume") ? this.viewer.toString(this.meta.volume,3) : "N/A";
        delete this.volume;
        this.dom.getElementById("area").textContent = this.meta.hasOwnProperty("area") ? this.viewer.toString(this.meta.area,2) : "N/A";
        delete this.area;

        // compare		
        this.dom.getElementById("addedV").textContent = this.meta.hasOwnProperty("addedV") ? this.viewer.toString(this.meta.addedV,3) : "N/A";
        delete this.addedV;
        this.dom.getElementById("removedV").textContent = this.meta.hasOwnProperty("removedV") ? this.viewer.toString(this.meta.removedV,3) : "N/A";
        delete this.removedV;
    }

    attach(viewer, meta)
    {
        this.viewer = viewer;
        
        this.viewer.on("floodfill.update", (args) =>
        {
            if (args.id != this.id)
            {
                return;
            }
            
            // measure		
            delete this.meta.volume;
            delete this.meta.area;

            // compare		
            delete this.meta.addedV;
            delete this.meta.removedV;
            
            this.updateTable();
        });

        viewer.on("floodfill.scan.start", (args) =>
        {
            if (args.id != this.id)
            {
                return;
            }
            
            // measure		
            delete this.meta.volume;
            delete this.meta.area;

            // compare		
            delete this.meta.addedV;
            delete this.meta.removedV;
            
            this.updateTable();
            
            let keys = Object.keys(args.samples);
            if (keys.length == 1)
            {
                this.volume = 0; 
                this.area = 0;
            }
            else
            {
                this.addedV = 0; 
                this.removedV = 0;
            }
        });
                
        viewer.on("floodfill.scan.sample", (args) =>
        {
            if (args.id != this.id)
            {
                return;
            }
            
            let resolution = args.resolution;

            let keys = Object.keys(args.samples);
            if (keys.length == 1)
            {
                let volume = 0;
                let area = 0;
                args.samples[keys[0]].forEach((value) =>
                {
                    if (value != Number.POSITIVE_INFINITY)
                    {
                        volume += resolution*resolution*value;
                        area += resolution*resolution;
                    }
                });
                
                this.volume += volume;
                this.area += area;
            }
            else if (keys.length == 2)
            {
                let s0 = args.samples[keys[0]];
                let s1 = args.samples[keys[1]];
                
                let addedV = 0;
                let removedV = 0;
                for (var i=0; i<s0.length; i++)
                {
                    let v0 = s0[i];
                    let v1 = s1[i];
                    if (v0 != Number.POSITIVE_INFINITY && v1 != Number.POSITIVE_INFINITY)
                    {
                        if (v0 > v1)
                        {
                            addedV += v0 - v1;
                        }
                        else
                        {
                            removedV += v1 - v0;
                        }
                    }
                };
                
                this.addedV += resolution*resolution*addedV;
                this.removedV += resolution*resolution*removedV
            }
        });
                    
        viewer.on("floodfill.scan.end", async (args) =>
        {
            if (args.id != this.id)
            {
                return;
            }
            
            this.dom.querySelector("button[name='upward']").removeAttribute("active");
            this.dom.querySelector("button[name='downward']").removeAttribute("active");
            
            // measure
            if (this.hasOwnProperty("volume"))
            {
                this.meta.volume = this.volume;
                this.meta.area = this.area;
            }
            
            // compare
            if (this.hasOwnProperty("addedV"))
            {
                this.meta.addedV = this.addedV;
                this.meta.removedV = this.removedV;
            }
            
            this.updateTable();
        });
        
        viewer.on("floodfill.scan.stop", async (args) =>
        {
            if (args.id != this.id)
            {
                return;
            }
            
            this.dom.querySelector("button[name='upward']").removeAttribute("active");
            this.dom.querySelector("button[name='downward']").removeAttribute("active");
        });

        
        this.meta = meta;
        this.updateTable();
    }
    
    static init(viewer) 
    {
        viewer.on("viewer.load", async (args) => 
        { 
            for (var id in args.meta.floodfill || {})
            {
                let entry = args.meta.floodfill[id];
                let meta = entry.meta || {};
                
                meta.vxOpen = false;
                meta.vxPanel = "va-floodfill";
                meta.vxIcon = "fa-fill";
                viewer.post("floodfill.create", entry, meta);			
            }
        });
        
        viewer.on("floodfill.record", (geometry, meta) =>
        {
            meta.vxOpen = true;
            meta.vxPanel = "va-floodfill";
            meta.vxIcon = "fa-fill";
            viewer.post("floodfill.create", geometry, meta);			
        });
    }
}

customElements.define("va-floodfill", VaFloodfill);
            /*
            if (this.hasOwnProperty("volume"))
            {
                this.addRow("volume", this.viewer.toString(this.volume,3),"green");
                delete this.aboveV;
            }
                
            if (this.hasOwnProperty("area"))
            {
                this.addRow("area", this.viewer.toString(this.area,2),"green")
                delete this.aboveA;
            }
            */
                /*
            if (this.hasOwnProperty("addedV"))
            {
                this.addRow("volume added", this.viewer.toString(this.addedV,3),"green");
                delete this.addedV;
            }
            if (this.hasOwnProperty("removedV"))
            {
                this.addRow("volume removed", this.viewer.toString(this.removedV,3),"red")
                delete this.removedV;
            }
            */
