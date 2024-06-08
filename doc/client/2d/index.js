"use strict";

var V2 =
{
    MOSAIC : "map",
    WMTS: "wmts",
    IMAGE : "image"
};

V2.Viewer = class extends V.Viewer
{
    constructor()
    {
        super({
            alpha: false,
            depth: true,
            stencil: false,
            antialias: false,
            premultipliedAlpha: false,
            preserveDrawingBuffer: false
        });

        V.camera = new V2.Camera(this.canvas);
        V.camera.moving = true;

        this.splitter = new V2.Splitter(this.canvas);
        this.splitter.attach();
 
        this.controller = new V2.Controller();
        this.controller.attach();
        
        M.Shader.init();
        M.ColorShader.instance = new M.ColorShader();
        M.ColorShader.instance.compile();
        M.DepthShader.instance = new M.DepthShader();
        M.DepthShader.instance.compile();
        
        M.PngLoader.init();
        M.PngLoader.instance = new M.PngLoader(32);
        
        M.BinLoader.init();
        M.BinLoader.instance = new M.BinLoader();
        
        V2.MeshShader.instance = new V2.MeshShader();
        V2.MeshShader.instance.compile();
        
        V.recvMessage("import.create", (document, config) => 
        { 
            let id = config.id || document.id;
            let pane = config.pane || 0;
            if (!this.datasets[id])
            {
                let map;
                if (document.type == V2.MOSAIC)
                {
                    map = new M.DemMap(document, V.importCb.bind(config), pane)
                }
                else if (document.type == V2.WMTS)
                {
                    map = new M.Wmts(document, V.importCb.bind(config), pane)
                }
                else if (document.type == V2.IMAGE)
                {
                    map = new M.Image(document, V.importCb.bind(config), pane)
                }
                        
                super.load(id, map);

                V.touch3d();
                V.touch2d();
            }
            else
            {
                V.postMessage("error", "duplicate document id " + id);
            }
        });
    
        V.recvMessage("*.get", (args, custom) => 
        { 
            V.postMessage("*.get", args, custom);
        });
        
        V.recvMessage("viewpoint.get", (args) => 
        {
            args.camera = V.camera.toJson();
            
            for (var id in this.datasets)
            {
                args[id] = this.datasets[id].getViewpoint();
            };

            V.postMessage("viewpoint.get", args); 
        });

        let UTM_HEIGHT =  10000000.0;
        
        V.to1DUnitString = (number) =>
        {
            number *= UTM_HEIGHT /256.0;
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
            number *= (UTM_HEIGHT /256.0)*(UTM_HEIGHT /256.0);
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
            number *= (UTM_HEIGHT /256.0)*(UTM_HEIGHT /256.0)*(UTM_HEIGHT /256.0);
            switch (V.units)
            {
            case V.METRIC:
                return O.numberFormat.format(number.toFixed(2)) +" m\u00B3";
            case V.IMPERIAL:
                return O.numberFormat.format((number*35.3147).toFixed(2)) +" ft\u00B3";
            }
        }
        
        this.animate();
    }
    
    view(aabb)
    {
        let position = GL.BoundingBox.center(aabb);
        position.z = this.aabb.max.z;
        let dx = aabb.max.x - aabb.min.x;
        let dy = aabb.max.y - aabb.min.y;
        V.camera.set(position, Math.ceil(Math.log2(256/Math.sqrt(dx*dx+dy*dy))) + 1)
    }

    load(id, model)
    {
        super.load(id, model);
        
        let position = GL.BoundingBox.center(this.aabb);
        position.z = this.aabb.max.z;
        let dx = this.aabb.max.x - this.aabb.min.x;
        let dy = this.aabb.max.y - this.aabb.min.y;
        V.camera.set(position, Math.ceil(Math.log2(256/Math.sqrt(dx*dx+dy*dy))) + 1)
    }

    getDistanceAlpha(point, p0, p1)
    {
        let d = V.camera.distanceTo(point);
        if (d > p1)
        {
            return 0;
        }
        else if (d <= p0)
        {
            return 1;
        }
        else
        {
            return GM.clamp(1.0-(d-p0)/(p1-p0), 0, 1);
        }
    }

    render()
    {
        V.camera.updateMatrix();
        
        for (var id in this.datasets)
        {
            let entry = this.datasets[id];
            
            if (entry.visible)
            {
                entry.update();
                if (Object.keys(this.datasets).length == 2)
                {
                    entry.render(M.DUAL);	
                }
                else
                {
                    entry.render(M.SINGLE);	
                }
            }
        }
        gl.bindTexture(gl.TEXTURE_2D, null);
    }	

    getConstraint()
    {
        return C.create(["Plane", { x:0, y:0, z:1, w: this.aabb.max.z }]);
    }
}

V2.Splitter = class extends V.EventHandler
{
    constructor(canvas)
    {
        super(V.EventHandler.PRIO0);
        
        this.canvas = canvas;
        
        this.mouseMove = (event) => 
        {
            this.set(Math.max(Math.min(event.clientX/this.canvas.offsetWidth, 1.0), 0.0), Math.max(Math.min(event.clientY/this.canvas.offsetHeight, 1.0), 0.0), true);
                    
            V.postMessage("splitter.update", { visible: !this.handle.hidden, splitV: this.splitV, splitH: this.splitH });

            V.touch3d();
            event.stopPropagation();
            event.preventDefault();
        };
        
        this.touchMove = (event) => 
        {
            this.set(Math.max(Math.min(event.targetTouches[0].clientX/this.canvas.offsetWidth, 1.0), 0.0), Math.max(Math.min(event.targetTouches[0].clientY/this.canvas.offsetHeight, 1.0), 0.0), true);
                    
            V.postMessage("splitter.update", { visible: !this.handle.hidden, splitV: this.splitV, splitH: this.splitH });

            V.touch3d();
            event.stopPropagation();
            event.preventDefault();
        };
        
        this.moveEnd = (event) =>
        {
            document.removeEventListener('mousemove', this.mouseMove, false);
            document.removeEventListener('touchmove', this.touchMove, false);
            document.removeEventListener('mouseup', this.moveEnd, false);
            document.removeEventListener('touchend', this.moveEnd, false);
            event.stopPropagation();
            event.preventDefault();
            
            let selected = O.getSelected();
            if (selected)
            {
                selected.visible = true;
            }	
            V.touch3d();
        };
        
        this.moveStart = (event) =>
        {
            let selected = O.getSelected();
            if (selected)
            {
                selected.visible = false;
            }	
            V.touch3d();
            
            document.addEventListener('mousemove', this.mouseMove, false);
            document.addEventListener('touchmove', this.touchMove, false);
            document.addEventListener('mouseup', this.moveEnd, false);
            document.addEventListener('touchend', this.moveEnd, false);
        };
            
        this.splitterV = document.getElementById("splitterV");
        this.splitterH = document.getElementById("splitterH");
        this.handle = document.getElementById("splitterX");
        this.handle.addEventListener('mousedown', this.moveStart, false);
        this.handle.addEventListener('touchstart', this.moveStart, false);
        
        window.addEventListener('resize',  () => 
        {
            this.set(this.splitV, this.splitH);
        });
        
        
        this.listener = [];
        
        V.recvMessage("splitter", (args) => 
        {
            let splitV = this.splitV;
            
            if (args.hasOwnProperty("u"))
            {
                splitV = args.u;
            }
            else if (args.hasOwnProperty("splitV"))
            {
                splitV = args.splitV;
            }

            let splitH = this.splitH;
            
            if (args.hasOwnProperty("v"))
            {
                splitH = args.v;
            }
            else if (args.hasOwnProperty("splitH"))
            {
                splitH = args.splitH;
            }
            
            
            if (args.hasOwnProperty("visible"))
            {
                this.show(args.visible)			
            }
            
            this.set(splitV, splitH);
            V.postMessage("splitter", { visible: !this.handle.hidden, splitV: this.splitV, splitH: this.splitH });
            
            V.touch3d();
        });
        
        V.recvMessage("viewpoint", (viewpoint) => 
        { 
            this.set(viewpoint.splitter.splitV, viewpoint.splitter.splitH);
            this.show(viewpoint.splitter.visible)			
        });

        V.recvMessage("viewpoint.get", (args) => 
        { 
            args.splitter =  {
                    splitV : this.splitV,
                    splitH : this.splitH,
                    visible : !this.handle.hidden
            };
        });

        this.set(0.90, 0.90)
    }
    
    show(state)
    {
        this.splitterV.hidden = !state;
        this.splitterH.hidden = !state;
        this.handle.hidden = !state;
    }

    set(splitV, splitH)
    {
        this.splitV = splitV;
        this.splitH = splitH;
        
        this.handle.style.left = Math.max(19,this.splitV*this.canvas.offsetWidth) + "px";
        this.handle.style.top = Math.max(80,this.splitH*this.canvas.offsetHeight) + "px";
        
        this.splitterV.style.left = this.splitV*this.canvas.offsetWidth + "px";
        this.splitterV.style.bottom = (1.0-this.splitH)*this.canvas.offsetHeight + "px";
        
        this.splitterH.style.right = (1.0-this.splitV)*this.canvas.offsetWidth + "px";
        this.splitterH.style.top = this.splitH*this.canvas.offsetHeight + "px";

        M.splitV = splitV;
        M.splitH = splitH;
    }

    addListener(listener)
    {
        this.listener.push(listener);
    }

    removeListener(listener)
    {
        for (var i=0; i<listener.length; i++)
        {
            if (listener[i].owner === listener)
            {
                listener.splice(i,1);
                break;
            }
        }			
    }
}



V2.Camera = class extends GM.Camera 
{
    constructor(canvas)
    {
        super(canvas);
        
        this.point = new GM.Vector3(0,0,0);
        
        this.min = { x: Number.POSITIVE_INFINITY, y: Number.POSITIVE_INFINITY };
        this.max = { x: Number.POSITIVE_INFINITY, y: Number.POSITIVE_INFINITY };
        
        this.zoomTransition = 0;
        this.zoom = 0;

        V.recvMessage("camera.set", (args) => 
        { 
            let position = args.position || GL.BoundingBox.center(V.viewer.aabb);	
            
            if (!position.hasOwnProperty("z"))
            {
                position.z = 0;
            }
            
            let zoom = args.zoom || 0;
            if (args.hasOwnProperty("zoom"))
            {
                zoom = args.zoom;
            }
            else
            {
                let w = V.viewer.aabb.max.x - V.viewer.aabb.min.x;
                let h = V.viewer.aabb.max.y - V.viewer.aabb.min.y;
                zoom = Math.ceil(Math.log(Math.max(gl.drawingBufferWidth/w, gl.drawingBufferHeight/h)));
            }
            this.set(position, zoom);
            V.postMessage("camera", { position, zoom }); 
        });
    }
    
    set(position, zoom)
    {
        super.set();
        
        GM.Vector3.copy(position, this.position);
        this.zoom = zoom; 
        this.zoomTransition = 0;
        
        this.updateMatrix();
        V.touch2d();
        V.touch3d();
    }
        
    toJson() 
    {
        return { position: this.position.toJson(), zoom: this.zoom };
    }

    updateMatrix() 
    {
        this.pixelSize = 1.0/Math.pow(2, V.camera.zoom + V.camera.zoomTransition);
        var mapW = gl.drawingBufferWidth*this.pixelSize;
        var mapH = gl.drawingBufferHeight*this.pixelSize;
        
        this.min.x = this.position.x - 0.5*mapW;
        this.min.y = this.position.y - 0.5*mapH;
        this.max.x = this.position.x + 0.5*mapW;
        this.max.y = this.position.y + 0.5*mapH;
    };

    getRay(event, ray)
    {
        if (!ray)
        {
            ray = this.ray;
        }
        var point = this.screenToCamera(event)

        var dx = 0.5*point.x*gl.drawingBufferWidth;
        var dy = 0.5*point.y*gl.drawingBufferHeight;
        ray.origin.x = this.position.x + dx*this.pixelSize;
        ray.origin.y = this.position.y - dy*this.pixelSize;
        ray.origin.z = this.position.z;
        ray.direction.x = 0;
        ray.direction.y = 0;
        ray.direction.z = -1;
        return ray;
    }

    project(point) 
    {
        this.point.x = (point.x - this.position.x)/(gl.drawingBufferWidth*this.pixelSize)+0.5;
        //this.point.y = 0.5 - (point.y - this.position.y)/(gl.drawingBufferHeight*this.pixelSize);
        //console.log(0.5 - (point.y - this.position.y)/(gl.drawingBufferHeight*this.pixelSize));
        this.point.y = 0.5-(this.position.y - point.y)/(gl.drawingBufferHeight*this.pixelSize);
        
        
        return this.point;
    };
    
    unproject(point) 
    {
        this.point.x = (point.x - this.position.x)/(gl.drawingBufferWidth*this.pixelSize)+0.5;
        this.point.y = 0.5-(this.position.y - point.y)/(gl.drawingBufferHeight*this.pixelSize);
        return this.point;
    };
    

    intersectsBox(box)
    {
        if (this.min.x > box.max.x || this.max.x < box.min.x) 
        {
            return false; 
        }
      
        if (this.min.y > box.max.y || this.max.y < box.min.y)
        {
            return false; 
        }
      
        return true;
    };

    focus(wx, wy)
    {
        this.position.x = wx;
        this.position.y = wy;
        this.moving = true;
    }

    distanceTo(point)
    {
        return M.maxZoom - (this.zoom+V.camera.zoomTransition);
    };
    /*
    fromJson(json) 
    {
        this.position.x = json.position.x;
        this.position.y = json.position.y;
        this.zoom = json.zoom;
    }
    */
}





V2.Controller = class extends V.CameraController
{
    constructor()
    {
        super(V.EventHandler.PRIO1, V.EventHandler.PRIO1, V.camera, 1);
        
        V.recvMessage("controller.view", (args) =>
        {
            let aabb = args.aabb;
            if (!aabb)
            {
                aabb = V.viewer.aabb;
            }
            
            let position = GL.BoundingBox.center(aabb);
            position.z = aabb.max.z || this.camera.position.z;
            
            let dx = aabb.max.x - aabb.min.x;
            let dy = aabb.max.y - aabb.min.y;
            
            this.tweenPosition(position);
            this.camera.zoom = Math.ceil(Math.log2(256/Math.sqrt(dx*dx+dy*dy))) + 1; 
            this.camera.zoomTransition = 0;
            this.tweenStart(this.zoomFn);
        });
        
        V.recvMessage("controller.target", (args) =>
        {
            this.startD = V.time;
            this.drag = 0;
            this.camera.zoomTransition = -1;
            this.camera.zoom++;
            this.updateFn = this.zoomFn;
        });
        
        V.recvMessage("viewpoint", (viewpoint) => 
        { 
            this.tweenPosition(viewpoint.camera.position);
            this.camera.zoom = viewpoint.camera.zoom;
            this.tweenStart(null); // need to triger camera moving event
        });

    }

    panFn(ctr)
    {
        var dx = 0.5*(this.currPos.x - this.startPos.x)*gl.drawingBufferWidth;
        var dy = 0.5*(this.currPos.y - this.startPos.y)*gl.drawingBufferHeight;
        var scale = 1<<V.camera.zoom;
        
        this.camera.position.x = this.sx - dx/scale;
        this.camera.position.y = this.sy + dy/scale;
    }
        
    zoomFn(ctr)
    {
        var pS0 = 1.0/Math.pow(2, this.camera.zoom + this.camera.zoomTransition);

        if (V.camera.zoomTransition > 0)
        {
            this.camera.zoomTransition = Math.max(0, this.camera.zoomTransition - Easing.Linear((V.time - this.startD)/1800));
        }
        else if (V.camera.zoomTransition < 0)
        {
            this.camera.zoomTransition = Math.min(0, this.camera.zoomTransition + Easing.Linear((V.time - this.startD)/1800));
        }
        var pS1 = 1.0/Math.pow(2, this.camera.zoom + this.camera.zoomTransition);
            
        this.camera.position.x -= 0.5*this.currPos.x*gl.drawingBufferWidth*(pS1-pS0);
        this.camera.position.y += 0.5*this.currPos.y*gl.drawingBufferHeight*(pS1-pS0);

        if (V.camera.zoomTransition == 0)
        {
            this.updateFn = null;
        }
    }

    onMouseDown(event) 
    {
        super.onMouseDown(event);
        if (event.button == 0)
        {
            this.sx = this.camera.position.x;
            this.sy = this.camera.position.y;
            this.updateFn = this.panFn;
        }
    };

    onDblClick(event)
    {
        if (!super.onDblClick(event))
        {
            if (V.camera.zoom < M.maxZoom)
            {
                let cast3d = this.cast3d;
                if (cast3d.distance != Number.POSITIVE_INFINITY)
                {
                    V.postMessage(V.viewer.datasets[cast3d.id].type+".dblclick",cast3d);
                }
            }
        }
    };

    onMouseWheel(event)
    {
        super.onMouseWheel(event);
        
        if (V.camera.zoomTransition == 0)
        {
            if (this.getWheelDelta(event) < 0)
            {
                if (V.camera.zoom < M.maxZoom)
                {
                    this.startD = V.time;
                    this.camera.zoomTransition = -1;
                    this.camera.zoom++;
                }
            }
            else
            {
                //if (V.camera.zoom > M.minZoom)
                {
                    this.startD = V.time;
                    this.camera.zoomTransition = 1;
                    this.camera.zoom--;
                }
            }
        }
        
        this.updateFn = this.zoomFn;
        
        event.stopImmediatePropagation();
    };
        
    onTouchStart(event) 
    {
        super.onTouchStart(event);
        
        this.sx = this.camera.position.x;
        this.sy = this.camera.position.y;
        this.updateFn =  this.panFn;
    }
};

