GM = {

    DEG2RAD: Math.PI / 180,
    RAD2DEG: 180 / Math.PI,
    clamp: function (value, min, max) { return Math.max(min, Math.min(max, value)); },
};


GM.Vector3 = class
{
    constructor(x, y, z)
    {
        this.x = x || 0;
        this.y = y || 0;
        this.z = z || 0;
    }
    
    clone() { return new GM.Vector3(this.x, this.y, this.z); }

    copy(v) {
        this.x = v.x;
        this.y = v.y;
        this.z = v.z;
        return this;
    }
    
    set(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
        return this;
    }

    readArray(array, offset) {
        this.x = array[offset];
        this.y = array[offset + 1];
        this.z = array[offset + 2];
        return this;
    }

    add(v) {
        this.x += v.x;
        this.y += v.y;
        this.z += v.z;
        return this;
    }
    sub(v) {

        this.x -= v.x;
        this.y -= v.y;
        this.z -= v.z;
        return this;
    }
    multiply(v) {
        this.x *= v.x;
        this.y *= v.y;
        this.z *= v.z;
        return this;
    }

    addScaledVector(v, s) {
        this.x += v.x * s;
        this.y += v.y * s;
        this.z += v.z * s;
        return this;
    }
    
    crossVectors(a, b) {
        var ax = a.x, ay = a.y, az = a.z;
        var bx = b.x, by = b.y, bz = b.z;
        this.x = ay * bz - az * by;
        this.y = az * bx - ax * bz;
        this.z = ax * by - ay * bx;
        return this;

    }	

    subVectors(a, b) {
        this.x = a.x - b.x;
        this.y = a.y - b.y;
        this.z = a.z - b.z;
        return this;
    }

    multiplyScalar(scalar) {
        if (isFinite(scalar)) {
            this.x *= scalar;
            this.y *= scalar;
            this.z *= scalar;
        } else {
            this.x = 0;
            this.y = 0;
            this.z = 0;
        }
        return this;
    }

    multiplyVectors(a, b) {
        this.x = a.x * b.x;
        this.y = a.y * b.y;
        this.z = a.z * b.z;
        return this;
    }

    applyMatrix3(m) {
        var x = this.x, y = this.y, z = this.z;
        var e = m.elements;
        this.x = e[0] * x + e[3] * y + e[6] * z;
        this.y = e[1] * x + e[4] * y + e[7] * z;
        this.z = e[2] * x + e[5] * y + e[8] * z;
        return this;
    }

    transform(m) {
        var x = this.x, y = this.y, z = this.z;
        var e = m.elements;
        this.x = e[0] * x + e[4] * y + e[8]  * z + e[12];
        this.y = e[1] * x + e[5] * y + e[9]  * z + e[13];
        this.z = e[2] * x + e[6] * y + e[10] * z + e[14];
        return this;
    }
    
    

    applyQuaternion(q) {
        var x = this.x, y = this.y, z = this.z;
        var qx = q.x, qy = q.y, qz = q.z, qw = q.w;
        // calculate quat * vector
        var ix =  qw * x + qy * z - qz * y;
        var iy =  qw * y + qz * x - qx * z;
        var iz =  qw * z + qx * y - qy * x;
        var iw = - qx * x - qy * y - qz * z;
        // calculate result * inverse quat
        this.x = ix * qw + iw * - qx + iy * - qz - iz * - qy;
        this.y = iy * qw + iw * - qy + iz * - qx - ix * - qz;
        this.z = iz * qw + iw * - qz + ix * - qy - iy * - qx;
        return this;
    }

    divide(v) {

        this.x /= v.x;
        this.y /= v.y;
        this.z /= v.z;

        return this;

    }
    
    divideScalar(scalar) {
        return this.multiplyScalar(1 / scalar);
    }

    min(v) {

        this.x = Math.min(this.x, v.x);
        this.y = Math.min(this.y, v.y);
        this.z = Math.min(this.z, v.z);
        return this;
    }

    max(v) {

        this.x = Math.max(this.x, v.x);
        this.y = Math.max(this.y, v.y);
        this.z = Math.max(this.z, v.z);

        return this;
    }

    negate() {
        this.x = - this.x;
        this.y = - this.y;
        this.z = - this.z;
        return this;
    }

    dot(v) {
        return this.x * v.x + this.y * v.y + this.z * v.z;
    }

    lengthSq() {
        return this.x * this.x + this.y * this.y + this.z * this.z;
    }

    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }

    normalize() {
        return this.divideScalar(this.length());
    }
    
    distanceTo(v) {  // TODO Performance
        return Math.sqrt(this.distanceToSquared(v));
    }

    distanceToSquared(v) {
        var dx = this.x - v.x, dy = this.y - v.y, dz = this.z - v.z;
        return dx * dx + dy * dy + dz * dz;
    }

    setFromMatrixColumn(m, index) {
        return this.readArray(m.elements, index * 4);
    }
    
    toJson() {
        return {
            x: this.x,
            y: this.y,
            z: this.z,
        }
    }
    
    static create(x,y,z)
    {
        return { x, y, z }
    }

    
    static mag(v)
    {
        return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    }
    
    static normalize(v, result)
    {
        var l = GM.Vector3.mag(v);
        result.x = v.x/l;
        result.y = v.y/l;
        result.z = v.z/l;
        return result;
    }
    
    static negate(v, result)
    {
        result.x = -v.x;
        result.y = -v.y;
        result.z = -v.z;
    }

    static cross(a, b, result)
    {
        var ax = a.x, ay = a.y, az = a.z;
        var bx = b.x, by = b.y, bz = b.z;
        result.x = ay * bz - az * by;
        result.y = az * bx - ax * bz;
        result.z = ax * by - ay * bx;
        return result;
    }
    
    static distance(a, b)
    {
        var dx = a.x - b.x;
        var dy = a.y - b.y;
        var dz = a.z - b.z;
        return Math.sqrt(dx*dx+ dy*dy + dz*dz);
    }
    
    static dot(a, b)
    {
        return a.x*b.x+ a.y*b.y + a.z*b.z;
    }
    
    static rotate(v, m, result) 
    {
        var x = v.x;
        var y = v.y;
        var z = v.z;
        result.x = m[0] * x + m[4] * y + m[8]  * z;
        result.y = m[1] * x + m[5] * y + m[9]  * z;
        result.z = m[2] * x + m[6] * y + m[10] * z;
        return result;
    }

    static addScalar(a, b, s, result) 
    {
        result.x = a.x + b.x*s;
        result.y = a.y + b.y*s;
        result.z = a.z + b.z*s;
        return result;
    }

    static copy(a, result) 
    {
        result.x = a.x;
        result.y = a.y;
        result.z = a.z;
        return result;
    }
    
    static scale(a, s, result) 
    {
        result.x = a.x*s;
        result.y = a.y*s;
        result.z = a.z*s;
        return result;
    }
    
    static transform(v,e, result) 
    {
        let x = v.x;
        var y = v.y;
        let z = v.z;
        result.x = e[0] * x + e[4] * y + e[8]  * z + e[12];
        result.y = e[1] * x + e[5] * y + e[9]  * z + e[13];
        result.z = e[2] * x + e[6] * y + e[10] * z + e[14];
        return result;
    }
    
    static subtract(a, s, result) 
    {
        result.x = a.x - s.x;
        result.y = a.y - s.y;
        result.z = a.z - s.z;
        return result;
    }
    
    static min(a, s, result) 
    {
        result.x = Math.min(a.x, s.x);
        result.y = Math.min(a.y, s.y);
        result.z = Math.min(a.z, s.z);
        return result;
    }

    static max(a, s, result) 
    {
        result.x = Math.max(a.x, s.x);
        result.y = Math.max(a.y, s.y);
        result.z = Math.max(a.z, s.z);
        return result;
    }
    
    static add(a, s, result) 
    {
        result.x = a.x + s.x;
        result.y = a.y + s.y;
        result.z = a.z + s.z;
        return result;
    }
    
    static sub(a, s, result) 
    {
        result = result || {}
        result.x = a.x - s.x;
        result.y = a.y - s.y;
        result.z = a.z - s.z;
        return result;
    }

    static sub3V(x,y,z, s, result) 
    {
        result = result || {}
        result.x = x - s.x;
        result.y = y - s.y;
        result.z = z - s.z;
        return result;
    }


    static read(v, array, offset) 
    {
        v.x = array[offset];
        v.y = array[offset + 1];
        v.z = array[offset + 2];
        return v;
    }

    static fromMatrix(matrix, dest) 
    {
        dest.x = matrix[12];
        dest.y = matrix[13];
        dest.z = matrix[14];
    }

}


GM.Ray = class 
{
    constructor(origin, direction)
    {
        this.origin = (origin !== undefined) ? origin : new GM.Vector3();
        this.direction = (direction !== undefined) ? direction : new GM.Vector3();
    }
    
    set(origin, direction) 
    {
        this.origin.copy(origin);
        this.direction.copy(direction);
        return this;
    };

    copy(ray) 
    {
        this.origin.copy(ray.origin);
        this.direction.copy(ray.direction);
    };

    transform(matrix4) 
    {
        this.direction.x += this.origin.x;
        this.direction.y += this.origin.y;
        this.direction.z += this.origin.z;
        this.direction.transform(matrix4);
        this.origin.transform(matrix4);
        this.direction.x -= this.origin.x;
        this.direction.y -= this.origin.y;
        this.direction.z -= this.origin.z;
        return this;
    }

    at(t, target) 
    {
        target.x = this.origin.x + this.direction.x*t;
        target.y = this.origin.y + this.direction.y*t;
        target.z = this.origin.z + this.direction.z*t;
        return target;
    }

    // TODO get rid of one of those two below
    intersectBox(box) 
    {
        var tmin, tmax, tymin, tymax, tzmin, tzmax;
        var faceMin = [0,0,0];
        var tface = 0;

        var invdirx = 1 / this.direction.x,
            invdiry = 1 / this.direction.y,
            invdirz = 1 / this.direction.z;

        var origin = this.origin;

        if (invdirx >= 0) {
            tmin = (box.min.x - origin.x) * invdirx;
            tmax = (box.max.x - origin.x) * invdirx;
            faceMin[0] = 0;
        } else {
            tmin = (box.max.x - origin.x) * invdirx;
            tmax = (box.min.x - origin.x) * invdirx;
            faceMin[0] = 1;
        }
        tface = faceMin[0];

        if (invdiry >= 0) {
            tymin = (box.min.y - origin.y) * invdiry;
            tymax = (box.max.y - origin.y) * invdiry;
            faceMin[1] = 2;
        } else {
            tymin = (box.max.y - origin.y) * invdiry;
            tymax = (box.min.y - origin.y) * invdiry;
            faceMin[1] = 3;
        }

        if ((tmin > tymax) || (tymin > tmax)) return null;

        // These lines also handle the case where tmin or tmax is NaN
        // (result of 0 * Infinity). x !== x returns true if x is NaN

        if (tymin > tmin || tmin !== tmin) 
        {
            tmin = tymin;
            tface = faceMin[1];
        }
        if (tymax < tmax || tmax !== tmax) 
        {
            tmax = tymax;
        }

        if (invdirz >= 0) {
            tzmin = (box.min.z - origin.z) * invdirz;
            tzmax = (box.max.z - origin.z) * invdirz;
            faceMin[2] = 4;
        } else {
            tzmin = (box.max.z - origin.z) * invdirz;
            tzmax = (box.min.z - origin.z) * invdirz;
            faceMin[2] = 5;
        }

        if ((tmin > tzmax) || (tzmin > tmax)) return null;

        if (tzmin > tmin || tmin !== tmin) 
        {
            tmin = tzmin;
            tface = faceMin[2];
        }
        
        if (tzmax < tmax || tmax !== tmax) 
        {
            tmax = tzmax;
        }

        //return point closest to the ray (positive side)

        if (tmax < 0) return null;

        return { distance: tmin, face: tface };
    }


    // same as above just with arrays
    intersectMinMax(min, max) 
    {
        var tmin, tmax, tymin, tymax, tzmin, tzmax;
        var tface = 0;

        var invdirx = 1 / this.direction.x,
            invdiry = 1 / this.direction.y,
            invdirz = 1 / this.direction.z;

        var origin = this.origin;

        if (invdirx >= 0) {
            tmin = (min[0] - origin.x) * invdirx;
            tmax = (max[0] - origin.x) * invdirx;
        } else {
            tmin = (max[0] - origin.x) * invdirx;
            tmax = (min[0] - origin.x) * invdirx;
        }

        if (invdiry >= 0) {
            tymin = (min[1] - origin.y) * invdiry;
            tymax = (max[1] - origin.y) * invdiry;
        } else {
            tymin = (max[1]- origin.y) * invdiry;
            tymax = (min[1] - origin.y) * invdiry;
        }

        if ((tmin > tymax) || (tymin > tmax)) return null;

        // These lines also handle the case where tmin or tmax is NaN
        // (result of 0 * Infinity). x !== x returns true if x is NaN

        if (tymin > tmin || tmin !== tmin) 
        {
            tmin = tymin;
        }
        if (tymax < tmax || tmax !== tmax) 
        {
            tmax = tymax;
        }

        if (invdirz >= 0) {
            tzmin = (min[2] - origin.z) * invdirz;
            tzmax = (max[2] - origin.z) * invdirz;
        } else {
            tzmin = (max[2] - origin.z) * invdirz;
            tzmax = (min[2] - origin.z) * invdirz;
        }

        if ((tmin > tzmax) || (tzmin > tmax)) return null;

        if (tzmin > tmin || tmin !== tmin) 
        {
            tmin = tzmin;
        }
        
        if (tzmax < tmax || tmax !== tmax) 
        {
            tmax = tzmax;
        }

        //return point closest to the ray (positive side)

        if (tmax < 0) return null;

        return tmin;
    }

    intersectPlane(plane, target) 
    {
        var t = -(GM.Vector3.dot(plane, this.origin) - plane.w) / GM.Vector3.dot(plane, this.direction);
        if  (t >= 0)
        {
            return this.at(t, target);
        }
        return null;
    }
    
    /*
    static init()
    {
        return 
        {
            origin : GM.Vector3.create(0,0,0),
            direction : GM.Vector3.create(0,0,-1)
        }
    }
    */
    static transform(srce, matrix, dest) 
    {
        GM.Vector3.add(srce.direction, srce.origin, dest.direction);
        GM.Vector3.transform(dest.direction, matrix, dest.direction);
        GM.Vector3.transform(srce.origin, matrix, dest.origin);
        GM.Vector3.sub(dest.direction, dest.origin, dest.direction);
        return dest;
    }
    
    
    static intersectPlane(ray, plane, dest)
    {
        //var denom = GL.Vector3.dot(plane, ray.direction);
        //var t = (plane.w - GL.Vector3.dot(plane, ray.origin))/denom;
        
        var denom = plane.x*ray.direction.x + plane.y*ray.direction.y + plane.z*ray.direction.z;
        var t = -(plane.x*ray.origin.x + plane.y*ray.origin.y + plane.z*ray.origin.z - plane.w)/denom;
        
        dest.x = ray.direction.x*t + ray.origin.x;
        dest.y = ray.direction.y*t + ray.origin.y;
        dest.z = ray.direction.z*t + ray.origin.z;
        return dest;
    }
};




GM.Plane = class 
{
    static create(x,y,z,w)
    {
        return { x:x, y:y, z:z, w:w };
    }
    
    static init(plane, x,y,z,w)
    {
        plane.x = x;
        plane.y = y;
        plane.z = z;
        plane.w = w;
        
        return plane;
    }
    
    static fromNormalPoint(normal, point, target) 
    { 
        GM.Vector3.copy(normal, target);
        target.w = GM.Vector3.dot(point, normal);
    }

    static copy(plane, target) 
    {
        GM.Vector3.copy(plane, target);
        target.w = plane.w;
    }

    static normalize(plane, target) 
    {
        var scalar = 1.0/GM.Vector3.mag(plane);
        GM.Vector3.scale(plane, scalar, target);
        target.w = plane.w*scalar;
    }
    
    static transform(plane, matrix, result) 
    {
        let x = plane.x;
        var y = plane.y;
        let z = plane.z;
        let w = plane.w;
        result.x = matrix[0] * x + matrix[4] * y + matrix[8]  * z + matrix[12]*w;
        result.y = matrix[1] * x + matrix[5] * y + matrix[9]  * z + matrix[13]*w;
        result.z = matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14]*w;
        result.w = matrix[3] * x + matrix[7] * y + matrix[11] * z + matrix[15]*w;
        return result;
    }
};







GM.Quaternion = class 
{
    
    constructor(x, y, z, w) 
    {
        this.x = x || 0;
        this.y = y || 0;
        this.z = z || 0;
        this.w = (w !== undefined) ? w : 1;
    };

    fromEuler(angles)  // YXZ order 
    {
        var c1 = Math.cos(angles.x/2);
        var c2 = Math.cos(angles.y/2);
        var c3 = Math.cos(angles.z/2);
        var s1 = Math.sin(angles.x/2);
        var s2 = Math.sin(angles.y/2);
        var s3 = Math.sin(angles.z/2);
    
        this.x = s1 * c2 * c3 + c1 * s2 * s3;
        this.y = c1 * s2 * c3 - s1 * c2 * s3;
        this.z = c1 * c2 * s3 - s1 * s2 * c3;
        this.w = c1 * c2 * c3 + s1 * s2 * s3;
    };
    
    fromAxisAngle(axis, angle) 
    {
        var halfAngle = angle / 2, s = Math.sin(halfAngle);
    
        this.x = axis.x * s;
        this.y = axis.y * s;
        this.z = axis.z * s;
        this.w = Math.cos(halfAngle);
    };
    
    slerp(qb, t) 
    {
        var x = this.x, y = this.y, z = this.z, w = this.w;
    
        var cosHalfTheta = w * qb.w + x * qb.x + y * qb.y + z * qb.z;
    
        if (cosHalfTheta < 0) 
        {
            this.w = - qb.w;
            this.x = - qb.x;
            this.y = - qb.y;
            this.z = - qb.z;
            cosHalfTheta = - cosHalfTheta;
        } 
        else 
        {
            this.w = qb.w;
            this.x = qb.x;
            this.y = qb.y;
            this.z = qb.z;
        }
    
        if (cosHalfTheta >= 1.0) 
        {
            this.w = w;
            this.x = x;
            this.y = y;
            this.z = z;
            return this;
        }
    
        var sinHalfTheta = Math.sqrt(1.0 - cosHalfTheta * cosHalfTheta);
    
        if (Math.abs(sinHalfTheta) < 0.001) 
        {
            this.w = 0.5 * (w + this.w);
            this.x = 0.5 * (x + this.x);
            this.y = 0.5 * (y + this.y);
            this.z = 0.5 * (z + this.z);
            return this;
        }
    
        var halfTheta = Math.atan2(sinHalfTheta, cosHalfTheta);
        var ratioA = Math.sin((1 - t) * halfTheta) / sinHalfTheta,
        ratioB = Math.sin(t * halfTheta) / sinHalfTheta;
    
        this.w = (w * ratioA + this.w * ratioB);
        this.x = (x * ratioA + this.x * ratioB);
        this.y = (y * ratioA + this.y * ratioB);
        this.z = (z * ratioA + this.z * ratioB);
        return this;
    };
    
    

    static multiply(a, b, dest) 
    {
        const qax = a.x, qay = a.y, qaz = a.z, qaw = a.w;
        const qbx = b.x, qby = b.y, qbz = b.z, qbw = b.w;

        dest.x = qax * qbw + qaw * qbx + qay * qbz - qaz * qby;
        dest.y = qay * qbw + qaw * qby + qaz * qbx - qax * qbz;
        dest.z = qaz * qbw + qaw * qbz + qax * qby - qay * qbx;
        dest.w = qaw * qbw - qax * qbx - qay * qby - qaz * qbz;

        return dest;
    }
        
    
    static between(from, to, dest) 
    {
        let r = GM.Vector3.dot(from, to) + 1;

        if (r < Number.EPSILON) 
        {
            if (Math.abs(from.x) > Math.abs(from.z)) 
            {
                dest.x = -from.y;
                dest.y = from.x;
                dest.z = 0;
                dest.w = 0;

            } 
            else 
            {
                dest.x = 0;
                dest.y = -from.z;
                dest.z = from.y;
                dest.w = 0;
            }

        } 
        else 
        {
            dest.x = from.y * to.z - from.z * to.y;
            dest.y = from.z * to.x - from.x * to.z;
            dest.z = from.x * to.y - from.y * to.x;
            dest.w = r;
        }
        
        
        // normalize
        let length = Math.sqrt(dest.x * dest.x + dest.y * dest.y + dest.z * dest.z + dest.w * dest.w );
        if (length > Number.EPSILON)
        {
            dest.x = dest.x / length;
            dest.y = dest.y / length;
            dest.z = dest.z / length;
            dest.w = dest.w / length;
        }
        else
        {
            dest.x = 0;
            dest.y = 0;
            dest.z = 0;
            dest.w = 1;
        }

        return dest;
    }	
    
    static axisAngle(x,y,z, angle, dest) 
    {
        let halfAngle = angle / 2; 
        let s = Math.sin(halfAngle);
        dest.x = x * s;
        dest.y = y * s;
        dest.z = z * s;
        dest.w = Math.cos(halfAngle);
        return dest;
    };
    
    
    
    static slerp(qa, qb, qm, t) 
    {
        qm.x = qa.x;
        qm.y = qa.y;
        qm.z = qa.z;
        qm.w = qa.w;
    
        qm.slerp(qb, t);
    };
    
    static create(x,y,z,w)
    {
        return { x:x, y:y, z:z, w:w };
    }
}





GM.Matrix3 = function () 
{
    this.elements = new Float32Array([
        1, 0, 0,
        0, 1, 0,
        0, 0, 1
    ]);
};

GM.Matrix3.prototype.clone = function () 
{
    var clone = new GM.Matrix3()
    clone.elements.set(this.elements);
    return clone;
}



GM.Matrix4 = class 
{
    static create()
    {
        return new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ]);
    }

    static init(value)
    {
        return new Float32Array(value);
    }
    

    static transpose(srce, dest)
    {
        for (var i=0; i<4; i++)
        {
            for (var j=0; j<4; j++)
            {
                dest[i*4+j] = srce[i+j*4];
            }
        }
        return dest;
    }

    static invert(srce, dest)
    {
        let n11 = srce[0], n21 = srce[1], n31 = srce[2], n41 = srce[3];
        let n12 = srce[4], n22 = srce[5], n32 = srce[6], n42 = srce[7];
        let n13 = srce[8], n23 = srce[9], n33 = srce[10], n43 = srce[11];
        let n14 = srce[12], n24 = srce[13], n34 = srce[14], n44 = srce[15];

        let t11 = n23 * n34 * n42 - n24 * n33 * n42 + n24 * n32 * n43 - n22 * n34 * n43 - n23 * n32 * n44 + n22 * n33 * n44;
        let t12 = n14 * n33 * n42 - n13 * n34 * n42 - n14 * n32 * n43 + n12 * n34 * n43 + n13 * n32 * n44 - n12 * n33 * n44;
        let t13 = n13 * n24 * n42 - n14 * n23 * n42 + n14 * n22 * n43 - n12 * n24 * n43 - n13 * n22 * n44 + n12 * n23 * n44;
        let t14 = n14 * n23 * n32 - n13 * n24 * n32 - n14 * n22 * n33 + n12 * n24 * n33 + n13 * n22 * n34 - n12 * n23 * n34;

        let det = n11 * t11 + n21 * t12 + n31 * t13 + n41 * t14;
        
        let detInv = 1 / det;

        dest[0] = t11 * detInv;
        dest[1] = (n24 * n33 * n41 - n23 * n34 * n41 - n24 * n31 * n43 + n21 * n34 * n43 + n23 * n31 * n44 - n21 * n33 * n44) * detInv;
        dest[2] = (n22 * n34 * n41 - n24 * n32 * n41 + n24 * n31 * n42 - n21 * n34 * n42 - n22 * n31 * n44 + n21 * n32 * n44) * detInv;
        dest[3] = (n23 * n32 * n41 - n22 * n33 * n41 - n23 * n31 * n42 + n21 * n33 * n42 + n22 * n31 * n43 - n21 * n32 * n43) * detInv;

        dest[4] = t12 * detInv;
        dest[5] = (n13 * n34 * n41 - n14 * n33 * n41 + n14 * n31 * n43 - n11 * n34 * n43 - n13 * n31 * n44 + n11 * n33 * n44) * detInv;
        dest[6] = (n14 * n32 * n41 - n12 * n34 * n41 - n14 * n31 * n42 + n11 * n34 * n42 + n12 * n31 * n44 - n11 * n32 * n44) * detInv;
        dest[7] = (n12 * n33 * n41 - n13 * n32 * n41 + n13 * n31 * n42 - n11 * n33 * n42 - n12 * n31 * n43 + n11 * n32 * n43) * detInv;

        dest[8] = t13 * detInv;
        dest[9] = (n14 * n23 * n41 - n13 * n24 * n41 - n14 * n21 * n43 + n11 * n24 * n43 + n13 * n21 * n44 - n11 * n23 * n44) * detInv;
        dest[10] = (n12 * n24 * n41 - n14 * n22 * n41 + n14 * n21 * n42 - n11 * n24 * n42 - n12 * n21 * n44 + n11 * n22 * n44) * detInv;
        dest[11] = (n13 * n22 * n41 - n12 * n23 * n41 - n13 * n21 * n42 + n11 * n23 * n42 + n12 * n21 * n43 - n11 * n22 * n43) * detInv;

        dest[12] = t14 * detInv;
        dest[13] = (n13 * n24 * n31 - n14 * n23 * n31 + n14 * n21 * n33 - n11 * n24 * n33 - n13 * n21 * n34 + n11 * n23 * n34) * detInv;
        dest[14] = (n14 * n22 * n31 - n12 * n24 * n31 - n14 * n21 * n32 + n11 * n24 * n32 + n12 * n21 * n34 - n11 * n22 * n34) * detInv;
        dest[15] = (n12 * n23 * n31 - n13 * n22 * n31 + n13 * n21 * n32 - n11 * n23 * n32 - n12 * n21 * n33 + n11 * n22 * n33) * detInv;
        
        return dest;
    }
    
    
    static quaternion(q, dest) 
    {
        let x = q.x, y = q.y, z = q.z, w = q.w;
        let x2 = x + x, y2 = y + y, z2 = z + z;
        let xx = x * x2, xy = x * y2, xz = x * z2;
        let yy = y * y2, yz = y * z2, zz = z * z2;
        let wx = w * x2, wy = w * y2, wz = w * z2;

        dest[0] = 1 - (yy + zz);
        dest[4] = xy - wz;
        dest[8] = xz + wy;

        dest[1] = xy + wz;
        dest[5] = 1 - (xx + zz);
        dest[9] = yz - wx;

        dest[2] = xz - wy;
        dest[6] = yz + wx;
        dest[10] = 1 - (xx + yy);

        // last column
        dest[3] = 0;
        dest[7] = 0;
        dest[11] = 0;

        // bottom row
        dest[12] = 0;
        dest[13] = 0;
        dest[14] = 0;
        dest[15] = 1;

        return dest;
    }
    
    
    static fromEuler(angles, dest)
    {
        var a = Math.cos(angles.x), b = Math.sin(angles.x);
        var c = Math.cos(angles.y), d = Math.sin(angles.y);
        var e = Math.cos(angles.z), f = Math.sin(angles.z);
        var ce = c * e, cf = c * f, de = d * e, df = d * f;
        
        //'YXZ'
        dest[0] = ce + df * b;
        dest[4] = de * b - cf;
        dest[8] = a * d;

        dest[1] = a * f;
        dest[5] = a * e;
        dest[9] = - b;

        dest[2] = cf * b - de;
        dest[6] = df + ce * b;
        dest[10] = a * c;
        
        return dest;
    }
    
    
/*
var x = euler.x, y = euler.y, z = euler.z;
var a = Math.cos( x ), b = Math.sin( x );
var c = Math.cos( y ), d = Math.sin( y );
var e = Math.cos( z ), f = Math.sin( z );

if ( euler.order === 'XYZ' ) {

    var ae = a * e, af = a * f, be = b * e, bf = b * f;

    te[ 0 ] = c * e;
    te[ 4 ] = - c * f;
    te[ 8 ] = d;

    te[ 1 ] = af + be * d;
    te[ 5 ] = ae - bf * d;
    te[ 9 ] = - b * c;

    te[ 2 ] = bf - ae * d;
    te[ 6 ] = be + af * d;
    te[ 10 ] = a * c;

} else if ( euler.order === 'YXZ' ) {

    var ce = c * e, cf = c * f, de = d * e, df = d * f;

    te[ 0 ] = ce + df * b;
    te[ 4 ] = de * b - cf;
    te[ 8 ] = a * d;

    te[ 1 ] = a * f;
    te[ 5 ] = a * e;
    te[ 9 ] = - b;

    te[ 2 ] = cf * b - de;
    te[ 6 ] = df + ce * b;
    te[ 10 ] = a * c;

} else if ( euler.order === 'ZXY' ) {

    var ce = c * e, cf = c * f, de = d * e, df = d * f;

    te[ 0 ] = ce - df * b;
    te[ 4 ] = - a * f;
    te[ 8 ] = de + cf * b;

    te[ 1 ] = cf + de * b;
    te[ 5 ] = a * e;
    te[ 9 ] = df - ce * b;

    te[ 2 ] = - a * d;
    te[ 6 ] = b;
    te[ 10 ] = a * c;

} else if ( euler.order === 'ZYX' ) {

    var ae = a * e, af = a * f, be = b * e, bf = b * f;

    te[ 0 ] = c * e;
    te[ 4 ] = be * d - af;
    te[ 8 ] = ae * d + bf;

    te[ 1 ] = c * f;
    te[ 5 ] = bf * d + ae;
    te[ 9 ] = af * d - be;

    te[ 2 ] = - d;
    te[ 6 ] = b * c;
    te[ 10 ] = a * c;

} else if ( euler.order === 'YZX' ) {

    var ac = a * c, ad = a * d, bc = b * c, bd = b * d;

    te[ 0 ] = c * e;
    te[ 4 ] = bd - ac * f;
    te[ 8 ] = bc * f + ad;

    te[ 1 ] = f;
    te[ 5 ] = a * e;
    te[ 9 ] = - b * e;

    te[ 2 ] = - d * e;
    te[ 6 ] = ad * f + bc;
    te[ 10 ] = ac - bd * f;

} else if ( euler.order === 'XZY' ) {

    var ac = a * c, ad = a * d, bc = b * c, bd = b * d;

    te[ 0 ] = c * e;
    te[ 4 ] = - f;
    te[ 8 ] = d * e;

    te[ 1 ] = ac * f + bd;
    te[ 5 ] = a * e;
    te[ 9 ] = ad * f - bc;

    te[ 2 ] = bc * f - ad;
    te[ 6 ] = b * e;
    te[ 10 ] = bd * f + ac;

}
    */

    static position(v, dest)
    {
        dest[12] = v.x;
        dest[13] = v.y;
        dest[14] = v.z;
        return dest;
    }
    
    static copy(srce, dest)
    {
        dest.set(srce);
        return srce;
    }

    static multiply(a, b, result)
    {
        var a11 = a[0], a12 = a[4], a13 = a[8], a14 = a[12];
        var a21 = a[1], a22 = a[5], a23 = a[9], a24 = a[13];
        var a31 = a[2], a32 = a[6], a33 = a[10], a34 = a[14];
        var a41 = a[3], a42 = a[7], a43 = a[11], a44 = a[15];

        var b11 = b[0], b12 = b[4], b13 = b[8], b14 = b[12];
        var b21 = b[1], b22 = b[5], b23 = b[9], b24 = b[13];
        var b31 = b[2], b32 = b[6], b33 = b[10], b34 = b[14];
        var b41 = b[3], b42 = b[7], b43 = b[11], b44 = b[15];

        result[0] = a11 * b11 + a12 * b21 + a13 * b31 + a14 * b41;
        result[4] = a11 * b12 + a12 * b22 + a13 * b32 + a14 * b42;
        result[8] = a11 * b13 + a12 * b23 + a13 * b33 + a14 * b43;
        result[12] = a11 * b14 + a12 * b24 + a13 * b34 + a14 * b44;

        result[1] = a21 * b11 + a22 * b21 + a23 * b31 + a24 * b41;
        result[5] = a21 * b12 + a22 * b22 + a23 * b32 + a24 * b42;
        result[9] = a21 * b13 + a22 * b23 + a23 * b33 + a24 * b43;
        result[13] = a21 * b14 + a22 * b24 + a23 * b34 + a24 * b44;

        result[2] = a31 * b11 + a32 * b21 + a33 * b31 + a34 * b41;
        result[6] = a31 * b12 + a32 * b22 + a33 * b32 + a34 * b42;
        result[10] = a31 * b13 + a32 * b23 + a33 * b33 + a34 * b43;
        result[14] = a31 * b14 + a32 * b24 + a33 * b34 + a34 * b44;

        result[3] = a41 * b11 + a42 * b21 + a43 * b31 + a44 * b41;
        result[7] = a41 * b12 + a42 * b22 + a43 * b32 + a44 * b42;
        result[11] = a41 * b13 + a42 * b23 + a43 * b33 + a44 * b43;
        result[15] = a41 * b14 + a42 * b24 + a43 * b34 + a44 * b44;

        return result;
    }

    static yAxisT(matrix, dest)
    {
        dest.x = matrix[4];
        dest.y = matrix[5];
        dest.z = matrix[6];
        return dest;
    }

    static yAxis(matrix, dest)
    {
        dest.x = matrix[1];
        dest.y = matrix[5];
        dest.z = matrix[9];
        return dest;
    }

};




GM.Euler = class 
{
    constructor(x, y, z)
    {
        this.x = x || 0;
        this.y = y || 0;
        this.z = z || 0;
    }


    fromQuaternion(q) 
    {
        var x2 = q.x + q.x; 
        var y2 = q.y + q.y; 
        var z2 = q.z + q.z;
        var xx = q.x * x2; 
        var xy = q.x * y2; 
        var xz = q.x * z2;
        var yy = q.y * y2; 
        var yz = q.y * z2; 
        var zz = q.z * z2;
        var wx = q.w * x2; 
        var wy = q.w * y2; 
        var wz = q.w * z2;

        this.x = Math.asin(- GM.clamp(yz - wx, - 1, 1));

        if (Math.abs(yz - wx) < 0.99999) 
        {
            this.y = Math.atan2(xz + wy, 1-(xx + yy));
            this.z = Math.atan2(xy + wz, 1-(xx + zz));
        } 
        else 
        {
            this.y = Math.atan2(wy - xz, 1-(yy + zz));
            this.z = 0;
        }
    };

    toJson() 
    {
        return { x: this.x, y: this.y, z: this.z, };
    }

    static create(x,y,z) 
    {
        return { x, y, z};
    }


    static fromMatrix(matrix, dest) 
    {
        var m11 = matrix[0], m12 = matrix[4], m13 = matrix[8];
        var m21 = matrix[1], m22 = matrix[5], m23 = matrix[9];
        var m31 = matrix[2], m32 = matrix[6], m33 = matrix[10];

        // to 'YXZ' order
        dest.x = Math.asin(-GM.clamp(m23, -1, 1));

        if (Math.abs(m23) < 0.99999) 
        {
            dest.y = Math.atan2(m13, m33);
            dest.z = Math.atan2(m21, m22);
        } 
        else 
        {
            dest.y = Math.atan2(-m31, m11);
            dest.z = 0;
        }
    }
    
    
    
    static convert(srce, dest, order) 
    {
        var a = Math.cos(srce.x), b = Math.sin(srce.x);
        var c = Math.cos(srce.y), d = Math.sin(srce.y);
        var e = Math.cos(srce.z), f = Math.sin(srce.z);
        
        let matrix = GM.Matrix4.create();
        if (order === 'XYZ') 
        {
            let ae = a * e, af = a * f, be = b * e, bf = b * f;
        
            matrix[0] = c * e;
            matrix[4] = - c * f;
            matrix[8] = d;
        
            matrix[1] = af + be * d;
            matrix[5] = ae - bf * d;
            matrix[9] = - b * c;
        
            matrix[2] = bf - ae * d;
            matrix[6] = be + af * d;
            matrix[10] = a * c;
        } 
        else if (order === 'YXZ') 
        {
            let ce = c * e, cf = c * f, de = d * e, df = d * f;
        
            matrix[0] = ce + df * b;
            matrix[4] = de * b - cf;
            matrix[8] = a * d;
        
            matrix[1] = a * f;
            matrix[5] = a * e;
            matrix[9] = - b;
        
            matrix[2] = cf * b - de;
            matrix[6] = df + ce * b;
            matrix[10] = a * c;
        } 
        else if (order === 'ZXY') 
        {
            let ce = c * e, cf = c * f, de = d * e, df = d * f;
        
            matrix[0] = ce - df * b;
            matrix[4] = - a * f;
            matrix[8] = de + cf * b;
        
            matrix[1] = cf + de * b;
            matrix[5] = a * e;
            matrix[9] = df - ce * b;
        
            matrix[2] = - a * d;
            matrix[6] = b;
            matrix[1] = a * c;
        } 
        else if (order === 'ZYX') 
        {
        
            let ae = a * e, af = a * f, be = b * e, bf = b * f;
        
            matrix[0] = c * e;
            matrix[4] = be * d - af;
            matrix[8] = ae * d + bf;
        
            matrix[1] = c * f;
            matrix[5] = bf * d + ae;
            matrix[9] = af * d - be;
        
            matrix[2] = - d;
            matrix[6] = b * c;
            matrix[10] = a * c;
        } 
        else if (order === 'YZX') 
        {
            let ac = a * c, ad = a * d, bc = b * c, bd = b * d;
        
            matrix[0] = c * e;
            matrix[4] = bd - ac * f;
            matrix[8] = bc * f + ad;
        
            matrix[1] = f;
            matrix[5] = a * e;
            matrix[9] = - b * e;
        
            matrix[2] = - d * e;
            matrix[6] = ad * f + bc;
            matrix[10] = ac - bd * f;
        } 
        else if (order === 'XZY') 
        {
            let ac = a * c, ad = a * d, bc = b * c, bd = b * d;
        
            matrix[0] = c * e;
            matrix[4] = - f;
            matrix[8] = d * e;
        
            matrix[1] = ac * f + bd;
            matrix[5] = a * e;
            matrix[9] = ad * f - bc;
        
            matrix[2] = bc * f - ad;
            matrix[6] = b * e;
            matrix[10] = bd * f + ac;
        }	
        
        GM.Euler.fromMatrix(matrix,dest)
    }

    
    static zAxisT(angles, dest)
    {
        var a = Math.cos(angles.x), b = Math.sin(angles.x);
        var c = Math.cos(angles.y), d = Math.sin(angles.y);
        
        //'YXZ'
        dest.x = a * d;
        dest.y = - b;
        dest.z = a * c;
        
        return dest;
    }

    static fromDirection(direction)
    {
        return { x:-Math.asin(-direction.y), y:Math.atan2(-direction.x,-direction.z), z:0 };
    }

    static copy(srce, dest)
    {
        dest.x = srce.x;
        dest.y = srce.y;
        dest.z = srce.z;
        
        return dest;
    }

};





GM.Frustum = class 
{
    static create()
    {
        return [
                GM.Plane.create(1,0,0,0),
                GM.Plane.create(1,0,0,0),
                GM.Plane.create(1,0,0,0),
                GM.Plane.create(1,0,0,0),
                GM.Plane.create(1,0,0,0),
                GM.Plane.create(1,0,0,0)
            ];
    }
    
    static init(frustum, matrix)
    {
        let me0 = matrix[0], me1 = matrix[1], me2 = matrix[2], me3 = matrix[3];
        let me4 = matrix[4], me5 = matrix[5], me6 = matrix[6], me7 = matrix[7];
        let me8 = matrix[8], me9 = matrix[9], me10 = matrix[10], me11 = matrix[11];
        let me12 = matrix[12], me13 = matrix[13], me14 = matrix[14], me15 = matrix[15];
        
        GM.Plane.init(frustum[0], me3 - me0, me7 - me4, me11 - me8, me15 - me12);
        GM.Plane.init(frustum[1], me3 + me0, me7 + me4, me11 + me8, me15 + me12);
        GM.Plane.init(frustum[2], me3 + me1, me7 + me5, me11 + me9, me15 + me13);
        GM.Plane.init(frustum[3], me3 - me1, me7 - me5, me11 - me9, me15 - me13);
        GM.Plane.init(frustum[4], me3 - me2, me7 - me6, me11 - me10, me15 - me14);  // far plane
        GM.Plane.init(frustum[5], me3 + me2, me7 + me6, me11 + me10, me15 + me14);  // near plane
        
        GM.Plane.normalize(frustum[0], frustum[0]);
        GM.Plane.normalize(frustum[1], frustum[1]);
        GM.Plane.normalize(frustum[2], frustum[2]);
        GM.Plane.normalize(frustum[3], frustum[3]);
        GM.Plane.normalize(frustum[4], frustum[4]);
        GM.Plane.normalize(frustum[5], frustum[5]);
        return frustum;
    }
    
    static transform(srce, matrix, dest)
    {
        GM.Matrix4.transpose(matrix, GM.Frustum.matrix);
        GM.Matrix4.invert(GM.Frustum.matrix, GM.Frustum.matrix);

        for (var i=0; i<srce.length; i++)
        {
            GM.Plane.transform(srce[i], GM.Frustum.matrix, dest[i]);
        }
    }
    
    static intersectsBox(frustum, box) 
    {
        for (var i = 0; i < 5 ; i ++) 
        {
            var plane = frustum[i];

            var d1 = GM.Vector3.dot(plane,{x: plane.x > 0 ? box.min.x : box.max.x, y: plane.y > 0 ? box.min.y : box.max.y, z: plane.z > 0 ? box.min.z : box.max.z}) + plane.w;
            var d2 = GM.Vector3.dot(plane,{x: plane.x > 0 ? box.max.x : box.min.x, y: plane.y > 0 ? box.max.y : box.min.y, z: plane.z > 0 ? box.max.z : box.min.z}) + plane.w;
            // if both outside plane, no intersection
            if (d1 < 0 && d2 < 0) 
            {
                return false;
            }
        }
        
        // near plane
        var plane = frustum[5];
        
        var d1 = GM.Vector3.dot(plane, {x: plane.x > 0 ? box.min.x : box.max.x, y: plane.y > 0 ? box.min.y : box.max.y, z: plane.z > 0 ? box.min.z : box.max.z}) + plane.w;
        var d2 = GM.Vector3.dot(plane, {x: plane.x > 0 ? box.max.x : box.min.x, y: plane.y > 0 ? box.max.y : box.min.y, z: plane.z > 0 ? box.max.z : box.min.z}) + plane.w;
        // if both outside plane, no intersection
        if (d1 < 0 && d2 < 0) 
        {
            return false;
        }

        box.nearDistance = Math.max(0.0,Math.min(d1,d2));
        return true;	
    }
    
    static farDistance(frustum, box) 
    {
        var farDistance = Number.POSITIVE_INFINITY;
        for (var i=0; i<6; i ++) 
        {
            var plane = frustum[i];
            farDistance = Math.min(GM.Vector3.dot(plane, {x: plane.x > 0 ? box.min.x : box.max.x, y: plane.y > 0 ? box.min.y : box.max.y, z: plane.z > 0 ? box.min.z : box.max.z}) + plane.w, farDistance);
            farDistance = Math.min(GM.Vector3.dot(plane, {x: plane.x > 0 ? box.max.x : box.min.x, y: plane.y > 0 ? box.max.y : box.min.y, z: plane.z > 0 ? box.max.z : box.min.z}) + plane.w, farDistance);
        }
        return farDistance;
    }	

    static copy(srce, dest)
    {
        for (var i=0; i<6; i++)
        {
            GM.Plane.copy(srce[i], dest[i]);
        }
    }

    
};

GM.Frustum.matrix = GM.Matrix4.create(); 



//
// Projection
//
GM.Projection = class  
{
    constructor(type)
    {
        this.matrix = GM.Matrix4.create();
        this.inverse = GM.Matrix4.create();

        this.mvpMatrix = GM.Matrix4.create(); 
        this.mvpInverse = GM.Matrix4.create();

        this.type = type;
        this.farOffset = 1;
        this.nearOffset = 0;
        this.far = 100000;
        this.near = 0.1;
    }
    
    update(camMatrix, camInverse, viewport) 
    {
        GM.Matrix4.invert(this.matrix, this.inverse)
        GM.Matrix4.multiply(this.matrix, camInverse, this.mvpMatrix);
        GM.Matrix4.multiply(camMatrix, this.inverse, this.mvpInverse);
    };

    setRange(near, far) 
    {
        this.near = near;
        this.far = far;
    }

    getNear() 
    {
        return this.near;
    }

    getFar() 
    {
        return this.far;
    }

    set(json) 
    {
    };	

    toJson() 
    {
        return { 
        };
    };
};



// Perspective
GM.PerspectiveProjection = class extends GM.Projection
{
    constructor(fov)
    {
        super('Perspective');

        this.setFov(fov);
    }

    update(camMatrix, camInverse, viewport) 
    {
        let near = this.near;
        let far = this.far;
        let aspect = viewport.width/viewport.height;

        this.fovV = this.fovH/aspect;

        let f = 1/this.fovV;
        let e = this.matrix;
        e[0] = f/aspect;	e[4] = 0;	e[8] = 0;					    e[12] = 0;
        e[1] = 0;		    e[5] = f;	e[9] = 0;						e[13] = 0;
        e[2] = 0;		    e[6] = 0;	e[10] = (far+near)/(near-far);	e[14] = 2*far*near/(near-far);
        e[3] = 0;		    e[7] = 0;	e[11] = -1;						e[15] = 0;

        super.update(camMatrix, camInverse, viewport);
    };

    setFov(degrees)
    {
        this.fovH = Math.tan(GM.DEG2RAD * degrees * 0.5);
    }

    project(worldPoint)
    {
        var x = worldPoint.x; 
        var y = worldPoint.y; 
        var z = worldPoint.z;
        var e = this.mvpMatrix;
        var d = 1/(e[3] * x + e[7] * y + e[11] * z + e[15]); // perspective divide
        
        if (d<0)
        {
            d=-d;
        }
        
        var screenPoint = new GM.Vector3();
        screenPoint.x = (e[0] * x + e[4] * y + e[8] * z + e[12]) * d;
        screenPoint.y = (e[1] * x + e[5] * y + e[9] * z + e[13]) * d;
        screenPoint.z = (e[2] * x + e[6] * y + e[10] * z + e[14]) * d;
        return screenPoint;
    }

    unproject(screenPoint, worldPoint)
    {
        var x = screenPoint.x; 
        var y = screenPoint.y;
        var e = this.mvpInverse;
        var d = 1/(e[3] * x + e[7] * y + e[11] + e[15]); // perspective divide
        
        if (d<0)
        {
            d=-d;
        }
        
        worldPoint.x = (e[0] * x + e[4] * y + e[8] + e[12]) * d;
        worldPoint.y = (e[1] * x + e[5] * y + e[9] + e[13]) * d;
        worldPoint.z = (e[2] * x + e[6] * y + e[10] + e[14]) * d;
        return worldPoint;
    }
    

    //
    // Far/near
    //
    setRange2(position, aabb) 
    {
        var min = aabb.min;
        var max = aabb.max;
        var d2 = 0;
        
        // distance to aabb
        var d = 0;
        if (position.x < min.x)
        {
            d = min.x - position.x;
        }
        else if (position.x > max.x)
        {
            d = position.x - max.x;
        }
        d2 += d*d;

        d = 0;
        if (position.y < min.y)
        {
            d = min.y - position.y;
        }
        else if (position.y > max.y)
        {
            d = position.y - max.y;
        }
        d2 += d*d;

        d = 0;
        if (position.z < min.z)
        {
            d = min.z - position.z;
        }
        else if (position.z > max.z)
        {
            d = position.z - max.z;
        }
        d2 += d*d;

        let diagonal = GL.BoundingBox.diagonal(aabb);
        var near = Math.max(diagonal/1000, Math.sqrt(d2));
        
        this.near = near/2.0;
        this.far = near + diagonal;
    }

    getRay(screenPoint, camera, ray) 
    {
        this.unproject(screenPoint, ray.direction);
        ray.direction.sub(camera.position).normalize();
        ray.origin.copy(camera.position);
        return ray;
    };


    toJson() 
    {
        var object = super.toJson();
        object.fovV = this.fovV;
        object.fovH = this.fovH;
        return object;
    };
};








//
//Camera
//

GM.Camera = class  
{
    constructor(viewport)
    {
        this.viewport = viewport;

        this.position = new GM.Vector3();
        this.rotation = new GM.Euler();

        // TODO these axes are transposes ... rename to ...T
        this.xAxis = GM.Vector3.create(1,0,0);   
        this.yAxis = GM.Vector3.create(0,1,0); 
        this.zAxis = GM.Vector3.create(0,0,-1);
        
        this.ray = new GM.Ray(new GM.Vector3(0,0,0), new GM.Vector3(0,0,-1));
        
        this.moving = false;
        this.toggle = false;
    }
    
    set(camera)
    {
        this.toggle = true;
    }
    
    changed()
    {
        let toggle = this.toggle;
        this.toggle = false;
        return toggle;
    }
    
    screenToCamera(event)
    {
        return { 
                x:   (event.pageX/this.viewport.width)*2 - 1, 
                y: - (event.pageY/this.viewport.height)*2 + 1 
        };
    };
}



//
// 3D camera
//
GM.CameraMVP = class extends GM.Camera
{
    constructor(viewport, projection)
    {
        super(viewport);
        
        this.projection = projection;

        // camera matrix
        this.matrix = GM.Matrix4.create();
        this.inverse = GM.Matrix4.create();
        this.modelViewMatrix = GM.Matrix4.create();
        
        this.frustum = GM.Frustum.create();
    }

    set(camera)
    {
        super.set();
        
        if (camera.matrix)
        {
            /*	 AAAAAAA   
            let matrix = GM.Matrix4.init(camera.matrix);
            let orient1 = GM.Matrix4.init([1,0,0,0,
                                          0,0,-1,0,
                                          0,1,0,0,
                                          0,0,0,1]);

            GM.Matrix4.multiply(orient1, matrix, this.matrix);
            
            console.log("FIRST");
            console.log(this.matrix);
            
            let orient2 = GM.Matrix4.init([-1,0,0,0,
                                           0,1,0,0,
                                           0,0,1,0,
                                           0,0,0,1]);
            GM.Matrix4.multiply(this.matrix, orient2, this.matrix);
            
            console.log(this.matrix);
            */  
            
            GM.Euler.fromMatrix(camera.matrix, this.rotation);
            GM.Vector3.fromMatrix(camera.matrix, this.position);
        }
        else
        {
            if (camera.position)
            {
                GM.Vector3.copy(camera.position, this.position);
            }
            if (camera.rotation)
            {
                if (camera.rotation.order)
                {
                    GM.Euler.convert(camera.rotation, this.rotation, camera.rotation.order);
                }
                else
                {
                    // assumed to be 'YXZ'
                    GM.Vector3.copy(camera.rotation, this.rotation);
                }
            }
        }
        
        if (camera.K)
        {
            this.projection.fovH = 0.5*camera.K[0]/camera.K[2]
            //this.projection.setK(camera.K)
        }
    }		

    updateMatrix() 
    {
        GM.Matrix4.fromEuler(this.rotation, this.matrix);
        GM.Matrix4.position(this.position, this.matrix);

        // TODO These axes are transposes ... rename to ...T
        GM.Vector3.read(this.xAxis, this.matrix, 0 * 4);
        GM.Vector3.read(this.yAxis, this.matrix, 1 * 4);
        GM.Vector3.read(this.zAxis, this.matrix, 2 * 4);
        
        GM.Matrix4.invert(this.matrix, this.inverse);
        GM.Matrix4.copy(this.inverse, this.modelViewMatrix);
        
        this.projection.update(this.matrix, this.inverse, this.viewport);
        
        GM.Frustum.init(this.frustum, this.projection.mvpMatrix);
    };

    updateRange(aabb) 
    {
        this.projection.setRange2(this.position, aabb);
    }

    screenToCamera(event)
    {
        return { x:   (event.pageX/this.viewport.width)*2 - 1, y: - (event.pageY/this.viewport.height)*2 + 1 };
    };

    intersectsBox(box)
    {
        return GM.Frustum.intersectsBox(this.frustum, box);
    };


    //
    // picking
    //


    getNearPlane()
    {
        var de = this.position.x*this.zAxis.x+ this.position.y*this.zAxis.y + this.position.z*this.zAxis.z;
        var d =  this.projection.getNear() + (this.projection.getFar() - this.projection.getNear())*(0.001);  // move the plane forward a fraction
        
        return { x: this.zAxis.x, y: this.zAxis.y, z: this.zAxis.z, w: (de - d) };
    }

    project(point) 
    {
        var cameraPt = this.projection.project(point);
        cameraPt.x = (cameraPt.x+1)/2;
        cameraPt.y = (1-(cameraPt.y+1)/2); 
        return cameraPt;
    };

    getRay(event, ray) 
    {
        if (!ray)
        {
            ray = this.ray;
        }
        return this.projection.getRay(this.screenToCamera(event), this, ray);
    };
    
    getRayToPoint(ray, worldPoint) 
    {
        GM.Vector3.subtract(worldPoint, this.position, ray.direction);
        GM.Vector3.normalize(ray.direction, ray.direction);
        GM.Vector3.copy(this.position, ray.origin);
        return ray;
    }

    toJson() 
    {
        return { 
            projection : this.projection.toJson(), 
            position: this.position.toJson(),
            rotation: this.rotation.toJson(),
            xAxis: this.xAxis,
            yAxis: this.yAxis,
            zAxis: this.zAxis
        };
    }
}






// Orhtogonal
GM.OrthographicProjection = class extends GM.Projection
{
    constructor()
    {
        super('Orthographic');
        
        this.zoom = 1;
    }
    
    update(camMatrix, camInverse, viewport) 
    {
        var delta = this.far - this.near;
        var near = this.near + delta*this.nearOffset;
        var far = this.far - delta*(1.0-this.farOffset);
        var p = 1.0/(far - near);
        var z = (far + near)*p;
        
        var w = 1.0/viewport.width;
        var h = 1.0/viewport.height;
        
        let e = this.matrix;
        e[0] = 2*w; e[4] = 0;	e[8] = 0;		e[12] = 0;
        e[1] = 0;	e[5] = 2*h; e[9] = 0;		e[13] = 0;
        e[2] = 0;	e[6] = 0;	e[10] = -2*p;	e[14] = -z;
        e[3] = 0;	e[7] = 0;	e[11] = 0;		e[15] = 1;
        
        super.update(camMatrix, camInverse, viewport);
    };

    setRange2(position, aabb) 
    {
    }

    project(worldPoint)
    {
        var x = worldPoint.x; 
        var y = worldPoint.y; 
        var z = worldPoint.z;
        var e = this.mvpMatrix;
        
        var screenPoint = new GM.Vector3();
        screenPoint.x = (e[0] * x + e[4] * y + e[8] * z + e[12]) ;
        screenPoint.y = (e[1] * x + e[5] * y + e[9] * z + e[13]) ;
        screenPoint.z = (e[2] * x + e[6] * y + e[10] * z + e[14]) ;
        return screenPoint;
    }

    unproject(screenPoint, worldPoint)
    {
        var x = screenPoint.x; 
        var y = screenPoint.y;
        var e = this.mvpInverse;
        
        worldPoint.x = (e[0]*x + e[4]*y + e[8] + e[12]);
        worldPoint.y = (e[1]*x + e[5]*y + e[9] + e[13]);
        worldPoint.z = (e[2]*x + e[6]*y + e[10] + e[14]);
        return worldPoint;
    }

    getRay(screenPoint, camera) 
    {
        var direction = new GM.Vector3(-camera.zAxis.x, -camera.zAxis.y, -camera.zAxis.z);
        
        var p0 = new GM.Vector3();
        this.unproject(screenPoint, p0);
        var near = this.getNear();
        var far = this.getFar();
        p0.x -= direction.x*(far-near);
        p0.y -= direction.y*(far-near);
        p0.z -= direction.z*(far-near);
            
        return new GM.Ray(p0, direction);
    };
    
};









/*
screenRect : function(aabb)
{
    var point = new GM.Vector3();
    var minX = Number.POSITIVE_INFINITY;
    var minY = Number.POSITIVE_INFINITY;
    var maxX = Number.NEGATIVE_INFINITY;
    var maxY = Number.NEGATIVE_INFINITY;
    
    testPoint = function (x,y,z)
    {
        point.x = x;
        point.y = y;
        point.z = z;
        point.applyProjection(this.modelViewProjectionMatrix);
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
    }.bind(this);
    
    testPoint(aabb.min.x, aabb.min.y, aabb.min.z);
    testPoint(aabb.max.x, aabb.min.y, aabb.min.z);
    testPoint(aabb.min.x, aabb.max.y, aabb.min.z);
    testPoint(aabb.max.x, aabb.max.y, aabb.min.z);
    
    testPoint(aabb.min.x, aabb.min.y, aabb.max.z);
    testPoint(aabb.max.x, aabb.min.y, aabb.max.z);
    testPoint(aabb.min.x, aabb.max.y, aabb.max.z);
    testPoint(aabb.max.x, aabb.max.y, aabb.max.z);
    
    maxX = Math.min(maxX, 1);
    maxY = Math.min(maxY, 1);
    minX = Math.max(minX, -1);
    minY = Math.max(minY, -1);
    
    //var dx = maxX - minX;
    //	var dy = maxY - minY;
    //var dz = maxZ - minZ;
    
    return { minx : minX, miny: minY, maxx : maxX, maxy : maxY };
},
*/





/*
GL.FrameBuffer = function FrameBuffer(size)
{
    // Create a color texture
    this.colorTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.colorTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.bindTexture(gl.TEXTURE_2D, null);

    // Create the depth texture
    this.depthTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.depthTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT, size, size, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_SHORT, null);
    gl.bindTexture(gl.TEXTURE_2D, null);

    this.colorBuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.colorBuffer);
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, 4, gl.RGBA8, size, size);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    
    this.glId = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.glId);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, this.colorBuffer);
    //gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.depthTexture, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    
    this.glCopyId = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.glCopyId);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.colorTexture, 0);
    //gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.depthTexture, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    
    
    this.position = new GL.ArrayBuffer(new Float32Array([
                                                      // First triangle:
                                                      1.0,  1.0, 0.0,
                                                     -1.0,  1.0, 0.0,
                                                     -1.0, -1.0, 0.0,
                                                     // Second triangle:
                                                     -1.0, -1.0, 0.0,
                                                      1.0, -1.0, 0.0,
                                                      1.0,  1.0, 0.0
                                                     ]));
    
}
*/





/*

var x = euler.x, y = euler.y, z = euler.z;
var a = Math.cos( x ), b = Math.sin( x );
var c = Math.cos( y ), d = Math.sin( y );
var e = Math.cos( z ), f = Math.sin( z );

if ( euler.order === 'XYZ' ) {

    var ae = a * e, af = a * f, be = b * e, bf = b * f;

    te[ 0 ] = c * e;
    te[ 4 ] = - c * f;
    te[ 8 ] = d;

    te[ 1 ] = af + be * d;
    te[ 5 ] = ae - bf * d;
    te[ 9 ] = - b * c;

    te[ 2 ] = bf - ae * d;
    te[ 6 ] = be + af * d;
    te[ 10 ] = a * c;

} else if ( euler.order === 'YXZ' ) {

    var ce = c * e, cf = c * f, de = d * e, df = d * f;

    te[ 0 ] = ce + df * b;
    te[ 4 ] = de * b - cf;
    te[ 8 ] = a * d;

    te[ 1 ] = a * f;
    te[ 5 ] = a * e;
    te[ 9 ] = - b;

    te[ 2 ] = cf * b - de;
    te[ 6 ] = df + ce * b;
    te[ 10 ] = a * c;

} else if ( euler.order === 'ZXY' ) {

    var ce = c * e, cf = c * f, de = d * e, df = d * f;

    te[ 0 ] = ce - df * b;
    te[ 4 ] = - a * f;
    te[ 8 ] = de + cf * b;

    te[ 1 ] = cf + de * b;
    te[ 5 ] = a * e;
    te[ 9 ] = df - ce * b;

    te[ 2 ] = - a * d;
    te[ 6 ] = b;
    te[ 10 ] = a * c;

} else if ( euler.order === 'ZYX' ) {

    var ae = a * e, af = a * f, be = b * e, bf = b * f;

    te[ 0 ] = c * e;
    te[ 4 ] = be * d - af;
    te[ 8 ] = ae * d + bf;

    te[ 1 ] = c * f;
    te[ 5 ] = bf * d + ae;
    te[ 9 ] = af * d - be;

    te[ 2 ] = - d;
    te[ 6 ] = b * c;
    te[ 10 ] = a * c;

} else if ( euler.order === 'YZX' ) {

    var ac = a * c, ad = a * d, bc = b * c, bd = b * d;

    te[ 0 ] = c * e;
    te[ 4 ] = bd - ac * f;
    te[ 8 ] = bc * f + ad;

    te[ 1 ] = f;
    te[ 5 ] = a * e;
    te[ 9 ] = - b * e;

    te[ 2 ] = - d * e;
    te[ 6 ] = ad * f + bc;
    te[ 10 ] = ac - bd * f;

} else if ( euler.order === 'XZY' ) {

    var ac = a * c, ad = a * d, bc = b * c, bd = b * d;

    te[ 0 ] = c * e;
    te[ 4 ] = - f;
    te[ 8 ] = d * e;

    te[ 1 ] = ac * f + bd;
    te[ 5 ] = a * e;
    te[ 9 ] = ad * f - bc;

    te[ 2 ] = bc * f - ad;
    te[ 6 ] = b * e;
    te[ 10 ] = bd * f + ac;

}

// last column
te[ 3 ] = 0;
te[ 7 ] = 0;
te[ 11 ] = 0;

// bottom row
te[ 12 ] = 0;
te[ 13 ] = 0;
te[ 14 ] = 0;
te[ 15 ] = 1;

return this;

},

*/