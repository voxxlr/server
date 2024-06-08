
M.Mesh = class 
{
    constructor(node)
    {
        this.name = node.name;
        this.attributes = ["aPosition"];
        this["aPosition"] = new GL.ArrayBuffer(node.vertex.data);
        
        if (node.normal != undefined)
        {
            this.attributes.push("aNormal");
            this["aNormal"] = new GL.ArrayBuffer(node.normal.data);
        }
        if (node.tangent != undefined)
        {
            this.attributes.push("aTangent");
            this["aTangent"] = new GL.ArrayBuffer(node.tangent.data);
        }
        if (node.color != undefined)
        {
            this.attributes.push("aColor");
            this["aColor"] = new GL.ArrayBuffer(node.color.data);
        }
        if (node.uv != undefined)
        {
            this.attributes.push("aUv");
            this["aUv"] = new GL.ArrayBuffer(node.uv.data);
        }
        
        this.vertex = node.vertex.data;
        this.bvh = node.bvh;
    }
    
    /*
    constructor(config, buffer, dataStart)
    {
        this.name = config.name;
        
        if (node.bvh)
        {
            var text = new TextDecoder("utf-8").decode(new Uint8Array(buffer, dataStart + config.vertex.offset + config.vertex.size*4, config.bvh));
            this.bvh = JSON.parse(text);
        }
        this.vertex = new Float32Array(buffer, dataStart + config.vertex.offset, config.vertex.size);
        
        this.attributes = ["aPosition"];
        this["aPosition"] = new GL.ArrayBuffer(node.vertex);

        if (config.normal != undefined)
        {
            if (config.normal.type == "float32" || config.normal.type == "float")  // "float" is deprecated remnove
            {
                this["aNormal"] = new GL.ArrayBuffer(new Float32Array(buffer, dataStart + config.normal.offset, config.normal.size));
            }
            else 
            {
                this["aNormal"] = new GL.ArrayBuffer(new Int32Array(buffer, dataStart + config.normal.offset, config.normal.size));
            }
        }
        if (config.tangent != undefined)
        {
            this["aTangent"] = new GL.ArrayBuffer(new Float32Array(buffer, dataStart + config.tangent.offset, config.tangent.size));
        }
        if (config.uv != undefined)
        {
            this["aUv"] = new GL.ArrayBuffer(new Float32Array(buffer, dataStart + config.uv.offset, config.uv.size));;
        }
    }
    */
    
    clear()
    {
        for (var i in this.attributes)
        {
            this[this.attributes[i]].clear();
        }
    }

    setAttribute(name, buffer)
    {
        this.attributes.push(name);
        this[name] = buffer;
    }

    hitTestTriangle1(ray, c) 
    {
        c.v0v1.subVectors(c.v1, c.v0);
        c.v0v2.subVectors(c.v2, c.v0);
        c.pvec.crossVectors(ray.direction, c.v0v2);
        
        var det = c.v0v1.dot(c.pvec); 
        if (Math.abs(det) < 0.000000001)
        {
            return Number.POSITIVE_INFINITY;
        }
        
        var invDet = 1 / det; 
           
        c.tvec.subVectors(ray.origin,c.v0); 
        var u = c.tvec.dot(c.pvec) * invDet; 
        if (u < 0 || u > 1) return Number.POSITIVE_INFINITY; 
     
        c.qvec.crossVectors(c.tvec, c.v0v1); 
        var v = ray.direction.dot(c.qvec) * invDet; 
        if (v < 0 || u + v > 1) return Number.POSITIVE_INFINITY; 
         
        var t = c.v0v2.dot(c.qvec) * invDet;
        if (t < 0)
        {
            return Number.POSITIVE_INFINITY;
        }
        return t; 
    };

    raycast(ray, options, filterFn)
    {
        let triangle = -1;
        
        if (this.bvh)
        {
            var queue = new V.Queue();
            if (ray.intersectBox(this.bvh))
            {
                queue.enqueue(this.bvh);
            }
            
            while (!queue.empty())
            {
                var node = queue.dequeue();
                //node.vis.setColor(0,255,0);
                
                if (node.childL != null)
                {
                    let intersect = ray.intersectBox(node.childL);
                    if (intersect && intersect.distance < options.distance)
                    {
                        queue.enqueue(node.childL);
                    }
                }
                
                if (node.childH != null)
                {
                    let intersect = ray.intersectBox(node.childH);
                    if (intersect && intersect.distance < options.distance)
                    {
                        queue.enqueue(node.childH);
                    }
                }

                for (var i=node.i0; i<node.iN; i++)
                {
                    if (!filterFn || !filterFn(i))
                    {
                        M.Mesh.V1.v0.readArray(this.vertex, i*9+0);
                        M.Mesh.V1.v1.readArray(this.vertex, i*9+3);
                        M.Mesh.V1.v2.readArray(this.vertex, i*9+6);
                        var d = this.hitTestTriangle1(ray, M.Mesh.V1);
                        if (d < options.distance)
                        {
                            options.distance = d;
                            if (options.normal)
                            {
                                GM.Vector3.cross(M.Mesh.V1.v0v1, M.Mesh.V1.v0v2, options.normal);
                            }
                            triangle = i;
                        }
                    }
                }
            }
        }
        
        return triangle;
    }

    createBoxes(root)
    {
        var queue = new V.Queue();
        queue.enqueue(root);
        while (!queue.empty())
        {
            var node = queue.dequeue();
            if (node.childL != null)
            {
                queue.enqueue(node.childL);
            }
            if (node.childH != null)
            {
                queue.enqueue(node.childH);
            }

            node.vis = new GL.BoundingBox(node);
        }
    }

    renderBoxes(root)
    {
        var queue = new V.Queue();
        queue.enqueue(root);
        while (!queue.empty())
        {
            var node = queue.dequeue();
            if (node.childL != null)
            {
                queue.enqueue(node.childL);
            }
            if (node.childH != null)
            {
                queue.enqueue(node.childH);
            }

            node.vis.render();
        }
    }	

}

// only allocate these vectors once
M.Mesh.V1 = 
{
    v0 : new GM.Vector3(),
    v1 : new GM.Vector3(),
    v2 : new GM.Vector3(),
    v0v1  : new GM.Vector3(),
    v0v2  : new GM.Vector3(),
    pvec : new GM.Vector3(),
    tvec : new GM.Vector3(),
    qvec : new GM.Vector3()
};







M.InstancedNode = class 
{
    constructor(node, geometries, registry)
    {
        this.geometry = geometries[node.geometry];
        
        this.aabb = node.aabb;
        this.min = node.min;
        this.max = node.max;
        this.id = node.id;
        registry[this.id] = this;

        this.matrixMemory = node.matrix;
        this.inverse = [];
        this.matrix = [];
        
        /*
        if (M.Model.boundingBox)
        {
            for (var i=0; i<this.aabb.length; i++)
            {
                M.Model.boundingBox.push(new GL.BoundingBox(this.aabb[i]));
            }
        }
        */
        
        this.matrixBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.matrixBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.matrixMemory, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }
    
    render(material)
    {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.matrixBuffer);
        gl.vertexAttribPointer(4, 4, gl.FLOAT, gl.FALSE, 64, 0);
        gl.vertexAttribPointer(5, 4, gl.FLOAT, gl.FALSE, 64, 16);
        gl.vertexAttribPointer(6, 4, gl.FLOAT, gl.FALSE, 64, 32);
        gl.vertexAttribPointer(7, 4, gl.FLOAT, gl.FALSE, 64, 48);
        
        material.bind(this.geometry);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, this.geometry.aPosition.length/3, this.matrixMemory.length/16);
        material.unbind(this.geometry);
        
    }

    doSelect(parts)
    {
        if (!this.selectionBuffer)
        {
            this.selectionBuffer = gl.createBuffer();
        }
        
        var matrixBuffer = new Float32Array(parts.length*16);
        for (var i=0; i<parts.length; i++)
        {
            matrixBuffer.set(this.matrixMemory.slice(parts[i]*16, (parts[i]+1)*16), i*16);
        }
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.selectionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, matrixBuffer, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        return matrixBuffer.length > 0;
    }
    
    doHide(parts)
    {
        for (var i=0; i<parts.length; i++)
        {
            this.matrixMemory[parts[i]*16+15] = 0;
        }
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.matrixBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.matrixMemory, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }
    
    doShow(parts)
    {
        if (parts)
        {
            for (var i=0; i<parts.length; i++)
            {
                this.matrixMemory[parts[i]*16+15] = 1;
            }
        }
        else
        {
            for (var i=0; i<this.aabb.length; i++)
            {
                this.matrixMemory[i*16+15] = 1;
            }
        }
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.matrixBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.matrixMemory, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }

    renderSelection(material)
    {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.selectionBuffer);
        gl.vertexAttribPointer(4, 4, gl.FLOAT, gl.FALSE, 64, 0);
        gl.vertexAttribPointer(5, 4, gl.FLOAT, gl.FALSE, 64, 16);
        gl.vertexAttribPointer(6, 4, gl.FLOAT, gl.FALSE, 64, 32);
        gl.vertexAttribPointer(7, 4, gl.FLOAT, gl.FALSE, 64, 48);

        material.bind(this.geometry);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, this.geometry.aPosition.length/3, 1);
        material.unbind(this.geometry);
    }

    raycast(ray, options)
    {
        let intersect = ray.intersectBox(this); 
        if (intersect && intersect.distance < options.distance)
        {
            for (var i=0; i<this.aabb.length; i++)
            {
                if (this.matrixMemory[i*16+15] == 1)
                {
                    if (ray.intersectBox(this.aabb[i]))
                    {
                        if (!this.inverse[i])
                        {
                            this.matrix[i] = GM.Matrix4.init(this.matrixMemory.slice(i*16, (i+1)*16));
                            this.inverse[i] = GM.Matrix4.invert(this.matrix[i], GM.Matrix4.create());
                        }
    
                        GM.Ray.transform(ray, this.inverse[i], M.InstancedNode.ray)
                        
                        if (this.geometry.raycast(M.InstancedNode.ray, options) != -1)
                        {
                            if (options.normal)
                            {
                                GM.Vector3.rotate(options.normal, this.matrix[i], options.normal);
                            }
                            if (options.xyz)
                            {
                                options.xyz = ray.at(options.distance, options.xyz);
                            }
    
                            options.object = this.id;
                            options.parts = [i];
                        }
                    }	
                }				
            }
        }
    }
    
    clear()
    {
        gl.deleteBuffer(this.matrixBuffer);
    }

    getAABB(parts)
    {
        let aabb = GL.BoundingBox.init({});
        for (var i=0; i< parts.length; i++)
        {
            GL.BoundingBox.merge(aabb, this.aabb[parts[i]])
        }
        return aabb;
    }
    
    getHidden(json)
    {
        let hidden = [];
        for (var i=0; i<this.aabb.length; i++)
        {
            if (this.matrixMemory[i*16+15] == 0)
            {
                hidden.push(i);
            };
        }
        if (hidden.length)
        {
            json[this.id] = hidden;			
        }
    }
    
    setHidden(json)
    {
        for (var i=0; i<this.aabb.length; i++)
        {
            this.matrixMemory[i*16+15] = 1;
        }
        
        if (json.hidden)
        {
            for (var i=0; i<json.hidden.length; i++)
            {
                this.matrixMemory[json.hidden[i]*16+15] = 0;
            }
        }
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.matrixBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.matrixMemory, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }

}

M.InstancedNode.ray = new GM.Ray();


M.CombinedNode = class 
{
    constructor(node, geometries, registry)
    {
        this.geometry = geometries[node.geometry];
        this.index = node.index;
        this.min = node.min;
        this.max = node.max;
        this.id = node.id;
        this.visible = true;
        registry[this.id] = this;
        
        
        this.matrixBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.matrixBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([1,0,0,0,
                                                         0,1,0,0,
                                                         0,0,1,0,
                                                         0,0,0,1]), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
//		this.geometry.createBoxes(this.geometry.bvh);
        
        this.partCount = node.parts;
        if (!this.partCount)
        {
            this.partCount = 0;
            this.index.forEach(value => this.partCount = Math.max(this.partCount, value + 1));
        }
        this.partIndex = {  };
        
        this.hidden = new Set();
    }

    render(material)
    {
        if (this.visible)
        {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.matrixBuffer);
            gl.vertexAttribPointer(4, 4, gl.FLOAT, gl.FALSE, 64, 0);
            gl.vertexAttribPointer(5, 4, gl.FLOAT, gl.FALSE, 64, 16);
            gl.vertexAttribPointer(6, 4, gl.FLOAT, gl.FALSE, 64, 32);
            gl.vertexAttribPointer(7, 4, gl.FLOAT, gl.FALSE, 64, 48);
            
            material.bind(this.geometry);
            if (this.hidden.size)
            {
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
                gl.drawElementsInstanced(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_INT, 0, 1);
            }
            else
            {
                gl.drawArraysInstanced(gl.TRIANGLES, 0, this.geometry.aPosition.length/3, 1);
            }
            material.unbind(this.geometry);
        }
//		this.geometry.renderBoxes(this.geometry.bvh);
    }
    
    updateIndex()
    {
        if (this.hidden.size > 0)
        {
            if (!this.indexBuffer)
            {
                this.indexBuffer = gl.createBuffer();
            }
            
            var indexBuffer = [];
            for (var p=0; p<this.partCount; p++)
            {
                if (!this.hidden.has(p))
                {
                    indexBuffer.push(...this.getPart(p));
                }
            }
            this.indexCount = indexBuffer.length;
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(indexBuffer), gl.STATIC_DRAW);
        }
        else
        {
            this.indexCount = 0;
        }
    }

    doSelect(parts)
    {
        var indexBuffer = [];
        for (var p=0; p<parts.length; p++)
        {
            indexBuffer.push(...this.getPart(parts[p]));
        }
        this.selectionCount = indexBuffer.length;
        if (!this.selectionBuffer)
        {
            this.selectionBuffer = gl.createBuffer();
        }
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.selectionBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(indexBuffer), gl.STATIC_DRAW);
        return indexBuffer.length > 0;
    }
    
    doHide(parts)
    {
        for (var p=0; p<this.partCount; p++)
        {
            if (parts.includes(p))
            {
                this.hidden.add(p);
            }
        }
        this.updateIndex();
    }
    
    doShow(parts)
    {
        if (parts)
        {
            for (var p=0; p<this.partCount; p++)
            {
                if (parts.includes(p))
                {
                    this.hidden.delete(p);
                }
            }
        }
        else
        {
            this.hidden.clear();
        }
        
        this.updateIndex();
    }
    
    getHidden(json)
    {
        if (this.hidden.size)
        {
            json[this.id] =  Array.from(this.hidden);
        }
    }
    
    setHidden(json)
    {
        this.hidden.clear();
        
        if (json[this.id])
        {
            this.hidden = new Set(json[this.id]);
        }
        this.updateIndex();
    }

    renderSelection(material)
    {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.matrixBuffer);
        gl.vertexAttribPointer(4, 4, gl.FLOAT, gl.FALSE, 64, 0);
        gl.vertexAttribPointer(5, 4, gl.FLOAT, gl.FALSE, 64, 16);
        gl.vertexAttribPointer(6, 4, gl.FLOAT, gl.FALSE, 64, 32);
        gl.vertexAttribPointer(7, 4, gl.FLOAT, gl.FALSE, 64, 48);
        
        material.bind(this.geometry);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.selectionBuffer);
        gl.drawElementsInstanced(gl.TRIANGLES, this.selectionCount, gl.UNSIGNED_INT, 0, 1);
        material.unbind(this.geometry);
    }

    raycast(ray, options)
    {
        if (ray.intersectBox(this))
        {
            let triangle = this.geometry.raycast(ray, options, (triangle) =>
            {
                return this.hidden.has(this.index[triangle]);
            });
            if (triangle != -1)
            {
                options.object = this.id;
                options.parts = [this.index[triangle]];
                if (options.xyz)
                {
                    options.xyz = ray.at(options.distance, options.xyz);
                }
            }
        }
    }
    
    clear()
    {
        gl.deleteBuffer(this.matrixBuffer);
    }

    getPart(part)
    {
        if (!this.partIndex[part])
        {
            let index = [];
            for (var i=0; i<this.index.length; i++)
            {
                if (this.index[i] == part)
                {
                    index.push(i*3+0);
                    index.push(i*3+1);
                    index.push(i*3+2);
                }
            }
            this.partIndex[part] = index;
        }
        return this.partIndex[part];
    }
    
    getAABB(parts)
    {
        let aabb = GL.BoundingBox.init({});
        
        for (var p=0; p<parts.length; p++)
        {
            for (var i=0; i<this.index.length; i++)
            {
                if (this.index[i] == parts[p])
                {
                    var v0 = i*3+0; 
                    var v1 = i*3+1; 
                    var v2 = i*3+2; 
                    
                    GL.BoundingBox.grow(aabb, { x: this.geometry.vertex[v0*3+0], y: this.geometry.vertex[v0*3+1], z: this.geometry.vertex[v0*3+2] });
                    GL.BoundingBox.grow(aabb, { x: this.geometry.vertex[v1*3+0], y: this.geometry.vertex[v1*3+1], z: this.geometry.vertex[v1*3+2] });
                    GL.BoundingBox.grow(aabb, { x: this.geometry.vertex[v2*3+0], y: this.geometry.vertex[v2*3+1], z: this.geometry.vertex[v2*3+2] });
                }
            }
        }		
        
        return aabb;
    }
}




M.MaterialNode = class
{
    constructor(node, geometries, materials, registry)
    {
        this.material = materials[node.material];
        this.min = node.min;
        this.max = node.max;
        
        this.instanced = [];
        for (var i=0; i<node.instance.length; i++)
        {
            this.instanced.push(new M.InstancedNode(node.instance[i], geometries, registry));
        }
        
        if (node.combined)
        {
            this.combined = new M.CombinedNode(node.combined, geometries, registry);
        }
    }

    render()
    {
        this.material.use();
            
        for (var i=0; i<this.instanced.length; i++)
        {
            this.instanced[i].render(this.material);
            if (this.material.doubleSided)
            {
                gl.cullFace(gl.FRONT);
                this.instanced[i].render(this.material);
                gl.cullFace(gl.BACK);
            }
        }
        
        if (this.combined)
        {
            this.combined.render(this.material);
            if (this.material.doubleSided)
            {
                gl.cullFace(gl.FRONT);
                this.combined.render(this.material);
                gl.cullFace(gl.BACK);
            }
        }
    }

    raycast(ray, options)
    {
        let intersect = ray.intersectBox(this);
        if (intersect && intersect.distance < options.distance)
        {
            this.instanced.forEach(node => node.raycast(ray, options));
            
            if (this.combined)
            {
                this.combined.raycast(ray, options);
            }
        }
    }
    
    clear()
    {
        this.instanced.forEach(node => node.clear());
        if (this.combined)
        {
            this.combined.clear();
        }
    }

    renderSelection(material)
    {
        for (var i=0; i<this.instanced.length; i++)
        {
            this.instanced[i].render(material);
            if (this.material.doubleSided)
            {
                gl.cullFace(gl.FRONT);
                this.instanced[i].render(material);
                gl.cullFace(gl.BACK);
            }
        }
        
        if (this.combined)
        {
            this.combined.render(material);
            if (this.material.doubleSided)
            {
                gl.cullFace(gl.FRONT);
                this.combined.render(material);
                gl.cullFace(gl.BACK);
            }
        }
    }
    
    getAABB(parts)
    {
        return this;
    }

}




M.InternalNode = class
{
    constructor(node, geometries, materials, registry)
    {
        this.min = node.min;
        this.max = node.max;
        this.hidden = false;
        this.id = node.id;
        registry[this.id] = this;
        
        this.internal = [];
        for (var i=0; i<node.internal.length; i++)
        {
            this.internal.push(new M.InternalNode(node.internal[i], geometries, materials, registry));
        }
        
        this.blendStart = node.material.length;
        this.material = [];
        for (var i=0; i<node.material.length; i++)
        {
            var material = new M.MaterialNode(node.material[i], geometries, materials, registry);
            if (material.material.mode == M.Material.BLEND)
            {
                if (this.blendStart == node.material.length)
                {
                    this.blendStart = i;
                }
            }
            this.material.push(material);
        }
        /*
        if (M.Model.boundingBox)
        {
            M.Model.boundingBox.push(new GL.BoundingBox(this));
        }
        */
    }

    render(mode)
    {
        if (!this.hidden)
        {
            //if (GM.Frustum.intersectsBox(frustum, this))  // JSTIER will not work when imported into anther model due to Transform...
            {
                for (var i=0; i<this.internal.length; i++)
                {
                    this.internal[i].render(mode);
                }
                
                if (mode == M.Material.OPAQUE)
                {
                    for (var i=0; i<this.blendStart; i++)
                    {
                        this.material[i].render();
                    }
                }
                else if (mode == M.Material.BLEND)
                {
                    for (var i=this.blendStart; i<this.material.length; i++)
                    {
                        this.material[i].render();
                    }
                }
            }
        }
    }

    renderSelection(material)
    {
        this.internal.forEach(node => node.renderSelection(material));
        
        for (var i=0; i<this.blendStart; i++)
        {
            this.material[i].renderSelection(material);
        }
            
        for (var i=this.blendStart; i<this.material.length; i++)
        {
            this.material[i].renderSelection(material);
        }
    }
    
    raycast(ray, options)
    {
        if (!this.hidden)
        {
            let intersect = ray.intersectBox(this);
            if (intersect && intersect.distance < options.distance)
            {
                this.internal.forEach(node => node.raycast(ray, options));
                this.material.forEach(node => node.raycast(ray, options));
            }
        }
    }
    
    clear()
    {
        this.internal.forEach(node => node.clear());
        this.material.forEach(node => node.clear());
    }
    
    
    doSelect()
    {
        return true;
    }
    
    doHide()
    {
        this.hidden = true;
    }
    
    doShow()
    {
        this.hidden = false;
    }

    getAABB(parts)
    {
        return this;
    }

    getHidden(json)
    {
        if (this.hidden)
        {
            json[this.id] = true;
        }
    }
    
    setHidden(json)
    {
        if (typeof json[this.id] != "undefined")
        {
            this.hidden = json[this.id];
        }
        else 
        {
            this.hidden = false;
        }
    }
}




M.Model = class extends V.Dataset
{
    constructor(config, loadedCb)
    {
        super(config);
        
        this.loadedCb = loadedCb;
        
        fetch(this.url.replace("%s", `model.bin`)).then(async (response) =>
        {
            this.createTree(await response.arrayBuffer());
        });
        
        this.min = new GM.Vector3(this.root.min.x, this.root.min.y, this.root.min.z);
        this.max = new GM.Vector3(this.root.max.x, this.root.max.y, this.root.max.z);
        //this.range = GL.BoundingBox.diagonal(this);
        
        var images = [];
        for (var i=0; i<this.root.images.length; i++)
        {
            var image = new GL.ImageLoader();
            image.listen(this);
            images.push(image);
        }
        
        // resolve textures
        this.textures = [];
        for (var i=0; i<this.root.textures.length; i++)
        {
            this.textures.push(new GL.Texture(images[this.root.textures[i].source],  this.root.samplers[this.root.textures[i].sampler], this.root.images[this.root.textures[i].source].uri));
        }
        
        // load images
        for (var i=0; i<images.length; i++)
        {
            images[i].load(this.url.replace("%s",  `${this.root.images[i].uri}`));
        }
        
        this.selection = new Set();
        
        if (!M.Model.selectedMaterial)
        {
            M.Model.selectedMaterial = new M.IfcSurfaceStyle({ surfaceColor: { r: 0.0, g: 1.0, b: 0.0, a: 0.5 }});
        }
    
        V.recvMessage("node.select",(records)=> 
        { 
            if (records[this.id])
            {
                let objects = records[this.id];
                for (var id in objects)
                {
                    let node = this.registry[id];
                    if (node.doSelect(objects[id]))
                    {
                        this.selection.add(id);
                    }
                    else
                    {
                        this.selection.delete(id);
                    }
                };
                V.postMessage("node.select", records);
                V.touch3d();
            }
        });
    
        V.recvMessage("*.unselect", (records)=> 
        { 
            this.selection.clear();
            V.touch3d();
        });		
        
        V.recvMessage("node.unselect", (records)=> 
        { 
            if (records.hasOwnProperty(this.id))
            {
                this.selection.clear();
            }
        });		
        
        V.recvMessage("node.hide",(records)=> 
        { 
            if (records[this.id])
            {
                let objects = records[this.id];
                for (var id in objects)
                {
                    let node = this.registry[id];
                    node.doHide(objects[id]);
                };
                V.postMessage("node.hide", records);
                V.touch3d();
            }
        });
        
        V.recvMessage("node.show",(records)=> 
        { 
            if (records[this.id])
            {
                let objects = records[this.id];
                for (var id in objects)
                {
                    let node = this.registry[id];
                    node.doShow(objects[id]);
                };
                V.postMessage("node.show", records);
                V.touch3d();
            }
        });
    
        V.recvMessage("node.focus",(records)=>  
        { 
            if (records.hasOwnProperty(this.id))
            {
                if (records[this.id])
                {
                    this.focalNode = this.registry[records[this.id]];
                }
                else
                {
                    delete this.focalNode;
                }
                V.touch3d();
            }
        });
        
        V.recvMessage("node.aabb.get", (records)=>  
        { 
            if (records[this.id])
            {
                var aabb = GL.BoundingBox.init({});
                
                let objects = records[this.id];
                for (var id in objects)
                {
                    let node = this.registry[id];
                    GL.BoundingBox.merge(aabb, node.getAABB(objects[id]));
                }				
                
                V.postMessage("node.aabb.get", aabb); 
            }
        });
        
        V.recvMessage("model.hierarchy.get", (args)=>  
        { 
            if (!args.id || args.id == this.id)
            {
                if (this.model)
                {
                    V.postMessage("model.hierarchy.get", this.model.hierarchy); 
                }
            }
        });
        
        V.recvMessage("model.materials.get", (args)=>  
        { 
            if (args.id == this.id)
            {
                V.postMessage("model.materials.get", this.model.materials);
            }
        });
        
        V.recvMessage("model.reset", (args)=>  
        { 
            if (args.id == this.id)
            {
                delete this.focalNode;
                this.selection.clear();
                
                for (let key in this.registry) 
                {
                    this.registry[key].doShow();
                }
            }
        });
    
        /*
        V.recvMessage("material.change", (args) =>
        {
            this.materials[args.index].update(args.material);
            V.touch3d();
        });
        */
        
    }

    /*
    getAABB(records)
    {
        var aabb = GL.BoundingBox.init({});
        for (var i=0; i<records.length; i++)
        {
            var object = this.registry[records[i].object];
            GL.BoundingBox.merge(aabb, object.getAABB(records[i].parts));
        }
        return aabb;
    }
    */
    unload()
    {
        this.materials.forEach(entry => entry.clear());
        this.geometries.forEach(entry => entry.clear());

        if (this.rootNode)
        {
            this.rootNode.clear();
        }
        
        V.touch3d();
    }
    
    // image loader callback
    notify()
    {
        V.touch3d();
    }
    
    createTree(buffer)
    {
        let dv = new DataView(buffer);
        let stringSize = dv.getUint32(0, true);
        let model = JSON.parse(new TextDecoder("utf-8").decode(new Uint8Array(buffer, 4, stringSize)));
        
        let dataStart = (stringSize+4);
        if (stringSize%4)
        {
            dataStart += 4 - stringSize%4;
        }
        
        // materials
        this.materials = [];
        for (var i=0; i<model.materials.length; i++)
        {
            if (model.materials[i].type == "LineMaterial")
            {
                this.materials.push(new M.LineMaterial(model.materials[i]));
            }
            else if (model.materials[i].type == "PbrMaterial")
            {
                this.materials.push(new M.PbrMaterial(model.materials[i], this.textures));
            }
            else if (model.materials[i].type=="IfcSurfaceStyle")
            {
                this.materials.push(new M.IfcSurfaceStyle(model.materials[i], this.textures));
            }
        }

        // geometries
        this.geometries = [];
        model.geometries.forEach(geometry =>
        {
            if (geometry.bvh)
            {
                var text = new TextDecoder("utf-8").decode(new Uint8Array(buffer, dataStart + geometry.vertex.offset + geometry.vertex.size*4, geometry.bvh));
                geometry.bvh = JSON.parse(text);
            }
                
            geometry.vertex.data = new Float32Array(buffer, dataStart + geometry.vertex.offset, geometry.vertex.size);

            if (geometry.normal)
            {
                if (geometry.normal.type == "float32" || geometry.normal.type == "float")  // "float" is deprecated remnove
                {
                    geometry.normal.data = new Float32Array(buffer, dataStart + geometry.normal.offset, geometry.normal.size);
                }
                else 
                {
                    geometry.normal.data = new Int32Array(buffer, dataStart + geometry.normal.offset, geometry.normal.size);
                }
            }
            
            if (geometry.tangent)
            {
                geometry.tangent.data = new Float32Array(buffer, dataStart + geometry.tangent.offset, geometry.tangent.size);
            }
            if (geometry.uv)
            {
                geometry.uv.data = new Float32Array(buffer, dataStart + geometry.uv.offset, geometry.uv.size);;
            }
            
            this.geometries.push(new M.Mesh(geometry))
        });
        
        // nodes
        let readInstanced = (node, buffer, dataStart) =>
        {
            node.matrix = new Float32Array(buffer, dataStart + node.matrix.offset, node.matrix.size);
        }
        
        let readCombined = (node, buffer, dataStart) =>
        {
            node.index = new Uint32Array(buffer, dataStart + node.index.offset, node.index.size);
        }
        
        let readMaterial = (node, buffer, dataStart) =>
        {
            if (node.combined)
            {
                readCombined(node.combined, buffer, dataStart)
            }
            
            for (var j=0; j<node.instance.length; j++)
            {
                readInstanced(node.instance[j], buffer, dataStart);
            }
        }
        
        let readInternal = (node, buffer, dataStart) =>
        {
            for (var i=0; i<node.internal.length; i++)
            {
                readInternal(node.internal[i], buffer, dataStart)
            }
            
            for (var i=0; i<node.material.length; i++)
            {
                readMaterial(node.material[i], buffer, dataStart)
            }
        }		
        
        readInternal(model.internal, buffer, dataStart);
        this.registry = {};
        this.rootNode = new M.InternalNode(model.internal, this.geometries, this.materials, this.registry);
            
        V.touch3d();
            
        this.model = model;
    
        this.loadedCb(this.config);
    }


    setViewpoint(viewpoint)
    {
        if (viewpoint)
        {
            for (let key in this.registry) 
            {
                this.registry[key].setHidden(viewpoint.hidden);
            }
                
            if (viewpoint && viewpoint.focal)
            {
                this.focalNode = this.registry[viewpoint.focal];
            }
            else
            {
                delete this.focalNode;
            }
        }
        else
        {
            for (let key in this.registry) 
            {
                this.registry[key].setHidden({});
            }
                
            delete this.focalNode;
        }
    }
    
    getViewpoint()
    {
        var state = 
        {
            hidden : {},
            focal: (this.focalNode ? this.focalNode.id : null)
        }	

        for (let key in this.registry) 
        {
            this.registry[key].getHidden(state.hidden);
        }
            
        return state;
    }
    
    //
    //
    //
    
    render(frustum)
    {
        GL.Shader.glId = null;
        
        if (this.rootNode != null)
        {
            gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
            gl.blendEquation(gl.FUNC_ADD);

            gl.disable(gl.BLEND);
            
            gl.enableVertexAttribArray(4);
            gl.enableVertexAttribArray(5);
            gl.enableVertexAttribArray(6);
            gl.enableVertexAttribArray(7);
            gl.vertexAttribDivisor(4, 1);
            gl.vertexAttribDivisor(5, 1);
            gl.vertexAttribDivisor(6, 1);
            gl.vertexAttribDivisor(7, 1);
            
            if (this.focalNode)
            {
                this.focalNode.render(M.Material.OPAQUE);
                
                gl.enable(gl.BLEND);
                this.focalNode.render(M.Material.BLEND);
                gl.disable(gl.BLEND);
            }
            else
            {
                this.rootNode.render(M.Material.OPAQUE);

                gl.enable(gl.BLEND);
                this.rootNode.render(M.Material.BLEND);
                gl.disable(gl.BLEND);
            }
            
            if (this.selection.size)
            {
                M.Model.selectedMaterial.use();
                gl.disable(gl.DEPTH_TEST);
                gl.enable(gl.BLEND);
                this.selection.forEach(id =>
                {
                    this.registry[id].renderSelection(M.Model.selectedMaterial);
                });
                gl.disable(gl.BLEND);
                gl.enable(gl.DEPTH_TEST);
            }
            
            gl.disableVertexAttribArray(4);
            gl.disableVertexAttribArray(5);
            gl.disableVertexAttribArray(6);
            gl.disableVertexAttribArray(7);
            
            gl.disable(gl.BLEND);
            
            if (M.Model.boundingBox)
            {
                for (var i=0; i<M.Model.boundingBox.length; i++)
                {
                    M.Model.boundingBox[i].render(V.camera);
                }
            }
            
        }
        //this.boundingBox.render(V.camera);
    }

    raycast(ray, options)
    {
        if (this.rootNode)
        {
            if (this.focalNode)
            {
                this.focalNode.raycast(ray, options);
            }
            else
            {
                this.rootNode.raycast(ray, options);
            }
        }
    }

    renderBox()
    {
        if (this.boundingBox)
        {
            this.boundingBox.render(V.camera);
        }
    }

}

//M.Model.boundingBox = [];








M.Deleted = function (box) 
{
    this.position = new GL.ArrayBuffer(new Float32Array([
                                            box.min.x, box.min.y, box.min.z,  box.max.x, box.min.y, box.min.z,
                                            box.max.x, box.min.y, box.min.z,  box.max.x, box.max.y, box.min.z,
                                            box.max.x, box.max.y, box.min.z,  box.min.x, box.max.y, box.min.z,
                                            box.min.x, box.max.y, box.min.z,  box.min.x, box.min.y, box.min.z,
                                            
                                            box.min.x, box.min.y, box.max.z,  box.max.x, box.min.y, box.max.z,
                                            box.max.x, box.min.y, box.max.z,  box.max.x, box.max.y, box.max.z,
                                            box.max.x, box.max.y, box.max.z,  box.min.x, box.max.y, box.max.z,
                                            box.min.x, box.max.y, box.max.z,  box.min.x, box.min.y, box.max.z,

                                            box.min.x, box.min.y, box.min.z,  box.min.x, box.min.y, box.max.z,
                                            box.min.x, box.max.y, box.min.z,  box.min.x, box.max.y, box.max.z,
                                            box.max.x, box.max.y, box.min.z,  box.max.x, box.max.y, box.max.z,
                                            box.max.x, box.min.y, box.min.z,  box.max.x, box.min.y, box.max.z
                                            
                                            ]));

    this.color = new GL.ArrayBuffer(new Uint8Array([
                                                255, 0, 0,  255, 0, 0,
                                                255, 0, 0,  255, 0, 0,
                                                255, 0, 0,  255, 0, 0,
                                                255, 0, 0,  255, 0, 0,
                                                
                                                255, 0, 0,  255, 0, 0,
                                                255, 0, 0,  255, 0, 0,
                                                255, 0, 0,  255, 0, 0,
                                                255, 0, 0,  255, 0, 0,

                                                255, 0, 0,  255, 0, 0,
                                                255, 0, 0,  255, 0, 0,
                                                255, 0, 0,  255, 0, 0,
                                                255, 0, 0,  255, 0, 0
                                                
                                                ]));
    
    if (!M.Deleted.shader)
    {
        M.Deleted.shader = new GL.LineShader();
        M.Deleted.shader.compile();
    }
};


M.Deleted.prototype.render = function (shader)
{
    M.Deleted.shader.useProgram(V.camera);
    gl.disable(gl.DEPTH_TEST);
    M.Deleted.shader.enableBuffer(this);
    M.Deleted.shader.bindBuffer(this);
    gl.drawArrays(gl.LINES, 0, 24);
    M.Deleted.shader.disableBuffer(this);
    gl.enable(gl.DEPTH_TEST);
}

M.Deleted.prototype.setColor = function (r,g,b)
{
    this.color = new GL.ArrayBuffer(new Uint8Array([
                                            r,g,b,  r,g,b,
                                            r,g,b,  r,g,b,
                                            r,g,b,  r,g,b,
                                            r,g,b,  r,g,b,
                                            
                                            r,g,b,  r,g,b,
                                            r,g,b,  r,g,b,
                                            r,g,b,  r,g,b,
                                            r,g,b,  r,g,b,

                                            r,g,b,  r,g,b,
                                            r,g,b,  r,g,b,
                                            r,g,b,  r,g,b,
                                            r,g,b,  r,g,b,
                                                    
                                        ]));
}

M.Deleted.prototype.clear = function()
{
    this.position.clear();
    this.color.clear();
}



