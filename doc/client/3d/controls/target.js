V3.TargetShader = class extends GL.ShaderMVP
{
    constructor()
    {
        super(V3.TargetShader['vs'], V3.TargetShader['fs']);
    }
    
    compile()
    {
        super.compile();
        
        this.defineAttribute("position", 3, gl.FLOAT, false);
        
        this.matrix = gl.getUniformLocation(this.glId, 'targetMatrix');
        this.radius = gl.getUniformLocation(this.glId, 'radius');
        this.color = gl.getUniformLocation(this.glId, 'color');
    }
}

V3.TargetShader['vs'] =`#version 300 es

precision mediump float;
precision mediump int;

uniform mat4 modelViewMatrix; 
uniform mat4 projectionMatrix; 

uniform float radius;

uniform mat4 targetMatrix; 

in vec3 position;

out vec2 uv;

void main()	
{
    vec4 viewVertex = modelViewMatrix * targetMatrix * vec4(position*radius, 1.0 );
    uv = position.xz;
    gl_Position = projectionMatrix * viewVertex;
}
`
 
V3.TargetShader['fs'] =`#version 300 es

precision mediump float;
precision mediump int;

uniform vec3 color;

in vec2 uv;

out vec4 fragmentColor;

void main()	
{
    vec2 circle = uv;
    float r = 0.2;
    float d = length(circle);

    float t = 1.0 - smoothstep(r,r+0.3,d) - smoothstep(r,r-0.3,d);

//    fragmentColor = vec4(vec3(0.0,0.502,1.00),t);
    fragmentColor = vec4(color,t);
 }
` 


V3.Target = class extends V.EventHandler
{
    constructor(controller)
    {
        super(V.EventHandler.PRIO1);

        this.controller = controller;
        
        this.position = new GL.ArrayBuffer(new Float32Array([ -0.5, 0, 0.5, 
                                                               0.5, 0, 0.5, 
                                                               0.5, 0,-0.5,
                                                              -0.5, 0,-0.5, ]));
        this.index = new GL.ElementBuffer(new Uint16Array([0,1,2,0,2,3]));
        
        this.point = { x:0, y:0, z: 0 };
        this.matrix = GM.Matrix4.create();
        this.color = [0.5, 0.5, 0.5];

        this.shader = new V3.TargetShader();
        this.shader.compile();
        
        this.pointerAge = V.time;
        this.mode = "auto";
    }
    
    setMatrix(point, normal)
    {
        let n = normal;
        if (n.z != 0)
        {
            var u = GM.Vector3.normalize({ x:n.z, y:n.z, z:-n.x-n.y }, {});
        }
        else
        {
            var u = GM.Vector3.normalize({ x:-n.y-n.z, y:n.x, z:n.x }, {});
        }
        var v = GM.Vector3.normalize(GM.Vector3.cross(u, n, {}), {});

        GM.Matrix4.copy([u.x, u.y, u.z, 0,
                         n.x, n.y, n.z, 0,
                         v.x, v.y, v.z, 0,
                         point.x, point.y, point.z, 1], this.matrix);
        
        this.point = point;
    }
    
    onUpdate(event) 
    {
        if (this.mode === "auto")
        {
            if (this.controller.pointerAge != this.pointerAge)
            {
                let cast = this.controller.cast3d;
                
                if (cast.distance != Number.POSITIVE_INFINITY)
                {
                    this.setMatrix(this.controller.pointerRay.at(cast.distance, {}), cast.normal);
                    
                    this.visible = true;
                }
                else
                {
                    this.visible = false;
                }
            
                this.pointerAge = this.controller.pointerAge;
                V.touch3d();
            }
        }
    }
    
    onRender3D(event)
    {
        if (this.visible)
        {
            this.shader.useProgram(V.camera);
            
            gl.uniform1f(this.shader.radius, 0.05*GM.Vector3.distance(V.camera.position, this.point));
            gl.uniformMatrix4fv(this.shader.matrix, false, this.matrix);
            gl.uniform3fv(this.shader.color, this.color);


            this.shader.enableBuffer(this);
            this.shader.bindBuffer(this);
            
            gl.disable(gl.DEPTH_TEST);
            gl.disable(gl.CULL_FACE);
            gl.enable(gl.BLEND);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.index.glId);
            gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
            gl.disable(gl.BLEND);
            gl.enable(gl.DEPTH_TEST);
            gl.enable(gl.CULL_FACE);
            
            this.shader.disableBuffer(this);
        }
    }
    
    
    show(visible)
    {
        if (visible && !this.isAttached())
        {
            this.attach();
        }
        else if (!visible && this.isAttached())
        {
            this.detach();
        }
    }
    
    toJson()
    {
        return { color : this.color, matrix: this.matrix, mode: this.mode, visible: this.isAttached()  };
    }
    
    fromJson(json)
    {
        if (json.hasOwnProperty("mode"))
        {
            this.mode = json.mode;
        }
        if (json.hasOwnProperty("point"))
        {
            this.matrix[12] = json.point.x;
            this.matrix[13] = json.point.y;
            this.matrix[14] = json.point.z;
            this.point = json.point;
            if (this.isAttached())
            {
                this.visible = true;
            }
        }
        if (json.hasOwnProperty("normal"))
        {
            this.setMatrix(this.point, json.normal);
            if (this.isAttached())
            {
                this.visible = true;
            }
        }
        
        if (json.hasOwnProperty("visible"))
        {
            if (json.visible && !this.isAttached())
            {
                this.attach();
            }
            else if (!json.visible && this.isAttached())
            {
                this.detach();
            }
        }
        if (json.hasOwnProperty("color"))
        {
            this.color = json.color;
        }
    }
}




