
class VaText extends HTMLElement 
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
                
                textarea
                {
                    resize: none;
                }
                
            </style>
                
            <textarea rows="8" placeholder="Add text here..."></textarea>
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

        this.dom.querySelector("textarea").addEventListener("blur", (event) => 
        {
            this.meta.html = this.dom.querySelector("textarea").value;
        });
        
    }

    attach(viewer, meta)
    {
        this.viewer = viewer;
        this.meta = meta;
        let textarea = this.dom.querySelector("textarea");
        textarea.value = meta.html;
        
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
                
                if (meta.target == "text")
                {
                    meta.vxOpen = false;
                    meta.vxPanel = "va-text";
                    meta.vxIcon = "fa-pen";
                    viewer.post("point.create", entry, meta);			
                }
            }
        });
        
        viewer.on("point.record", async (geometry, meta) =>
        {
            if (meta.target == "text")
            {
                meta.icon = "info";
                
                geometry.scope = { radius: 40 };
                geometry.scope.image = await VaIcon.getImage(meta.icon);
                geometry.code = VaIcon.CODE

                meta.html = "";
                meta.vxOpen = true;
                meta.vxPanel = "va-text";
                meta.vxIcon = "fa-pen";
                viewer.post("point.create", geometry, meta);
            }			
        });
    }
}

customElements.define("va-text", VaText);


