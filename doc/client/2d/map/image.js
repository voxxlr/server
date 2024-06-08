

M.Image = class extends V.Dataset
{
    constructor(config, loadedCb, pane)
    {
        super(config);

        let image = new Image();
        image.onload = () =>
        {
            this.textureId = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, this.textureId);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8 , gl.RGBA, gl.UNSIGNED_BYTE, image);
            gl.generateMipmap(gl.TEXTURE_2D);
            gl.bindTexture(gl.TEXTURE_2D, null);
            
            URL.revokeObjectURL(image.src);
            
            loadedCb(this.config);
            V.touch3d();
        };
        
        
        let uv = new Float32Array(2*3*2);
        uv[0*2+0] = 0;
        uv[0*3+1] = 0;
        uv[1*2+0] = 1;
        uv[1*2+1] = 0;
        uv[2*2+0] = 1;
        uv[2*2+1] = 1;
        
        // triangle 2
        uv[3*2+0] = 0;
        uv[3*2+1] = 0;
        uv[4*2+0] = 1;
        uv[4*2+1] = 1;
        uv[5*2+0] = 0;
        uv[5*2+1] = 1;
        
        let position = new Float32Array(2*3*2);
        
        // triangle 1
        position[0*2+0] =  config.x0;
        position[0*2+1] =  config.y0;
        position[1*2+0] =  256-config.x0;
        position[1*2+1] =  config.y0;
        position[2*2+0] =  256-config.x0;
        position[2*2+1] =  256-config.y0;
        
        // triangle 2
        position[3*2+0] =  config.x0;
        position[3*2+1] =  config.y0;
        position[4*2+0] =  256-config.x0;
        position[4*2+1] =  256-config.y0;
        position[5*2+0] =  config.x0;
        position[5*2+1] =  256-config.y0;
        
        this.vbo = { uv:  new GL.ArrayBuffer(uv) ,  position:  new GL.ArrayBuffer(position) };

        GL.BoundingBox.set(this, [position[0*2+0],position[0*2+1],0], [position[2*2+0], position[2*2+1], 0])
        
        M.minZoom = Math.min(0, M.minZoom); 
        M.maxZoom = Math.max(Math.ceil(Math.log(Math.max(config.x1-config.x0, config.y1-config.y0))), M.maxZoom);

        //image.onerror = this.imageError.bind(this);
        image.crossOrigin = "Anonymous";
        image.src = this.url;
        
        this.pane = pane;
    }

    update()
    {
    }

    render(mode)
    {
        if (this.textureId)
        {
            var prj = 2.0/V.camera.pixelSize;
            let projX = prj/gl.drawingBufferWidth;
            let projY = prj/gl.drawingBufferHeight;
            
            M.ColorShader.instance.start(this.pane, this.vbo);
            M.ColorShader.instance.renderImage(V.camera.position.x, 256- V.camera.position.y, projX ,projY, this.vbo, this.textureId);
            M.ColorShader.instance.end();
        }
    }
    
    unload()
    {
        gl.deleteTexture(this.textureId);
        delete this.textureId;
    }


    raycast(ray, options)
    {
        options.distance = 0;
        
        if (options.hits)
        {
            options.hits.push({ id: this.id, distance:0 });
        }
        
        if (options.xyz)
        {
            options.xyz = { x:ray.origin.x , y:ray.origin.y, z:0 };
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

