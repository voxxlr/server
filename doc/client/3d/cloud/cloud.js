
//M.boundingBox = [];  // JSTIER

M.CloudNode = class 
{
    constructor(cloud, config, buffers, kdtree, nodeMap)
    {
        this.model = cloud;
        this.path = config.path;
        this.resolution = config.resolution;
        this.memoryUsed = config.memoryUsed;
        
        // render buffers
        this.buffers = {};
        for (name in buffers)
        {
            this.buffers[name] = new GL.ArrayBuffer(buffers[name]);
        }
        this.borrowed = 0;
     
        // collision tree
        this.kdtree = kdtree;
        this.points = buffers.position;
        this.class = buffers.class;
        this.normals = buffers.normal;
    
        // AABB
        this.min = new GM.Vector3(config.min[0],config.min[1],config.min[2]);
        this.max = new GM.Vector3(config.max[0],config.max[1],config.max[2]);
    
        if (M.boundingBox)
        {
            this.boundingBox = new GL.BoundingBox({ min: this.min, max:this.max } );
            //M.boundingBox.push(this.boundingBox);
        }
        
        // proxy children
        if (config.hasOwnProperty("axis"))
        {
            this.axis = config.axis;
            this.split = config.split;

            this.low =
            {
                loading: false,
                parent: this,
                path: this.path + '0'
            }
    
            this.high =
            {
                loading: false,
                parent: this,
                path: this.path + '1'
            }
        }
        
        this.loading = false;
        this.loadedAt = V.time;
            
        this.pointCount = config.count;
        this.nearDistance = Number.POSITIVE_INFINITY;
        
        this.nodeMap = nodeMap;
        this.nodeMap[this.path] = this;
        
        M.CloudNode.memoryUsed += this.memoryUsed;
    }

    clear()
    {
        if (this.low && this.low.points != null)
        {
            this.low.clear();
            this.low = null;
        }
        
        if (this.high && this.high.points != null)
        {
            this.high.clear();
            this.high = null;
        }
        
        for (name in this.buffers)
        {
            this.buffers[name].clear();
        }
        this.points = null;
        this.points = null;
        
        delete this.nodeMap[this.path];
        
        M.CloudNode.memoryUsed -= this.memoryUsed;
    }

    unload()
    {
        this.clear();
        
        let parent = this.nodeMap[this.path.slice(0,-1)];
        if (parent.low == this)
        {
            parent.low =
            {
                loading: false,
                parent: parent,
                path: parent.low.path,
            }
        }
        else if (parent.high == this)
        {
            parent.high =
            {
                loading: false,
                parent: parent,
                path: parent.high.path,
            }
        }
    }


    render(camera, shader)
    {
        shader.setPointSize(camera, 1.62474487139*this.resolution);   // sqrt(3)*this.resolution;
        
        if (this.pointCount > 0)
        {
            shader.bindBuffer(this.buffers);
            gl.drawArrays(gl.POINTS, 0, this.pointCount);
        }
        
        M.CloudNode.nodesRendered += 1;
        M.CloudNode.pointsRendered += this.pointCount;
        
        if (M.boundingBox)
        {
            M.boundingBox.push(this.boundingBox);
        }
    }



    load()
    {
        // load children  if needed
        if (this.low.points == null)
        {
            if (!this.low.loading)
            {
                this.low.loading = this.model.schedulePacket(this.low);
            }
        }
        
        if (this.high.points == null)
        {
            if (!this.high.loading)
            {
                this.high.loading = this.model.schedulePacket(this.high);
            }
        }
        
        return (this.low.points != null && this.high.points != null);
    }


    kdIntersect(ray, min, max, lower, upper, index, range, constraint)
    {
        //console.log("(" + min[0] + "," + min[1] + "," + min[2] + ") - (" + max[0] + "," + max[1] + ","  + max[2] + ")  - "  + resolution);

        if (this.kdtree && index < this.kdtree.length)
        {
            //if (this.model.boundingBox.length < 4)
            //{
            //this.model.boundingBox.push(new GL.BoundingBox({ min: { x:min[0], y:min[1], z:min[2] }, max:{ x:max[0], y:max[1], z:max[2] } } ));  // JSTIER
            //}
            
            // split axis is given by aabb
            let axis;
            let wx = max[0] - min[0];
            let wy = max[1] - min[1];
            let wz = max[2] - min[2];
            if (wx >= wy && wx >= wz) axis = 0;
            if (wy >= wx && wy >= wz) axis = 1;
            if (wz >= wx && wz >= wy) axis = 2;

            // split distance is in index
            let split = this.kdtree[index];
            let middle = Math.floor((upper + lower)/2);

            // low split
            let minL = min.slice(0);
            let maxL = max.slice(0);
            maxL[axis] = split;
            let intersectLow = ray.intersectMinMax(minL, maxL);
            if (intersectLow)
            {
                if (intersectLow > range)
                {
                    intersectLow = null;
                }
            }
            
            // high split
            let minH = min.slice(0);
            let maxH = max.slice(0);
            minH[axis] = split; 
            let intersectHigh = ray.intersectMinMax(minH, maxH);
            if (intersectHigh)
            {
                if (intersectHigh > range)
                {
                    intersectHigh = null;
                }
            }
            
            if (intersectLow != null && intersectHigh != null)
            {
                if (intersectLow < intersectHigh)
                {
                    let dL = this.kdIntersect(ray, minL, maxL, lower, middle, 2*index+1, range, constraint);
                    if (dL.d === Number.POSITIVE_INFINITY)
                    {
                        return this.kdIntersect(ray, minH, maxH, middle, upper, 2*index+2, range, constraint);
                    }
                    return dL;
                }
                else
                {
                    let dH = this.kdIntersect(ray, minH, maxH, middle, upper, 2*index+2, range, constraint);
                    if (dH.d === Number.POSITIVE_INFINITY)
                    {
                        return this.kdIntersect(ray, minL, maxL, lower, middle, 2*index+1, range, constraint);
                    }
                    return dH;
                }
            }
            else if (intersectLow != null)	 
            {
                return this.kdIntersect(ray, minL, maxL, lower, middle, 2*index+1, range, constraint);
            }
            else if (intersectHigh != null)
            {
                return this.kdIntersect(ray, minH, maxH, middle, upper, 2*index+2, range, constraint);
            }
        }
        else
        {
            var threshold = 3.17*this.resolution*this.resolution;
            
            var iD = Number.POSITIVE_INFINITY;
            var iN = 0;
            
            for (var i=lower; i<upper; i++)
            {
                var pX = this.points[i*3+0];
                var pY = this.points[i*3+1];
                var pZ = this.points[i*3+2];

                var dx = pX - ray.origin.x;
                var dy = pY - ray.origin.y;
                var dz = pZ - ray.origin.z;
                var dR = dx*ray.direction.x + dy*ray.direction.y + dz*ray.direction.z;
                if (dR > 0 && dR < range)
                {
                    dx -= ray.direction.x*dR;
                    dy -= ray.direction.y*dR;
                    dz -= ray.direction.z*dR;
                    if (dx*dx + dy*dy +dz*dz < threshold)
                    {
                        if (constraint)
                        {
                            if (constraint.classes)
                            {
                                if (this.class)
                                {
                                    if (constraint.classes[this.class[i]])
                                    {
                                        continue;
                                    }	
                                }
                            }
                            
                            if (constraint.clip[3] != 0)
                            {
                                if (pX*constraint.clip[0] + pY*constraint.clip[1] + pZ*constraint.clip[2] < constraint.clip[3])
                                {
                                    continue;
                                }
                            }
                            if (constraint.clip[7] != 0)
                            {
                                if (pX*constraint.clip[4] + pY*constraint.clip[5] + pZ*constraint.clip[6] < constraint.clip[7])
                                {
                                    continue;
                                }
                            }
                            if (constraint.clip[11] != 0)
                            {
                                if (pX*constraint.clip[8] + pY*constraint.clip[9] + pZ*constraint.clip[10] < constraint.clip[11])
                                {
                                    continue;
                                }
                            }
                            if (constraint.clip[15] != 0)
                            {
                                if (pX*constraint.clip[12] + pY*constraint.clip[13] + pZ*constraint.clip[14] < constraint.clip[15])
                                {
                                    continue;
                                }
                            }
                        }
                        if (dR < iD)
                        {
                            iD = dR;
                            iN = i;	
                        }
                    }
                }
            }
            
            if (iD == Number.POSITIVE_INFINITY)
            {
                return M.CloudNode.NO_INTERSECTION;
            }
            else
            {
                return { d: iD, n: this.normals ? this.normals[iN] : 523264, p: { x:this.points[iN*3+0], y:this.points[iN*3+1], z:this.points[iN*3+2] }};
                //return { d: iD, n: this.normals ? this.normals[iN] : 523264};
            }
        }
    }
    
    intersect(ray, range, constraint)
    {
        var min = [ this.min.x, this.min.y, this.min.z ];
        var max = [ this.max.x, this.max.y, this.max.z ];
        
        var intersect = ray.intersectMinMax(min , max);  
        if (intersect)
        {
            if (intersect > range)
            {
                intersect = null;
            }
        }
            
        // TODO do clip plane test here and in caller as well
        var result = M.CloudNode.NO_INTERSECTION;
        if (intersect)
        {
            if (this.low && this.low.points && this.high && this.high.points)
            {
                // check which side of split plane observer is on
                let value;
                switch (this.axis)
                {
                    case 0: value = ray.origin.x; break;
                    case 1: value = ray.origin.y; break;
                    case 2: value = ray.origin.z; break;
                }
                
                if (value > this.split)
                {
                    // search high first ... then low
                    result = this.high.intersect(ray, range, constraint);
                    if (result == M.CloudNode.NO_INTERSECTION)
                    {
                        result = this.low.intersect(ray, range, constraint);
                    }
                }
                else
                {
                    // search low first ... then high
                    result = this.low.intersect(ray, range, constraint);
                    if (result == M.CloudNode.NO_INTERSECTION)
                    {
                        result = this.high.intersect(ray, range, constraint);
                    }
                }
            }
            else
            {
                //this.model.boundingBox.push(new GL.BoundingBox(this) );
                result = this.kdIntersect(ray, min, max, 0, this.pointCount, 0, range, constraint);
            }
        }
        return result;
    }
    
    /*
    kdBoxes(ray, min, max, index, packet, color)  // JSTIER delete this some time
    {
        if (packet.kdtree && index < packet.kdtree.length)
        {
            this.model.boundingBox.push(new GL.BoundingBox({ min: { x:min[0], y:min[1], z:min[2] }, max:{ x:max[0], y:max[1], z:max[2] } } )); 
            
            // split axis is given by aabb
            var axis;
            var wx = max[0] - min[0];
            var wy = max[1] - min[1];
            var wz = max[2] - min[2];
            if (wx >= wy && wx >= wz) axis = 0;
            if (wy >= wx && wy >= wz) axis = 1;
            if (wz >= wx && wz >= wy) axis = 2;

            // split distance is in index
            var split = packet.kdtree[index];
            console.log(axis + "   " + split + "          " + wx + "    " + wy + "    " + wz);
            // split index is half the points

            // low split
            var minL = min.slice(0);
            var maxL = max.slice(0);
            maxL[axis] = split;
            
            // high split
            var minH = min.slice(0);
            var maxH = max.slice(0);
            minH[axis] = split; 
            
            this.kdBoxes(ray, minL, maxL, 2*index+1, packet, color);
            this.kdBoxes(ray, minH, maxH, 2*index+2, packet, color);
        }
    }
    */
}


M.CloudNode.NO_INTERSECTION = { d: Number.POSITIVE_INFINITY, n: 0 };

M.CloudNode.memoryUsed = 0;

M.CloudNode.IN = 1;
M.CloudNode.OUT = -1;

M.CloudNode.pointsRendered = 0;
M.CloudNode.nodesRendered = 0;


M.Cloud = class extends V.Dataset
{
    constructor(config, loadedCb)
    {
        super(config);
        
        this.loadedCb = loadedCb;
        
        this.min = new GM.Vector3(this.root.min[0],this.root.min[1],this.root.min[2]);
        this.max = new GM.Vector3(this.root.max[0],this.root.max[1],this.root.max[2]);
        
        this.maxBuffers = 50;
        this.maxLod = 0.00001;
        
        // workers and map of active XmlHttpRequest
        this.loadingMap = new Set();
        this.nodeMap = {};
        

        this.frustum = GM.Frustum.create();
        
        // loading Queue
        this.loadingQ = new V.Queue();
        this.loadingQ.enqueue({ path: "n",
                                loading: true,
                                parent: { 
                                    path: null 
                                } 
                            });
        this.loadPacket();
        
        // rendering
        this.renderQ = new V.PriorityQueue(function(a, b) 
        { 
            return a.distance - b.distance; 
        });
        
        //if (M.boundingBox)
        //{
        //	M.boundingBox.push(new GL.BoundingBox({ min: this.min, max:this.max } ));  // JSTIER
        //}
        
        this.shader = new M.PointShader(this);
        this.shader.compile();
        
        V.recvMessage("cloud.point.max", (args) =>
        {
            if (args.id == this.id)
            {
                this.maxBuffers = args.value;
                V.touch3d();
                
                V.postMessage("cloud.point.max", (args));
            }
        });
    }
    
    unload()
    {
        this.loadingMap.forEach(function(xhr)
        {
            V.stopLoading();
            xhr.abort();
        })
        
        if (this.node)
        {
            this.node.clear();
            this.node = null;
        }
        
        this.shader.clear();
        
        V.touch3d();
    }

    //
    // Loading
    //
    
    // repsonse from worker
    packetProcessed(event)
    {
        var path = event.data.config.path;
        
        var node = new M.CloudNode(this, event.data.config, event.data.buffers, event.data.kdTree, this.nodeMap);
        if (path === "n")
        {
            this.node = node;
            this.node.parent = {  }
            
            this.loadedCb(this.config);
        }
        else
        {
            let parent = this.nodeMap[event.data.parent];
            if (parent)
            {
                if (path === (parent.path+'0'))
                {
                    parent.low = node;
                }
                else
                {
                    parent.high = node;
                }
                node.parent = parent;
            }
            else
            {
                // already gced
            }
        }
        
        V.touch3d();
        
        if (M.CloudNode.memoryUsed > M.MIN_MEM)
        {
            var selectQ = new V.PriorityQueue(function(a, b) 
            { 
                return a.gcPriority - b.gcPriority; 
            });
            selectQ.enqueue(this.node);
            while (!selectQ.empty())
            {
                var node = selectQ.dequeue();
                
                var isLeaf = true;
                if (node.low && node.low.points)
                {
                    node.low.gcPriority = GM.Frustum.farDistance(this.frustum, node.low);
                    selectQ.enqueue(node.low);
                    isLeaf = false;
                }
                if (node.high && node.high.points)
                {
                    node.high.gcPriority = GM.Frustum.farDistance(this.frustum, node.high);
                    selectQ.enqueue(node.high);
                    isLeaf = false;
                }
                
                if (isLeaf)
                {
                    var parent = this.nodeMap[node.path.slice(0,-1)];
                    if (parent && !GM.Frustum.intersectsBox(this.frustum, parent))
                    {
                        node.unload();
                    }
                }
                
                if (M.CloudNode.memoryUsed < M.MIN_MEM)
                {
                    break;
                }
            }
            
        }
    };
    
    
    // XmlHttpRequest repsonses
    async packetReceived(proxy, event)
    {
        var xhr = event.currentTarget;
        this.loadingMap.delete(xhr);
        V.stopLoading();
        
        if (xhr.status === 200 || xhr.status === 304)
        {
            // read json header
            var cv = new DataView(xhr.response);
            var length = cv.getUint32(0, true);
            var config = JSON.parse(new TextDecoder("utf-8").decode(new Uint8Array(xhr.response, 4, length)));
            var pointer = 4 + length;
            pointer = Math.ceil(pointer/4)*4;
            
            // points
            var count = cv.getUint32(pointer, true);
            pointer +=4;
    
            var attributes = config.attributes;
            var buffers = {};
            for (var i=0; i<attributes.length; i++)
            {
                var attr = attributes[i];
                if (attr.type == "float32")
                {
                    buffers[attr.name] = new Float32Array(xhr.response, pointer, count*attr.size);
                    pointer += count*attr.size*4;
                }
                else if (attr.type == "uint8")
                {
                    buffers[attr.name] = new Uint8Array(xhr.response, pointer, count*attr.size);
                    pointer += count*attr.size;
                }
                else if (attr.type == "uint16")
                {
                    buffers[attr.name] = new Uint16Array(xhr.response, pointer, count*attr.size);
                    pointer += count*attr.size*2;
                }
                else if (attr.type == "INT_2_10_10_10_REV")
                {
                    buffers[attr.name] = new Int32Array(xhr.response, pointer, count*attr.size);
                    pointer += count*attr.size*4;
                }

                pointer = Math.ceil(pointer/4)*4;
            }
            
            // read kdTree 
            var kdTree = null;
            var indexSize = (xhr.response.byteLength - pointer)/4;
            if (indexSize > 0)
            {
                kdTree = new Float32Array(xhr.response, pointer, indexSize);
            }
            
            config.memoryUsed = pointer;
            
            this.packetProcessed({ data: { parent: proxy.parent.path, config: config, buffers: buffers, kdTree : kdTree }});
        }
        else
        {
            proxy.loading = false;
            if (xhr.status === 401)
            {
                this.url = await this.refreshToken();
            }
        }
        
        this.loadPacket();
    };
    
    async packetError(proxy, event)
    {
        var xhr = event.currentTarget;
        this.loadingMap.delete(xhr);
        V.stopLoading();
        
        proxy.loading = false;
        
        this.url = await this.refreshToken();
        
        this.loadPacket();
    }
    
    // loading Api
    loadPacket()
    {
        while (this.loadingMap.size < 4)
        {
            if (this.loadingQ.empty())
            {
                break;
            }
            
            var proxy = this.loadingQ.dequeue();
            
            var xhr = new XMLHttpRequest();
            xhr.open('GET', this.url.replace("%s", proxy.path), true); // Avoid preflight...
            xhr.responseType = 'arraybuffer';
            xhr.onerror = this.packetError.bind(this, proxy);
            xhr.onload = this.packetReceived.bind(this, proxy);
            
            this.loadingMap.add(xhr);
            V.startLoading();
    
            try
            {
                xhr.send(null);
            }
            catch(e)
            {
                console.log("Error loading point segment : " + e);
            }
        }
    }
    
    schedulePacket(proxy)
    {
        if (this.loadingQ.size < 8)
        {
            this.loadingQ.enqueue(proxy);
            this.loadPacket();
            return true;
        }
        return false;
    }
    
    
    //
    // Rendering
    //
    
    render(frustum)
    {
        GM.Frustum.copy(frustum, this.frustum);

        var projection = V.camera.projection;
    
        if (this.node)
        {
            var selectQ = new V.PriorityQueue(function(a, b) // TODO Performance ~!!! make this a member 
            { 
                return a.splitPrio - b.splitPrio; 
            });
            selectQ.enqueue(this.node);
    
            this.renderQ.clear();
            
            var budget = this.maxBuffers - 1;
            while (!selectQ.empty())
            {
                var node = selectQ.dequeue();
                budget++;
                if (node.low != null && node.high != null)
                {
                    // internal node
                    if (budget - 2 > 0)
                    {
                        if (node.load())
                        {
                            if (GM.Frustum.intersectsBox(frustum, node.low))							
                            {
                                if (projection == V3.PERSPECTIVE)
                                {
                                    node.low.splitPrio = node.low.nearDistance/node.low.resolution;
                                }
                                else
                                {
                                    node.low.splitPrio = 1.0/node.low.resolution;
                                }
                                node.low.distance = node.low.nearDistance;
                                budget--;
                                selectQ.enqueue(node.low);	
                            }
                            
                            if (GM.Frustum.intersectsBox(frustum, node.high))							
                            {
                                if (projection == V3.PERSPECTIVE)
                                {
                                    node.high.splitPrio = node.high.nearDistance/node.high.resolution;
                                }
                                else
                                {
                                    node.high.splitPrio = 1.0/node.high.resolution;
                                }
                                
                                node.high.distance = node.high.nearDistance;
                                budget--;
                                selectQ.enqueue(node.high);	
                            }
                        }
                        else
                        {
                            this.renderQ.enqueue(node);
                            budget--;
                        }
                    }
                    else
                    {
                        this.renderQ.enqueue(node);
                        budget--;
                    }
                }
                else
                {
                    this.renderQ.enqueue(node);
                    budget --;
                }
            }
        }
        
        
        M.CloudNode.pointsRendered = 0;
        M.CloudNode.nodesRendered = 0;
    
        // render point cloud
        this.shader.useProgram(V.camera);
        this.shader.enableBuffer();
        
        while (!this.renderQ.empty())
        {
            var node = this.renderQ.dequeue();
            node.render(V.camera, this.shader);
        }
        
        this.shader.disableBuffer();
        
        if (M.boundingBox)
        {
            for (var i=0; i<M.boundingBox.length; i++)
            {
                M.boundingBox[i].render(V.camera);
            }
            
            M.boundingBox = [];
        }
    }
    
    //
    // Collision
    //
    
    raycast(ray, options)
    {
        if (this.node)
        {
            let constraint = { clip: this.shader.clipPlanes, classes: this.shader.excluded }
                
            let intersect = this.node.intersect(ray, options.distance, constraint);
            if (intersect != M.CloudNode.NO_INTERSECTION)
            {
                options.distance = intersect.d;
                
                if (options.normal)
                {
                    // in GL_INT_2_10_10_10_REV format
                    var x = (intersect.n >> 0) & 1023;
                    var y = (intersect.n >> 10) & 1023;
                    var z = (intersect.n >> 20) & 1023;

                    options.normal = { x: (x & 512) ? -(~x & 511) + 1 : x, y: (y & 512) ? -(~y & 511) + 1 : y, z: (z & 512) ? -(~z & 511) + 1 : z };
                }
                
                if (options.xyz)
                {
                   // options.xyz = ray.at(intersect.d, options.xyz);
                   options.xyz = intersect.p;
                }
            }
        }
    }
    
    //
    // Events
    //
    setViewpoint(viewpoint)
    {
        if (viewpoint != null)
        {
            this.maxBuffers = viewpoint.maxBuffers || 50;
            this.shader.setViewpoint(viewpoint.shader);
        }
    }
    
    getViewpoint()
    {
        return {
            shader : this.shader.getViewpoint(),
            maxBuffers : this.maxBuffers
        }
    }

    
}