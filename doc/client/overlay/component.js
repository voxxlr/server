O.Style = 
{
    FRONT : 1,
    BACK : 2,
    FRONT_BACK : 3,
    NONE : 0,
    
    A : 8
}



O.Style.Line = class
{
    constructor(dash, fillStyle, arrows)
    {
        this.selected = false;
        this.lineWidth = 1;
        this.fillStyle = fillStyle || "red";
        this.dash = dash;
        this.arrows = arrows;
    }

    render2d(context,x0,y0,x1,y1,label)
    {
        var dx = x1 - x0;
        var dy = y1 - y0;
        var angle = Math.atan2(dy, dx);
    
        context.setTransform(1,0,0,1,x0,y0);
        
        context.beginPath();
        context.moveTo(0,0);
        context.lineTo(dx,dy);
        context.lineWidth = this.lineWidth;
        context.strokeStyle = this.fillStyle;
        
        if (this.dash)
        {
            context.setLineDash(this.dash);
        }
        
        context.stroke();
        
        if (this.dash)
        {
            context.setLineDash([]);
        }
        
        context.lineWidth = 1;
        
        var headlen = 12;
        if (this.arrows == O.Style.FRONT || this.arrows == O.Style.FRONT_BACK)
        {
            context.beginPath();
            context.moveTo(dx,dy);
            context.lineTo(dx-headlen*Math.cos(angle-Math.PI/7),dy-headlen*Math.sin(angle-Math.PI/7));
            context.lineTo(dx-headlen*Math.cos(angle+Math.PI/7),dy-headlen*Math.sin(angle+Math.PI/7));
            context.fillStyle = this.fillStyle;
            context.fill();
        }
        
        if (this.arrows == O.Style.BACK || this.arrows == O.Style.FRONT_BACK)
        {
            context.beginPath();
            context.moveTo(0,0);
            context.lineTo(headlen*Math.cos(angle-Math.PI/7),headlen*Math.sin(angle-Math.PI/7));
            context.lineTo(headlen*Math.cos(angle+Math.PI/7),headlen*Math.sin(angle+Math.PI/7));
            context.fillStyle = this.fillStyle;
            context.fill();
        }
    
        if (label)
        {
            if (label.size.width*label.size.width < 0.25*(dx*dx+dy*dy))
            {
                if (x0 < x1)
                {
                    angle = -angle;
                }
                else
                {
                    angle = Math.PI-angle;
                }
    
                var cos = Math.cos(angle);
                var sin = Math.sin(angle);
                context.setTransform(cos,-sin,sin,cos,(x0+x1)/2,(y0+y1)/2);
                
                // background
                context.fillStyle = "rgba(255,255,255,0.7)";
                
                let radius = O.Style.A;
                let width = label.size.width+2*O.Style.A;
                let height = 12+O.Style.A;
                let x = -width/2 + 0;
                let y = -height + -3;
        
                context.moveTo(x + radius, y);
                context.lineTo(x + width - radius, y);
                context.quadraticCurveTo(x + width, y, x + width, y + radius);
                context.lineTo(x + width, y + height - radius);
                context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
                context.lineTo(x + radius, y + height);
                context.quadraticCurveTo(x, y + height, x, y + height - radius);
                context.lineTo(x, y + radius);
                context.quadraticCurveTo(x, y, x + radius, y);
                
                context.fill();
        
                // text
                context.font = '12px Arial';
                context.textAlign = 'center';
                context.textBaseline = "bottom";
                context.fillStyle = "blue";
                context.fillText(label.text, 0, -3-O.Style.A/2+1);
            }
        }
    }
    
    containsPoint2d(event,x0,y0,x1,y1)
    {
        let dx = x1 - x0;
        let dy = y1 - y0;
        
        let t = ((event.pageX - x0) * dx + (event.pageY - y0) * dy) / (dx*dx + dy*dy);
        
        if (t < 0)
        {
            t = 0;
        }
        else if (t > 1)
        {
            t = 1;
        }
          
        dx = event.pageX - t*dx - x0;
        dy = event.pageY - t*dy - y0;
        return dx*dx + dy*dy < 15*15;
    }
    
    createLabel(label, length)
    {
        let text = V.to1DUnitString(length);
        O.instance.context.font = '12px Arial';
        return { text, size: O.instance.context.measureText(text) };
    }

}



O.Style.Line.Custom = class
{
    constructor(code,scope)
    {
        this.selected = false;
        
        this.exec = {};
        if (code.init)
        {
            this.exec.init = Function("return " + decodeURI(code.init))();
        }
        if (code.render2d)
        {
            this.exec.render2d = Function("return " + decodeURI(code.render2d))();
        }
        if (code.intersect2d)
        {
            this.exec.intersect2d = Function("return " + decodeURI(code.intersect2d))();
        }
        if (code.update)
        {
            this.exec.update = Function("return " + decodeURI(code.update))();
        }
        
        this.scope = Object.assign({}, scope);
        if (this.exec.init)
        {
            this.exec.init.call(this.scope);
        }
    }

    render2d(context,x0,y0,x1,y1,label)
    {
        let repaint = this.exec.render2d.call(this.scope, context, 
        { 
            x0: x0,
            y0: y0,
            x1: x1,
            y1: y1,
            t: V.time,
            dt: V.dT,
            label,
            selected: this.selected
        });
        
        if (repaint)
        {
            V.touch2d();
        }
    }
    
    containsPoint2d(event,x0,y0,x1,y1)
    {
        if (this.exec.intersect2d)
        {
            return this.exec.intersect2d.call(this.scope, O.instance.context, event.pageX, event.pageY, 
            { 
                x0: x0,
                y0: y0,
                x1: x1,
                y1: y1
            });
        }

        return false;
    }
    
    update(scope)
    {
        if (scope)
        {
            if (this.exec.update)
            {
                this.exec.update.call(this.scope, scope);
            }
            else
            {
                Object.assign(this.scope, scope);
            }
        }
    }
}




//
// Segments
//

O.Segment = class extends O.Component
{
    constructor(anchor0, anchor1, text, style)
    {
        super(style);
        this.anchor0 = anchor0;
        this.anchor0.addListener(this);
        this.anchor1 = anchor1;
        this.anchor1.addListener(this);
        
        this.text = text;
        this.update3D();
    }
    
    update3D()
    {
        if (this.text)
        {
            let dx = G.sx*(this.anchor0.wx - this.anchor1.wx);
            let dy = G.sy*(this.anchor0.wy - this.anchor1.wy);
            let dz = G.sz*(this.anchor0.wz - this.anchor1.wz);
            this.label = this.style.createLabel(this.text, Math.sqrt(dx*dx+dy*dy+dz*dz));
        }
    }
    
    updateUnits()
    {
        if (this.text)
        {
            let dx = G.sx*(this.anchor0.wx - this.anchor1.wx);
            let dy = G.sy*(this.anchor0.wy - this.anchor1.wy);
            let dz = G.sz*(this.anchor0.wz - this.anchor1.wz);
            this.label = this.style.createLabel(this.text, Math.sqrt(dx*dx+dy*dy+dz*dz));
        }
    };
    
    updateLabel(text)
    {
        this.text = text;
        
        if (this.text)
        {
            let dx = G.sx*(this.anchor0.wx - this.anchor1.wx);
            let dy = G.sy*(this.anchor0.wy - this.anchor1.wy);
            let dz = G.sz*(this.anchor0.wz - this.anchor1.wz);
            this.label = this.style.createLabel(this.text, Math.sqrt(dx*dx+dy*dy+dz*dz));
        }
        else
        { 
            delete this.label;
        }
    };

    
    intersectRay3D(event)
    {
        // this is good enough for now.. do a proper ray segment intersction later
        if (this.containsPoint2D(event))
        {
            return V.camera.distanceTo({x:this.anchor0.wx,y:this.anchor0.wy,z:this.anchor0.wz});
        }
        
        return Number.POSITIVE_INFINITY;
    }
    
    containsPoint2D(event)
    {
        return this.style.containsPoint2d(event, this.anchor0.sx,this.anchor0.sy,this.anchor1.sx,this.anchor1.sy);
    }
    
    render2D(context)
    {
        this.style.render2d(context,this.anchor0.sx,this.anchor0.sy,this.anchor1.sx,this.anchor1.sy, this.label);
    }
}


//
//  Arc
//



O.Style.Arc = class
{
    constructor(dash, fillStyle, labelled)
    {
        this.selected = false;
        this.fillStyle = fillStyle;
        this.dash = dash;
        this.labelled = labelled;
        this.length2 = 0;
    }

    line(context)
    {
        context.strokeStyle = this.fillStyle;
        if (this.dash)
        {
            context.setLineDash(this.dash);
        }
        context.stroke();
        if (this.dash)
        {
            context.setLineDash([]);
        }
    }
    
    render2d(context,x0,y0,x1,y1,x2,y2, normal3D, label)
    {
        // vector A
        var dAx = x0 - x1;
        var dAy = y0 - y1;
        var dA = Math.sqrt(dAx*dAx+dAy*dAy);
        dAx = dAx/dA;
        dAy = dAy/dA;
        var aA = Math.atan2(dAy, dAx);
        
        // vector B
        var dBx = x2 - x1;
        var dBy = y2 - y1;
        var dB = Math.sqrt(dBx*dBx+dBy*dBy);
        dBx = dBx/dB;
        dBy = dBy/dB;
        var aB = Math.atan2(dBy, dBx);
        
        if (Math.abs(dBx*dAx+dBy*dAy)+0.05 < 1.0)
        {
            // arc radius
            var r = Math.min(dA,dB)/2.7;
            
            // line
            context.setTransform(1,0,0,1,x1, y1);
            context.beginPath();
            context.arc(0, 0, r, aA, aB, GM.Vector3.dot(V.camera.zAxis, normal3D)>0);
            
            context.strokeStyle = this.fillStyle;
            if (this.dash)
            {
                context.setLineDash(this.dash);
            }
            context.stroke();
            if (this.dash)
            {
                context.setLineDash([]);
            }
            
            if (label)
            {
                if (label.size.width*label.size.width < r*r*0.7)
                {
                    // text
                    var c0x = dAx+dBx;
                    var c0y = dAy+dBy;
                    var d1 = Math.sqrt(c0x*c0x+c0y*c0y);
                    c0x /= d1;
                    c0y /= d1;
                    c0x = x1+c0x*r;
                    c0y = y1+c0y*r;
    
                    var tA = Math.PI/2 - (aA + aB)/2;
                    var cos = -Math.cos(tA);
                    var sin = -Math.sin(tA);
                    
                    context.setTransform(cos,-sin,sin,cos, c0x, c0y);
                    
                    // background
                    let radius = O.Style.A;
                    let width = label.size.width+2*O.Style.A;
                    let height = 12+O.Style.A;
                    let x = -width/2 + 0;
                    let y = -height + -3;
                    
                    context.beginPath()
                    context.fillStyle = "rgba(255,255,255,0.7)";
                    context.moveTo(x + radius, y);
                    context.lineTo(x + width - radius, y);
                    context.quadraticCurveTo(x + width, y, x + width, y + radius);
                    context.lineTo(x + width, y + height - radius);
                    context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
                    context.lineTo(x + radius, y + height);
                    context.quadraticCurveTo(x, y + height, x, y + height - radius);
                    context.lineTo(x, y + radius);
                    context.quadraticCurveTo(x, y, x + radius, y);
            
                    context.fill();
                    // text
                    context.font = '12px Arial';
                    context.textAlign = 'center';
                    context.textBaseline = "bottom";
                    context.fillStyle = "blue";
                    context.fillText(label.text, 0, -3-O.Style.A/2+1);
                }
            }			
        }
    }
    
    /*
    setText(text)
    {
        O.instance.context.font = '12px Arial';
        let size = O.instance.context.measureText(text);
        
        // border rectangle
        if (size.width > 0)
        {
            let radius = O.Style.A;
            let width = size.width+2*O.Style.A;
            let height = 12+O.Style.A;
            let x = -width/2 + 0;
            let y = -height + -3;
    
            this.rect = new Path2D();
            this.rect.moveTo(x + radius, y);
            this.rect.lineTo(x + width - radius, y);
            this.rect.quadraticCurveTo(x + width, y, x + width, y + radius);
            this.rect.lineTo(x + width, y + height - radius);
            this.rect.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
            this.rect.lineTo(x + radius, y + height);
            this.rect.quadraticCurveTo(x, y + height, x, y + height - radius);
            this.rect.lineTo(x, y + radius);
            this.rect.quadraticCurveTo(x, y, x + radius, y);
            this.length2 = width*width;
        }
        else
        {
            this.length2 = 0;
        }
        
        this.text = text;
    }
    */
    createLabel(label, angle)
    {
        let text = angle.toFixed(0) + String.fromCharCode(176);
        O.instance.context.font = '12px Arial';
        return { text, size: O.instance.context.measureText(text) };
    }
    
}


O.Arc = class extends O.Component
{
    constructor(anchor0, anchor1, anchor2, text, style)
    {
        super(style);
        
        this.anchor1 = anchor1;
        this.anchor1.addListener(this);
        this.anchor0 = anchor0;
        this.anchor0.addListener(this);
        this.anchor2 = anchor2;
        this.anchor2.addListener(this);
        
        this.text = text
        this.angle = 0;
        
        this.update3D();
    }
    
    update3D()
    {
        // vector A
        var vAx = this.anchor0.wx - this.anchor1.wx;
        var vAy = this.anchor0.wy - this.anchor1.wy;
        var vAz = this.anchor0.wz - this.anchor1.wz;
        var dA= Math.sqrt(vAx*vAx+vAy*vAy+vAz*vAz);
        vAx /= dA;
        vAy /= dA;
        vAz /= dA;
    
        // vector B
        var vBx = this.anchor2.wx - this.anchor1.wx;
        var vBy = this.anchor2.wy - this.anchor1.wy;
        var vBz = this.anchor2.wz - this.anchor1.wz;
        var dB= Math.sqrt(vBx*vBx+vBy*vBy+vBz*vBz);
        vBx /= dB;
        vBy /= dB;
        vBz /= dB;
        
        // dot
        this.angle = Math.acos(vAx*vBx + vAy*vBy + vAz*vBz)*180/Math.PI;
        
        // cross product to determine arc direction
        this.normal3D.x = vAy*vBz - vAz*vBy;
        this.normal3D.y = vAz*vBx - vAx*vBz;
        this.normal3D.z = vAx*vBy - vAy*vBx;

        if (this.text)
        {
            this.label = this.style.createLabel(this.text, this.angle);
            //this.style.setText(angle.toFixed(0) + String.fromCharCode(176));
        }
    }
    
    updateLabel(text)
    {
        this.text = text;
        
        if (this.text)
        {
            this.label = this.style.createLabel(this.text, this.angle);
        }
        else
        { 
            delete this.label;
        }
    };
    
    
    render2D(context)
    {
        this.style.render2d(context,this.anchor0.sx,this.anchor0.sy,this.anchor1.sx,this.anchor1.sy, this.anchor2.sx,this.anchor2.sy, this.normal3D, this.label)
    }
}


