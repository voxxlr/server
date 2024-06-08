
V3.Rotator = class extends O.Object
{
    constructor(transformer)
    {
        super("rotator");
        
        this.transformer = transformer;
        
        this.anchor = this.addAnchor(new O.Anchor());
        this.anchor.addListener(this);
        
        this.active = false;
        this.position = 0;

        this.ruler = new Path2D();
        this.ruler.moveTo(-V3.Rotator.DIMX,0);
        this.ruler.lineTo( V3.Rotator.DIMX,0);
        this.ruler.moveTo(0,-21);
        this.ruler.lineTo(0, 21);
        
        this.controlPoint = new O.ControlPoint(this.anchor, new C.Horizontal(this.anchor));
    }
    
    attach()
    {
        super.attach();
        this.addControl(this.controlPoint);
    }

    detach()
    {
        super.detach();
        this.removeControl(this.controlPoint);
    }

    startControl()
    {
        this.startPosition = this.anchor.sx;
        this.active = true;
        this.transformer.onSliderDown(); 
    }

    moveControl(control)
    {
        this.transformer.onSliderMove(3*(this.anchor.sx - this.startPosition)/gl.drawingBufferWidth); 
        V.touch3d();
    }

    endControl()
    {
        this.active = false;
        this.transformer.onSliderUp(); 
    }

    updatePosition (aabb)
    {
        var dx = (aabb.max.x - aabb.min.x)/2;
        var dy = (aabb.max.y - aabb.min.y)/2;
        var dz = (aabb.max.z - aabb.min.z)/2;
        var h = Math.sqrt(dx*dx + dy*dy + dz*dz);
        
        var cx = (aabb.max.x + aabb.min.x)/2;
        var cy = (aabb.max.y + aabb.min.y)/2;
        var cz = (aabb.max.z + aabb.min.z)/2;

        var axis = V.camera.yAxis;
        cx -= axis.x*dx*1.772;
        cy -= axis.y*dy*1.772;
        cz -= axis.z*dz*1.772;
        this.anchor.set3D({ x:cx, y:cy, z:cz});
    }

    render2D(context)
    {
        //context.setTransform(1,0,0,1,this.anchor.sx, this.anchor.sy + 10);

        context.setTransform(1,0,0,1,this.anchor.sx, this.anchor.sy);
        context.strokeStyle = "red";
        context.stroke(this.ruler);
    }
}

V3.Rotator.DIMX = 121;




V3.TransformerShader = class extends GL.ShaderMVP
{
    constructor()
    {
        super(V3.TransformerShader['vs'], V3.TransformerShader['fs']);
    }
    
    compile()
    {
        super.compile();
        
        this.defineAttribute("position", 3, gl.FLOAT, false);
        this.defineAttribute("uv", 2, gl.FLOAT, false);
        this.defineAttribute("face", 1, gl.FLOAT, true);
        
        this.sampler0 = gl.getUniformLocation(this.glId, 'sampler0');
        this.sampler1 = gl.getUniformLocation(this.glId, 'sampler1');
        
        // uniforms
        this.activeFace = gl.getUniformLocation(this.glId, 'activeFace');
    }
}

V3.TransformerShader['vs'] = `#version 300 es

precision mediump float;
precision mediump int;

uniform mat4 modelViewMatrix; 
uniform mat4 projectionMatrix;

in vec3 position;
in vec2 uv;
in float face;

out vec3 viewPosition;
out vec2 textureCoord;
out float currentFace;

void main()	
{
    vec4 viewVertex = modelViewMatrix * vec4(position, 1.0 );
    
    viewPosition = position.xyz;
    
    textureCoord = uv;
    currentFace = face;

    gl_Position = projectionMatrix * viewVertex;
}`

V3.TransformerShader['fs'] = `#version 300 es

precision mediump float;
precision mediump int;

in vec2 textureCoord;
in float currentFace;

uniform sampler2D sampler0;
uniform sampler2D sampler1;
uniform float activeFace; 

out vec4 fragmentColor;


void main()	
{
    //if (currentFace == 1.0)
    if (abs(currentFace - activeFace) < 0.2)
    {
        fragmentColor = texture(sampler1, vec2(textureCoord.s, textureCoord.t));
    }
    else
    {
        fragmentColor = texture(sampler0, vec2(textureCoord.s, textureCoord.t));
    }
    
    //fragmentColor = vec4(lColor, surfaceColor.a);
    

    /*
    //if (currentFace == 1.0)
    if (abs(currentFace - activeFace) < 0.2)
    {
        gl_FragColor = vec4(0.1,0.1,1.0,0.4);//texture2D(sampler1, vec2(textureCoord.s, textureCoord.t));
    }
    else
    {
        gl_FragColor = vec4(1.0,1.0,1.0,0.2);//texture2D(sampler0, vec2(textureCoord.s, textureCoord.t));
    }
    */
 }
`


V3.Transformer = class extends O.Composite 
{
    constructor()
    {
        super("transformer");
        
        this.shader = new V3.TransformerShader();
        this.shader.compile();

        this.uv = new GL.ArrayBuffer(new Float32Array([
                           0.0,0.0, 1.0,0.0, 1.0,1.0, 0.0,1.0,  // z-
                           0.0,0.0, 1.0,0.0, 1.0,1.0, 0.0,1.0,  // z+
                           0.0,0.0, 1.0,0.0, 1.0,1.0, 0.0,1.0,  // y-
                           0.0,0.0, 1.0,0.0, 1.0,1.0, 0.0,1.0,  // y+
                           0.0,0.0, 1.0,0.0, 1.0,1.0, 0.0,1.0,  // x-
                           0.0,0.0, 1.0,0.0, 1.0,1.0, 0.0,1.0,  // x+
                        ]));
        
        this.face = new GL.ArrayBuffer(new Float32Array([ // face index returned by Ray - Bounding Box collision
                                                        4, 4, 4, 4,  // z-
                                                        5, 5, 5, 5,  // z+
                                                        2, 2, 2, 2,  // y-
                                                        3, 3, 3, 3,  // y+
                                                        0, 0, 0, 0,  // x-
                                                        1, 1, 1, 1,  // x+
                                                        ]));

        this.normal =  [
                        { x:-1, y: 0, z:0 },  // x-
                        { x: 1, y: 0, z:0 },  // x+
                        { x: 0, y:-1, z:0 },  // y-
                        { x: 0, y: 1, z:0 },  // y+
                        { x: 0, y: 0, z:-1 },  // z-
                        { x: 0, y: 0, z: 1 }  // z+
                         ];

        this.index = new GL.ElementBuffer(new Uint16Array([
                                                         2,  1,  0,  0,  3,  2,  // z-
                                                         4,  5,  6,  6,  7,  4,  // z+
                                                         8,  9, 10, 10, 11, 8,  // y-
                                                         14, 13, 12, 12, 15, 14, // y+
                                                         18, 17, 16, 16, 19, 18, // x-
                                                         20, 21, 22, 22, 23, 20, // x+
                                                         ]));

        this.texture0 = new GL.Texture(new GL.ImageLoader("/3d/controls/transform-inactive.png"));
        this.texture1 = new GL.Texture(new GL.ImageLoader("/3d/controls/transform-active.png"));
        
        this.activeFace = -1;
        
        this.p0 = new GM.Vector3();
        this.p1 = new GM.Vector3();
        this.rotation = new GM.Quaternion();
        
        this.plane = GM.Plane.create();
        
        this.transformMatrix = GM.Matrix4.create();
        this.originalMatrix = GM.Matrix4.create();
        
        this.rotator = new V3.Rotator(this);
        
        this.ray = new GM.Ray();
    }

    attach()
    {
        super.attach();
        O.instance.addEventListener("onMouseDown", this);
        O.instance.addEventListener("onMouseMove", this);
        O.instance.addEventListener("onMouseUp", this);
    }

    detach()
    {
        super.detach();
        O.instance.removeEventListener("onMouseDown", this);
        O.instance.removeEventListener("onMouseMove", this);
        O.instance.removeEventListener("onMouseUp", this);
    }

    render3D(event)
    {
        if (!this.rotator.active)
        {
            // draw transformer
            V.camera.pushWorldMatrix(this.transformMatrix);
            
            this.shader.useProgram(V.camera);
            
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.texture0.glId);
            gl.uniform1i(this.shader.sampler0, 0);
            
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, this.texture1.glId);
            gl.uniform1i(this.shader.sampler1, 1);
            
            gl.uniform1f(this.shader.activeFace, this.activeFace);

            this.shader.enableBuffer(this);
            this.shader.bindBuffer(this);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.index.glId);
            gl.disable(gl.DEPTH_TEST);
            gl.enable(gl.BLEND);
            gl.drawElements(gl.TRIANGLES, this.index.length, gl.UNSIGNED_SHORT, 0);
            gl.disable(gl.BLEND);
            gl.enable(gl.DEPTH_TEST);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
            this.shader.disableBuffer(this);
            
            V.camera.popWorldMatrix();
        }
    }

    //
    //
    //

    updateTransform()
    {
        GM.Matrix4.copy(this.originalMatrix, this.transform.matrix);
        
        if (this.rotator.active)
        {
            GM.Matrix4.multiply(this.transform.matrix, this.transformMatrix, this.transform.matrix);
        }
        else
        {
            GM.Matrix4.multiply(this.transformMatrix, this.transform.matrix, this.transform.matrix);
        }
        
        this.transform.update();
    }

    containsPoint2D(event)
    {
        V.camera.getRay(event, this.ray);
        var intersect = this.ray.intersectBox(this.transform);
        if (intersect != null)
        {
            this.activeFace = intersect.face;
            GM.Plane.fromNormalPoint(this.normal[this.activeFace], this.ray.at(intersect.distance, this.p0), this.plane);
            return true;
        }	
        return false;
    }
    
    onUpdate()
    {
        GL.BoundingBox.copy(this.transform, this.aabb);

        // must be true in order for updateRange to get called
        if (this.active)
        {
            V.camera.moving = true;
        }
    }
    
    isVisible()
    {
        // make a function that checks intersection with the frustum except the near and far planes.
        return true; 
    }

    onMouseDown(event)
    {
        this.active = true;
        this.removeObject(this.rotator);
        event.stopImmediatePropagation();
    }

    onMouseMove(event)
    {
        if (this.activeFace >=0)
        {
            V.camera.getRay(event, this.ray);
            this.ray.intersectPlane(this.plane, this.p1);
            this.p1.sub(this.p0);
            
            GM.Matrix4.position(this.p1, this.transformMatrix);
            this.updateTransform();
        }
    }

    onMouseUp(event)
    {
        if (this.activeFace >=0)
        {
            V.postMessage("import.update", { id: this.transform.id, transform: Array.from(this.transform.matrix) });
            this.init();

            this.activeFace = -1;
            this.p1.x = 0;
            this.p1.y = 0;
            this.p1.z = 0;
            
            this.rotator.updatePosition(this.transform)
            this.addObject(this.rotator);
            V.touch2d();
        }
        this.active = false;
    }

    //
    //
    //

    onSliderDown()
    {
    }

    onSliderMove(value)
    {
        this.rotation.fromAxisAngle({x:0,y:1,z:0},value*3.1472);
        
        GM.Matrix4.quaternion(this.rotation, this.transformMatrix);
        this.updateTransform();
    }

    onSliderUp()
    {
        V.postMessage("import.update", { id: this.transform.id, transform: Array.from(this.transform.matrix) });
        this.init();
        
        this.rotator.updatePosition(this.transform)
    }

    init()
    {
        let min = this.transform.min;
        let max = this.transform.max;
        this.position = new GL.ArrayBuffer(new Float32Array( [min.x, min.y, min.z,
                                                              max.x, min.y, min.z,
                                                              max.x, max.y, min.z,
                                                              min.x, max.y, min.z,   // z-
                                                                 
                                                              min.x, min.y, max.z,
                                                              max.x, min.y, max.z,
                                                              max.x, max.y, max.z,
                                                              min.x, max.y, max.z,  // z+

                                                              min.x, min.y, min.z,
                                                              max.x, min.y, min.z,
                                                              max.x, min.y, max.z,
                                                              min.x, min.y, max.z,  // y-
                                                             
                                                              min.x, max.y, min.z,
                                                              max.x, max.y, min.z,
                                                              max.x, max.y, max.z,
                                                              min.x, max.y, max.z,  // y+
        
                                                              min.x, min.y, min.z,
                                                              min.x, max.y, min.z,
                                                              min.x, max.y, max.z,
                                                              min.x, min.y, max.z,  // x-
                                                                 
                                                              max.x, min.y, min.z,
                                                              max.x, max.y, min.z,
                                                              max.x, max.y, max.z,
                                                              max.x, min.y, max.z, // x+ 
                                                             ]));
        GM.Matrix4.copy(this.transform.matrix, this.originalMatrix);
        
        GM.Matrix4.copy([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ], this.transformMatrix);
    }

    set(transfrom)
    {
        if (this.transform)
        {
            this.clr();
        }
        O.instance.addObject(this);
        
        this.transform = transfrom;
        this.init();
        this.addObject(this.rotator);
        this.rotator.updatePosition(this.transform);
        V.touch3d();
    }

    clr()
    {
        if (this.transform != null)
        {
            O.instance.removeObject(this.id);
            this.removeObject(this.rotator);
            this.transform = null;
            V.touch3d();
        }
    }
};

V3.Transformer.get = ()=>
{
    if (!V3.Transformer.instance)
    {
        V3.Transformer.instance = new V3.Transformer();
    }
    return V3.Transformer.instance
}

    
V.recvMessage("*.unselect", (args, custom) => 
{ 
    if (V3.Transformer.instance)
    {
        if (V3.Transformer.instance.transform)
        {
            V.postMessage("import.unselect", V3.Transformer.instance.transform.toJson(), custom);
            V3.Transformer.instance.clr();
        }
    }
});		








V3.Transform = class
{
    constructor(id, config, model)
    {
        this.id = id;
        this.type = "import";
        this.model =  model;
        this.visible = config.hasOwnProperty("visible") ? config.visible : true;
        
        GL.BoundingBox.copy(this.model, GL.BoundingBox.init(this));
        GL.BoundingBox.transform(this.model, config.transform, this);
            
        this.matrix = GM.Matrix4.init(config.transform);
        this.inverse = GM.Matrix4.invert(config.transform, GM.Matrix4.create());
        
        //this.boundingBox = new GL.BoundingBox(this);

        this.ray = new GM.Ray();
        
        this.visible = true;
        
        this.frustum = GM.Frustum.create();
        
        V.recvMessage("import.viewpoint", (args)=> 
        { 
            if (args.id == this.id)
            {
                if (args.viewpoint)
                {
                    let viewpoint = args.viewpoint[this.model.id];
                    if (viewpoint)
                    {
                        this.model.setViewpoint(viewpoint);
                    }
                }
                else
                {
                    this.model.setViewpoint(null);
                }
                
                V.touch3d();
            }
        });
        
        V.recvMessage("import.update", (args)=> 
        { 
            if (args.id == this.id)
            {
                if (typeof args.visible != "undefined")
                {
                    this.visible = args.visible;
                }
                
                V.postMessage("import.update", args);
                
                V.touch3d();
            }
        });
    
        this.objects = [];
    }
    
    update()
    {
        GM.Matrix4.invert(this.matrix, this.inverse);
    
        GL.BoundingBox.transform(this.model, this.matrix, this);
        
        this.objects.forEach(object =>
        {
            object.anchors.forEach(anchor =>
            {
                let worldPt = GM.Vector3.transform(anchor, this.matrix, {});
                anchor.wx = worldPt.x;
                anchor.wy = worldPt.y;
                anchor.wz = worldPt.z;
            })
            object.projectAnchors();
        });
    }
    
    
    render(frustum)
    {
        /*
        if (M.PbrMaterial.instance)
        {
            M.PbrMaterial.instance.updateModelMatrix(V.camera);
        }
        */
        if (this.visible)
        {
            if (GM.Frustum.intersectsBox(frustum, this))
            {
                GM.Frustum.transform(frustum, this.inverse, this.frustum);
                
                V.camera.pushWorldMatrix(this.matrix);
                this.model.render(this.frustum);
                V.camera.popWorldMatrix();
            }
        }
        
        
        /*
        if (M.PbrMaterial.instance)
        {
            M.PbrMaterial.instance.updateModelMatrix(V.camera);
        }
        */
        //this.boundingBox.render(V.camera);
    }

    raycast(ray, options)
    {
        var intersect = ray.intersectBox(this);
        if (intersect != null)
        {
            let distance = options.distance;
            
            GM.Ray.transform(ray, this.inverse, this.ray)
            
            this.model.raycast(this.ray, options);
            
            if (options.distance < distance)
            {
                if (options.normal)
                {
                    GM.Vector3.rotate(options.normal, this.matrix, options.normal);
                }
                
                if (options.xyz)
                {
                    GM.Vector3.transform(options.xyz, this.matrix, options.xyz);
                }
            }
        }
    }
    
    addAnchors(object)
    {
        object.anchors.forEach(anchor =>
        {
            anchor.x = anchor.wx;
            anchor.y = anchor.wy;
            anchor.z = anchor.wz;
            let worldPt = GM.Vector3.transform(anchor, this.matrix, {});
            anchor.wx = worldPt.x;
            anchor.wy = worldPt.y;
            anchor.wz = worldPt.z;
        })
        object.projectAnchors();
        this.objects.push(object);
    }
    
    removeAnchors(object)
    {
        let index = this.objects.indexOf(object);
        this.objects.splice(index, 1);
    }


    unload()
    {
        if (V3.Transformer.instance)
        {
            if (V3.Transformer.instance.transform == this)
            {
                V3.Transformer.instance.clr();
            }
        }
        this.model.unload();
    }
    
    
    setViewpoint(viewpoint)
    {
        if (viewpoint.visible != this.visible)
        {
            this.visible = viewpoint.visible,
            V.postMessage("import.update", { id: this.id, visible: this.visible });
        }

        if (viewpoint.model)
        {
            this.model.setViewpoint(viewpoint.model)
        }

        /*
        if (viewpoint)
        {
            this.matrix = GM.Matrix4.init(viewpoint.transform);
            this.inverse = GM.Matrix4.invert(viewpoint.transform, this.inverse);
            GL.BoundingBox.transform(this.model, viewpoint.transform, this);
            
            if (V3.Transformer.instance)
            {
                if (V3.Transformer.instance.transform == this)
                {
                    V3.Transformer.instance.init();
                }
            }
        }
        */
    }
    
    getViewpoint()
    {
        let viewpoint = 
        { 
            visible: this.visible, 
            model: this.model.getViewpoint()
        }
        
        return viewpoint;
    }
    
    toJson()
    {
        let config = 
        {
            id: this.id, 
            type: "import",
            document: this.model.id,
            transform: Array.from(this.matrix)
        }
        return config;
    }
    
}



