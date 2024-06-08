
V3.NavCube = class extends V.EventHandler 
{
    constructor(controller)
    {
        super(V.EventHandler.PRIO1);
        this.controller = controller;
        
        this.camera = new GM.CameraMVP({ width: V3.NavCube.VIEWPORT, height: V3.NavCube.VIEWPORT}, new GM.PerspectiveProjection(30));
        
        this.navTextureMap = new GL.Texture(new GL.ImageLoader("3d/controls/navcube.png", { notify: V.touch3d }));

        this.navIndex = new GL.ElementBuffer(new Uint16Array([0,1,2, //z-
                                                              0,2,3,
                                                              4,5,6, //z+
                                                              4,6,7,
                                                              8,9,10, //y-
                                                              8,10,11,  
                                                              12,13,14, //y+
                                                              12,14,15,  
                                                              16,17,18, //x-
                                                              16,18,19,
                                                              20,21,22, //x+
                                                              20,22,23]));
        
        //this.axis = new GL.Axis(1,1,1);
        
        this.visible = true;
        
        this.dy = 0;
        this.dx = 0;
        
        // value buffer
        this.zones = new Float32Array([
               // corners
               0.0,0.0,0.2,0.2,
               0.8,0.0,1.0,0.2,
               0.8,0.8,1.0,1.0,
               0.0,0.8,0.2,1.0,
               // sides
               0.2,0.0,0.8,0.2,
               0.8,0.2,1.0,0.8,
               0.2,0.8,0.8,1.0,
               0.0,0.2,0.2,0.8,
               // face
               0.2,0.2,0.8,0.8,
        ]);
        
        this.activeFace = [-1, -1, -1]; // up to 3 active faces
        this.activeZone = [ 0,  0,  0]; // active quad per face

        this.adjCorner = [ // [face, zone]
                    [[[5,1],[2,1]], [[4,0],[2,0]], [[4,3],[3,3]], [[5,2],[3,2]]],//z-
                    [[[4,1],[2,3]], [[2,2],[5,0]], [[3,1],[5,3]], [[4,2],[3,0]]],//z+
                    [[[4,0],[0,1]], [[0,0],[5,1]], [[1,1],[5,0]], [[1,0],[4,1]]],//y-
                    [[[1,3],[4,2]], [[1,2],[5,3]], [[5,2],[0,3]], [[4,3],[0,2]]],//y+
                    [[[2,0],[0,1]], [[2,3],[1,0]], [[1,3],[3,0]], [[3,3],[0,2]]],//x-
                    [[[1,1],[2,2]], [[2,1],[0,0]], [[0,3],[3,2]], [[3,1],[1,2]]] //x+
                    ];
        this.adjSide = [
            [[2,4],[4,7],[3,6],[5,5]],
            [[2,6],[5,7],[3,4],[4,5]],
            [[0,4],[5,4],[1,4],[4,4]],
            [[1,6],[5,6],[0,6],[4,6]],
            [[2,7],[1,7],[3,7],[0,5]],
            [[2,5],[0,7],[3,5],[1,5]],
            ];
        
        var PI = Math.PI;
        var P2 = Math.PI/2.0;
        var P4 = Math.PI/4.0;
        
        this.rX = [
                // corners
                P4,P4,-P4,-P4,P4,P4,-P4,-P4,
                // sides
                P4,0,-P4,0,P4,0,-P4,0,P4,P4,-P4,-P4,
                // faces
                0,0,P2,-P2,0,0];

        this.rY = [
                // corners
                PI-P4,PI+P4,PI+P4,PI-P4,-P4,P4,P4,-P4,
                // sides
                PI,PI+P4,PI,PI-P4,0,P4,0,-P4,P2,-P2,P2,-P2,
                // faces
                PI,0,0,0,-P2,P2];
                
        
        this.rotZone = [
            [0,1,2,3, 8, 9,10,11,20], // z- 
            [4,5,6,7,12,13,14,15,21], // z+
            [1,0,5,4, 8,16,12,17,22], // y- 
            [7,6,3,2,14,18,10,19,23], // y+
            [1,4,7,2,17,15,19,9, 24], // x- 
            [5,0,3,6,16,11,18,13,25]  // x+ 
            ];
        
        
//		this.shader = new GL.ShaderMVP(document.getElementById('3d/controls/navcube.vs').textContent, document.getElementById('3d/controls/navcube.fs').textContent);
        this.shader = new GL.ShaderMVP(V3.NavCube['vs'], V3.NavCube['fs']);
        this.shader.compile();
        this.navTexture = gl.getUniformLocation(this.shader.glId, 'navTexture');
        this.activeFaceId = gl.getUniformLocation(this.shader.glId, 'uActive');
        this.activeZoneId = gl.getUniformLocation(this.shader.glId, 'uRegion');
            
        gl.useProgram(this.shader.glId);
        gl.uniform4fv(gl.getUniformLocation(this.shader.glId, "uZones"),this.zones);
        gl.useProgram(null);
    }
    

    onRender3D(event)
    {
        if (this.visible)
        {
            this.camera.rotation.x = this.camera.rotation.x+this.dy;
            this.camera.rotation.y = this.camera.rotation.y-this.dx;
            let zAxisT = GM.Euler.zAxisT(this.camera.rotation, {});
            this.camera.position.x = zAxisT.x*3.3;
            this.camera.position.y = zAxisT.y*3.3;
            this.camera.position.z = zAxisT.z*3.3;
            this.camera.updateMatrix();

            GM.Vector3.copy(V.camera.rotation, this.camera.rotation);
            
            gl.viewport(gl.drawingBufferWidth - V3.NavCube.VIEWPORT, 0, V3.NavCube.VIEWPORT, V3.NavCube.VIEWPORT);

            this.shader.useProgram(this.camera);
            
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.navTextureMap.glId);
            gl.uniform1i(this.navTexture, 0);
            
            gl.uniform3fv(this.activeFaceId,this.activeFace);
            gl.uniform3iv(this.activeZoneId,this.activeZone);

            gl.disable(gl.DEPTH_TEST);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.navIndex.glId);
            gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
            gl.enable(gl.DEPTH_TEST);
            
            //this.axis.render(this.camera);
            
            gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        }
    }

    onUpdate(event)
    {
        if (V.camera.stopping)
        {
            this.onMouseMove(this.controller.pointerPosition);
        }
    }

    
    onClick(event)
    {
        if (event.pageX > gl.drawingBufferWidth - V3.NavCube.VIEWPORT && event.pageY > gl.drawingBufferHeight - V3.NavCube.VIEWPORT)
        {
            if (V.time - this.clickStart < 500)
            {
                if (this.activeFace[0] != -1)
                {
                    var face = this.rotZone[this.activeFace[0]];
                    var zone = face[this.activeZone[0]];
                    this.controller.onNavCube({x:this.rX[zone], y:this.rY[zone], z:0 });
                    event.stopImmediatePropagation();
                }
            }
        }
    }
    
    onMouseDown(event) 
    {
        if (event.pageX > gl.drawingBufferWidth - V3.NavCube.VIEWPORT && event.pageY > gl.drawingBufferHeight - V3.NavCube.VIEWPORT)
        {
            this.clickStart = V.time;
            event.stopImmediatePropagation();
        }
    }

    
    onMouseUp(event) 
    {
        if (event.pageX > gl.drawingBufferWidth - V3.NavCube.VIEWPORT && event.pageY > gl.drawingBufferHeight - V3.NavCube.VIEWPORT)
        {
            //this.clickStart = V.time;
            event.stopImmediatePropagation();
        }
    }


    onMouseMove(event)
    {
        if (event.pageX > gl.drawingBufferWidth - V3.NavCube.VIEWPORT && event.pageY > gl.drawingBufferHeight - V3.NavCube.VIEWPORT)
        {
            var screenPt = { pageX: V3.NavCube.VIEWPORT - (gl.drawingBufferWidth - event.pageX), pageY :  V3.NavCube.VIEWPORT - (gl.drawingBufferHeight - event.pageY) };
                
            let ray = this.camera.getRay(screenPt);

            var point = null;
            this.activeFace[0] = -1;
            this.activeFace[1] = -1;
            this.activeFace[2] = -1;
            this.activeZone[0] = 23;
            this.activeZone[1] = 23;
            this.activeZone[2] = 23;
            
            if (this.camera.zAxis.z < 0)
            {
                point = ray.intersectPlane({ x:0, y:0, z:-1, w:0.5 }, {});
                if (point && point.x > -0.5 && point.x < 0.5 && point.y > -0.5 && point.y < 0.5)
                {
                    this.activeFace[0] = 0;
                    this.activeZone[0] = this.findZone(-point.x+0.5,point.y+0.5);
                }
            }
            else if (this.camera.zAxis.z > 0)
            {
                point = ray.intersectPlane({ x:0, y:0, z:1, w:0.5 }, {});
                if (point && point.x > -0.5 && point.x < 0.5 && point.y > -0.5 && point.y < 0.5)
                {
                    this.activeFace[0] = 1;
                    this.activeZone[0] = this.findZone(point.x+0.5,point.y+0.5);
                }
            }

            if (this.camera.zAxis.y < 0)
            {
                point = ray.intersectPlane({ x:0, y:-1, z:0, w:0.5 }, {});
                if (point && point.z > -0.5 && point.z < 0.5 && point.x > -0.5 && point.x < 0.5)
                {
                    this.activeFace[0] = 2;
                    this.activeZone[0] = this.findZone(point.x+0.5,point.z+0.5);
                }
            }
            else if (this.camera.zAxis.y > 0)
            {
                point = ray.intersectPlane({ x:0, y:1, z:0, w:0.5 }, {});
                if (point && point.z > -0.5 && point.z < 0.5 && point.x > -0.5 && point.x < 0.5)
                {
                    this.activeFace[0] = 3;
                    this.activeZone[0] = this.findZone( point.x+0.5,-point.z+0.5);
                }
            }
            
            if (this.camera.zAxis.x < 0)
            {
                point = ray.intersectPlane({ x:-1, y:0, z:0, w:0.5 }, {});
                if (point && point.z > -0.5 && point.z < 0.5 && point.y > -0.5 && point.y < 0.5)
                {
                    this.activeFace[0] = 4;
                    this.activeZone[0] = this.findZone( point.z+0.5, point.y+0.5);
                }
                
            }
            else if (this.camera.zAxis.x > 0)
            {
                point = ray.intersectPlane({ x:1, y:0, z:0, w:0.5 }, {});
                if (point && point.z > -0.5 && point.z < 0.5 && point.y > -0.5 && point.y < 0.5)
                {
                    this.activeFace[0] = 5;
                    this.activeZone[0] = this.findZone(-point.z+0.5, point.y+0.5);
                }
            }
            
            if (this.activeZone[0] < 4)
            {
                var n = this.adjCorner[this.activeFace[0]][this.activeZone[0]];
                this.activeFace[1] = n[0][0];
                this.activeZone[1] = n[0][1];
                this.activeFace[2] = n[1][0];
                this.activeZone[2] = n[1][1];
            }
            else if (this.activeZone[0] < 8)
            {
                var n = this.adjSide[this.activeFace[0]][this.activeZone[0]-4];
                this.activeFace[1] = n[0];
                this.activeZone[1] = n[1];
            }
            
            V.touch3d();
        }
        else
        {
            this.activeFace[0] = -1;
            this.activeFace[1] = -1;
            this.activeFace[2] = -1;
        }
    }

    findZone(x,y)
    {
        for (var i=0; i<9; i++)
        {
            if (x > this.zones[i*4+0] && y > this.zones[i*4+1] && x < this.zones[i*4+2] && y < this.zones[i*4+3])
            {
                return i;
            }
        }
        
        return -1;
    }
    
    show(visible)
    {
        if (visible && !this.isAttached())
        {
            this.attach();
        }
        else if (!visible && this.isAttached())
        {
            this.detach();
        }
    }
    
    toJson()
    {
        return { visible: this.isAttached()  };
    }
};

V3.NavCube.VIEWPORT = 140;


V3.NavCube['vs'] = `#version 300 es

precision mediump float;
precision mediump int;

uniform mat4 modelViewMatrix; 
uniform mat4 projectionMatrix; 

const vec3 cNormal[6] = vec3[6](
                        vec3(0,0,-1),
                        vec3(0,0, 1),
                        vec3(0,-1,0),
                        vec3(0, 1,0),
                        vec3(-1,0,0),
                        vec3( 1,0,0));
                        
                        
const vec3 cVertex[24] = vec3[24](
                        // z-
                        vec3( 0.5,-0.5,-0.5), vec3(-0.5,-0.5,-0.5),
                        vec3(-0.5, 0.5,-0.5), vec3( 0.5, 0.5,-0.5),
                        // z+
                        vec3(-0.5,-0.5, 0.5), vec3( 0.5,-0.5, 0.5), 
                        vec3( 0.5, 0.5, 0.5), vec3(-0.5, 0.5, 0.5),
                        
                        // y-
                        vec3(-0.5,-0.5,-0.5), vec3( 0.5,-0.5,-0.5), 
                        vec3( 0.5,-0.5, 0.5), vec3(-0.5,-0.5, 0.5),
                        // y+
                        vec3(-0.5, 0.5, 0.5), vec3( 0.5, 0.5, 0.5), 
                        vec3( 0.5, 0.5,-0.5), vec3(-0.5, 0.5,-0.5),
                        
                        // x-
                        vec3(-0.5,-0.5,-0.5), vec3(-0.5,-0.5, 0.5), 
                        vec3(-0.5, 0.5, 0.5), vec3(-0.5, 0.5,-0.5),
                        // x+
                        vec3( 0.5,-0.5, 0.5), vec3( 0.5,-0.5,-0.5), 
                        vec3( 0.5, 0.5,-0.5), vec3( 0.5, 0.5, 0.5));

#define W (1.0/4.0)			     		
#define H (1.0/3.0)		
                
const vec2 cUV[24] = vec2[24](
                        // z-
                        vec2(3.0*W,2.0*H), vec2(4.0*W,2.0*H), 
                        vec2(4.0*W,1.0*H), vec2(3.0*W,1.0*H),
                        // z+
                        vec2(1.0*W,2.0*H), vec2(2.0*W,2.0*H), 
                        vec2(2.0*W,1.0*H), vec2(1.0*W,1.0*H),
                        
                        // y-
                        vec2(1.0*W,3.0*H), vec2(2.0*W,3.0*H), 
                        vec2(2.0*W,2.0*H), vec2(1.0*W,2.0*H),
                        // y+
                        vec2(1.0*W,1.0*H), vec2(2.0*W,1.0*H), 
                        vec2(2.0*W,0.0*H), vec2(1.0*W,0.0*H),
                        
                        // x-
                        vec2(0.0*W,2.0*H), vec2(1.0*W,2.0*H), 
                        vec2(1.0*W,1.0*H), vec2(0.0*W,1.0*H),
                        // x+
                        vec2(2.0*W,2.0*H), vec2(3.0*W,2.0*H), 
                        vec2(3.0*W,1.0*H), vec2(2.0*W,1.0*H));

const vec2 tUV[4] = vec2[4](
                        vec2(0.0,0.0), vec2(1.0,0.0),
                        vec2(1.0,1.0), vec2(0.0,1.0));


in float index;

in vec3 position;
in vec2 uv;
in vec2 fuv;

out vec2 vUV;
out vec2 vtUV;
out vec3 vNormal;
out float vFace;

void main()	
{
    gl_Position = projectionMatrix * (modelViewMatrix * vec4(cVertex[gl_VertexID], 1.0));
    
    mat3 normalMatrix = mat3(modelViewMatrix);

    vFace = float(gl_VertexID/4);
    vNormal = normalize(normalMatrix * cNormal[gl_VertexID/4]);
    vUV = cUV[gl_VertexID];
    vtUV = tUV[gl_VertexID%4];
}
`


V3.NavCube['fs'] = `#version 300 es

precision mediump float;
precision mediump int;

uniform sampler2D navTexture;
uniform vec4 uZones[9];
uniform vec3 uActive;
uniform ivec3 uRegion;

in vec3 vNormal;
in vec2 vUV;
in vec2 vtUV;
in float vFace;


out vec3 fragmentColor;

const float C = 0.1;


void main()	
{
    vec3 color = texture(navTexture, vUV).rgb;
    
    vec3 test = abs(vec3(vFace) - uActive);
    if (test.x < 0.0001)
    {
        int region = uRegion.x; 
        if (all(greaterThan(vtUV, vec2(uZones[region].xy))) && all(lessThan(vtUV, vec2(uZones[region].zw)))) 
        {
            color = 0.8*color + vec3(0.0,0.0,0.1);
        }  
    }
    else if (test.y < 0.0001)
    {
        int region = uRegion.y; 
        if (all(greaterThan(vtUV, vec2(uZones[region].xy))) && all(lessThan(vtUV, vec2(uZones[region].zw)))) 
        {
            color = 0.8*color + vec3(0.0,0.0,0.1);
        }  
    }
    else if (test.z < 0.0001)
    {
        int region = uRegion.z; 
        if (all(greaterThan(vtUV, vec2(uZones[region].xy))) && all(lessThan(vtUV, vec2(uZones[region].zw)))) 
        {
            color = 0.8*color + vec3(0.0,0.0,0.1);
        }  
    }
    
    fragmentColor = (0.2+0.6*(dot(vNormal, vec3(0.70710678118, 0, 0.70710678118))+dot(vNormal, vec3(-0.70710678118, 0, 0.70710678118))))*color;
}
`










