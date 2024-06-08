
class VaFilter extends HTMLElement 
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
                    user-select: none;
                    overflow: auto;
                    display: flex;
                    flex-direction: column;
                    align-items: stretch; 
                }
                
                .slider
                {
                    display: flex;
                    flex-direction: row;
                    margin-top: 1em;
                }
                
                .slider > span { flex-basis: 30%; }
                
                ui-range, ui-slider { flex-grow: 1; }
                ui-panel 
                { 
                    margin-top: 1em; 
                    margin-bottom: 1em; 
                }
                
                #btn-lighting 
                { 
                    margin-top: 1em; 
                    margin-right: 0.5em
                }

                #grid 
                {
                    justify-content: center;
                    display: grid;
                    gap: 0.5em;
                    grid-template-columns: 1fr 1fr 1fr 1fr;
                    grid-template-rows: 18px 18px 18px 18px;
                    grid-auto-flow: column;
                }
                
                #grid .color 
                {
                    width: 2em;
                    height: 1em;
                    margin-left: 0.5em;
                    display: inline-block;
                }
                
                ui-selection-list button { width: 4em; }
                
            </style>
            
                <ui-panel name="Render">
                    <ui-selection-list single>
                        <button id="COLOR_RGB" title="color" class="vx-secondary" active><b>C</b><sub>RGB</sub></button>						
                        <button id="COLOR_BW" title="black & white" class="vx-secondary"><b>C</b><sub>B/W</sub></button>						
                        <button id="COLOR_HEIGHT" title="height" class="vx-secondary"><b>G</b><sub>h</sub></button>
                        <button id="COLOR_SLOPE" title="slope" class="vx-secondary"><b>G</b><sub>s</sub></button>
                        <button id="COLOR_INTENSITY" title="intensity" class="vx-secondary"><b>G</b><sub>I</sub></button>
                        <button id="COLOR_CLASS" title="intensity" class="vx-secondary"><b>C</b><sub>l</sub></button>
                    </ui-selection-list>
                    <div>
                        <div class="slider"><span>Height filter</span><ui-range id="heightFilter" horz></ui-range></div>
                        <div class="slider"><span>Slope filter</span><ui-range id="slopeFilter" horz></ui-range></div>
                    </div>
                    <div>
                        <label><ui-checkbox id="btn-lighting"></ui-checkbox>Lighting</label>
                    </div>
                </ui-panel>
        
                <ui-panel name="Geometry">
                    <div class="slider"><span>Point Size</span><ui-slider id="pointsize" horz></ui-slider></div>
                    <div class="slider"><span>Point Budget</span><ui-slider id="buffercount" horz></ui-slider></div>
                </ui-panel>
                <ui-panel id="grid" name="Classes">
                    <div><ui-checkbox type="checkbox" id="0"></ui-checkbox><div class="color" style="background: rgb(0,0,255)"></div></div>
                    <div><ui-checkbox type="checkbox" id="1"></ui-checkbox><div class="color" style="background: rgb(0,255,0)"></div></div>
                    <div><ui-checkbox type="checkbox" id="2"></ui-checkbox><div class="color" style="background: rgb(158,127,109)"></div></div>
                    <div><ui-checkbox type="checkbox" id="3"></ui-checkbox><div class="color" style="background: rgb(79,119,63)"></div></div>
                    <div><ui-checkbox type="checkbox" id="4"></ui-checkbox><div class="color" style="background: rgb(33,137,33)"></div></div>
                    <div><ui-checkbox type="checkbox" id="5"></ui-checkbox><div class="color" style="background: rgb(206,239,191)"></div></div>
                    <div><ui-checkbox type="checkbox" id="6"></ui-checkbox><div class="color" style="background: rgb(137,0,25)"></div></div>
                    <div><ui-checkbox type="checkbox" id="7"></ui-checkbox><div class="color" style="background: rgb(137,137,137)"></div></div>
                    <div><ui-checkbox type="checkbox" id="8"></ui-checkbox><div class="color" style="background: rgb(137,137,137)"></div></div>
                    <div><ui-checkbox type="checkbox" id="9"></ui-checkbox><div class="color" style="background: rgb(63,163,221)"></div></div>
                    <div><ui-checkbox type="checkbox" id="10"></ui-checkbox><div class="color" style="background: rgb(97,97,97)"></div></div>
                    <div><ui-checkbox type="checkbox" id="11"></ui-checkbox><div class="color" style="background: rgb(137,137,137)"></div></div>
                    <div><ui-checkbox type="checkbox" id="12"></ui-checkbox><div class="color" style="background: rgb(137,137,137)"></div></div>
                    <div><ui-checkbox type="checkbox" id="13"></ui-checkbox><div class="color" style="background: rgb(137,137,137)"></div></div>
                    <div><ui-checkbox type="checkbox" id="14"></ui-checkbox><div class="color" style="background: rgb(137,137,137)"></div></div>
                    <div><ui-checkbox type="checkbox" id="15"></ui-checkbox><div class="color" style="background: rgb(137,137,137)"></div></div>
                </ui-panel>
            `;
            
        this.dom.querySelector("ui-selection-list").addEventListener("down", event =>
        {
            this.viewer.post("cloud.shader.update", { id: this.id, mode: event.detail.id });
        });
        
        this.slopeFilter = this.dom.getElementById("slopeFilter");
        this.slopeFilter.addEventListener("change", event =>
        {
            this.viewer.post("cloud.shader.update", { id: this.id, slope: event.detail });
        });
        
        this.heightFilter = this.dom.getElementById("heightFilter");
        this.heightFilter.addEventListener("change", event =>
        {
            let minH = event.detail.min;
            let maxH = event.detail.max;
            
            let clipPlanes = new Float32Array(4*2);  // 2 clip planes
            clipPlanes.fill(0);
            
            if (minH > 0.0)
            {
                clipPlanes[1] = 1;
                clipPlanes[3] = this.minH + minH*(this.maxH - this.minH);
            }
            
            if (maxH < 1.0)
            {
                clipPlanes[5] = -1;
                clipPlanes[7] = -(this.minH + maxH*(this.maxH - this.minH));
            }
            
            this.viewer.post("cloud.shader.update", { id: this.id, clipPlanes: Array.from(clipPlanes) });
        });
        

        // Lighting
        this.lighting =  this.dom.getElementById("btn-lighting");
        this.lighting.addEventListener("change", event =>
        {
            this.viewer.post("cloud.shader.update", { id: this.id, lighting: event.currentTarget.hasAttribute("checked") });
        });
        

        this.pointsize = this.dom.getElementById("pointsize"); 
        this.pointsize.addEventListener("change", event  =>
        {
            this.viewer.post("cloud.point.scale", { id: this.id,  value: event.detail/0.5 });
        });
        
        this.buffercount = this.dom.getElementById("buffercount");
        this.buffercount.addEventListener("change", event  =>
        {
             this.viewer.post("cloud.point.max", { id: this.id,  value: this.MINBUFFERS + (this.MAXBUFFERS - this.MINBUFFERS)*event.detail });
        });
        
        this.classes = this.dom.getElementById("grid");
        this.classes.querySelectorAll("#grid ui-checkbox").forEach(input =>
        {
            input.addEventListener("change", event =>
            {
                this.viewer.post("cloud.shader.update", { id: this.id, classes: [ { index: parseInt(event.currentTarget.id), state: event.currentTarget.hasAttribute("checked")  } ]  });
            });
        });
        
        
        this.MAXBUFFERS = 160;
        this.MINBUFFERS = 1;
    }
     
    connectedCallback()
    {
        this.viewer = document.querySelector(this.getAttribute("viewer"));;
        
        this.viewer.on("viewer.load", (args) =>
        {
            if (args.type == "cloud")
            {
                this.id = args.id;
                this.minH = args.root.min[1];			
                this.maxH = args.root.max[1];			
                
                var attributes = {};
                for (var i=0; i<args.root.attributes.length; i++)
                {
                    attributes[args.root.attributes[i].name] = args.root.attributes[i];
                }
        
                this.dom.getElementById("COLOR_RGB").hidden = attributes["color"] == null;
                this.dom.getElementById("COLOR_INTENSITY").hidden = attributes["intensity"] == null;
                this.dom.getElementById("COLOR_BW").hidden = attributes["normal"] == null;
                this.dom.getElementById("COLOR_SLOPE").hidden = attributes["normal"] == null;
                
                this.lighting.hidden = attributes["normal"] == null;
                this.slopeFilter.hidden = attributes["normal"] == null;
                this.classes.hidden = attributes["class"] == null;
                
                this.buffercount.set(0.5);
                this.pointsize.set(0.61);
                
                let grid = this.dom.getElementById("grid")
                if (attributes["class"])
                {
                    grid.querySelectorAll(".color").forEach(clazz =>
                    {
                        clazz.previousSibling.disabled = false;
                        clazz.previousSibling.toggleAttribute("checked",true);
                    });
                    grid.hidden = false;
                }
                else
                {
                    grid.hidden = true;
                }
            
                this.viewer.on("cloud.shader.update", async (args) =>
                {
                    this.lighting.toggleAttribute("checked", args.defines.LIGHTING);
                }, this);
                
                this.viewer.on("viewpoint", async (args) =>
                {
                    if (args)
                    {
                        if (args[this.id])
                        {
                            let viewpoint = args[this.id];
                            
                            let defines = viewpoint.shader.defines;
                            this.dom.querySelectorAll("ui-selection-list > button").forEach(button =>
                            {
                                button.toggleAttribute("active", false);
                                if (defines[button.id])
                                {
                                    button.toggleAttribute("active", true);
                                }
                            });
                            
                            this.lighting.toggleAttribute("checked", defines["LIGHTING"]);
                            
                            let uniforms = viewpoint.shader.uniforms;
                            this.slopeFilter.set(uniforms.slope.min,uniforms.slope.max, false);
                            
                            let clipPlanes = viewpoint.shader.clipPlanes || [];
                            if (clipPlanes.length > 8)
                            {
                                let min = clipPlanes[3] ? (clipPlanes[3]-this.minH)/(this.maxH-this.minH) : 0;
                                let max = clipPlanes[7] ?-(clipPlanes[7]+this.minH)/(this.maxH-this.minH) : 1;
                                this.heightFilter.set(min, max, false);
                            }
                            else
                            {
                                this.heightFilter.set(0,1, false);
                            }
                        
                            this.buffercount.set((viewpoint.maxBuffers || 50.0)/this.MAXBUFFERS);
                            this.pointsize.set(viewpoint.shader.scalar/2);
                        
                        
                            var list = this.classes.querySelectorAll(".color");
                            let classes = uniforms.classes;
                            for (var i=0; i<list.length; i++)
                            {
                                list[i].previousSibling.toggleAttribute("checked", classes[i*4+3] == 1.0);
                                
                                if (classes.length > i*4)
                                {
                                     list[i].previousSibling.disabled = false;
                                }
                                else
                                {
                                     list[i].previousSibling.disabled = true;
                                }
                            }
                        }
                    }
                }, this);				
            }
        });

        this.viewer.on("viewer.unload", (args) =>
        {
            if (args.type == "cloud")
            {
                this.viewer.un("cloud.shader.update", this);
                this.viewer.un("viewpoint", this);
            }
        });

        this.viewer.on("viewpoint", async (args) =>
        {
        }, this);
        
    }

    
    //
    // dom events 
    //

}

customElements.define("va-filter", VaFilter);

