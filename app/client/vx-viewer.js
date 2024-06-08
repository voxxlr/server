
class VxViewer extends HTMLElement 
{
    static get observedAttributes() 
    {
        return ['units', 'src', 'meta'];
    }
    
    constructor() 
    {
        super();
        
        this.callbacks = [];

        this.dom = this.attachShadow({mode: 'open'});
        
        this.dom.innerHTML = `

            <style>

                :host
                {
                    display: grid;
                    width: 100%; 
                    height: 100%;
                }
                
                div 
                {
                    grid-row-start: 1;
                    grid-column-start: 1;
                    pointer-events: none; 
                }
                
                iframe  
                {
                    grid-row-start: 1;
                    grid-column-start: 1;
                    position: relative;
                    width: 100%; 
                    height: 100%; 
                    border: none;  
                }  
                
                ::slotted(*)
                {
                    pointer-events: auto;
                }
                
            </style>
                    
            <iframe></iframe>
            <div>
                <slot></slot>
            </div>

            
            `;		
            
        this.div = this.dom.querySelector(":host > div");
        this.iframe = this.dom.querySelector(":host > iframe");
    
        this.dom.addEventListener("dragenter", (e) =>
        {
            e.stopPropagation();
            e.preventDefault();
            return !this.disabled;
        })
        
        this.dom.addEventListener("dragover", (e) =>
        { 
            e.stopPropagation();
            e.preventDefault();
            return !this.disabled;
        })
        
        this.dom.addEventListener("dragleave", (e) =>
        { 
            e.stopPropagation();
            e.preventDefault();
            return !this.disabled;
        })

        this.on("viewer.load", (document, custom) =>
        {
            // TODO make this 3D 2D "1D""
            switch(document.type)
            {
                case "cloud":
                case "model":
                    this.v = 3;
                    break;
                case "map":
                case "wmts":
                    this.v = 2;
                    break;
                case "panorama":
                    this.v = 1;
                    break;
            }
            
            this.content= document;
            
            if (this.is("2D"))
            {
                this.scalar1 = 10000000.0/256.0;
                this.scalar2 = this.scalar1*this.scalar1;
            }
            else
            {
                this.scalar1 = 1.0;
                this.scalar2 = 1.0;
            }
            
            if (this.hasAttribute("debug"))
            {
                this.post("viewer.update", { logging : true });
            }
            
            if (this.hasAttribute("units"))
            {
                this.post("viewer.update", { units: this.getAttribute("units") });
            }
        });
        
        this.on("viewer.unload", (args) =>
        {
            delete this.v;
            delete this.content;
        })
        
        this.format = new Intl.NumberFormat();
        this.meta = "";
    }
    
    connectedCallback() 
    {
        let token = this.getAttribute("token");
        if (token)
        {
            this.iframe.src = `${window.doc_domain}/index.html?token=${token}${this.meta}`;
        }
        
        window.addEventListener('message', (e) =>
        {
            if (e.source == this.iframe.contentWindow)
            {
                var handlers = this.callbacks[e.data.action];
                if (handlers)
                {
                    for (var i=0; i<handlers.length; i++)
                    {
                        handlers[i].callback(e.data.args, e.data.optional || {}, e.data.action, handlers[i].callback);
                    }
                }
            }
        });
    }
    
    is(type)
    {
        switch (type)
        {
            case "3D": return this.v == 3; 
            case "2D": return this.v == 2; 
            case "1D": return this.v == 1; 
        }
        return false;
    }

    contains(id)
    {
        if (this.content)
        {
            return this.content.id == id;
        }
        return false;
    }


    //
    // Event handler
    //
    
    post(action, args, custom)
    {
        if (!this.v)
        {
            console.log("VIEWER NOT LOADED !")	
        }
            
        if (action instanceof Array)
        {
            for (var i=0; i<action.length; i++)
            {
                this.post(action[i], args[i], custom ? custom[i] : null)
            }
        }
        else
        {
            this.iframe.contentWindow.postMessage({action, args: args || {}, custom}, "*");
        }
    }
    
    on(name, callback, owner)
    {
        if (name instanceof Array)
        {
            name.forEach(entry => this.on(entry, callback, owner));
        }
        else if (this.callbacks[name])
        {
            this.callbacks[name].push({callback, owner});
        }
        else
        {
            this.callbacks[name] = [{callback, owner}];
        }
    }
    
    un(name, owner)
    {
        if (name instanceof Array)
        {
            name.forEach(entry => this.un(entry, owner));
        }
        else if (this.callbacks[name])
        {
            let list = this.callbacks[name];
            for (var i=0; i<list.length; i++)
            {
                if (list[i].owner == owner)
                {
                    list.splice(i, 1);
                    break;
                }
            }
        }
    }
    
    //
    // Setter/Getter
    //

    wait(action, args, custom)
    {
        if (this.v)
        {
            return new Promise((resolve) =>
            {
                this.post(action, args, custom);
                var repsonseFn = (args)=>
                {
                    this.un(action, repsonseFn);
                    resolve(args);
                };
                this.on(action, repsonseFn, repsonseFn);
            });
        }
        else
        {
            console.log("VIEWER NOT LOADED !")	
        }
        
        return Promise.resolve();
    }	

    get(action, args)
    {
        return this.wait(action+".get", args);
    }
    
    //
    // loading
    //

    import(document, custom, meta)
    {
        if (typeof document === "string")
        {
            // load document from token
            return new Promise((resolve, reject) =>
            {
                var xhr = new XMLHttpRequest();
                xhr.open("POST", `${window.doc_domain}/load`, true);
                xhr.setRequestHeader('x-doc-token', document);
                xhr.onload = (e) =>
                {
                    if (xhr.status == 200)
                    {
                        let document = JSON.parse(e.currentTarget.responseText);
                        this.post("import.create", document, custom);
                        resolve(document);
                    }
                    else
                    {
                        reject(xhr.status)
                    }
                };
                xhr.onerror = (e)=>
                {
                    reject(xhr.status)
                }
                xhr.send(JSON.stringify({ meta : meta || []}));
            });
        }
        else
        {
            // load document directly
            return new Promise((resolve, reject) =>
            {
                this.post("import.create", document, custom);
                resolve(document);
            });
        }
    }
    
    
    async unload()
    {
        if (this.content)
        {
            await this.wait("viewer.unload", this.content);
            this.iframe.src = ""; 
        }
    }
    
    //
    // initializtion
    //
    async init(type)
    {
        this.iframe.src = `${window.doc_domain}/index.html?type=${type}`;
    }

    /*
    else
    {
    this.iframe.src = "data:text/html;charset=utf-8,%3Chtml%3E%0A%20%20%20%20%3Cbody%20style%3D%22position%3A%20relative%3Bdisplay%3A%20flex%3Bjustify-content%3A%20center%3Balign-items%3A%20center%3B%20font-family%3A%20Nunito%20Sans%2Csans-serif%3B%22%3E%0A%20%20%20%20%20%20%20%09%3Cp%3E%0A%20%20%20%20%20%20%20%09%09No%20Data%0A%20%20%20%20%20%20%20%09%3C%2Fp%3E%0A%20%20%20%09%3C%2Fbody%3E%0A%3C%2Fhtml%3E";
    return Promise.resolve();
    }
    */

    async load(token, custom)
    {
        if (this.v)
        {
            await this.wait("viewer.unload", this.content);
        }
        
        return new Promise((resolve, reject) =>
        {
            if (custom)
            {
                custom = `&custom=${encodeURIComponent(JSON.stringify(custom))}`;
            }
            else
            {
                custom = '';
            }
                
            this.iframe.src = `${window.doc_domain}/index.html?token=${encodeURIComponent(token)}${this.meta}${custom}`;
                
            this.iframe.onload = ()=>
            {
                this.setAttribute("token", token);
                resolve();
            };
        });
    }
    
    attributeChangedCallback(name, oldValue, newValue)
    {
        if (name == "units")
        {
            if (this.iframe.src)
            {
                this.post("viewer.update", { units: newValue });
            }
        }
        else if (name == "src")
        {
            delete this.v;
            this.iframe.src = newValue;
        }
        else if (name = "meta")
        {
            if (newValue)
            {
                this.meta = `&meta=${newValue}`			
            }
            else 
            {
                this.meta = "";
            }
        }
    }
     
    toString (value, dim)
    {
        let units = this.getAttribute("units") || "metric";
        
        switch (dim)
        {
        case 0:
            switch (units)
            {
            case "metric":
                return this.format.format(value.toFixed(2)) +" m";
            case "imperial":
                {
                    var inches = value*39.3701;
                    var feet = Math.floor(inches/12);
                    inches = Math.round(inches-feet*12);
                    return this.format.format(feet) + "' " + inches + "\"";		
                }
            }
            break;
        case 1:
            value *= this.scalar1;
            switch (units)
            {
            case "metric":
                return this.format.format(value.toFixed(2)) +" m";
            case "imperial":
                {
                    var inches = value*39.3701;
                    var feet = Math.floor(inches/12);
                    inches = Math.round(inches-feet*12);
                    return this.format.format(feet) + "' " + inches + "\"";		
                }
            }
            break;
        case 2:
        
            value *= this.scalar2;
            switch (units)
            {
            case "metric":
                return this.format.format(value.toFixed(2)) +" m\u00B2";
            case "imperial":
                return this.format.format((value*10.7639).toFixed(2)) +" ft\u00B2";
            }
            break;
            
        case 3:
        
            value *= this.scalar2;
            switch (units)
            {
            case "metric":
                return this.format.format(value.toFixed(2)) +" m\u00B3";
            case "imperial":
                return this.format.format((value*35.3147).toFixed(2)) +" ft\u00B3";
            }
            break;
        }
    }
    
    async recordPreview()
    {
        let base64 = await this.wait("viewer.image.get", { width: 640, height: 320, type: "image/jpeg", options: 0.8});

        fetch(`${window.doc_domain}/file/preview.jpg`, 
        { 
            method: 'PUT', 
            headers: new Headers({
             'x-doc-token': this.content.token,
             'Content-Type': "text/plain",
            }),
            body: base64
        });

        return base64;		
    }
}

customElements.define("vx-viewer", VxViewer);

