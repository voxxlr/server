var V3 = {
    EXPLORER : "explorer",
    INSPECTOR : "inspector",
    TOUCH : "touch",
    EDITOR: 0,
    VIEWER: 1,
    CLOUD : "cloud",
    MESH : "model"
};

V3.Viewer = class extends V.Viewer
{
    constructor(document)
    {
        super({
            alpha: false,
            depth: true,
            stencil: false,
            antialias: true,
            premultipliedAlpha: false,
            preserveDrawingBuffer: false
        });
        
        V3.PERSPECTIVE = new GM.PerspectiveProjection(90);
        V3.ORTHOGRAPHIC = new GM.OrthographicProjection();

        V.camera = new V3.Camera(this.canvas, V3.PERSPECTIVE, 1);
        V.camera.moving = true;

        this.controller = new V3.Controller();
        this.controller.attach();
        
        this.axis = new GL.Axis(1,1,1);
        this.axis.visible = false;

        V.recvMessage("import.create", (document, config) => 
        { 
            let id = config.id;
            if (!this.datasets[id])
            {
                let model = null;
                
                if (document.type == V3.CLOUD)
                {
                    model = new M.Cloud(document, V.importCb.bind(config));
                }
                else if (document.type == V3.MESH)
                {
                    model = new M.Model(document, V.importCb.bind(config));
                }
                else
                {
                    V.postMessage("error", "mismatching viewer and document types");		
                }
                
                if (model)
                {
                    this.range = GL.BoundingBox.diagonal(model);
                    if (config.transform)
                    {
                        model = new V3.Transform(id, config, model);
                    }
                    this.load(id, model);
                }
                V.touch3d();
            }
            else
            {
                V.postMessage("error", "duplicate document id " + id);
            }
        });
        
        V.recvMessage("*.get", (args, custom) => 
        { 
            for (var id in this.datasets)
            {
                if (this.datasets[id] instanceof V3.Transform)
                {
                    args[id] = this.datasets[id].toJson();
                }
            };
            V.postMessage("*.get", args, custom);
        });
        
        V.recvMessage("axes", (args, custom) => 
        { 
            if (args.hasOwnProperty("origin"))
            {
                this.axis.moveTo(args.origin.x, args.origin.y, args.origin.z);
            }
            if (args.hasOwnProperty("visible"))
            {
                this.axis.visible = args.visible;
            }
            V.postMessage("axes", args, custom);
            V.touch3d();
        });

        // thus one must be called last since it bounces the message 
        V.recvMessage("viewpoint.get", (args) => 
        { 
          //  V3.NavCube.toJson(args);
          //  V3.Target.toJson(args);
            
            for (var id in this.datasets)
            {
                args[id] = this.datasets[id].getViewpoint();
            };
            
            V.postMessage("viewpoint.get", args); 
        });



        V.recvMessage("import.select", (args, custom) => 
        {
            if (this.datasets[args.id] && this.datasets[args.id] instanceof V3.Transform)
            {
                let transformer = V3.Transformer.get();
                transformer.set(this.datasets[args.id]);
                V.postMessage("import.select", args, custom);
            }
            else
            {
                V.postMessage(`${args.id} is not a transform`);
            }
        });
        
        V.recvMessage("import.unselect", (args, custom) => 
        { 
            if (this.datasets[args.id] && this.datasets[args.id] instanceof V3.Transform)
            {
                let transformer = V3.Transformer.get();
                transformer.clr();
                V.postMessage("import.unselect", args, custom);
            }
            else
            {
                V.postMessage(`${args.id} is not a transform`);
            }
        });


        V.to1DUnitString = (number) =>
        {
            switch (V.units)
            {
            case V.METRIC:
                return O.numberFormat.format(number.toFixed(2)) +" m";
            case V.IMPERIAL:
                {
                    var inches = number*39.3701;
                    var feet = Math.floor(inches/12);
                    inches = Math.round(inches-feet*12);
                    return O.numberFormat.format(feet) + "' " + inches + "\"";		
                }
            }
        }

        V.to2DUnitString = (number) =>
        {
            switch (V.units)
            {
            case V.METRIC:
                return O.numberFormat.format(number.toFixed(2)) +" m\u00B2";
            case V.IMPERIAL:
                return O.numberFormat.format((number*10.7639).toFixed(2)) +" ft\u00B2";
            }
        }

        V.to3DUnitString = (number) =>
        {
            switch (V.units)
            {
            case V.METRIC:
                return O.numberFormat.format(number.toFixed(2)) +" m\u00B3";
            case V.IMPERIAL:
                return O.numberFormat.format((number*35.3147).toFixed(2)) +" ft\u00B3";
            }
        }

        //this.frameBuffer = new GL.FrameBuffer();
        
        this.animate();
    }
    
    render()
    {
        if (V.camera.moving)
        {
            V.camera.updateRange(this.aabb);
        }
        V.camera.updateMatrix();
        

        if (this.frameBuffer)
        {
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer.glId);
        }

        GL.BoundingBox.init(this.aabb);
        for (var id in this.datasets)
        {
            let entry = this.datasets[id];
            if (V.camera.intersectsBox(entry))
            {
                if (entry.visible)
                {
                    entry.render(V.camera.frustum);
                }
            }
            GL.BoundingBox.merge(this.aabb, entry);

            this.axis.resize(this.aabb, V.camera);
        }
        
        this.axis.render(V.camera);

        if (this.frameBuffer)
        {
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            
            this.frameBuffer.render();
        }
    }
    
    getDistanceAlpha(point, p0, p1)
    {
        let d = V.camera.distanceTo(point);
        if (p0 != p1)
        {
            return GM.clamp((p1-d)/(p1-p0), 0, 1);
        }
        return d < p0 ? 1 : 0;
    }

    getConstraint()
    {
        if (V.camera.projection === V3.PERSPECTIVE)
        {
            return C.create(["Intersect"]);
        }
        else
        {
            return C.create(["Plane", V.camera.getNearPlane() ]);
        }	
    }
    
    load(id, model)
    {
        super.load(id, model);
        
        if (model.visible && Object.keys(this.datasets).length == 1)
        {
            this.controller.load(model)
        }
        
        V.camera.updateRange(this.aabb);
    }
};













GL.FrameBuffer = function FrameBuffer()
{
    // Create a color texture
    this.colorTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.colorTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
    
    /*
    this.colorBuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.colorBuffer);
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, 4, gl.RGBA8, size, size);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    */

    // Create the depth texture
    this.depthTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.depthTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);

    this.glId = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.glId);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.colorTexture, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.depthTexture, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    
    this.position = new GL.ArrayBuffer(new Float32Array([
                                                      // First triangle:
                                                      1.0,  1.0, 0.0,
                                                     -1.0,  1.0, 0.0,
                                                     -1.0, -1.0, 0.0,
                                                     // Second triangle:
                                                     -1.0, -1.0, 0.0,
                                                      1.0, -1.0, 0.0,
                                                      1.0,  1.0, 0.0
                                                     ]));

    //this.shader = shader;
    //this.shader.compile();

/*
    this.colorBuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.colorBuffer);
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, 4, gl.RGBA8, size, size);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    
    this.glId = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.glId);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, this.colorBuffer);
    //gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.depthTexture, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    
    this.glCopyId = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.glCopyId);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.colorTexture, 0);
    //gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.depthTexture, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
*/
    
}

GL.FrameBuffer.prototype.render = function ()
{
}

GL.FrameBuffer.prototype.render = function (shader)
{
    /*
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.glId);
    gl.blitFramebuffer(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    */
    /*
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, framebuffers[FRAMEBUFFER.RENDERBUFFER]);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, framebuffers[FRAMEBUFFER.COLORBUFFER]);
    gl.clearBufferfv(gl.COLOR, 0, [0.0, 0.0, 0.0, 1.0]);
    gl.blitFramebuffer(0, 0, FRAMEBUFFER_SIZE.x, FRAMEBUFFER_SIZE.y, 0, 0, FRAMEBUFFER_SIZE.x, FRAMEBUFFER_SIZE.y,gl.COLOR_BUFFER_BIT, gl.NEAREST);	
    */
    
    shader.useProgram();
    
    gl.enableVertexAttribArray(this.shader.position);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.position.glId);
    gl.vertexAttribPointer(this.shader.position, 3, gl.FLOAT, false, 0, 0);
    
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.colorTexture);
    gl.uniform1i(this.shader.color, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.colorTexture);
    gl.uniform1i(this.shader.depth, 1);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
    
    gl.disableVertexAttribArray(this.shader.position);

}

GL.FrameBuffer.prototype.resize = function ()
{
    gl.bindTexture(gl.TEXTURE_2D, this.colorTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
    
    gl.bindTexture(gl.TEXTURE_2D, this.depthTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
}

















//check if clipped
/* TODO MAke this work
seesBox(box)
{
    for (var i=0; i<4; i++)
    {
        var plane = i*4;
        var w = this.clipPlanes[plane+3];
        if (w != 0)
        {
            var nx = this.clipPlanes[plane+0];
            var ny = this.clipPlanes[plane+1];
            var nz = this.clipPlanes[plane+2];
            
            var radius = Math.abs(nx*box.extents.x) + Math.abs(ny*box.extents.y) + Math.abs(nz*box.extents.z);
            
            var d = nx*box.center.x + ny*box.center.y + nz*box.center.z - w;
            if (d>radius)
            {
                // in front of plane
            }
            else if (d<-radius)
            {
                // behind plane 
                return false;  //TODO Make this work
            }
            else
            {
                // intersecting
            }
        }
    }
    return this.frustum.intersectsBox(box);
};

setClipping(planes)
{
    if (planes)
    {
        for (var i=0; i<planes.length; i++)
        {
            this.clipPlanes[i] = planes[i];
        }
    }
    else
    {
        this.clipPlanes.fill(0);
    }
};

clrClipPlane(index)
{
    this.clipPlanes[index*4+0] = 0;
    this.clipPlanes[index*4+1] = 0;
    this.clipPlanes[index*4+2] = 0;
    this.clipPlanes[index*4+3] = 0;
}
hasClipPlane(index)
{
    return this.clipPlanes[index*4+3] != 0;
}

clipNear(index)
{
    var normal = this.frustum.planes[5].normal;
    
    var distance = this.projection.getNear();
    var xPos = this.position.x + normal.x*distance;
    var yPos = this.position.y + normal.y*distance;
    var zPos = this.position.z + normal.z*distance;
    
    this.clipPlanes[index*4+0] = normal.x;
    this.clipPlanes[index*4+1] = normal.y;
    this.clipPlanes[index*4+2] = normal.z;
    this.clipPlanes[index*4+3] = xPos*normal.x + yPos*normal.y + zPos*normal.z;
}

clipFar(index)
{
    var normal = this.frustum.planes[4].normal;
    
    var distance = this.projection.getFar()
    var xPos = this.position.x - normal.x*distance;
    var yPos = this.position.y - normal.y*distance;
    var zPos = this.position.z - normal.z*distance;
    
    this.clipPlanes[index*4+0] = normal.x;
    this.clipPlanes[index*4+1] = normal.y;
    this.clipPlanes[index*4+2] = normal.z;
    this.clipPlanes[index*4+3] = xPos*normal.x + yPos*normal.y + zPos*normal.z;
}	
    */

