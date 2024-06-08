
V2.Line = class extends O.Line
{
    constructor(entry, callback)
    {
        super(entry, callback);
            
        this.ray = new GM.Ray();
        this.ray.direction.x = 0;
        this.ray.direction.y = 0;
        this.ray.direction.z = -1;	
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
            if (this.timer)
            {
                clearTimeout(this.timer);
                delete this.timer;
            }
    
            V.postMessage("line.scan.stop", { id: this.id });
        }
    }

    // run scan line
    startScan()
    {
        if (this.timer)
        {
            clearTimeout(this.timer);
        }

        this.scan = { 
                        id: this.id,
                        resolution: V.camera.pixelSize, 
                        count: 0,
                        samples: {},
                        breaks: []
                      };
        
        Object.keys(V.viewer.datasets).forEach(id => 
        {
            this.scan.samples[id] = [];
        });
        
        V.postMessage("line.scan.start", this.scan);

        this.sampleLine(0, V.camera.pixelSize);
    }

    sampleLine(index, resolution)
    {
        var dx = this.anchors[index+1].wx-this.anchors[index].wx;
        var dy = this.anchors[index+1].wy-this.anchors[index].wy;
        var length = Math.sqrt(dx*dx+dy*dy);
        
        this.ray.origin.x = this.anchors[index].wx;
        this.ray.origin.y = this.anchors[index].wy;
        this.ray.origin.z = V.camera.position.z;
        this.scan.breaks.push(Math.ceil(length/resolution));
        
        this.timer = setTimeout(this.processScan.bind(this,  {
            samples: length/resolution,
            ddx: dx/length*resolution,
            ddy: dy/length*resolution,
            index: index
        }), 0);
    }

    processScan(line)
    {
        if (!V.camera.moving)
        {
            for (var i=0; i<Math.min(line.samples, 40); i++)
            {
                var hits = V.viewer.raycast(this.ray,{ hits: [], distance: Number.POSITIVE_INFINITY }).hits;

                hits.forEach(hit => 
                { 
                    let sample = this.scan.samples[hit.id];
                    if (hit.distance != Number.POSITIVE_INFINITY)
                    {
                        sample.push(V.viewer.aabb.max.z - hit.distance);
                    }
                    else
                    {
                        sample.push(Number.POSITIVE_INFINITY);
                    }
                });
                
                this.scan.count++;
                    
                this.ray.origin.x += line.ddx;
                this.ray.origin.y += line.ddy;
            }
            line.samples = Math.max(0, line.samples-40);
        
            this.timer = null;
            if (line.samples)
            {
                this.timer = setTimeout(this.processScan.bind(this, line), 0);
            }
            else
            {
                V.postMessage("line.scan.sample", this.scan);
                if (line.index < this.anchors.length-2)
                {
                    this.sampleLine(line.index+1, V.camera.pixelSize);
                }
                else
                {
                    V.postMessage("line.scan.end", this.scan);
                }
            }
        }
        else
        {
            this.timer = setTimeout(this.processScan.bind(this, line), 0);
        }
    }
}


V.recvMessage("line.create", (args, params) => 
{ 
    if (O.Line.validate(args))
    {
        let line = new V2.Line(args);
        O.instance.addObject(line);		
        V.postMessage("line.create", line.toJson(), params);	
        V.touch2d();
        V.touch3d();
    }
});	    


V.recvMessage("line.delete", function(args, params) 
{ 
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
        line.startScan();	
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

