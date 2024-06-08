var V1 = {
}

V1.Viewer = class extends V.Viewer
{
    constructor(document)
    {
        super({ alpha: false, depth: false });
        
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);

        V.camera = new V1.Camera(this.canvas, new GM.PerspectiveProjection(100));
        V.camera.moving = true;

        this.controller = new V1.Controller(V.EventHandler.PRIO3);
        this.controller.attach();

        this.shader = new V1.Shader();
        this.shader.compile();
        
        this.animate();
    
        V.recvMessage("*.get", (args, custom) => 
        { 
            V.postMessage("*.get", args, custom);
        });
                
        V.recvMessage("viewpoint.get", (args) => 
        { 
            for (var id in this.datasets)
            {
                args[id] = this.datasets[id].getViewpoint();
            };
        
            V.postMessage("viewpoint.get", args); 
        });
        
    }
    
    render()
    {
        V.camera.updateMatrix();
        for (var id in this.datasets)
        {
            this.datasets[id].render(this);	
        };
    }

    toJson(object)
    {
        object.controller = this.controller.toJson();
        return object;
    }

    getDistanceAlpha(point, p0, p1)
    {
        return GM.clamp((this.controller.maxFov - V.camera.projection.fovH)/(this.controller.maxFov - p1) + (p1-this.controller.minFov),0,1);
    }

    getConstraint(name)
    {
        return C.create(["Sphere" ]);
    }
};

V1.Camera = class extends GM.CameraMVP
{
    constructor(canvas, projection)
    {
        super(canvas, projection);
        
        V.recvMessage("camera.get", (args) => 
        { 
            let params = this.toJson();
            params.minFov = Math.tan(GM.DEG2RAD * 50 * 0.5);  // TODO should be funcition of image
            params.maxFov = Math.tan(GM.DEG2RAD * 110 * 0.5);
            V.postMessage("camera.get", params); 
        });
        
        V.recvMessage("camera.set", (args) => 
        { 
            this.set(args);
        });		
    }

    distanceTo(point)
    {
        return 0;
    };
};


V1.Controller = class extends V.CameraController 
{
    constructor()
    {
        super(V.EventHandler.PRIO1, V.EventHandler.PRIO1, V.camera, 6);
            
        this.camera.projection.setRange(0.1,100);

        this.minFov = Math.tan(GM.DEG2RAD * 50 * 0.5); // TODO should be funcition of image
        this.maxFov = Math.tan(GM.DEG2RAD * 110 * 0.5);
        
        this.fov0 = this.camera.projection.fovH;
        this.fov1 = this.camera.projection.fovH;
        
        V.recvMessage("viewpoint.get", (args) => 
        { 
            args.rotation = this.camera.rotation.toJson();
            args.fovH = this.camera.projection.fovH;
        });

        V.recvMessage("viewpoint", (viewpoint) => 
        { 
            this.fov0 = this.camera.projection.fovH;
            this.fov1 = viewpoint.fovH;
            this.tweenRotation(viewpoint.rotation);
            this.tweenStart(this.zoomFn0);
        });
    }
    
    rotateFn(event)
    {
        var dx = (this.currPos.x - this.startPos.x)/4;
        var dy = (this.currPos.y - this.startPos.y)/2;
        this.startPos.x += dx;
        this.startPos.y += dy;

        this.camera.rotation.x = GM.clamp(this.camera.rotation.x+dy, -1.57079632679,1.57079632679);
        this.camera.rotation.y = this.camera.rotation.y-(this.shiftKey?0.1:1)*dx;
        this.camera.rotation.z = 0;
    }

    zoomFn0(ctr)
    {
        this.camera.projection.fovH = this.fov0 + (this.fov1 - this.fov0)*Easing.Sinusoidal.InOut(this.rotation.sT);
    }

    zoomFn1(ctr)
    {
        if (Math.abs(this.fov0 - this.fov1) > 0.0005)
        {
             this.fov0 +=0.6*(this.fov1 - this.fov0)
             this.camera.projection.fovH = this.fov0;
             this.camera.moving = true;
        }
        else
        {
             this.updateFn = null;
        }
    }

    onMouseWheel(event) 
    {
        super.onMouseWheel(event);

        this.fov1 += this.getWheelDelta(event);
        this.fov1 = GM.clamp(this.fov1, this.minFov, this.maxFov);
        this.updateFn = this.zoomFn1;
    }        

    onMouseDown(event) 
    {
        super.onMouseDown(event);
        this.updateFn = this.rotateFn;
    }
        
    onTouchStart(event) 
    {
        super.onTouchStart(event);
        this.updateFn =  this.rotateFn;
    }	
}





V1.Shader = function()
{
    GL.ShaderMVP.call(this, V1.Shader["vs"], V1.Shader["fs"]);
}

V1.Shader.prototype = Object.create(GL.ShaderMVP.prototype);

V1.Shader.prototype.compile  = function()
{
    GL.ShaderMVP.prototype.compile.call(this);
    
    this.defineAttribute("uv", 2, gl.FLOAT, false);
    this.defineAttribute("position", 3, gl.FLOAT, false);
    
    this.samplerMap = gl.getUniformLocation(this.glId, 'samplerMap');
}

V1.Shader.prototype.useProgram  = function(camera)
{
    GL.ShaderMVP.prototype.useProgram.call(this, camera);
}

V1.Shader["vs"] = `
attribute vec3 position;
attribute vec2 uv;

uniform mat4 modelViewMatrix; 
uniform mat4 projectionMatrix; 

varying mediump vec2 texCoord;
    
void main(void) 
{
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    
    texCoord = uv;
}`

V1.Shader["fs"] = `
varying mediump vec2 texCoord;

uniform sampler2D samplerMap;

void main(void) 
{
    gl_FragColor = texture2D(samplerMap, texCoord);
}`
