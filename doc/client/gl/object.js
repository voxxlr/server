

GL.Axis = function (sx,sy,sz) 
{
    this.px = 0;
    this.py = 0;
    this.pz = 0;
    this.sx = sx | 1;
    this.sy = sy | 1;
    this.sz = sz | 1;
    this.visible = true;

    this.color = new GL.ArrayBuffer(new Uint8Array([
        255, 0, 0,  255, 0, 0,
        0, 255, 0,  0, 255, 0,
        0, 0, 255,  0, 0, 255
    ]));
    
    this.shader = new GL.LineShader();
    this.shader.compile();

    this.update();
};

GL.Axis.prototype.render = function (camera)
{
    if (this.visible)
    {
        this.shader.useProgram(camera);
        this.shader.enableBuffer(this);
        this.shader.bindBuffer(this);
        gl.disable(gl.DEPTH_TEST);
        gl.drawArrays(gl.LINES, 0, 18/3);
        this.shader.disableBuffer(this);
        gl.enable(gl.DEPTH_TEST);
    }
}

GL.Axis.prototype.update = function ()
{
    this.position = new GL.ArrayBuffer(new Float32Array([
        this.px, this.py, this.pz,  this.px+ this.sx,  this.py, this.pz,
        this.px, this.py, this.pz,  this.px, this.py + this.sy, this.pz,
        this.px, this.py, this.pz,  this.px, this.py,  this.pz+this.sz
    ]));
}

GL.Axis.prototype.resize = function (aabb, camera)
{
    let range = 0.25*GM.Vector3.mag(GM.Vector3.sub3V(this.px,this.py,this.pz, camera.position));
    this.sx = Math.min(range, aabb.max.x - aabb.min.x);
    this.sy = Math.min(range, aabb.max.y - aabb.min.y);
    this.sz = Math.min(range, aabb.max.z - aabb.min.z);
    this.update();
}


GL.Axis.prototype.moveTo = function (x,y,z)
{
    this.px = x;
    this.py = y;
    this.pz = z;
    this.update();
}

GL.BoundingBox = class
{
    constructor(box)
    {
        this.position = new GL.ArrayBuffer(new Float32Array([
            box.min.x, box.min.y, box.min.z,  box.max.x, box.min.y, box.min.z,
            box.max.x, box.min.y, box.min.z,  box.max.x, box.max.y, box.min.z,
            box.max.x, box.max.y, box.min.z,  box.min.x, box.max.y, box.min.z,
            box.min.x, box.max.y, box.min.z,  box.min.x, box.min.y, box.min.z,
            
            box.min.x, box.min.y, box.max.z,  box.max.x, box.min.y, box.max.z,
            box.max.x, box.min.y, box.max.z,  box.max.x, box.max.y, box.max.z,
            box.max.x, box.max.y, box.max.z,  box.min.x, box.max.y, box.max.z,
            box.min.x, box.max.y, box.max.z,  box.min.x, box.min.y, box.max.z,

            box.min.x, box.min.y, box.min.z,  box.min.x, box.min.y, box.max.z,
            box.min.x, box.max.y, box.min.z,  box.min.x, box.max.y, box.max.z,
            box.max.x, box.max.y, box.min.z,  box.max.x, box.max.y, box.max.z,
            box.max.x, box.min.y, box.min.z,  box.max.x, box.min.y, box.max.z
            
            ]));

        this.color = new GL.ArrayBuffer(new Uint8Array([
                        255, 0, 0,  255, 0, 0,
                        255, 0, 0,  255, 0, 0,
                        255, 0, 0,  255, 0, 0,
                        255, 0, 0,  255, 0, 0,
                        
                        255, 0, 0,  255, 0, 0,
                        255, 0, 0,  255, 0, 0,
                        255, 0, 0,  255, 0, 0,
                        255, 0, 0,  255, 0, 0,
        
                        255, 0, 0,  255, 0, 0,
                        255, 0, 0,  255, 0, 0,
                        255, 0, 0,  255, 0, 0,
                        255, 0, 0,  255, 0, 0
                        
                        ]));
        
        this.shader = new GL.LineShader();
        this.shader.compile();
    }
    
    render(camera)
    {
        this.shader.useProgram(camera);
        gl.disable(gl.DEPTH_TEST);
        this.shader.enableBuffer(this);
        this.shader.bindBuffer(this);
        gl.drawArrays(gl.LINES, 0, 24);
        this.shader.disableBuffer(this);
        gl.enable(gl.DEPTH_TEST);
    }

    setColor(r,g,b)
    {
        this.color = new GL.ArrayBuffer(new Uint8Array([
                                                r,g,b,  r,g,b,
                                                r,g,b,  r,g,b,
                                                r,g,b,  r,g,b,
                                                r,g,b,  r,g,b,
                                                
                                                r,g,b,  r,g,b,
                                                r,g,b,  r,g,b,
                                                r,g,b,  r,g,b,
                                                r,g,b,  r,g,b,

                                                r,g,b,  r,g,b,
                                                r,g,b,  r,g,b,
                                                r,g,b,  r,g,b,
                                                r,g,b,  r,g,b,
                                                        
                                            ]));
    }


    update(box)
    {
        this.position = new GL.ArrayBuffer(new Float32Array([
            box.min.x, box.min.y, box.min.z,  box.max.x, box.min.y, box.min.z,
            box.max.x, box.min.y, box.min.z,  box.max.x, box.max.y, box.min.z,
            box.max.x, box.max.y, box.min.z,  box.min.x, box.max.y, box.min.z,
            box.min.x, box.max.y, box.min.z,  box.min.x, box.min.y, box.min.z,
            
            box.min.x, box.min.y, box.max.z,  box.max.x, box.min.y, box.max.z,
            box.max.x, box.min.y, box.max.z,  box.max.x, box.max.y, box.max.z,
            box.max.x, box.max.y, box.max.z,  box.min.x, box.max.y, box.max.z,
            box.min.x, box.max.y, box.max.z,  box.min.x, box.min.y, box.max.z,

            box.min.x, box.min.y, box.min.z,  box.min.x, box.min.y, box.max.z,
            box.min.x, box.max.y, box.min.z,  box.min.x, box.max.y, box.max.z,
            box.max.x, box.max.y, box.min.z,  box.max.x, box.max.y, box.max.z,
            box.max.x, box.min.y, box.min.z,  box.max.x, box.min.y, box.max.z
            
            ]));
    }	

    static init(object)
    {
        object.min = {
            x: Number.POSITIVE_INFINITY,
            y: Number.POSITIVE_INFINITY,
            z: Number.POSITIVE_INFINITY
        }
        object.max = {
            x: Number.NEGATIVE_INFINITY,
            y: Number.NEGATIVE_INFINITY,
            z: Number.NEGATIVE_INFINITY
        }
        return object;
    }
    
    static create(min, max)
    {
        return {
            min : {
                x: min.x || min[0],
                y: min.y || min[1],
                z: min.z || min[2]
            },
            max : {
                x: max.x || max[0],
                y: max.y || max[1],
                z: max.z || max[2]
            }			
        }
    }
    
    static set(object, min, max)
    {
        object.min = 
        {
            x: min.x || min[0],
            y: min.y || min[1],
            z: min.z || min[2]
        }
        
        object.max = 
        {
            x: max.x || max[0],
            y: max.y || max[1],
            z: max.z || max[2]
        }			
    }
    
    
    static merge(dest, srce)
    {
        GM.Vector3.min(dest.min, srce.min, dest.min);
        GM.Vector3.max(dest.max, srce.max, dest.max);
    }
    
    static grow(dest, srce)
    {
        GM.Vector3.min(dest.min, srce, dest.min);
        GM.Vector3.max(dest.max, srce, dest.max);
    }
    
    static center(aabb, dest)
    {
        dest = dest || {};
        dest.x = (aabb.min.x + aabb.max.x)/2;
        dest.y = (aabb.min.y + aabb.max.y)/2;
        dest.z = (aabb.min.z + aabb.max.z)/2;
        return dest;
    }	
    
    static diagonal(aabb)
    {
        var dx = aabb.max.x - aabb.min.x;
        var dy = aabb.max.y - aabb.min.y;
        var dz = aabb.max.z - aabb.min.z;
        return Math.sqrt(dx*dx+dy*dy+dz*dz);
    }
    
    static copy(srce, dest)
    {
        GM.Vector3.copy(srce.min, dest.min);
        GM.Vector3.copy(srce.max, dest.max);
        return dest;
    }	
    
    static transform(srce, matrix, dest)
    {
        var xa = [ matrix[0]*srce.min.x, matrix[4]*srce.min.x, matrix[8] * srce.min.x ]; 
        var xb = [ matrix[0]*srce.max.x, matrix[4]*srce.max.x, matrix[8] * srce.max.x ]; 
        var ya = [ matrix[1]*srce.min.y, matrix[5]*srce.min.y, matrix[9] * srce.min.y ]; 
        var yb = [ matrix[1]*srce.max.y, matrix[5]*srce.max.y, matrix[9] * srce.max.y ];
        var za = [ matrix[2]*srce.min.z, matrix[6]*srce.min.z, matrix[10] * srce.min.z ]; 
        var zb = [ matrix[2]*srce.max.z, matrix[6]*srce.max.z, matrix[10] * srce.max.z ]; 
        
        dest.min.x = Math.min(xa[0], xb[0]) + Math.min(ya[0], yb[0]) + Math.min(za[0], zb[0]) + matrix[12+0];
        dest.max.x = Math.max(xa[0], xb[0]) + Math.max(ya[0], yb[0]) + Math.max(za[0], zb[0]) + matrix[12+0];
        dest.min.y = Math.min(xa[1], xb[1]) + Math.min(ya[1], yb[1]) + Math.min(za[1], zb[1]) + matrix[12+1];
        dest.max.y = Math.max(xa[1], xb[1]) + Math.max(ya[1], yb[1]) + Math.max(za[1], zb[1]) + matrix[12+1];
        dest.min.z = Math.min(xa[2], xb[2]) + Math.min(ya[2], yb[2]) + Math.min(za[2], zb[2]) + matrix[12+2];
        dest.max.z = Math.max(xa[2], xb[2]) + Math.max(ya[2], yb[2]) + Math.max(za[2], zb[2]) + matrix[12+2];
    }

};






