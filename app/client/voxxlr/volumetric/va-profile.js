
class VaProfile  extends HTMLElement 
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
                    display: block;
                    overflow: auto;
                    position: relative;
                }
                
                :host([hidden]) { display: none; }

                button
                {
                    position: absolute;
                    top: 3px;
                    right: 3px;
                }

                .text 
                {
                    position: absolute;
                    font-size: 12px;
                    z-index: 99;
                }
                
                .text.center 
                {
                    top: 0%;
                    margin-top: 4px;
                }
                
                .text.vert 
                {
                    top: 0%;
                    margin-top: 4px;
                }
                
                .text.horz 
                {
                    left: 50%;
                    bottom: 0%;
                    margin-bottom: 4px;
                }
                
                svg
                {
                    position: absolute;
                    height: 100%;
                    width: 100%;
                }
                
                #scanning 
                {
                    position: absolute;
                    left: 50%;
                    top: 50%;
                }
                
                
            </style>
            
            <svg preserveAspectRatio="xMinYMax meet">
                <line class="center" stroke="green" vector-effect="non-scaling-stroke"></line>
                <line class="horz" stroke="grey" vector-effect="non-scaling-stroke"></line>
                <line class="vert" stroke="grey" vector-effect="non-scaling-stroke"></line>
                <g>
                </g>
            </svg>
    
            <div id="scanning" hidden>
                <p>Scanning ... </p>
            </div>
                
            
            <div class="text vert"></div>
            <div class="text horz"></div>
            <div class="text center"></div>
        
            <button class="vx-secondary"><i class="fas fa-times-circle"></i></button>
            `;			

        
        this.dom.querySelector("button").addEventListener("click", (event) =>
        {
            //delete this.line.mode["profile"];
            //this.viewer.post("line.update", { id: this.line.id, mode: this.line.mode });
            this.dispatchEvent(new CustomEvent("close", { detail: this.line }));
            this.hidden = true;
        });

        this.svg = this.dom.querySelector("svg");
        
        this.focalFraction = 0;
        
        this.mapCenter = this.svg.querySelector(".center");
        this.click = (event)=> 
        {
            var p = this.svg.createSVGPoint();   
            p.x = parseInt(event.clientX);
            p.y = parseInt(event.clientY);
            p = p.matrixTransform(this.svg.getScreenCTM().inverse());
            this.mapCenter.setAttribute("x1", p.x);
            this.mapCenter.setAttribute("x2", p.x);
            
            this.focalFraction = p.x/this.maxW;
            this.updateIndicator();
        };
        this.svg.addEventListener("click", this.click);
    
        // axes
        this.vText = this.dom.querySelector(".text.vert");
        this.hText = this.dom.querySelector(".text.horz");
    
        
        // cross hairs
        this.cText = this.dom.querySelector(".text.center");
        this.horz = this.svg.querySelector("line.horz");
        this.vert = this.svg.querySelector("line.vert");
        this.mousemove = (event)=> 
        {
            var p = this.svg.createSVGPoint();   
            p.x = parseInt(event.clientX);
            p.y = parseInt(event.clientY);
            p = p.matrixTransform(this.svg.getScreenCTM().inverse());
            this.vert.setAttribute("x1", p.x);
            this.vert.setAttribute("x2", p.x);
            this.horz.setAttribute("y1", p.y);
            this.horz.setAttribute("y2", p.y);
            //
            this.cText.hidden = false;
            this.cText.textContent = (this.maxH - p.y).toFixed(2)+" m";
            this.cText.style.left = event.offsetX + "px";
        };
        this.mouseleave = (event)=> 
        {
            this.vert.setAttribute("x1", 0);
            this.vert.setAttribute("x2", 0);
            this.horz.setAttribute("y1", 0);
            this.horz.setAttribute("y2", 0);
            this.cText.hidden = true;
        };
        this.svg.addEventListener("mousemove", this.mousemove);
        this.svg.addEventListener("mouseleave", this.mouseleave);
    }
    
    connectedCallback() 
    {
        if (this.parentNode instanceof VxViewer)
        {
            this.attach(this.parentNode);
        }
    }
    
    attach(viewer)
    {
        this.viewer = viewer;
        
        this.viewer.on("viewer.load", (document) =>
        {
            this.viewer.post("point.create", 
            { 
                 id: "profile", 
                 point: { x:0, y:0, z:0 },
                 code:
                 {
                     render2d: encodeURI(function(ctx, state)
                     {
                        ctx.fillStyle = "yellow";
                        ctx.beginPath();
                        ctx.arc(0,0,5,0,2*Math.PI);
                        ctx.fill();
                        return true;
                    }.toString())
                 },
                 visible: false,
                 exclude: true
            });
        });
        
        this.viewer.on("line.select", (args) =>
        {
            this.line = args;
            this.focalFraction = 0;				
            this.viewer.post("point.update", { id: "profile", point: this.line.points[0], visible: true });
        });

        this.viewer.on("line.unselect", (args) =>
        {
            this.line = null;
            this.hidden = true;
            this.viewer.post("point.update", { id: "profile", visible: false }); 
        });

        this.viewer.on("line.update", (args, custom) =>
        {
            if (this.line && this.line.id == args.id && !this.hidden)
            {
                if (args.points)
                {
                    this.line.points = args.points;
                    this.focalFraction = 0;				
                    this.viewer.post("point.update", { id: "profile", point: this.line.points[0], visible: true });
                    
                    this.viewer.post("line.scan.start", { id: args.id, resolution: 1/500.0, direction: { x:0, y:1, z:0 } });
                }
            }
        });
    
        this.viewer.on("line.scan.start", (args) =>
        {
            this.svg.querySelectorAll("polyline").forEach(line => line.remove());
            this.hidden = false;
            
            var linebreaks = this.svg.querySelector("g");
            while (linebreaks.firstChild)
            {
                linebreaks.firstChild.remove();
            }
            
            
            let count = 0;
            for (var id in args.samples)
            {
                let polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
                polyline.setAttribute("fill", "none");
                polyline.setAttribute("vector-effect", "non-scaling-stroke");
                polyline.id = "svg"+id;
                if (count++ == 0)
                {
                    polyline.setAttribute("stroke", "#0074d9");
                    polyline.setAttribute('stroke-width', 2);
                }
                else
                {
                    polyline.setAttribute("stroke", "#a9a9a9");
                    polyline.setAttribute('stroke-width', 1);
                }
                this.svg.appendChild(polyline);
            }
                
            this.minH = Number.POSITIVE_INFINITY;
            this.maxH = Number.NEGATIVE_INFINITY;
            this.pointCount = 0;
            this.breaks = [];
            
            this.plot = {};
            for (var id in args.samples)
            {
                this.plot[id] = [];
            }
            
            this.dom.getElementById("scanning").hidden = false;
        });
        
        this.viewer.on("line.scan.sample", (args) =>
        {
            for (var id in args.samples)
            {
                let points = args.samples[id]; 
                let plot = this.plot[id];
                    
                for (var i=this.pointCount; i<args.count; i++)
                {
                    let height = points[i];
                    
                    if (height != Number.POSITIVE_INFINITY)
                    {
                        this.minH = Math.min(this.minH, height);
                        this.maxH = Math.max(this.maxH, height);
                    }
                    
                    plot.push(height);
                }
            }
            this.pointCount = args.count;
            this.breaks.push(this.pointCount);
        });
        
        this.viewer.on("line.scan.end", (args) =>
        {
            this.dom.getElementById("scanning").hidden = true;
            if (this.minH == Number.POSITIVE_INFINITY && this.maxH == Number.NEGATIVE_INFINITY)
            {
                return null;
            }
            // TODO this should happen somewhere else
            let scalar = this.viewer.is("2D") ? 10000000/256.0 : 1.0; // assumes utm projection for map

            
            let chartHeight = this.maxH-this.minH;
            let chartWidth = args.count*args.resolution*scalar;

            this.maxW = chartWidth;
            
            for (var id in args.samples)
            {
                let plot = this.plot[id];
                for (var i=0; i<args.count; i++)
                {
                    let h;
                    if (plot[i] == Number.POSITIVE_INFINITY)
                    {
                        h = this.maxH;
                    }
                    else
                    {
                        h = this.minH + this.maxH - plot[i];
                    }
                    plot[i] = `${i*args.resolution*scalar},${h}`;
                }
                
                var polyline = this.svg.querySelector("#svg"+id);
                polyline.setAttribute('points',this.plot[id].join(' ')); 
            }
            
            this.cText.textContent = "";
    
            this.vert.setAttribute("x1", 0);
            this.vert.setAttribute("x2", 0);
            this.vert.setAttribute("y1", this.minH);
            this.vert.setAttribute("y2", this.maxH);
            this.vert.setAttribute('stroke-width', 1);
    
            this.horz.setAttribute("x1", 0);
            this.horz.setAttribute("x2", chartWidth);
            this.horz.setAttribute("y1", 0);
            this.horz.setAttribute("y2", 0);
            this.horz.setAttribute('stroke-width', 1);
            
            this.updateIndicator();
            
            this.mapCenter.setAttribute("x1", this.focalFraction*chartWidth);
            this.mapCenter.setAttribute("x2", this.focalFraction*chartWidth);
            this.mapCenter.setAttribute("y1", this.minH);
            this.mapCenter.setAttribute("y2", this.maxH);
            this.mapCenter.setAttribute('stroke-width', 1);
            
            var linebreaks = this.svg.querySelector("g");
            for (var i=1; i<this.breaks.length; i++)
            {
                var indicator = document.createElementNS("http://www.w3.org/2000/svg", "line");
                indicator.setAttribute("class", "linebreak");
                indicator.setAttribute("x1", this.breaks[i-1]/this.pointCount*chartWidth);
                indicator.setAttribute("x2", this.breaks[i-1]/this.pointCount*chartWidth);
                indicator.setAttribute("y1", this.maxH);
                indicator.setAttribute("y2", this.maxH - 0.1*chartHeight);
                indicator.setAttribute('stroke-width', 1);
                indicator.setAttribute('stroke', "blue");
                indicator.setAttribute("vector-effect", "non-scaling-stroke");
    
                linebreaks.appendChild(indicator);
            };

            this.svg.setAttribute('viewBox', "0 " + this.minH + " " + chartWidth + " " + chartHeight);
        });
    }

    updateIndicator()
    {
        let point = this.focalFraction*this.pointCount;

        for (var i=0; i<this.breaks.length; i++)
        {
            if (point < this.breaks[i])
            {
                let t0 = 0;
                let t1 = this.breaks[i];
                let a0 = this.line.points[i];
                let a1 = this.line.points[i+1];
                
                var dx = a1.x - a0.x;
                var dy = a1.y - a0.y;
                var dz = a1.z - a0.z;
                var t = point/(t1 - t0);
                
                this.viewer.post("point.update", { id: "profile", point: { x:a0.x + dx*t, y:a0.y + dy*t, z: a0.z + dz*t }, visible: true });
                break;
            }
        }
    }
}

customElements.define("va-profile", VaProfile);
