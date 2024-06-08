O =
{
    instance : null,
    camera : null,
    DISTANCE : "distance",
    ANGLE : "angle",
    VOLUME : "volume",
    AREA : "area",
    
    canvas: document.getElementById("canvas2D"),
    units : 0,
    numberFormat : new Intl.NumberFormat(),
    s1 : 1,
    s2 : 1,
    s3 : 1,
    setScalar : function(s1, s2, s3)
    {
        O.s1 = s1;
        O.s2 = s2;
        O.s3 = s3;
    }
};

O.cursor = (cursor) =>
{
    O.canvas.style.cursor = cursor;
}

O.add = (object) => 
{
    O.instance.addObject(object);
}

O.find = (id) => 
{
    return O.instance.registry[id];
}

O.remove = (object) => 
{
    if (object instanceof O.Object)
    {
        O.instance.removeObject(object.id);
    }
    else
    {
        O.instance.removePanel(object);
    }
}
        
O.getSelected = () => 
{
    return O.instance.getSelected();
}

O.getAll = (type) =>
{
    let list = {};
    
    O.instance.objects.forEach(object =>
    {
        if (object.type === type)
        {
            list[object.id] = object.toJson();
        }
    });
    
    return list;
}






O.Component = function(style)
{
    this.style = style;
    this.visible = true;
    this.zIndex = 100;
    this.normal3D = { x:0, y:0, z: 0};
}

O.Component.prototype.setVisibile = function(visible)
{
    this.visible = visible;
}





O.Object = class
{
    constructor(id, activation, exclude)
    {
        this.id = (id == null) ? new Date().getTime() : id;

        this.exclude = exclude; // exclude from viewpoint recoding/setting
        
        this.components = [];
        this.controls = [];
        this.anchors = [];
        
        this.activation = activation;
        if (this.activation)
        {
            this.activation.easing = this.activation.easing || "Linear"; 
        };
        
        this.aabb = { min: { x:0, y:0, z:0 }, max: { x:0, y:0, z:0 }, center: { x:0, y:0, z:0 } };
        
        this.selected = false;
        this.attached = false;
        this.scale = 1.0;
        this.visible = true;
    }
    
    
    CLICK(event) 
    { 
        return event 
    }
    
    DBLCLICK(event) 
    { 
        return event 
    }
    
    detach()
    {
        for (var i=0; i<this.controls.length; i++)
        {
            this.controls[i].detach();
        }

        this.attached = false;
    }

    attach()
    {
        for (var i=0; i<this.controls.length; i++)
        {
            this.controls[i].attach();
        }
        
        this.attached = true;
    }

    onUpdate(event)
    {
        if (this.activation)
        {
            if (this.visible)
            {
                //if (!this.selected)
                {
                    this.scale = Easing[this.activation.easing](V.viewer.getDistanceAlpha(this.aabb.center, this.activation.p0, this.activation.p1));
                }
                //else
                {
                //	this.scale = 1;			
                }
            }
        }			
    }

    isVisible()
    {
        return this.visible && V.camera.intersectsBox(this.aabb);
    }

    addAnchor(anchor)
    {
        this.anchors.push(anchor);
        return anchor;
    }

    insertAnchor(before, anchor)
    {
        this.anchors.splice(before, 0, anchor);
        return anchor;
    }

    removeAnchor(anchor)
    {
        this.anchors.splice(this.anchors.indexOf(anchor),1);
    }	

    addControl(control)
    {
        this.controls.push(control);
        control.attach();
        control.addListener(this);
        return control;
    }

    insertControl(before, control)
    {
        this.controls.splice(before, 0, control);
        control.attach();
        control.addListener(this);
        return control;
    }

    removeControl(control)
    {
        let [ object ] = this.controls.splice(this.controls.indexOf(control),1);
        object.detach();
    }	

    addComponent(component)
    {
        this.components.push(component);
        return component;
    }

    insertComponent(before, component)
    {
        this.components.splice(before, 0, component);
        return component;
    }

    removeComponent(component)
    {
        this.components.splice(this.components.indexOf(component),1);
    }

    endControl()
    {
        V.touch2d();
    }


    projectAnchors()
    {
        for (var i=0; i<this.anchors.length; i++)
        {
            this.anchors[i].project();
        }
        
        // aabb
        var min = this.aabb.min;
        var max = this.aabb.max;
        var center = this.aabb.center;
        
        min.x = Number.POSITIVE_INFINITY;
        min.y = Number.POSITIVE_INFINITY;
        min.z = Number.POSITIVE_INFINITY;
        max.x = Number.NEGATIVE_INFINITY;
        max.y = Number.NEGATIVE_INFINITY;
        max.z = Number.NEGATIVE_INFINITY;
        for (var i=0; i<this.anchors.length; i++)
        {
            var anchor = this.anchors[i];
            min.x = Math.min(anchor.wx, min.x);
            min.y = Math.min(anchor.wy, min.y);
            min.z = Math.min(anchor.wz, min.z);
            max.x = Math.max(anchor.wx, max.x);
            max.y = Math.max(anchor.wy, max.y);
            max.z = Math.max(anchor.wz, max.z);
        }
        
        // center
        center.x = (max.x + min.x)/2;
        center.y = (max.y + min.y)/2;
        center.z = (max.z + min.z)/2;
    }

    updateUnits()
    {
        for (var i=0; i<this.components.length; i++)
        {
            if (this.components[i].updateUnits)
            {
                this.components[i].updateUnits(); 
            }
        }
    }


    // Selection
    intersectRay3D(event)
    {
        var distance = Number.POSITIVE_INFINITY;
        
        this.components.forEach(component => 
        {
            if (component.intersectRay3D)
            {
                distance = Math.min(distance, component.intersectRay3D(event, this));
            }
        });
        
        return distance;
    }

    containsPoint2D(event)
    {
        if (this.selected)
        {
            for (var i=0; i<this.controls.length; i++)
            {
                if (this.controls[i].containsPoint2D(event))
                {
                    event.component = this.controls[i];
                    return true;
                }
            }
        }
        
        for (var i=0; i<this.components.length; i++)
        {
            if (this.components[i].containsPoint2D)
            {
                if (this.components[i].containsPoint2D(event))
                {
                    event.component = this.components[i];
                    return true;
                }
            }
        }
        return false;
    }

    select()
    {
        this.projectAnchors();
        
        if (this.selected)
        {
            console.log("object already selected");
            return;
        }
        this.selected = true;
        
        if (this.onDblClick)
        {
            O.instance.addEventListener("onDblClick", this);
        }
    }

    unselect()
    {
        this.selected = false;

        for (var i=0; i<this.controls.length; i++)
        {
            this.controls[i].detach();
        }
        this.controls = [];

        if (this.onDblClick)
        {
            O.instance.removeEventListener("onDblClick", this);
        }
    }

    update(entry)
    {
        if (entry.hasOwnProperty("activation"))
        {
            this.activation = entry.activation;
            V.touch2d()
        }
        
        if (entry.hasOwnProperty("visible")) 
        {
            this.visible = entry.visible;
            if (this.visible)
            {
                this.projectAnchors();		
            }
        }
    }

    render2D(context)
    {
        if (this.scale > 0)
        {
            for (var i=0; i<this.components.length; i++)
            {
                var component = this.components[i];
                if (component.visible)
                {
                    if (component.render2D)
                    {
                        this.components[i].render2D(context);
                    }
                }	
            }
        }
    }

    render3D(event)
    {
        for (var i=0; i<this.components.length; i++)
        {
            var component = this.components[i];
            if (component.visible)
            {
                if (this.components[i].render3D)
                {
                    this.components[i].render3D(event, this);
                }
            }	
        }
    }
    
    toJson(filter)
    {
        let content = {};
        
        if (filter == undefined || filter.includes("id"))
        {
            content.id = this.id;
        }
         
        if (filter == undefined || filter.includes("activation"))
        {
            if (this.activation)
            {
                content.activation = this.activation;
            }
        }
        
        if (filter == undefined || filter.includes("visible"))
        {
            if (this.hasOwnProperty("visible"))
            {
                content.visible = this.visible;
            }
        } 
        
        return content;
    }
    
}

O.Object.INFINITE = { easing:"Linear" };


//
//
//

O.Composite = class extends O.Object
{
    constructor(id, activation, type)
    {
        super(id, activation, type);
        
        this.objects = []; // composite pattern
    }
    
    detach()
    {
        super.detach();
        
        for (var i=0; i<this.objects.length; i++)
        {
            this.objects[i].detach();
        }
    }	

    attach()
    {
        super.attach();
        
        for (var i=0; i<this.objects.length; i++)
        {
            this.objects[i].attach();
        }
    }	
    
    onUpdate(event)
    {
        super.onUpdate(event);
        
        if (this.activation)
        {
            if (V.camera.moving)
            {
                for (var i=0; i<this.objects.length; i++)
                {
                    this.objects[i].scale = this.scale;
                }
            }
        }
        
        for (var i=0; i<this.objects.length; i++)
        {
            this.objects[i].onUpdate(event);
        }
    }
    
    addObject(object)
    {
        if (!object.attached)
        {
            object.attach();
        }
        this.objects.push(object);
        return object;
    }

    insertObject(before, object)
    {
        if (object.attached)
        {
            object.detach();
        }
        this.objects.splice(before, 0, object);
        return object;
    }

    removeObject(object)
    {
        if (object.attached)
        {
            object.detach();
        }
        this.objects.splice(this.objects.indexOf(object),1);
    }
    

    projectAnchors()
    {
        super.projectAnchors();
        
        for (var i=0; i<this.objects.length; i++)
        {
            this.objects[i].projectAnchors();
        }
    }
    
    select()
    {
        super.select();
        
        for (var i=0; i<this.objects.length; i++)
        {
            this.objects[i].select();
        }
    }
    
    unselect()
    {
        super.unselect();
        
        for (var i=0; i<this.objects.length; i++)
        {
            this.objects[i].unselect();
        }
    }

    // render
    render2D(context)
    {
        super.render2D(context);
        
        for (var i=0; i<this.objects.length; i++)
        {
            if (this.objects[i].visible)
            {
                this.objects[i].render2D(context);
            }
        }
    }

    render3D(event)
    {
        for (var i=0; i<this.objects.length; i++)
        {
            if (this.objects[i].visible)
            {
                this.objects[i].render3D(event, this);
            }
        }
        
        super.render3D(event);
    }
}




O.Overlay = class extends V.EventHandler
{
    constructor()
    {
        super(V.EventHandler.PRIO0, V.EventHandler.PRIO3);
    
        O.canvas.width = O.canvas.clientWidth;
        O.canvas.height = O.canvas.clientHeight;
        this.context = O.canvas.getContext("2d");
    
        O.instance = this;
        
        this.objects  = [];
        this.visibleObjects = []
        this.registry = {};
        this.points  = [];
        
        this.handlers = {
                "onMouseDown" : [],
                "onMouseMove" : [],
                "onMouseUp" : [],
                "onMouseOut" : [],
                "onClick" : [],
                "onDblClick" : []
        };
        
        O.ControlPoint.PATH = new Path2D();
        O.ControlPoint.PATH.arc(0,0,O.ControlPoint.R ,0,2*Math.PI);
        
        
        this.anchors = {};
        
        V.recvMessage("anchor.create", (args) => 
        {
            if (!this.anchors[args.id])
            {
                let anchor = new O.AnchorX(args, args.id);
                this.anchors[args.id] = anchor;
                V.postMessage("anchor.create", Object.assign(anchor.toJson(), { id: anchor.id }));		
            }
            else
            {
                V.postMessage("error", "anchor already exists " + args.id);		
            }
        });
        
        V.recvMessage("anchor.update", (args) => 
        { 
            if (this.anchors[args.id])
            {
                if (args.hasOwnProperty("point"))
                {
                    this.anchors[args.id].set3D(args);
                    V.postMessage("anchor.update", Object.assign(anchor.toJson(), { id: anchor.id }));		
                }
            }
            else
            {
                V.postMessage("error", "anchor does not exist " + args.id);		
            }
        });
        
        V.recvMessage("anchor.delete", (args) => 
        { 
            if (this.anchors[args.id])
            {
                delete this.anchors[args.id];
                V.postMessage("anchor.delete", args);		
            }
            else
            {
                V.postMessage("error", "anchor does not exist " + args.id);		
            }
        });
        
        V.recvMessage("viewpoint.get", (args) => 
        {
            let hidden = {};
            
            this.objects.forEach((object) =>
            {
                if (!object.exclude)
                {
                    if (!object.visible)
                    {
                        hidden[object.id] = true;
                    }			
                }
            });
            
            args.hidden = Object.assign(args.hidden || {}, hidden);
        });

        V.recvMessage("viewpoint", (args) => 
        {
            let hidden = args.hidden; // support old format for a while
            
            this.objects.forEach(object =>
            {
                if (!object.exclude)
                {
                    if (object.visible != !hidden[object.id])
                    {
                        object.visible = !hidden[object.id];
                        V.postMessage(`${object.type}.update`, { id: object.id, visible: object.visible });		
                    }
                }
            });
            
            V.touch2d();
        });
        
        V.recvMessage("viewer.unload", (args) => 
        {
            this.objects.forEach(object =>
            {
                delete this.registry[object.id];
                object.detach();
            });
            
            this.objects = [];
            this.visibleObjects = [];
        });

        V.recvMessage("*.scan.stop", (args, custom) => 
        { 
            let list = {};
            this.objects.forEach(object =>
            {
                if (typeof object.stopScan === 'function') 
                {
                    object.stopScan();
                }
            });
            V.postMessage("*.selected.get", list, custom);
            V.touch2d();
        });

        V.recvMessage("*.unselect", (args, custom) => 
        { 
            if (args && args.id)
            {
                let object = this.getObject(args.id);	
                if (object)
                {
                    object.unselect();
                    V.postMessage(`${object.type}.unselect`, { id: object.id }, custom);
                }			
            }
            else
            {
                this.objects.forEach(object =>
                {
                    if (object.selected)
                    {
                        object.unselect();
                        V.postMessage(`${object.type}.unselect`, { id: object.id }, custom);
                    }
                });
            }
            V.postMessage("*.unselect", args, custom);
            V.touch2d();
        });
        
        V.recvMessage("*.selected.get", (args, custom) => 
        { 
            let list = {};
            this.objects.forEach(object =>
            {
                if (object.selected)
                {
                    list[object.id] = object.toJson(args.filter);
                }
            });
            V.postMessage("*.selected.get", list, custom);
            V.touch2d();
        });
        
            
        V.recvMessage("*.get", (args, custom) => 
        { 
            this.objects.forEach(object =>
            {
                args[object.id] = object.toJson(args.filter);
            });
        });

        // TODO change filter to function for get and select as fill
        V.recvMessage("*.delete", (args, custom) => 
        {
            let filter = null;
            if (args.filter)
            {
                filter = Function("return " + decodeURI(entry.filter))();
            }
 
            for (var i=this.objects.length -1; i>=0; i--)
            {
                let object = this.objects[i];
                if (filter == null || filter.call(object))
                {
                    delete this.registry[object.id];
                    object.detach();
                    this.objects.splice(i, 1);
                    
                    let lIndex = this.visibleObjects.indexOf(object);
                    if (lIndex != -1)
                    {
                        this.visibleObjects.splice(lIndex,1);
                    }
                }
            };

            V.postMessage("*.delete", args, custom);
        });

        
        V.recvMessage("record.cancel", (args, custom) => 
        { 
            let builder = O.Builder.get();
            builder.end();
            V.touch2d();
        })		

        V.recvMessage("viewer.update", (args) => 
        {
            if (args.hasOwnProperty("units"))
            {
                for (var i=0; i<this.objects.length; i++)
                {
                    this.objects[i].updateUnits(); 
                }
            }
        });
    }
    
    //
    // UI events
    //
    
    addEventListener(name, object, zIndex, callback)
    {
        var listener = { object: object, zIndex : (zIndex == null ? 999 : zIndex) };
        
        if (callback)
        {
            listener.callback = callback;
        }
        else
        {
            listener.callback = object[name].bind(object);
        }
    
        var list = this.handlers[name];
        list.push(listener);
        
        // maintain z oder
        for (var i=list.length-1; i>0; i--)
        {
            if (list[i].zIndex < list[i-1].zIndex)
            {
                var temp = list[i-1];
                list[i-1] = list[i];
                list[i] = temp;
            }
        }
    }
    
    removeEventListener(name, object)
    {
        var list = this.handlers[name];
        for (var i=0; i<list.length; i++)
        {
            if (list[i].object === object)
            {
                list.splice(i,1);
                break;
            }
        }
    }
    
    onMouseDown(event)
    {
        var list = this.handlers["onMouseDown"];
        for (var i=0; i<list.length; i++)
        {
            if (list[i].object.containsPoint2D(event))
            {
                list[i].callback(event);
                break;
            }
        }
    }
    
    onMouseMove(event)
    {
        var list = this.handlers["onMouseMove"];
        for (var i=0; i<list.length; i++)
        {
            list[i].callback(event);
        }
    }
    
    onMouseUp(event)
    {
        var list = this.handlers["onMouseUp"];
        for (var i=0; i<list.length; i++)
        {
            list[i].callback(event);
        }
    }
    
    onMouseOut(event)
    {
        var list = this.handlers["onMouseOut"];
        for (var i=0; i<list.length; i++)
        {
            list[i].callback(event);
        }
    }
    
    onClick(event)
    {
        var list = this.handlers["onClick"];
        for (var i=0; i<list.length; i++)
        {
            if (list[i].object.containsPoint2D)
            {
                if (list[i].object.containsPoint2D(event))
                {
                    list[i].callback(event);
                    break;
                }
            }
            else
            {
                if (list[i].callback(event))
                {
                    break;
                }
            }
        }
    }
    
    onDblClick(event)
    {
        var list = this.handlers["onDblClick"];
        for (var i=0; i<list.length; i++)
        {
            if (list[i].object.containsPoint2D)
            {
                if (list[i].object.containsPoint2D(event))
                {
                    list[i].callback(event);
                    break;
                }
            }
            else
            {
                list[i].callback(event);
                break;
            }
        }
    }

    onUpdate(event)
    {
        this.visibleObjects = [];
        
        // find all visible objects
        this.objects.forEach(object =>
        {
            if (object.isVisible())
            {
                this.visibleObjects.push(object);
            }
        });
        
        // has to be here for Transformer to work -- don't put into render
        this.visibleObjects.forEach(object =>
        {
            object.onUpdate(event); 
        });
        
        if (V.camera.moving)
        {
            this.updateAnchors = true;
        }
    }
    
    onRender3D(event)
    {
        /*		
        this.visibleObjects = [];
        
        // find all visible objects
        this.objects.forEach(object =>
        {
            if (object.isVisible())
            {
                this.visibleObjects.push(object);
            }
        });
        */
        
        // project all visible anchors
        if (this.updateAnchors)
        {
            // project anchors of active control points
            this.points.forEach(point => point.anchor.project());
            // project anchors of visible objects
            this.visibleObjects.forEach(object => object.projectAnchors());
            // project anchors created via API
            Object.keys(this.anchors).forEach(id => this.anchors[id].project());
             
            this.updateAnchors = false;
        }

        this.visibleObjects.forEach(object =>
        {
            if (object.render3D)
            {
                if (object.visible)
                {
                    object.render3D(event);
                }
            }
        });
    }
    
    onRender2D(event)
    {
        // draw to canvas
        this.context.clearRect(0, 0, O.canvas.width, O.canvas.height);
        this.context.beginPath();
        
        if (event.background)
        {
            this.context.drawImage(event.background,0,0);	
        }
        
        // render all visible objets
        this.context.save();
        for (var i=0; i<this.visibleObjects.length; i++)
        {
            if (this.visibleObjects[i].visible)
            {
                this.visibleObjects[i].render2D(this.context);
            }
        }
        
        this.context.restore();
        
        // render active control points
        this.context.save();
        this.context.lineWidth = 3;
        for (var i=0; i<this.points.length; i++)
        {
            this.points[i].render2D(this.context);
        }
        this.context.lineWidth = 1;
        this.context.restore();
    }
    
    onResize(event)
    {
        O.canvas.width = event.width;
        O.canvas.height = event.height;
        this.updateAnchors = true;
        for (var i=0; i<this.visibleObjects.length; i++)
        {
            if (this.visibleObjects[i].onResize)
            {
                this.visibleObjects[i].onResize(event);
            }
        }
    }
        
    
    getSelected(event)
    {
        for (var i = 0; i < this.objects.length; i++)
        {
            if (this.objects[i].selected)
            {
                return this.objects[i];
            }
        }
        return null;
    }
    
    
    //
    // control points
    //
    
    createControlPoint(event, constraint)
    {
        var worldPt = constraint.getPoint(event);
        if (worldPt != null)
        {
            var controlPoint = new O.ControlPoint(new O.Anchor(worldPt), constraint);
            controlPoint.attach();
            return 	controlPoint;
        }
        return null;
    }
    
    removeControlPoint(controlPoint)
    {
        for (var i=0; i<this.points.length; i++)
        {
            if (this.points[i] == controlPoint)
            {
                this.points.splice(i,1);
                break;
            }
        }
    }
    
    addControlPoint(controlPoint)
    {
        this.points.push(controlPoint);
    }
    
    
    //
    // Objects
    //
    
    
    addObject(object)
    {
        //if (object)
        {
            object.attach();
            this.objects.push(object);
            this.registry[object.id] = object;
            this.updateAnchors = true;
            this.visibleObjects.push(object);
        }
        // can be the case of "elevation"
    }
    
    removeObject(id)
    {
        for (var i = 0; i < this.objects.length; i++)
        {
            if (this.objects[i].id == id)
            {
                var object = this.objects[i];
                delete this.registry[object.id];
                object.detach();
                this.objects.splice(i, 1);
                
                var lIndex = this.visibleObjects.indexOf(object);
                if (lIndex != -1)
                {
                    this.visibleObjects.splice(lIndex,1);
                }
                
                return object;
            }
        }
        return null;
    }
    
    raycast(ray, pageX, pageY)
    {
        var event = {
                ray : ray,
                distance : Number.POSITIVE_INFINITY,
                pageX : pageX,
                pageY : pageY,
                hits: []
        };
        
        // ray cast
        this.context.save();
        this.visibleObjects.forEach(object => 
        {
            let distance = object.intersectRay3D(event);
            
            if (object.scale > 0)
            {
                if (distance != Number.POSITIVE_INFINITY)
                {
                    event.hits.push({ distance: distance, object });
                }
            }
        });
        this.context.restore();
    
        return event;
    }
    
    getObject(id)
    {
        return this.registry[id];
    }
}
//
//
//





O.Builder = class extends V.EventHandler
{
    constructor()
    {
        super(V.EventHandler.PRIO1);
        this.points = [];
    }
    
    start(tool)
    {
        if (this.tool)
        {
            this.end();
        }
        this.tool = tool;
        O.cursor("crosshair");
        this.attach();
    }
    
    end()
    {
        this.points.forEach(point => point.detach())		
        this.points = [];
        
        this.tool = null;
        O.cursor("default");
        if (this.isAttached())
        {
            this.detach();
        }
    }

    onClick(event)
    {
        let point = this.tool.addPoint(event, this.escaped);
        if (point)
        {
            this.points.push(point);
            if (this.tool.isDone(this.points))
            {
                var json = [];
                this.points.forEach(point => json.push(point.anchor.toJson()));
                this.tool.complete(json);
                this.end();
            }
        }
        event.stopImmediatePropagation();
    };

    onKeyUp(event)
    {
        if (event.keyCode == 27) // ESC
        {
            this.escaped = true;
            if (this.tool.isDone(event.keyCode))
            {
                this.end();
            }    	
        }
        else if (event.keyCode == 8) // BACK
        {
            if (this.removePoint)
            {
                this.removePoint();
            }
        }
    }	
}

O.Builder.get = function ()
{
    if (!O.Builder.instance)
    {
        O.Builder.instance = new O.Builder();
    }
    return O.Builder.instance;
}






/*

A.Measurement.Trapezoid = function(main)
{
    A.Measurement.Tool.call(this, main);
    
    this.constraint = A.viewer.getConstraint(O.Trapezoid.NAME);
}

A.Measurement.Trapezoid.prototype = Object.create(A.Measurement.Tool.prototype);
A.Measurement.Trapezoid.prototype.constructor = A.Measurement.Trapezoid;

A.Measurement.Trapezoid.prototype.addPoint = function(event, escaped)
{
    if (this.points.length < 3)
    {
        var point = O.instance.createControlPoint(event, this.constraint);
        if (point)
        {
            this.points.push(point);
        }
    }
    return this.points.length == 3;
}

A.Measurement.Trapezoid.prototype.isDone = function(keyCode)
{
    return this.points.length == 3;
}

A.Measurement.Trapezoid.prototype.toJson = function()
{
    // anchor 1 and 2 are 1st and 2cd click... 3rd click is used to define the perpendicular axis
    var a0 = this.points[0].anchor;
    var a1 = this.points[1].anchor;
    var a2 = this.points[2].anchor;

    // get side bar range 
    var v1x = a0.wx - a1.wx; 
    var v1y = a0.wy - a1.wy; 
    var v1z = a0.wz - a1.wz;
    var range = Math.sqrt(v1x*v1x + v1y*v1y + v1z*v1z);
    
    // get plane of control points
    var plane = O.ControlPoint.getPlane(a0, a1, a2);
    
    var viewDir = V.camera.zAxis;
    if (viewDir.x*nx + viewDir.y*ny + viewDir.z*nz < 0)
    {
        //flip plane
        plane.nx = -plane.nx;
        plane.ny = -plane.ny;
        plane.nz = -plane.nz;
        plane.w = -plane.w;
    }
    
    return {  info: false, type: O.Trapezoid.NAME, radius : Number.MAX_VALUE, p0 : a0.toJson(), r0: { min: -range , max: range }, p1 : a1.toJson(),  r1: { min: -range/10 , max: range },  constraint: this.constraint.toJson() }; 
}

*/


