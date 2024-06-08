class VaDensity extends HTMLElement 
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
                    display: block;
                    padding: 0.5em;
                }
                  
                .image 
                {
                    height: 15em;
                    width: 15em;
                    min-height: 15em;
                    min-width: 15em;
                    max-height: 15em;
                    max-width: 15em;
                    margin: auto;
                }
        
                .image.density 
                {
                    background: url('${window.app_domain}/voxxlr/upload/images/radiusfilter.webp') center;
                    background-size: 100% 100%;
                    background-repeat: no-repeat;
                }

            </style>
            

            <div>
                <div>
                    <label><input id="density-switch" type="checkbox" checked=""></label>
                    <input id="density-value" placeholder="Filter off" type="number" step="0.1" value="0.2" min="0.1" max="20.00"><span></span>
                </div>						
                <div class="description">
                    <p>The density filter ensures that a sphere of radius 5*<i>resolution</i> is 
                    filled to the specified percentage with points. Apply a low density filter to reduce noise.</p>
                </div>
            </div>					
            <div class="image density"></div>
        `;

        
        this.densityswitch = this.dom.getElementById("density-switch");
        this.densityvalue = this.dom.getElementById("density-value");
        this.densityswitch.addEventListener("change", (event) =>
        {
            if (event.currentTarget.checked)
            {
                this.densityvalue.disabled = false;   	       		
                this.densityvalue.value = "0.2";
            }
            else
            {
                this.densityvalue.disabled = true;   	       		
                this.densityvalue.value = "";
            }
        });
    }
    
    get(source)
    {
        if (this.densityswitch.checked)
        {
            source.density = parseFloat(this.densityvalue.value)/100.0;
        }	
        else
        {
            source.density = 0;
        }
    }
}

customElements.define("va-density", VaDensity);

class VaResolution extends HTMLElement 
{
    constructor() 
    {
        super();
        
        this.dom = this.attachShadow({mode: 'open'});
         
        this.dom.innerHTML = `
    
            <link rel="stylesheet" href="${window.app_domain}/ui.css">

            <style>
            
                :host
                {
                    display: block;
                    padding: 0.5em;
                }
 
                .image 
                {
                    height: 15em;
                    width: 15em;
                    min-height: 15em;
                    min-width: 15em;
                    max-height: 15em;
                    max-width: 15em;
                    margin: auto;
               }
        
                .image.resolution 
                {
                    background: url('${window.app_domain}/voxxlr/upload/images/gridfilter.webp') center;
                    background-size: 100% 100%;
                    background-repeat: no-repeat;
                }

                #resolution-value
                {
                    width: 7em;
                    text-align: right;
                }                
            </style>
            
            <div>
                <div>
                    <label>
                        <input id="resolution-switch" type="checkbox" checked="">
                    </label>
                    <input id="resolution-value" placeholder="Auto detect" type="number" step="0.001" value="" min="0.001" max="1.00" disabled=""><span>m</span>
                </div>
                <div class="description">
                    <p>The resolution filter ensures that any cube of the given size (in meters) contains at most one point. 
                        If more than one point fall into a cube their position and colors are averaged. For noisy data, auto detection generates a low resolution</p> 
                </div>
            </div>					
            <div class="image resolution"></div>
        `;
        
        this.resolutionswitch = this.dom.getElementById("resolution-switch");
        this.resolutionvalue = this.dom.getElementById("resolution-value");
        this.resolutionswitch.addEventListener("change", (event)=>
        {
            if (event.currentTarget.checked)
            {
                this.resolutionvalue.disabled = true;   	       		
                this.resolutionvalue.value = "";
            }
            else
            {
                this.resolutionvalue.disabled = false;   	       		
                this.resolutionvalue.value = "0.02";
            }
        });
    }
    
    get(source)
    {
        if (!this.resolutionswitch.checked)
        {
            source.resolution = parseFloat(this.resolutionvalue.value);
        }
        else
        {
            source.resolution = "auto"
        }
    }
}

customElements.define("va-resolution", VaResolution);

class VaCoordinates extends HTMLElement 
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
                    display: block;
                    padding: 0.5em;
                }
                       
                .coordimage 
                {
                    height: 15em;
                    width: 15em;
                    min-height: 15em;
                    min-width: 15em;
                    max-height: 15em;
                    max-width: 15em;
                    margin: auto;
                }
                 
                .coordinput > div:first-of-type
                { 
                    display: flex;
                    flex-direction: column;
                }
                    
                .svg-hidden { display: none; }
                svg .x { stroke:rgb(255,0,0);stroke-width:1 }
                svg .y { stroke:rgb(0,255,0);stroke-width:1 }
                svg .z { stroke:rgb(0,0,255);stroke-width:1 }
                svg text { font-size: 14px; }
                        
            </style>
            
            <div class="coordinput">
                <div>
                    <label><input type="radio" id="right-y" name="coords" value="right-y"><span>Right-handed Y Up</span></label>
                    <label><input type="radio" id="right-z" name="coords" value="right-z" checked=""><span>Right-handed Z Up</span></label>							
                    <label><input type="radio" id="left-y" name="coords" value="left-y"><span>Left-handed Y Up</span></label>							
                    <label><input type="radio" id="left-z" name="coords" value="left-z"><span>Left-handed Z Up</span></label>							
                </div>
                <div>
                    <p>The coordinate system of the data being uploaded. It will be converted to the Voxxlr coordinate system, Right-handed Y Up. When in doubt leave the default setting...</p>
                </div> 		
            </div>
            <div class="coordimage">
                <svg viewBox="-100 -100 200 200" style="overflow:visible;" xml:space="preserve" >
                    <g class="svg-hidden" data-right-y>
                        <line x1="-80" y1="-36" x2="80" y2="30" class="x"></line>
                        <line x1="-80" y1="30" x2="80" y2="-30" class="z"></line>
                        <line x1="0" y1="-80" x2="0" y2="80" class="y"></line>
                        <text x="85" y="38">x</text>
                        <text x="-99" y="38">z</text>
                        <text x="-6" y="-93">y</text>
                    </g>
                    <g data-right-z>
                        <line x1="-80" y1="-30" x2="80" y2="30" class="x"></line>
                        <line x1="-80" y1=" 30" x2="80" y2="-30" class="y"></line>
                        <line x1="0" y1="-80" x2="0" y2="80" class="z"></line>
                        <text x="85" y="38">x</text>
                        <text x="85" y="-34">y</text>
                        <text x="-5" y="-88">z</text>
                    </g>
                    <g class="svg-hidden" data-left-y>
                        <line x1="-80" y1="-36" x2="80" y2="30" class="x"></line>
                        <line x1="-80" y1="30" x2="80" y2="-30" class="z"></line>
                        <line x1="0" y1="-80" x2="0" y2="80" class="y"></line>
                        <text x="85" y="38">x</text>
                        <text x="85" y="-34">z</text>
                        <text x="-6" y="-93">y</text>
                    </g>
                    <g class="svg-hidden" data-left-z>
                        <line x1="-80" y1="-30" x2="80" y2="30" class="x"></line>
                        <line x1="-80" y1=" 30" x2="80" y2="-30" class="y"></line>
                        <line x1="0" y1="-80" x2="0" y2="80" class="z"></line>
                        <text x="85" y="38">x</text>
                        <text x="-99" y="38">y</text>
                        <text x="-5" y="-88">z</text>
                    </g>
                </svg>
            </div>
        `;
        

        this.dom.querySelectorAll(".coordinput input").forEach((item) =>
        {
            item.addEventListener("change", (event) =>
            {
                this.dom.querySelectorAll(".coordimage g").forEach((item) =>
                {
                    item.classList.add("svg-hidden");
                });
                this.dom.querySelector("g[data-"+event.currentTarget.id+"]").classList.remove("svg-hidden");
            });	
        });
    }
    
    get(source)
    {
        source.coords = this.dom.querySelector(".coordinput input:checked").value;
    }
    
}

customElements.define("va-coordinates", VaCoordinates);


class VaUnits extends HTMLElement 
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
                justify-content:space-around;
                padding: 0.5em;
            }
         
            .selection
            { 
                display: flex;
                flex-direction: column;
            }
    
            </style>
            
            <div>
                <div class="selection">
                    <label><input type="radio" id="option-1" name="options" value="1.0" checked><span>m</span></label>
                    <label><input type="radio" id="option-2" name="options" value="0.01"><span>cm</span></label>
                    <label><input type="radio" id="option-3" name="options" value="0.001"><span>mm</span></label>
                    <label><input type="radio" id="option-4" name="options" value="0.0254"><span>in</span></label>
                    <label><input type="radio" id="option-5" name="options" value="0.3048"><span>ft</span></label>
                </div>
                <div class="description">
                    <p>Units of the data being uploaded. </p>
                </div> 		
            </div>
        `;
        

        this.dom.querySelectorAll(".coordinput input").forEach((item) =>
        {
            item.addEventListener("change", (event) =>
            {
                this.dom.querySelectorAll(".coordimage g").forEach((item) =>
                {
                    item.classList.add("svg-hidden");
                });
                this.dom.querySelector("g[data-"+event.currentTarget.id+"]").classList.remove("svg-hidden");
            });	
        });
    }
    
    get(source)
    {
        source.scalar = parseFloat(this.dom.querySelector("input:checked").value);
    }
    
}

customElements.define("va-units", VaUnits);
