
O.Anchor = class 
{
    constructor(worldPt)
    {
        if (worldPt)
        {
            this.wx = worldPt.x || 0;
            this.wy = worldPt.y || 0;
            this.wz = worldPt.z || 0;
        }
        else
        {
            this.wx = 0;
            this.wy = 0;
            this.wz = 0;
        }

        this.listener = [];
        
        this.id = O.Anchor.nextId++;
        this.project();
    }
    
    between3D(a0, a1, t)
    {
        return new O.Anchor({
            x: a0.wx + (a1.wx - a0.wx)*t,
            y: a0.wy + (a1.wy - a0.wy)*t,
            z: a0.wz + (a1.wz - a0.wz)*t,
        });
    }

    // move anchor in 3D space
    set3D(worldPt)
    {
        this.wx = worldPt.x;
        this.wy = worldPt.y;
        this.wz = worldPt.z;

        for (var i=0; i<this.listener.length; i++)
        {
            if (this.listener[i].update3D)
            {
                this.listener[i].update3D();
            }
        }
        
        this.project();
    }

    //move anchor in 3D space
    translate3D(dx, dy, dz)
    {
        this.wx += dx;
        this.wy += dy;
        this.wz += dz;
        
        this.px = this.wx;
        this.py = this.wy;
        this.pz = this.wz;

        for (var i=0; i<this.listener.length; i++)
        {
            if (this.listener[i].update3D)
            {
                this.listener[i].update3D();
            }
        }
        
        this.project();
    }

    // project anchor to screen
    project()
    {
        var point = V.camera.project({ x: this.wx, y:this.wy, z:this.wz });
        this.sx = point.x*O.canvas.width; 
        this.sy = point.y*O.canvas.height; 
    }

    // move anchor in 2D space
    move2D(event)
    {
        this.sx = event.pageX;
        this.sy = event.pageY;
        //this.update2D();
    }

    addListener(listener)
    {
        this.listener.push(listener);
    }

    removeListener(listener)
    {
        for (var i=0; i<this.listener.length; i++)
        {
            if (this.listener[i] == listener)
            {
                this.listener.splice(i,1);
                break;
            }
        }
    }

    toJson(listener)
    {
        return { x: this.wx, y: this.wy, z: this.wz };
    }

}

O.Anchor.nextId = 1;


O.AnchorX = class extends O.Anchor 
{
    constructor(worldPt, id)
    {
        super(worldPt);
        
        this.id = id;
    }
    
    project()
    {
        super.project();
        
        if (this.sx > 0 && this.sx < O.canvas.width && this.sy > 0 && this.sy < O.canvas.height)
        {
            V.postMessage("anchor.update", 
            {
                id: this.id,
                xyz: { x: this.wx, y:this.wy, z:this.wz },
                uv: { x: this.sx, y:this.sy }
            });
        }
    }
}






O.ControlPoint = class
{
    constructor(anchor, constraint)
    {
        this.constraint = constraint;
        this.anchor = anchor;
        this.anchor.addListener(this);
        this.zIndex = 0;
        this.visible = true;
        this.timer = null;
        
        this.click = function(event)
        {
            event.preventDefault();
            event.stopPropagation();
        }
        
        this.listener = [];
    }
    
    detach()
    {
        O.instance.removeEventListener("onMouseDown", this);
        O.instance.removeControlPoint(this);
    }

    attach()
    {
        O.instance.addControlPoint(this);
        O.instance.addEventListener("onMouseDown", this, 0);
    }

    // Mouse Interactions

    updateAnchor(event)
    {
        var worldPt = this.constraint.moveControl(event, this);
        if (worldPt != null)
        {
            this.anchor.set3D(worldPt);
            for (var i=0; i<this.listener.length; i++)
            {
                if (this.listener[i].moveControl != undefined)
                {
                    this.listener[i].moveControl(this);
                }
            }
            O.cursor("crosshair");
        }
        else
        {
            O.cursor("not-allowed");
        }
        return worldPt;
    };

    onMouseDown(event)
    {
        O.instance.addEventListener("onMouseUp", this, 0);
        O.instance.addEventListener("onMouseMove", this, 0);
        O.instance.addEventListener("onMouseOut", this, 0);
        
        for (var i=0; i<this.listener.length; i++)
        {
            if (this.listener[i].startControl != undefined)
            {
                this.listener[i].startControl(this);
            }
        }
        this.dragEvent = { pageX : event.pageX, pageY : event.pageY };
        O.cursor("crosshair");
        
        event.stopImmediatePropagation();
    }

    onMouseMove(event)
    {
        if (this.constraint instanceof C.Intersect)
        {
            this.anchor.move2D(event);

            if (this.timer == null)
            {
                this.timer = setTimeout(function()
                {
                    if (this.timer != null)
                    {
                        this.updateAnchor(this.dragEvent);
                        this.timer = null;
                    }
                }.bind(this), 400);
            }    	
            this.dragEvent = { pageX : event.pageX, pageY : event.pageY };
        }
        else
        {
            this.dragEvent = { pageX : event.pageX, pageY : event.pageY };
            this.updateAnchor(this.dragEvent);
        }
        
        V.touch2d();
        event.stopImmediatePropagation();
    }

    onMouseUp(event)
    {
        O.instance.removeEventListener("onMouseUp", this); 
        O.instance.removeEventListener("onMouseMove", this);
        O.instance.removeEventListener("onMouseOut", this);
        
        if (this.timer != null)
        {
            clearTimeout(this.timer);
            this.timer = null;
        }

        if (!this.updateAnchor(event))
        {
            this.anchor.project();
        }
        for (var i=0; i<this.listener.length; i++)
        {
            if (this.listener[i].endControl != undefined)
            {
                this.listener[i].endControl(this);
            }
        }
        O.cursor("default");
        event.stopImmediatePropagation();
    }

    onMouseOut(event)
    {
        this.onMouseUp(event);
    }

    containsPoint2D(event)
    {
        var dx = event.pageX - this.anchor.sx;
        var dy = event.pageY - this.anchor.sy;
        return dx*dx+dy*dy< O.ControlPoint.R2;
    }


    // control events

    addListener(listener)
    {
        this.listener.push(listener);
    }

    removeListener(listener)
    {
        for (var i=0; i<this.listener.length; i++)
        {
            if (this.listener[i] == listener)
            {
                this.listener.splice(i,1);
                break;
            }
        }
    }

    render2D(context)
    {
        if (this.visible)
        {
            context.strokeStyle = this.constraint.strokeStyle;
            context.setTransform(1,0,0,1,this.anchor.sx, this.anchor.sy);
            context.stroke(O.ControlPoint.PATH);
            //context.font = 36 + 'px Arial';
            //context.fillText(" " + this.anchor.id, 0, 0);
        }
    }
    
    
}

O.ControlPoint.R = 7; //px
O.ControlPoint.R2 = O.ControlPoint.R*O.ControlPoint.R;
O.ControlPoint.PATH = null; 



//
// control point constraint functions   .. DO NOT RENAME THESE. these names are used in css
//


C = {}

C.create = function(content)
{
    if (content[0] === "Cloud")
    {
        return new C.Intersect(content[1]);
    }
    return C[content[0]] ? new C[content[0]](content[1]) : C.Intersect.instance;
}

C.p = { x: 0, y: 0, z: 0 };

/** @constructor */
C.Plane = function(plane)
{
    this.plane = plane;
    
    this.strokeStyle = C.Plane.ACTIVE;
}
C.Plane.ACTIVE = "#66FF00";
C.Plane.PASSIVE = "#4FC40F";

C.Plane.prototype.moveControl = function(event)
{
    return this.getPoint(event);
}

C.Plane.prototype.getPoint = function(event)
{
    var ray = V.camera.getRay(event);
    
    // plane ray intersection
    var denom = this.plane.x*ray.direction.x + this.plane.y*ray.direction.y + this.plane.z*ray.direction.z;
    
    var t = -(this.plane.x*ray.origin.x + this.plane.y*ray.origin.y + this.plane.z*ray.origin.z - this.plane.w)/denom;
    
    C.p.x = ray.direction.x*t + ray.origin.x;
    C.p.y = ray.direction.y*t + ray.origin.y;
    C.p.z = ray.direction.z*t + ray.origin.z;
    return C.p;
}

C.Plane.prototype.toJson = function()
{
    return ["Plane", this.plane];
}


/** @constructor */
C.Intersect = function()
{
    this.strokeStyle = C.Intersect.ACTIVE;
}
C.Intersect.ACTIVE = "#40C4FF";
C.Intersect.PASSIVE = "#40C4FF";

C.Intersect.prototype.moveControl = function(event)
{
    return this.getPoint(event);;
}

C.Intersect.prototype.getPoint = function(event)
{
    var ray = V.camera.getRay(event);
    var cast = V.viewer.raycast(ray, { distance: Number.POSITIVE_INFINITY, xyz: {} });
    
    if (cast.distance != Number.POSITIVE_INFINITY)
    {
        //if (cast.xyz)
        {
            C.p.x = cast.xyz.x;
            C.p.y = cast.xyz.y;
            C.p.z = cast.xyz.z;
        }
        //else
        {
            //C.p.x = ray.origin.x + ray.direction.x*cast.distance;
            //C.p.y = ray.origin.y + ray.direction.y*cast.distance;
            //C.p.z = ray.origin.z + ray.direction.z*cast.distance;
        }
        return C.p;
    }
    return null;
}

C.Intersect.prototype.toJson = function()
{
    return ["Intersect"];
}

C.Intersect.instance = new C.Intersect();





C.Segment = function(anchor0, anchor1)
{
    this.anchor0 = anchor0;
    this.anchor1 = anchor1;
    this.t = 0;
    this.strokeStyle = C.Segment.ACTIVE;
}
C.Segment.ACTIVE = "green";
C.Segment.PASSIVE = "#c2a90f";

C.Segment.prototype.moveControl = function(event)
{
    var ray = V.camera.getRay(event);
    var wx = this.anchor0.wx - ray.origin.x;
    var wy = this.anchor0.wy - ray.origin.y;
    var wz = this.anchor0.wz - ray.origin.z;
    
    // get line vector
    var nx = this.anchor1.wx - this.anchor0.wx;
    var ny = this.anchor1.wy - this.anchor0.wy;
    var nz = this.anchor1.wz - this.anchor0.wz;
    var l = Math.sqrt(nx*nx + ny*ny + nz*nz);
    nx/=l;
    ny/=l;
    nz/=l;
    
    var b = nx*ray.direction.x + ny*ray.direction.y + nz*ray.direction.z;
    var d = nx*wx + ny*wy + nz*wz;
    var e = ray.direction.x*wx + ray.direction.y*wy + ray.direction.z*wz;
    
    var denom = 1.0-b*b;
    this.t = Math.min(l, Math.max(0,(b*e-d)/denom));
    C.p.x = this.t*nx + this.anchor0.wx;
    C.p.y = this.t*ny + this.anchor0.wy;
    C.p.z = this.t*nz + this.anchor0.wz;
    
    this.t /= l; // normalize t. this is need in profile.js
    return C.p;
}

C.Segment.prototype.toJson = function()
{
    return ["Segment"];
}


C.Ray = function(anchor, normal)
{
    this.nx = normal.x;
    this.ny = normal.y;
    this.nz = normal.z;
    this.anchor = anchor;
    
    this.strokeStyle = C.Ray.ACTIVE;
}
C.Ray.ACTIVE = "yellow";
C.Ray.PASSIVE = "#c2a90f";

C.Ray.prototype.moveControl = function(event)
{
    var ray = V.camera.getRay(event);
    var wx = this.anchor.wx - ray.origin.x;
    var wy = this.anchor.wy - ray.origin.y;
    var wz = this.anchor.wz - ray.origin.z;
    
    var b = this.nx*ray.direction.x + this.ny*ray.direction.y + this.nz*ray.direction.z;
    var d = this.nx*wx + this.ny*wy + this.nz*wz;
    var e = ray.direction.x*wx + ray.direction.y*wy + ray.direction.z*wz;
    
    var denom = 1.0-b*b;
    if (denom > 0.001)
    {
        var t = Math.max(0,(b*e-d)/denom);
        C.p.x = t*this.nx + this.anchor.wx;
        C.p.y = t*this.ny + this.anchor.wy;
        C.p.z = t*this.nz + this.anchor.wz;
        return C.p;
    }
    return null;
}

C.Ray.prototype.toJson = function()
{
    return ["Ray"];
}


C.Line = function(anchor, normal)
{
    this.nx = normal.x;
    this.ny = normal.y;
    this.nz = normal.z;
    this.anchor = anchor;
    
    this.strokeStyle = C.Line.ACTIVE;
}
C.Line.ACTIVE = C.Ray.ACTIVE;
C.Line.PASSIVE = C.Ray.PASSIVE;

C.Line.prototype.moveControl = function(event)
{
    return this.getPoint(event);
}

C.Line.prototype.getPoint = function(event)
{
    var ray = V.camera.getRay(event);
    var wx = this.anchor.wx - ray.origin.x;
    var wy = this.anchor.wy - ray.origin.y;
    var wz = this.anchor.wz - ray.origin.z;
    
    var b = this.nx*ray.direction.x + this.ny*ray.direction.y + this.nz*ray.direction.z;
    var d = this.nx*wx + this.ny*wy + this.nz*wz;
    var e = ray.direction.x*wx + ray.direction.y*wy + ray.direction.z*wz;
    
    var denom = 1.0-b*b;
    if (denom > 0.001)
    {
        var t = (b*e-d)/denom;
        C.p.x = t*this.nx + this.anchor.wx;
        C.p.y = t*this.ny + this.anchor.wy;
        C.p.z = t*this.nz + this.anchor.wz;
        return C.p;
    }

    return null;
}



C.Horizontal = function(anchor, width)
{
    this.anchor = anchor;
    
    this.strokeStyle = C.Line.ACTIVE;
}
C.Horizontal.ACTIVE = C.Ray.ACTIVE;
C.Horizontal.PASSIVE = C.Ray.PASSIVE;

C.Horizontal.prototype.moveControl = function(event)
{
    return this.getPoint(event);
}

C.Horizontal.prototype.getPoint = function(event)
{
    var ray = V.camera.getRay(event);
    var wx = this.anchor.wx - ray.origin.x;
    var wy = this.anchor.wy - ray.origin.y;
    var wz = this.anchor.wz - ray.origin.z;
    
    var n = V.camera.xAxis;
    var b = n.x*ray.direction.x + n.y*ray.direction.y + n.z*ray.direction.z;
    var d = n.x*wx + n.y*wy + n.z*wz;
    var e = ray.direction.x*wx + ray.direction.y*wy + ray.direction.z*wz;
    
    var denom = 1.0-b*b;
    if (denom > 0.001)
    {
        var t = (b*e-d)/denom;
        C.p.x = t*n.x + this.anchor.wx;
        C.p.y = t*n.y + this.anchor.wy;
        C.p.z = t*n.z + this.anchor.wz;
        return C.p;
    }

    return null;
}



C.Sphere = function(anchor, normal)
{
    this.strokeStyle = C.Plane.ACTIVE;
}
C.Sphere.ACTIVE = C.Plane.ACTIVE;
C.Sphere.PASSIVE = C.Plane.PASSIVE;

C.Sphere.prototype.moveControl = function(event)
{
    return this.getPoint(event);
}

C.Sphere.prototype.getPoint = function(event)
{
    var ray = V.camera.getRay(event);
    C.p.x = ray.direction.x*0.708;
    C.p.y = ray.direction.y*0.708;
    C.p.z = ray.direction.z*0.708;
    return C.p;
}

C.Sphere.prototype.toJson = function()
{
    return ["Sphere" ];
}






/** @constructor */
C.Polygon = function(geometry)
{
    this.geometry = geometry;
    
    this.strokeStyle = C.Plane.ACTIVE;
}

C.Polygon.prototype.moveControl = function(event, controlPoint)
{
    var point = GM.Ray.intersectPlane(V.camera.getRay(event), this.geometry.plane, {});
    if (this.geometry.canMovePoint(controlPoint.anchor.id, point))
    {
        return point;
    }
    return null;
}

C.Polygon.prototype.getPoint = function(event)
{
    return GM.Ray.intersectPlane(V.camera.getRay(event), this.geometry.plane, {});
}

C.Polygon.prototype.toJson = function()
{
    return ["Polygon", this.geometry.plane];
}







