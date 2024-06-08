class View2D extends HTMLElement 
{
    static get observedAttributes() 
    {
        return ['camera'];
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
            
                .tools
                {
                    position: relative;
                    display: inline-block;
                    margin-left: 0.4em;
                    margin-top: 0.4em;
                }
            
            </style>
            
            <vx-viewer src="${window.doc_domain}/2D/index.html">
                <div class="tools">
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
                </div>
                
                <ui-modal hidden>
                    Loading Image ...  
                </ui-modal>
            </vx-viewer>
            
        `;
        
        this.viewer = this.dom.querySelector("vx-viewer");
        
        this.viewer.on("viewer.load", (args, custom) => 
        {
            this.viewer.post("splitter", { u: 1, v: 1, visible:false });
        });

        this.pendingView = null
        this.viewer.on("import.create", async (args, custom) => 
        {
            if (this.image)
            {
                this.viewer.post("import.delete", { id: this.image });
            }
            this.image = args.id;
            
            if 	(this.pendingView)
            {
                this.setView(this.pendingView)
                this.pendingView = null;
            }
            else
            {
                await this.viewer.post("camera.set", { id: args.id, visible: true });
            }
            
            this.viewer.post(["import.update"], [{ id: args.id, visible: true }]);
            this.dom.querySelector("ui-modal").hidden = true;				
        });

        this.viewer.on("viewer.dblclick", event => 
        { 
            if (event.distance != Number.POSITIVE_INFINITY)
            {
                if (this.dom.getElementById("delete").disabled)
                {
                    this.viewer.post(["controller.target", "target"], [  event.xyz, { point: event.xyz }])
                }
            }
            
            if (!this.dom.getElementById("delete").disabled)
            {
                this.viewer.post("*.unselect", {});            	
            }
        });


        this.viewer.on("polygon.record", args => 
        {
            this.viewer.post(`${args.type}.create`, args, { selected: true }) 	
        });
        this.viewer.on("polygon.create", async (args, custom) => 
        {
            this.dom.getElementById("polygon").toggleAttribute("active", false);
            this.dom.getElementById("polygon").disabled = false;
            if (custom.selected)
            {
                this.viewer.post(`${args.type}.select`, args);
            }
                
            let x = args.points[0].x/256;
            let y = args.points[0].y/256;
            
            x = args.points[1].x/256;
            y = args.points[1].y/256;
        });
        this.viewer.on(["line.select","polygon.select"], args=> this.dom.getElementById("delete").disabled = false);
        this.viewer.on(["line.unselect","polygon.unselect"], args => this.dom.getElementById("delete").disabled = true);
        this.viewer.on(["line.dblclick","polygon.dblclick"], args =>
        {
            this.viewer.post("*.unselect", {});            	
            this.viewer.post(`${args.type}.select`, args);
        });

        this.dom.getElementById("polygon").addEventListener("click", event =>
        {
            let current = this.dom.querySelector("vx-viewer > button[active]");
            if (current)
            {
                current.toggleAttribute("active", false);	
            }
            event.currentTarget.toggleAttribute("active", true);
            
            this.viewer.post("*.unselect", {});            	
            this.viewer.post(`${event.currentTarget.id}.record`, { });
        });
        
        this.dom.getElementById("delete").addEventListener("click", async (event) =>
        {
            let selected = await this.viewer.wait("*.selected.get", { });
            for (var id in selected)
            {
                this.viewer.post(`${selected[id].type}.delete`, {id});
            }
        });
    }
     
    attributeChangedCallback(name, oldValue, newValue)
    {
        if (name == "camera")
        {
            this.camera = JSON.parse(newValue);
            
            let s = Math.min(256.0/this.camera.height, 256.0/this.camera.width);
            
            this.camera.x0 = 0.5*(256-this.camera.width*s);
            this.camera.y0 = 0.5*(256-this.camera.height*s);
            this.camera.x1 = 256 - this.camera.x0;
            this.camera.y1 = 256 - this.camera.y0;
        } 
    }

    async getView()
    {
        await this.viewer.post("*.unselect", {});
        let config =
        {
            image: this.image,
            viewpoint: await this.viewer.wait("viewpoint.get"),
            line: await this.viewer.wait("line.get"),
            polygon: await this.viewer.wait("polygon.get")
        };
        return config;
    }	
    
    setView(config)
    {
        if (this.image != config.image)
        {
            this.pendingView = config;
        }
        else
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
        
    
    async loadImage(name)
    {
        if (name != this.image)
        {
            let list = await this.viewer.wait("*.get", {});
            for (var id in list)
            {
                this.viewer.post(`${list[id].type}.delete`, { id });
            }
        
            this.dom.querySelector("ui-modal").hidden = false;				
            
            fetch(`${window.doc_domain}/file/`+name, 
            { 
                method: 'GET', 
                headers: new Headers({
                 'x-doc-token': decodeURIComponent(this.getAttribute("token")), 
                 'Content-Type': "application/json",
                })
            }).then(async (response) =>
            {
                if (response.ok)
                {
                    let file = await response.json();
                    this.viewer.post("import.create", { id: file[0].path, source: file[0].url, type: "image", x0:this.camera.x0, y0:this.camera.y0, x1:this.camera.x1, y1: this.camera.y1, visible: false });
                }
            })
        }
    }
    
    
    setViewpoint(viewpoint)
    {
        if (this.host.hasAttribute("hidden"))
        {
            this.pendingView = viewpoint;
        }
        else
        {
            /*
            if (!selected || selected.id != record["2D"].image)
            {
                pendingView = record["2D"].viewpoint;
                
                images.select(images.querySelector(`#${record["2D"].image.replaceAll("\.","\\\.")}`), true);
            }
            else
            {
                viewer2d.post("viewpoint", record["2D"].viewpoint)       	 				
            }
            */
        };
    }
}

customElements.define("view-2d", View2D);

