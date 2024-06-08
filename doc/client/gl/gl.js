GL = {
        
};


var gl;

/** @constructor */
GL.Buffer = function()
{
    this.glId = gl.createBuffer();
}

GL.Buffer.prototype.clear = function()
{
    if (this.glId != null)
    {
        gl.deleteBuffer(this.glId);
        this.glId = null;
    }
}


GL.ArrayBuffer = class extends GL.Buffer 
{
    constructor(array)
    {
        super();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.glId);
        gl.bufferData(gl.ARRAY_BUFFER, array, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        if (typeof array == 'number')
        {
            this.length = array;
        }
        else
        {
            this.length = array.length;
        }
    }

    set(array)
    {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.glId);
        gl.bufferData(gl.ARRAY_BUFFER, array, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        if (typeof array == 'number')
        {
            this.length = array;
        }
        else
        {
            this.length = array.length;
        }
    }

    write(start, array)
    {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.glId);
        gl.bufferSubData(gl.ARRAY_BUFFER, start, array); 
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }
}


/** @constructor */
GL.ElementBuffer = function(array)
{
    GL.Buffer.call(this);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.glId);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, array, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    this.length = array.length;
}

GL.ElementBuffer.prototype = Object.create(GL.Buffer.prototype);
GL.ElementBuffer.prototype.constructor = GL.ElementBuffer;




/** @constructor */
GL.ImageLoader = function(uri, listener)
{
    this.listener = [];
    if (listener)
    {
        this.listener.push(listener);
    }
    
    if (uri)
    {
        this.load(uri);
    }
}

GL.ImageLoader.prototype.listen = function(listener)
{
    this.listener.push(listener);
}

GL.ImageLoader.prototype.load = function(src)
{
    function isPowerOf2(value) 
    {
        return (value & (value - 1)) == 0;
    }
    
    function nextHighestPowerOfTwo(x) 
    {
        --x;
        for (var i = 1; i < 32; i <<= 1) {
            x = x | x >> i;
        }
        return x + 1;
    }
    
    this.image = document.createElementNS('http://www.w3.org/1999/xhtml', 'img');
    this.image.onload = function () 
    {
        URL.revokeObjectURL(this.image.src);
        
        if (!isPowerOf2(this.image.width) || !isPowerOf2(this.image.height)) 
        {
            var temp = document.createElement("canvas");
            temp.width = nextHighestPowerOfTwo(this.image.width);
            temp.height = nextHighestPowerOfTwo(this.image.height);
            var ctx = temp.getContext("2d");
            ctx.drawImage(this.image, 0, 0, temp.width, temp.height);
            this.image = temp;
        }
        
        for (var i=0; i<this.listener.length; i++)
        {
            this.listener[i].notify(this.image);
        }
        
        this.image = null;
        
    }.bind(this);
    
    this.image.crossOrigin = "Anonymous";
    this.image.src = src;
}



GL.Texture = function(loader, sampler, name)
{
    this.name = name;
    this.glId = gl.createTexture();
    this.sampler = sampler;
    
    if (!this.sampler)
    {
        this.sampler = {};
    }
    
    gl.bindTexture(gl.TEXTURE_2D, this.glId);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255])); // 
    gl.bindTexture(gl.TEXTURE_2D, null);

    if (loader instanceof GL.ImageLoader)
    {
        loader.listen(this);
    }
    else if (loader instanceof Image)
    {
        this.notify(loader);
    }
}

GL.Texture.prototype.clear = function()
{
    if (this.glId != null)
    {
        gl.deleteTexture(this.glId);
        this.glId = null;
    }
}

GL.Texture.prototype.notify = function(image)
{
    gl.bindTexture(gl.TEXTURE_2D, this.glId);
    if (this.sampler.minFilter)
    {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, this.sampler.minFilter);
    }
    else
    {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
    }
    
    if (this.sampler.magFilter)
    {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, this.sampler.magFilter);
    }
    else
    {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    }
    
    if (this.sampler.wrapS)
    {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, this.sampler.wrapS);
    }
    else
    {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    }
    
    if (this.sampler.wrapT)
    {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, this.sampler.wrapT);
    }
    else
    {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    }
    
    if (gl.supports_EXT_texture_filter_anisotropic)
    {
        gl.texParameterf(gl.TEXTURE_2D, gl.anisotropy, gl.maxAnisotropy); // => 16xAF
    }

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.generateMipmap(gl.TEXTURE_2D);
    
    gl.bindTexture(gl.TEXTURE_2D, null);
}





/** @constructor */
GL.Gradient = function(data)
{
    this.name = name;
    
    this.glId = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.glId);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, data.length/4, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(data)); 
    //gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 3, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array([255,0,0, 0,255,0, 0,0,255]));
    gl.bindTexture(gl.TEXTURE_2D, null);
}



/** @constructor */
GL.Material = function(config)
{
    this.name = config.id;
    
    this.diffuse = config.diffuse;
    this.emissive = config.emissive;
    this.specular = config.specular;
    this.ambient = config.ambient;
    
    this.normal = config.normal;
    
    this.transparency = config.transparency;
}
GL.Material.prototype.clear = function ()
{
    function clearProperty(property)
    {
        if (property.texture != null)
        {
            property.texture.clear();
            property.texture = null;
        }
    }
}





