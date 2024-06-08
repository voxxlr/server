// User scope object --- it is this in "viewer.update"
U = {}

// Viewer namespace
V = (function() {
    
    var object = {
        viewer: null,
        touch3d : function()
        {
            V.viewer.repaint3d = true;
        },
        touch2d : function()
        {
            V.viewer.repaint2d = true;
        },
        
        api: {}
    }
    
    object.notify = (name, event)=>
    {
        V.EventHandler.APPEVENTS[name].forEach(handler => handler.method(event));
    };
    
    object.startLoading = ()=>
    {
        object.loading++;
        //if (object.loading == 1)
        //{
        //    V.postMessage("document.streaming", { count: object.loading });
        //}
    }
    
    object.stopLoading = ()=>
    {
        object.loading--;
        //if (object.loading == 0)
        //{
        //   V.postMessage("document.streaming", { count: object.loading });
        //}
    }
     
    object.loading = 0;
    object.time = window.performance.now();
    
    object.DRAGERROR = { r:1.0,g:0.8,b:0.8 };
    object.DRAGOK = { r:0.8,g:1.0,b:0.8 };
    object.NODRAG = { r:1.0,g:1.0,b:1.0 };

    //
    // keyboard state
    //
    object.keyMap = [];
    object.keyCount = 0;
    document.addEventListener("keydown", (event)=>
    {
        if (!object.keyMap[event.keyCode])
        {
            object.keyCount++;		
            object.keyMap[event.keyCode] = true;
        }
    });
    document.addEventListener("keyup", (event)=>
    {
        if (object.keyCount)
        {
            object.keyCount--;
            object.keyMap[event.keyCode] = false;
        }
    });
    document.addEventListener("mouseout", (event)=>
    {
        object.keyMap = [];
        object.keyCount = 0;
    });

    
    //
    // message api
    //
    object.log = false;
    object.postMessage = (action, args, optional) =>
    {
        if (V.logging)
        {
            console.log(`%c>>>> ${action}\n`, 'color:grey; font-weight:800', args);
        }
        window.parent.postMessage( { action, args, optional }, "*");
    }
    
    object.recvMessage = (name, callback,owner) =>
    {
        if (name instanceof Array)
        {
            name.forEach(entry => object.recvMessage(entry, callback));
        }
        else
        {
            callback.owner = owner;
            if (V.api[name])
            {
                V.api[name].push(callback);
            }
            else
            {
                V.api[name] = [callback];
            }
        }
    }
    
    object.unrecvMessage = (name, owner) =>
    {
        if (name instanceof Array)
        {
            name.forEach(entry => object.unrecvMessage(entry, owner));
        }
        else
        {
            if (V.api[name])
            {
                let list = V.api[name];
                for (var i=0; i<list.length; i++)
                {
                    if (list[i].owner == owner)
                    {
                        list.splice(i,1);
                    }
                }
            }
        }
    }

    object.viewerCb = function(document)
    {
        let custom = {};
        let params = new RegExp('[\?&]custom=([^&#]*)').exec(window.location.href);
        if (params)
        {
            custom = JSON.parse(decodeURIComponent(params[1]));
        }
        
        V.postMessage("viewer.load", document, custom);
    }
    
    object.importCb = function(document, custom)
    {
        V.postMessage("import.create", document, this);  // 'this'' is bound custom param ?! Make this work so its "custom"
    }
    
    object.METRIC = 0;
    object.IMPERIAL = 1;
    object.units = 0;
    
    object.canvas = document.getElementById("canvas3D");

    window.addEventListener('message', function(e) 
    {
        if (e.data.action instanceof Array)
        {
            e.data.action.forEach((action, index) =>
            {
                var handlers = this.api[action];
                if (handlers)
                {
                    if (this.logging)
                    {
                        console.log(`%c<<< ${e.data.action}\n`, 'color:green; font-weight:800', e.data.args[index]);
                    }
                    
                    for (var i=0; i<handlers.length; i++)
                    {
                        handlers[i](e.data.args[index] || {}, e.data.custom || {});
                    }
                }
                else
                {
                    if (this.logging)
                    {
                        console.log(`%c<<< ${e.data.action}\n`, 'color:red; font-weight:800', e.data.args);
                    }
                    //console.log("Unknown message handler " + e.data.action);
                }

            })
        }
        else
        {
            var handlers = this.api[e.data.action];
            if (handlers)
            {
                if (this.logging)
                {
                    console.log(`%c<<< ${e.data.action}\n`, 'color:green; font-weight:800', e.data.args);
                }
                
                for (var i=0; i<handlers.length; i++)
                {
                    handlers[i](e.data.args|| {}, e.data.custom || {});
                }
            }
            else
            {
                if (this.logging)
                {
                    console.log(`%c<<< ${e.data.action}\n`, 'color:red; font-weight:800', e.data.args);
                }
                //object.postMessage(e.data.action, e.data.args);
            }
        }
        
    }.bind(object));
    

    return object;
    
})();

M = 
{
    MAX_MEM : 350*1024*1024,
    MIN_MEM : 310*1024*1024,
    memoryUsed : 0,
    rendered : 0,
};


// System Events
V.EventHandler = class
{
    constructor(prioSys, prioApp)
    {
        this.prioSys = prioSys;
        this.prioApp = prioApp || prioSys;
        
        this.cvsListener = [];
    
        // mouse
        
        if (this.onMouseDown)
        {
            this.cvsListener.push({ name:'mousedown', method: this.onMouseDown.bind(this), options: { capture: false }});
        }
        if (this.onMouseMove)
        {
            this.cvsListener.push({ name:'mousemove', method: this.onMouseMove.bind(this), options: { capture: false }});
        }
        if (this.onMouseUp)
        {
            this.cvsListener.push({ name:'mouseup', method: this.onMouseUp.bind(this), options: { capture: false }});
        }
        if (this.onMouseOut)
        {
            this.cvsListener.push({ name:'mouseout', method: this.onMouseOut.bind(this), options: { capture: false }});
        }
        if (this.onMouseWheel)
        {
            this.cvsListener.push({ name:'mousewheel', method: this.onMouseWheel.bind(this), options: { capture: false, passive: false }});
            this.cvsListener.push({ name:'DOMMouseScroll', method: this.onMouseWheel.bind(this), options: { capture: false }});
        }
        
        // clicks
        if (this.onDblClick)
        {
            this.cvsListener.push({ name:'dblclick', method: this.onDblClick.bind(this), options: { capture: false }});
        }
        if (this.onClick)
        {
            this.cvsListener.push({ name:'click', method: this.onClick.bind(this), options: { capture: false }});
        }
        
        // touch
        if (this.onTouchStart)
        {
            this.cvsListener.push({ name:'touchstart', method: this.onTouchStart.bind(this), options: { capture: false }});
        }
        if (this.onTouchEnd)
        {
            this.cvsListener.push({ name:'touchend', method: this.onTouchEnd.bind(this), options: { capture: false }});
        }
        if (this.onTouchCancel)
        {
            this.cvsListener.push({ name:'touchcancel', method: this.onTouchCancel.bind(this), options: { capture: false }});
        }
        if (this.onTouchMove)
        {
            this.cvsListener.push({ name:'touchmove', method: this.onTouchMove.bind(this), options: { capture: false }});
        }
        
        // keys
        
        this.keyListener = [];
        
        if (this.onKeyUp)
        {
            this.keyListener.push({ name:'keyup', method: this.onKeyUp.bind(this), options: { capture: false }});
        }
        
        if (this.onKeyDown)
        {
            this.keyListener.push({ name:'keydown', method: this.onKeyDown.bind(this), options: { capture: false }});
        }
        if (this.onKeyPressed)
        {
            this.keyListener.push({ name:'keypress', method: this.onKeyPressed.bind(this), options: { capture: false }});
        }
            
        // applicaton
        this.appListener = [];
        for (var property in V.EventHandler.APPEVENTS)
        {
            if (this[property])
            {
                this.appListener.push({ name:property, method: this[property].bind(this) });
            }
        }
    }
    
    attach()
    {
        V.EventHandler.SYSPRIO.forEach(handler => handler.forEach(handler => handler.detachSysHandlers()));
        V.EventHandler.SYSPRIO[this.prioSys].push(this);
        V.EventHandler.SYSPRIO.forEach(handler => handler.forEach(handler => handler.attachSysHandlers()));

        V.EventHandler.APPPRIO.forEach(handler => handler.forEach(handler => handler.detachAppHandlers()));
        V.EventHandler.APPPRIO[this.prioApp].push(this);
        V.EventHandler.APPPRIO.forEach(handler => handler.forEach(handler => handler.attachAppHandlers()));
    }
    
    detach()
    {
        V.EventHandler.SYSPRIO.forEach(handler => handler.forEach(handler => handler.detachSysHandlers()));
        V.EventHandler.SYSPRIO[this.prioSys].splice(V.EventHandler.SYSPRIO[this.prioSys].indexOf(this),1);
        V.EventHandler.SYSPRIO.forEach(handler => handler.forEach(handler => handler.attachSysHandlers()));
        
        V.EventHandler.APPPRIO.forEach(handler => handler.forEach(handler => handler.detachAppHandlers()));
        V.EventHandler.APPPRIO[this.prioApp].splice(V.EventHandler.APPPRIO[this.prioApp].indexOf(this),1);
        V.EventHandler.APPPRIO.forEach(handler => handler.forEach(handler => handler.attachAppHandlers()));
    }
    
    detachSysHandlers()
    {
        this.cvsListener.forEach(handler => V.EventHandler.CONTAINER.removeEventListener(handler.name, handler.method, handler.options))
        this.keyListener.forEach(handler => document.removeEventListener(handler.name, handler.method, handler.options))
    }
    
    attachSysHandlers()
    {
        this.cvsListener.forEach(handler => V.EventHandler.CONTAINER.addEventListener(handler.name, handler.method, handler.options));
        this.keyListener.forEach(handler =>	document.addEventListener(handler.name, handler.method, handler.options))
    }
    
    detachAppHandlers()
    {
        this.appListener.forEach(handler => V.EventHandler.APPEVENTS[handler.name].pop(handler))
    }
    
    attachAppHandlers()
    {
        this.appListener.forEach(handler => V.EventHandler.APPEVENTS[handler.name].push(handler))
    }
    
    isAttached()
    {
        return V.EventHandler.APPPRIO[this.prioApp].includes(this);
    }
}

V.EventHandler.APPPRIO = [[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]];
V.EventHandler.SYSPRIO = [[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]];
V.EventHandler.APPEVENTS = 
{
    'onRender2D' : [],
    'onRender3D' : [],
    'onResize' : [],
    'onUpdate' : [],
};
    
V.EventHandler.PRIO0 = 0;
V.EventHandler.PRIO1 = 1;
V.EventHandler.PRIO2 = 2;
V.EventHandler.PRIO3 = 3;
V.EventHandler.PRIO4 = 4;
V.EventHandler.PRIO5 = 5;
V.EventHandler.PRIO6 = 6;
V.EventHandler.CONTAINER = document.querySelector(".events");  

V.Viewer = class
{
    constructor(attributes)
    {
        V.viewer = this;
        
        this.datasets = {};
        this.aabb = GL.BoundingBox.init({});

        this.canvas = V.canvas;
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
        
        this.overlay = new O.Overlay(this);
        this.overlay.attach();
            
        window.addEventListener('resize', () => 
        {
            this.canvas.width = this.canvas.clientWidth;
            this.canvas.height = this.canvas.clientHeight;
            V.camera.updateMatrix();
            V.notify("onResize", { width: window.innerWidth, height: window.innerHeight });
            V.touch2d();
            V.touch3d();
        });

        gl = this.canvas.getContext('webgl2', attributes) || this.canvas.getContext('experimental-webgl', attributes);
        gl.clearColor(1, 1, 1, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);	
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
        
        let EXT_texture_filter_anisotropic = gl.getExtension("EXT_texture_filter_anisotropic");

        if (EXT_texture_filter_anisotropic)
        {
            gl.anisotropy = EXT_texture_filter_anisotropic.TEXTURE_MAX_ANISOTROPY_EXT;
            gl.maxAnisotropy = gl.getParameter(EXT_texture_filter_anisotropic.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
            gl.supports_EXT_texture_filter_anisotropic = true;
        }
        else
        {
            gl.supports_EXT_texture_filter_anisotropic = false;
        }
     
        GL.GL_EXT_frag_depth = gl.getExtension('EXT_frag_depth');
        
        this.animateFn = this.animate.bind(this);

        this.visible = true;
        this.repaint = true;
        
    
        //
        // API
        //
        V.recvMessage("viewer.image.get", (args) =>
        {
            this.imageCallback = args;
            V.touch3d();
        });

        V.recvMessage("import.update", (args) => 
        { 
            if (this.datasets[args.id])
            {
                if (args.hasOwnProperty("visible"))
                {
                    this.datasets[args.id].visible = args.visible;
                    V.touch3d();
                }
            }
        });
        
        V.recvMessage("import.delete", (args, custom) => 
        {
            let document = this.datasets[args.id];
            if (document) 
            {
                document.unload();
                V.postMessage("import.delete", args);
                delete this.datasets[args.id];
                V.touch3d();
            }
            
            GL.BoundingBox.init(this.aabb, {});
            for (var id in this.datasets)
            {
                GL.BoundingBox.merge(this.aabb, this.datasets[id]);
            }
        });

        V.recvMessage("viewer.unload", (args) => 
        {
            for (var id in this.datasets)
            {
                this.datasets[id].unload();
                //V.postMessage("viewer.unload", { id });
                delete this.datasets[id];
            }
            
            GL.BoundingBox.init(this.aabb, {});
            V.postMessage("viewer.unload", args);
        });
        
        V.recvMessage("repaint", args => 
        {
            V.touch2d();
            V.touch3d();
        }) 
            
        V.recvMessage("viewpoint", (viewpoint) => 
        { 
            for (var id in this.datasets)
            {
                let entry = this.datasets[id];
                if (viewpoint[entry.id])
                {
                    entry.setViewpoint(viewpoint[entry.id]);
                }
            }
            
            V.touch3d();
            V.postMessage("viewpoint", viewpoint);
        });
        
        V.recvMessage("raycast.overlay", (args) => 
        { 
            let ray = V.camera.getRay({ pageX: args.x, pageY: args.y });
            var cast2d = O.instance.raycast(ray, args.x, args.y);
            V.postMessage("raycast.overlay", cast2d);
        });
        
        V.recvMessage("raycast.content", (args) => 
        { 
            let ray = V.camera.getRay({ pageX: args.x, pageY: args.y });
            var cast3d = V.viewer.raycast(ray, { xyz: {}, normal: args.normal, distance: Number.POSITIVE_INFINITY });
            if (cast3d.distance != Number.POSITIVE_INFINITY)
            {
                if (cast3d.normal)
                {
                    GM.Vector3.normalize(cast3d.normal, cast3d.normal);
                }
            }		
            
            V.postMessage("raycast.content", cast3d);
        });
        
        V.recvMessage("camera.project", (point) => 
        {
            let screen = V.camera.project(point);
                
            V.postMessage("camera.project", { pageX: screen.x*O.canvas.width, pageY: screen.y*O.canvas.height });
        });
        
        V.recvMessage("viewer.update", (args, custom) => 
        {
            if (args.hasOwnProperty("logging"))  
            {
                V.logging = args.logging;
            }

            if (args.hasOwnProperty("units"))
            {
                if (args.units === "imperial")
                {
                    V.units = V.IMPERIAL;
                }
                else
                {
                    V.units = V.METRIC;
                }
            }
            
            if (args.hasOwnProperty("clearColor"))  
            {
                gl.clearColor(args.clearColor[0], args.clearColor[1], args.clearColor[2], 1);
            }

            if (args.hasOwnProperty("code"))  
            {
                let code = Function("return " + decodeURI(args.code))();
                code.call();				
            }
            
            V.postMessage("viewer.update", args, custom);
        });
    }
    
    raycast(ray, options)
    {
        for (var id in this.datasets)
        {
            let entry = this.datasets[id];
            if (entry.visible)
            {
                var intersect = ray.intersectBox(entry);
                if (intersect)
                {
                    if (intersect.distance < options.distance)
                    {
                        let distance = options.distance;
                        
                        entry.raycast(ray, options);
                        
                        if (options.distance < distance)
                        {
                            options.id = entry.id;
                        }
                    }
                }
            }
        }
        
        return options;
    }

    load(id, model)
    {
        GL.BoundingBox.merge(this.aabb, model);
        this.datasets[id] = model;
    }
    
    
    startImage()
    {
        if (this.imageCallback.width && this.imageCallback.height)
        {
            // fixed with and height -- resize canvas and rerender
            this.imageCallback.oldWidth = this.canvas.width; 
            this.imageCallback.oldHeight = this.canvas.height;
            
            V.canvas.width = this.imageCallback.width;
            V.canvas.height = this.imageCallback.height;
            V.notify("onResize", { width: V.canvas.width, height: V.canvas.height });
            V.touch2d();
        }
    }

    endImage()
    {
        if (this.imageCallback.oldWidth && this.imageCallback.oldHeight)
        {
            if (this.imageCallback.overlay)
            {
                let canvas = document.createElement("canvas");
                canvas.width = V.canvas.width;
                canvas.height = V.canvas.height;

                let ctx = canvas.getContext('2d');
                ctx.drawImage(V.canvas, 0, 0, canvas.width, canvas.height);
                ctx.drawImage(O.canvas, 0, 0, canvas.width, canvas.height);

                V.postMessage("viewer.image.get", canvas.toDataURL(this.imageCallback.type, this.imageCallback.options));
            }
            else
            {
                V.postMessage("viewer.image.get", V.canvas.toDataURL(this.imageCallback.type, this.imageCallback.options));
            }
            
            // fixed with and height -- resize canvas to old size and rerender
            V.canvas.width = this.imageCallback.oldWidth; 
            V.canvas.height = this.imageCallback.oldHeight;
            V.notify("onResize", { width: V.canvas.width, height: V.canvas.height });
            
            gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            this.render(this.camera);
            V.notify("onRender3D", this);
            V.notify("onRender2D", this);
        }
        else
        {
            if (this.imageCallback.maxWidth || this.imageCallback.maxHeight)
            {
                let canvas = document.createElement("canvas");
                let ctx = canvas.getContext('2d');
                if (this.imageCallback.maxWidth && this.imageCallback.maxHeight)
                {
                    // scale and crop to fit max width or max height
                    let scalar = Math.min(1.0,Math.max(this.imageCallback.maxHeight/gl.drawingBufferHeight, this.imageCallback.maxWidth/gl.drawingBufferWidth));
                    canvas.width = this.imageCallback.maxWidth;
                    canvas.height = this.imageCallback.maxHeight;
                    let sx = Math.floor(0.5*(1.0-scalar)*gl.drawingBufferWidth);
                    let sy = Math.floor(0.5*(1.0-scalar)*gl.drawingBufferHeight);
                    
                    ctx.drawImage(V.canvas, sx, sy, gl.drawingBufferWidth*scalar, gl.drawingBufferHeight*scalar, 0, 0, canvas.width, canvas.height);
                    if (this.imageCallback.overlay)
                    {
                        ctx.drawImage(O.canvas, sx, sy, gl.drawingBufferWidth*scalar, gl.drawingBufferHeight*scalar, 0, 0, canvas.width, canvas.height);
                    }
                }
                else
                {
                    let scalar = 1.0;

                    // scale to fit max width or max height
                    if (!this.imageCallback.maxHeight && gl.drawingBufferWidth > this.imageCallback.maxWidth)
                    {
                        scalar = Math.min(scalar, this.imageCallback.maxWidth/gl.drawingBufferWidth)
                    }
                    else if (!this.imageCallback.maxWidth && gl.drawingBufferHeight > this.imageCallback.maxHeight)
                    {
                        scalar = Math.min(scalar, this.imageCallback.maxHeight/gl.drawingBufferHeight)
                    }
                    canvas.width = gl.drawingBufferWidth*scalar;
                    canvas.height = gl.drawingBufferHeight*scalar;

                    ctx.drawImage(V.canvas, 0, 0, canvas.width, canvas.height);
                    if (this.imageCallback.overlay)
                    {
                        ctx.drawImage(O.canvas, 0, 0, canvas.width, canvas.height);
                    }
                }
                V.postMessage("viewer.image.get", canvas.toDataURL(this.imageCallback.type, this.imageCallback.options));
            }
            else
            {
                // send exactly as on screen
                if (this.imageCallback.overlay)
                {
                    let canvas = document.createElement("canvas");
                    canvas.width = V.canvas.width;
                    canvas.height = V.canvas.height;

                    let ctx = canvas.getContext('2d');
                    ctx.drawImage(V.canvas, 0, 0, canvas.width, canvas.height);
                    ctx.drawImage(O.canvas, 0, 0, canvas.width, canvas.height);

                    V.postMessage("viewer.image.get", canvas.toDataURL(this.imageCallback.type, this.imageCallback.options));
                }
                else
                {
                    V.postMessage("viewer.image.get", V.canvas.toDataURL(this.imageCallback.type, this.imageCallback.options));
                }				
            }
        }
    }

        
    animate()
    {
        requestAnimationFrame(this.animateFn);
        
        if (this.visible)
        {
            let now = window.performance.now();
            V.dT = (now - V.time)/1000;
            V.time = now;
            
            if (this.imageCallback)
            {
                this.startImage()	
            }
        
            let wasMoving = V.camera.moving;
            V.camera.moving = V.camera.changed();
            V.notify("onUpdate", { });
            V.camera.starting = V.camera.moving && !wasMoving;
            
            // render3d
            if (V.viewer.repaint3d || V.camera.moving)
            {		   		
                V.viewer.repaint3d = false;

                gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
                gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
                this.render(this.camera);
                
                V.notify("onRender3D", this);
            }

            // render2d
            if (V.viewer.repaint2d || V.camera.moving)
            {
                V.viewer.repaint2d = false;
                V.notify("onRender2D", this);
            }

            if (this.imageCallback)
            {
                this.endImage()	
                delete this.imageCallback;
            }


            V.camera.stopping = wasMoving && !V.camera.moving;
            if (wasMoving)
            {
                V.postMessage("camera.update", V.camera.toJson() );
            }
        }
    };

    setBufferSize(width, height)
    {
        V.canvas.width = width;
        V.canvas.height = height;
        V.camera.moving = true;
    }	
}



V.Dataset = class
{
    constructor(config)
    {
        this.config = config;
        
        this.id = config.id;
        this.type = config.type;
        this.root = config.root;
        this.visible = config.hasOwnProperty("visible") ? config.visible : true;
        
        this.lastRefresh = 0;
            
        this.url = config.source;
        this.refresh = config.refresh;
        
        //if (this.refresh)
        //{
        //	this.refreshToken();
        //}
    }

    refreshToken()
    {
        if (!this.promise && this.refresh)
        {
            this.promise = new Promise((resolve,reject) =>
            {
                var xhr = new XMLHttpRequest();
                xhr.open("GET", this.refresh, true);
                xhr.onload = (e) =>
                {
                    if (xhr.status == 200)
                    {
                        let response = JSON.parse(e.currentTarget.responseText);
                        
                        this.url = response.source.data;
                        this.refresh = response.source.refresh;
                        resolve(this.url);
                    }
                    else
                    {
                        reject(xhr.status)
                    }
                };
                xhr.onerror = (e)=>
                {
                    reject(xhr.status)
                }
                xhr.send();
            });
            
            this.promise.then(() =>
            {
                this.promise = null;
            });
        }
        
        return this.promise;
    }

}




//
// Camera Controller
//

V.CameraController = class extends V.EventHandler 
{
    constructor(sysPrio, appPrio, camera, dragMax)
    {
        super(sysPrio, appPrio);
        
        this.name = name;
        this.camera = camera;
        
        // mouse I/O
        this.currPos  = { x:0, y:0 };
        this.currZoom = 0;

        // ray casting
        this.pointerPosition = { pageX: 0, pageY: 0 };
        this.pointerRay = new GM.Ray();
        this.pointerAge = 0;
        this.cast3d = { distance: Number.POSITIVE_INFINITY };

        // tweening        
        this.ray = new GM.Ray();

        this.q0 = new GM.Quaternion();
        this.qN = new GM.Quaternion();
        this.qR = new GM.Quaternion();
        
        this.min = new GM.Vector3(0,0,0);
        this.max = new GM.Vector3(0,0,0);
        
        this.drag = 0;
        this.dragMax = dragMax;
        this.shiftKey = false;
        
        this.tn = 0;
        this.keys = {};
        
        this.position = {
            sT: 1,
            p0 : { x:0, y:0, z:0 },
            p1 : { x:0, y:0, z:0 },
        };
        
        this.rotation = {
            sT: 1,
            q0 : new GM.Quaternion(),
            q1 : new GM.Quaternion(),
            qR : new GM.Quaternion(),
        };
        
        this.tweenR = 400;
        this.tweenT = 400;
    }

    tweenPosition(position, t)
    {
        this.position.p0.x = this.camera.position.x;
        this.position.p0.y = this.camera.position.y;
        this.position.p0.z = this.camera.position.z;
        this.position.p1.x = position.x;
        this.position.p1.y = position.y;
        this.position.p1.z = position.z;
        this.position.t = V.time + (t || this.tweenT);
        this.position.sT = 0;
    }

    tweenRotation(rotation, t)
    {
        this.rotation.q0.fromEuler(this.camera.rotation);
        this.rotation.q1.fromEuler(rotation);
        this.rotation.t = V.time + (t || this.tweenR);
        this.rotation.sT = 0;
    }

    tweenStart(updateFn)
    {
        this.t0 = V.time;
        this.updateFn = updateFn;
        this.drag = 0;
    }
    
    tweenStop()
    {
        this.position.sT = 1;
        this.position.sT = 1;
        this.updateFn = null;
        this.drag = 0;
    }

    onUpdate(event) 
    {
        if (this.position.sT < 1.0 || this.rotation.sT < 1.0)
        {
            if (this.position.sT < 1.0)
            {
                this.position.sT = Math.min(1.0,(V.time - this.t0)/(this.position.t-this.t0));
                
                var value = Easing.Sinusoidal.In(this.position.sT);
                var s0 = this.position.p0;
                var s1 = this.position.p1;
                
                this.camera.position.x = s0.x + (s1.x-s0.x)*value;
                this.camera.position.y = s0.y + (s1.y-s0.y)*value;
                this.camera.position.z = s0.z + (s1.z-s0.z)*value;
            }
    
            if (this.rotation.sT < 1.0)
            {
                this.rotation.sT = Math.min(1.0,(V.time - this.t0)/(this.rotation.t-this.t0));
                
                GM.Quaternion.slerp(this.rotation.q0, this.rotation.q1, this.rotation.qR, Easing.Sinusoidal.In(this.rotation.sT));
                this.camera.rotation.fromQuaternion(this.rotation.qR);
            }
            
            this.camera.moving = true;
            
            if (this.updateFn)
            {
                this.updateFn.call(this, this, event);
            
                if (this.position.sT == 1.0 && this.rotation.sT == 1.0)
                {
                    this.updateFn = null;
                }			
            }
        }
        else if (this.updateFn)
        {
            this.updateFn.call(this, this, event);

            if (this.drag)
            {
                if (this.drag-- == 1)
                {
                    this.updateFn = null;
                }
            }
            
            this.camera.moving = true;
        }

        if (V.camera.stopping)
        {
            V.camera.getRay(this.pointerPosition, this.pointerRay);
            V.postMessage("viewer.mousemove", this.castRay3d());
        }
    }

    getWheelDelta(event)
    {
        var scalar = event.shiftKey ? 0.2 : 1.0;

        if (event.wheelDelta !== undefined) 
        { 
            return -scalar*event.wheelDelta/4300;
        } 
        else if (event.detail !== undefined) 
        { 
            return scalar*event.detail/250;
        }
    }

    onMouseWheel(event) 
    {
        this.currPos = this.camera.screenToCamera(this.pointerPosition);
        this.currZoomD = this.getWheelDelta(event);
        this.currZoom -= this.currZoomD;
        this.currZoom = Math.min(Math.max(-1.0, this.currZoom), 1.0);
        event.preventDefault();
    }       

    onMouseDown(event) 
    {
        this.startPos = this.camera.screenToCamera(this.pointerPosition);
        this.currPos.x = this.startPos.x;
        this.currPos.y = this.startPos.y;             
        this.drag = 0;
        V.postMessage('viewer.mousedown', this.cast3d);
    };
    
    onTouchStart(event) 
    {
        var touches = event.targetTouches;
    
        if (touches.length == 1)
        {
            this.pointerPosition =  { pageX: touches[0].pageX , pageY: touches[0].pageY };
            this.onMouseDown({ pageX:  touches[0].pageX , pageY:  touches[0].pageY, button: 0 })

            V.camera.getRay(this.pointerPosition, this.pointerRay);
            this.cast2d = O.instance.raycast(this.pointerRay, this.pointerPosition);
            
            V.postMessage("viewer.mousemove", this.castRay3d());
    
            this.touchStamp = V.time;		    
            this.touchLast = touches[0];
        }
        //else if (touches.length == 2)
        // {
        // zoom
        //}
    };

    onMouseMove(event) 
    {
        this.currPos = this.camera.screenToCamera(event);
        this.shiftKey = event.shiftKey;

        this.pointerPosition =  { pageX: event.pageX , pageY: event.pageY };
        
        if (this._timer == null && !V.camera.moving)
        {
            this._timer = setTimeout(() =>
            {
                if (this._timer != null)
                {
                    V.postMessage("viewer.mousemove", this.castRay3d());
                }
            }, 150);
        }    	
        
        V.camera.getRay(this.pointerPosition, this.pointerRay);
    };
    
    onTouchMove(event) 
    {
        var touches = event.targetTouches;
        //console.log("onTouchMove", touches);
        if (touches.length == 1)
        {
            this.onMouseMove({ pageX:  touches[0].pageX , pageY:  touches[0].pageY, button: 0 });
            this.touchLast = touches[0];
        }
    
        this.touchStamp = 0;
    };

    onMouseUp(event) 
    {
        this.drag = this.dragMax;
    };

    onMouseOut(event) 
    {
        this.currZoom = 0;
        this.updateFn = null;
    };

    onClick(event)
    {
        event.ray = V.camera.getRay(event, this.ray);
        this.cast2d = O.instance.raycast(event.ray, event.pageX, event.pageY);
        if (this.cast2d.hits.length > 0)
        {
            this.cast2d.hits.sort(function(a,b)
            {
                return a.distance - b.distance;
            })
            
            var next = this.cast2d.hits[0].object;
            V.postMessage(next.type+".click", next.CLICK({ id: next.id, type: next.type, pageX: event.pageX, pageY: event.pageY }));
            return true;
        }
        return false;
    }	

    onDblClick(event)
    {
        V.camera.getRay(this.pointerPosition, this.pointerRay);
        this.castRay3d();
        
        event.ray = this.ray;
        if (this.cast2d.hits.length > 0)
        {
            var next = this.cast2d.hits[0].object;
            V.postMessage(next.type+".dblclick", next.DBLCLICK({ id: next.id, type: next.type, pageX: event.pageX, pageY: event.pageY }));	
            return true;
        }
        V.postMessage("viewer.dblclick", this.cast3d);
        return false;
    }
        
    onTouchEnd(event) 
    {
        var touches = event.targetTouches;
        
        if (touches.length == 0)
        {
            event.pageX = this.touchLast.pageX;
            event.pageY = this.touchLast.pageY;
            if (V.time - this.touchStamp < 300)
            {
                return this.onDblClick(event);
            }
            else
            {
                this.onMouseUp(event);
                return this.onClick(event);
            }
        }
        return false;
    };

  
    onKeyDown(event) 
    {
        this.drag = 0;
        this.keys[event.keyCode] = true;
    }

    onKeyUp(event) 
    {
        if (!V.keyCount)
        {
            this.drag = this.dragMax;
        }
        delete this.keys[event.keyCode];
        this.startPos.x = this.currPos.x;
        this.startPos.y = this.currPos.y;
    }


    onTouchCancel(event) 
    {
    //	console.log("onTouchCancel");
    };
    
    castRay3d()
    {
        let cast = V.viewer.raycast(this.pointerRay, { xyz: {}, normal: {}, distance: Number.POSITIVE_INFINITY });
        if (cast.distance != Number.POSITIVE_INFINITY)
        {
            GM.Vector3.normalize(cast.normal, cast.normal);
        }		
        this.cast3d = cast;
        this.pointerAge = V.time;
        
        this._timer = null;
        return cast;
    }
}

Easing = {

        Linear: function ( k ) { return k; },
        Quadratic: {

            In: function ( k ) { return k * k; },
            Out: function ( k ) { return k * ( 2 - k ); },
            InOut: function ( k ) 
            {
                if ( ( k *= 2 ) < 1 ) return 0.5 * k * k;
                return - 0.5 * ( --k * ( k - 2 ) - 1 );
            }
        },

        Cubic: {

            In: function ( k ) { return k * k * k; },
            Out: function ( k ) { return --k * k * k + 1; },
            InOut: function ( k ) 
            {
                if ( ( k *= 2 ) < 1 ) return 0.5 * k * k * k;
                return 0.5 * ( ( k -= 2 ) * k * k + 2 );
            }
        },

        Quartic: {

            In: function ( k ) { return k * k * k * k; },
            Out: function ( k ) { return 1 - ( --k * k * k * k ); },
            InOut: function ( k ) 
            {
                if ( ( k *= 2 ) < 1) return 0.5 * k * k * k * k;
                return - 0.5 * ( ( k -= 2 ) * k * k * k - 2 );
            }
        },

        Sinusoidal: {

            In: function ( k ) { return 1 - Math.cos( k * Math.PI / 2 ); },
            Out: function ( k ) { return Math.sin( k * Math.PI / 2 ); },
            InOut: function ( k ) 
            {
                return 0.5 * ( 1 - Math.cos( Math.PI * k ) );
            }
        },

        Exponential: {

            In: function ( k ) { return k === 0 ? 0 : Math.pow( 1024, k - 1 );},
            Out: function ( k ) { return k === 1 ? 1 : 1 - Math.pow( 2, - 10 * k ); },
            InOut: function ( k ) 
            {
                if ( k === 0 ) return 0;
                if ( k === 1 ) return 1;
                if ( ( k *= 2 ) < 1 ) return 0.5 * Math.pow( 1024, k - 1 );
                return 0.5 * ( - Math.pow( 2, - 10 * ( k - 1 ) ) + 2 );
            }
        },

        Circular: {

            In: function ( k ) {

                return 1 - Math.sqrt( 1 - k * k );

            },

            Out: function ( k ) {

                return Math.sqrt( 1 - ( --k * k ) );

            },

            InOut: function ( k ) {

                if ( ( k *= 2 ) < 1) return - 0.5 * ( Math.sqrt( 1 - k * k) - 1);
                return 0.5 * ( Math.sqrt( 1 - ( k -= 2) * k) + 1);

            }

        },

        Elastic: {

            In: function ( k ) {

                var s, a = 0.1, p = 0.4;
                if ( k === 0 ) return 0;
                if ( k === 1 ) return 1;
                if ( !a || a < 1 ) { a = 1; s = p / 4; }
                else s = p * Math.asin( 1 / a ) / ( 2 * Math.PI );
                return - ( a * Math.pow( 2, 10 * ( k -= 1 ) ) * Math.sin( ( k - s ) * ( 2 * Math.PI ) / p ) );

            },

            Out: function ( k ) {

                var s, a = 0.1, p = 0.4;
                if ( k === 0 ) return 0;
                if ( k === 1 ) return 1;
                if ( !a || a < 1 ) { a = 1; s = p / 4; }
                else s = p * Math.asin( 1 / a ) / ( 2 * Math.PI );
                return ( a * Math.pow( 2, - 10 * k) * Math.sin( ( k - s ) * ( 2 * Math.PI ) / p ) + 1 );

            },

            InOut: function ( k ) {

                var s, a = 0.1, p = 0.4;
                if ( k === 0 ) return 0;
                if ( k === 1 ) return 1;
                if ( !a || a < 1 ) { a = 1; s = p / 4; }
                else s = p * Math.asin( 1 / a ) / ( 2 * Math.PI );
                if ( ( k *= 2 ) < 1 ) return - 0.5 * ( a * Math.pow( 2, 10 * ( k -= 1 ) ) * Math.sin( ( k - s ) * ( 2 * Math.PI ) / p ) );
                return a * Math.pow( 2, -10 * ( k -= 1 ) ) * Math.sin( ( k - s ) * ( 2 * Math.PI ) / p ) * 0.5 + 1;

            }

        },

        Back: {

            In: function ( k ) {

                var s = 1.70158;
                return k * k * ( ( s + 1 ) * k - s );

            },

            Out: function ( k ) {

                var s = 1.70158;
                return --k * k * ( ( s + 1 ) * k + s ) + 1;

            },

            InOut: function ( k ) {

                var s = 1.70158 * 1.525;
                if ( ( k *= 2 ) < 1 ) return 0.5 * ( k * k * ( ( s + 1 ) * k - s ) );
                return 0.5 * ( ( k -= 2 ) * k * ( ( s + 1 ) * k + s ) + 2 );

            }

        },

        Bounce: {

            In: function ( k ) {

                return 1 - Easing.Bounce.Out( 1 - k );

            },

            Out: function ( k ) {

                if ( k < ( 1 / 2.75 ) ) {

                    return 7.5625 * k * k;

                } else if ( k < ( 2 / 2.75 ) ) {

                    return 7.5625 * ( k -= ( 1.5 / 2.75 ) ) * k + 0.75;

                } else if ( k < ( 2.5 / 2.75 ) ) {

                    return 7.5625 * ( k -= ( 2.25 / 2.75 ) ) * k + 0.9375;

                } else {

                    return 7.5625 * ( k -= ( 2.625 / 2.75 ) ) * k + 0.984375;

                }

            },

            InOut: function ( k ) {

                if ( k < 0.5 ) return Easing.Bounce.In( k * 2 ) * 0.5;
                return Easing.Bounce.Out( k * 2 - 1 ) * 0.5 + 0.5;

            }

        }

    };

        
V.KEY_CANCEL = 3;
V.KEY_HELP = 6;
V.KEY_BACK_SPACE = 8;
V.KEY_TAB = 9;
V.KEY_CLEAR = 12;
V.KEY_RETURN = 13;
V.KEY_ENTER = 14;
V.KEY_SHIFT = 16;
V.KEY_CONTROL = 17;
V.KEY_ALT = 18;
V.KEY_PAUSE = 19;
V.KEY_CAPS_LOCK = 20;
V.KEY_ESCAPE = 27;
V.KEY_SPACE = 32;
V.KEY_PAGE_UP = 33;
V.KEY_PAGE_DOWN = 34;
V.KEY_END = 35;
V.KEY_HOME = 36;
V.KEY_LEFT = 37;
V.KEY_UP = 38;
V.KEY_RIGHT = 39;
V.KEY_DOWN = 40;
V.KEY_PRINTSCREEN = 44;
V.KEY_INSERT = 45;
V.KEY_DELETE = 46;
V.KEY_0 = 48;
V.KEY_1 = 49;
V.KEY_2 = 50;
V.KEY_3 = 51;
V.KEY_4 = 52;
V.KEY_5 = 53;
V.KEY_6 = 54;
V.KEY_7 = 55;
V.KEY_8 = 56;
V.KEY_9 = 57;
V.KEY_SEMICOLON = 59;
V.KEY_EQUALS = 61;
V.KEY_A = 65;
V.KEY_B = 66;
V.KEY_C = 67;
V.KEY_D = 68;
V.KEY_E = 69;
V.KEY_F = 70;
V.KEY_G = 71;
V.KEY_H = 72;
V.KEY_I = 73;
V.KEY_J = 74;
V.KEY_K = 75;
V.KEY_L = 76;
V.KEY_M = 77;
V.KEY_N = 78;
V.KEY_O = 79;
V.KEY_P = 80;
V.KEY_Q = 81;
V.KEY_R = 82;
V.KEY_S = 83;
V.KEY_T = 84;
V.KEY_U = 85;
V.KEY_V = 86;
V.KEY_W = 87;
V.KEY_X = 88;
V.KEY_Y = 89;
V.KEY_Z = 90;
V.KEY_CONTEXT_MENU = 93;
V.KEY_NUMPAD0 = 96;
V.KEY_NUMPAD1 = 97;
V.KEY_NUMPAD2 = 98;
V.KEY_NUMPAD3 = 99;
V.KEY_NUMPAD4 = 100;
V.KEY_NUMPAD5 = 101;
V.KEY_NUMPAD6 = 102;
V.KEY_NUMPAD7 = 103;
V.KEY_NUMPAD8 = 104;
V.KEY_NUMPAD9 = 105;
V.KEY_MULTIPLY = 106;
V.KEY_ADD = 107;
V.KEY_SEPARATOR = 108;
V.KEY_SUBTRACT = 109;
V.KEY_DECIMAL = 110;
V.KEY_DIVIDE = 111;
V.KEY_F1 = 112;
V.KEY_F2 = 113;
V.KEY_F3 = 114;
V.KEY_F4 = 115;
V.KEY_F5 = 116;
V.KEY_F6 = 117;
V.KEY_F7 = 118;
V.KEY_F8 = 119;
V.KEY_F9 = 120;
V.KEY_F10 = 121;
V.KEY_F11 = 122;
V.KEY_F12 = 123;
V.KEY_F13 = 124;
V.KEY_F14 = 125;
V.KEY_F15 = 126;
V.KEY_F16 = 127;
V.KEY_F17 = 128;
V.KEY_F18 = 129;
V.KEY_F19 = 130;
V.KEY_F20 = 131;
V.KEY_F21 = 132;
V.KEY_F22 = 133;
V.KEY_F23 = 134;
V.KEY_F24 = 135;
V.KEY_NUM_LOCK = 144;
V.KEY_SCROLL_LOCK = 145;
V.KEY_COMMA = 188;
V.KEY_PERIOD = 190;
V.KEY_SLASH = 191;
V.KEY_BACK_QUOTE = 192;
V.KEY_OPEN_BRACKET = 219;
V.KEY_BACK_SLASH = 220;
V.KEY_CLOSE_BRACKET = 221;
V.KEY_QUOTE = 222;
V.KEY_META = 224;



/** @constructor */
V.Queue = function() 
{
    this.first = null;
    this.last = null;
    this.size = 0;
};

V.Queue.prototype.enqueue = function(node) 
{
    if (!this.first)
    { 
        this.first = node;
        this.last = node;
    } 
    else 
    { 
        this.last.next =node;
        this.last = node;
    }
    this.size++;
};


V.Queue.prototype.dequeue = function() 
{
    var node = this.first;
    this.first = this.first.next; 
    if (this.first == null) 
    {
        this.last=null;
    }
    node.next = null;
    this.size--;
    return node;
};

V.Queue.prototype.empty = function() 
{
    return this.first == null; 
}

V.Queue.prototype.clear = function() 
{
    this.first = null; 
    this.last = null; 
    this.size = 0;
}

V.Queue.prototype.front = function() 
{
    return this.first; 
}




/** @constructor */
V.PriorityQueue = function (compare) 
{
    this.data = [];
    this.length =0;
    this.compare = compare;
}

V.PriorityQueue.prototype.enqueue = function (item) {
    this.data.push(item);
    this.length++;
    this._up(this.length - 1);
};

V.PriorityQueue.prototype.dequeue = function () 
{
    var top = this.data[0];
    this.length--;

    if (this.length > 0) 
    {
        this.data[0] = this.data[this.length];
        this._down(0);
    }
    this.data.pop();

    return top;
};
    
V.PriorityQueue.prototype.empty = function () 
{
    return this.length == 0;
};

V.PriorityQueue.prototype.clear = function () 
{
    this.data = [];
    this.length =0;
}

V.PriorityQueue.prototype._up = function (pos) 
{
    var data = this.data;
    var compare = this.compare;
    var item = data[pos];

    while (pos > 0) {
        var parent = (pos - 1) >> 1;
        var current = data[parent];
        if (compare(item, current) >= 0) break;
        data[pos] = current;
        pos = parent;
    }

    data[pos] = item;
};

V.PriorityQueue.prototype._down = function (pos) 
{
    var data = this.data;
    var compare = this.compare;
    var halfLength = this.length >> 1;
    var item = data[pos];

    while (pos < halfLength) {
        var left = (pos << 1) + 1;
        var right = left + 1;
        var best = data[left];

        if (right < this.length && compare(data[right], best) < 0) {
            left = right;
            best = data[right];
        }
        if (compare(best, item) >= 0) break;

        data[pos] = best;
        pos = left;
    }

    data[pos] = item;
};





