
class VxHeader extends HTMLElement 
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
                    display: flex;
                    align-items: center;
                    padding: 10px;
                    background-color: var(--primary-transparent);
                }
            
                div { flex: 1; }
                
                .fa-map-pin { margin-left: 1.5em; color: grey; }
                span.address { margin-left: 0.5em; }
                span.name { margin-left: 1em; }
        
                button[name='save'] { margin-right: 0.1em; margin-top: 0.1em; }
                
                /*:host(:not([launch])) button[name='launchpad'] { visibility: hidden }*/

            </style>
            
            <button name="inventory" class="vx-primary">
                <i class="far fa-map"></i>
                <ui-tooltip hidden>
                    <p>Open the Explorer to select a different dataset</p>
                </ui-tooltip>				
            </button>
            <div><span class="name"></span><i class="fas fa-map-pin" hidden></i><span class="address"></span></div> 
            <button name="save" class="vx-app vx-primary" hidden>
                <i class="fas fa-save"></i>
                <span>Save</span>
            </button>
            <!--			
            <button name="launchpad" class="vx-primary">
                <i class="fas fa-rocket"></i>
            </button>
            -->

        `;		
            
        this.dom.querySelector("button[name='inventory']").addEventListener("click", (event) =>
        {
            this.dispatchEvent(new CustomEvent('header-inventory', { bubbles: true, composed: true }));
        });
            
        this.dom.querySelector("button[name='save']").addEventListener("click", (event) =>
        {
            this.dispatchEvent(new CustomEvent('header-save', { bubbles: true, composed: true }));
        });
    }

    parseJwt(token)
    {
        var base64Url = token.split('.')[1];
        var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        var jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c)
        {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        return JSON.parse(jsonPayload);
    }
    
    attach(viewer)
    {
        viewer.on("viewer.load", (args) => 
        {
            if (args.token)
            {
                let payload = this.parseJwt(args.token);
                if (payload.p === "W" && this.hasAttribute("save"))
                {
                    this.dom.querySelector("button[name='save']").hidden = false;
                }
                else
                {
                    this.dom.querySelector("button[name='save']").hidden = true;
                }
            }
        
            this.dom.querySelector("span.address").textContent = "";
            this.dom.querySelector(".fa-map-pin").hidden = true;
            this.dom.querySelector("span.name").textContent = args.meta.name;
            if (args.location)
            {
                fetch(`https://photon.komoot.io/reverse?lon=${args.location.lon}&lat=${args.location.lat}`).then(async (response) =>
                {
                    if (response.ok)
                    {
                        let json = await response.json();
                        if (json.features.length > 0)
                        {
                            let properties = json.features[0].properties;
                            
                            
                            let text = "";
                            
                            if (properties.name) 
                            {
                                text = properties.name;
                            } 
                            else if (properties.housenumber) 
                            {
                                text = properties.housenumber;
                                if (properties.street) 
                                {
                                    text += ' ' + properties.street;
                                }
                            }
                            
                            if (properties.city && properties.city !== properties.name) 
                            {
                                //details.push(properties.city);
                            }
                            if (properties.country)
                            {
                                //details.push(properties.country);
                            }
                            
                            this.dom.querySelector("span.address").textContent = text;
                            this.dom.querySelector(".fa-map-pin").hidden = false;
                        }
                    }
                })
            }
        })
    }

    startSave()
    {
        let button = this.dom.querySelector("button[name='save']")
        button.toggleAttribute("disabled", true);
        button.toggleAttribute("active", true);
    }	

    endSave()
    {
        let button = this.dom.querySelector("button[name='save']")
        button.toggleAttribute("disabled", false);
        button.toggleAttribute("active", false);
    }	
}

customElements.define("vx-header", VxHeader);


