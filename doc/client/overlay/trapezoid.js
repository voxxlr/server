/** @constructor */
O.Trapezoid = function(entry, callback)
{
    O.Object.call(this, entry.id, entry.content.radius);
    this.callback = callback;
    this.type = "trapezoid";
    
    this.constraint = entry.content.constraint;
    this.r0 = entry.content.r0;
    this.r1 = entry.content.r1;
    
    this.a = {};
    this.a.p0 = this.addAnchor(new O.Anchor(entry.content.p0));
    this.a.p1 = this.addAnchor(new O.Anchor(entry.content.p1));
    
    var points = this.computePoints(this.getPerpendicular());
    this.a.p0min = this.addAnchor(new O.Anchor(points[0]));
    this.a.p0max = this.addAnchor(new O.Anchor(points[1]));
    this.a.p1min = this.addAnchor(new O.Anchor(points[2]));
    this.a.p1max = this.addAnchor(new O.Anchor(points[3]));
    this.projectAnchors();
    
    this.line = this.addComponent(new O.Segment(this.a.p0, this.a.p1, new O.Style.Line(null, "red", O.Style.FRONT_BACK, true)));
    this.para0 = this.addComponent(new O.Segment(this.a.p0min, this.a.p0max, new O.Style.Line(null, "red", O.Style.NONE, true)));
    this.para1 = this.addComponent(new O.Segment(this.a.p1min, this.a.p1max, new O.Style.Line(null, "red", O.Style.NONE, true)));
    this.side0 = this.addComponent(new O.Segment(this.a.p0min, this.a.p1min, new O.Style.Line([3,3], "grey", O.Style.NONE, false)));
    this.side1 = this.addComponent(new O.Segment(this.a.p0max, this.a.p1max, new O.Style.Line([3,3], "grey", O.Style.NONE, false)));
    
    this.setMode(entry.content.mode);
}

O.Trapezoid.prototype = Object.create(O.Object.prototype);
O.Trapezoid.prototype.constructor = O.Trapezoid;
O.Trapezoid.NAME = "trapezoid";

O.Trapezoid.SEGMENTS = 0;
O.Trapezoid.AREA = 1;

O.Trapezoid.prototype.getMetric = function()
{
    return 0.5 * this.line.length * (this.para0.length + this.para1.length);
}

O.Trapezoid.prototype.getCentroid = function()
{
    return { x: (this.a.p0.wx+this.a.p1.wx)/2,
             y: (this.a.p0.wy+this.a.p1.wy)/2,
             z: (this.a.p0.wz+this.a.p1.wz)/2 };
}

O.Trapezoid.prototype.getPerpendicular = function()
{
    // get line vector
    var dAx = this.a.p0.wx - this.a.p1.wx;
    var dAy = this.a.p0.wy - this.a.p1.wy;
    var dAz = this.a.p0.wz - this.a.p1.wz;
    
    var n = this.constraint[1];
    // cross with plane normal
    var cx = dAy*n.z - dAz*n.y;  
    var cy = dAz*n.x - dAx*n.z; 
    var cz = dAx*n.y - dAy*n.x;
    var l = Math.sqrt(cx*cx + cy*cy + cz*cz);

    return { x: cx/l, y:cy/l, z:cz/l };
}

O.Trapezoid.prototype.computePoints = function(dir)
{
    var p0min = { x:this.a.p0.wx+this.r0.min*dir.x , y:this.a.p0.wy+this.r0.min*dir.y, z:this.a.p0.wz+this.r0.min*dir.z };
    var p0max = { x:this.a.p0.wx+this.r0.max*dir.x , y:this.a.p0.wy+this.r0.max*dir.y, z:this.a.p0.wz+this.r0.max*dir.z };
    var p1min = { x:this.a.p1.wx+this.r1.min*dir.x , y:this.a.p1.wy+this.r1.min*dir.y, z:this.a.p1.wz+this.r1.min*dir.z };
    var p1max = { x:this.a.p1.wx+this.r1.max*dir.x , y:this.a.p1.wy+this.r1.max*dir.y, z:this.a.p1.wz+this.r1.max*dir.z };
    
    return [ p0min, p0max, p1min, p1max ];
}

O.Trapezoid.prototype.moveControl = function(control)
{
    O.Object.prototype.moveControl.call(this, control);
    if (control.anchor == this.a.p0 || control.anchor == this.a.p1)
    {
        var dir = this.getPerpendicular();
        // update constraints of control points
        
        this.controls[4].constraintParams.dx = dir.x;
        this.controls[4].constraintParams.dy = dir.y;
        this.controls[4].constraintParams.dz = dir.z;
        this.controls[5].constraintParams.dx = dir.x;
        this.controls[5].constraintParams.dy = dir.y;
        this.controls[5].constraintParams.dz = dir.z;
        
        this.controls[0].constraintParams.dx = -dir.x;
        this.controls[0].constraintParams.dy = -dir.y;
        this.controls[0].constraintParams.dz = -dir.z;
        this.controls[1].constraintParams.dx = dir.x;
        this.controls[1].constraintParams.dy = dir.y;
        this.controls[1].constraintParams.dz = dir.z;
        this.controls[2].constraintParams.dx = -dir.x;
        this.controls[2].constraintParams.dy = -dir.y;
        this.controls[2].constraintParams.dz = -dir.z;
        this.controls[3].constraintParams.dx = dir.x;
        this.controls[3].constraintParams.dy = dir.y;
        this.controls[3].constraintParams.dz = dir.z;

        var points = this.computePoints(dir);
        this.a.p0min.set3D(points[0]);
        this.a.p0max.set3D(points[1]);
        this.a.p1min.set3D(points[2]);
        this.a.p1max.set3D(points[3]);
    }
    else
    {
        var dir = this.getPerpendicular();
        if (control.anchor == this.a.p0min)
        {
            var dAx = this.a.p0.wx - this.a.p0min.wx;
            var dAy = this.a.p0.wy - this.a.p0min.wy;
            var dAz = this.a.p0.wz - this.a.p0min.wz;
            this.r0.min = -(dir.x*dAx+dir.y*dAy+dir.z*dAz);
            this.a.p0min.project();
        }
        else if (control.anchor == this.a.p0max)
        {
            var dAx = this.a.p0.wx - this.a.p0max.wx;
            var dAy = this.a.p0.wy - this.a.p0max.wy;
            var dAz = this.a.p0.wz - this.a.p0max.wz;
            this.r0.max = -(dir.x*dAx+dir.y*dAy+dir.z*dAz);
            this.a.p0max.project();
        }
        else if (control.anchor == this.a.p1min)
        {
            var dAx = this.a.p1.wx - this.a.p1min.wx;
            var dAy = this.a.p1.wy - this.a.p1min.wy;
            var dAz = this.a.p1.wz - this.a.p1min.wz;
            this.r1.min = -(dir.x*dAx+dir.y*dAy+dir.z*dAz);
            this.a.p1min.project();
        }
        else if (control.anchor == this.a.p1max)
        {
            var dAx = this.a.p1.wx - this.a.p1max.wx;
            var dAy = this.a.p1.wy - this.a.p1max.wy;
            var dAz = this.a.p1.wz - this.a.p1max.wz;
            this.r1.max = -(dir.x*dAx+dir.y*dAy+dir.z*dAz);
            this.a.p1max.project();
        }
    }
}

O.Trapezoid.prototype.endControl = function()
{
    O.Object.prototype.endControl.call(this);
    if (this.callback.update)
    {
        this.callback.update(this, { p0: this.a.p0.toJson(), 
                                     r0: this.r0,  
                                     p1: this.a.p1.toJson(), 
                                     r1: this.r1 });
    }
}

O.Trapezoid.prototype.select = function(points)
{
    O.Object.prototype.select.call(this);
    
    var dir = this.getPerpendicular();
    this.addControl(new O.ControlPoint(this.a.p0min, [ "ANCHORED_RAY", { anchor: this.a.p0max, dx: -dir.x, dy: -dir.y, dz: -dir.z } ] )); 
    this.addControl(new O.ControlPoint(this.a.p0max, [ "ANCHORED_RAY", { anchor: this.a.p0min, dx: dir.x, dy: dir.y, dz: dir.z } ] ));
    this.addControl(new O.ControlPoint(this.a.p1min, [ "ANCHORED_RAY", { anchor: this.a.p1max, dx: -dir.x, dy: -dir.y, dz: -dir.z } ] ));
    this.addControl(new O.ControlPoint(this.a.p1max, [ "ANCHORED_RAY", { anchor: this.a.p1min, dx: dir.x, dy: dir.y, dz: dir.z } ] ));

    this.addControl(new O.ControlPoint(this.a.p0, this.constraint));
    this.addControl(new O.ControlPoint(this.a.p1, this.constraint));
}

O.Trapezoid.prototype.setMode = function(mode)
{
    O.Object.prototype.setMode.call(this, mode);
    
    if (mode === O.Trapezoid.SEGMENTS)
    {
        this.line.style.fillStyle = "red";
        this.line.style.labelled = true;
        this.para0.style.dash = [8,5];
        this.para0.style.labelled = true;
        this.para1.style.dash = [8,5];
        this.para1.style.labelled = true;
        this.side0.style.fillStyle = "grey";
        this.side0.style.dash = [3,3];
        this.side1.style.fillStyle = "grey";
        this.side1.style.dash = [3,3];
    }
    else if (mode === O.Trapezoid.AREA)
    {
        this.line.style.fillStyle = "grey";
        this.line.style.labelled = false;
        this.para0.style.dash = null;
        this.para0.style.labelled = false;
        this.para1.style.dash = null;
        this.para1.style.labelled = false;
        this.side0.style.fillStyle = "red";;
        this.side0.style.dash = null;
        this.side1.style.fillStyle = "red";
        this.side1.style.dash = null;
    }
}

O.Trapezoid.prototype.render2D = function(context, style)
{
    if (this.label.visible)
    {
        var dx = this.a.p0.sx-this.a.p1.sx;
        var dy = this.a.p0.sy-this.a.p1.sy;
        this.label.cutoff = 0.15*(dx*dx+dy*dy);
    }
    
    O.Object.prototype.render2D.call(this, context, style);
}
