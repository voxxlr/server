
GL.Shader = function(vertexCode, fragmentCode)
{
    this.defines = {};
    this.uniforms = {}

    this.vertexShader = gl.createShader(gl.VERTEX_SHADER);
    this.fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    this.glId = gl.createProgram();
    gl.attachShader(this.glId, this.vertexShader);
    gl.attachShader(this.glId, this.fragmentShader);
    
    this.vertexCode = vertexCode;
    this.fragmentCode = fragmentCode;
    
    this.config = ""; 
}

GL.Shader.prototype.defineUniforms = function(list)
{
    //gl.useProgram(this.glId);
    for (var i=0; i<list.length; i++)
    {
        this.uniforms[list[i]] =  gl.getUniformLocation(this.glId, list[i]);
    }
    //gl.useProgram(null);
}


GL.Shader.prototype.enableBuffer = function(buffer)
{
    if (buffer)
    {
        for (var i=0; i<this.attributes.length; i++)
        {
            var attr = this.attributes[i];
            if (buffer[attr.name])
            {
                gl.enableVertexAttribArray(attr.location);
            }
        }
    }
    else
    {
        for (var i=0; i<this.attributes.length; i++)
        {
            var attr = this.attributes[i];
            gl.enableVertexAttribArray(attr.location);
        }
    }
}

GL.Shader.prototype.bindBuffer = function(buffer)
{
    for (var i=0; i<this.attributes.length; i++)
    {
        var attr = this.attributes[i];
        if (buffer[attr.name])
        {
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer[attr.name].glId);
            gl.vertexAttribPointer(attr.location, attr.size, attr.type, attr.normalize, 0, 0);
        }
    }
}

GL.Shader.prototype.disableBuffer = function(buffer)
{
    if (buffer)
    {
        for (var i=0; i<this.attributes.length; i++)
        {
            var attr = this.attributes[i];
            if (buffer[attr.name])
            {
                gl.disableVertexAttribArray(attr.location);
            }
        }
    }
    else
    {
        for (var i=0; i<this.attributes.length; i++)
        {
            var attr = this.attributes[i];
            gl.disableVertexAttribArray(attr.location);
        }
    }
}

GL.Shader.prototype.defineAttribute = function(name, size, type, normalize, shadername)
{
    var location = gl.getAttribLocation(this.glId, shadername == null ? name : shadername);
    if (location != -1)
    {
        this.attributes.push({ location : location, name: name, size: size, type: type, normalize: normalize });
    }
    else
    {
        console.log("attribute " + name + " not found ");
    }
}

GL.Shader.prototype.undefineAttribute = function(name)
{
    for (var i=0; i<this.attributes.length; i++)
    {
        var attr = this.attributes[i];
        if (attr.name === name)
        {
            this.attributes.splice(i,1);
            break;
        }
    }
}

GL.Shader.prototype.defineDirective = function(name)
{
    this.defines[name] = value;
}

GL.Shader.prototype.undefineDirective = function(name)
{
    delete this.defines[name];
}

GL.Shader.prototype.compile = function(directive)
{
    // defines
    for (var d in this.defines)
    {
        if (this.defines[d] ==  true)
        {
            this.config += "#define " + d + "\n";
        }
    }
    
    var vertexCode;
    if (this.vertexCode.startsWith("#version"))
    {
        var newLine = this.vertexCode.indexOf('\n')+1;
        vertexCode = this.vertexCode.slice(0, newLine) +  this.config + this.vertexCode.slice(newLine);
    }
    else
    {
        vertexCode = this.config + this.vertexCode;
    }
    
    // vertex shader
    gl.shaderSource(this.vertexShader, vertexCode);
    gl.compileShader(this.vertexShader);
    if (gl.getShaderParameter(this.vertexShader, gl.COMPILE_STATUS) === false) 
    {
        console.error('Vertex Shader compile error');
    }
    if (gl.getShaderInfoLog(this.vertexShader) !== '') 
    {
        console.warn(gl.getShaderInfoLog(this.vertexShader));
    }
    
    
    var fragmentCode;
    if (this.fragmentCode.startsWith("#version"))
    {
        var newLine = this.fragmentCode.indexOf('\n')+1;
        fragmentCode = this.fragmentCode.slice(0, newLine) +  this.config + this.fragmentCode.slice(newLine);
    }
    else
    {
        fragmentCode = this.config + this.fragmentCode;
    }
    
    // fragment shader
    gl.shaderSource(this.fragmentShader,fragmentCode);
    gl.compileShader(this.fragmentShader);
    if (gl.getShaderParameter(this.fragmentShader, gl.COMPILE_STATUS) === false) 
    {
        console.error('Fragment Shader compile error');
    }
    if (gl.getShaderInfoLog(this.fragmentShader) !== '') 
    {
        console.warn(gl.getShaderInfoLog(this.fragmentShader));
    }
    
    //gl.attachShader(this.glId, this.vertexShader);
    //gl.attachShader(this.glId, this.fragmentShader);
    gl.linkProgram(this.glId);
    
    this.config = "";

    this.attributes = [];
}

GL.Shader.prototype.useProgram = function(camera)
{
    GL.Shader.glId = this.glId;
    
    gl.useProgram(this.glId);
}

GL.Shader.prototype.isActive = function()
{
    return GL.Shader.glId == this.glId;
}

GL.Shader.prototype.clear = function()
{
    gl.deleteProgram(this.glId);
}



/** @constructor */
GL.ShaderMVP = function(vertexCode, fragmentCode)
{
    GL.Shader.call(this, vertexCode, fragmentCode);
}

GL.ShaderMVP.prototype = Object.create(GL.Shader.prototype);
GL.ShaderMVP.prototype.constructor = GL.ShaderMVP;

GL.ShaderMVP.prototype.useProgram = function(camera)
{
    GL.Shader.prototype.useProgram.call(this);
    
    gl.uniformMatrix4fv(this.modelViewMatrix, false, camera.modelViewMatrix);
    gl.uniformMatrix4fv(this.projectionMatrix, false, camera.projection.matrix);
}

GL.ShaderMVP.prototype.updateModelMatrix = function(camera)
{
    gl.uniformMatrix4fv(this.modelViewMatrix, false, camera.modelViewMatrix);
}

GL.ShaderMVP.prototype.compile  = function()
{
    GL.Shader.prototype.compile.call(this);
    
    // uniforms
    this.modelViewMatrix = gl.getUniformLocation(this.glId, 'modelViewMatrix');
    this.projectionMatrix = gl.getUniformLocation(this.glId, 'projectionMatrix');
}


/** @constructor */
GL.LineShader = function()
{
    GL.ShaderMVP.call(this, GL.LineShader["vs"], GL.LineShader["fs"]);
}

GL.LineShader.prototype = Object.create(GL.ShaderMVP.prototype);
GL.LineShader.prototype.constructor = GL.LineShader;

GL.LineShader.prototype.compile  = function()
{
    GL.ShaderMVP.prototype.compile.call(this);

    this.defineAttribute("position", 3, gl.FLOAT, false);
    this.defineAttribute("color", 3, gl.UNSIGNED_BYTE, true);
}

GL.LineShader["vs"] = `
precision mediump float;
precision mediump int;

uniform mat4 modelViewMatrix; 
uniform mat4 projectionMatrix; 

attribute vec3 position;
attribute vec3 color;

varying vec3 vColor;

void main()	
{
    vColor = color;
    gl_Position = projectionMatrix * (modelViewMatrix * vec4(position, 1.0));
}
`

GL.LineShader["fs"] = `
precision mediump float;
precision mediump int;

varying vec3 vColor;

void main()	
{
    gl_FragColor = vec4(vColor, 1);
    //gl_FragColor = vec4(1,1,1, 1);
}`




/** @constructor */
GL.CopyShader = function()
{
    GL.Shader.call(this, GL.CopyShader["vs"], GL.CopyShader["fs"]);
}

GL.CopyShader.prototype = Object.create(GL.ShaderMVP.prototype);
GL.CopyShader.prototype.constructor = GL.CopyShader;

GL.CopyShader.prototype.compile  = function()
{
    GL.ShaderMVP.prototype.compile.call(this);

    this.defineAttribute("position", 3, gl.FLOAT, false);
    this.defineAttribute("color", 3, gl.UNSIGNED_BYTE, true);
}

GL.CopyShader["vs"] = `
attribute vec3 position;

void main()	
{
    gl_Position = position;
}
`

GL.CopyShader["fs"] = `
precision mediump float;
precision mediump int;

varying vec3 vColor;

void main()	
{
    gl_FragColor = vec4(vColor, 1);
    //gl_FragColor = vec4(1,1,1, 1);
}`


