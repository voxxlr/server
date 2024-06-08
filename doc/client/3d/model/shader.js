
M.Material = class
{
    constructor(shader)
    {
        this.shader = shader;
        this.mode = M.Material.OPAQUE;
    }
    
    use()
    {
        if (!this.shader.isActive())
        {
            this.shader.useProgram(V.camera);
        }
        
        this.shader.bindMaterial(this);
    }

    bind(buffers)
    {
        this.shader.enableBuffer(buffers);
        this.shader.bindBuffer(buffers);
    }

    unbind(buffers)
    {
        this.shader.disableBuffer(buffers);
    }   
    
    clear()
    {
    }

    /*
    compile()
    {
        super.compile();
        
        this.selected = gl.getUniformLocation(this.glId, 'uSelected');
    }

    static setSelected(state)
    {
        gl.uniform1i(this.selected, state ? 1 : 0);
    }
    */
}

M.Material.OPAQUE = 1;
M.Material.BLEND = 2;
M.Material.MASK = 3;



//
// Pbr
//

M.PbrMaterial = class extends M.Material
{
    constructor(config, textures)
    {
        super(M.PbrShader.get());
        
        // control buffer
        this.controlV = new Int32Array(new ArrayBuffer(this.shader.controlSize));
        this.controlV[0] = 0;  // has baseColorTexture
        this.controlV[1] = 0;  // has metallicRoughnessTexture
        this.controlV[2] = 0;
        this.controlV[3] = 0;
        this.controlV[4] = 0;	
        this.controlUB = gl.createBuffer();
        
        // value buffer
        this.metallicV = new Float32Array(new ArrayBuffer(this.shader.metallicSize));
        this.metallicUB = gl.createBuffer();
        
        this.textures = textures;
        this.update(config);
    }
    
    update(config)
    {	
        if (!config.pbrMetallicRoughness)
        {
            return;
        }
        if (config.pbrMetallicRoughness.baseColorFactor)
        {
            this.metallicV[0] = config.pbrMetallicRoughness.baseColorFactor[0];
            this.metallicV[1] = config.pbrMetallicRoughness.baseColorFactor[1];
            this.metallicV[2] = config.pbrMetallicRoughness.baseColorFactor[2];
            this.metallicV[3] = config.pbrMetallicRoughness.baseColorFactor[3];
        }
        else
        {
            this.metallicV[0] = 1;
            this.metallicV[1] = 1;
            this.metallicV[2] = 1;
            this.metallicV[3] = 1;
        }

        // emissiveColor
        if (config.emissiveFactor)
        {
            this.metallicV[4] = config.emissiveFactor[0];
            this.metallicV[5] = config.emissiveFactor[1];
            this.metallicV[6] = config.emissiveFactor[2];
            this.metallicV[7] = 1.0;
        }
        else
        {
            this.metallicV[4] = 0;
            this.metallicV[5] = 0;
            this.metallicV[6] = 0;
            this.metallicV[7] = 0;
        }
        
        this.doubleSided = config.doubleSided;
        
        // roughness
        if (config.pbrMetallicRoughness.roughnessFactor != undefined)
        {
            this.metallicV[8] = config.pbrMetallicRoughness.roughnessFactor;
        }
        else
        {
            this.metallicV[8] = 1;
        }
         
        if (config.pbrMetallicRoughness.metallicFactor != undefined)
        {
            this.metallicV[9] = config.pbrMetallicRoughness.metallicFactor;
        }
        else
        {
            this.metallicV[9] = 1;
        }
        
        // alpha
        if (config.alphaMode)
        {
            if (config.alphaMode == "MASK")
            {
                this.mode = M.Material.MASK;
                if (config.alphaCutoff)
                {
                    this.metallicV[10] = config.alphaCutoff;
                }
                else
                {
                    this.metallicV[10] = 0.5;
                }
            }
            else if (config.alphaMode == "BLEND")
            {
                this.mode = M.Material.BLEND;
            }
        }
        
        this.controlV[5] = this.mode;
         
        
        // textures
        this.NO_TEXTURE = new GL.Texture();

        var texture = config.pbrMetallicRoughness.baseColorTexture;
        if (texture)
        {
            this.controlV[0] = 1;
            this.baseColorTexture = this.textures[texture.index];
        }
        else
        {
            this.controlV[0] = 0;
            this.baseColorTexture = this.NO_TEXTURE;
        }
        
        var texture = config.pbrMetallicRoughness.metallicRoughnessTexture;
        if (texture)
        {
            this.controlV[1] = 1;
            this.metallicRoughnessTexture = this.textures[texture.index];
        }
        else
        {
            this.controlV[1] = 0;
            this.metallicRoughnessTexture = this.NO_TEXTURE;
        }
        
        var texture = config.normalTexture;
        if (texture)
        {
            this.controlV[2] = 1;
            this.normalTexture = this.textures[texture.index];
        }
        else
        {
            this.controlV[2] = 0;
            this.normalTexture = this.NO_TEXTURE;
        }

        var texture = config.occlusionTexture;
        if (texture)
        {
            this.controlV[3] = 1;
            this.occlusionTexture = this.textures[texture.index];
        }
        else
        {
            this.controlV[3] = 0;
            this.occlusionTexture = this.NO_TEXTURE;
        }
        
        var texture = config.emissiveTexture;
        if (texture)
        {
            this.controlV[4] = 1;
            this.emissiveTexture = this.textures[texture.index];
        }
        else
        {
            this.controlV[4] = 0;
            this.emissiveTexture = this.NO_TEXTURE;
        }
        
         // create uniform buffers
        gl.bindBuffer(gl.UNIFORM_BUFFER, this.controlUB);
        gl.bufferData(gl.UNIFORM_BUFFER, this.controlV, gl.DYNAMIC_DRAW);	 
        gl.bindBuffer(gl.UNIFORM_BUFFER, null);

        gl.bindBuffer(gl.UNIFORM_BUFFER, this.metallicUB);
        gl.bufferData(gl.UNIFORM_BUFFER, this.metallicV, gl.DYNAMIC_DRAW);	 
        gl.bindBuffer(gl.UNIFORM_BUFFER, null);	
    }
    
    clear()
    {
        gl.deleteBuffer(this.controlUB);
        gl.deleteBuffer(this.metallicUB);
    }
}


    

M.PbrShader = class extends GL.ShaderMVP
{
    constructor(camera)
    {
        super(M.PbrShader["vs"], M.PbrShader["fs"]);
        
        this.NO_TEXTURE = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.NO_TEXTURE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255])); 
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.bindTexture(gl.TEXTURE_2D, null);
        
        this.compile();
        
        this.clipPlanes = new Float32Array(4*4);  // max of 4 clip planes
        this.clipPlanes.fill(0);
    }

    compile()
    {
        // clipping planes
        var clipPlanes = this.clipPlanes;
        /*
        for (var i=0; i<4; i++)
        {
            if (clipPlanes[i*4+3] != 0)
            {
                this.config += "#define CLIP"+i+" "+clipPlanes[i*4+0]+","+clipPlanes[i*4+1]+","+clipPlanes[i*4+2]+","+clipPlanes[i*4+3]+"\n";
            }
        }
        */
        
        GL.ShaderMVP.prototype.compile.call(this);

        this.defineAttribute("aPosition", 3, gl.FLOAT, false);
        //this.defineAttribute("aNormal", 3, gl.FLOAT, false);
        this.defineAttribute("aNormal", 4, gl.INT_2_10_10_10_REV, true);
        this.defineAttribute("aTangent", 4, gl.FLOAT, false);
        this.defineAttribute("aUv", 2, gl.FLOAT, false);
        
        // bind non-textures
        this.baseColorTexture = gl.getUniformLocation(this.glId, 'sBaseColorTexture');
        this.metallicRoughnessTexture = gl.getUniformLocation(this.glId, 'sMetallicRoughnessTexture');
        this.normalTexture = gl.getUniformLocation(this.glId, 'sNormalTexture');
        this.occlusionTexture = gl.getUniformLocation(this.glId, 'sOcclusionTexture');
        this.emissiveTexture = gl.getUniformLocation(this.glId, 'sEmissiveTexture');
        
        gl.useProgram(this.glId);

        gl.uniform1i(this.baseColorTexture, 0);
        gl.uniform1i(this.metallicRoughnessTexture, 1);
        gl.uniform1i(this.normalTexture, 2);
        gl.uniform1i(this.occlusionTexture, 3);
        gl.uniform1i(this.emissiveTexture, 4);
        
        gl.useProgram(null);
        
        //
        this.controlUBO = gl.getUniformBlockIndex(this.glId, "Control");
        gl.uniformBlockBinding(this.glId, this.controlUBO, 1);
        this.controlSize = gl.getActiveUniformBlockParameter(this.glId, this.controlUBO, gl.UNIFORM_BLOCK_DATA_SIZE);

        this.metallicUBO = gl.getUniformBlockIndex(this.glId, "MetallicRoughness");
        gl.uniformBlockBinding(this.glId, this.metallicUBO, 2);
        this.metallicSize = gl.getActiveUniformBlockParameter(this.glId, this.metallicUBO, gl.UNIFORM_BLOCK_DATA_SIZE);
    }

    bindMaterial(material) 
    {
        gl.bindBufferBase(gl.UNIFORM_BUFFER, 1, material.controlUB);	 
        gl.bindBufferBase(gl.UNIFORM_BUFFER, 2, material.metallicUB);	 
        
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, material.baseColorTexture.glId);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, material.metallicRoughnessTexture.glId);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, material.normalTexture.glId);
        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, material.occlusionTexture.glId);
        gl.activeTexture(gl.TEXTURE4);
        gl.bindTexture(gl.TEXTURE_2D, material.emissiveTexture.glId);
        
        if (material.alphaMode == M.Material.BLEND)
        {
            gl.enable(gl.BLEND);
        }
        else
        {
            gl.disable(gl.BLEND);
        }
    }
    
    clear()
    {
        super.clear();
        gl.deleteTexture(this.NO_TEXTURE);
    }

    toJson()
    {
        return {
            name : this.name,
        }	
    }
}

M.PbrShader.get = function()
{
    if (!M.PbrShader.instance)
    {
        M.PbrShader.instance = new M.PbrShader();
        M.PbrShader.instance.compile();
    }
    
    return M.PbrShader.instance;
}




M.PbrShader["vs"] = `#version 300 es

precision mediump float;
precision mediump int;

uniform mat4 modelViewMatrix; 
uniform mat4 projectionMatrix; 

layout(std140) uniform Control {
    uniform int cBaseColorTexture;
    uniform int cMetallicRoughnessTexture;
    uniform int cNormalTexture;
    uniform int cOcclusionTexture;
    uniform int cEmissiveTexture;
    uniform int cAlphaMode;
};


layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in vec4 aTangent;
layout(location = 3) in vec2 aUv;
layout(location = 4) in mat4 aMatrix;

out mat3 vTBN;
out vec3 vNormal;

out vec3 vCamera;
out vec2 vUv;
out vec3 vLight;

void main()	
{
    mat4 viewMatrix = modelViewMatrix * aMatrix;
    mat3 normalMatrix = mat3(viewMatrix);

    vec4 viewVertex = viewMatrix*vec4(aPosition, 1.0);
    vCamera = viewVertex.xyz;
    
    vNormal = normalize(normalMatrix * aNormal);
    
    if (cNormalTexture == 1)
    {
        vec3 t = normalize(normalMatrix * aTangent.xyz);
        vec3 b = cross(vNormal, t) * aTangent.w;
        vTBN = mat3(t, b, vNormal);
    }
    
    vUv = aUv;

    //vLight = vec3(0.57735026919, 0.57735026919, 0.57735026919);
    //vLight = vec3(1, 0, 0);
    vLight = vec3(0, 0, 1);
    
    gl_Position = projectionMatrix * viewVertex;
}

`




M.PbrShader["fs"] = `#version 300 es

precision mediump float;
precision mediump int;

in vec3 vCamera;
in vec3 vNormal;
in mat3 vTBN;
in vec2 vUv;
in vec3 vLight;

uniform sampler2D sBaseColorTexture;
uniform sampler2D sMetallicRoughnessTexture;
uniform sampler2D sNormalTexture;
uniform sampler2D sOcclusionTexture;
uniform sampler2D sEmissiveTexture;

layout(std140) uniform Control 
{
    uniform int cBaseColorTexture;
    uniform int cMetallicRoughnessTexture;
    uniform int cNormalTexture;
    uniform int cOcclusionTexture;
    uniform int cEmissiveTexture;
    uniform int cAlphaMode;
};

const int OPAQUE = 1;
const int BLEND = 2;
const int MASK = 3;

layout(std140) uniform MetallicRoughness 
{
    uniform vec4 uBaseColorFactor;
    uniform vec4 uEmissiveFactor;
    uniform float uRoughness;
    uniform float uMetallic;
    uniform float uAlphaCutoff;
};

out vec4 fragmentColor;

const float M_PI = 3.141592653589793;
const vec3 F0 = vec3(0.04);

struct AngularInfo
{
    float NdotL;
    float NdotV;
    float NdotH;
    float LdotH;
    float VdotH;

    vec3 padding;
};


AngularInfo getAngularInfo(vec3 pointToLight, vec3 normal, vec3 view)
{
    vec3 n = normalize(normal);
    vec3 v = normalize(view);
    vec3 l = normalize(pointToLight);
    vec3 h = normalize(l + v);

    float NdotL = clamp(dot(n, l), 0.0, 1.0);
    float NdotV = clamp(dot(n, v), 0.0, 1.0);
    float NdotH = clamp(dot(n, h), 0.0, 1.0);
    float LdotH = clamp(dot(l, h), 0.0, 1.0);
    float VdotH = clamp(dot(v, h), 0.0, 1.0);

    return AngularInfo(
        NdotL,
        NdotV,
        NdotH,
        LdotH,
        VdotH,
        vec3(0, 0, 0)
    );
}

vec3 LINEARtoSRGB(vec3 color);
vec4 SRGBtoLINEAR(vec4 srgbIn);
vec3 toneMap(vec3 color);

void main()	
{
    vec4 lBaseColor = uBaseColorFactor;

    if (cBaseColorTexture == 1)
    {
        lBaseColor *= SRGBtoLINEAR(texture(sBaseColorTexture, vUv));
    }
    
    float lRoughness = uRoughness;
    float lMetallic = uMetallic;
    if (cMetallicRoughnessTexture == 1)
    {
        vec4 value = texture(sMetallicRoughnessTexture, vUv);
        lRoughness *= value.g;
        lMetallic *= value.b;
    }
    lRoughness = max(lRoughness, 0.04);

    vec3 lNormal;
    if (cNormalTexture == 1)
    {
        lNormal = vTBN * (2.0 * texture(sNormalTexture, vUv).rgb - 1.0);   
    }
    else
    {
        lNormal = vNormal;
    }
    
    if (!gl_FrontFacing)
    {
        lNormal =- lNormal;
    }
  
    AngularInfo angles = getAngularInfo(vLight, lNormal, -vCamera);

    vec3 lColor = vec3(0.0, 0.0, 0.0);
    if (angles.NdotL > 0.0 || angles.NdotV > 0.0)
    {
        vec3 lDiffuse = lBaseColor.rgb * (vec3(1.0) - F0) * (1.0 - lMetallic);
        vec3 lSpecular = mix(F0, lBaseColor.rgb, lMetallic);

        vec3 specularR0 = lSpecular;
        vec3 specularR90 = vec3(clamp(max(max(lSpecular.r, lSpecular.g), lSpecular.b) * 50.0, 0.0, 1.0));
    
        // specular
        vec3 F = specularR0 + (specularR90 - specularR0) * pow(clamp(1.0 - angles.VdotH, 0.0, 1.0), 5.0);
        
        // visibility occlusion
        float alphaRoughnessSq = pow(lRoughness, 4.0);
        float Vis = 0.0;
        float GGXV = angles.NdotL * sqrt(angles.NdotV * angles.NdotV * (1.0 - alphaRoughnessSq) + alphaRoughnessSq);
        float GGXL = angles.NdotV * sqrt(angles.NdotL * angles.NdotL * (1.0 - alphaRoughnessSq) + alphaRoughnessSq);
        float GGX = GGXV + GGXL;
        if (GGX > 0.0)
        {
            Vis = 0.5 / GGX;
        }
        
        // microfacet distribution
        float f = (angles.NdotH * alphaRoughnessSq - angles.NdotH) * angles.NdotH + 1.0;
        float D = alphaRoughnessSq / (M_PI * f * f);
 
        lColor = (angles.NdotL + 0.15)* ((1.0-F)*lDiffuse + F*Vis*D);
    }
    
    if (cOcclusionTexture == 1)
    {
        float ao = texture(sOcclusionTexture, vUv).r;
        lColor = mix(lColor, lColor*ao, 1.0);
    }
    
    if (cEmissiveTexture == 1)
    {
        lColor += SRGBtoLINEAR(texture(sEmissiveTexture, vUv)).rgb * uEmissiveFactor.rgb;
    }
    else
    {
        lColor += uEmissiveFactor.rgb;
    }
    
    float lAlpha = 1.0;
    switch (cAlphaMode)
    {
        case BLEND:
            lAlpha = lBaseColor.a;
        break;
        case MASK:
        if(lBaseColor.a < uAlphaCutoff)
        {
            discard;
        }
        break;
    }
    
    fragmentColor = vec4(toneMap(lColor), lAlpha);
    //fragmentColor = vec4(lColor, lAlpha);
    //fragmentColor = vec4(1);
    //fragmentColor = vec4(LINEARtoSRGB(lBaseColor.rgb), 1.0);
    //fragmentColor = vec4(LINEARtoSRGB(lSpecular.rgb), 1.0);
    //fragmentColor = vec4(f0);
    //fragmentColor = vec4(vec3(pow(angles.VdotH, 8.0)), 1.0);
    //fragmentColor = vec4(vec3(angles.NdotH), 1.0);
    //fragmentColor = vec4(texture (sBaseColorTexture, vUv).rgb, 1);
    //fragmentColor = vec4(texture (sBaseColorTexture, vUv).rgb, 1);
    //fragmentColor = vec4(normalize(vNormal), 1.0);
    //fragmentColor = vec4(vec3(lMetallic), 1.0);
    //fragmentColor = vec4(texture(sEmissiveTexture, vUv).rgb, 1);
}


const float GAMMA = 2.2;
const float EXPOSURE = 1.3;

vec3 LINEARtoSRGB(vec3 color)
{
    return pow(color, vec3(1.0/GAMMA));
}

vec4 SRGBtoLINEAR(vec4 srgbIn)
{
    return vec4(pow(srgbIn.xyz, vec3(GAMMA)), srgbIn.w);
}

// Hejl Richard tone map
// see: http://filmicworlds.com/blog/filmic-tonemapping-operators/
vec3 toneMapHejlRichard(vec3 color)
{
    color = max(vec3(0.0), color - vec3(0.004));
    return (color*(6.2*color+.5))/(color*(6.2*color+1.7)+0.06);
}

// ACES tone map
// see: https://knarkowicz.wordpress.com/2016/01/06/aces-filmic-tone-mapping-curve/
vec3 toneMapACES(vec3 color)
{
    const float A = 2.51;
    const float B = 0.03;
    const float C = 2.43;
    const float D = 0.59;
    const float E = 0.14;
    return LINEARtoSRGB(clamp((color * (A * color + B)) / (color * (C * color + D) + E), 0.0, 1.0));
}

vec3 toneMap(vec3 color)
{
    color *= EXPOSURE;

//   return toneMapHejlRichard(color);
    return toneMapACES(color);
//    return LINEARtoSRGB(color);
}




`
















//
// Ifc
//


M.IfcSurfaceStyle = class extends M.Material
{
    constructor(config)
    {
        super(M.IfcSurfaceShader.get())
        
        this.surfaceColor = new Float32Array([ config.surfaceColor.r, config.surfaceColor.g, config.surfaceColor.b, config.surfaceColor.a != undefined ? config.surfaceColor.a : 1.0]);
        
        this.config = config;
    /*
        this.surfaceColor[0] = 0.886275;
        this.surfaceColor[1] = 0.960784;
        this.surfaceColor[2] = 1;
    */
//		console.log(this.surfaceColor);
        
        if (this.surfaceColor[3] != 1.0)
        {
            this.mode = M.Material.BLEND;
        }
        else
        {
            this.mode = M.Material.OPAQUE;
        }
    }
    
    update(config)
    {	
        this.surfaceColor[0] = config.surfaceColor.r;
        this.surfaceColor[1] = config.surfaceColor.g;
        this.surfaceColor[2] = config.surfaceColor.b;
        
        if (this.mode == M.Material.BLEND)
        {
            this.surfaceColor[3] = config.surfaceColor.a;
        }
    }
}





M.IfcSurfaceShader = class extends GL.ShaderMVP
{
    constructor()
    {
        super(M.IfcSurfaceShader["vs"], M.IfcSurfaceShader["fs"]);
        
        this.clipPlanes = new Float32Array(4*4);  // max of 4 clip planes
        this.clipPlanes.fill(0);
    }

    compile ()
    {
        // clipping planes
        var clipPlanes = this.clipPlanes;
        for (var i=0; i<4; i++)
        {
            if (clipPlanes[i*4+3] != 0)
            {
                this.config += "#define CLIP"+i+" "+clipPlanes[i*4+0]+","+clipPlanes[i*4+1]+","+clipPlanes[i*4+2]+","+clipPlanes[i*4+3]+"\n";
            }
        }
        
        super.compile();

        this.defineAttribute("aPosition", 3, gl.FLOAT, false);
        //this.defineAttribute("aNormal", 3, gl.FLOAT, false);
        this.defineAttribute("aNormal", 4, gl.INT_2_10_10_10_REV, true);
        
        this.surfaceColor = gl.getUniformLocation(this.glId, 'surfaceColor');
    }

    bindMaterial (material) 
    {
        gl.uniform4fv(this.surfaceColor, material.surfaceColor);
    }

    toJson()
    {
        return {
            name : this.name,
        }	
    }

    static get()
    {
        if (!M.IfcSurfaceShader.instance)
        {
            M.IfcSurfaceShader.instance = new M.IfcSurfaceShader();
            M.IfcSurfaceShader.instance.compile();
        }
        
        return M.IfcSurfaceShader.instance;
    }
}


M.IfcSurfaceShader["vs"] = `#version 300 es

precision mediump float;
precision mediump int;

uniform mat4 modelViewMatrix; 
uniform mat4 projectionMatrix; 

layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aNormal;
layout(location = 3) in vec2 aUv;
layout(location = 4) in mat4 aMatrix;

out vec3 vNormal;
out vec3 vCamera;
out vec2 vUv;
out vec3 vLight;

void main()	
{
    mat4 viewMatrix = modelViewMatrix * aMatrix;
    mat3 normalMatrix = mat3(viewMatrix);

    vec4 viewVertex = viewMatrix*vec4(aPosition, 1.0);
    vCamera = normalize(viewVertex.xyz);
    
    vNormal = normalize(normalMatrix * aNormal);
        
    vUv = aUv;
    vLight = normalize(vec3(0, 0, 1));
    //vLight = normalize(normalMatrix * vec3(0, 0.70710678118, 0.70710678118));
    //vLight = normalize(normalMatrix * vec3(0.57735026919, 0.57735026919, 0.57735026919));
    //vLight = vec3(0, 0.70710678118, 0.70710678118);
    //vLight = vec3(0.57735026919, 0.57735026919, 0.57735026919);
    
    gl_Position = projectionMatrix * viewVertex;
}

`

M.IfcSurfaceShader["fs"] = `#version 300 es

precision mediump float;
precision mediump int;

uniform vec4 surfaceColor; 

in vec3 vNormal;
in vec2 vUv;
in vec3 vLight;
in vec3 vCamera;

out vec4 fragmentColor;

const vec3 cBelow = vec3(0.2,0.2,0.2);
const vec3 cAbove = vec3(0.8,0.8,0.8);
 
const float GAMMA = 0.9;
const float EXPOSURE = 1.3;

void main()	
{
    vec3 lNormal = vNormal;
    if (!gl_FrontFacing)
    {
        lNormal =- lNormal;
    }
 
    float NdotL = dot(vNormal, vLight);

    float weight = 0.5*NdotL+0.5;
    
    vec3 ambient = surfaceColor.rgb*mix(cBelow, cAbove, weight);
    
    fragmentColor = vec4(pow(ambient* EXPOSURE, vec3(1.0/GAMMA)), surfaceColor.a);
    
    //fragmentColor = vec4(vNormal, 1.0);
}
`

