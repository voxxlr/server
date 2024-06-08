
V3.Line = class extends O.Line
{
    constructor(entry, callback)
    {
        super(entry, callback);
            
        this.ray = new GM.Ray();
        this.ray.direction.x = 0;
        this.ray.direction.y = -1;
        this.ray.direction.z = 0;	
    }

    startControl(control)
    {
        if (this.timer)
        {
            this.stopScan();
        }
    }

    stopScan()
    {
        if (this.timer)
        {
            clearTimeout(this.timer);
        }

        V.postMessage("line.scan.stop", { id: this.id });
        
    }

    // run scan line
    startScan(resolution, direction)
    {
        if (this.timer)
        {
            clearTimeout(this.timer);
        }
        
        GM.Vector3.copy(direction, this.ray.direction);	

        this.scan = { 
                        id: this.id,
                        resolution: this.length()*resolution,
                        count: 0,
                        samples: {}
                      };
        
        this.scan.samples[0] = []; 
        
        V.postMessage("line.scan.start", this.scan);

        this.sampleLine(0, this.scan.resolution);
    }

    sampleLine(index, resolution)
    {
        var dx = this.anchors[index+1].wx-this.anchors[index].wx;
        var dy = this.anchors[index+1].wy-this.anchors[index].wy;
        var dz = this.anchors[index+1].wz-this.anchors[index].wz;
        var length = Math.sqrt(dx*dx+dy*dy+dz*dz);
        
        this.ray.origin.x = this.anchors[index].wx;
        this.ray.origin.y = this.anchors[index].wy;
        this.ray.origin.z = this.anchors[index].wz;
        
        this.timer = setTimeout(this.processScan.bind(this,  {
            samples: length/resolution,
            ddx: dx/length*resolution,
            ddy: dy/length*resolution,
            ddz: dz/length*resolution,
            index: index
        }, resolution), 0);
    }

    processScan(line, resolution)
    {
        if (!V.camera.moving)
        {
            for (var i=0; i<Math.min(line.samples, 40); i++)
            {
                var distance = V.viewer.raycast(this.ray,{ hits: [], distance: Number.POSITIVE_INFINITY }).distance;

                this.scan.samples[0].push(distance);
                
                this.scan.count++;
                    
                this.ray.origin.x += line.ddx;
                this.ray.origin.y += line.ddy;
                this.ray.origin.z += line.ddz;
            }
            line.samples = Math.max(0, line.samples-40);
        
            this.timer = null;
            if (line.samples)
            {
                this.timer = setTimeout(this.processScan.bind(this, line, resolution), 0);
            }
            else
            {
                V.postMessage("line.scan.sample", this.scan);
                if (line.index < this.anchors.length-2)
                {
                    this.sampleLine(line.index+1, resolution);
                }
                else
                {
                    V.postMessage("line.scan.end", this.scan);
                }
            }
        }
        else
        {
            this.timer = setTimeout(this.processScan.bind(this, line, resolution), 0);
        }
    }	
}

V.recvMessage("line.create", (args, params) => 
{ 
    if (O.Line.validate(args))
    {
        let line = new V3.Line(args);
        if (params.transform)
        {
            let transform = V.viewer.datasets[params.transform];
            if (transform)
            {
                transform.addAnchors(line);
            }
        }
        O.instance.addObject(line);
        V.postMessage("line.create", line.toJson(), params);
        V.touch2d();
        V.touch3d();
    }
});	    

V.recvMessage("line.delete", function(args, params) 
{ 
    if (args.transform)
    {
        let transform = V.viewer.datasets[args.transform];
        if (transform)
        {
            let line = O.instance.getObject(args.id);
            transform.removeAnchors(line);
        }
    }	
    
    let object = O.find(args.id);
    if (object.selected)
    {
        object.unselect();
        V.postMessage("line.unselect", object.toJson(), params);	
    }

    V.postMessage("line.delete", args, params);	
    O.instance.removeObject(args.id);
    V.touch2d()
});


V.recvMessage("line.scan.start", (args) => 
{
    let line = O.instance.getObject(args.id);
    if (line)
    {
        line.startScan(args.resolution, args.direction);	
    }
    else
    {
        V.postMessage("error", "line not found " + args.id);		
    }
});

V.recvMessage("line.scan.stop", (args) => 
{ 
    let line = O.instance.getObject(args.id);
    if (line)
    {
        line.stopScan();
        V.touch3d();
    }
    else
    {
        V.postMessage("error", "line not found " + args.id);		
    }
});