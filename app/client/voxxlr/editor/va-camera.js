
class VaCamera extends HTMLElement 
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
                    padding: 0px 5px 5px 5px;
                    display: flex;
                }
            
                :host([hidden]) { display: none; }
            
                .panel
                {
                    flex: 1;
                    display: flex;
                    margin-left: 1em;
                }
                
                .panel > div
                {
                    flex: 1;
                    display: flex;
                    justify-content: center;
                    align-items: stretch;
                }				
                .panel > div[hidden] 
                {
                    display: none;
                }
                
                .column
                {
                    justify-content: center;
                    display: flex;
                    flex-direction: column;
                    align-items: flex-end;
                    padding-right: 2em;
                }
                
                
            </style>
            
            <ui-selection-list single required>
                <button id="inspect" class="vx-tool vx-secondary"><i class="fas fa-2x fa-satellite"></i>
                    <span>Inspect</span>
                </button>
                <button id="explore" class="vx-tool vx-secondary" active><i class="fas fa-2x fa-street-view"></i>
                    <span>Explore</span>
                </button>
            </ui-selection-list>
            
            <div class="panel">
                <div hidden>
                    <div class="column">
                        <ui-selection-list single required>
                            <button id="walker" class="vx-secondary" >Walk</button>
                            <button id="flyer" class="vx-secondary" active>Fly</button>
                        </ui-selection-list>	
                    </div>
                    <div class="column">
                        <button id="target" class="vx-app vx-secondary" active><i class="fas fa-2x fa-bullseye"></i></button>
                    </div>
                </div>
                <div hidden>
                    <div class="column">
                        <button id="axes" class="vx-app vx-secondary" active><i class="fas fa-2x fa-grip-lines"></i></button>
                    </div>
                    <div class="column">
                        <button id="cube" class="vx-app vx-secondary" active><i class="fas fa-2x fa-cube"></i></button>
                    </div>
                </div>
            </div>
        `;		
        this.cameraButtons = this.dom.querySelector(':host > ui-selection-list');
        this.cameraButtons.addEventListener("down", event => 
        {
            let button = event.detail;
            if (button.id === "explore")
            {
                this.explore.hidden = false;			
                this.inspect.hidden = true;			
                
                this.viewer.post("controller.set", { name: this.exploreButtons.querySelector('button[active]').id });
                this.viewer.post("navcube", { visible: false });
                this.viewer.post("target", { color: [1.0,0.502,0.0], visible: true });
            }
            else if (button.id === "inspect")
            {
                this.explore.hidden = true;			
                this.inspect.hidden = false;			
                
                this.viewer.post("controller.set", { name: "orbiter"});
                this.viewer.post("navcube", { visible: true });
                this.viewer.post("target", { visible: false });
            }
        })
        
        this.exploreButtons = this.dom.querySelector('.panel ui-selection-list');
        this.exploreButtons.addEventListener("down", event => 
        {
            this.viewer.post("controller.set", { name: event.detail.id });	
        });
        
        this.explore = this.dom.querySelector(".panel > div:nth-of-type(1)") 
        this.inspect = this.dom.querySelector(".panel > div:nth-of-type(2)") 

        this.dom.getElementById("target").addEventListener("click", event=>  this.viewer.post("target", { visible: event.currentTarget.toggleAttribute("active") }));
        this.dom.getElementById("cube").addEventListener("click", event=>  this.viewer.post("navcube", { visible: event.currentTarget.toggleAttribute("active") }));
        this.dom.getElementById("axes").addEventListener("click", event=>  this.viewer.post("axes", { visible: event.currentTarget.toggleAttribute("active") }));
    }
    
    connectedCallback()
    {
        this.viewer = document.querySelector(this.getAttribute("viewer"));;
        
        this.viewer.on("viewer.load", async args =>
        {
            if (args.type == "cloud" || args.type == "model")
            {
                this.viewer.post("navcube", { visible: false });
                this.viewer.post("target", { visible: false });
                this.viewer.post("controller.set", { name: "orbiter" });
                this.viewer.post("axes", { visible: true });

                this.viewer.on("controller.set", (args)=>
                {
                    if (args.name == "walker" || args.name == "flyer")
                    {
                        this.cameraButtons.select(this.dom.getElementById("explore"));
                        this.exploreButtons.select(this.dom.getElementById(args.name));
                        
                        this.explore.hidden = false;			
                        this.inspect.hidden = true;			
                    }
                    else if (args.name == "orbiter")
                    {
                        this.cameraButtons.select(this.dom.getElementById("inspect"));
                        
                        this.explore.hidden = true;			
                        this.inspect.hidden = false;			
                    }
                }, this)

                this.viewer.on("axes", (args) =>
                {
                    if (args.hasOwnProperty("visible"))
                    {
                        let target = this.dom.getElementById("axes")
                        target.toggleAttribute("active", args.visible);
                    }
                }, this)

                
                this.viewer.on("navcube", (args) =>
                {
                    if (args.hasOwnProperty("visible"))
                    {
                        let navcube = this.dom.getElementById("cube");
                        navcube.toggleAttribute("active", args.visible);
                    }
                }, this)
                
                this.viewer.on("target", (args) =>
                {
                    if (args.hasOwnProperty("visible"))
                    {
                        let target = this.dom.getElementById("target")
                        target.toggleAttribute("active", args.visible);
                    }
                }, this)
                    
                this.viewer.on(["model.dblclick", "cloud.dblclick"], (event)=>
                {
                    if (event.id)
                    {
                        let camera = this.dom.querySelector("button[active]");
                        if (camera.id == "explore")
                        {
                            let mode = this.exploreButtons.querySelector('button[active]').id;
                            if (mode == "walker")
                            {
                                if (event.normal.y > 0.8)
                                {
                                    this.viewer.post("controller.target", event.xyz);
                                }
                            }
                            else
                            {
                                this.viewer.post("controller.target", event.xyz);
                            }
                        }
                        else
                        {
                            this.viewer.post("controller.target", event.xyz);
                        }

                        this.viewer.post("axes", { origin: event.xyz });
                    }
                }, this)
        
                this.viewer.on("viewer.mousemove", (event)=>
                {
                    if (event.id)
                    {
                        let camera = this.cameraButtons.querySelector("button[active]");
                        if (camera.id == "explore")
                        {
                            let mode = this.exploreButtons.querySelector('button[active]').id;
                            if (mode === "walker" && event.normal.y < 0.8)
                            {
                                this.viewer.post("target", { color: [1.0,0.502,0.0] } );
                            }
                            else
                            {
                                this.viewer.post("target", { color: [0.0,0.502,1.00] } );
                            }
                        }
                    }
                }, this);
            }
        });	
        
        this.viewer.on("viewer.unload", async args =>
        {
            if (args.type == "cloud" || args.type == "model")
            {
                this.viewer.un("controller.set", this)
                this.viewer.un("navcube", this)
                this.viewer.un("target", this)
                this.viewer.un(["model.dblclick", "cloud.dblclick"], this)
                this.viewer.un("viewer.mousemove", this)
            }
        });
    }
}

customElements.define("va-camera", VaCamera);


