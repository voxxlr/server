
/*
O.Icon3D = class extends O.Icon2D
{
    constructor(anchor, icon, size)
    {
        super(anchor, icon, size);
        
        this.image.onload = ()=>
        {
            this.glTexture = new GL.Texture(this.image);
        }
        
        // JSTIER reuse shader and vbo... .render these together
        this.shader = new GL.ShaderMVP(document.getElementById('overlay/icon.vs').textContent, document.getElementById('overlay/icon.fs').textContent);
        this.shader.compile();
        this.shader.defineAttribute("position", 3, gl.FLOAT, false);
        
        this.sampler0 = gl.getUniformLocation(this.shader.glId, 'sampler');
        this.location = gl.getUniformLocation(this.shader.glId, 'location');
        this.scalar = gl.getUniformLocation(this.shader.glId, 'scale');
        
        this.vbo = 
        {
            "position" :  new GL.ArrayBuffer(new Float32Array([-0.5, -0.5, 0, 
                                                                0.5, -0.5, 0, 
                                                                0.5,  0.5, 0,
                                                                0.5,  0.5, 0,
                                                               -0.5,  0.5, 0, 
                                                               -0.5, -0.5, 0])) 
        };
    }

    setIcon(icon)
    {
        super.setIcon(icon);
        
        this.image.onload = ()=>
        {
            this.glTexture.notify(this.image);
        }
    }

    render2D(context, event)
    {
        if (this.selected)
        {
            super.render2D(context);
        }
    }
    
    render3D(context)
    {
        if (!this.selected)
        {
            var a = 0.5*this.size*this.scale;
            
            this.shader.useProgram(V.camera);
            gl.uniform3f(this.location, this.anchor.wx, this.anchor.wy, this.anchor.wz);
            gl.uniform1f(this.scalar, 2*1.72*a/Math.min(gl.drawingBufferHeight, gl.drawingBufferWidth));
            
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.glTexture.glId);
            gl.uniform1i(this.sampler0, 0);
            
            this.shader.enableBuffer();
            this.shader.bindBuffer(this.vbo);
            gl.enable(gl.BLEND);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
            gl.disable(gl.BLEND);
        }
    }
}


O.Icon3D["vs"] = `#version 300 es

precision mediump float;
precision mediump int;

uniform mat4 modelViewMatrix; 
uniform mat4 projectionMatrix; 

uniform vec3 location; 
uniform float scale;

in vec3 position;

out vec2 uv;

void main()	
{
    vec4 viewVertex = modelViewMatrix * vec4(location, 1.0 );
    
    uv = 1.0 - position.xy + 0.5;
    gl_Position = projectionMatrix * viewVertex;
    gl_Position /= gl_Position.w;
    
    
    gl_Position.xy += position.xy*vec2(projectionMatrix[0][0], projectionMatrix[1][1])*scale;
    gl_Position.z -= 0.001*gl_Position.w;
}`

O.Icon3D["fs"] = `#version 300 es

precision mediump float;
precision mediump int;

uniform sampler2D sampler;

in vec2 uv;

out vec4 fragmentColor;

void main()	
{
    vec2 circle = uv;
    float r = 0.2;
    float d = length(circle);
    float t = 1.0 - smoothstep(r,r+0.3,d) - smoothstep(r,r-0.3,d);

//    fragmentColor = vec4(vec3(0.0,0.502,1.00),t);
//    fragmentColor = vec4(color,t);
    fragmentColor = vec4(1,0,1,1);
    
    vec4 color = texture(sampler, uv);
    
    fragmentColor = color;

 }
`
*/


O.Point = class extends O.Object
{
    constructor(entry)
    {
        super(entry.id, entry.activation, entry.exclude);
        this.type = "point";
        this.visible =  entry.visible;
        this.constraint = C.create(entry.constraint);
        
        this.anchor = this.addAnchor(new O.Anchor(entry.point));
        this.projectAnchors();
        
        this.exec = {};
        if (entry.code.init)
        {
            this.exec.init = Function("return " + decodeURI(entry.code.init))();
        }
        if (entry.code.render2d)
        {
            this.exec.render2d = Function("return " + decodeURI(entry.code.render2d))();
        }
        if (entry.code.update)
        {
            this.exec.update = Function("return " + decodeURI(entry.code.update))();
        }
        if (entry.code.intersect)
        {
            this.exec.intersect = Function("return " + decodeURI(entry.code.intersect))();
        }
        
        this.scope = Object.assign({}, entry.scope);
        if (this.exec.init)
        {
            this.exec.init.call(this.scope);
        }
        
        this.source = {
            
            code: entry.code,
            scope: entry.scope
        }
        
        this.meta = entry.meta;
    }
    
    CLICK(event) 
    { 
        event.point = { x:this.anchor.wx, y:this.anchor.wy, z:this.anchor.wz };
        event.meta = this.meta;
        return event;
    }
    
    DBLCLICK(event) 
    { 
        event.point = { x:this.anchor.wx, y:this.anchor.wy, z:this.anchor.wz };
        event.meta = this.meta;
        return event; 
    }

    
    update(args)
    {
        super.update(args);
        
        if (args.point)
        {
            this.anchor.set3D(args.point);
            this.projectAnchors();
        }
        
        if (args.scope)
        {
            this.source.scope = Object.assign(this.source.scope, args.scope);		
            
            if (this.exec.update)
            {
                this.exec.update.call(this.scope, this.source.scope);
            }
            else
            {
                Object.assign(this.scope, args.scope);
            }
        }
        
        if (args.meta)
        {
            this.meta = Object.assign({}, args.meta);		
        }

        V.touch2d();
        V.touch3d();
    }	

    containsPoint2D(event)
    {
        if (this.exec.intersect)
        {
            return this.exec.intersect.call(this.scope, O.instance.context, event.pageX, event.pageY, 
            {
                scale: this.scale,
                x: this.anchor.sx,
                y: this.anchor.sy
            })
        }

        return false;
    }
    
    intersectRay3D(event)
    {
        if (this.containsPoint2D(event))
        {
            return V.camera.distanceTo({ x: this.anchor.wx, y:this.anchor.wy, z: this.anchor.wz});
        };
        return Number.POSITIVE_INFINITY;
    }

    render2D(context)
    {
        if (this.exec.render2d)
        {
            context.setTransform(this.scale,0,0,this.scale, this.anchor.sx, this.anchor.sy);
            
            let repaint = this.exec.render2d.call(this.scope, context, 
            { 
                scale: this.scale,
                x: this.anchor.sx,
                y: this.anchor.sy,
                t: V.time,
                dt: V.dT,
                selected: this.selected
            });
            
            if (repaint)
            {
                V.touch2d();
            }
        }
    }	

    select()
    {
        super.select();
        this.addControl(new O.ControlPoint(this.anchor, this.constraint));
    }

    endControl()
    {
        super.endControl();
        
        V.postMessage("point.update", this.toJson());		
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
        if (filter == undefined || filter.includes("code"))
        {
            content.code = this.source.code;			
        }
        if (filter == undefined || filter.includes("scope"))
        {
            content.scope = this.source.scope;			
        }
        
        return Object.assign(super.toJson(filter), content);
    }
}

O.Point.validate = (args) =>
{
    if (!args.point)
    {
        V.postMessage("error", "No coordinates supplied");
        return false;
    }
    
    if (O.find(args.id))
    {
        V.postMessage("error", `Duplicate point ID : ${args.id}`);
        return false;
    }
    
    if (!args.hasOwnProperty("code"))
    {
        V.postMessage("error", `Point requires a code object`);
        return false;
    }
    
    if (!args.hasOwnProperty("visible"))
    {
        args.visible = true;
    }
    if (!args.hasOwnProperty("constraint"))
    {
        args.constraint = V.viewer.getConstraint();
    }
    
    return true;
}

/*
O.Point.Icon3d = ()=>
{
    init()
    {
        const circle = new Path2D();
        circle.arc(150, 75, 50, 0, 2 * Math.PI);
        ctx.fillStyle = 'red';
        ctx.fill(circle);
    }
    
    render()
    {
        const circle = new Path2D();
        circle.arc(150, 75, 50, 0, 2 * Math.PI);
        ctx.fillStyle = 'red';
        ctx.fill(circle);
    }
    // circle
    context.beginPath();
    context.arc(0,0,1.72*a,0,2*Math.PI);
    if (this.selected)
    {
        context.strokeStyle = O.Style.activeControl;
    }
    else
    {
        context.strokeStyle = O.Style.unselectedLine;
    }
    context.stroke();
    context.fillStyle = "rgba(255,255,255,0.7)";
    context.fill();
    
    // image
    context.imageSmoothingEnabled = true;
    context.drawImage(this.image, -a, -a, 2*a, 2*a);		
}
*/




O.Point.Builder = class
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
        this.config.type = "point";
        this.config.point = points[0];
        this.config.constraint = this.constraint.toJson();
        V.postMessage("point.record", this.config, this.custom);	
    }
}




V.recvMessage("point.record", (args, custom) => 
{ 
    let builder = O.Builder.get();
    
    builder.start(new O.Point.Builder(args, custom));
});


V.recvMessage("point.create", (args, params) => 
{ 
    if (O.Point.validate(args))
    {
        let point = new O.Point(args);
        if (params.transform)
        {
            let transform = V.viewer.datasets[params.transform];
            if (transform)
            {
                transform.addAnchors(point);
            }
        }
        O.instance.addObject(point);
        V.postMessage("point.create", point.toJson(), params);	
        V.touch3d();
        V.touch2d();
    }
});

V.recvMessage("point.delete", function(args, params) 
{ 
    if (params.transform)
    {
        let transform = V.viewer.datasets[params.transform];
        if (transform)
        {
            let point = O.instance.getObject(args.id);
            transform.removeAnchors(point);
        }
    }
    O.instance.removeObject(args.id);
    V.postMessage("point.delete", args);
    V.touch2d()
});

V.recvMessage("point.update", function(args, custom) 
{ 
    var point = O.instance.getObject(args.id);
    if (point)
    {
        point.update(args);
        V.postMessage("point.update", args, custom);
        V.touch2d();
        V.touch3d();
    }
});

V.recvMessage("point.select", function(args, custom) 
{ 
    var point = O.instance.getObject(args.id);
    if (point)
    {
        point.select();
        V.postMessage("point.select",  point.toJson(), custom);
        V.touch2d();
    }
});

V.recvMessage("point.unselect", function(args, custom) 
{ 
    var point = O.instance.getObject(args.id);
    if (point)
    {
        point.unselect();
        V.postMessage("point.unselect", args, custom);
        V.touch2d();
    }
});

V.recvMessage("point.get", (args, custom) => 
{ 
    if (args && args.id)
    {
        var point = O.instance.getObject(args.id);
        if (point)
        {
            V.postMessage("point.get", point.toJson(args.filter), custom);
        }
    }
    else
    {
        V.postMessage("point.get", O.getAll("point"), custom); // TODO use filter here as well
    }
});
