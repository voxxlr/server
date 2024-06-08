M.rendered = 0;
M.maxZoom = 0;
M.minZoom = 19;

M.NO_DEPTH = -10000.00;
M.splitV = 0;
M.splitH = 1;
M.DUAL = 1;
M.SINGLE = 2;

M.Node = function(z,x,y) 
{
    this.z = z;
    this.y = y;
    this.x = x;
    
    this.glTextureId = [];
    this.loaderIMG = [];
    this.bufferIMG = [];
    
    this.scale = 1<<z;
    this.min = { x: (256*x)/this.scale, y: (256*y)/this.scale };
    this.max = { x: (256*(x+1))/this.scale, y: (256*(y+1))/this.scale };
};

M.Node.prototype.descend = function(map, zoom)
{
    if (this.z <= zoom)
    {
        this.pixelX = V.camera.position.x*this.scale - 256*this.x;
        this.pixelY = 256*this.y + 256 -V.camera.position.y*this.scale;
        
        var prj = 2.0/(V.camera.pixelSize*this.scale);
        this.projX = prj/gl.drawingBufferWidth;
        this.projY = prj/gl.drawingBufferHeight;
        
        if (!this.c00)
        {
            this.c00 = new M.Node(this.z+1, this.x*2+0, this.y*2+0); 
            this.c10 = new M.Node(this.z+1, this.x*2+1, this.y*2+0);
            this.c01 = new M.Node(this.z+1, this.x*2+0, this.y*2+1);
            this.c11 = new M.Node(this.z+1, this.x*2+1, this.y*2+1);
        }
        
        map.loadTile(this);
        
        this.c00.visible = V.camera.intersectsBox(this.c00);
        this.c01.visible = V.camera.intersectsBox(this.c01);
        this.c10.visible = V.camera.intersectsBox(this.c10);
        this.c11.visible = V.camera.intersectsBox(this.c11);
        
        if (this.c00.visible)
        {
            this.c00.descend(map, zoom);
        }
        else
        {
            map.cancelImage(this.c00);
        }
        
        if (this.c01.visible)
        {
            this.c01.descend(map, zoom);
        }
        else 
        {
            map.cancelImage(this.c01);
        }
        
        if (this.c10.visible)
        {
            this.c10.descend(map, zoom);
        }
        else 
        {
            map.cancelImage(this.c10);
        }
        
        if (this.c11.visible)
        {
            this.c11.descend(map, zoom);
        }
        else 
        {
            map.cancelImage(this.c11);
        }
    }
}

M.Node.prototype.render = function(layer)
{
    if (this.z <= layer.zoom)
    {
        var c00 = true;
        var c01 = true;
        var c10 = true;
        var c11 = true;
        
        if (this.c00 == null)
        {
            console.log("dasdasdasdadasdasd");
        }
        
        if (this.c00.visible)
        {
            c00 = this.c00.render(layer);
        }
        if (this.c01.visible)
        {
            c01 = this.c01.render(layer);
        }
        if (this.c10.visible)
        {
            c10 = this.c10.render(layer);
        }
        if (this.c11.visible)
        {
            c11 = this.c11.render(layer);
        }
        
        if (c00 && c01 && c10 && c11)
        {
            // all children rendered - this square is covered
            return true;
        }
        else //if (this.z >= layer.minZoom)
        {
            return layer.renderNode(this);
        }
    }
    
    return false;
}

M.Node.prototype.contains = function(point)
{
    return !(point.x > this.max.x || point.x < this.min.x || point.y > this.max.y || point.y < this.min.y);
}

M.Node.prototype.sample = function(layer, point)
{
    if (this.z < layer.zoom)
    {
        var value = M.NO_DEPTH;
        
        if (this.c00)
        {
            if (this.c00.contains(point))
            {
                value = this.c00.sample(layer, point);
            }
            else if (this.c01.contains(point))
            {
                value = this.c01.sample(layer, point);
            }
            else if (this.c10.contains(point))
            {
                value = this.c10.sample(layer, point);
            }
            else if (this.c11.contains(point))
            {
                value = this.c11.sample(layer, point);
            }
        }
        
        if (value == M.NO_DEPTH)
        {
            return layer.sampleNode(this, point);
        }
        
        return value;
    }
    else
    {
        return layer.sampleNode(this, point);
    }
}

M.Node.prototype.clear = function(layer)
{
    layer.clearNode(this);
    
    if (this.c00)
    {
        this.c00.clear(layer);
        this.c10.clear(layer);
        this.c01.clear(layer);
        this.c11.clear(layer);
        /*
        delete this.c00; 
        delete this.c10;
        delete this.c01;
        delete this.c11;
        */
    }
}


// IMPLEMENT RETRIES IN FOR MAP FROM OPENSTREETS ******************************************************************************************* 

M.Loader = function()
{
    //this.memoryUsed = memoryUsed;
    //M.memoryUsed += this.memoryUsed;
}


/** @constructor */
M.PngLoader = function()
{
    M.Loader.call(this);

    this.max = 32;
}

M.PngLoader.prototype = Object.create(M.Loader.prototype);
M.PngLoader.prototype.constructor = V.PngLoader;

M.PngLoader.BLANK_TILE = 0;
M.PngLoader.init = function()
{
    var glId = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, glId);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255])); 
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.bindTexture(gl.TEXTURE_2D, null);
    M.PngLoader.BLANK_TILE = glId;
}

M.PngLoader.prototype.imageLoaded = function(event)
{
    var image = event.srcElement;
    var node = image.node;

    this.max++;
    V.stopLoading();
    
    var glId = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, glId);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.bindTexture(gl.TEXTURE_2D, null);
    
    V.memoryUsed += 256*256*3;
    
    //console.log("loaded " + image.node.z+"/"+image.node.x+"/"+image.node.y)
    
    image.layer.loadNode(image.node, glId);
    image.node = null;
    URL.revokeObjectURL(image.src);
    V.touch3d();
};

M.PngLoader.prototype.imageError = function(event)
{
    var image = event.srcElement;
    var node = image.node;
    
    this.max++;
    V.stopLoading();
    
    if (node)
    {
        image.layer.loadNode(image.node, M.PngLoader.BLANK_TILE);
        image.node = null;
        image.layer = null;
        URL.revokeObjectURL(image.src);
        V.touch3d();
    }
}

M.PngLoader.prototype.scheduleImage = function(layer, node, url)
{	
//	console.log("PngLoader  " + layer.index + " --- " + node.x + ", " + node.y + " " + node.z);

    if (this.max > 0)
    {
        this.max--;
        V.startLoading();
        
        var image = new Image();
        image.onload = this.imageLoaded.bind(this);
        image.onerror = this.imageError.bind(this);
        image.crossOrigin = "Anonymous";
        
        image.layer = layer;
        image.node = node;
        image.src = url;
        return image;
    }
    return null;
}

M.PngLoader.prototype.cancelImage = function(image)
{
    URL.revokeObjectURL(image.src);
    image.node = null;
    image.layer = null;
    image.src = "";
}

M.PngLoader.prototype.deleteImage = function(glTextureId)
{
    if (glTextureId != M.PngLoader.BLANK_TILE)
    {
        gl.deleteTexture(glTextureId);
    }
}





M.BinLoader = function()
{
    M.Loader.call(this);
    
    this.loadingCount = 0;
}

M.BinLoader.prototype = Object.create(M.Loader.prototype);
M.BinLoader.prototype.constructor = V.BinLoader;

M.BinLoader.BLANK_TILE = 0;

M.BinLoader.init = function()
{
    var glId = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, glId);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, 1, 1, 0, gl.RED, gl.FLOAT, new Float32Array([M.NO_DEPTH])); 
    gl.bindTexture(gl.TEXTURE_2D, null);
    M.BinLoader.BLANK_TILE = glId;
}


M.BinLoader.prototype.imageLoaded = function(layer, node, buffer)
{
    V.stopLoading();
    
    if (node != null)
    {
        if (buffer)
        {
            var glId = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, glId);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, 260, 260, 0, gl.RED, gl.FLOAT, buffer);
            gl.bindTexture(gl.TEXTURE_2D, null);
            
            V.memoryUsed += 256*256*3;
            layer.loadNode(node, glId, buffer); 
        }
        else
        {
            layer.loadNode(node, M.BinLoader.BLANK_TILE); 
        }
        
        V.touch3d();
    }
    else
    {
        // was cancelled
    }

    this.loadingCount--;
};



M.BinLoader.prototype.scheduleImage = function(layer, node, url)
{
    if (this.loadingCount < 5)
    {
//		console.log("BinLoader  " + layer.index + " --- " + node.x + ", " + node.y + " " + node.z);
    // http://api.geosition.com/tile/osm-bright-3006/{z}/{x}/{y}.png
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'arraybuffer';
        xhr.onerror = () =>
        {
            this.imageLoaded(layer, node, null);
        }
        xhr.onload = ()=> 
        {
            if (xhr.status === 200 || xhr.status === 0) 
            {
                this.imageLoaded(layer, node, new Float32Array(xhr.response));
            } 
            else
            {
                if (xhr.status === 401)
                {
                    layer.refreshToken();
                }
                this.imageLoaded(layer, node, null);
            }
        };	
        
        try
        {
            this.loadingCount++;
            xhr.send(null);
        }
        catch(e)
        {
            this.imageLoaded(layer, node, null);
        }
            
        return xhr;
    }
}

M.BinLoader.prototype.cancelImage = function(xhr)
{
    this.loadingCount--;
    xhr.abort();
}

M.BinLoader.prototype.deleteImage = function(glTextureId)
{
    if (glTextureId != M.BinLoader.BLANK_TILE)
    {
        gl.deleteTexture(glTextureId);
    }
}








M.Layer = class
{
    constructor(url, loader, index, shader, map)
    {
        this.index = index;
        this.url = url;
        this.loader = loader;
        this.shader = shader;
        this.map = map;
        
        this.renderQ = new V.PriorityQueue(function(a, b) 
        { 
            return a.z - b.z; 
        });

        this.loadingQ = new V.PriorityQueue(function(a, b) 
        { 
            return a.z - b.z; 
        });
    }
    
    refreshToken()
    {
        this.map.refreshToken();
    }

    renderNode(node)
    {
        if (node.min.x > this.mapX1 || node.max.x < this.mapX0) 
        {
            return true; 
        }
      
        if (node.min.y > this.mapY1 || node.max.y < this.mapY0)
        {
            return true; 
        }
        
        if (node.glTextureId[this.index])
        {
            this.renderQ.enqueue(node);
        }
        return node.glTextureId[this.index];
    }

    sample(node, point)
    {
        return node.sample(this, point);
    }

    sampleNode(node, point)
    {
        if (node.bufferIMG[this.index])
        {
            var px = Math.floor((point.x - node.min.x)*node.scale)+2;
            var py = Math.floor((point.y - node.min.y)*node.scale)+2;
            return node.bufferIMG[this.index][py*260+px];
        }
        
        return M.NO_DEPTH;
    }

    loadNode(node, glId, buffer)
    {
        node.glTextureId[this.index] = glId; 
        node.bufferIMG[this.index] = buffer;
        node.loaderIMG[this.index] = null;
        node.loadedAt = V.time;
    }

    schedule()
    {				
        this.zoom = Math.max(V.camera.zoom, this.minZoom);	
        while (!this.loadingQ.empty())
        {
            var node = this.loadingQ.dequeue();
            node.loaderIMG[this.index] = this.loader.scheduleImage(this, node, this.tileAddress(node));
        }
    }

    loadTile(node)
    {
        if (node.min.x > this.mapX1 || node.max.x < this.mapX0) 
        {
            return; 
        }
      
        if (node.min.y > this.mapY1 || node.max.y < this.mapY0)
        {
            return; 
        }

        if (node.z <= this.maxZoom && node.z >= this.minZoom)
        {
            if (!node.glTextureId[this.index])
            {
                if (!node.loaderIMG[this.index])
                {
                    this.loadingQ.enqueue(node);
                }
            }
        }
    }

    cancelImage(node)
    {
        if (node.loaderIMG[this.index])
        {
            this.loader.cancelImage(node.loaderIMG[this.index]);
            node.loaderIMG[this.index]= null;
        }
    }

    clear(node)
    {
        node.clear(this);
    }

    clearNode(node)
    {
        if (node.bufferIMG[this.index])
        {
            delete node.bufferIMG[this.index];
        }
        
        if (node.glTextureId[this.index])
        {
            this.loader.deleteImage(node.glTextureId[this.index]);
            delete node.glTextureId[this.index];
        }
    }
}



//
// Drone Map
// 


M.ColorLayer = class extends M.Layer
{
    constructor(url, info, index, map)
    {
        super(url.replace("PATH", "color").replace("TYPE", "png"), M.PngLoader.instance, index, M.ColorShader.instance, map)
        
        this.mapX0  = info.x0;
        this.mapX1  = info.x1;
        this.mapY0  = info.y0;
        this.mapY1  = info.y1;
        this.maxZoom = info.maxZoom;
        this.minZoom = info.minZoom;
    }

    render(root, pane)
    {
        root.render(this);

        this.shader.start(pane, M.Shader.vbo);
        
        while (!this.renderQ.empty())
        {
            var node = this.renderQ.dequeue();
            this.shader.renderNode(node, node.glTextureId[this.index]);
        }
        
        this.shader.end();
    }

    refreshToken()
    {
        this.map.refreshToken().then(url =>
        {
            this.url = url.replace("PATH", "color").replace("TYPE", "png");
        });
    }
    
    tileAddress(node)
    {
        return this.url.replace("FILE",node.z+"/"+node.x+"/"+node.y);		
    }
}


M.DepthLayer = class extends M.Layer
{
    constructor(url, info, index, map)
    {
        super(url.replace("PATH", "elevation").replace("TYPE", "bin"), M.BinLoader.instance, index, M.DepthShader.instance, map)
        
        this.mapX0  = info.x0;
        this.mapX1  = info.x1;
        this.mapY0  = info.y0;
        this.mapY1  = info.y1;
        this.maxZoom = info.maxZoom;
        this.minZoom = info.minZoom;
    }

    render(root, pane, mode)
    {
        root.render(this);
        
        if (mode == M.DUAL)
        {
            gl.colorMask(false, false, false, false);		
        }
        
        this.shader.start(pane, M.Shader.vbo, mode);
            
        while (!this.renderQ.empty())
        {
            var node = this.renderQ.dequeue();
            this.shader.renderNode(node, node.glTextureId[this.index]);
        }
        
        if (mode == M.DUAL)
        {
            gl.colorMask(true, true, true, true);		
        }
        
        this.shader.end();
    }

    refreshToken()
    {
        this.map.refreshToken().then(url =>
        {
            this.url = url.replace("PATH", "elevation").replace("TYPE", "bin");
        });
    }

    tileAddress(node)
    {
        return this.url.replace("FILE",node.z+"/"+node.x+"/"+node.y);		
    }
}







M.Map = class extends V.Dataset
{
    constructor(config, pane)
    {
        super(config);

        this.minZoom = 0;
        this.maxZoom = 0;
        this.pane = pane;

        GL.BoundingBox.init(this);

        this.tree = new M.Node(0, 0, 0);
        this.layers = []
    }

    addLayer(layer)
    {
        this.layers.push(layer)

        this.minZoom = Math.max(layer.minZoom, this.minZoom);
        this.maxZoom = Math.max(layer.maxZoom, this.maxZoom);

        GL.BoundingBox.grow(this, { x: layer.mapX0, y: layer.mapY0, z: 0 });
        GL.BoundingBox.grow(this, { x: layer.mapX1, y: layer.mapY1, z: 0 });

        M.minZoom = Math.min(this.minZoom, M.minZoom);
        M.maxZoom = Math.max(this.maxZoom, M.maxZoom);

        return layer;
    }

    unload()
    {
        this.layers.forEach(layer =>
        {
            layer.clear(this.tree);
        })
    }

    update()
    {
        this.tree.descend(this, Math.max(V.camera.zoom, this.minZoom));

        this.layers.forEach(layer =>
        {
            layer.schedule();
        })
    }

    loadTile(node)
    {
        this.layers.forEach(layer =>
        {
            layer.loadTile(node);
        })
    }

    cancelImage(node)
    {
        this.layers.forEach(layer =>
        {
            layer.cancelImage(node);
        })
    }

    getViewpoint()
    {
        return {};
    }

    setViewpoint(viewpoint)
    {
    }
}



M.DemMap = class extends M.Map
{
    constructor(config, loadedCb, pane)
    {
        super(config, pane);

        if (this.root.color)
        {
            this.colorLayer = this.addLayer(new M.ColorLayer(this.url, this.root.color, 0, this))
        }

        if (this.root.elevation)
        {
            this.depthLayer = this.addLayer(new M.DepthLayer(this.url, this.root.elevation, 1, this));

            this.min.z = this.root.elevation.min;
            this.max.z = this.root.elevation.max;
        }

        loadedCb(this.config);
    }

    render(mode)
    {
        if (this.depthLayer)
        {
            this.depthLayer.render(this.tree, mode == M.SINGLE ? 1 : this.pane, mode);
        }

        if (this.colorLayer)
        {
            this.colorLayer.render(this.tree, this.pane);
        }
    }

    raycast(ray, options)
    {
        let distance = Number.POSITIVE_INFINITY;

        if (this.depthLayer)
        {
            let sample = this.depthLayer.sample(this.tree, ray.origin)
            if (sample != M.NO_DEPTH)
            {
                let dz = sample - ray.origin.z;
                if (ray.direction.z == -1)
                {
                    distance = -dz;
                }
                else if (ray.direction.z == 1)
                {
                    distance = dz;
                }
            }
        }

        options.distance = Math.min(options.distance, distance);

        if (options.hits)
        {
            options.hits.push({ id: this.id, distance });
        }

        if (options.xyz)
        {
            options.xyz = { x: ray.origin.x, y: ray.origin.y, z: distance };
        }
    }
}




/*
M.DemMap = class extends V.Dataset
{
    constructor(config, loadedCb, pane)
    {
        super(config);

        this.minZoom = 0;
        this.maxZoom = 0;
        this.pane = pane;
        
        GL.BoundingBox.init(this);
        
        if (this.root.color)
        {
            this.colorLayer = new M.ColorLayer(this.url, this.root.color, 0, this);
            this.minZoom = Math.max(this.colorLayer.minZoom, this.minZoom);
            this.maxZoom = Math.max(this.colorLayer.maxZoom, this.maxZoom);
            
            GL.BoundingBox.grow(this, { x:this.colorLayer.mapX0, y:this.colorLayer.mapY0, z:0 });
            GL.BoundingBox.grow(this, { x:this.colorLayer.mapX1, y:this.colorLayer.mapY1, z:0 });
        }

        if (this.root.elevation)
        {
            this.depthLayer = new M.DepthLayer(this.url, this.root.elevation, 1, this);
            this.minZoom = Math.max(this.depthLayer.minZoom, this.minZoom);
            this.maxZoom = Math.max(this.depthLayer.maxZoom, this.maxZoom);
            
            GL.BoundingBox.grow(this, { x:this.depthLayer.mapX0, y:this.depthLayer.mapY0, z:0 });
            GL.BoundingBox.grow(this, { x:this.depthLayer.mapX1, y:this.depthLayer.mapY1, z:0 });
            this.min.z = this.root.elevation.min;
            this.max.z = this.root.elevation.max;
        }
        
        M.minZoom = Math.min(this.minZoom, M.minZoom); // max is correct  here !!
        M.maxZoom = Math.max(this.maxZoom, M.maxZoom);
        
        if (this.root.elevation || this.root.color)
        {
            this.tree = new M.Node(0,0,0);		
        }
        
        loadedCb(this.config);
    }

    unload()
    {
        if (this.tree)
        {
            if (this.depthLayer)
            {
                this.depthLayer.clear(this.tree);
            }
            if (this.colorLayer)
            {
                this.colorLayer.clear(this.tree);
            }
            this.tree = null;
        }
    }

    update()
    {
        if (this.tree)
        {
            this.tree.descend(this, Math.max(V.camera.zoom, this.minZoom));
            
            if (this.depthLayer)
            {
                this.depthLayer.schedule();
            }
            if (this.colorLayer)
            {
                this.colorLayer.schedule();
            }
        }
    }

    render(mode)
    {
        if (this.tree)
        {		
            if (this.depthLayer)
            {
                this.depthLayer.render(this.tree, mode == M.SINGLE ? 1 : this.pane, mode);
            }
            
            if (this.colorLayer)
            {
                this.colorLayer.render(this.tree, this.pane);
            }
        }
    }

    loadTile(node)
    {
        if (this.depthLayer)
        {
            this.depthLayer.loadTile(node);
        }
        if (this.colorLayer)
        {
            this.colorLayer.loadTile(node);
        }
    }

    cancelImage(node)
    {
        if (this.depthLayer)
        {
            this.depthLayer.cancelImage(node);
        }
        if (this.colorLayer)
        {
            this.colorLayer.cancelImage(node);
        }
    }

    raycast(ray, options)
    {
        let distance = Number.POSITIVE_INFINITY;
        
        if (this.depthLayer)
        {
            let sample = this.depthLayer.sample(this.tree, ray.origin)
            if (sample != M.NO_DEPTH)
            {
                let dz = sample - ray.origin.z;
                if (ray.direction.z == -1)
                {
                    distance = -dz;
                }
                else if (ray.direction.z == 1)
                {
                    distance = dz;
                }
            }
        }
        
        options.distance = Math.min(options.distance, distance);
        
        if (options.hits)
        {
            options.hits.push({ id: this.id, distance });
        }
        
        if (options.xyz)
        {
            options.xyz = { x:ray.origin.x , y:ray.origin.y, z:distance };
        }
    }

    getViewpoint()
    {
        return { };
    }
    
    setViewpoint(viewpoint)
    {
    }
}

*/





//
// Wmts map
// 




//http://api.geosition.com/tile/osm-bright-3006/{z}/{x}/{y}.png
M.OsmLayer = class extends M.Layer
{
    constructor(url,  maxZoom, index, map)
    {
        super(url, M.PngLoader.instance, index, M.ColorShader.instance, map)
        
        this.mapX0  = 0;
        this.mapX1  = 256;
        this.mapY0  = 0;
        this.mapY1  = 256;
        this.maxZoom = maxZoom;
        this.minZoom = 2;
    }

    refreshToken()
    {
    }

    render(root, pane)
    {
        root.render(this);

        this.shader.start(pane, M.Shader.vbo);
        
        while (!this.renderQ.empty())
        {
            var node = this.renderQ.dequeue();
            this.shader.renderNode(node, node.glTextureId[this.index]);
        }
        
        this.shader.end();
    }


    tileAddress(node)
    {
        return this.url.replace("{x}",node.x).replace("{y}",node.y).replace("{z}",node.z);		
    }
}



M.Wmts = class extends M.Map
{
    constructor(config, loadedCb, pane)
    {
        super(config, pane);

        this.layer = this.addLayer(new M.OsmLayer(this.url, config.maxZoom, 0, this));

        loadedCb(this.config);
    }
        
    render(mode)
    {
        this.layer.render(this.tree, this.pane);
    }

    raycast(ray, options)
    {
        let distance = 0;

        options.distance = distance;

        if (options.hits)
        {
            options.hits.push({ id: this.id, distance });
        }

        if (options.xyz)
        {
            options.xyz = { x: ray.origin.x, y: ray.origin.y, z: distance };
        }
    }
}



/*

M.Wmts = class extends V.Dataset
{
    constructor(config, loadedCb, pane)
    {
        super(config);

        this.minZoom = 0;
        this.maxZoom = 0;
        this.pane = pane;
        
        GL.BoundingBox.init(this);
        
        this.layer = new M.OsmLayer(this.url, config.maxZoom, 0, this);
        this.minZoom = Math.max(this.layer.minZoom, this.minZoom);
        this.maxZoom = Math.max(this.layer.maxZoom, this.maxZoom);
        
        GL.BoundingBox.grow(this, { x:this.layer.mapX0, y:this.layer.mapY0, z:0 });
        GL.BoundingBox.grow(this, { x:this.layer.mapX1, y:this.layer.mapY1, z:0 });
        
        M.minZoom = Math.min(this.minZoom, M.minZoom); // max is correct  here !!
        M.maxZoom = Math.max(this.maxZoom, M.maxZoom);
        
        this.tree = new M.Node(0,0,0);		
        
        loadedCb(this.config);
    }

    unload()
    {
        if (this.tree)
        {
            this.layer.clear(this.tree);
            this.tree = null;
        }
    }

    update()
    {
        if (this.tree)
        {
            this.tree.descend(this, Math.max(V.camera.zoom, this.minZoom));
            this.layer.schedule();
        }
    }

    render(mode)
    {
        if (this.tree)
        {		
            this.layer.render(this.tree, this.pane);
        }
    }

    loadTile(node)
    {
        this.layer.loadTile(node);
    }

    cancelImage(node)
    {
        this.layer.cancelImage(node);
    }

    raycast(ray, options)
    {
        let distance = 0;
        
        options.distance = distance;
        
        if (options.hits)
        {
            options.hits.push({ id: this.id, distance });
        }
        
        if (options.xyz)
        {
            options.xyz = { x:ray.origin.x , y:ray.origin.y, z:distance };
        }
    }

    getViewpoint()
    {
        return { };
    }
    
    setViewpoint(viewpoint)
    {
    }
}
*/