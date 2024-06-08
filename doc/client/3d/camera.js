
V3.Camera = class extends GM.CameraMVP
{
    constructor(canvas, projection)
    {
        super(canvas, projection);
        
        this.modelViewMatrixStack2 = [];
        
        // 
        this.min = { x:Number.POSITIVE_INFINITY, y:Number.POSITIVE_INFINITY, z:Number.POSITIVE_INFINITY };
        this.max = { x:Number.NEGATIVE_INFINITY, y:Number.NEGATIVE_INFINITY, z:Number.NEGATIVE_INFINITY };
        
        V.recvMessage("camera.distance.get", (args) => 
        { 
            V.postMessage("camera.distance.get", GM.Vector3.distance(this.position, args)); 
        });
        
        V.recvMessage("camera.get", (args) => 
        { 
            V.postMessage("camera.get", this.toJson()); 
        });
        
        V.recvMessage("camera.set", (args) => 
        { 
            this.set(args);
            V.refresh = true;
            V.touch2d();
            V.touch3d();
        });
        
        V.recvMessage("viewpoint.get", (args) => 
        { 
            args.camera = this.toJson();
        });
    }

    pushWorldMatrix(matrix) 
    {
        this.modelViewMatrixStack2.push(GM.Matrix4.init(this.modelViewMatrix));
        GM.Matrix4.multiply(this.inverse, matrix, this.modelViewMatrix);
    };
    
    popWorldMatrix() 
    {
        GM.Matrix4.copy(this.modelViewMatrixStack2[this.modelViewMatrixStack2.length-1], this.modelViewMatrix);
        this.modelViewMatrixStack2.pop()
    };
    
    set(camera)
    {
        super.set(camera);
        V.postMessage("camera", camera); 
    };

    
    distanceTo(point)
    {
        let dx = point.x - this.position.x;
        let dy = point.y - this.position.y;
        let dz = point.z - this.position.z;
        return Math.sqrt(dx*dx + dy*dy + dz*dz);
    };
}



V3.Controller = class extends V.CameraController
{
    constructor()
    {
        super(V.EventHandler.PRIO1, V.EventHandler.PRIO0, V.camera, 6);
        V3.Controller.instance = this;
        
        this.controllers = {}
        this.controllers["orbiter"] = new V3.Orbiter(V.camera);
        this.controllers["flyer"] = new V3.Flyer(V.camera);
        this.controllers["walker"] = new V3.Walker(V.camera);
        this.controllers["manual"] = new V3.Manual(V.camera);

        this.cast3d = { distance: Number.POSITIVE_INFINITY };
             
        V.recvMessage("controller.view", (args) =>
        {
            let aabb = args.aabb
            if (!aabb)
            {
                if (args.min && args.max)
                {
                    aabb = GL.BoundingBox.create(args.min, args.max);
                }
            }
            
            if (this.active)
            {
                if (this.active.focus)
                {
                    this.active.focus(aabb, this);
                }
                
                V.postMessage("controller.view", args); 
            }
            else
            {
                V.postMessage("error", "No controller acive");
            }
            
        });
        
        V.recvMessage("controller.target", (args) =>
        {
            if (this.active)
            {
                if (this.active.target)
                {
                    this.active.target(args, this);
                }
                V.postMessage("controller.view", args); 
            }
            else
            {
                V.postMessage("error", "No controller acive");
            }
        });
        
        V.recvMessage("controller.set", (args) => 
        { 
            let current = this.active;
            
            if (args.hasOwnProperty("name"))
            {
                if (this.active != this.controllers[args.name])
                {
                    if (this.controllers[args.name])
                    {
                        this.active = this.controllers[args.name];
                    }
                }
            }
            
            if (this.active)
            {
                if (this.active.init)
                {
                    this.active.init(args, this, current);
                }
                
                V.postMessage("controller.set", this.active.toJson()); 
            }
            else
            {
                V.postMessage("error", "no controller selected"); 
            }
            
            V.camera.moving = true;
            V.touch3d();
            V.touch2d();
        });
        
        V.recvMessage("viewpoint", (viewpoint) => 
        { 
            if (viewpoint.controller)
            {
                if (this.active != this.controllers[viewpoint.controller.name])
                {
                    this.active = this.controllers[viewpoint.controller.name];
                }
                
                if (this.active.init)
                {
                    this.active.init(viewpoint.controller, this, this.active);
                }
                
                V.postMessage("controller.set", this.active.toJson());
            }
            else
            {
                this.active = null;
            }

            if (viewpoint.navcube)
            {
                if (!this.navCube)
                {
                    this.navCube = new V3.NavCube(this);
                    this.navCube.show(true);
                }
                V.postMessage("navcube", this.navCube.toJson() );
            }

            if (viewpoint.target) 
            {
                if (!this.target)
                {
                    this.target = new V3.Target(this);
                }
                this.target.fromJson(viewpoint.target);
                V.postMessage("target", this.target.toJson());
            }
            
            V.camera.projection.set(viewpoint.camera.projection);
            
            this.tweenPosition(viewpoint.camera.position);
            this.tweenRotation(viewpoint.camera.rotation);
            this.tweenStart();
            V.postMessage("camera", viewpoint.camera); 
        });
        
        V.recvMessage("viewpoint.get", (args) => 
        { 
            if (this.active)
            {
                args.controller = this.active.toJson();
                if (this.navCube)
                {
                    args.navCube = this.navCube.toJson();
                }
                if (this.target)
                {
                    args.target = this.target.toJson();
                }
            }
        });



        V.recvMessage("navcube", (config) =>
        {
            if (!this.navCube)
            {
                this.navCube = new V3.NavCube(this);
                this.navCube.show(true);
            }
            
            if (config.hasOwnProperty("visible"))
            {
                this.navCube.show(config.visible);
            }
            
            V.touch3d();
            V.postMessage("navcube", config);
        });
        
        
        
        V.recvMessage("target", (config) =>
        {
            if (!this.target)
            {
                this.target = new V3.Target(this);
            }
            this.target.fromJson(config);
            V.touch3d();
            V.postMessage("target", this.target.toJson());
        });
        
        V.recvMessage("target.get", () =>
        {
            if (!this.target)
            {
                V.postMessage("target.get", this.target.toJson());
            }
            else
            {
                V.postMessage("target.get", {});
            }
        });
    }
    
    load()
    {
        let center = GL.BoundingBox.center(V.viewer.aabb);
        let distance = GL.BoundingBox.diagonal(V.viewer.aabb);

        GM.Euler.copy(V3.Controller.rotation, V.camera.rotation)
        GM.Vector3.addScalar(center, GM.Euler.zAxisT(V3.Controller.rotation, {}), distance, V.camera.position);
    }
    
    //
    // Events
    //
    
    onUpdate(event) 
    {
        super.onUpdate(event);
            
        if (this.active && this.active.update)
        {
            this.active.update(this);
        }
    }
    
    onDblClick(event)
    {
        if (!super.onDblClick(event))
        {
            if (this.cast3d.distance != Number.POSITIVE_INFINITY)
            {
                V.postMessage(V.viewer.datasets[this.cast3d.id].type+".dblclick",this.cast3d);
            }
        }
        event.stopImmediatePropagation();
    }
    


    //
    onMouseDown(event) 
    {
        super.onMouseDown(event);
        
        if (this.active && this.active.mouseDown)
        {
            this.active.mouseDown(event, this);
        }
    }
    
    onMouseWheel(event) 
    {
        super.onMouseWheel(event);
        
        if (this.active && this.active.mouseWheel)
        {
            this.active.mouseWheel(event, this);
        }
    }   

    onKeyDown(event) 
    {
        super.onKeyDown(event);
        
        if (this.active && this.active.keyDown)
        {
            this.active.keyDown(event, this);
        }
    }

    onNavCube(event) 
    {
        if (this.active && this.active.navCube)
        {
            this.active.navCube(event, this);
        }
    }
    
    
    onTouchStart(event) 
    {
        super.onTouchStart(event);
        
        if (this.active && this.active.onTouchDown)
        {
            this.active.onTouchDown(event, this);
        }
    }
    
    onTouchMove(event) 
    {
        super.onTouchMove(event);
        
        if (this.active && this.active.onTouchMove)
        {
            this.active.onTouchMove(event, this);
        }
    }
    
    onTouchEnd(event) 
    {
        super.onTouchEnd(event);
        
        if (this.active && this.active.onTouchEnd)
        {
            this.active.onTouchEnd(event, this);
        }
    }


    touchControl(element, key)
    {
        element.addEventListener("touchstart", (event)=>
        {
            var touches = event.targetTouches;
            if (touches.length == 1)
            {
                if (this.timer)
                {
                    clearInterval(this.timer);
                }
                
                document.dispatchEvent(new KeyboardEvent('keydown',{'keyCode':key}));
                this.timer = setInterval(()=> {document.dispatchEvent(new KeyboardEvent('keydown',{'keyCode':key}))}, 20);
            }
        });
        
        element.addEventListener("touchend", (event)=>
        {
            var touches = event.targetTouches;
            if (this.timer)
            {
                clearInterval(this.timer);
            }
        });
    }
}

V3.Controller.rotation = GM.Euler.create(-Math.PI/8, 0, 0);







V3.Orbiter = class
{
    constructor(camera)
    {
        this.camera = camera;
        
        this.matrixUP = GM.Matrix4.create();
        this.inverseUP = GM.Matrix4.create();
        this.rotation = GM.Euler.copy(V3.Controller.rotation, {})
        this.matrix = GM.Matrix4.create();
            
        this.zoomFn = (ctr, event) =>
        {
            let dO = 0;
            if (Math.abs(this.targetOrbit - this.orbit) > 0.1)
            {
                dO = (this.targetOrbit - this.orbit)*0.29;
            }
            else
            {
                dO = this.targetOrbit - this.orbit;
                ctr.updateFn = null;
            }
            this.orbit += dO;
            GM.Vector3.addScalar(this.camera.position, this.camera.zAxis, dO, this.camera.position);
        }
        
        this.panFn = (ctr) =>
        {
            let dx = 0;
            let dy = 0;
            if (ctr.keys[V.KEY_A])
            {
                dx = 0.05;
            }
            else if (ctr.keys[V.KEY_D])
            {
                dx = -0.05;
            }
            else if (ctr.keys[V.KEY_UP])
            {
                dy = -0.05;
            }
            else if (ctr.keys[V.KEY_DOWN])
            {
                dy = 0.05;
            }
            else
            {
                dx = (ctr.currPos.x - ctr.startPos.x);
                dy = (ctr.currPos.y - ctr.startPos.y);
            }
                        
            dx /= ctr.dragMax;
            dy /= ctr.dragMax;
            ctr.startPos.x += dx;
            ctr.startPos.y += dy;
            
            this.camera.position.x -= this.orbit*(this.camera.xAxis.x*dx + this.camera.yAxis.x*dy);
            this.camera.position.y -= this.orbit*(this.camera.xAxis.y*dx + this.camera.yAxis.y*dy);
            this.camera.position.z -= this.orbit*(this.camera.xAxis.z*dx + this.camera.yAxis.z*dy);
        }

        this.rotateFn = (ctr) =>
        {
            let dx = 0;
            let dy = 0;
            if (ctr.keys[V.KEY_LEFT])
            {
                dx = -0.1;
            }
            else if (ctr.keys[V.KEY_RIGHT])
            {
                dx = 0.1;
            }
            else
            {
                dx = ctr.currPos.x - ctr.startPos.x;
                dy = ctr.currPos.y - ctr.startPos.y;
            }

            dx /= ctr.dragMax;
            dy /= ctr.dragMax;
            ctr.startPos.x += dx;
            ctr.startPos.y += dy;

            let target = GM.Vector3.addScalar(this.camera.position, this.camera.zAxis, -this.orbit, {});

            GM.Matrix4.multiply(this.inverseUP, this.camera.matrix, this.matrix);
            GM.Euler.fromMatrix(this.matrix, this.rotation);
            
            this.rotation.x = GM.clamp(this.rotation.x+dy, -1.57079632679,1.57079632679);
            this.rotation.y = this.rotation.y-4*dx;
            this.rotation.z = 0;

            GM.Matrix4.fromEuler(this.rotation, this.matrix);
            GM.Matrix4.multiply(this.matrixUP, this.matrix, this.matrix);
            
            GM.Euler.fromMatrix(this.matrix, this.camera.rotation);
            
            let zAxisT = GM.Euler.zAxisT(this.camera.rotation, {});
            GM.Vector3.addScalar(target, zAxisT, this.orbit, this.camera.position);
        }
        
        this.orbitFn = (ctr) =>
        {
            let target = GM.Vector3.addScalar(this.camera.position, this.camera.zAxis, -this.orbit, {})
            let zAxisT = GM.Euler.zAxisT(this.camera.rotation, {});
            GM.Vector3.addScalar(target, zAxisT, this.orbit, this.camera.position);
        }
    }
    
    init(config, ctr, previous)
    {
        this.maxOrbit = GL.BoundingBox.diagonal(V.viewer.aabb);
        this.minOrbit = this.maxOrbit/300;
        
        if (config.hasOwnProperty("orbit"))
        {
            this.orbit = config.orbit;
        }
        else
        {
            if (config.min && config.max)
            {
                let aabb = GL.BoundingBox.create(config.min, config.max);
                let orbit = GL.BoundingBox.diagonal(aabb);
                if (isFinite(orbit))
                {
                    config.position = GM.Vector3.addScalar(GL.BoundingBox.center(aabb), this.camera.zAxis, orbit, {});
                    this.orbit = orbit;
                }
            }
            else if (previous && previous instanceof V3.Flyer)
            {
                this.orbit = previous.range;
            }
            else if (previous && previous instanceof V3.Walker)
            {
                this.orbit = V3.Walker.HEIGHT;
            }
            else
            {
                this.orbit = this.maxOrbit;
            }
        }
        
        if (config.hasOwnProperty("up"))
        {
            GM.Matrix4.quaternion(GM.Quaternion.between(GM.Vector3.create(0,1,0), GM.Vector3.create(config.up.x,config.up.y,config.up.z), {}), this.matrixUP);
            GM.Matrix4.invert(this.matrixUP, this.inverseUP);
        
            GM.Matrix4.fromEuler(this.rotation, this.matrix);
            GM.Matrix4.multiply(this.matrixUP, this.matrix, this.matrix);
            GM.Euler.fromMatrix(this.matrix, this.camera.rotation);
        }
        
        V.camera.set(config);
    }
    

    focus(aabb, ctr)
    {
        let orbit = GL.BoundingBox.diagonal(aabb);
        if (isFinite(orbit))
        {
            let point = GL.BoundingBox.center(aabb);
            
            this.orbit = orbit;
            ctr.tweenPosition(GM.Vector3.addScalar(point, this.camera.zAxis, orbit, {}));
            ctr.tweenStart();
        }
    }
    
    target(point, ctr)
    {
        if (isFinite(point.x) && isFinite(point.y) && isFinite(point.z))
        {
            this.orbit = Math.min(this.orbit, GM.Vector3.distance(V.camera.position, point));
            ctr.tweenPosition(GM.Vector3.addScalar(point, this.camera.zAxis, this.orbit, {}));
            ctr.tweenStart();
        }
    }
        
    
    //
    //
    //

    navCube(euler, ctr)
    {
        ctr.tweenRotation(euler);
        ctr.tweenStart(this.orbitFn);
    }

    
    mouseDown(event, ctr) 
    {
        ctr.tweenStop();
        if (event.button == 0)
        {
            ctr.updateFn = this.rotateFn;
        }
        else if (event.button == 2)
        {
            ctr.updateFn = this.panFn;
        }
    }

    mouseWheel(event, ctr) 
    {
        ctr.tweenStop();
        
        this.targetOrbit = Math.max(1.1*this.minOrbit, this.orbit + 4*ctr.currZoomD*(this.orbit -  this.minOrbit));
        
        ctr.updateFn = this.zoomFn;
    }   

    keyDown(event, ctr) 
    {
        ctr.tweenStop();

        switch (event.keyCode)
        {
            case V.KEY_W:
            {
                this.targetOrbit = Math.max(this.minOrbit, 0.85*this.orbit);
                ctr.updateFn = this.zoomFn;
                break;
            }
            case V.KEY_S:
            {
                this.targetOrbit += Math.max(0.5, 0.1*(this.orbit -  this.minOrbit));
                ctr.updateFn = this.zoomFn;
                break;
            } 
            case V.KEY_A:
            case V.KEY_D:
            case V.KEY_UP:
            case V.KEY_DOWN:
            {
                ctr.updateFn = this.panFn;
                break;
            }
            case V.KEY_LEFT:
            case V.KEY_RIGHT:
            {
                ctr.updateFn = this.rotateFn;
                break;
            }
        }
    }
    
    toJson() 
    {
        return { name: "orbiter", orbit: this.orbit };
    }
}
    





V3.Flyer = class 
{
    constructor(camera) 
    {
        this.camera = camera;
        
        this.flyFn = (ctr) =>
        {
            if (Math.abs(ctr.currZoom) > 0.005)
            {
                var distance = 0.25*ctr.currZoom*this.range;  
                if (ctr.currZoom < 0)
                {
                    distance = Math.min(-0.10, distance);
                }
            
                ctr.currZoom *= 0.9;
                if (Math.abs(ctr.currZoom) <= 0.005)
                {
                    ctr.currZoom = 0.0;
                }
                
                let flyDir = ctr.pointerRay.direction;

                this.camera.position.x += distance * flyDir.x;
                this.camera.position.y += distance * flyDir.y;
                this.camera.position.z += distance * flyDir.z;

                if (ctr.cast3d.distance != Number.POSITIVE_INFINITY)
                {
                    this.range = Math.max(0.4,this.range - distance);
                }
            }
            else
            {
                ctr.updateFn = null;
            }
        }
        
        this.panFn = (ctr) =>
        {
            let dx = 0;
            let dy = 0;
            if (ctr.keys[V.KEY_A])
            {
                dx = 0.05;
            }
            else if (ctr.keys[V.KEY_D])
            {
                dx = -0.05;
            }
            else if (ctr.keys[V.KEY_UP])
            {
                dy = -0.05;
            }
            else if (ctr.keys[V.KEY_DOWN])
            {
                dy = 0.05;
            }
            else
            {
                dx = ctr.currPos.x - ctr.startPos.x;
                dy = ctr.currPos.y - ctr.startPos.y;
            }
    
            dx /= ctr.dragMax;
            dy /= ctr.dragMax;	
            ctr.startPos.x += dx;
            ctr.startPos.y += dy;
            
            this.camera.position.x -= 0.9*this.range*(this.camera.xAxis.x*dx + this.camera.yAxis.x*dy);
            this.camera.position.y -= 0.9*this.range*(this.camera.xAxis.y*dx + this.camera.yAxis.y*dy);
            this.camera.position.z -= 0.9*this.range*(this.camera.xAxis.z*dx + this.camera.yAxis.z*dy);
        }
        
        this.rotateFn = (ctr) =>
        {
            let dx = 0;
            let dy = 0;
            if (ctr.keys[V.KEY_LEFT])
            {
                dx = -0.1;
            }
            else if (ctr.keys[V.KEY_RIGHT])
            {
                dx = 0.1;
            }
            else
            {
                dx = ctr.currPos.x - ctr.startPos.x;
                dy = ctr.currPos.y - ctr.startPos.y;
            }

            dx /= ctr.dragMax;
            dy /= ctr.dragMax;	
            ctr.startPos.x += dx;
            ctr.startPos.y += dy;

            this.camera.rotation.x = GM.clamp(this.camera.rotation.x+dy, -1.57079632679,1.57079632679);
            this.camera.rotation.y = this.camera.rotation.y-(this.shiftKey?0.4:4)*dx;
            this.camera.rotation.z = 0;
        }
                
        
        this.mouseStamp = 0;
    }

    init(config, ctr)
    {
        this.range = GL.BoundingBox.diagonal(V.viewer.aabb);
    }

    target(point, ctr)
    {
        let vector = GM.Vector3.sub(point, V.camera.position, {});
        GM.Vector3.scale(vector, 0.85, vector);
        ctr.tweenPosition(GM.Vector3.add(V.camera.position, vector, point)); 
        GM.Vector3.normalize(vector, vector);
        ctr.tweenRotation(GM.Euler.fromDirection(vector));
        ctr.tweenStart();
    };

    // 
    //
    //
    
    update(ctr)
    {
        if (!ctr.updateFn)
        {
            if (ctr.cast3d.distance != Number.POSITIVE_INFINITY)
            {
                this.range = ctr.cast3d.distance;
            }
        }
    }
    
    mouseDown(event, ctr) 
    {
        ctr.tweenStop();
        if (event.button == 0)
        {
            ctr.updateFn = this.rotateFn;
        }
        else if (event.button == 2)
        {
            ctr.updateFn = this.panFn;
        }
    };

    mouseWheel(event, ctr) 
    {
        ctr.tweenStop();
        ctr.updateFn = this.flyFn;
    }      

    keyDown(event, ctr) 
    {
        ctr.tweenStop();

        switch (event.keyCode)
        {
            case V.KEY_W:
            case V.KEY_S:
            {
                ctr.updateFn = this.flyFn;
                break;
            }
            case V.KEY_A:
            case V.KEY_D:
            case V.KEY_UP:
            case V.KEY_DOWN:
            {
                ctr.updateFn = this.panFn;
                break;
            }
            case V.KEY_LEFT:
            case V.KEY_RIGHT:
            {
                ctr.updateFn = this.rotateFn;
                break;
            }
        }
    }
    
    toJson() 
    {
        return { name: "flyer" };
    }
}






V3.Walker = class 
{
    constructor(camera) 
    {
        this.camera = camera;
        
        this.walkFn = (ctr) =>
        {
            let dx = 0;
            let dy = 0;
            let dz = 0;
        
            if (V.keyMap[V.KEY_W])
            {
                dx -= this.walkSpeed*this.camera.zAxis.x;
                dy -= this.walkSpeed*this.camera.zAxis.y;
                dz -= this.walkSpeed*this.camera.zAxis.z;
            }
            else if (V.keyMap[V.KEY_S])
            {
                dx += this.walkSpeed*this.camera.zAxis.x;
                dy += this.walkSpeed*this.camera.zAxis.y;
                dz += this.walkSpeed*this.camera.zAxis.z;
            }
            
            if (V.keyMap[V.KEY_A])
            {
                dx -= this.walkSpeed*this.camera.xAxis.x;
                dy -= this.walkSpeed*this.camera.xAxis.y;
                dz -= this.walkSpeed*this.camera.xAxis.z;
            }
            else if (V.keyMap[V.KEY_D])
            {
                dx += this.walkSpeed*this.camera.xAxis.x;
                dy += this.walkSpeed*this.camera.xAxis.y;
                dz += this.walkSpeed*this.camera.xAxis.z;
            }
            
            if (dx || dy || dz)
            {
                this.camera.position.x += dx*V.dT; // JSTIER use V.dT and remove from event
                this.camera.position.y += dy*V.dT;
                this.camera.position.z += dz*V.dT;
                this.snapToGround(this.camera.position);
            }
            
            this.rotateFn(ctr);
        }
        
        this.rotateFn = (ctr) =>
        {
            let dx = 0;
            let dy = 0;
            if (ctr.keys[V.KEY_LEFT])
            {
                dx = -0.1;
            }
            else if (ctr.keys[V.KEY_RIGHT])
            {
                dx = 0.1;
            }
            else
            {
                dx = ctr.currPos.x - ctr.startPos.x;
                dy = ctr.currPos.y - ctr.startPos.y;
            }
    
            dx /= ctr.dragMax;
            dy /= ctr.dragMax;	
            ctr.startPos.x += dx;
            ctr.startPos.y += dy;

            this.camera.rotation.x = GM.clamp(this.camera.rotation.x+dy, -1.57079632679,1.57079632679);
            this.camera.rotation.y = this.camera.rotation.y-(this.shiftKey?0.4:4)*dx;
            this.camera.rotation.z = 0;
        }

        this.panFn = (ctr) =>
        {
            let dx = 0;
            let dy = 0;
            if (ctr.keys[V.KEY_LEFT])
            {
                dy = -0.1;
            }
            else if (ctr.keys[V.KEY_RIGHT])
            {
                dy = 0.1;
            }
            else
            {
                dx = ctr.currPos.x - ctr.startPos.x;
                dy = ctr.currPos.y - ctr.startPos.y;
            }
    
            dx /= ctr.dragMax;
            dy /= ctr.dragMax;	
            ctr.startPos.x += dx;
            ctr.startPos.y += dy;
            
            this.camera.position.x -= 0.9*V3.Walker.HEIGHT*(this.camera.xAxis.x*dx + this.camera.yAxis.x*dy);
            this.camera.position.y -= 0.9*V3.Walker.HEIGHT*(this.camera.xAxis.y*dx + this.camera.yAxis.y*dy);
            this.camera.position.z -= 0.9*V3.Walker.HEIGHT*(this.camera.xAxis.z*dx + this.camera.yAxis.z*dy);
        }

        
        this.walkSpeed = 3.4;
        this._sampleRay = new GM.Ray(new GM.Vector3(), new GM.Vector3(0,-1,0))
    }
    
    init(config, ctr)
    {
        if (config.target)
        {
            this.target(config.target, ctr);
        }
        
    }
        
    target(point, ctr)
    {
        point.y += V3.Walker.HEIGHT;
        this.snapToGround(point);
        ctr.tweenPosition(point);
        GM.Vector3.subtract(point, this.camera.position, point);
        point.y = 0;
        GM.Vector3.normalize(point, point);
        ctr.tweenRotation(GM.Euler.fromDirection(point));
        ctr.tweenStart();
    };
    
    //
    //
    //
    
    mouseDown(event, ctr) 
    {
        ctr.tweenStop();
        if (event.button == 0)
        {
            ctr.updateFn = this.rotateFn;
        }
        else if (event.button == 2)
        {
            ctr.updateFn = this.panFn;
        }
    };
    
    mouseWheel(event, ctr) 
    {
        ctr.tweenStop();
        this.walkSpeed = Math.max(1.0, this.walkSpeed + ctr.currZoom);
    }      
    
    keyDown(event, ctr) 
    {
        ctr.tweenStop();

        switch (event.keyCode)
        {
            case V.KEY_W:
            case V.KEY_S:
            case V.KEY_A:
            case V.KEY_D:
            {
                ctr.updateFn = this.walkFn;
                break;
            }
            case V.KEY_UP:
            case V.KEY_DOWN:
            {
                ctr.updateFn = this.panFn;
                break;
            }
            case V.KEY_LEFT:
            case V.KEY_RIGHT:
            {
                ctr.updateFn = this.rotateFn;
                break;
            }
        }
    }
    
    snapToGround(point)
    {
        this._sampleRay.origin.y = point.y - V3.Walker.HEIGHT/2.0;
        
        var offset = 0;
        var samples = 0;
        for (var i=0; i<V3.Walker.DXY.length; i++)
        {
            this._sampleRay.origin.z = point.z + V3.Walker.DXY[i].z;
            this._sampleRay.origin.x = point.x + V3.Walker.DXY[i].x;
            var distance = V.viewer.raycast(this._sampleRay, { distance: Number.POSITIVE_INFINITY }).distance;
            if (distance != Number.POSITIVE_INFINITY)
            {
                offset += distance;
                samples++;
            }
        }
        
        if (samples > 0)
        {
            point.y = point.y - offset/samples + V3.Walker.HEIGHT/2;
        }
    }
    
    toJson() 
    {
        return { name: "walker" };
    }
    
}

V3.Walker.WALK = 1;
V3.Walker.WIDTH = 0.4
V3.Walker.DXY =  [{ x: V3.Walker.WIDTH, z: V3.Walker.WIDTH }, 
                  { x: V3.Walker.WIDTH, z:-V3.Walker.WIDTH }, 
                  { x:-V3.Walker.WIDTH, z: V3.Walker.WIDTH }, 
                  { x:-V3.Walker.WIDTH, z:-V3.Walker.WIDTH }];
V3.Walker.HEIGHT = 1.7





V3.Manual = class 
{
    constructor(camera) 
    {
        this.camera = camera;
    }
    
    init(config, ctr)
    {
    }
    
    target(point, ctr)
    {
    };

}
