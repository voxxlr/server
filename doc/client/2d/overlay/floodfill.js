V2.FloodFill = class extends O.Object
{
    constructor(entry)
    {
        super(entry.id, entry.activation);
        
        this.type = "floodfill";
        this.ble = entry.hasOwnProperty("visible") ? entry.visible : true;

        this.constraint = new C.Intersect();
        this.anchor = this.addAnchor(new O.Anchor(entry.point));
        this.anchorL = this.addAnchor(new O.Anchor(entry.pL));
        this.anchorH = this.addAnchor(new O.Anchor(entry.pH));
        this.projectAnchors();
        
        if (!V2.FloodFill.Shader.instance)
        {
            V2.FloodFill.Shader.instance = new V2.FloodFill.Shader();
            V2.FloodFill.Shader.instance.compile();
        }
        this.shader = V2.FloodFill.Shader.instance;
        
        this.ddx = 0;
        this.ddy = 0;
    }
    
    unselect()
    {
        super.unselect();
            
        if (this.context)
        {
            this.stopScan();
        }
    }

    select(points) 
    {
        super.select();
        
        this.addControl(new O.ControlPoint(this.anchor, this.constraint));
    }
    
    
    update(entry)
    {
        super.update(entry);
        
        if (entry.hasOwnProperty("pL")) 
        {
            this.anchorL.wx = entry.pL.x; 
            this.anchorL.wy = entry.pL.y;
        }
                    
        if (entry.hasOwnProperty("pH")) 
        {
            this.anchorH.wx = entry.pH.x; 
            this.anchorH.wy = entry.pH.y;
        }			
    }
    

    startControl(point)
    {
        if (this.context)
        {
            this.stopScan();
        }
        
        delete this.context;
    }

    endControl(point)
    {
        super.endControl();

        this.anchorL.wx = V.camera.min.x; 
        this.anchorL.wy = V.camera.min.y;
        this.anchorL.project();

        this.anchorH.wx = V.camera.max.x; 
        this.anchorH.wy = V.camera.max.y;
        this.anchorH.project();
        
        V.postMessage("floodfill.update", this.toJson());		
        
        V.touch3d();
    }

    intersectRay3D(event)
    {
        var dx = event.pageX - this.anchor.sx;
        var dy = event.pageY - this.anchor.sy;
        var distance = dx*dx+dy*dy;
        if (distance < O.ControlPoint.R2)
        {
            return distance;
        }
        else
        {
            if (!(event.pageX > this.anchorH.sx || event.pageX < this.anchorL.sx || event.pageY > this.anchorH.sy || event.pageY < this.anchorL.sy))
            {
                return 1000;
            }
        }
        
        return Number.POSITIVE_INFINITY;
    }

    render2D(context)
    {
        super.render2D(context);
        
        if (!this.selected)
        {
            context.fillStyle = "#40C4FF";
            context.setTransform(1,0,0,1,this.anchor.sx, this.anchor.sy);
            context.fill(O.ControlPoint.PATH);
        }
        
        context.setTransform(1,0,0,1,0,0);
        context.strokeStyle = "#40C4FF";
        context.lineWidth = 3;
        context.beginPath();
        context.rect(this.anchorL.sx, this.anchorL.sy, this.anchorH.sx-this.anchorL.sx, this.anchorH.sy-this.anchorL.sy);
        context.stroke();
    }

    render3D(event)
    {
        super.render3D(event);
        
        if (this.context != null)
        {
            this.shader.render(this.anchorL, this.anchorH, this.context.pixelSize, this.ddx, this.ddy, this.scale*0.6);
        }
    }


    //
    //
    //

    stopScan()
    {
        if (this.context)
        {
            if (this.timer)
            {
                clearTimeout(this.timer);
                delete this.timer;
            }
            
            V.postMessage("floodfill.scan.stop", { id: this.id });
            delete this.context;
        }
    }

    // run scan line
    startScan(mode)
    {
        if (this.timer)
        {
            clearTimeout(this.timer);
        }

        // shrink scan area to visible rectangle
        if (this.anchorL.wx < V.camera.min.x)
        {
            this.anchorL.wx = V.camera.min.x;
        }; 
        if (this.anchorH.wx > V.camera.max.x)
        {
            this.anchorH.wx = V.camera.max.x;
        }; 

        if (this.anchorL.wy < V.camera.min.y)
        {
            this.anchorL.wy = V.camera.min.y;
        }; 
        if (this.anchorH.wy > V.camera.max.y)
        {
            this.anchorH.wy = V.camera.max.y;
        }; 

        this.ddx = 0;
        this.ddy = 0;

        // setup scan context
        if (mode == "upward")
        {
            this.context  = new V2.FloodFill.Upward(this);
            this.shader.setMode(1);
        }
        else if (mode == "downward")
        {
            this.context  = new V2.FloodFill.Downward(this);
            this.shader.setMode(0);
        }
        
        this.timer = setTimeout(this.processScan.bind(this, this.context ), 0);
            
        V.postMessage("floodfill.scan.start", { id: this.id, samples: this.context.samples });
    }


    processScan()
    {
        if (!V.camera.moving)
        {
            V.postMessage("floodfill.scan.sample", { id: this.id, resolution: this.context.pixelSize, samples: this.context.scan() });
            
            this.shader.update(this.context.w, this.context.h, this.context.texture);

            V.touch3d();
            
            if (this.context.done())
            {
                delete this.timer;
                
                if (this.context.minX != Number.MAX_VALUE)
                {
                    this.ddx = this.context.minX - this.anchorL.wx;
                    this.ddy = this.anchorH.wy - this.context.maxY;
                    
                    this.anchorL.wx = this.context.minX;
                    this.anchorL.wy = this.context.minY;
                    this.anchorL.project();
                    
                    this.anchorH.wx = this.context.maxX;
                    this.anchorH.wy = this.context.maxY;
                    this.anchorH.project();			
                }

                V.postMessage("floodfill.scan.end", { id: this.id, pL: this.anchorL.toJson(), pH: this.anchorH.toJson() });
        
                V.touch2d();			
            }
            else
            {
                this.timer = setTimeout(this.processScan.bind(this), 0);
            }
        }
        else
        {
            this.timer = setTimeout(this.processScan.bind(this), 100);
        }
    }
    
    toJson(filter)
    {
        let content = {};
        
        if (filter == undefined || filter.includes("type"))
        {
            content.type = this.type;			
        }
        if (filter == undefined || filter.includes("point"))
        {
            content.point = this.anchor.toJson();			
        }
        if (filter == undefined || filter.includes("constraint"))
        {
            content.constraint = this.constraint.toJson();			
        }
        if (filter == undefined || filter.includes("pL"))
        {
            content.pL = this.anchorL.toJson();			
        }
        if (filter == undefined || filter.includes("pH"))
        {
            content.pH = this.anchorH.toJson();			
        }
        
        return Object.assign(super.toJson(filter), content);
    }
}


V2.FloodFill.Context = class
{
    constructor(widget, direction)
    {
        this.pixelSize = V.camera.pixelSize;
        
        this.xH = widget.anchorH.wx;
        this.yH = widget.anchorH.wy;
        this.xL = widget.anchorL.wx;
        this.yL = widget.anchorL.wy;
        
        this.w = Math.ceil((widget.anchorH.wx-widget.anchorL.wx)/this.pixelSize);
        this.h = Math.ceil((widget.anchorH.wy-widget.anchorL.wy)/this.pixelSize);
        this.texture = V2.FloodFill.Shader.instance.initialize(this.w, this.h);
        
        this.minX = Number.MAX_VALUE;
        this.minY = Number.MAX_VALUE;
        this.maxX = -Number.MAX_VALUE;
        this.maxY = -Number.MAX_VALUE;
        
        this.ray = new GM.Ray();
        this.ray.direction.x = 0;
        this.ray.direction.y = 0;
        this.ray.direction.z = -1;
        this.ray.origin.x = widget.anchor.wx;
        this.ray.origin.y = widget.anchor.wy;
        this.ray.origin.z = V.camera.position.z;
        
        let hits = V.viewer.raycast(this.ray,{ hits: [], distance: Number.POSITIVE_INFINITY }).hits;

        // depending on zoom ray.origin.z may be off a bit... correct here
        this.ray.direction.z = direction;
        this.ray.origin.z -= hits[0].distance;
            
        this.samples = {};
        
        this.id0 = hits[0].id;
        this.cache0 = new Float32Array(this.w*this.h);
        this.samples[this.id0] = []
        if (hits.length > 1)
        {
            this.id1 = hits[1].id;
            this.cache1 = new Float32Array(this.w*this.h);
            this.samples[this.id1] = []
        }
        
        this.stack = [{ x:widget.anchor.wx, y:widget.anchor.wy }];
    }
    
    sample(x,y)
    {
        let cx = Math.floor((this.xH - x)/this.pixelSize);
        let cy = Math.floor((this.yH - y)/this.pixelSize);
        let index = cy*this.w+cx;

        if (this.cache0[index] == 0.0)
        {
            this.ray.origin.x = x;
            this.ray.origin.y = y;
            let hits = V.viewer.raycast(this.ray,{ hits: [], distance: Number.POSITIVE_INFINITY }).hits;
            //console.log(hits[0].distance);
            if (hits.length)
            {
                this.cache0[index] = hits[0].distance;
                if (hits.length > 1)
                {
                    this.cache1[index] = hits[1].distance;
                }
            }
        }
        return index;
    }


    done()
    {
        return this.stack.length == 0;
    }
    
    
    //http://www.williammalone.com/articles/html5-canvas-javascript-paint-bucket-tool/
    scan()
    {
        for (var p in this.samples)
        {
            this.samples[p] = [];
        }
        
        var point = this.stack.pop();

        // move to top
        point.y -= this.pixelSize;
        while(point.y > this.yL)
        {
            let index = this.sample(point.x, point.y);
            if (this.outside(this.cache0[index]))
            {
                break;
            }
            point.y -= this.pixelSize;
        }
        
        // move to bottom
        point.y += this.pixelSize;
        var leftFlag = false;
        var rightFlag = false;
        
        while(point.y < this.yH)
        {
            var index = this.sample(point.x, point.y);
            if (this.outside(this.cache0[index]))
            {
                break;
            }
            else
            {
                var tx = Math.floor((point.x - this.xL)/this.pixelSize);
                var ty = Math.floor((point.y - this.yL)/this.pixelSize);
                
                this.minX = Math.min(point.x, this.minX);
                this.maxX = Math.max(point.x, this.maxX);
                this.minY = Math.min(point.y, this.minY);
                this.maxY = Math.max(point.y, this.maxY);
                
                this.texture[ty*this.w+tx] = this.color(index);
                
                this.samples[this.id0].push(this.cache0[index])
                if (this.id1)
                {
                    this.samples[this.id1].push(this.cache1[index])
                }
            }
            this.cache0[index] = Number.POSITIVE_INFINITY;
            
            // look left
            var px = point.x-this.pixelSize;
            if (px > this.xL)
            {
                let index = this.sample(px, point.y);
                if (this.inside(this.cache0[index]))
                {
                    if (!leftFlag)
                    {
                        this.stack.push({ x:px, y:point.y});
                        leftFlag = true;
                    }
                }
                else
                {
                    leftFlag = false;
                }
            }
            
            // look right
            var nx = point.x+this.pixelSize;
            if (nx < this.xH)
            {
                let index = this.sample(nx, point.y);
                if (this.inside(this.cache0[index]))
                {
                    if (!rightFlag)
                    {
                        this.stack.push({ x:nx, y:point.y});
                        rightFlag = true;
                    }
                }
                else
                {
                    rightFlag = false;
                }
            }
            point.y += this.pixelSize;
        }
        
        return this.samples;
    }
    
}


V2.FloodFill.Context.ABOVE = 1;
V2.FloodFill.Context.BELOW = 255;


V2.FloodFill.Upward = class extends V2.FloodFill.Context
{
    constructor(widget)
    {
        super(widget, 1);
    }
        
    inside(v1)
    {
        return v1 >= 0 && v1 != Number.POSITIVE_INFINITY;
    };
        
    outside(v1)
    {
        return v1 < 0 || v1 == Number.POSITIVE_INFINITY;;
    };
    
    color(index)
    {
        let dh;
        if (!this.cache1)
        {
            dh = this.cache0[index];
        }
        else
        {
            dh = this.cache0[index] - this.cache1[index];
        }
        
        if (dh >= 0.0)
        {
            return  V2.FloodFill.Context.ABOVE;
        }
        else
        {
            return V2.FloodFill.Context.BELOW;
        }
    }

}


V2.FloodFill.Downward = class extends V2.FloodFill.Context
{
    constructor(widget)
    {
        super(widget, -1);
    }

    inside(v1)
    {
        return v1 >= 0 && v1 != Number.POSITIVE_INFINITY;
    };
        
    outside(v1)
    {
        return v1 < 0 || v1 == Number.POSITIVE_INFINITY;
    };
    
    color(index)
    {
        let dh;
        if (!this.cache1)
        {
            dh = this.cache0[index];
        }
        else
        {
            dh = this.cache0[index] - this.cache1[index];
        }
    
        if (dh >= 0.0)
        {
            return V2.FloodFill.Context.BELOW;
        }
        else
        {
            return V2.FloodFill.Context.ABOVE;
        }
    }
}





V2.FloodFill.Shader = class extends GL.Shader
{
    constructor()
    {
        super(V2.FloodFill.Shader["vs"], V2.FloodFill.Shader["fs"]);
    
        var uv = new Float32Array(2*3*2);
        uv[0*2+0] = 0;
        uv[0*3+1] = 0;
        uv[1*2+0] = 1;
        uv[1*2+1] = 0;
        uv[2*2+0] = 1;
        uv[2*2+1] = 1;
        
        // triangle 2
        uv[3*2+0] = 0;
        uv[3*2+1] = 0;
        uv[4*2+0] = 1;
        uv[4*2+1] = 1;
        uv[5*2+0] = 0;
        uv[5*2+1] = 1;
        
        this.vbo = { uv:  new GL.ArrayBuffer(uv) ,  position:  new GL.ArrayBuffer(1) };
    }

    compile()
    {
        super.compile();
        
        this.defineAttribute("position", 2, gl.FLOAT, false);
        this.defineAttribute("uv", 2, gl.FLOAT, false);
        
        this.alpha = gl.getUniformLocation(this.glId, 'alpha');
        this.mode = gl.getUniformLocation(this.glId, 'mode');
        this.dxy = gl.getUniformLocation(this.glId, 'dxy');
        this.projection = gl.getUniformLocation(this.glId, 'projection');
        this.samplerMap = gl.getUniformLocation(this.glId, 'samplerMap');
    }
    
    initialize(w,h)
    {
        var position = new Float32Array(2*3*2);
        // triangle 1
        position[0*2+0] =  0;
        position[0*2+1] =  0;
        position[1*2+0] =  w;
        position[1*2+1] =  0;
        position[2*2+0] =  w;
        position[2*2+1] =  h;
        
        // triangle 2
        position[3*2+0] =  0;
        position[3*2+1] =  0;
        position[4*2+0] =  w;
        position[4*2+1] =  h;
        position[5*2+0] =  0;
        position[5*2+1] =  h;
        
        this.vbo.position.set(position);
        
        this.glTextureId = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.glTextureId);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        
        var buffer = new Uint8Array(w*h);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8UI, w, h, 0, gl.RED_INTEGER, gl.UNSIGNED_BYTE, buffer);
        gl.bindTexture(gl.TEXTURE_2D, null);
            
        return buffer;
    }
    
    update(w,h,buffer)
    {
        gl.bindTexture(gl.TEXTURE_2D, this.glTextureId);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8UI, w, h, 0, gl.RED_INTEGER, gl.UNSIGNED_BYTE, buffer);
        gl.bindTexture(gl.TEXTURE_2D, null);
    }
    
    setMode(mode)
    {
        gl.useProgram(this.glId);
        gl.uniform1f(this.mode, mode);
        gl.useProgram(null);
    }
    
    render(anchorL, anchorH, pixelSize, ddx, ddy, alpha)
    {
        gl.useProgram(this.glId);
        this.enableBuffer();
        this.bindBuffer(this.vbo);
        
        gl.activeTexture(gl.TEXTURE0);
        gl.uniform1i(this.samplerMap, 0);
        
        let prj = 2.0*pixelSize/V.camera.pixelSize;
        M.Shader.projection[0] = prj/(gl.drawingBufferWidth);
        M.Shader.projection[1] = prj/(gl.drawingBufferHeight);
        
        let pixelX = (anchorL.wx - ddx - V.camera.position.x)/pixelSize-ddx;
        let pixelY = (V.camera.position.y - anchorH.wy - ddy)/pixelSize;
        
        gl.uniform3f(this.projection, M.Shader.projection[0], M.Shader.projection[1], M.Shader.projection[2]);
        gl.uniform2f(this.dxy, pixelX, pixelY);
        gl.uniform1f(this.alpha, alpha);
        gl.bindTexture(gl.TEXTURE_2D, this.glTextureId);
        
        gl.disable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.drawArrays(gl.TRIANGLES, 0, this.vbo["position"].length/2);
        gl.disable(gl.BLEND);
        gl.enable(gl.DEPTH_TEST);
    }
}

V2.FloodFill.Shader["vs"] =`#version 300 es

precision mediump float;
precision mediump int;

uniform vec3 projection;
uniform vec2 dxy;

in vec2 uv;
in vec2 position;

out vec2 textureCoord;

void main()	
{

    textureCoord = uv;
    
    vec4 vertex = vec4((position.x + dxy.x), (position.y + dxy.y), 1.0, 1.0);
    vertex.x *= projection.x;
    vertex.y *= projection.y;
    gl_Position = vertex;
    
    textureCoord = uv;

    /*
    textureCoord = uv;
    
    vec4 vertex = vec4(position.x, position.y, 0, 1.0);
    vertex.x *= projection.x;
    vertex.y *= projection.y;
    gl_Position = vertex;
    */
}`

V2.FloodFill.Shader["fs"] =`#version 300 es

precision mediump float;
precision mediump int;

uniform mediump usampler2D samplerMap;
uniform vec3 transparent; 
uniform vec3 split;

uniform float mode;
uniform float alpha;

in vec2 textureCoord;

const uint UNDEF = uint(0);
const uint ABOVE = uint(1);
const uint BELOW = uint(255);

out vec4 fragmentColor;

void main()	
{
    uint color = texture(samplerMap, vec2(textureCoord.s, textureCoord.t)).r;
    
    if (color == UNDEF)
    {
        discard;
    } 
    else if (color == ABOVE)
    {
        fragmentColor =  vec4(0.0,1.0,0.0,alpha);
    }
    else if (color == BELOW)
    {
        fragmentColor =  vec4(1.0,0.0,0,alpha);
    }  
}`


V2.FloodFill.Shader.instance = null;








V2.FloodFill.Builder = class
{
    constructor(config, custom)
    {
        this.config = config || {};
        this.custom = custom;
        this.constraint = V.viewer.getConstraint();
    }

    addPoint(event, escaped)
    {
        return O.instance.createControlPoint(event, this.constraint);
    }

    removePoint(point)
    {
    }
    
    isDone(points)
    {
        return points.length == 1;
    }

    complete(points)
    {
        this.config.visible = true;
        this.config.type = "floodfill";
        this.config.point = points[0];
        this.config.pL =  { x: V.camera.min.x,  y: V.camera.min.y }; 
        this.config.pH =  { x: V.camera.max.x,  y: V.camera.max.y };
        this.config.constraint = this.constraint.toJson();
        
        V.postMessage("floodfill.record", this.config, this.custom);	
    }
}




V.recvMessage("floodfill.record", (args, custom) => 
{ 
    let builder = O.Builder.get();
    
    builder.start(new V2.FloodFill.Builder(args, custom));
});

V.recvMessage("floodfill.update", function(args, custom) 
{ 
    var object = O.instance.getObject(args.id);
    if (object)
    {
        object.update(args);
        V.postMessage("floodfill.update", args, custom);
        V.touch2d();
        V.touch3d();
    }
});

V.recvMessage("floodfill.select", function(args, custom) 
{ 
    var object = O.instance.getObject(args.id);
    if (object)
    {
        object.select();
        V.postMessage("floodfill.select", object.toJson(), custom);
        V.touch2d();
    }
});

V.recvMessage("floodfill.unselect", function(args, custom) 
{ 
    var object = O.instance.getObject(args.id);
    if (object)
    {
        object.unselect();
        V.postMessage("floodfill.unselect", args, custom);
        V.touch2d();
    }
});

V.recvMessage("floodfill.create", (args, custom) => 
{ 
    let object = new V2.FloodFill(args);
    O.instance.addObject(object);
    V.postMessage("floodfill.create", object.toJson(), custom);	
    
    V.touch3d();
    V.touch2d();
});

V.recvMessage("floodfill.delete", function(args, custom) 
{ 
    let object = O.find(args.id);
    if (object.selected)
    {
        object.unselect();
        V.postMessage("floodfill.unselect", object.toJson(), custom);	
    }
    
    V.postMessage("floodfill.delete", args, custom);	
    O.instance.removeObject(args.id);
    V.touch2d()
});

V.recvMessage("floodfill.scan.start", (args) => 
{
    let object = O.instance.getObject(args.id);
    if (object)
    {
        object.startScan(args.mode);	
    }
    else
    {
        V.postMessage("error", "floodfill not found " + args.id);		
    }
});

V.recvMessage("floodfill.scan.stop", (args) => 
{ 
    let object = O.instance.getObject(args.id);
    if (object)
    {
        object.stopScan();
        V.touch3d();
    }
    else
    {
        V.postMessage("error", "floodfill not found " + args.id);		
    }
});


V.recvMessage("floodfill.get", (args, custom) => 
{ 
    if (args && args.id)
    {
        var floodfill = O.instance.getObject(args.id);
        if (floodfill)
        {
            V.postMessage("floodfill.get", floodfill.toJson(args.filter), custom);
        }
    }
    else
    {
        V.postMessage("floodfill.get", O.getAll("floodfill"), custom); // TODO use filter here as well
    }
});