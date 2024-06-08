/** @constructor */
O.Elevation = function(entry, callback)
{
    O.Object.call(this, entry.id, entry.content.radius);
    this.callback = callback;
    this.type = "elevation";
    
    this.constraint = C.create(entry.content.constraint);
    
    this.anchor0 = this.addAnchor(new O.Anchor(entry.content.p0 || entry.content.points[0]));
    this.anchor1 = this.addAnchor(new O.Anchor(entry.content.p1 || entry.content.points[1]));
    this.anchorC = this.addAnchor(new O.Anchor({ x:this.anchor1.wx , y:this.anchor0.wy, z:this.anchor1.wz }));
    this.projectAnchors();
    
    this.line = this.addComponent(new O.Segment(this.anchor0, this.anchor1, new O.Style.Line([3,3], "red", O.Style.NONE, true)));
    this.vert = this.addComponent(new O.Segment(this.anchorC, this.anchor1, new O.Style.Line(null, "red",O.Style.FRONT,  true)));
    this.horz = this.addComponent(new O.Segment(this.anchorC, this.anchor0, new O.Style.Line(null, "red", O.Style.FRONT, true)));
    this.arc = this.addComponent(new O.Arc(this.anchor1, this.anchor0, this.anchorC, new O.Style.Line(null, "blue", O.Style.NONE, true)));
}

O.Elevation.prototype = Object.create(O.Object.prototype);
O.Elevation.prototype.constructor = O.Elevation;
O.Elevation.NAME = "elevation";

O.Elevation.prototype.select = function(points) 
{
    O.Object.prototype.select.call(this);
    this.addControl(new O.ControlPoint(this.anchor0, this.constraint));
    this.addControl(new O.ControlPoint(this.anchor1, this.constraint));
}

O.Elevation.prototype.moveControl = function(control)
{
    this.anchorC.set3D( { x:this.anchor1.wx , y:this.anchor0.wy, z:this.anchor1.wz });
}

O.Elevation.prototype.endControl = function()
{
    O.Object.prototype.endControl.call(this);
    if (this.callback.update)
    {
        this.callback.update(this, { p0: this.anchor0.toJson(), p1: this.anchor1.toJson(), } );
    }
}




O.Elevation.Builder = class
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
        this.config.type = "elevation";
        this.config.points = points;
        this.config.constraint = this.constraint.toJson();
        V.postMessage("elevation.record", this.config, this.custom);	
    }
}






V.recvMessage("elevation.record", (args, custom) => 
{ 
    let builder = O.Builder.get();
    
    builder.start(new O.Elevation.Builder(args, custom));
});


V.recvMessage("elevation.update", function(args, custom) 
{ 
    var object = O.instance.getObject(args.id);
    if (object)
    {
        object.update(args);
        V.postMessage("elevation.update", args, custom);
        V.touch2d();
        V.touch3d();
    }
});

V.recvMessage("elevation.select", function(args, custom) 
{ 
    var object = O.instance.getObject(args.id);
    if (object)
    {
        object.select();
        V.postMessage("elevation.select",  object.toJson(), custom);
        V.touch2d();
    }
});

V.recvMessage("elevation.unselect", function(args, custom) 
{ 
    var object = O.instance.getObject(args.id);
    if (object)
    {
        line.unselect();
        V.postMessage("elevation.unselect", args, custom);
        V.touch2d();
    }
});
