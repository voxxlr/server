O.Line = class extends O.Object
{
    constructor(entry)
    {
        super(entry.id, entry.activation);
        this.type = "line";
        this.visible = entry.visible;
        this.constraint = C.create(entry.constraint);
        this.mode = entry.mode;
    
        if (entry.code)
        {
            this.lineStyle = new O.Style.Line.Custom(entry.code, entry.scope);
        }
        else
        {
            this.lineStyle = new O.Style.Line(null, "red", O.Style.FRONT);
        }
        
        this.arcStyle = new O.Style.Arc([3,3], "blue", this.mode[O.ANGLE]);
        
        for (var i=0; i<entry.points.length; i++)
        {
            this.addAnchor(new O.Anchor(entry.points[i]));
        }
        this.projectAnchors();
        
        this.addComponent(new O.Segment(this.anchors[0], this.anchors[1], this.mode[O.DISTANCE], this.lineStyle));
        for (var i=0; i<entry.points.length-2; i++)
        {
            let arc = this.addComponent(new O.Arc(this.anchors[i], 
                                                  this.anchors[i+1],
                                                  this.anchors[i+2], 
                                                  this.mode[O.ANGLE], 
                                                  this.arcStyle));
            arc.visible = this.mode[O.ANGLE];
                                        
            this.addComponent(new O.Segment(this.anchors[i+1], 
                                            this.anchors[i+2], 
                                            this.mode[O.DISTANCE], 
                                            this.lineStyle));
        }
    }

    length()
    {
        let length = 0;
        for (var i=0; i<this.anchors.length-1; i++)
        {
            let dx = this.anchors[i+1].wx - this.anchors[i].wx;
            let dy = this.anchors[i+1].wy - this.anchors[i].wy;
            let dz = this.anchors[i+1].wz - this.anchors[i].wz;
            length += Math.sqrt(dx*dx+dy*dy+dz*dz);
        }
        return length;
    }

    select()
    {
        super.select();
        for (var i=0; i<this.anchors.length; i++)
        {
            this.addControl(new O.ControlPoint(this.anchors[i], this.constraint));
        }
    }

    update(entry)
    {
        super.update(entry);
        
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
        }
        
        if (entry.scope)
        {
            this.lineStyle.update(entry.scope);
        }
    }

    onDblClick(event)
    {
        //this.startControl();

        if (event.component instanceof O.ControlPoint)
        {
            for (var i=1; i<this.controls.length-1; i++)
            {
                if (this.controls[i] === event.component)
                {
                    // remove link (line - arc)
                    this.components.splice((i-1)*2,2);
                    
                    let preAnchor = this.anchors[i-1];
                    
                    // remove control point and anchor
                    this.removeControl(this.controls[i]);
                    this.removeAnchor(this.anchors[i]);
                    
                    // relink next line to previous anchor
                    let nextLink = 2*(i-1);
                    let nextLine = this.components[nextLink];
                    nextLine.anchor0 = preAnchor;
                    nextLine.anchor0.addListener(nextLine);
                    nextLine.update3D();
                    
                    // relink next arc
                    if (i<this.controls.length-1)
                    {
                        let arc = this.components[nextLink+1];
                        arc.anchor0 = preAnchor;
                        arc.anchor0.addListener(arc);
                        arc.update3D();
                    }
                    
                    // relink previous arc
                    if (i>1)
                    {
                        let arc = this.components[(i-1)*2-1];
                        arc.anchor2 = nextLine.anchor1;
                        arc.anchor2.addListener(arc);
                        arc.update3D();
                    }
                    break;
                }
            }
        }
        else if (event.component instanceof O.Segment)
        {
            for (var i=0; i<this.components.length; i++)
            {
                if (this.components[i] == event.component)
                {
                    var point = this.constraint.getPoint(event);
                    if (point != null)
                    {
                        var anchor0 = event.component.anchor0;
                        var anchor1 = this.insertAnchor(i/2+1, new O.Anchor(point));
                        var anchor2 = event.component.anchor1;
                        
                        // reanchor next arc
                        if (i<2*(this.controls.length-2))
                        {
                            var nextArc = this.components[i+1];
                            nextArc.anchor0.removeListener(nextArc);
                            nextArc.anchor0 = anchor1;
                            nextArc.anchor0.addListener(nextArc);
                            nextArc.update3D();
                        }
                        
                        if (i>1)
                        {
                            // reanchor previous arc
                            var prevArc = this.components[(i - 1 + 2*this.controls.length)%(2*this.controls.length)];
                            prevArc.anchor2.removeListener(prevArc);
                            prevArc.anchor2 = anchor1;
                            prevArc.anchor2.addListener(prevArc);
                            prevArc.update3D();
                        }
                        
                        // reanchor clicked line
                        var currentLine = this.components[i];
                        currentLine.anchor0.removeListener(currentLine);
                        currentLine.anchor0 = anchor1;
                        currentLine.anchor0.addListener(currentLine);
                        currentLine.update3D();

                        // inser new link
                        let insertBefore = i;
                        let arc =this.insertComponent(insertBefore, new O.Arc(anchor0, anchor1, anchor2, this.mode[O.ANGLE], this.arcStyle));
                        arc.visible = this.mode[O.ANGLE];
                        this.insertComponent(insertBefore, new O.Segment(anchor0, anchor1, this.mode[O.DISTANCE], this.lineStyle));
                        this.insertControl(i/2+1, new O.ControlPoint(anchor1, this.constraint));
                    }
                    break;
                }
            }
        }
        event.stopImmediatePropagation();
        
        this.endControl();
    }
    
    endControl()
    {
        super.endControl();
        
        V.postMessage("line.update", this.toJson());		
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
            var points = [];
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
}

O.Line.validate = (args) =>
{
    if (!args.points || args.points.length < 2)
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
        args.mode = {  };
    }
    
    return true;
}


O.Line.Builder = class
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
        if (points.length == 2)
        {
            points[this.points.length-1].detach();
        }
    }
    
    isDone(points)
    {
        return points.length == 2;
    }

    complete(points)
    {
        this.config.type = "line";
        this.config.points = points;
        this.config.constraint = this.constraint.toJson();
        V.postMessage("line.record", this.config, this.custom);	
    }
}




V.recvMessage("line.record", (args, custom) => 
{ 
    let builder = O.Builder.get();
    
    builder.start(new O.Line.Builder(args, custom));
});

V.recvMessage("line.update", (args, custom) => 
{ 
    var line = O.instance.getObject(args.id);
    if (line)
    {
        line.update(args);
        V.postMessage("line.update", line.toJson(), custom);
        V.touch2d();
        V.touch3d();
    }
});

V.recvMessage("line.select", (args, custom) => 
{ 
    var line = O.instance.getObject(args.id);
    if (line)
    {
        line.select();
        V.postMessage("line.select", line.toJson(), custom);
        V.touch2d();
    }
});

V.recvMessage("line.unselect", (args, custom) => 
{ 
    var line = O.instance.getObject(args.id);
    if (line)
    {
        line.unselect();
        V.postMessage("line.unselect", line.toJson(), custom);
        V.touch2d();
    }
});

V.recvMessage("line.get", (args, custom) => 
{ 
    if (args && args.id)
    {
        var line = O.instance.getObject(args.id);
        if (line)
        {
            V.postMessage("line.get", line.toJson(args.filter), custom);
        }
    }
    else
    {
        V.postMessage("line.get", O.getAll("line"), custom); // TODO use filter here as well
    }
});

