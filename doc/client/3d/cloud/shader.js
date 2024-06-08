M.CloudShader = class extends GL.ShaderMVP
{
    constructor()
    {
        super(M.CloudShader["vs"], M.CloudShader["fs"]);

        this.scalar = 1.0;
        
        this.clipPlanes = new Float32Array(4*4);  // max of 4 clip planes
        this.clipPlanes.fill(0);
    }
    
    compile()
    {
        var clipPlanes = this.clipPlanes;
        for (var i=0; i<4; i++)
        {
            if (clipPlanes.length >= (i+1)*4)
            {
                if (clipPlanes[i*4+3] != 0)
                {
                    this.config += "#define CLIP"+i+" "+clipPlanes[i*4+0]+","+clipPlanes[i*4+1]+","+clipPlanes[i*4+2]+","+clipPlanes[i*4+3]+"\n";
                }
            }
        }
        
        super.compile();

        this.defineAttribute("position", 3, gl.FLOAT, false);

        // uniforms
        this.screenH = gl.getUniformLocation(this.glId, 'screenH');
        this.pointSize = gl.getUniformLocation(this.glId, 'pointSize');
        this.alpha = gl.getUniformLocation(this.glId, 'alpha');
        this.ortho = gl.getUniformLocation(this.glId, 'ortho');
    }

    useProgram(camera)
    {
        super.useProgram(camera);

        gl.uniform1f(this.screenH,gl.drawingBufferHeight);
        
        if (camera.projection == V3.ORTHOGRAPHIC)  // TODO get rid of V3.ORTHOGRAPHIC 
        {
            gl.uniform1f(this.ortho,1.0);
        }
        else
        {
            gl.uniform1f(this.ortho,0.0);
        }
    }

    setPointSize(camera, value)
    {
        if (camera.projection == V3.ORTHOGRAPHIC)  // TODO get rid of V3.ORTHOGRAPHIC 
        {
            gl.uniform1f(this.pointSize,value*this.scalar*camera.projection.zoom);
        }
        else
        {
            gl.uniform1f(this.pointSize,value*this.scalar);
        }
    }

    setAlpha(value)
    {
        gl.uniform1f(this.alpha,value);
    }
}

M.CloudShader["vs"] = `
precision mediump float;
precision mediump int;

uniform mat4 modelViewMatrix; 
uniform mat4 projectionMatrix; 

uniform float pointSize;
uniform float screenH;
uniform float alpha;
uniform float ortho;

#if defined(COLOR_RGB)
    attribute vec3 color;
#elif defined(COLOR_INTENSITY)
    uniform vec3 colors[3];
    attribute float intensity;
    uniform float maxi;
    uniform float mini;
#elif defined(COLOR_HEIGHT)
    uniform vec3 colors[3];
    uniform float maxh;
    uniform float minh;
#elif defined(COLOR_SLOPE)
    uniform vec3 colors[3];
#endif
    
#if defined(CLASS_FILTER)
    uniform vec4 classes[19];
    attribute float clazz;
#endif

#if defined(LIGHTING) || defined(COLOR_SLOPE) || defined(SLOPE_FILTER)  || defined(CLASS_FILTER)
    attribute vec3 normal;
#endif

#if defined(SLOPE_FILTER)
    uniform float slopeMin;
    uniform float slopeMax;
#endif

attribute vec3 position;

varying vec4 pixelColor;
varying vec3 worldPosition;
varying float discarded;

void main()	
{
    float ambient;
    vec3 vertexColor;
    
    discarded = 1.0;
    #if defined(COLOR_RGB)
    
        vertexColor = color;
        ambient = 0.4;
        
    #elif defined(COLOR_BW)
    
        vertexColor = vec3(1);
        ambient = 0.0;
        
    #elif defined(COLOR_INTENSITY)
    
        float d = clamp(intensity, mini, maxi);
        d = 2.99*(d-mini)/(maxi - mini);
        int i = int(floor(d));
        vertexColor = mix(colors[i], colors[i+1], fract(d));
        ambient = 0.4;
        
    #elif defined(COLOR_HEIGHT)
    
        float d = clamp(position.y, minh, maxh);
        d = 2.99*(d-minh)/(maxh - minh);
        int i = int(floor(d));
        vertexColor = vec3(mix(colors[i], colors[i+1], fract(d)));
    
    #elif defined(COLOR_SLOPE)
    
        float d = acos(abs(normal.y))/1.5700.309632679;
        d = 3.0*d;
        int i = int(floor(d));
        vertexColor = vec3(mix(colors[i], colors[i+1], fract(d)));
        
    #endif
    
    #if defined(COLOR_CLASS)
        
        vec4 clazzColor = classes[int(clamp(clazz, 0.0, 18.0))];
        vertexColor = vec3(clazzColor);
        
    #endif

    // filtering
    bool filtered = false;
    
    #if defined(SLOPE_FILTER)
    if (!filtered)
    {
        float s = acos(abs(normal.y))/1.57079632679;
        filtered = (s < slopeMin || s > slopeMax);
    }
    #endif
    
    #if defined(CLASS_FILTER)
    if (!filtered)
    {
        vec4 clazzColor = classes[int(clamp(clazz, 0.0, 18.0))];
        discarded = clazzColor[3];
    }
    #endif
    

    if (filtered)
    {
        vertexColor = vec3(0.8,0.8,0.8);
        discarded = 0.0;
    }	

    #if defined(LIGHTING)
    {
        mat3 normalMatrix = mat3(modelViewMatrix);
    
        vec3 light = vec3(0.0,0.0,1.0);
        vec3 viewNormal = normalMatrix * normal;
        float LdotN = max(abs(dot(light, viewNormal)), ambient);
        
        vertexColor = pow(vertexColor*vec3(LdotN), vec3(1.0/1.223));
    }
    #endif
    
    vec4 viewVertex = modelViewMatrix * vec4(position, 1.0 );

    gl_Position = projectionMatrix * viewVertex;
    
    if (ortho == 1.0)
    {
        gl_PointSize = pointSize;
    }
    else
    {
        gl_PointSize = screenH*projectionMatrix[1][1]*pointSize/(-2.0*viewVertex.z);
    }
    
    pixelColor = vec4(vertexColor, alpha);
    worldPosition = position.xyz;
}
`


M.CloudShader["fs"] = `precision mediump float;
precision mediump int;

varying vec4 pixelColor;
varying vec3 worldPosition;
varying float discarded;

void main()	
{
    if (discarded == 0.0)
    {
        discard;
    }

#if defined(CLIP0)
    {
        vec4 plane = vec4(CLIP0);
        if (dot(worldPosition, plane.xyz) < plane.w)
        {
            discard;
        }
    }
#endif
#if defined(CLIP1)
    {
        vec4 plane = vec4(CLIP1);
        if (dot(worldPosition, plane.xyz) < plane.w)
        {
            discard;
        }
    }
#endif
#if defined(CLIP2)
    {
        vec4 plane = vec4(CLIP2);
        if (dot(worldPosition, plane.xyz) < plane.w)
        {
            discard;
        }
    }
#endif
#if defined(CLIP3)
    {
        vec4 plane = vec4(CLIP3);
        if (dot(worldPosition, plane.xyz) < plane.w)
        {
            discard;
        }
    }
#endif

    vec2 coord = 2.0 * gl_PointCoord - 1.0;
    if (dot(coord, coord) > 1.0)
    {
        discard;
    }

    gl_FragColor = pixelColor;
}
`


M.CloudShader.COLOR = "COLOR_RGB";
M.CloudShader.BW = "COLOR_BW";
M.CloudShader.INTENSITY = "COLOR_INTENSITY";
M.CloudShader.HEIGHT = "COLOR_HEIGHT";
M.CloudShader.SLOPE = "COLOR_SLOPE";
M.CloudShader.COLOR_CLASS = "COLOR_CLASS";

M.CloudShader.LIGHTING = "LIGHTING";

M.CloudShader.SLOPE_FILTER = "SLOPE_FILTER";
M.CloudShader.CLASS_FILTER = "CLASS_FILTER";



M.PointShader = class extends M.CloudShader
{
    constructor(dataset)
    {
        super();
        
        this.dataset = dataset;
        
        this.defines[M.CloudShader.LIGHTING] = false;
        this.defines[M.CloudShader.COLOR_CLASS] = false;
        this.defines[M.CloudShader.INTENSITY] = false;
        this.defines[M.CloudShader.BW] = false;
        this.defines[M.CloudShader.COLOR] = false;
        this.defines[M.CloudShader.SLOPE] = false;
        this.defines[M.CloudShader.HEIGHT] = false;
        this.defines[M.CloudShader.SLOPE_FILTER] = false;
        this.defines[M.CloudShader.CLASS_FILTER] = false;
                    

        this.uniforms = 
        {
            height: { min: 0.0, max: 1.0 }, 
            slope: { min: 0.0, max: 1.0 }, 
            intensity: { min: 0.0, max: 1.0 },
            classes : [	0,0,1,1,
                        0,1,0,1,
                        0.619,0.498,0.427,1,		// 2 Ground
                        0.309,0.466,0.247,1,			// 3 Low Vegetation
                        0.129,0.537,0.129,1,			// 4 Medium Vegetation
                        0.807,0.937,0.749,1,		// 5 High Vegetation
                        0.537,0,0.098,1,			// 6 Building
                        0.537,0.537,0.537,1,		// 7 Low Point
                        0.537,0.537,0.537,1,		// 8 Reserved
                        0.247,0.639,0.866,1,			// 9 Water
                        0.380,0.380,0.380,1,		    	// 10 Rail
                        0.537,0.537,0.537,1,	// 11 Road Surface
                        0.537,0.537,0.537,1,	// 12 Reserved
                        0.537,0.537,0.537,1,	// 13 Wire - Guard (Shield)
                        0.537,0.537,0.537,1,	// 14 Wire - Conductor (Phase)
                        0.537,0.537,0.537,1,	// 15 Transmission Tower
                        0.537,0.537,0.537,1,	// 16 Wire-Structure Connector (Insulator)
                        0.537,0.537,0.537,1,	// 17 Bridge Deck
                        1,1,1,1			// 18 High Noise  
            ],
            colors : [
                0.00,1.00,0.00,
                0.00,0.00,1.00,
                1.00,0.00,0.00]
        }
        
        this.excluded = new Array(18).fill(false);

        // TODO see if you can remove this
        this.options = {};
        for (var i=0; i<this.dataset.root.attributes.length; i++)
        {
            this.options[this.dataset.root.attributes[i].name] = this.dataset.root.attributes[i];
        }
        
        if (this.options["color"] != null)
        {
            this.defines[M.CloudShader.COLOR] = true;
        }
        else if (this.options["class"] != null)
        {
            this.defines[M.CloudShader.COLOR_CLASS] = true;
            this.defines[M.CloudShader.LIGHTING] = true;
        }
        else if (this.options["intensity"] != null)
        {
            this.defines[M.CloudShader.INTENSITY] = true;
            this.defines[M.CloudShader.LIGHTING] = true;
        }
        else if (this.options["normal"] != null)
        {
            this.defines[M.CloudShader.BW] = true;
            this.defines[M.CloudShader.LIGHTING] = true;
        }

        if (this.options["class"])
        {
            this.defines[M.CloudShader.CLASS_FILTER] = true;
        }

        V.recvMessage("cloud.shader.update", (args) =>
        {
            if (args.id == this.dataset.id)
            {
                if (typeof args.lighting != "undefined")
                {
                    this.defines[M.CloudShader.LIGHTING] = args.lighting;
                    this.compile();
                };
                            
                if (args.hasOwnProperty("mode"))
                {
                    this.defines[M.CloudShader.COLOR_CLASS] = false;
                    this.defines[M.CloudShader.INTENSITY] = false;
                    this.defines[M.CloudShader.BW] = false;
                    this.defines[M.CloudShader.COLOR] = false;
                    this.defines[M.CloudShader.SLOPE] = false;
                    this.defines[M.CloudShader.HEIGHT] = false;
                    this.defines[args.mode] = true;
                    
                    if (args.mode == M.CloudShader.COLOR)
                    {
                        this.defines[M.CloudShader.LIGHTING] = false;
                    }
                    else
                    {
                        this.defines[M.CloudShader.LIGHTING] = true;				
                    }
                    this.compile();
                }
                
                if (args.slope)
                {
                    var current = this.defines[M.CloudShader.SLOPE_FILTER];
                    this.defines[M.CloudShader.SLOPE_FILTER] = args.slope.min != 0.0 || args.slope.max != 1.0;
                    this.uniforms.slope = args.slope;
                    if (current != this.defines[M.CloudShader.SLOPE_FILTER])
                    {
                        this.compile();
                    } 
                    else if (this.defines[M.CloudShader.SLOPE_FILTER])
                    {
                        gl.useProgram(this.glId);
                        gl.uniform1f(this.slopeMin, args.slope.min);
                        gl.uniform1f(this.slopeMax, args.slope.max);
                        gl.useProgram(null);
                    }
                }

                if (args.clipPlanes)
                {
                    this.clipPlanes.set(args.clipPlanes);
                    this.compile();
                }
                
                if (args.classes)
                {
                    args.classes.forEach(clazz =>
                    {
                        this.uniforms.classes[clazz.index*4+3] = clazz.state ? 1.0 : 0.0;
                        this.excluded[clazz.index] = !clazz.state;
                    });
                    
                    if (this.defines[M.CloudShader.CLASS_FILTER])
                    {
                        gl.useProgram(this.glId);
                        gl.uniform4fv(this.classes, new Float32Array(this.uniforms.classes));	
                        gl.useProgram(null);
                    }
                }
                
                V.touch3d();
                
                V.postMessage("cloud.shader.update", this.getViewpoint());	       	
            }
        });
        
    
        V.recvMessage("cloud.point.scale", (args) => 
        {
            if (args.id == this.dataset.id)
            {
                this.scalar = args.value;

                V.postMessage("cloud.point.scale", args);
                V.touch3d();
            }
        });
    }

    setViewpoint(state)
    {
        this.scalar = state.scalar;
        Object.assign(this.uniforms, state.uniforms);
        Object.assign(this.defines, state.defines);
        if (state.defines["COLOR_CLASS"] && !state.defines.hasOwnProperty("CLASS_FILTER"))
        {
            this.defines[M.CloudShader.CLASS_FILTER] = true;
            this.defines[M.CloudShader.COLOR_CLASS] = false;
        }
    
        if (state.clipPlanes)
        {
            this.clipPlanes.set(state.clipPlanes);
        }
        this.compile();
    }

    getViewpoint()
    {
        return {
            uniforms: this.uniforms,
            defines: this.defines, 
            scalar: this.scalar,
            clipPlanes: Array.from(this.clipPlanes)
        }	
    }	
    
    compile()
    {
        super.compile();
        
        if (this.defines[M.CloudShader.COLOR])
        {
            this.defineAttribute("color", 3, gl.UNSIGNED_BYTE, true)
        }
        else if (this.defines[M.CloudShader.INTENSITY])
        {
            this.defineAttribute("intensity", 1, gl.UNSIGNED_SHORT, true);	
            this.colors = gl.getUniformLocation(this.glId, 'colors');
            this.mini = gl.getUniformLocation(this.glId, 'mini');
            this.maxi = gl.getUniformLocation(this.glId, 'maxi');
        }
        else if (this.defines[M.CloudShader.HEIGHT])
        {
            this.colors = gl.getUniformLocation(this.glId, 'colors');
            this.minh = gl.getUniformLocation(this.glId, 'minh');
            this.maxh = gl.getUniformLocation(this.glId, 'maxh');
        }
        else if (this.defines[M.CloudShader.SLOPE])
        {
            this.colors = gl.getUniformLocation(this.glId, 'colors');
        }
        
        if (this.defines[M.CloudShader.CLASS_FILTER])
        {
            this.defineAttribute("class", 1, gl.UNSIGNED_BYTE, false, "clazz");	
            this.classes = gl.getUniformLocation(this.glId, 'classes');
        }

        if (this.defines[M.CloudShader.LIGHTING] || this.defines[M.CloudShader.SLOPE] || this.defines[M.CloudShader.SLOPE_FILTER])
        {
            if (this.options["normal"].type == "float32")
            {
                this.defineAttribute("normal", 3, gl.FLOAT, false);
            }
            else if (this.options["normal"].type == "INT_2_10_10_10_REV")
            {
                this.defineAttribute("normal", 4, gl.INT_2_10_10_10_REV, true);
            }
        }	
        
        if (this.defines[M.CloudShader.SLOPE_FILTER])
        {
            this.slopeMin = gl.getUniformLocation(this.glId, 'slopeMin');
            this.slopeMax = gl.getUniformLocation(this.glId, 'slopeMax');
        }
        
        gl.useProgram(this.glId);
        if (this.defines[M.CloudShader.INTENSITY])
        {
            gl.uniform3fv(this.colors, new Float32Array(this.uniforms.colors));	
            gl.uniform1f(this.mini,this.uniforms.intensity.min);
            gl.uniform1f(this.maxi,this.uniforms.intensity.max);
        }
        else if (this.defines[M.CloudShader.HEIGHT])
        {
            gl.uniform3fv(this.colors, new Float32Array(this.uniforms.colors));	
            gl.uniform1f(this.minh,V.viewer.aabb.min.y);
            gl.uniform1f(this.maxh,V.viewer.aabb.max.y);
        }
        else if (this.defines[M.CloudShader.SLOPE])
        {
            gl.uniform3fv(this.colors, new Float32Array(this.uniforms.colors));	
        }
        
        if (this.defines[M.CloudShader.CLASS_FILTER])
        {
            gl.uniform4fv(this.classes, new Float32Array(this.uniforms.classes));
            for (var i=0; i<this.uniforms.classes.length/4; i++)
            {
                this.excluded[i] = !this.uniforms.classes[i*4+3];
            };
        }
        
        if (this.defines[M.CloudShader.SLOPE_FILTER])
        {
            gl.uniform1f(this.slopeMin, this.uniforms.slope.min);
            gl.uniform1f(this.slopeMax, this.uniforms.slope.max);
        }
        gl.useProgram(null);
        
        V.touch3d();
    }
}
