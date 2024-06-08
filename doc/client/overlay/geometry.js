G = {
    EPSISLON : 0.999,
    sx : 1,
    sy : 1,
    sz : 1,
};

G.getPlane = function(a0, a1, a2)
{
    // get vector a1 -> a0 
    let v1x = a0.wx - a1.wx; 
    let v1y = a0.wy - a1.wy; 
    let v1z = a0.wz - a1.wz;
    
    // get vector a1 -> p 
    let v2x = a2.wx - a1.wx; 
    let v2y = a2.wy - a1.wy; 
    let v2z = a2.wz - a1.wz;
    
    // get plane normal
    let nx = v2y*v1z - v2z*v1y;  
    let ny = v2z*v1x - v2x*v1z; 
    let nz = v2x*v1y - v2y*v1x;
    let l = Math.sqrt(nx*nx + ny*ny + nz*nz);
    nx/=l;
    ny/=l;
    nz/=l;
    w = a1.wx*nx + a1.wy*ny + a1.wz*nz;
    
    return { x: nx, y:ny, z:nz, w: w };
}



G.edgeIntersect = function(a0, a1, b0, b1)
{
    let ccw0 = a0.du*(b0.v - a0.v) - a0.dv*(b0.u - a0.u);
    let ccw1 = a0.du*(b1.v - a0.v) - a0.dv*(b1.u - a0.u);
    if (ccw0 * ccw1 > 0)
    {
        return false;
    }
    
    ccw0 = b0.du*(a0.v - b0.v) - b0.dv*(a0.u - b0.u);
    ccw1 = b0.du*(a1.v - b0.v) - b0.dv*(a1.u - b0.u);
    if (ccw0 * ccw1 > 0)
    {
        return false;
    }
    return true;
}

G.containsPoint = function(a,b,c,p)
{
    let area = 1/2 * (-b.v * c.u + a.v * (-b.u + c.u) + a.u * (b.v - c.v) + b.u * c.v);
    let sign = area < 0 ? -1 : 1;
    let s = (a.v * c.u - a.u * c.v + (c.v - a.v) * p.u + (a.u - c.u) * p.v) * sign;
    let t = (a.u * b.v - a.v * b.u + (a.v - b.v) * p.u + (b.u - a.u) * p.v) * sign;
    
    return (s > 0 && t > 0 && (s + t) < 2 * area * sign);
};



//
//
//

G.Polygon = function(plane)
{
    this.plane = plane;
    
    this.su = 1;
    this.sv = 1;
    this.vPos = 0; 
    this.vEnd = 0;

}

G.Polygon.prototype.translate = function(dx, dy, dz)
{
    this.plane.w += this.plane.x*dx + this.plane.y*dy + this.plane.z*dz;
}

G.Polygon.prototype.update = function(anchors)
{
    // get center of polygon
    let center = { x:0, y:0, z:0 };
    for (var i=0; i<anchors.length; i++)
    {
        center.x += anchors[i].wx;
        center.y += anchors[i].wy;
        center.z += anchors[i].wz;
    }
    center.x /= anchors.length;
    center.y /= anchors.length;
    center.z /= anchors.length;	
    
    // find v and u
    this.radius = Number.NEGATIVE_INFINITY;
    let v = { x:anchors[0].wx - center.x, y:anchors[0].wy - center.y, z:anchors[0].wz - center.z };
    for (i=1; i<anchors.length; i++)
    {
        let dx = anchors[i].wx - center.x;
        let dy = anchors[i].wy - center.y;
        let dz = anchors[i].wz - center.z;
        let d = dx*dx + dy*dy + dz*dz;
        if (this.radius < d)
        {
            v.x = dx;
            v.y = dy;
            v.z = dz;
            this.radius = d;
        }
    }
    this.radius = Math.sqrt(this.radius);
    
    let l = Math.sqrt(v.x*v.x + v.y*v.y + v.z*v.z);
    v.x /= l;
    v.y /= l;
    v.z /= l;
    
    let u = { x: this.plane.y*v.z - this.plane.z*v.y, y: this.plane.z*v.x - this.plane.x*v.z, z: this.plane.x*v.y - this.plane.y*v.x };
    /*
    l = Math.sqrt(u.x*u.x + u.y*u.y + u.z*u.z);
    u.x /= l;
    u.y /= l;
    u.z /= l;
    */
    
    // convert points to u,v coordinates
    let points = [ ]; 
    this.umin = Number.POSITIVE_INFINITY;
    this.umax = Number.NEGATIVE_INFINITY;
    this.vmin = Number.POSITIVE_INFINITY;
    this.vmax = Number.NEGATIVE_INFINITY;
    for (var i=0; i<anchors.length; i++)
    {
        let px = anchors[i].wx - center.x;
        let py = anchors[i].wy - center.y;
        let pz = anchors[i].wz - center.z;
        
        let lu = px*u.x + py*u.y + pz*u.z;
        let lv = px*v.x + py*v.y + pz*v.z;
        points.push({u:lu, v:lv, id: anchors[i].id, next: (i+1)%anchors.length});
        
        this.umin = Math.min(this.umin, lu);
        this.umax = Math.max(this.umax, lu);
        this.vmin = Math.min(this.vmin, lv);
        this.vmax = Math.max(this.vmax, lv);
    }
    this.du = this.umax - this.umin;
    this.dv = this.vmax - this.vmin;

    // create triangle mesh
    let triangles = [];
    
    let cc = 0;
    let iter=0;
    do
    {
        let a = points[iter];  
        let b = points[a.next];  
        let c = points[b.next];
        
        if ((b.u - a.u)*(c.v - a.v) < (b.v - a.v)*(c.u - a.u))
        {
            // check if any other point is in triangle
            let search = c.next;
            while (search !== iter) 
            {
                let p = points[search];
                if (G.containsPoint(a,b,c, p))
                {
                    break;
                }
                search = p.next;
            }
            
            if (search == iter)
            {
                //console.log("creating " + points[iter].id + " - " + points[a.next].id + " - " + points[b.next].id );
                triangles.push(iter, a.next, b.next);
                // relink
                points[iter].next = b.next;
            }
        }
            
        iter = points[iter].next;
        if (cc++ > 3*points.length)
        {
            console.log("DDDDDDDDDDDDDDDDDDD");
            break;
        }
    }
    while (points[points[iter].next].next != iter);
    
    this.points = points;
    this.u = u;
    this.v = v;
    this.center = center;
    this.triangles = triangles;

    // compute uv scalars for model space scale --- used only to compute metrics
    let sux = this.u.x*G.sx;
    let suy = this.u.y*G.sy;
    let suz = this.u.z*G.sz;
    this.su = Math.sqrt(sux*sux+suy*suy+suz*suz);
    let svx = this.v.x*G.sx;
    let svy = this.v.y*G.sy;
    let svz = this.v.z*G.sz;
    this.sv = Math.sqrt(svx*svx+svy*svy+svz*svz);
}

G.Polygon.prototype.getMesh = function(offset)
{
    let dNx = offset ? this.plane.x*offset : 0;
    let dNy = offset ? this.plane.y*offset : 0;
    let dNz = offset ? this.plane.z*offset : 0;
    
    // create render buffer
    let buffer = new Float32Array(this.triangles.length*3);
    for (var i=0; i<this.triangles.length; i++)
    {
        let point = this.points[this.triangles[i]];
        buffer[i*3+0] = this.center.x + point.u*this.u.x + point.v*this.v.x + dNx;
        buffer[i*3+1] = this.center.y + point.u*this.u.y + point.v*this.v.y + dNy;
        buffer[i*3+2] = this.center.z + point.u*this.u.z + point.v*this.v.z + dNz;
    }
    return buffer;
}

G.Polygon.prototype.containsPoint = function(point)
{
    let px = point.x - this.center.x;
    let py = point.y - this.center.y;
    let pz = point.z - this.center.z;
    
    let p = { 
            u: px*this.u.x + py*this.u.y + pz*this.u.z,
            v: px*this.v.x + py*this.v.y + pz*this.v.z
    };
    
    for (var i=0; i<this.triangles.length/3; i++)
    {
        let p0 = this.points[this.triangles[i*3+0]];
        let p1 = this.points[this.triangles[i*3+1]];
        let p2 = this.points[this.triangles[i*3+2]];
        if (G.containsPoint(p0,p1,p2, p))
        {
            return true;
        }
    }
    
    return false;
}

//
// Assumes this.update is called between calls to the functions below
//

G.Polygon.prototype.canRemovePoint = function(id,point)
{
    // compute du/dv relink edges and find point
    let removeIndex = 0;
    for (var i=0; i<this.points.length; i++)
    {
        let p0 = this.points[i];
        p0.next = (i+1)%this.points.length;
        let p1 = this.points[p0.next];
        
        if (p0.id == id)
        {
            removeIndex = i;
        }
        
        p0.du = p1.u - p0.u;   
        p0.dv = p1.v - p0.v;
    }
    
    // remove edge from plygon
    let p0 = this.points[(removeIndex-1+this.points.length)%this.points.length];
    let p1 = this.points[(removeIndex+1)%this.points.length];
    
    p0.next = (p0.next+1)%this.points.length;
    p0.du = p1.u - p0.u;   
    p0.dv = p1.v - p0.v;
    
    // test p0 p1 backward
    let iter = (removeIndex-3+this.points.length)%this.points.length;
    for (var i=0; i<this.points.length-4; i++)
    {
        let e0 = this.points[iter];
        let e1 = this.points[e0.next];
        //console.log("testing " + p0.id + " - " + p1.id + " against " + e0.id + " - " + e1.id);
        if (G.edgeIntersect(p0, p1, e0, e1))
        {
            return false;
        }
           
        iter = (iter-1+this.points.length)%this.points.length;
    }
    
    
    // test p0 p1 forward
    iter = (removeIndex+2)%this.points.length;
    for (var i=0; i<this.points.length-4; i++)
    {
        let e0 = this.points[iter];
        let e1 = this.points[e0.next];
        //console.log("testing " + p0.id + " - " + p1.id + " against " + e0.id + " - " + e1.id);
        if (G.edgeIntersect(p0, p1, e0, e1))
        {
            return false;
        }
        
        iter = (iter+1)%this.points.length;
    }		

    // make sure area is positive
    let area = 0;      
    let index = (removeIndex+1)%this.points.length;
    for (var i=0; i<this.points.length-1; i++)
    { 
        let e0 = this.points[index];
        index = e0.next;
        let e1 = this.points[index];
        area = area + (e0.u+e1.u) * (e0.v-e1.v); 
    }
    return area > 0;
}

G.Polygon.prototype.canMovePoint = function(id,point)
{
    // convert to uv
    let px = point.x - this.center.x;
    let py = point.y - this.center.y;
    let pz = point.z - this.center.z;
    let u = px*this.u.x + py*this.u.y + pz*this.u.z;
    let v = px*this.v.x + py*this.v.y + pz*this.v.z;
    
    // compute du/dv, find starting edge and move p1 to new location
    let iterF = 0;
    let iterB = 0;
    for (var i=0; i<this.points.length; i++)
    {
        let p0 = this.points[i];
        p0.next = (i+1)%this.points.length;
        let p1 = this.points[p0.next];
        
        if (p0.id == id)
        {
            p0.u = u;
            p0.v = v;
            iterF = i;
        }
        if (p1.id == id)
        {
            p1.u = u;
            p1.v = v;
            iterB = i;
        }
        
        p0.du = p1.u - p0.u;   
        p0.dv = p1.v - p0.v;
    }
    let p0 = this.points[iterB];
    
    // test p0 p1 backward
    let p1 = this.points[iterF];  
    iterB = (iterB-2+this.points.length)%this.points.length;
    for (var i=0; i<this.points.length-3; i++)
    {
        let e0 = this.points[iterB];
        let e1 = this.points[e0.next];
    //	console.log("testing " + p0.id + " - " + p1.id + " against " + e0.id + " - " + e1.id);
        if (G.edgeIntersect(p0, p1, e0, e1))
        {
            return false;
        }
           
        iterB = (iterB-1+this.points.length)%this.points.length;
    }

    // test p1 p2 forward
    let p2 = this.points[(iterF+1)%this.points.length];
    iterF = (iterF+2)%this.points.length;
    for (var i=0; i<this.points.length-3; i++)
    {
        let e0 = this.points[iterF];
        let e1 = this.points[e0.next];
    //	console.log("testing " + p1.id + " - " + p2.id + " against " + e0.id + " - " + e1.id);
        if (G.edgeIntersect(p1, p2, e0, e1))
        {
            return false;
        }
        
        iterF = (iterF+1)%this.points.length;
    }
    
    // make sure area > 0
    /*
    let area = 0;      
    let j = this.points.length-1;  
    for (i=0; i<this.points.length; i++)
    { 
        area = area + (this.points[j].u+this.points[i].u) * (this.points[j].v-this.points[i].v); 
        j = i;  
    }
    return area > 0;
    */
    return this.getArea() > 0;
}
    
G.Polygon.prototype.getArea = function()
{
    // make sure area > 0
    let area = 0;      
    let j = this.points.length-1;  
    for (var i=0; i<this.points.length; i++)
    { 
        area = area + (this.points[j].u+this.points[i].u) * (this.points[j].v-this.points[i].v); 
        j = i;  
    }
    return area/2;
}

//
// Scanline
//

G.Polygon.prototype.startScan = function(resolution, direction)
{
    let points = this.points;

    // setup scan line
    let edges = [];
    for (var i=0; i<points.length; i++)
    {
        let p0 = points[i];
        let p1 = points[(i+1)%points.length];
        
        if (Math.abs(p1.v-p0.v) > resolution)
        {
            let E = { 
                        id0: p0.id,
                        id1: p1.id,
                        vmin: Math.min(p0.v, p1.v), 
                        vmax: Math.max(p0.v, p1.v),
                        umin: Math.min(p0.u, p1.u), 
                        umax: Math.max(p0.u, p1.u),
                        u0 : p0.u,
                        v0 : p0.v,
                        m: (p1.u - p0.u)/(p1.v - p0.v) 
                     };
            edges.push(E);
        }
    }
    
    edges.sort(function(a, b) 
    { 
        return a.vmin - b.vmin;
    });
    this.edges = edges;
    this.vEdge = 0,
    this.vEnd = this.vmax-0.5*resolution,
    this.vPos = this.vmin+0.5*resolution,
    this.active = [];
    this.integral = 0;
    
    this.resolution = resolution;

    this.ray = new GM.Ray();
    this.ray.direction.x = direction.x;
    this.ray.direction.y = direction.y;
    this.ray.direction.z = direction.z;
    
    this.context = { du: Math.ceil(this.du/resolution), dv: Math.ceil(this.dv/resolution), resolution };
    
    return this.context;
}

G.Polygon.prototype.scanLine = function(sampler)
{
    // remove active edges
    for (var i=0; i<this.active.length; i++)
    {
        let edge = this.edges[this.active[i]];
        if (edge.vmax < this.vPos)
        {
            this.active.splice(i,1);
            i--;
        }
    }
        
    // add inactive
    for (var i=this.vEdge; i<this.edges.length; i++)
    {
        let edge = this.edges[i];
        if (edge.vmin < this.vPos)
        {
            this.active.push(i);
            this.vEdge++;
        }
    }

    // update uPos for each edge of current scan line
    for (var i=0; i<this.active.length; i++)
    {
        let e = this.edges[this.active[i]];
        e.u = e.u0 + e.m*(this.vPos-e.v0);
    }

    // 	sort by uPos
    this.active = this.active.sort(function(a, b) { return this.edges[a].u - this.edges[b].u }.bind(this));
    
    if (sampler.startLine)
    {
        sampler.startLine(this.context);
    }
    let vx = this.center.x + this.vPos*this.v.x;
    let vy = this.center.y + this.vPos*this.v.y;
    let vz = this.center.z + this.vPos*this.v.z;
    for (var i=0; i<Math.floor(this.active.length/2); i++)
    {
        let e0 = this.edges[this.active[i*2]];
        let e1 = this.edges[this.active[i*2+1]];
        
        for (var uPos=e0.u; uPos<e1.u; uPos+= this.resolution)
        {
            this.ray.origin.x = vx + uPos*this.u.x;
            this.ray.origin.y = vy + uPos*this.u.y;
            this.ray.origin.z = vz + uPos*this.u.z;
            
            sampler.sample(this.ray, this.resolution, uPos-this.umin, this.vPos-this.vmin);
        }
    }
    if (sampler.endLine)
    {
        sampler.endLine(this.context);
    }
    
    // setup next line
    this.vPos += this.resolution;
}


G.Polygon.prototype.endScan = function()
{
    if (this.vPos >= this.vEnd)
    {
        return true;
    }
    return false;
}
