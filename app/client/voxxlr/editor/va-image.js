class VaImage extends HTMLElement 
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
                    overflow: auto;
                    display: flex;
                    flex-direction: column;
                    justify-content: stretch;
                    padding:  0.5em 0.5em; 
                }
                
                vx-file 
                {
                    border: 1px solid var(--primary);
                    overflow: hidden; 
                }

                div[name='progress']
                {
                    display: flex;
                    align-items: center;
                    justify-content: center;					
                    height: 200px;
                }		
                div[hidden] { display: none; }	
        
                .image-list
                {
                    display: flex;	
                    flex-direction: column;	
                    justify-content: flex-end;
                    position: relative;
                    margin: auto;
                    height: 200px;
                }
                
                .image-list .image
                {
                    background-repeat: no-repeat;
                    background-position: 50% 50%;
                    background-size: contain;
                    flex: 1;
                }
    
                .image-list .bullets
                {
                    margin: 0.5em 0;
                    display:flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .image-list .bullet
                {
                    cursor: pointer;
                    height: 1.1em;
                    width: 1.1em;
                    margin-left: 0.5em;
                    background-color: #bbb;
                    border-radius: 50%;
                    display: inline-block;
                    transition: background-color 0.6s ease;
                }
                .image-list .bullet.selected { background-color: #717171; }
                .image-list .bullet:hover { background-color: #717171; }
                
            </style>
                
            <vx-file ext="jpeg,jpg,png,gif" path="/test/" style="z-index: 98">
                <ui-stack>
                    <div name="progress" active><span>Drag and drop images here</span></div>
                    <div class="image-list">
                        <ui-selection-list spring>
                            <button class="vx-secondary"><i class="fas fa-trash"></i></button>
                        </ui-selection-list>
                        <div class="image"></div>
                        <div class="bullets"></div>
                    </div>											
                <ui-stack>
            </vx-file>
            
            <va-icon></va-icon>

            `;			

        this.dom.querySelector("va-icon").addEventListener("image-changed", async (event) =>
        {
            let scope = { image: event.detail.image };
            
            if (event.detail.name == "alarm")
            {
                scope.frequency = 1;
            }
            else if (event.detail.name == "warn")
            {
                scope.frequency = 2;
            }
            
            this.viewer.post("point.update", { id: this.id, scope });

            this.meta.icon = event.detail.name;
        });

        this.image = this.dom.querySelector(".image");
        this.bullets = this.dom.querySelector(".bullets");
        
        this.dom.querySelector("ui-selection-list").addEventListener("down", event =>
        {
            let bullet = this.bullets.querySelector(".selected");
            /*
            this.dispatchEvent(new CustomEvent('unselect', 
            {
                bubbles: true,
                composed: true,
                detail: bullet.file
            }));
            */
            bullet.remove();
            
            fetch(`${window.doc_domain}/file/${bullet.file.path}`, 
            { 
                method: 'DELETE', 
                headers: new Headers({
                    'x-doc-token': this.upload.getAttribute("token") 
                })
            }); 
            
            var first = this.bullets.querySelector(".bullet:first-child");
            if (first)
            {
                first.dispatchEvent(new Event("click"));		
            }
            else 
            {
                this.image.style.backgroundImage = 'url()';
                this.dom.querySelector("ui-stack").show(this.progress);
            }
        });
        
        
        this.upload = this.dom.querySelector("vx-file");
        this.progress = this.upload.querySelector("div[name='progress']");
        this.upload.addEventListener('upload-start', (event) =>
        {
            this.dom.querySelector("ui-stack").show(this.progress);
        })		
        this.upload.addEventListener('item-progress', (event) =>
        {
            this.progress.querySelector("span").textContent = `${(100*event.detail).toFixed(2)}%`;
        })		
        this.upload.addEventListener('item-done', async (event) =>
        {
            fetch(`${window.doc_domain}/file/${event.detail}`, 
            { 
                method: 'GET', 
                headers: new Headers({
                    'x-doc-token': this.upload.getAttribute("token") 
                })
            }).then(async (response) =>
            {
                let files = await response.json();
                let bullet = this.addImage(files[0]);
                bullet.dispatchEvent(new Event("click"));
                //this.dom.querySelector("ui-stack").show(this.bullets.parentElement);
        
            })
        })
        this.upload.addEventListener('upload-end', (event) =>
        {
            this.dom.querySelector("ui-stack").show(this.bullets.parentElement);
        })		
    }
    
    addImage(file)
    {
        var bullet = this.bullets.appendChild(document.createElement("div"));
        bullet.addEventListener("click", (event) => 
        {
            this.image.style.backgroundImage = 'url('+file.url+')';
            var selected = this.bullets.querySelector(".selected");
            if (selected)
            {
                /*
                this.dispatchEvent(new CustomEvent('unselect', 
                {
                    bubbles: true,
                    composed: true,
                    detail: selected.file
                }));
                */
                selected.classList.remove("selected");
            }
            /*
            this.dispatchEvent(new CustomEvent('select', 
            {
                bubbles: true,
                composed: true,
                detail: event.currentTarget.file
            }));
            */
            event.currentTarget.classList.add("selected");
        });
        bullet.classList.add('bullet');
        bullet.file = file;		
        bullet.id = file.path;		
        return bullet;
    }
    

    attach(viewer, meta)
    {
        this.viewer = viewer;
        this.meta = meta;
        
        viewer.on("point.select", async (args) => 
        { 
            if (args.id != this.id)
            {
                return;	
            }
            
            if (this.meta.list.length)
            {
                if (!this.bullets.firstElementChild)
                {
                    await fetch(`${window.doc_domain}/file/${this.id}/`, 
                    { 
                        method: 'GET', 
                        headers: new Headers({
                            'x-doc-token': this.upload.getAttribute("token")
                        })
                    }).then(async (response) =>
                    {
                        let list = await response.json();
            
                        let loaded = [];
                        for (var i=list.length-1; i>=0; i--)
                        {
                            let image = list[i];
                            let index = meta.list.findIndex((entry) => { return image.path === entry.path });
                            
                            if (index != -1)
                            {
                                loaded.push(meta.list[index]);
                            }
                            else
                            {
                                loaded.push({ path: image.path, title: ""});
                            }
                            
                            let bullet = this.addImage(list[i]);
                        
                            if (i==0)
                            {
                                bullet.dispatchEvent(new Event("click"));		
                            }
                        }
                        meta.list = loaded;
                    })						
                    
                    if (this.bullets.firstElementChild)
                    {
                        this.dom.querySelector("ui-stack").show(this.bullets.parentElement);
                    }
                    else
                    {
                        this.dom.querySelector("ui-stack").show(this.progress);
                    }
                }			
            }
        });
        
        viewer.on("point.delete", async (args) => 
        { 
            if (args.id == this.id)
            {
                fetch(`${window.doc_domain}/file/${this.id}`,
                {
                    method: 'DELETE',
                    headers: new Headers({
                        'x-doc-token': this.upload.getAttribute("token")
                    })
                });
            }
        }); 

        
        this.upload.setAttribute("path", this.id);
        this.upload.setAttribute("token", viewer.content.token);
        
        this.dom.querySelector("va-icon").setAttribute("icon", meta.icon);
    }

    static init(viewer) 
    {
        viewer.on("viewer.load", async (args) => 
        { 
            for (var id in args.meta.point || {})
            {
                let entry = args.meta.point[id];
                let meta = entry.meta || {};
                
                if (meta.target == "image")
                {
                    meta.vxOpen = false;
                    meta.vxPanel = "va-image";
                    meta.vxIcon = "fa-pen";
                    viewer.post("point.create", entry, meta);			
                }
            }
        });
        
        viewer.on("point.record", async (geometry, meta) =>
        {
            if (meta.target == "image")
            {
                meta.icon = "photo";
                
                geometry.scope = { radius: 40 };
                geometry.scope.image = await VaIcon.getImage(meta.icon);
                geometry.code = VaIcon.CODE;

                meta.list = [];
                meta.vxOpen = true;
                meta.vxPanel = "va-image";
                meta.vxIcon = "fa-pen";
                viewer.post("point.create", geometry, meta);
            }			
        });
    }

    save()
    {
        this.meta.list = []
        this.bullets.querySelectorAll("div").forEach(bullet =>
        {
            this.meta.list.push(bullet.file);
        });
    }

}

customElements.define("va-image", VaImage);
