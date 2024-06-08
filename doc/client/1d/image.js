

/** @constructor */
M.Node = function(image, proxy, textureId, parent) 
{
    this.image = image;
    this.z = proxy.z;
    this.y = proxy.y;
    this.x = proxy.x;
    this.glTextureId = textureId;
    this.parent = parent;
    
    this.vbo =  { position :  new GL.ArrayBuffer(proxy.v) };
    var v = proxy.v;

    // proxy children
    if (proxy.z < this.image.maxZoom)
    {
        var a = 0.5;//1.0/Math.pow(2, this.z+1);
        var i = 1.0-a;
        this.c00 =
        {
            parent: this,
            quadrant: "c00",
            z: proxy.z+1,
            x: proxy.x*2+0,
            y: proxy.y*2+0,
            f: proxy.f,
            v: new Float32Array([            v[0],            v[1],         v[2],
                                    v[0]*a+v[3]*i,   v[1]*a+v[4]*i, v[2]*a+v[5]*i,
                                    v[0]*a+v[6]*i,   v[1]*a+v[7]*i, v[2]*a+v[8]*i,
                                    v[0]*a+v[9]*i,  v[1]*a+v[10]*i, v[2]*a+v[11]*i
                                 ]),
        }
        
        this.c10 =
        {
            parent: this,
            quadrant: "c10",
            z: proxy.z+1,
            x: proxy.x*2+1,
            y: proxy.y*2+0,
            f: proxy.f,
            v: new Float32Array([v[0]*a+v[3]*i,  v[1]*a+v[4]*i,  v[2]*a+v[5]*i,
                                          v[3],           v[4],           v[5],
                                 v[3]*a+v[6]*i,  v[4]*a+v[7]*i,  v[5]*a+v[8]*i,
                                 v[0]*a+v[6]*i,  v[1]*a+v[7]*i,  v[2]*a+v[8]*i
                                ])		
        }
        this.c01 =
        {
            parent: this,
            quadrant: "c01",
            z: proxy.z+1,
            x: proxy.x*2+0,
            y: proxy.y*2+1,
            f: proxy.f,
            v: new Float32Array([ v[0]*a+v[9]*i, v[1]*a+v[10]*i,  v[2]*a+v[11]*i,
                                  v[0]*a+v[6]*i,  v[1]*a+v[7]*i,   v[2]*a+v[8]*i,
                                  v[9]*a+v[6]*i, v[10]*a+v[7]*i,  v[11]*a+v[8]*i,
                                           v[9],          v[10],           v[11]
                                ])		
        }
        this.c11 =
        {
            parent: this,
            quadrant: "c11",
            z: proxy.z+1,
            x: proxy.x*2+1,
            y: proxy.y*2+1,
            f: proxy.f,
            v: new Float32Array([v[0]*a+v[6]*i,  v[1]*a+v[7]*i,  v[2]*a+v[8]*i,
                                 v[3]*a+v[6]*i,  v[4]*a+v[7]*i,  v[5]*a+v[8]*i,
                                          v[6],           v[7],           v[8],
                                 v[9]*a+v[6]*i,  v[10]*a+v[7]*i, v[11]*a+v[8]*i
                                ])
        }

    }
    
    this.max = { 
            x: Math.max(v[0],v[6]),
            y: Math.max(v[1],v[7]),
            z: Math.max(v[2],v[8])
    };
    
    this.min = {
            x: Math.min(v[0],v[6]),
            y: Math.min(v[1],v[7]),
            z: Math.min(v[2],v[8])
    };
 
    this.loadedAt = V.time;
};

M.Node.prototype.overlaps = function(map)
{
    /*
    // If one rectangle is on left side of other 
    if (this.lowerX > map.upperX || this.upperX < map.lowerX) 
        return false; 
  
    // If one rectangle is above other 
    if (this.lowerY > map.upperY || this.upperY < map.lowerY) 
        return false; 
    */
    return true; 
}

M.Node.prototype.clear = function()
{
    gl.deleteTexture(this.textureId);
    delete this.textureId;
    M.memoryUsed -= this.memoryUsed;
    
    if (this.c00.glId)
    {
        this.c00.clear();
    }
    this.c00 = null;
    
    if (this.c10.glId)
    {
        this.c10.clear();
    }
    this.c10 = null;

    if (this.c01.glId)
    {
        this.c01.clear();
    }
    this.c01 = null;

    if (this.c11.glId)
    {
        this.c11.clear();
    }
    this.c11 = null;
}

M.Node.prototype.unload = function(node)
{
    node.clear();

    // proxy children
    if (node == this.c00)
    {
        this.c10 =
        {
            parent: this,
            quadrant: "c00",
            z: this.z+1,
            x: this.x*2+0,
            y: this.y*2+0,
        }
    }
    else if (node == this.c10)
    {
        this.c10 =
        {
            parent: this,
            quadrant: "c10",
            z: this.z+1,
            x: this.x*2+1,
            y: this.y*2+0,
        }
    }
    else if (node == this.c01)
    {
        this.c01 =
        {
            parent: this,
            quadrant: "c01",
            z: this.z+1,
            x: this.x*2+0,
            y: this.y*2+1,
        }
    }
    else if (node == this.c11)
    {
        this.c11 =
        {
            parent: this,
            quadrant: "c11",
            z: this.z+1,
            x: this.x*2+1,
            y: this.y*2+1,
        }
    }
}

M.Node.prototype.render = function(camera, shader)
{
    shader.bindBuffer(this.vbo);
    gl.bindTexture(gl.TEXTURE_2D, this.glTextureId);
    //gl.drawArrays(gl.TRIANGLES, 0, this.vbo["position"].length/3);
    
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
}

M.Node.prototype.load = function()
{
    var c00 = this.c00.glTextureId;
    if (c00 == null)
    {
        this.image.scheduleImage(this.c00);
    }
    
    var c01 = this.c01.glTextureId;
    if (c01 == null)
    {
        this.image.scheduleImage(this.c01);
    }
    
    var c10 = this.c10.glTextureId;
    if (c10 == null)
    {
        this.image.scheduleImage(this.c10);
    }
    
    var c11 = this.c11.glTextureId;
    if (c11 == null)
    {
        this.image.scheduleImage(this.c11);
    }
    
    return c00 && c01 && c10 && c11;
}



M.Image = class extends V.Dataset 
{
    constructor(config, loadedCb)
    {
        super(config);
    
        this.maxZoom = this.root.maxZoom;
        this.tileWidth = this.root.tileSize;
        this.format = this.root.format;
        
        GL.BoundingBox.init(this)
        GL.BoundingBox.grow(this, { x: 1, y: 1, z: 1});
        GL.BoundingBox.grow(this, { x:-1, y:-1, z:-1});
        
        this.vbo = { uv :  new GL.ArrayBuffer(new Float32Array([0,0,1,0,1,1,0,1])) };
        
        this.ibo = new GL.ElementBuffer(new Uint16Array([0,1,2,0,2,3]));
    
    
        this.loadingQ = new V.Queue();
        for (var i=0; i<6; i++)
        {
            var image = new Image();
            image.onload = this.imageLoaded.bind(this);
            image.onerror = this.imageError.bind(this);
            image.crossOrigin = "Anonymous";
            this.loadingQ.enqueue(image);
        }
        
        this.scheduleImage({
            z: 0,
            x: 0,
            y: 0,
            f: "l",
            v: new Float32Array([-1,  1,  1, -1,  1, -1, -1, -1, -1, -1, -1,  1]), // Left face
            id: 0
        });
        this.scheduleImage({
            z: 0,
            x: 0,
            y: 0,
            f: "r",
            v: new Float32Array([1,  1, -1,  1,  1,  1,  1, -1,  1,  1, -1, -1]),  // Right face
            id: 0
        });
        this.scheduleImage({
            z: 0,
            x: 0,
            y: 0,
            f: "u",
            v: new Float32Array([-1,  1,  1,  1,  1,  1,  1,  1, -1, -1,  1, -1]), // Up face
            id: 0
        });
        this.scheduleImage({
            z: 0,
            x: 0,
            y: 0,
            f: "d",
            v: new Float32Array([-1, -1, -1,  1, -1, -1,  1, -1,  1, -1, -1,  1]), // Down face
            id: 0
        });
        this.scheduleImage({
            z: 0,
            x: 0,
            y: 0,
            f: "f",
            v: new Float32Array([-1,  1, -1,  1,  1, -1,  1, -1, -1, -1, -1, -1]), // Front face
            id: 0
        });
        this.scheduleImage({
            z: 0,
            x: 0,
            y: 0,
            f: "b",
            v: new Float32Array([ 1,  1,  1, -1,  1,  1, -1, -1,  1,  1, -1,  1]), // Back face
            id: 0
        });
    
        this.face = {};
        
        
        this.renderQ = new V.PriorityQueue(function(a, b) 
        { 
            return a.z - b.z; 
        });
        
        loadedCb(this.config)
    }


    scheduleImage(proxy)
    {
        if (!this.loadingQ.empty())
        {
            var image = this.loadingQ.dequeue();
            image.proxy = proxy;
            image.src = this.url.replace("FILE", proxy.z+"/"+proxy.f+""+proxy.x+"_"+proxy.y);
            proxy.loaderIMG = image;
        }
    }
    
    imageLoaded(event)
    {
        var image = event.srcElement;
        image.proxy.loaderIMG = null;
        
        var glId = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, glId);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.bindTexture(gl.TEXTURE_2D, null);
        
        if (image.proxy.z > 0)
        {
            image.proxy.parent[image.proxy.quadrant] = new M.Node(this, image.proxy, glId, image.proxy.parent);
        }
        else
        {
            this.face[image.proxy.f] = new M.Node(this, image.proxy, glId); 
        }
        
        URL.revokeObjectURL(image.src);
        this.loadingQ.enqueue(image);
        V.touch3d();
    };
    
    imageError(event)
    {
        var image = event.srcElement;
        image.proxy.loaderIMG = null;
        
        var glId = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, glId);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255])); 
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.bindTexture(gl.TEXTURE_2D, null);
    
        if (image.proxy.z > 0)
        {
            image.proxy.parent[image.proxy.quadrant] = new M.Node(this, image.proxy, glId, 3, image.proxy.parent);
        }
        else
        {
            this.face[image.proxy.id] = new M.Node(this, image.proxy, glId, 3); 
        }
        
        URL.revokeObjectURL(image.src);
        this.loadingQ.enqueue(image);
        V.touch3d();
    }
    
    render(event)
    {
        var camera = V.camera;
        var shader = event.shader;
        
        var currentZoom = 0;
        while (gl.drawingBufferWidth > this.tileWidth * Math.pow(2, currentZoom) * camera.projection.fovH  ) 
        {
            if (currentZoom == this.maxZoom)
            {
                break;
            }
            currentZoom++;
        }
    
        var selectQ = new V.PriorityQueue(function(a, b) 
        { 
            // TODO load from cetner to outside as well
            return a.z - b.z; 
        });
        
        for (var key in this.face)
        {
            if (this.face[key])
            {
                if (camera.intersectsBox(this.face[key]))
                {
                    selectQ.enqueue(this.face[key]);
                }
            }
        }
    
        this.renderQ.clear();
        while (!selectQ.empty())
        {
            var node = selectQ.dequeue();
            
            if (node.z < currentZoom)
            {
                if (node.z < this.maxZoom && node.load())
                {	
                    if (camera.intersectsBox(node.c00))
                    {
                        selectQ.enqueue(node.c00);
                    }
                    if (camera.intersectsBox(node.c01))
                    {
                        selectQ.enqueue(node.c01);
                    }
                    if (camera.intersectsBox(node.c10))
                    {
                        selectQ.enqueue(node.c10);
                    }
                    if (camera.intersectsBox(node.c11))
                    {
                        selectQ.enqueue(node.c11);
                    }
                    //this.renderQ.enqueue(node)
                }
                else
                {
                    this.renderQ.enqueue(node)
                }
            }
            else
            {
                this.renderQ.enqueue(node)
            }
        }
            
        // render quads
        shader.useProgram(camera);
        shader.enableBuffer();
        shader.bindBuffer(this.vbo);
        
        gl.activeTexture(gl.TEXTURE0);
        gl.uniform1i(shader.samplerMap, 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo.glId);
        while (!this.renderQ.empty())
        {
            var node = this.renderQ.dequeue();
            node.render(camera, shader, this.ibo);
        }
        gl.bindTexture(gl.TEXTURE_2D, null);
        
        shader.disableBuffer();
    }
    
    unload()
    {
        for (var f in this.face)
        {
            this.face[f].clear();
        }
        this.face = [];
    }
    
    getViewpoint()
    {
        return {} ;
    }
    
    setViewpoint(viewpoint)
    {
    }
    
    raycast(ray, options)
    {
        let distance = 1;
            
        options.distance = Math.min(options.distance, distance);
        
        if (options.hits)
        {
            options.hits.push({ id: this.id, distance });
        }
        
        if (options.xyz)
        {
            options.xyz = { x:ray.origin.x , y:ray.origin.y, z:distance };
        }
        
        if (options.normal)
        {
            options.normal = { x:-ray.direction.x , y:-ray.direction.y, z:-ray.direction.z };
        }
        
    }
}



