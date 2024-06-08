
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
                    <td class="above">Volume Above</td><td id="aboveV">N/A</td>
                </tr>
                <tr>
                    <td class="above">Area Above</td><td id="aboveA">N/A</td>
                </tr>
                <tr>
                    <td class="below">Volume Below</td><td id="belowV">N/A</td>
                </tr>
                <tr>
                    <td class="below">Area Below</td><td id="belowA">N/A</td>
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
                    <button name="volume" class="vx-primary">Scan</button>
                </ui-selection-list>	
            </div>

            `;			

        
        let button = this.dom.querySelector("ui-selection-list")
        button.addEventListener("down", async (event)=>
        {
            this.viewer.post("polygon.scan.start", { id: this.id, resolution: 1/2000.0 });
        });
        button.addEventListener("up", async (event)=>
        {
            this.viewer.post("polygon.scan.stop", { id: this.id });
        });
    }
        
    updateTable()
    {
        // measure		
        this.dom.getElementById("aboveV").textContent = this.meta.hasOwnProperty("aboveV") ? this.viewer.toString(this.meta.aboveV,3) : "N/A";
        delete this.aboveV;
        this.dom.getElementById("belowV").textContent = this.meta.hasOwnProperty("belowV") ? this.viewer.toString(this.meta.belowV,3) : "N/A";
        delete this.belowV;
        this.dom.getElementById("aboveA").textContent = this.meta.hasOwnProperty("aboveA") ? this.viewer.toString(this.meta.aboveA,2) : "N/A";
        delete this.aboveA;
        this.dom.getElementById("belowA").textContent = this.meta.hasOwnProperty("belowA") ? this.viewer.toString(this.meta.belowA,2) : "N/A";
        delete this.belowA;

        // compare		
        this.dom.getElementById("addedV").textContent = this.meta.hasOwnProperty("addedV") ? this.viewer.toString(this.meta.addedV,3) : "N/A";
        delete this.addedV;
        this.dom.getElementById("removedV").textContent = this.meta.hasOwnProperty("removedV") ? this.viewer.toString(this.meta.removedV,3) : "N/A";
        delete this.removedV;
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

            if (!custom.hasOwnProperty("preserve"))
            {
                delete this.meta.aboveV;
                delete this.meta.belowV;
                delete this.meta.aboveA;
                delete this.meta.belowA;

                delete this.meta.addedV;
                delete this.meta.removedV;

                this.updateTable();
            }
        });

        this.viewer.on("polygon.scan.start", (args) =>
        {
            if (args.id != this.id)
            {
                return;
            }
            
            // measure		
            delete this.meta.aboveV;
            delete this.meta.belowV;
            delete this.meta.aboveA;
            delete this.meta.belowA;

            // compare		
            delete this.meta.addedV;
            delete this.meta.removedV;
            
            this.updateTable();
            
            let keys = Object.keys(args.samples);
            if (keys.length == 1)
            {
                this.aboveV = 0; 
                this.aboveA = 0;
                this.belowV = 0;
                this.belowA = 0;
            }
            else
            {
                this.addedV = 0; 
                this.removedV = 0;
            }
        });
                
        this.viewer.on(["polygon.scan.sample"], (args) =>
        {
            if (args.id != this.id)
            {
                return;
            }
            
            let resolution = args.resolution;
            let aboveV = 0;
            let aboveA = 0;
            let belowV = 0;
            let belowA = 0;

            let keys = Object.keys(args.samples);
            if (keys.length == 1)
            {
                // measure		
                args.samples[keys[0]].forEach((value) =>
                {
                    if (value != Number.POSITIVE_INFINITY)
                    {
                        if (value > 0)
                        {
                            aboveV += resolution*resolution*value;
                            aboveA += resolution*resolution;
                        }
                        else
                        {
                            belowV += -resolution*resolution*value;
                            belowA += resolution*resolution;
                        }
                    }
                });
                
                this.aboveV += aboveV;
                this.aboveA += aboveA;
                this.belowV += belowV;
                this.belowA += belowA;
            }
            else if (keys.length == 2)
            {
                // compare		
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
                    
        this.viewer.on("polygon.scan.end", async (args) =>
        {
            if (args.id != this.id)
            {
                return;
            }
            
            this.dom.querySelector("button[name='volume']").removeAttribute("active");
            
            // measure
            if (this.hasOwnProperty("aboveV"))
            {
                this.meta.aboveV = this.aboveV;
                this.meta.belowV = this.belowV;
                this.meta.aboveA = this.aboveA;
                this.meta.belowA = this.belowA;
            }
            
            // compare
            if (this.hasOwnProperty("addedV"))
            {
                this.meta.addedV = this.addedV;
                this.meta.removedV = this.removedV;
            }

            this.updateTable();
        });
        
        this.viewer.on("polygon.scan.stop", async (args) =>
        {
            if (args.id != this.id)
            {
                return;
            }
            
            this.dom.querySelector("button[name='volume']").removeAttribute("active");
            
            this.updateTable();
        });
        
        this.meta = meta;
        this.updateTable();
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



                
            /*
            if (this.viewer.is("3D"))
            {
                if (this.hasOwnProperty("aboveV"))
                {
                    this.addRow("Volume", this.viewer.toString(this.aboveV,3), "grey");
                    delete this.aboveV;
                }
                if (this.hasOwnProperty("aboveA"))
                {
                    this.addRow("Area", this.viewer.toString(this.aboveA,2), "grey")
                    delete this.aboveA;
                }
            }
            else
            {
                */
                /*
                if (this.hasOwnProperty("addedV"))
                {
                    this.addRow("Volume added", this.viewer.toString(this.addedV,3),"green");
                    delete this.addedV;
                }
                if (this.hasOwnProperty("removedV"))
                {
                    this.addRow("Volume removed", this.viewer.toString(this.removedV,3),"red")
                    delete this.removedV;
                }
                */
                /*
            }
            */

