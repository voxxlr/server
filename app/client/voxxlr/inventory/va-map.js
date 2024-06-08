class VaMap extends HTMLElement 
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
                    position: relative;
                }
            
                vx-viewer { width: 100%; height: 100% }		
                
                ui-selection-list
                {
                    position: absolute;
                    left: 0.5em;
                    top: 0.5em;
                }
                
                #edit[active] i:after 
                { 
                    vertical-align: middle;
                    position:relative;
                    font-family: "Font Awesome 5 Free";
                    display: inline-block;
                    content: "\\f0e2"; 
                }
                
                #edit:not([active]) i:after 
                { 
                    vertical-align: middle;
                    position:relative;
                    font-family: "Font Awesome 5 Free";
                    display: inline-block;
                    content: "\\f304"; 
                }

                :host-context([permission=R]) ui-selection-list { display: none; }


            </style>
            
            <vx-viewer>
            </vx-viewer>
            <ui-selection-list>
                <button id="edit" class="vx-secondary" disabled><i class="fas fa-2x"></i></button>
                <button id="save" class="vx-secondary" disabled><i class="fas fa-2x fa-save" disabled></i></button>
            </ui-selection-list>
        `;
                
        this.pin = {  type: "point", };
        this.pin.code =
        {
             render2d: encodeURI(function(ctx, state)
             {
                let a = this.radius/2;
            
                ctx.drawImage(U.icon[this.status], -a, -a, this.radius, this.radius);
                if (this.selected)
                {
                    ctx.beginPath();
                    ctx.strokeStyle = "#0075FF";
                    ctx.lineWidth = 4;
                    ctx.arc(0, 0, this.radius/1.47, 0, 2*Math.PI);
                    ctx.stroke();
                }
                return false;
             }.toString()),
         
             intersect: encodeURI(function(ctx, x, y, state)
             {
                var r = this.radius/1.47*state.scale;
                var dx = state.x - x;
                var dy = state.y - y;
                return dx*dx+dy*dy < r*r;
             }.toString()),
        }
        this.pin.scope = { radius: 30, status: 1 };

        this.pin.activation = 
        {
            easing: "Linear", 
            p0: 2, 
            p1: 6
        }


        this.viewer = this.dom.querySelector("vx-viewer");
        this.viewer.on("viewer.load", async  (args, custom) => 
        {
            this.viewer.post("splitter", { u: 1, v: 1, visible:false });
            
            this.viewer.post("import.create", { id: "map", source: "https://tile.openstreetmap.org/{z}/{x}/{y}.png", type: "wmts", maxZoom: 19 });
            this.viewer.post("viewer.update", { code: encodeURI(function()
                {
                    U.icon = [
                        new Image(),
                        new Image(),
                        new Image(),
                        new Image(),
                    ];
                        
                    U.icon[0].src = `https://app.voxxlr.com/voxxlr/inventory/images/pin.webp`; 
                    U.icon[1].src = `https://app.voxxlr.com/voxxlr/inventory/images/pin.webp`; 
                    U.icon[2].src = `https://app.voxxlr.com/voxxlr/inventory/images/pin.webp`; 
                    U.icon[3].src = `https://app.voxxlr.com/voxxlr/inventory/images/pin.webp`; 
                }.toString())
            });
            
            
            this.setView(0, 40.5768877, 3)
        });

        this.viewer.on(["point.record"], (args)=>
        {
            let [lon,lat] = this.toLatLon(args.point.x, args.point.y);
            this.dispatchEvent(new CustomEvent('location-changed', { detail: { lon, lat } }));
             
            this.pin.id = args.id;
            this.pin.point = args.point;
            this.pin.scope.selected = true;
            this.viewer.post("point.create", this.pin, {});		
            this.viewer.post("point.select", this.pin, {});		
        });
        
    
        this.save = this.dom.querySelector("#save");
        this.save.addEventListener("click", async (event)=>
        {
            this.save.disabled = true;
            
            let pin = await this.viewer.wait("point.get", { id: this.content.id }, {});
            let [lon,lat] = this.toLatLon(pin.point.x, pin.point.y);

            this.dispatchEvent(new CustomEvent('location-changed', { detail: { lon, lat } }));

            this.edit.toggleAttribute("active", false);
            this.save.toggleAttribute("active", false);
            this.viewer.post("point.unselect", { id: this.content.id }, {});
        });
    
        this.edit = this.dom.querySelector("#edit");
        this.edit.addEventListener("click", (event)=>
        {
            if (!this.edit.hasAttribute("active"))
            {
    //			console.log(this.toXY(content.location.lon, content.location.lat))
                
                if (this.content.location)
                {
                    this.viewer.post(`point.select`, { id: this.content.id });
                }
                else
                {
                    this.viewer.post(`point.record`, { id: this.content.id });
                }
                this.save.disabled = false;
            }
            else
            {
                if (content.location)
                {
                    let [x, y] = this.toXY(this.content.location.lon, this.content.location.lat);
                    
                    this.viewer.post(`point.unselect`, { id: this.content.id });
                    
                    this.viewer.post(`point.update`, { id: this.content.id, point: {x,y} });
                }
                else
                {
                    this.viewer.post(`record.cancel`, {  });
                }
                this.save.disabled = true;
            }
        });
            
        this.div = null;
    }
        
    connectedCallback() 
    {
        this.viewer.init("map");
        //this.viewer.load(JSON.stringify({ id: "openstreetmap", data: "https://tile.openstreetmap.org/{z}/{x}/{y}.png", type: "wmts", maxZoom: 19 }));
    }
    
    toXY(lon, lat)
    {
        return [256*((lon+180)/360), 256*((1-Math.log(Math.tan(lat*Math.PI/180) + (1/Math.cos(lat*Math.PI/180)))/Math.PI)/2)];
    }
    toLatLon(x, y)
    {
        return [x/256.0*360-180, Math.atan(Math.sinh(Math.PI*(1-2*y/256.0)))*180/Math.PI];
    }


    setView(lon,lat, zoom)
    {
        let [x,y] = this.toXY(lon, lat);
        /*
        let x = 256*((lon+180)/360); 
        let y = 256*((1-Math.log(Math.tan(lat*Math.PI/180) + (1/Math.cos(lat*Math.PI/180)))/Math.PI)/2);
        */
        this.viewer.post("camera.set", { position: { x,y }, zoom });
    }
        
    select(content)
    {
        this.content = content;
        if (this.content.location)
        {
            this.setView(content.location.lon, this.content.location.lat, 17)
            this.viewer.post(`point.update`, { id: this.content.id, scope: { selected: true } });
        }
        this.edit.disabled = false;
    }

    unselect()
    {
        if (this.content.location)
        {
            this.viewer.post(`point.update`, { id: this.content.id, scope: { selected: false } });
        }
        delete this.content;
        this.edit.disabled = true;
    }
    
    add(set)
    {
        set.forEach(entry => 
        {
            if (entry.location)
            {
                let [x,y] = this.toXY(entry.location.lon, entry.location.lat);
                
                this.pin.id = entry.id;
                this.pin.point = { x, y }
                this.viewer.post("point.create", this.pin, {});		
                /*
                this.pin.id = entry.id;
                this.pin.point = {
                        x: 256*((entry.location.lon+180)/360),
                        y: 256*((1-Math.log(Math.tan(entry.location.lat*Math.PI/180) + (1/Math.cos(entry.location.lat*Math.PI/180)))/Math.PI)/2), 
                        z: 0
                    }
                this.viewer.post("point.create", this.pin, {});
                */		
            }
        })
    }
    
    async clear()
    {
        let set = await this.viewer.wait("*.get");
        for (var id in set)
        {
            this.viewer.post("point.delete", { id } );		
        }
    }
}

customElements.define("va-map", VaMap);



