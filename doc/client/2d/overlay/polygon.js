
/** @constructor */
V2.MeshShader = function()
{
    GL.Shader.call(this, V2.MeshShader["vs"], V2.MeshShader["fs"]);
}

V2.MeshShader.prototype = Object.create(GL.Shader.prototype);
V2.MeshShader.prototype.constructor = V2.MeshShader;

V2.MeshShader.prototype.compile  = function()
{
    GL.Shader.prototype.compile.call(this);
    
    this.defineAttribute("position", 2, gl.FLOAT, false);
    this.defineAttribute("uv", 2, gl.FLOAT, false);
    this.alpha = gl.getUniformLocation(this.glId, 'alpha');
    this.depth = gl.getUniformLocation(this.glId, 'depth');
    
    this.dxy = gl.getUniformLocation(this.glId, 'dxy');
    this.projection = gl.getUniformLocation(this.glId, 'projection');
    this.samplerMap = gl.getUniformLocation(this.glId, 'samplerMap');
    
    gl.useProgram(this.glId);
    gl.uniform1i(this.samplerMap, 0);
    gl.useProgram(null);
}


V2.MeshShader.prototype.render3D  = function(vbo, height, alpha)
{
    gl.useProgram(this.glId);
    this.enableBuffer();
    this.bindBuffer(vbo);
    
    M.Shader.projection[0] = 2/gl.drawingBufferWidth;
    M.Shader.projection[1] = 2/gl.drawingBufferHeight;
    gl.uniform3f(this.projection, M.Shader.projection[0], M.Shader.projection[1], M.Shader.projection[2]);
    gl.uniform2f(this.dxy, V.camera.position.x, V.camera.position.y);

    let minH = V.viewer.aabb.min.z;
    let maxH = V.viewer.aabb.max.z;
    let dh = maxH - minH;
    if (dh == 0)
    {
        gl.uniform1f(this.depth, 1);
    }
    else
    {
        gl.uniform1f(this.depth, (height - minH)/(maxH - minH));
    }

    gl.uniform1f(this.alpha, alpha);
    
    gl.disable(gl.CULL_FACE);
    gl.enable(gl.BLEND);
    gl.drawArrays(gl.TRIANGLES, 0,vbo.position.length/2);
    gl.disable(gl.BLEND);
    gl.enable(gl.CULL_FACE);
}

V2.MeshShader["vs"] = `#version 300 es

precision mediump float;
precision mediump int;

uniform vec3 projection;
uniform vec2 dxy;

in vec2 uv;
in vec2 position;

out vec2 textureCoord;

void main()	
{
    //vec4 vertex = vec4((position.x - dxy.x), (dxy.y - position.y), 1.0, 1.0);
    textureCoord = uv;
    
    vec4 vertex = vec4(position.x, position.y, 0, 1.0);
    vertex.x *= projection.x;
    vertex.y *= projection.y;
    gl_Position = vertex;
}
`

V2.MeshShader["fs"] = `#version 300 es

precision mediump float;
precision mediump int;

uniform sampler2D samplerMap;
uniform float alpha; 
uniform float depth; 

in vec2 textureCoord;

out vec4 fragmentColor;

const float UNDEF = 128.0/255.0;
const float EDIT = 127.0/255.0;

const float MIN_BELOW = 0.0/255.0;
const float MAX_BELOW = 126.0/255.0;
const float MIN_ABOVE = 129.0/255.0;
const float MAX_ABOVE = 255.0/255.0;


void main()	
{
    gl_FragDepth = 1.0-depth;

    vec4 color = texture(samplerMap, vec2(textureCoord.s, textureCoord.t));

    if (color.r >= MIN_ABOVE)
    {
        // above
        fragmentColor = vec4(0,0.2+0.8*(color.r-MIN_ABOVE)/MAX_ABOVE,0,alpha);
    }
    else if (color.r <= MAX_BELOW)
    {
        // below
        fragmentColor = vec4(0.2+0.8*color.r/MAX_BELOW,0,0,alpha);
    }
    else if (color.r == UNDEF)
    {
        fragmentColor = vec4(0.95,0.95,0.95,alpha);
    } 
    else if (color.r == EDIT)
    {
        fragmentColor = vec4(0.95,0.95,0.0,alpha);
    }
    
    else
    {
        fragmentColor = vec4(1.0,1.0,1.0,alpha);
    }
    
}
`








V2.Polygon = class extends O.Polygon
{
    constructor(entry, callback)
    {
        super(entry, callback);
        
        if (!entry.H)
        {
            entry.H = this.aabb.center;
        }

        this.geometry.height = entry.height;
        
        this.controlUV = new V2.Polygon.UV(this);
        this.controlH = new V2.Polygon.H(this, entry);
        
        this.vbo = { 
                "position" :  new GL.ArrayBuffer(1),
                "uv" :  new GL.ArrayBuffer(1)
              };
        
        this.buffer = {
                position: new Float32Array(this.geometry.triangles.length*2), 
                uv: new Float32Array(this.geometry.triangles.length*2)
            };
        
        this.updateUV();

    
        this.glTextureId = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.glTextureId);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        this.initTexture(V2.Polygon.UNDEF);
    }
    
    toJson(filter)
    {
        let content = {};
        
        if (filter == undefined || filter.includes("h"))
        {
            content.H = this.controlH.location;
        }
        
        return Object.assign(super.toJson(filter), content);
    }
    
    update(entry)
    {
        if (typeof entry.mode !== 'undefined') 
        {
            if (entry.mode[O.VOLUME] != this.mode[O.VOLUME])
            {
                this.intiTexture(V2.Polygon.UNDEF);
            }
        }

        super.update(entry);
    }

    intersectRay3D(event)
    {
        var point = GM.Ray.intersectPlane(event.ray, this.geometry.plane, {});
        if (this.geometry.containsPoint(point))
        {
            return V.camera.distanceTo(point);
        }
        return Number.POSITIVE_INFINITY;
    }

    unselect()
    {
        if (!this.geometry.endScan())
        {
            this.stopScan();
        }
        super.unselect();
        
        this.initTexture(V2.Polygon.UNDEF);
    }

    //
    //
    //
    addControls()
    {
        this.addObject(this.controlUV);		
        this.addObject(this.controlH);		
    }

    removeControls()
    {
        this.removeObject(this.controlUV);		
        this.removeObject(this.controlH);		
    }

    updateMesh()
    {
        var position = this.buffer.position;
        var polygon = this.geometry;
        for (var i=0; i<polygon.triangles.length; i++)
        {
            var point = polygon.points[polygon.triangles[i]];
            var wx = polygon.center.x + point.u*polygon.u.x + point.v*polygon.v.x;
            var wy = polygon.center.y + point.u*polygon.u.y + point.v*polygon.v.y;
            position[i*2+0] = (wx - V.camera.position.x)/V.camera.pixelSize;
            position[i*2+1] = (V.camera.position.y - wy)/V.camera.pixelSize;
        }
        this.vbo.position.set(position);
    }

    updateUV()
    {
        var uv = this.buffer.uv;
        var polygon = this.geometry;
        for (var i=0; i<polygon.triangles.length; i++)
        {
            var point = polygon.points[polygon.triangles[i]];
            uv[i*2+0] = (point.u - polygon.umin)/polygon.du;
            uv[i*2+1] = (point.v - polygon.vmin)/polygon.dv;
        }
        this.vbo.uv.set(uv);
    }
    
    initTexture(state)
    {
        this.texture = this.loadTexture(new Uint8Array([state]), 1, 1);	
    }

    //
    //
    //
    startControl(control)
    {
        if (!this.geometry.endScan())
        {
            this.stopScan();
        }
        else
        {
            this.initTexture(V2.Polygon.UNDEF);
        }
    }

    moveControl()
    {
        super.moveControl();
        
        this.updateUV();

        this.controlUV.update();
        V.touch2d();
        V.touch3d();
    }

    endControl()
    {
        super.endControl();

        if (this.buffer.position.length != this.geometry.triangles.length*2)
        {
            this.buffer.position = new Float32Array(this.geometry.triangles.length*2);
            this.buffer.uv = new Float32Array(this.geometry.triangles.length*2);
            this.updateUV();
        }
    }

    render3D(event)
    {
        super.render3D(event);
        
        this.updateMesh();

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.glTextureId);
        if (this.texture.length > 1)
        {
            gl.disable(gl.DEPTH_TEST);
            
            //if (this.geometry.endScan())
            //{
            //	alpha = 0.70;
            //}
        }
            
        V2.MeshShader.instance.render3D(this.vbo, this.anchors[0].wz, this.scale*0.6);
        if (this.texture.length > 1)
        {
            gl.enable(gl.DEPTH_TEST);
        }
        
    }	

    loadTexture(buffer, width, height)
    {
        gl.bindTexture(gl.TEXTURE_2D, this.glTextureId);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, width, height, 0, gl.RED, gl.UNSIGNED_BYTE, buffer);
        gl.bindTexture(gl.TEXTURE_2D, null);
        return buffer;
    }

    //
    //
    //

    startScan()
    {
        var area = super.startScan(V.camera.pixelSize, { x:0, y:0, z:-1 });
        
        this.texture = new Uint8Array(area.du*area.dv);
        this.texture.fill(V2.Polygon.UNDEF, 0, this.texture.length);
        this.loadTexture(this.texture, area.du, area.dv);
        
        this.samples = {};
        Object.keys(V.viewer.datasets).forEach(id => this.samples[id] = []);
        V.postMessage("polygon.scan.start", { id: this.id, samples: this.samples });
    }


    stopScan()
    {
        if (!this.geometry.endScan())
        {
            super.stopScan();
            this.geometry.vPos = this.geometry.vEnd;
            this.texture = this.loadTexture(new Uint8Array([V2.Polygon.UNDEF]), 1, 1);
            
            this.samples = {};
            Object.keys(V.viewer.datasets).forEach(id => this.samples[id] = []);
            V.postMessage("polygon.scan.stop", { id: this.id });
        }
    }

    
    startLine(context)
    {
        this.samples = {};
        Object.keys(V.viewer.datasets).forEach(id => this.samples[id] = []);
    }

    sample(ray, resolution, u, v)
    {
        // cast from top of aabb
        let maxZ = V.viewer.aabb.max.z;
        let planeZ = ray.origin.z; 
        ray.origin.z = maxZ;
        var hits = V.viewer.raycast(ray,{ hits: [], distance: Number.POSITIVE_INFINITY }).hits;
        ray.origin.z = planeZ;

        // convert to distance from plane
        hits.forEach(hit => 
        { 
            hit.distance = maxZ - planeZ - hit.distance;
            this.samples[hit.id].push(hit.distance);
        });
        

        let height = 0; 
        if (hits.length > 1)
        {
            height = hits[0].distance - hits[1].distance;
        }
        else
        {
            height = hits[0].distance;
        }

        
        var uvTexture = Math.floor(v/resolution)*Math.ceil(this.geometry.du/resolution)+Math.floor(u/resolution);
        if (height == Number.POSITIVE_INFINITY)
        {
            this.texture[uvTexture] = V2.Polygon.UNDEF;
        }
        else if (height > 0)
        {
            this.texture[uvTexture] = V2.Polygon.MAX_ABOVE;
        }
        else
        {
            this.texture[uvTexture] = V2.Polygon.MAX_BELOW;
        }
    }
    
    endLine(context)
    {
        this.loadTexture(this.texture, context.du, context.dv);
        
        V.postMessage("polygon.scan.sample", { id:this.id, resolution: context.resolution, samples: this.samples });
        V.touch3d();
    }
}


// same as in shader
V2.Polygon.UNDEF = 128;
V2.Polygon.EDIT = 127;

V2.Polygon.MIN_BELOW = 0;
V2.Polygon.MAX_BELOW = 126;
V2.Polygon.MIN_ABOVE = 129;
V2.Polygon.MAX_ABOVE = 255;
V2.Polygon.H_RANGE = 126;


V2.Polygon.UV = class extends O.Object
{
    constructor(container)
    {
        super(container.id+"uv");
        
        this.container = container;
        this.geometry = container.geometry;
        
        this.anchor = this.addAnchor(new O.Anchor());
        this.anchor0 = this.addAnchor(new O.Anchor());
        this.anchor1 = this.addAnchor(new O.Anchor());
        this.anchor2 = this.addAnchor(new O.Anchor());
        this.anchor3 = this.addAnchor(new O.Anchor());
        
        this.style = new O.Style.Line([3,3], C.Plane.PASSIVE, O.Segment.NONE);
        
        this.line = this.addComponent(new O.Segment(this.anchor0, this.anchor1, null, this.style));
        this.line = this.addComponent(new O.Segment(this.anchor2, this.anchor3, null, this.style));
    }

    attach()
    {
        super.attach();
        this.update();
        this.controlPoint = this.addControl(new O.ControlPoint(this.anchor, new C.Plane (this.geometry.plane)));
    }

    startControl(control)
    {
        this.style.fillStyle = C.Plane.ACTIVE;
        this.style.lineWidth = 3;
        this.container.startControl();
    }

    endControl(control)
    {
        this.style.fillStyle = C.Plane.PASSIVE;
        this.style.lineWidth = 1;
        this.container.endControl();
    }

    moveControl(control)
    {
        var dx = this.anchor.wx - this.center.x;
        var dy = this.anchor.wy - this.center.y;
        
        this.container.translate(dx, dy, 0);
        this.anchor0.translate3D(dx, dy, 0);
        this.anchor1.translate3D(dx, dy, 0);
        this.anchor2.translate3D(dx, dy, 0);
        this.anchor3.translate3D(dx, dy, 0);
        
        this.center.x = this.anchor.wx;
        this.center.y = this.anchor.wy;
        this.container.moveControl();
    }

    update()
    {
        this.center = this.geometry.center;
        this.anchor.set3D(this.center);
        
        var range = 0.25*this.geometry.radius;
        var u = this.geometry.u;
        var v = this.geometry.v;
        this.anchor0.set3D({x:this.center.x+range*u.x,y:this.center.y+range*u.y,z:this.center.z+range*u.z});
        this.anchor1.set3D({x:this.center.x-range*u.x,y:this.center.y-range*u.y,z:this.center.z-range*u.z});
        this.anchor2.set3D({x:this.center.x+range*v.x,y:this.center.y+range*v.y,z:this.center.z+range*v.z});
        this.anchor3.set3D({x:this.center.x-range*v.x,y:this.center.y-range*v.y,z:this.center.z-range*v.z});
    }
}


V2.Polygon.H = class extends O.Object
{
    constructor(container, config)
    {
        super(container.id+"h");
        
        this.location = config.H;
        
        this.container = container;
        this.geometry = container.geometry;
        
        this.anchor = this.addAnchor(new O.Anchor(this.location));
    }
    
    attach()
    {
        super.attach();
        this.controlPoint = this.addControl(new O.ControlPoint(this.anchor, C.Surface.instance));
    }

    startControl(control)
    {
        this.container.startControl();
        this.container.initTexture(V2.Polygon.EDIT);
    }
    endControl(control)
    {
        this.container.initTexture(V2.Polygon.UNDEF);
        this.container.endControl();
    }

    moveControl(control)
    {
        this.container.translate(0, 0, control.anchor.wz - this.container.anchors[0].wz);
        
        this.location.x = control.anchor.wx;
        this.location.y = control.anchor.wy;
        this.location.z = control.anchor.wz;
        V.touch3d();
    }
}







/** @constructor */
C.Surface = function()
{
    this.strokeStyle = C.Surface.ACTIVE;
}
C.Surface.ACTIVE = "#40C4FF";
C.Surface.PASSIVE = "#40C4FF";

C.Surface.prototype.moveControl = function(event)
{
    return this.getPoint(event);;
}

C.Surface.prototype.getPoint = function(event)
{
    let ray = V.camera.getRay(event);
    
    let hits = V.viewer.raycast(ray,{ hits: [], distance: Number.POSITIVE_INFINITY }).hits;

    let distance = Number.POSITIVE_INFINITY;
    if (hits.length == 1)
    {
        distance = hits[0].distance;
        
    }
    else // 2
    {
        let ux = event.pageX/gl.drawingBufferWidth;
        let uy = event.pageY/gl.drawingBufferHeight;
        
        if (ux < M.splitV && uy < M.splitH)
        {
            distance = hits[0].distance;
        }
        else
        {
            distance = hits[1].distance;
        }
    }
        
    
    if (distance != Number.POSITIVE_INFINITY)
    {
        return ray.at(distance, {});
    }
    return null;
}

C.Surface.prototype.toJson = function()
{
    return ["Surface"];
}

C.Surface.instance = new C.Surface();









V.recvMessage("polygon.create", (args, params) => 
{ 
    if (O.Polygon.validate(args))
    {
        let polygon = new V2.Polygon(args);
        O.instance.addObject(polygon);
        params.uv = polygon.geometry.points;
        V.postMessage("polygon.create", polygon.toJson(), params);
        V.touch3d();
        V.touch2d();
    }
});

V.recvMessage("polygon.delete", function(args, params) 
{ 
    let object = O.find(args.id);
    if (object.selected)
    {
        object.unselect();
        V.postMessage("polygon.unselect", object.toJson(), params);	
    }
    
    V.postMessage("polygon.delete", args, params);	
    O.instance.removeObject(args.id);
    V.touch2d()
    V.touch3d();
});

V.recvMessage("polygon.scan.start", (args) => 
{
    let polygon = O.instance.getObject(args.id);
    if (polygon)
    {
        polygon.startScan();	
    }
    else
    {
        V.postMessage("error", "object not found " + args.id);		
    }
});

V.recvMessage("polygon.scan.stop", (args) => 
{ 
    let polygon = O.instance.getObject(args.id);
    if (polygon)
    {
        polygon.stopScan();
        V.touch3d();
    }
    else
    {
        V.postMessage("error", "object not found " + args.id);		
    }
});