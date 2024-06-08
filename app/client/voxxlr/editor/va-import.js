class VaImport extends HTMLElement 
{
    constructor()
    {
        super();
        
        this.dom = this.attachShadow({mode: 'open'});
        
        this.dom.innerHTML = `

            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css">
            <link rel="stylesheet" href="${window.app_domain}/ui.css">
        
            <style>
            
                :host
                {
                    position: relative;
                    overflow: visible;
                    display: flex;
                    flex-direction: column;
                    justify-content: stretch;
                    padding:  0.5em 0.5em; 
                    z-index: 9999;
                }
                
                div.image
                {
                    background-repeat: no-repeat;
                    background-position: 50% 50%;
                    background-size: contain;
                    height: 200px;
                }
                
                ui-dropdown
                {
                    z-index: 999;
                }
                
            </style>
            
            <div class="image">
            </div>
            <ui-dropdown></ui-dropdown>
            `;		
            
        this.viewpoint = this.dom.querySelector("ui-dropdown");
        this.viewpoint.addEventListener("change", (event) =>
        {
            this.meta.viewpoint = event.detail.content;
            
            this.viewer.post("import.viewpoint", { id:this.id, viewpoint: this.meta.viewpoint });

                /*
            if (this.viewer.is("3D"))
            {
                let unselect = (list) =>
                {
                    
                    if (entry.viewpoint)
                    {
                        list.forEach(item => 
                        {
                            if (!entry.viewpoint.exclude[item.id.substring(0, item.id.indexOf('.'))])
                            {
                                V.post(`${item.type}.delete`, item, { transform: entry.id });
                            }
                        })
                    }
                    else
                    {
                        list.forEach(item => V.post(`${item.type}.delete`, item, { transform: entry.id }));
                    }
                }
                unselect(this.registry[entry.id].meta.annotations || []);
                unselect(this.registry[entry.id].meta.measurements || []);
                
                entry.viewpoint = viewpoint;
                
                let select = (list) =>
                {
                    if (entry.viewpoint)
                    {
                        list.forEach(item => 
                        {
                            if (!entry.viewpoint.exclude[item.id.substring(0, item.id.indexOf('.'))])
                            {
                                V.post(`${item.type}.create`, item, { transform: entry.id });
                            }
                        })
                    }
                    else
                    {
                        list.forEach(item => V.post(`${item.type}.create`, item, { transform: entry.id }));
                    }
                }			
                select(this.registry[entry.id].meta.annotations || []);
                select(this.registry[entry.id].meta.measurements || []);
                this.viewer.post("import.viewpoint", { id:entry.id, viewpoint: entry.viewpoint});
            }
            else
            {
                entry.viewpoint = viewpoint;
            }
                */
        });		
        
            
/*
        this.viewpoint = this.dom.querySelector("ui-dropdown");
        this.viewpoint.addEventListener("change", (event)=>
        {
            if (this.key)
            {
                if (event.detail)
                {
                    this.key.data.viewpoint = parseInt(event.detail.getAttribute("value"));
                }
                else
                {
                    delete this.key.data.viewpoint;
                }
                this.update();
            }
        });				

    
    */
    }
    
    attach(viewer, entry)
    {
        this.viewer = viewer;
        this.meta = entry.meta;
        
        this.dom.querySelector(".image").style.backgroundImage = 'url('+entry.vxPreview+')';
        delete entry.vxPreview;
        
        if (entry.vxOpen)
        {
            this.viewer.post("*.unselect");
            this.viewer.post(`import.select`, { id: entry.id });
        }
            
        (entry.vxViewpoints || []).forEach(viewpoint =>
        {
            this.viewpoint.add(viewpoint.id, viewpoint.name).content = viewpoint;
        });
        delete entry.vxViewpoints;
        
        if (this.meta.viewpoint)
        {
            this.viewer.post("import.viewpoint", { id:this.id, viewpoint: this.meta.viewpoint });
            this.viewpoint.setAttribute("value", this.meta.viewpoint.id)
        }
    }
    
    
    static DIV;

    static init(viewer, listing) 
    {
        viewer.on("viewer.load", async (args) => 
        { 
            for (var id in args.meta.import || {})
            {
                let entry = args.meta.import[id];
                
                entry.vxOpen = false;
                entry.vxPanel = "va-import";
                entry.vxIcon = "fa-file-import";
                entry.name = entry.meta.name;
                
                fetch(`/load/${entry.document}`, 
                { 
                    method: 'POST', 
                    headers: new Headers({
                     'x-api-key': listing.getAttribute("key"), 
                     'Content-Type': "application/json",
                    }),
                    body: JSON.stringify({ meta : ["preview","viewpoints"]})
                }).then(async (response) =>
                {
                    let dataset = await response.json();
                    
                    entry.vxPreview = dataset.files["preview.jpg"];
                    entry.vxViewpoints = dataset.meta.viewpoints;
                    
                    await viewer.post("import.create", dataset, entry);
                });
            }
        });		
        
        listing.addEventListener("dragstart", (event) =>
        {
            let rect = viewer.getBoundingClientRect();
    
            VaImport.DIV = document.createElement("div");
            VaImport.DIV.style.position = 'fixed';
            VaImport.DIV.style.left = `${rect.left}px`;
            VaImport.DIV.style.top = `${rect.top}px`;
            VaImport.DIV.style.width = `${rect.width}px`;
            VaImport.DIV.style.height = `${rect.height}px`;
            VaImport.DIV.style.backgroundColor = 'blue';
            VaImport.DIV.style.opacity = 0;
            
            VaImport.DIV.addEventListener("dragover", async (event) =>
            {		
                event.dataTransfer.dropEffect = "move";
                event.preventDefault();
            });
            
            VaImport.DIV.addEventListener("drop", async (event) => 
            {
                event.preventDefault();
                VaImport.DIV.remove();
                delete VaImport.DIV;
                
                fetch(`${window.doc_domain}/load`, 
                { 
                    method: 'POST', 
                    headers: new Headers({
                     'x-doc-token': event.dataTransfer.getData("json/content"), 
                     'Content-Type': "application/json",
                    }),
                    body: JSON.stringify({ meta: ["name", "viewpoints"], files: ["preview.jpg"]})
                }).then(async (response) =>
                {
                    let dataset = await response.json();
                    
                    let rect = viewer.getBoundingClientRect();
                    let cast3d = await viewer.wait("raycast.content", { x:event.pageX - rect.left, y:event.pageY - rect.top });
                    
                    if (viewer.is("3D"))
                    {
                        let point = null;
                        
                        if (cast3d.distance != Number.POSITIVE_INFINITY)
                        {
                            point = cast3d.xyz;
                            point.y -= (dataset.root.min.y || dataset.root.min[1])/2; 
                        }
                        else
                        {
                            let camera = await viewer.get("camera");
                            
                            let dx = dataset.root.max.x || dataset.root.max[0] - dataset.root.min.x || dataset.root.min[0];
                            let dy = dataset.root.max.y || dataset.root.max[1] - dataset.root.min.y || dataset.root.min[1];
                            let dz = dataset.root.max.z || dataset.root.max[2] - dataset.root.min.z || dataset.root.min[2];
                            let d = Math.sqrt(dx*dx + dy*dy + dz*dz);
                            
                            point = { x: camera.position.x - camera.zAxis.x*d, y: camera.position.y - camera.zAxis.y*d, z: camera.position.z - camera.zAxis.z*d };
                        }
                        
                        let entry = { };
                    
                        entry.vxOpen = true;
                        entry.vxPanel = "va-import";
                        entry.vxIcon = "fa-file-import";
                        entry.vxPreview = dataset.files["preview.jpg"];
                        entry.vxViewpoints = dataset.meta.viewpoints;
                    
                        entry.id = new Date().getTime();
                        entry.name = dataset.meta.name || "import";
                        entry.type = "import";
                        entry.transform = [1,0,0,0,
                                          0,1,0,0,
                                          0,0,1,0,
                                          point.x,point.y,point.z,1];
                        
                        entry.meta = { name: entry.name };
                        
                        await viewer.post("import.create", dataset, entry);
                    }
                });
            });
            
            document.querySelector("body").appendChild(VaImport.DIV);
        });
        
        listing.addEventListener("dragend", (event) => 
        { 
            if (VaImport.DIV)
            {
                VaImport.DIV.remove();
                delete VaImport.DIV;
            } 
        });

    }

        /*
    static async importDocument(viewer, dataset, entry)
    {
        
        let createOverlay = (list) =>
        {
            list.forEach(item => 
            {
                item.id = `${item.id}.${entry.id}`;
                
                if (entry.viewpoint)
                {
                    if (!entry.viewpoint.exclude[item.id.substring(0, item.id.indexOf('.'))])
                    {
                        viewer.post(`${item.type}.create`, item, { transform: entry.id });		
                    }
                }
                else
                {
                    viewer.post(`${item.type}.create`, item, { transform: entry.id });		
                }
            });		
        }
        if (dataset.meta.annotations)
        {
            dataset.meta.annotations.forEach(item => item.id = `${item.id}.${entry.id}`); 
            createOverlay(dataset.meta.annotations);
        }
        if (dataset.meta.measurements)
        {
            dataset.meta.measurements.forEach(item => item.id = `${item.id}.${entry.id}`); 
            createOverlay(dataset.meta.measurements);
        }
    }
    
    static unimportDocument(viewer,entry)
    {
        let deleteOverlay = (list) =>
        {
            list.forEach(item => 
            {
                if (entry.viewpoint)
                {
                    if (!entry.viewpoint.exclude[item.id.substring(0, item.id.indexOf('.'))])
                    {
                        viewer.post(`${item.type}.delete`, item, { transform: entry.id });		
                    }
                }
                else
                {
                    viewer.post(`${item.type}.delete`, item, { transform: entry.id });		
                }			
            });		
        }

        viewer.post(`import.delete`, { id:entry.id });
    }
        */

}

customElements.define("va-import", VaImport);
        /*
        
        viewer.on("import.create", async (args) => 
        { 
            for (var id in args.meta.point || {})
            {
                let entry = args.meta.point[id];
                let meta = entry.meta || {};
                
                if (meta.target == "window")
                {
                    meta.vxOpen = false;
                    meta.vxPanel = "va-window";
                    meta.vxIcon = "fa-pen";
                    viewer.post("point.create", entry, meta);			
                }
            }
        });
        viewer.on("point.record", async (geometry, meta) =>
        {
            if (meta.target == "import")
            {
                meta.icon = "window";
                
                geometry.scope = { radius: 40 };
                geometry.scope.image = await VaIcon.getImage(meta.icon);
                geometry.code = VaIcon.CODE;

                meta.list = [];
                meta.vxOpen = true;
                meta.vxPanel = "va-window";
                meta.vxIcon = "fa-window-maximize";
                viewer.post("point.create", geometry, meta);
            }			
        });
        */
