class VaLink extends HTMLElement 
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
                    height: 330px;
                }
                
                iframe 
                {
                    margin-top: 0.5em;
                    flex:1;
                }
                
                
            </style>
            
            <input type="text" placehoder="url" value="https"></input>
            <iframe></iframe>
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
        
        this.dom.querySelector("input").addEventListener("focusout", (event) => 
        {
            this.meta.href = event.currentTarget.value;

            let iframe = this.dom.querySelector("iframe");
            iframe.src = this.meta.href;
        });
    }
    
    connectedCallback() 
    {
        this.parentElement.addEventListener("open", event =>
        {
            let iframe = this.dom.querySelector("iframe");
            if (iframe.src !== this.meta.href)
            {
                iframe.src = this.meta.href;
            }
        })	
        
        if (this.parentElement.hasAttribute("open"))
        {
            let iframe = this.dom.querySelector("iframe");
            iframe.src = this.meta.href;
        }
    }

    attach(viewer, meta)
    {
        this.viewer = viewer;
        this.meta = meta;
        
        this.dom.querySelector("input").value = meta.href;
        
        viewer.on("point.select", async (args) => 
        { 
            if (args.id != this.id)
            {
                return;	
            }
            
            let iframe = this.dom.querySelector("iframe");
            if (iframe.src !== this.meta.href)
            {
                iframe.src = this.meta.href;
            }
        });
        
        viewer.on("point.unselect", async (args) => 
        { 
            if (args.id != this.id)
            {
                return;	
            }
        });
        
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
                
                if (meta.target == "link")
                {
                    meta.vxOpen = false;
                    meta.vxPanel = "va-link";
                    meta.vxIcon = "fa-link";
                    viewer.post("point.create", entry, meta);			
                }
            }
        });
        
        viewer.on("point.record", async (geometry, meta) =>
        {
            if (meta.target == "link")
            {
                meta.icon = "link";
                
                geometry.scope = { radius: 40 };
                geometry.scope.image = await VaIcon.getImage(meta.icon);
                geometry.code = VaIcon.CODE;

                meta.href = "https://via.placeholder.com/300";
                meta.vxOpen = true;
                meta.vxPanel = "va-link";
                meta.vxIcon = "fa-link";
                viewer.post("point.create", geometry, meta);
            }			
        });
    }
}

customElements.define("va-link", VaLink);
