O.ControlUV = class extends O.Object
{
    constructor(container)
    {
        super(container.id+"uv");
        
        this.container = container;
        this.geometry = container.geometry;
        
        this.anchor = this.addAnchor(new O.Anchor());
        this.anchor0 = this.addAnchor(new O.Anchor());
        this.anchor1 = this.addAnchor(new O.Anchor());
        this.anchor2 = this.addAnchor(new O.Anchor());
        this.anchor3 = this.addAnchor(new O.Anchor());
        
        this.style = new O.Style.Line([3,3], C.Plane.PASSIVE, O.Style.NONE);
        
        this.line = this.addComponent(new O.Segment(this.anchor0, this.anchor1, null, this.style));
        this.line = this.addComponent(new O.Segment(this.anchor2, this.anchor3, null, this.style));
    }

    attach()
    {
        super.attach();
        this.update();
        this.controlPoint = this.addControl(new O.ControlPoint(this.anchor, new C.Plane (this.geometry.plane)));
    }

    startControl(control)
    {
        this.style.fillStyle = C.Plane.ACTIVE;
        this.style.lineWidth = 3;
        this.container.startControl();
    }

    endControl(control)
    {
        this.style.fillStyle = C.Plane.PASSIVE;
        this.style.lineWidth = 1;
        this.container.endControl();
    }

    moveControl(control)
    {
        let dx = this.anchor.wx - this.center.x;
        let dy = this.anchor.wy - this.center.y;
        let dz = this.anchor.wz - this.center.z;
        
        this.container.translate(dx, dy, dz);
        this.anchor0.translate3D(dx, dy, dz);
        this.anchor1.translate3D(dx, dy, dz);
        this.anchor2.translate3D(dx, dy, dz);
        this.anchor3.translate3D(dx, dy, dz);
        
        this.center.x = this.anchor.wx;
        this.center.y = this.anchor.wy;
        this.center.z = this.anchor.wz;
        this.container.moveControl();
    }

    update()
    {
        this.center = this.geometry.center;
        this.anchor.set3D(this.center);
        
        let range = 0.25*this.geometry.radius;
        let u = this.geometry.u;
        let v = this.geometry.v;
        this.anchor0.set3D({x:this.center.x+range*u.x,y:this.center.y+range*u.y,z:this.center.z+range*u.z});
        this.anchor1.set3D({x:this.center.x-range*u.x,y:this.center.y-range*u.y,z:this.center.z-range*u.z});
        this.anchor2.set3D({x:this.center.x+range*v.x,y:this.center.y+range*v.y,z:this.center.z+range*v.z});
        this.anchor3.set3D({x:this.center.x-range*v.x,y:this.center.y-range*v.y,z:this.center.z-range*v.z});
    }
}



O.Polygon = class extends O.Composite
{
    constructor(entry)
    {
        super(entry.id, entry.activation);
        this.type = "polygon";
        this.mode = entry.mode;
        this.visible = entry.visible;

        // create line segments
        this.lineStyle = new O.Style.Line(null, "red", O.Segment.NONE);
        this.arcStyle = new O.Style.Arc([3,3], "blue", this.mode[O.ANGLE] != null);
        for (var i=0; i<entry.points.length; i++)
        {
            this.addAnchor(new O.Anchor(entry.points[i]));
        }
        this.projectAnchors();
            
        for (var i=0; i<entry.points.length; i++)
        {
            this.addComponent(new O.Segment(this.anchors[i], 
                                            this.anchors[(i+1)%this.anchors.length], 
                                            this.mode[O.DISTANCE], 
                                            this.lineStyle));
                                            
            let arc = this.addComponent(new O.Arc(this.anchors[i], 
                                                  this.anchors[(i+1)%this.anchors.length], 
                                                  this.anchors[(i+2)%this.anchors.length], 
                                                  this.mode[O.ANGLE], this.arcStyle));
            arc.visible = this.mode[O.ANGLE];
        }
        
        
        // create geomerty and constraints
        if (entry.constraint[0] == "Polygon")
        {
            this.geometry = new G.Polygon(entry.constraint[1]);
            this.constraint = new C.Polygon(this.geometry);
        }
        else 
        {
            this.geometry = new G.Polygon(G.getPlane(this.anchors[0], this.anchors[1], this.anchors[2]));
            this.constraint = new C.create(entry.constraint);
        }
        this.geometry.update(this.anchors);
        
        //if (this.mode[O.AREA])
        //{
        //    this.area.setText(V.to2DUnitString(this.geometry.getArea()));
        //}
        
        this.processScanFn = this.processScan.bind(this);
    }
    
    update(entry)
    {
        super.update(entry);
        
        if (this.selected && this.constraint instanceof C.Polygon)
        {
            this.removeControls();
        }
        
        if (entry.hasOwnProperty("mode")) 
        {
            this.mode = entry.mode;
            
            this.components.forEach(entry =>
            {
                if (entry instanceof O.Segment)
                {
                    entry.updateLabel(this.mode[O.DISTANCE]);
                }
                else if (entry instanceof O.Arc)
                {
                    entry.visible = this.mode[O.ANGLE]
                    entry.updateLabel(this.mode[O.ANGLE]);
                }
            });
            
            //if (this.mode[O.AREA])
            //{
            //   this.area.setText(V.to2DUnitString(this.geometry.getArea()));
            //}
        }
        
        if (this.selected && this.constraint instanceof C.Polygon)
        {
            this.addControls();
        }
    }
        
    onDblClick(event)
    {	
        this.startControl();

        if (event.component instanceof O.ControlPoint)
        {
            if (this.controls.length > 3)
            {
                for (var i=0; i<this.controls.length; i++)
                {
                    if (this.controls[i] === event.component)
                    {
                        if (this.geometry.canRemovePoint(event.component.anchor.id))
                        {
                            this.components.splice(i*2,2);
                            
                            // remove control point and anchor
                            this.removeControl(this.controls[i]);
                            this.removeAnchor(this.anchors[i]);
                            
                            let prevIndex = 2*((i-1+this.controls.length)%this.controls.length);
                            let prevLine = this.components[prevIndex];
                            let prevArc0 = this.components[prevIndex+1];
                            
                            prevIndex = 2*((i-2+this.controls.length)%this.controls.length);
                            let prevArc1 = this.components[prevIndex+1];
                            
                            let nextIndex = 2*(i%this.controls.length);
                            let nextLine = this.components[nextIndex];
                            
                            prevArc0.anchor1 = prevArc0.anchor2;
                            prevArc0.anchor2 = nextLine.anchor1;
                            prevArc0.anchor2.addListener(prevArc0);
                            prevArc0.update3D();
                            
                            prevArc1.anchor2 = prevArc0.anchor1;
                            prevArc1.anchor2.addListener(prevArc1);
                            prevArc1.update3D();
                            prevLine.anchor1 = nextLine.anchor0;
                            prevLine.anchor1.addListener(prevLine);
                            prevLine.update3D();
                        }
                        else
                        {
                            O.cursor("not-allowed")
                            setTimeout(function()
                            {
                                O.cursor("default");
                            }, 1000);
                        }
                        break;
                    }
                }
            }
        }
        else if (event.component instanceof O.Segment)
        {
            // more than 3 points ... change to planar constraint
            if (this.controls.length == 3)
            {
                if (!(this.constraint instanceof C.Polygon))
                {
                    this.geometry.plane = G.getPlane(this.anchors[0], this.anchors[1], this.anchors[2]);
                    this.constraint = new C.Polygon(this.geometry);
                    for (var i=0; i<this.controls.length; i++)
                    {
                        this.controls[i].constraint = this.constraint;
                    }
                    
                    this.addControls();
                }
            }
            
            for (var i=0; i<this.components.length; i++)
            {
                if (this.components[i] == event.component)
                {
                    let anchor0 = event.component.anchor0;
                    let anchor1 = this.insertAnchor(i/2+1, new O.Anchor(this.constraint.getPoint(event)));
                    let anchor2 = event.component.anchor1;
                    
                    // reanchor next arc
                    let nextArc = this.components[i+1];
                    nextArc.anchor0.removeListener(nextArc);
                    nextArc.anchor0 = anchor1;
                    nextArc.anchor0.addListener(nextArc);
                    nextArc.update3D();
                    
                    // reanchor previous arc
                    let prevArc = this.components[(i - 1 + 2*this.controls.length)%(2*this.controls.length)];
                    prevArc.anchor2.removeListener(prevArc);
                    prevArc.anchor2 = anchor1;
                    prevArc.anchor2.addListener(prevArc);
                    prevArc.update3D();
                    
                    // reanchor clicked line
                    let currentLine = this.components[i];
                    currentLine.anchor0.removeListener(this.components[i]);
                    currentLine.anchor0 = anchor1;
                    currentLine.anchor0.addListener(this.components[i]);
                    currentLine.update3D();
                    
                    // inser new link
                    let insertBefore = i;
                    let arc = this.insertComponent(insertBefore, new O.Arc(anchor0, 
                                                                           anchor1, 
                                                                           anchor2, 
                                                                           this.mode[O.ANGLE], 
                                                                           this.arcStyle));
                    arc.visible = this.mode[O.ANGLE];
                                                                
                    this.insertComponent(insertBefore, new O.Segment(anchor0, 
                                                                     anchor1, 
                                                                     this.mode[O.DISTANCE], 
                                                                     this.lineStyle));
                                                                
                    this.insertControl(i/2+1, new O.ControlPoint(anchor1, this.constraint));
                    break;
                }
            }
        }

        event.stopImmediatePropagation();
            
        this.endControl();
    }
    
    toJson(filter)
    {
        let content = {};
        
        if (filter == undefined || filter.includes("type"))
        {
            content.type = this.type;			
        }
        if (filter == undefined || filter.includes("points"))
        {
            let points = [];
            for (var i=0; i<this.anchors.length; i++)
            {
                points.push(this.anchors[i].toJson());
            }
            content.points = points;			
        }
        if (filter == undefined || filter.includes("constraint"))
        {
            content.constraint = this.constraint.toJson();			
        }
        if (filter == undefined || filter.includes("mode"))
        {
            content.mode = this.mode;			
        }
        
        return Object.assign(super.toJson(filter), content);
    }

    translate(dx, dy, dz)
    {
        for (var i=0; i<this.anchors.length; i++)
        {
            this.anchors[i].translate3D(dx, dy, dz);
        }
        this.geometry.translate(dx, dy, dz);
    }

    moveControl()
    {
        if (this.anchors.length == 3)
        {
            this.geometry.plane = G.getPlane(this.anchors[0], this.anchors[1], this.anchors[2]);
        }

        this.geometry.update(this.anchors);
        
        //if (this.mode[O.AREA])
        //{
        //    this.area.setText(V.to2DUnitString(this.geometry.getArea()));
        //}
        
        V.touch3d();
    }

    endControl(update)
    {
        super.endControl();
        
        if (this.anchors.length == 3)
        {
            this.geometry.plane = G.getPlane(this.anchors[0], this.anchors[1], this.anchors[2]);
        }
        this.geometry.update(this.anchors);
        
        //if (this.mode[O.AREA])
        //{
            //this.area.setText(V.to2DUnitString(this.geometry.getArea()));
        //}
        
        V.touch3d();
        
        V.postMessage("polygon.update", this.toJson(), { uv:  this.geometry.points });		
    }

    select()
    {
        super.select();
        for (var i=0; i<this.anchors.length; i++)
        {
            this.addControl(new O.ControlPoint(this.anchors[i], this.constraint));
        }
        
        if (this.constraint instanceof C.Polygon)
        {
            this.addControls();
        }
    }

    unselect()
    {
        super.unselect();
        
        if (this.constraint instanceof C.Polygon)
        {
            this.removeControls();
        }
    }

    processScan()
    {
        if (!V.camera.moving)
        {
            this.geometry.scanLine(this);
        }
        
        if (!this.geometry.endScan())
        {
            this.timer = setTimeout(this.processScanFn, 0);
        }
        else
        {
            V.postMessage("polygon.scan.end", this.toJson());
            this.timer = null;
        }
    }

    startScan(resolution, direction)
    {
        if (this.timer)
        {
            this.stopScan();
        }

        this.timer = setTimeout(this.processScanFn, 0);
        return this.geometry.startScan(resolution, direction);
    }

    stopScan()
    {
        if (this.timer)
        {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }
    
    render2D(context)
    {
        super.render2D(context);
        
        //if (this.mode[O.AREA])
        //{
            //context.setTransform(1,0,0,1,this.anchors[0].sx, this.anchors[0].sy);
            //this.area.render2D(context);
        //}
    }
    
}



O.Polygon.validate = (args) =>
{
    if (!args.points || args.points.length < 3)
    {
        V.postMessage("error", "No enough points to complete line");
        return false;
    }
    
    if (O.find(args.id))
    {
        V.postMessage("error", `Duplicate line ID : ${args.id}`);
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
    if (!args.hasOwnProperty("mode"))
    {
        args.mode = { };
    }
    
    return true;
}


O.Polygon.Builder = class
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
        if (points.length > 3)
        {
            points[this.points.length-1].detach();
        }
    }

    isDone(points)
    {
        return points.length == 3;
    }
    
    complete(points)
    {
        this.config.type = "polygon";
        this.config.points = points;
        this.config.constraint = this.constraint.toJson();
        V.postMessage("polygon.record", this.config, this.custom);
    }
    
}




V.recvMessage("polygon.record", (args, custom) => 
{ 
    let builder = O.Builder.get();
    builder.start(new O.Polygon.Builder(args, custom));
});

V.recvMessage("polygon.select", function(args, custom) 
{ 
    let object = O.instance.getObject(args.id);
    if (object)
    {
        object.select();
        V.postMessage("polygon.select",  object.toJson(), custom);
        V.touch2d();
    }
});

V.recvMessage("polygon.unselect", function(args, custom) 
{ 
    let object = O.instance.getObject(args.id);
    if (object)
    {
        object.unselect();
        V.postMessage("polygon.unselect", object.toJson(), custom);
        V.touch2d();
    }
});


V.recvMessage("polygon.update", (args, custom) => 
{ 
    let object = O.instance.getObject(args.id);
    if (object)
    {
        object.update(args);
        
        custom.uv = object.geometry.points;
        V.postMessage("polygon.update", object.toJson(), custom);
        V.touch2d();
        V.touch3d();
    }
});

V.recvMessage("polygon.get", (args, custom) =>
{ 
    if (args && args.id)
    {
        let line = O.instance.getObject(args.id);
        if (line)
        {
            V.postMessage("polygon.get", line.toJson(args.filter), custom);
        }
    }
    else
    {
        V.postMessage("polygon.get", O.getAll("polygon"), custom); // TODO use filter here as well
    }
});








