class VxFile extends HTMLElement 
{
    constructor()
    {
        super();
        
        this.dom = this.attachShadow({mode: 'open'});
        
        this.dom.innerHTML = `

            <style>
            
                :host
                {
                    align-items: center;
                    justify-content: center;
                    box-sizing: border-box;
                }

            
            </style>

            <slot></slot>

            `;		
        
        this.disabled = false;
        
        this.addEventListener("dragenter", (e) =>
        {
            e.stopPropagation();
            e.preventDefault();
            return !this.disabled;
        })
        
        this.addEventListener("dragover", (e) =>
        { 
            e.stopPropagation();
            e.preventDefault();
            return !this.disabled;
        })
        
        this.addEventListener("dragleave", (e) =>
        { 
            e.stopPropagation();
            e.preventDefault();
            return !this.disabled;
        })
    
        this.addEventListener("drop", (e) =>
        {
            let promises = [];
            let files = [];
            let types = this.getAttribute("ext").split(",");
            var items = e.dataTransfer.items;
            for (var i=0; i<items.length; i++) 
            {
                var item = items[i].webkitGetAsEntry();
                if (item) 
                {
                    if (item.isFile)
                    {
                        promises.push(new Promise((resolve)=>
                        {
                            item.file((file)=> 
                            {
                                var ext = file.name.substring(file.name.lastIndexOf('.')+1);
                                if (types.includes(ext))
                                {
                                    files.push(file);
                                }
                                resolve();
                            });                            		
                        }));
                    };
                }
            }  		
            
            Promise.all(promises).then(async () => 
            {
                let slot = this.dom.querySelector("slot");
                slot.toggleAttribute("disabled", true);
                
                this.dispatchEvent(new CustomEvent('upload-start', {}));
        
                for (var i=0; i<files.length; i++)
                {
                    this.dispatchEvent(new CustomEvent('item-start', {
                        bubbles: true,
                        composed: true,
                        detail: files[i]
                    }));					
                    
                    this.path = this.getAttribute("path").replace(/^\/|\/$/g, '');
                    if (this.hasAttribute("name"))
                    {
                        this.path += this.getAttribute("name");
                    }
                    else
                    {
                        this.path += "/"+files[i].name.replace(/ /g,"_");
                    }
                    
                    this.dispatchEvent(new CustomEvent('item-progress', { detail: 0}));

                    await this.upload(files[i]);
                }
                
                this.dispatchEvent(new CustomEvent('upload-end', {}));
            });
            
            e.stopPropagation();
            e.preventDefault();
        });	  	
    }
    
    
    attach(viewer)
    {
        this.viewer = viewer;
        
        this.viewer.on("viewer.load",  (document) => 
        { 
            this.token = document.token;
        })		
    }
    

    upload(file)
    {
        return new Promise((resolve, reject)=>
        {
            let xhr = new XMLHttpRequest();
            xhr.open("POST", `${window.doc_domain}/file/`+this.path, true);
            xhr.setRequestHeader("Content-Type", "application/json");
            xhr.setRequestHeader('x-doc-token', this.getAttribute("token"));
            xhr.onload = (e) =>
            {
                if (e.target.status == 200)
                {
                    this.xhr = new XMLHttpRequest();
                    this.xhr.onload = (e) =>
                    {
                        this.url = e.target.getResponseHeader("Location");
                        
                        // do put
                        this.xhr = new XMLHttpRequest();
                        this.xhr.onload = this.onLoad.bind(this, resolve, reject);
                        this.xhr.onerror = this.onError.bind(this, resolve, reject);
                        this.xhr.upload.onprogress = this.onProgress.bind(this);
                        this.xhr.open("PUT", this.url, true);
                        this.xhr.setRequestHeader("Content-Type", "application/octet-stream");
                        this.xhr.setRequestHeader('Content-Range', "bytes " + 0 + "-" + (this.contentlength - 1) + "/" + this.contentlength);
                        this.xhr.send(this.content);
                    };
                    
                    this.xhr.open("POST", e.currentTarget.responseText);
                    this.xhr.setRequestHeader("Content-Type", "application/octet-stream");
                    this.xhr.setRequestHeader("x-goog-resumable", "start");
                    this.xhr.send();
                }
                else
                {
                    reject(e.target.status);
                }
            };
            
            this.content = file;
            this.contentlength = file.size;
            this.uploadOffset = 0;
            this.interval = 1000;
            
            xhr.send();
        });
    }

    resumeFile(resolve, reject)
    {
        this.xhr = new XMLHttpRequest();
        this.xhr.onload = (e) =>
        {
            var range = this.xhr.getResponseHeader("Range");
            if (range) 
            {
                this.uploadOffset = parseInt(range.match(/\d+/g).pop(), 10) + 1;
            }
            else
            {
                this.uploadOffset = 0;
            }

            this.xhr = new XMLHttpRequest();
            this.xhr.onload = this.onLoad.bind(this, resolve, reject);
            this.xhr.onerror = this.onError.bind(this, resolve, reject);
            this.xhr.upload.onprogress = this.onProgress.bind(this);
            this.xhr.open("PUT", this.url, true);
            this.xhr.setRequestHeader("Content-Type", "application/octet-stream");
            this.xhr.setRequestHeader('Content-Range', "bytes " + this.uploadOffset + "-" + (this.contentlength - 1) + "/" + this.contentlength);
            
            var method;
            if ('mozSlice' in this.content) 
            {
                method = 'mozSlice';
            }
            else if ('webkitSlice' in this.content) 
            {
                method = 'webkitSlice';
            }
            else 
            {
                method = 'slice';
            }
            
            this.xhr.send(this.content[method](this.uploadOffset, this.contentlength));
        };
        
        this.xhr.open("PUT", this.url, true);
        this.xhr.setRequestHeader('Content-Range', "bytes */" + this.contentlength);
        this.xhr.onerror = this.onError.bind(this, resolve, reject);
        this.xhr.send();
    }

    rescheduleFile(resolve, reject)
    {
        setTimeout(() =>
        {
            this.resumeFile(resolve, reject);
            
        }, this.interval);
        
        this.interval = Math.min(this.interval + 1000, 120000); 
    }

    cancel(files, config)
    {
        if (this.xhr != null)
        {
            this.xhr.abort();
            this.xhr = null;
        }
    }

    //
    // Xhr callbacks
    //
    onProgress(e)
    {
        this.dispatchEvent(new CustomEvent('item-progress', { detail: (e.loaded+this.uploadOffset)/this.contentlength }));
    }

    onLoad(resolve, reject, e)
    {
        this.dispatchEvent(new CustomEvent('item-done', { bubbles: true, detail: this.path }));
        resolve();
    }

    onError(resolve, reject, e)
    {
        switch (this.xhr.status)
        {
            default:
            case 500:
            case 502:
            case 503:
            case 504:
                this.rescheduleFile(resolve, reject);	
            break;
            case 404:
                reject(this.xhr.status)
            break;
        }
    }
}

customElements.define("vx-file", VxFile);
