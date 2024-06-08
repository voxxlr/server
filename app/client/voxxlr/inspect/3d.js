class View3D extends HTMLElement 
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
            
                .tools
                {
                    position: relative;
                    display: inline-block;
                    margin-left: 0.4em;
                    margin-top: 0.4em;
                }

            </style>
            
            <vx-viewer meta="photogrammetry,origin,measurements,annotations,status">
                <div class="tools">
                    <button id="line" class="vx-tool vx-secondary"><i class="fas fa-2x fa-pencil-ruler"></i>
                        <ui-tooltip hidden>
                            <p>Place 2+ points time to create a line</p>
                        </ui-tooltip>
                    </button>
                    <button id="polygon" class="vx-tool vx-secondary"><i class="fas fa-2x fa-draw-polygon"></i>
                        <ui-tooltip hidden>
                            <p>Place 3+ points time to create an area</p>
                        </ui-tooltip>
                    </button>
                    <button id="delete" class="vx-tool vx-secondary" disabled><i class="fas fa-2x fa-trash"></i>
                        <ui-tooltip hidden>
                            <p>Delete measurement</p>
                        </ui-tooltip>
                    </button>
                    <button id="target" class="vx-tool vx-secondary" hidden><i class="fas fa-2x fa-bullseye"></i>
                        <ui-tooltip hidden>
                            <p>Show/hide target</p>
                        </ui-tooltip>
                    </button>
                </div>
            </vx-viewer>

        `;
                
        this.viewer = this.dom.querySelector("vx-viewer");	
        
        //
        // pciture icon -- ununsed right now
        // 
        let photo = { type: "point", constraint: "intersect", };
        photo.code =
        {
             init: encodeURI(function()
             {
                 this.icon = new Image();
                 this.icon.src = this.image;
             }.toString()),

             render2d: encodeURI(function(ctx, state)
             {
                let a = this.radius/2;
                ctx.drawImage(this.icon, -a, -a, this.radius, this.radius);
                return false;
             }.toString()),
         
             update: encodeURI(function(state)
             {
                if (state.image)
                {
                     this.icon.src = state.image;
                     this.frequency = state.frequency;
                }
                Object.assign(this, state);
             }.toString()),
            
             intersect: encodeURI(function(ctx, x, y, state)
             {
                var r = this.radius*state.scale;
                var dx = state.x - x;
                var dy = state.y - y;
                return dx*dx+dy*dy < r*r;
             }.toString()),
        }
        photo.scope = 
        {
            selected: false,
            radius: 20,
            image: "data:image/png;base64,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"
        };
        
        photo.activation = 
        {
            easing: "Linear", 
            p0: 5.8927851199531398, 
            p1: 19.048917567781293
        }
        
        //
        // Viewer Events
        //
        
        this.viewer.on("viewer.load", async (args, custom) => 
        {
            let up = args.meta.photogrammetry.up ; 
            
             //args.meta.photogrammetry.up 
        
            this.viewer.post("camera.set", { K: args.meta.photogrammetry.camera.K });
            this.viewer.post("viewer.update", { clearColor: [0.0078,0.22,0.326,1] })		
            this.viewer.post(["controller.set", "target"], [
                            { name: "orbiter", up: { x:-0.049788534044830544, y:0.9883428157067542, z:-0.14387348789305016 } }, 
                            { mode: "manual", visible: false, color: [1.0,0.0,0.502], radius: 24 }
                            ]);
 
            // show tool panels
            //this.dom.getElementById("target").toggleAttribute("active", true);
            //this.dom.getElementById("target").hidden = false;
            
            this.dispatchEvent(new CustomEvent('viewer.load', { detail: args }));
        });

        let selected

        this.viewer.on("viewer.dblclick", event => 
        { 
            if (event.distance != Number.POSITIVE_INFINITY)
            {
                if (this.dom.getElementById("delete").disabled)
                {
                    this.viewer.post(["controller.target", "target"], [  event.xyz, { point: event.xyz, normal: event.normal }])
                }
            }
            
            if (!this.dom.getElementById("delete").disabled)
            {
                this.viewer.post("*.unselect", {});            	
            }
        });

        this.viewer.on("viewer.unload", (args) => 
        {
            // reset tool panels
            this.dom.getElementById("target").hidden = true;
            this.dom.getElementById("delete").disabled = true;
            this.dom.getElementById("line").toggleAttribute("disabled", false);
            this.dom.getElementById("line").toggleAttribute("active", false);
            this.dom.getElementById("polygon").toggleAttribute("disabled", false);
            this.dom.getElementById("polygon").toggleAttribute("active", false);
            
            this.dispatchEvent(new CustomEvent('viewer.unload', { detail: args }));
        });

        this.viewer.on(["line.record", "polygon.record"], args => 
        {
            args.mode = { distance: true };
            this.viewer.post(`${args.type}.create`, args, { selected: true })	
        }); 
        this.viewer.on(["line.create", "polygon.create"], (args,custom) => 
        {
            this.dom.getElementById("polygon").toggleAttribute("active", false);
            this.dom.getElementById("polygon").disabled = false;
            this.dom.getElementById("line").toggleAttribute("active", false);
            this.dom.getElementById("line").disabled = false;
            if (custom.selected)
            {
                this.viewer.post(`${args.type}.select`, args);
            }
        });
        this.viewer.on(["line.select","polygon.select"], args=> this.dom.getElementById("delete").disabled = false);
        this.viewer.on(["line.unselect","polygon.unselect"], args => this.dom.getElementById("delete").disabled = true);
        this.viewer.on(["line.dblclick","polygon.dblclick"], args =>
        {
            this.viewer.post("*.unselect", {});            	
            this.viewer.post(`${args.type}.select`, args);
        });
        

        this.dom.querySelectorAll("#line, #polygon").forEach(button =>
        {
            button.addEventListener("click", event =>
            {
                // update button
                let current = this.dom.querySelector("vx-viewer > button[active]");
                if (current)
                {
                    current.toggleAttribute("active", false);	
                }
                event.currentTarget.toggleAttribute("active", true);
                
                if (event.currentTarget.id == "line")
                {
                    this.dom.getElementById("polygon").disabled = true;
                }
                else if (event.currentTarget.id == "polygon")
                {
                    this.dom.getElementById("line").disabled = true;
                }
                
                // update viewer 
                this.viewer.post("*.unselect", {});            	
                this.viewer.post(`${event.currentTarget.id}.record`, { distance: true });
            });
        });

        this.dom.getElementById("delete").addEventListener("click", async (event) =>
        {
            let selected = await this.viewer.wait("*.selected.get", { });
            for (var id in selected)
            {
                this.viewer.post(`${selected[id].type}.delete`, {id});
            }
        });
        this.dom.getElementById("target").addEventListener("click", event => this.viewer.post("target", { visible: event.currentTarget.toggleAttribute("active")} ))
    }

    connectedCallback() 
    {
        this.viewer.init("cloud");
    }
    
    attributeChangedCallback(name, oldValue, newValue)
    {
        //if (name == "token")
        //{
        //	this.viewer.load(newValue);
        //} 
    }


    setCamera(matrix)
    {
        this.viewer.post("controller.set", { matrix, orbit: 5 });
    }

       
    async getView()
    {
        await this.viewer.post("*.unselect", {});
        let config =
        {
            viewpoint: await this.viewer.wait("viewpoint.get"),
            line: await this.viewer.wait("line.get"),
            polygon: await this.viewer.wait("polygon.get")
        };
        return config;
    }	
    
    setView(config)
    {
        this.viewer.post("viewpoint", config.viewpoint);
        for (var id in config.line)
        {
            this.viewer.post("line.create", config.line[id]);
        }
        for (var id in config.polygon)
        {
            this.viewer.post("polygon.create", config.polygon[id]);
        }
    }
    

    async getImage()
    {
        return await this.viewer.wait("viewer.image.get", 
                                        { 
                                           //width: 2480,
                                           //height: 2480*Math.sqrt(2),
                                           overlay: true,
                                           type: "image/jpeg", 
                                           options: 0.8
                                        });
    }

    getViewer()
    {
        return this.viewer;
    }
}

customElements.define("view-3d", View3D);

