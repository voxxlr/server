V3.MeshRenderer = class extends GL.ShaderMVP
{
    constructor()
    {
        super(V3.MeshRenderer['vs'], V3.MeshRenderer['fs']);
    }
    
    compile()
    {
        super.compile(this);
        
        this.defineAttribute("position", 3, gl.FLOAT, false);
        this.alpha = gl.getUniformLocation(this.glId, 'alpha');
    }

    render(vbo, alpha)
    {
        this.useProgram(V.camera);
        this.enableBuffer();
        this.bindBuffer(vbo);
        
        gl.uniform1f(this.alpha, alpha);
        gl.enable(gl.BLEND);
        gl.disable(gl.CULL_FACE);
        gl.drawArrays(gl.TRIANGLES, 0, vbo["position"].length/3);
        gl.enable(gl.CULL_FACE);
        gl.disable(gl.BLEND);
    }
}

V3.MeshRenderer.instance = null;
V3.MeshRenderer.get = function()
{
    if (!V3.MeshRenderer.instance)
    {
        V3.MeshRenderer.instance = new V3.MeshRenderer();
        V3.MeshRenderer.instance.compile();
    }
    
    return V3.MeshRenderer.instance;
}

V3.MeshRenderer['vs'] = `
precision mediump float;
precision mediump int;

uniform mat4 modelViewMatrix; 
uniform mat4 projectionMatrix; 

attribute vec3 position;


void main()	
{
    vec4 viewVertex = modelViewMatrix * vec4(position, 1.0 );
    
    gl_Position = projectionMatrix * viewVertex;
}`


V3.MeshRenderer['fs'] = `
precision mediump float;
precision mediump int;

uniform float alpha; 

void main()	
{
    gl_FragColor = gl_FrontFacing ?  vec4(0.95,0.95,0.95,0.4*alpha) : vec4(0.95,0.95,0.0,0.4*alpha);
}
`




V3.LineRenderer = class extends GL.ShaderMVP
{
    constructor()
    {
        super(V3.LineRenderer['vs'], V3.LineRenderer['fs']);
    }
    
    compile()
    {
        this.defines["ORTHOGRAPHIC"] = V.camera.projection == V3.ORTHOGRAPHIC;
        
        GL.ShaderMVP.prototype.compile.call(this);

        this.defineAttribute("position", 3, gl.FLOAT, false);
        this.defineAttribute("color", 3, gl.UNSIGNED_BYTE, true);

        // uniforms
        this.screenH = gl.getUniformLocation(this.glId, 'screenH');
        this.pointSize = gl.getUniformLocation(this.glId, 'pointSize');
        this.alpha = gl.getUniformLocation(this.glId, 'alpha');
        
        this.vbo = 
        {
            "position" :  new GL.ArrayBuffer(12), 
            "color" :  new GL.ArrayBuffer(1), 
        };
    }

    update(position, color)
    {
        this.vbo["position"].set(position);
        this.vbo["color"].set(color);
    }  	

    render3D(polygon, pointCount, alpha)
    {
        if (pointCount > 1)
        {
            this.useProgram(V.camera);
            this.enableBuffer();
            if (V.camera.projection == V3.ORTHOGRAPHIC)
            {
                gl.uniform1f(this.pointSize,polygon.resolution*44*V.camera.projection.zoom);
            }
            else
            {
                gl.uniform1f(this.pointSize,1.22474487139*polygon.resolution);
            }
            
            this.bindBuffer(this.vbo);
            gl.disable(gl.DEPTH_TEST);  
            gl.drawArrays(gl.POINTS, 0, pointCount);
            gl.enable(gl.DEPTH_TEST);  
        }
    }

    useProgram(camera, canvas)
    {
        GL.ShaderMVP.prototype.useProgram.call(this, camera);

        gl.uniform1f(this.screenH,gl.drawingBufferHeight);
    }
}

V3.LineRenderer.instance = null;
V3.LineRenderer.get = () =>
{
    if (!V3.LineRenderer.instance)
    {
        V3.LineRenderer.instance = new V3.LineRenderer();
        V3.LineRenderer.instance.compile();
    }
    
    return V3.LineRenderer.instance;
}


V3.LineRenderer['vs'] = `
precision mediump float;
precision mediump int;

uniform mat4 modelViewMatrix; 
uniform mat4 projectionMatrix; 

uniform float pointSize;
uniform float screenH;

attribute vec3 color;

attribute vec3 position;

varying vec4 pixelColor;
varying vec3 viewPosition;
varying vec3 worldPosition;
varying float discarded;

void main()	
{
    vec4 viewVertex = modelViewMatrix * vec4(position, 1.0 );

    gl_Position = projectionMatrix * viewVertex;
    
    #if defined(ORTHOGRAPHIC)
        gl_PointSize = pointSize;
    #else
        gl_PointSize = screenH*projectionMatrix[1][1]*pointSize/(-2.0*viewVertex.z);
    #endif
    
    pixelColor = vec4(color, 1);
}`


V3.LineRenderer['fs'] = `
precision mediump float;
precision mediump int;

varying vec4 pixelColor;


void main()	
{
    gl_FragColor = pixelColor;
    
}`





V3.ControlH = class extends O.Object
{
    constructor(container)
    {
        super(container.id+"h");
        
        this.container = container;
        this.geometry = container.geometry;
        
        this.pointAnchor = this.addAnchor(new O.Anchor());
        this.startAnchor = this.addAnchor(new O.Anchor());
    }
    
    attach()
    {
        super.attach(this);
        this.update();
        this.controlPoint = this.addControl(new O.ControlPoint(this.pointAnchor, new C.Ray(this.startAnchor, this.geometry.plane)));
    }

    startControl(control)
    {
        //this.container.styleH.fillStyle = C.Line.ACTIVE;
        //this.container.styleH.lineWidth = 3;
        this.container.startControl();
    }

    moveControl(control)
    {
        var dx = this.startAnchor.wx - this.pointAnchor.wx;
        var dy = this.startAnchor.wy - this.pointAnchor.wy;
        var dz = this.startAnchor.wz - this.pointAnchor.wz;
        this.geometry.height = Math.sqrt(dx*dx+dy*dy+dz*dz);
    }

    endControl(control)
    {
        this.container.endControl();//callback.update(this, {  height: this.geometry.height });
    }

    update()
    {
        var center = this.geometry.center;
        var normal = this.geometry.plane;
        var height = this.geometry.height;

        this.pointAnchor.set3D({ x: center.x + height*normal.x, y: center.y + height*normal.y, z: center.z + height*normal.z, });
        this.startAnchor.set3D({ x: center.x, y: center.y, z: center.z, });
    }
}







V3.ControlZ = class extends O.Object
{
    constructor(container)
    {
        super(container.id+"z");
        
        this.container = container;
        this.geometry = container.geometry;
        
        this.anchor = this.addAnchor(new O.Anchor());
        this.anchor0 = this.addAnchor(new O.Anchor());
        this.anchor1 = this.addAnchor(new O.Anchor());
        
        this.style = new O.Style.Line([3,3], C.Line.PASSIVE, O.Segment.NONE);
        
        this.line = this.addComponent(new O.Segment(this.anchor0, this.anchor1, null, this.style));
    }
    
    attach()
    {
        super.attach(this);
        this.update();
        this.controlPoint = this.addControl(new O.ControlPoint(this.anchor, new C.Line (this.anchor, this.geometry.plane)));
    }

    startControl()
    {
        this.style.fillStyle = C.Line.ACTIVE;
        this.style.lineWidth = 3;
        this.container.startControl();
    }

    endControl()
    {
        this.style.fillStyle = C.Line.PASSIVE;
        this.style.lineWidth = 1;
        this.container.endControl();
    }

    moveControl(control)
    {
        var dx = this.anchor.wx - this.center.x;
        var dy = this.anchor.wy - this.center.y;
        var dz = this.anchor.wz - this.center.z;
        
        this.container.translate(dx, dy, dz);
        this.anchor0.translate3D(dx, dy, dz);
        this.anchor1.translate3D(dx, dy, dz);
        
        this.center.x = this.anchor.wx;
        this.center.y = this.anchor.wy;
        this.center.z = this.anchor.wz;
        
        this.container.moveControl();
    }

    update()
    {
        this.center = this.geometry.center;
        this.anchor.set3D(this.center);
        
        var normal = this.geometry.plane;
        var range = 0.5*this.geometry.radius;
        this.anchor0.set3D({x:this.center.x+range*normal.x,y:this.center.y+range*normal.y,z:this.center.z+range*normal.z});
        this.anchor1.set3D({x:this.center.x-range*normal.x,y:this.center.y-range*normal.y,z:this.center.z-range*normal.z});
    }
    
}





//
//
//

V3.Polygon = class extends O.Polygon 
{
    constructor(entry, callback)
    {
        super(entry, callback);
        
        if (!entry.height)
        {
            var dx = this.aabb.max.x - this.aabb.min.x;
            var dy = this.aabb.max.y - this.aabb.min.y;
            var dz = this.aabb.max.z - this.aabb.min.z;
            entry.height = 0.2*Math.max(dx, Math.max(dy, dz));
        }
        
        this.geometry.height = entry.height;
        
        this.controlZ = new V3.ControlZ(this);
        this.controlUV = new O.ControlUV(this);
        this.controlH = new V3.ControlH(this);
        
        this.vbo = { "position" :  new GL.ArrayBuffer(1) };
    }
    
    addControls()
    {
        this.addObject(this.controlUV);		

        if (typeof V2 === 'undefined')
        {
            this.addObject(this.controlZ);
            
            if (this.mode[O.VOLUME])
            {
                this.addObject(this.controlH);
            }
        }
    }
    
    removeControls()
    {
        this.removeObject(this.controlUV);		

        if (typeof V2 === 'undefined')
        {
            this.removeObject(this.controlZ);
            
            if (this.mode[O.VOLUME])
            {
                this.removeObject(this.controlH);
            }
        }
    }


    intersectRay3D(event)
    {
        let point = GM.Ray.intersectPlane(event.ray, this.geometry.plane, {});
        
        if (this.geometry.containsPoint(point))
        {
            return V.camera.distanceTo(point);
        };
        return Number.POSITIVE_INFINITY;
    }

    
    onUpdate()
    {
        super.onUpdate.call(this);
        
        if (this.selected && this.constraint instanceof C.Polygon)
        {
            var angle = GM.Vector3.dot(V.camera.zAxis, this.geometry.plane);
            
            if (Math.abs(angle) > 0.7)
            {
                if (!this.controlUV.attached)
                {
                    this.addObject(this.controlUV);		
                }

                if (typeof V2 === 'undefined')
                {
                    if (this.controlZ.attached)
                    {
                        this.removeObject(this.controlZ);		
                    }
                }
            }
            else
            {
                if (this.controlUV.attached)
                {
                    this.removeObject(this.controlUV);		
                }

                if (typeof V2 === 'undefined')
                {
                    if (!this.controlZ.attached)
                    {
                        this.addObject(this.controlZ);		
                    }
                }
            }
        }
    }
    
    //
    //
    //

    update(entry)
    {
        super.update(entry);
        
        if (entry.mode)
        {
            if (this.mode[O.VOLUME] && !entry.mode[O.VOLUME])
            {
                this.stopScan();
            }
        }
    }
    
    //
    //
    //
    
    startControl(control)
    {
        if (this.mode[O.VOLUME])
        {
            this.stopScan();
        }
    }
    
    moveControl()
    {
        super.moveControl.call(this);
    
        if (this.controlUV.attached)
        {
            this.controlUV.update();
        }
        if (this.controlZ.attached)
        {
            this.controlZ.update();
        }
        if (this.controlH.attached)
        {
            this.controlH.update();
        }
    }
    
    
    
    render2D(context)
    {
        super.render2D(context);
    
        if (this.mode[O.VOLUME])
        {
            var h = this.geometry.height;
            var n = this.geometry.plane;
            var nx = n.x* h;
            var ny = n.y* h;
            var nz = n.z* h;
                
            var anchors = this.anchors;
            context.setTransform(1,0,0,1,0,0);
            for (var i=0; i<anchors.length; i++)
            {
                var a0 = anchors[i];
                var a1 = anchors[(i+1)%anchors.length];
                
                var p1 = V.camera.project({ x: a0.wx + nx, y: a0.wy + ny, z: a0.wz + nz });
                p1.x = p1.x*O.canvas.width;
                p1.y = p1.y*O.canvas.height;
            
                var p2 = V.camera.project({ x: a1.wx + nx, y: a1.wy + ny, z: a1.wz + nz });
                p2.x = p2.x*O.canvas.width;
                p2.y = p2.y*O.canvas.height;

            
                context.strokeStyle = C.Line.PASSIVE;
            
                context.beginPath();
                context.moveTo(a0.sx,a0.sy);
                context.lineTo(p1.x,p1.y);
                context.stroke();
            
                context.beginPath();
                context.moveTo(p1.x,p1.y);
                context.lineTo(p2.x,p2.y);
                context.stroke();
            }
        }
    }
    
    

    render3D(event)
    {
        let triangles = this.geometry.triangles;
        var buffer = new Float32Array(triangles.length*3);
        for (var i=0; i<triangles.length; i++)
        {
            var anchor = this.anchors[triangles[i]];
            buffer[i*3+0] = anchor.wx;
            buffer[i*3+1] = anchor.wy;
            buffer[i*3+2] = anchor.wz;
        }
        this.vbo["position"].set(buffer);		
        
        let renderer = V3.MeshRenderer.get();
        renderer.render(this.vbo, this.scale);

        if (this.pointCount)
        {
            renderer = V3.LineRenderer.get();
            renderer.render3D(this.geometry, this.pointCount, this.scale*0.6);
        }
    }	
    //
    //
    //

    startScan(resolution)
    {
        let area = this.geometry.getArea();
        let context = super.startScan(area*resolution, this.geometry.plane);
        this.position = new Float32Array(2*3*context.du);
        this.color = new Uint8Array(2*3*context.du);
        V.postMessage("polygon.scan.start", { id: this.id, samples:  { "undef" : [] } });
        this.pointCount = 0;
    }
    
    processScan()
    {
        super.processScan();
        
        if (!V.camera.moving)
        {
            var renderer = V3.LineRenderer.get();
            renderer.update(this.position, this.color);
            V.touch3d();
        }
    }
    
    stopScan()
    {
        super.stopScan(this);
        V.postMessage("polygon.scan.stop",  { id: this.id, samples: { "undef" : [] } });
        this.pointCount = 0;
    }
        
    startLine()
    {
        this.pointCount = 0;
        //this.samples = [];
        
        this.samples = 
        {
            "undef": []
        };
        
        //Object.keys(V.viewer.datasets).forEach(id => this.samples[id] = []);
    }
    
    sample(ray, resolution, u, v)
    {
        var intersect = V.viewer.raycast(ray, { distance: this.geometry.height }).distance;
        if (intersect != this.geometry.height)
        {
            intersect = Math.min(intersect, this.geometry.height);
            this.samples["undef"].push(intersect);
            
            var pointHeight =  intersect+resolution;
            var index = 3*this.pointCount;
            this.position[index + 0] = ray.origin.x + ray.direction.x*pointHeight; 
            this.position[index + 1] = ray.origin.y + ray.direction.y*pointHeight; 
            this.position[index + 2] = ray.origin.z + ray.direction.z*pointHeight;
            this.color[index + 0] = 0; 
            this.color[index + 1] = 255; 
            this.color[index + 2] = 0;
            this.pointCount ++;
            
            var pointHeight = intersect-resolution;
            var index = 3*this.pointCount;
            this.position[index + 0] = ray.origin.x + ray.direction.x*pointHeight; 
            this.position[index + 1] = ray.origin.y + ray.direction.y*pointHeight; 
            this.position[index + 2] = ray.origin.z + ray.direction.z*pointHeight;
            this.color[index + 0] = 0; 
            this.color[index + 1] = 255; 
            this.color[index + 2] = 0;
            this.pointCount ++;
            //this.content.volume += resolution*resolution*intersect;
        }
        else
        {
            this.samples["undef"].push(Number.POSITIVE_INFINITY);
    
            var index = 3*this.pointCount;
            this.position[index + 0] = ray.origin.x; 
            this.position[index + 1] = ray.origin.y; 
            this.position[index + 2] = ray.origin.z;
            this.color[index + 0] = 255; 
            this.color[index + 1] = 255; 
            this.color[index + 2] = 0;
            
            this.pointCount ++;
        }
    }
    
    endLine(context)
    {
        V.postMessage("polygon.scan.sample", { id: this.id, resolution: context.resolution, samples: this.samples });
    }
}
    




V.recvMessage("polygon.create", (args, params) => 
{ 
    if (O.Polygon.validate(args))
    {
        let polygon = new V3.Polygon(args);
        if (params.transform)
        {
            let transform = V.viewer.datasets[params.transform];
            if (transform)
            {
                transform.addAnchors(polygon);
            }
        }	
        O.instance.addObject(polygon);
        params.uv = polygon.geometry.points;
        V.postMessage("polygon.create", polygon.toJson(), params);	
        V.touch3d();
        V.touch2d();
    }
});

V.recvMessage("polygon.delete", function(args, params) 
{ 
    if (params.transform)
    {
        let transform = V.viewer.datasets[params.transform];
        if (transform)
        {
            let polygon = O.instance.getObject(args.id);
            transform.removeAnchors(polygon);
        }
    }
        
    let object = O.find(args.id);
    if (object.selected)
    {
        object.unselect();
        V.postMessage("polygon.unselect", object.toJson(), params);	
    }
    
    O.instance.removeObject(args.id);
    V.postMessage("polygon.delete", args, params);	
    V.touch2d();
    V.touch3d();
});


V.recvMessage("polygon.scan.start", (args, params) => 
{
    let polygon = O.instance.getObject(args.id);
    if (polygon)
    {
        polygon.startScan(args.resolution);	
    }
    else
    {
        V.postMessage("error", "polygon not found " + args.id);		
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
        V.postMessage("error", "polygon not found " + args.id);		
    }
});