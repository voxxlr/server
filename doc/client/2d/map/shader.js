
M.Shader = class extends GL.Shader
{
    constructor(vertexShader, fragmentShader)
    {
        super(vertexShader, fragmentShader);
    }

    compile()
    {
        super.compile();
        
        this.defineAttribute("position", 2, gl.FLOAT, false);
        
        this.dxy = gl.getUniformLocation(this.glId, 'dxy');
        this.projection = gl.getUniformLocation(this.glId, 'projection');
        this.split = gl.getUniformLocation(this.glId, 'split');
        this.pane = gl.getUniformLocation(this.glId, 'pane');
    }

    start(pane, vbo)
    {
        gl.useProgram(this.glId);
        this.enableBuffer();
        this.bindBuffer(vbo);
        
        gl.activeTexture(gl.TEXTURE0);
        gl.uniform1i(this.samplerMap, 0);
        gl.uniform2f(this.split, M.splitV*gl.drawingBufferWidth, (1.0-M.splitH)*gl.drawingBufferHeight);
        gl.uniform1f(this.pane, pane);
    }

    end()
    {
        this.disableBuffer();
    }

    renderNode(node, textureId)
    {
        M.Shader.projection[0] = node.projX;
        M.Shader.projection[1] = node.projY;

        gl.uniform3f(this.projection, M.Shader.projection[0], M.Shader.projection[1], M.Shader.projection[2]);
        gl.uniform2f(this.dxy, node.pixelX, node.pixelY);
        gl.bindTexture(gl.TEXTURE_2D, textureId);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    
    renderImage(dX, dY, projX, projY, vbo, textureId)
    {
        M.Shader.projection[0] = projX;
        M.Shader.projection[1] = projY;

        gl.uniform3f(this.projection, M.Shader.projection[0], M.Shader.projection[1], M.Shader.projection[2]);
        gl.uniform2f(this.dxy, dX, dY);
        gl.bindTexture(gl.TEXTURE_2D, textureId);
        gl.drawArrays(gl.TRIANGLES, 0, M.Shader.vbo["position"].length/2);
    }
}

M.Shader.init = function()
{
    var uv = new Float32Array(2*3*2);
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
    
    var position = new Float32Array(2*3*2);
    // triangle 1
    position[0*2+0] =  0;
    position[0*2+1] =  0;
    position[1*2+0] =  256;
    position[1*2+1] =  0;
    position[2*2+0] =  256;
    position[2*2+1] =  256;
    
    // triangle 2
    position[3*2+0] =  0;
    position[3*2+1] =  0;
    position[4*2+0] =  256;
    position[4*2+1] =  256;
    position[5*2+0] =  0;
    position[5*2+1] =  256;
    
    M.Shader.vbo = { uv:  new GL.ArrayBuffer(uv) ,  position:  new GL.ArrayBuffer(position) };
    
    // projection matrix
    M.Shader.projection = new Float32Array([0, 0, -2/256.0]);
}




M.ColorShader = class extends M.Shader
{
    constructor()
    {
        super(M.ColorShader["vs"], M.ColorShader["fs"]);
    }
    
    compile()
    {
        super.compile();

        this.defineAttribute("uv", 2, gl.FLOAT, false);
        
        this.samplerMap = gl.getUniformLocation(this.glId, 'samplerMap');
    }

    start(pane, vbo)
    {
        super.start(pane, vbo);
        gl.disable(gl.DEPTH_TEST);
        gl.depthMask(false)
    }

    end()
    {
        gl.depthMask(true);
        gl.enable(gl.DEPTH_TEST);
        super.end();
    }
}

M.ColorShader["vs"] = `#version 300 es

precision mediump float;
precision mediump int;

uniform vec3 projection;
uniform vec2 dxy;

in vec2 uv;
in vec2 position;

out vec2 textureCoord;

void main()	
{
    textureCoord = uv;
    
    vec4 vertex = vec4((position.x - dxy.x), (position.y - dxy.y), 1.0, 1.0);
    vertex.x *= projection.x;
    vertex.y *= projection.y;
    gl_Position = vertex;
    
}`

M.ColorShader["fs"] = `#version 300 es

precision mediump float;
precision mediump int;

uniform sampler2D samplerMap;
uniform vec3 transparent; 
uniform vec2 split;
uniform float pane;

in vec2 textureCoord;

out vec4 fragmentColor;


void main()	
{
    vec4 color = texture(samplerMap, vec2(textureCoord.s, textureCoord.t));
    
    if (vec3(color) == vec3(1.0))
    {
        discard;
    } 
    
    if (pane == 0.0)
    {
        if (gl_FragCoord.x > split.x || gl_FragCoord.y < split.y)
        {
            discard;
        }
    }
    else
    {
        if (gl_FragCoord.x < split.x && gl_FragCoord.y > split.y)
        {
            discard;
        }
    }
    
    color.a = 1.0;
    fragmentColor =  color;  
}`



M.DepthShader = class extends M.Shader
{
    constructor()
    {
        super(M.DepthShader["vs"], M.DepthShader["fs"]);
        
        this.gradient = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.gradient);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 3, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 255,
                                                                                                   0, 255, 0,
                                                                                                   255, 0, 0])); 
        gl.bindTexture(gl.TEXTURE_2D, null);
    }
    
    compile()
    {
        super.compile();

        this.defineAttribute("uv", 2, gl.FLOAT, false);
        
        this.split = gl.getUniformLocation(this.glId, 'split');
        this.samplerMap = gl.getUniformLocation(this.glId, 'samplerMap');
        this.mode = gl.getUniformLocation(this.glId, 'mode');
        
        this.range = gl.getUniformLocation(this.glId, 'range');
        this.samplerGrd = gl.getUniformLocation(this.glId, 'gradient');
        
        this.light = gl.getUniformLocation(this.glId, 'light');
    }

    start(pane, vbo, mode)
    {
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.gradient);
        gl.depthFunc(gl.ALWAYS);
        
        super.start(pane, vbo);
        
        gl.uniform1i(this.mode, mode);
        gl.uniform1i(this.samplerGrd, 1);
        gl.uniform2f(this.light, 1, 1);
        
        let minH = V.viewer.aabb.min.z;
        let maxH = V.viewer.aabb.max.z;
        gl.uniform2f(this.range, minH, maxH);
    }
    
    end()
    {
        super.end();
        
        gl.depthFunc(gl.LESS);
    }

}


M.DepthShader["vs"] = `#version 300 es

precision mediump float;
precision mediump int;

uniform mat4 projectionMatrix; 

uniform vec3 projection;
uniform vec2 dxy;

in vec2 uv;
in vec2 position;

out vec2 textureCoord;

void main()	
{
    textureCoord = uv;

    vec4 vertex = vec4((position.x - dxy.x), (position.y - dxy.y), 1.0, 1.0);
    vertex.x *= projection.x;
    vertex.y *= projection.y;
    gl_Position = vertex;
}`

M.DepthShader["fs"] = `#version 300 es

precision mediump float;
precision mediump int;

uniform sampler2D samplerMap;
uniform sampler2D gradient;

uniform vec2 range;
uniform vec2 light;
uniform int mode;

uniform vec2 split;
uniform float pane;

in vec2 textureCoord;

out vec4 fragmentColor;

const int DUAL = 1;
const int SINGLE = 2;

const float B = 1.0/130.0;
const float R = 1.0 - 2.0*B;


void main()	
{
    vec2 coord = vec2(B + textureCoord.s*R, B + textureCoord.t*R);

    vec4 value = texture (samplerMap, coord);
    if (value.r == -10000.00)
    {
        discard;
    } 
    
    float dh = range.y - range.x;
    float c0 = (texture(samplerMap, coord + 0.5*B*light).r-range.x)/dh;
    float c1 = (texture(samplerMap, coord - 0.5*B*light).r-range.x)/dh;
    float brightness = 1.0-(c0 - c1)/(4.0*B);
    
    float height = (value.r - range.x)/dh;
    
    vec4 color = texture (gradient, vec2(height, 0.5));
    
    if (pane == 0.0)
    {
        if (gl_FragCoord.x > split.x || gl_FragCoord.y < split.y)
        {
            if (mode == SINGLE)
            {
                fragmentColor =  vec4(1.0);
            }
            else discard;
        }
        else
        {
            fragmentColor =  vec4(color.rgb * brightness, 1.0);
        }
    }
    else
    {
        if (gl_FragCoord.x < split.x && gl_FragCoord.y > split.y)
        {
            if (mode == SINGLE)
            {
                fragmentColor =  vec4(1.0);
            }
            else discard;
        }
        else
        {
            fragmentColor =  vec4(color.rgb * brightness, 1.0);
        }
    }
            
    gl_FragDepth = 1.0-height;
}
`
