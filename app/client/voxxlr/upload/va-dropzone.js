class VxUpload
{
    constructor(key)
    {
        this.key = key;
    }

    async file(id, path, file, progressCb)
    {
        this.progressCb = progressCb;
        return new Promise((resolve, reject)=>
        {
            let xhr = new XMLHttpRequest();
            xhr.open("POST", `${window.app_domain}/voxxlr/upload/file/${id}`, true);
            xhr.setRequestHeader("Content-Type", "application/json");
            xhr.setRequestHeader('x-api-key', this.key);
            xhr.onload = (e) =>
            {
                //
                // perform a resumable upload to Google Cloud Storage. This is explained in more detail by Google Cloud docs
                //
                
                // Send the initial POST to Google Cloud Storage. This will rertun a url to be used in a subsequent PUT call
                this.xhr = new XMLHttpRequest();
                this.xhr.onload = (e) =>
                {
                    // url for the PUT
                    this.url = e.target.getResponseHeader("Location");
                    
                    console.log("Requesting upload (PUT) " + (this.current.size - 1) + "/" + this.current.size);
                    this.xhr = new XMLHttpRequest();
                    this.xhr.onload = this._onLoad.bind(this, resolve, reject);
                    // listen to errors to schedule a resume if possible
                    this.xhr.onerror = this._onError.bind(this, resolve, reject); 
                    if (this.progressCb)
                    {
                        this.xhr.upload.onprogress = (event) =>
                        {
                            this.progressCb((event.loaded+this.uploadOffset)/this.current.size);
                        };
                    }
                    this.xhr.open("PUT", this.url, true);
                    this.xhr.setRequestHeader("Content-Type", "application/octet-stream");
                    this.xhr.setRequestHeader('Content-Range', "bytes " + 0 + "-" + (this.current.size - 1) + "/" + this.current.size);
                    this.xhr.send(this.current);
                };
                
                console.log("Initiating upload (POST)");
                // e.currentTarget.responseText contains the upload url return by /voxxlr/upload/file
                this.xhr.open("POST", e.currentTarget.responseText, true);
                this.xhr.setRequestHeader("Content-Type", "application/octet-stream");
                this.xhr.setRequestHeader("x-goog-resumable", "start");
                this.xhr.send();
            };
        
            this.current = file;
            this.uploadOffset = 0;
            this.interval = 1000;
            xhr.send(JSON.stringify({ id, path }));
        });		
    }

    abort()
    {
        if (this.xhr)
        {
            this.xhr.abort();
            delete this.xhr;
        }
    }
    
    _onLoad(resolve, reject, e)
    {
        resolve();
    }
    
    _onError(resolve, reject, e)
    {
        console.log("Upload Error - " + this.xhr.readyState + "        " + this.xhr.status);
        switch (this.xhr.status)
        {
            default:
            case 500:
            case 502:
            case 503:
            case 504:
                setTimeout(() =>
                {
                    this._resumeFile(resolve, reject);
                }, this.interval);
                console.log("Rescheduling upload in " + this.interval + " ms");
                this.interval = Math.min(this.interval + 1000, 120000); 
            break;
            case 404:
                reject(this.xhr.status);
            break;
        }
    }
    
    //
    // 4) resume the file upload
    //
    // Resuming an upload requires two PUT calls to the upload url. The first determines how much of the file has 
    // arrived in the storage bucket and the seconds resumes the upload. This is fully described in the Google Cloud storage docs.
    // The key thing to note is that the request headers are slightly different in the first and second calls. 
    
    _resumeFile(resolve, reject)
    {
        console.log("Requesting upload resume bytes */" + this.current.size);
        
        //
        //get # of bytes already uploaded
        this.xhr = new XMLHttpRequest();
        this.xhr.onload = (e) =>
        {
            var range = this.xhr.getResponseHeader("Range");
            console.log("Range header = " + range);
            if (range) 
            {
                this.uploadOffset = parseInt(range.match(/\d+/g).pop(), 10) + 1;
            }
            else
            {
                this.uploadOffset = 0;
            }
            console.log("Resuming upload from " + this.uploadOffset);
    
            this.xhr = new XMLHttpRequest();
            this.xhr.onload = this._onLoad.bind(this, resolve, reject);
            this.xhr.onerror = this._onError.bind(this, resolve, reject);
            if (this.progressCb)
            {
                this.xhr.upload.onprogress = (event) =>
                {
                    this.progressCb((event.loaded+this.uploadOffset)/this.current.size);
                };
            }
            this.xhr.open("PUT", this.url, true);
            this.xhr.setRequestHeader("Content-Type", "application/octet-stream");
            this.xhr.setRequestHeader('Content-Range', "bytes " + this.uploadOffset + "-" + (this.current.size - 1) + "/" + this.current.size);
            
            var method;
            if ('mozSlice' in this.current) 
            {
                method = 'mozSlice';
            }
            else if ('webkitSlice' in this.current) 
            {
                method = 'webkitSlice';
            }
            else 
            {
                method = 'slice';
            }
            
            this.xhr.send(this.current[method](this.uploadOffset, this.current.size));
        };
        
        this.xhr.open("PUT", this.url, true);
        this.xhr.setRequestHeader('Content-Range', "bytes */" + this.current.size);
        this.xhr.onerror = this._onError.bind(this);
        this.xhr.send();
    }	
}

class VaDropZone extends HTMLElement 
{
    static get observedAttributes() 
    {
        return ['title', 'message', 'dataset'];
    }

    constructor(types) 
    {
        super();

        this.dom = this.attachShadow({ mode: 'open' });

        this.dom.innerHTML = `
    
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css">
            <link rel="stylesheet" href="${window.app_domain}/ui.css">

            <style>
            
                :host
                {
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    justify-content: stretch;
                    cursor: pointer;
                    padding: 1em;
                }
                :host-context([hidden]) { display: none; }
                                
                :host-context([waiting]) { border: 3px solid var(--primary); background-color: var(--primary-transparent); }
                :host-context([ready]) { border: 3px solid #00aa00; ; background-color: #00aa0033;}
                :host-context([uploading]) { border: 3px solid #aaaaaa;  ; background-color: #aaaaaa33;}
                :host-context([error]) { border: 3px solid #ff0000; ; background-color: #ff000033; }
  
                header
                {
                    display:flex;
                    align-items: center;
                    width: 100%;
                }

                header i
                {
                    opacity: 0.6;
                    margin-right: 1em;
                }

                header div.title { flex-grow: 2; }

                header div.title > span
                {
                    font-style: italic;
                    font-weight: bold;
                    float: right;
                }


                main
                {
                    flex: 1;
                    overflow-y: auto;
                    display: flex;
                    flex-direction:column;
                    justify-content: stretch;
                    margin-top: 2em;
                }


                footer
                {
                }

                .entry
                {
                    display: flex;
                    align-items: center;
                    margin: 0.1em 0em 0.8em 0em;
                }

                .spinner
                {
                    position: relative;
                    width: 1em;
                    height: 1em;
                    display: none;
                }

                .spinner div
                {
                    box-sizing: border-box;
                    display: block;
                    position: absolute;
                    width: 1.3em;
                    height: 1.3em;
                    border: 0.3em solid;
                    border-radius: 50%;
                    animation: spinner 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
                }

                .spinner div:nth-child(1) { animation-delay: -0.45s; }
                .spinner div:nth-child(2) { animation-delay: -0.3s; }
                .spinner div:nth-child(3) { animation-delay: -0.15s; }
                @keyframes spinner { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

                .entry[loading] .spinner { display: inline-block; }
                .entry[loading] .spinner div { border-color: var(--primary) transparent transparent transparent;  }

                .action
                {
                    position: relative;
                    height: 1.3em;
                    width: 1.3em;
                }

                .action > i { display: inline-block; }
                .entry[uploaded] .action > i {  color: var(--primary);; }
                .entry[waiting] .action > i {  color: var(--border); }
                .entry[loading] .action > i { display: none; }

                .file
                {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    justify-content: stretch;
                    margin-left: 0.8em;
                }

                .file > progress
                {
                    position: relative;
                    flex:1;
                }

                .file .progressbar { height: 0.5em; }

                .entry[loading] .file .progressbar { background-color: var(--primary); }
                .entry[waiting] .file .progressbar { background-color: var(--border); }
                .entry[uploaded] .file .progressbar { background-color: var(--primary); }

            </style>
                
            <header>
                <i class="fas fa-2x fa-paperclip"></i>
                <div class="ext">
                    <span></span>
                </div>
                <div class="title">
                    <span></span>
                </div>
            </header>
            
            <main></main>

            <footer>
                <span class="msg"></span>
            </footer>

            <template>
               <div class="entry">
                    <div class="action">
                        <div class="spinner"><div></div><div></div><div></div><div></div></div>
                        <i class="fas fa-trash"></i>
                    </div>
                    <div class="file">
                        <span></span>
                        <div class="progress">
                            <div class="progressbar"></div>
                        </div>
                    </div>
                </div>
            </template>

            <ui-modal close hidden>
                
            <ui-modal>
        `;

        this.status = this.dom.querySelector(':host > div');
        this.message = this.dom.querySelector("span.msg");
        this.icon = this.dom.querySelector("header > i");
        this.main = this.dom.querySelector("main");

        this.dom.addEventListener("dragover", async (event) =>
        {
            event.preventDefault();
            event.stopPropagation();
        });

        this.dom.addEventListener("drop", async (e) =>
        {
            e.stopPropagation();
            e.preventDefault();

            let files = [];

            var items = e.dataTransfer.items;
            let promises = [];
            for (var i = 0; i < items.length; i++) 
            {
                var item = items[i].webkitGetAsEntry();
                if (item) 
                {
                    promises.push(this._traverseItem(item, files));
                }
            }

            await Promise.all(promises).catch(err => 
            {
                this.message.textContent = err;
            });

            this._filter(files);
            this._createIcons(files, "waiting")

            if (files.length && !this.upload)
            {
                this.dispatchEvent(new CustomEvent("upload-start", {}));
                this.icon.setAttribute("class", "fas fa-2x fa-upload");
                this.upload = new VxUpload(this.getAttribute("key"));

                let entry = this.main.querySelector("div[waiting]"); 
                while (entry)
                {
                    entry.toggleAttribute("waiting", false)
                    entry.toggleAttribute("loading", true)
                    await this.upload.file(this.getAttribute("dataset"), entry.file.path, entry.file.file, (p) =>
                    {
                        let progress = entry.querySelector('.progress');
                        progress.style.width = `${(100 * p).toFixed(1)}%`
                    })  
                    this.dispatchEvent(new CustomEvent("upload-end", { detail: entry }));
                    entry.toggleAttribute("loading", false)
                    entry.toggleAttribute("uploaded", true)
                    entry = this.main.querySelector("div[waiting]");
                }

                delete this.upload;
                this.icon.setAttribute("class", "fas fa-2x fa-paperclip");
                this.dispatchEvent(new CustomEvent("update-status", { detail: { valid: this.isValid() } }));
            }
        });

        this.types = types;
        this.dom.querySelector(".ext > span").textContent = this.types.join(",");
    }

    attributeChangedCallback(name, oldValue, newValue)
    {
        if (name == "title")
        {
            this.dom.querySelector("header > div.title span").textContent = newValue;
        }
        else if (name == "dataset")
        {
            while (this.main.firstElementChild)
            {
                this.main.firstElementChild.remove();
            }
            if (this.upload)
            {
                this.upload.abort();
                delete this.upload;
            }

            this.message.textContent = "drop file";
            this.icon.setAttribute("class", "fas fa-2x fa-paperclip");

            fetch(`/voxxlr/upload/dataset/${newValue}`,
            {
                method: 'GET',
                headers: new Headers({
                    'x-api-key': this.getAttribute("key")
                })
            }).then(async (response) => 
            {
                if (response.ok)
                {
                    this._createIcons(await response.json(), "uploaded");
                    this.dispatchEvent(new CustomEvent("update-status", { detail: { valid: this.isValid() } }));
                }
            });
        }
    }

    getConfig()
    {
        return { id: this.getAttribute("dataset") };
    }

    _createLine(file, state)
    {
        let template = this.dom.querySelector("template")

        let fragment = template.content.cloneNode(true);
        let entry = fragment.querySelector("div");
        entry.toggleAttribute(state, true)
        let span = entry.querySelector("span");
        span.textContent = file.path;
        let progress = entry.querySelector("div.progress");
        if (state == "uploaded")
        {
            progress.style.width = "100%"
        }
        else
        {
            progress.style.width = "0%"
        }
        let deleteBtn = entry.querySelector("i.fa-trash");
        deleteBtn.addEventListener("click", event =>
        {
            let entry = event.currentTarget.closest(".entry");
            if (entry.hasAttribute("uploaded"))
            {
                fetch(`/voxxlr/upload/file/${this.getAttribute("dataset")}`,
                {
                    method: 'DELETE',
                    headers: new Headers({
                        'x-api-key': this.getAttribute("key"),
                        'Content-Type': "application/json"
                    }),
                    body: JSON.stringify({ file: entry.querySelector(".file > span").textContent })
                });
            }
            entry.remove();
        })

        entry.file = file;
        return entry;
    }

    _createIcons(files, state)
    {
        files.forEach(file =>
        {
            if (!file.path.endsWith("process.yaml") && !file.path.endsWith("process.py"))
            {
                this.main.appendChild(this._createLine(file, state));
            }
        });
    }

    _traverseItem(entry, files) 
    {
        if (entry.isFile)
        {
            return new Promise(resolve =>
            {
                entry.file(file =>
                {
                    var ext = file.name.substring(file.name.lastIndexOf('.') + 1).toLowerCase();

                    if (this.types.includes(ext))
                    {
                        let path = entry.fullPath;
                        if (path[0] === '/')
                        {
                            path = path.substring(1);
                        }
                        //path = encodeURIComponent(path);

                        files.push({ path, file, ext });
                    }
                    resolve();
                });
            });
        }
        else
        {
            var dirReader = entry.createReader();
            return new Promise((resolve, reject) => 
            {
                var iteration_attempts = [];
                let read_entries = () => 
                {
                    dirReader.readEntries((entries) => 
                    {
                        if (files.length < 201)
                        {
                            if (!entries.length) 
                            {
                                resolve(Promise.all(iteration_attempts));
                            }
                            else 
                            {
                                iteration_attempts.push(Promise.all(entries.map(entry =>
                                {
                                    return this._traverseItem(entry, files);
                                })));

                                read_entries();
                            }
                        }
                        else
                        {
                            reject("too many files");
                        }
                    }, function () { console.log("big error"); });
                };
                read_entries();
            });
        };
    };
}

customElements.define("va-dropzone", VaDropZone);



class VaPointCloudZone extends VaDropZone
{
    constructor() 
    {
        super(["e57", "las", "laz", "pts", "ply"]);
    }

    _filter(files)
    {
    };

    isValid()
    {
        return this.main.firstElementChild != null;
    }
}

customElements.define("va-pointcloud-zone", VaPointCloudZone);



class VaModelZone extends VaDropZone
{
    constructor() 
    {
        super(["ifc", "gltf", "bin", "jpg", "bmp", "gif", "jpeg", "png"]);
    }

    _filter(files)
    {
 
    };

    isValid()
    {
        let count =
        {
            gltf: 0,
            ifc: 0,
            bin: 0
        }

        for (var i = 0; i < this.main.children.length; i++) 
        {
            let entry = this.main.children[i];

            let ext = entry.file.path.substring(entry.file.path.lastIndexOf('.') + 1).toLowerCase();

            if (ext == "gltf")
            {
                count.gltf++;
            }
            else if (ext == "bin")
            {
                count.bin++;
            }
            else if (ext == "ifc")
            {
                count.ifc++;
            }
        }


        if (count.gltf == 1 && count.bin == 0)
        {
            this.setAttribute("message", `Missing .bin file`);
            return false;
        }
        else if (count.bin == 1 && count.gltf == 0)
        {
            this.setAttribute("message", `Missing .gltf file`);
            return false;
        }
        else if (count.gltf == 0 && count.ifc == 0)
        {
            this.setAttribute("message", `No .ifc or .gltf file`);
            return false;
        }

        return true;
    }

    isValid()
    {
        return this.main.firstElementChild != null;
    }
}

customElements.define("va-model-zone", VaModelZone);



class VaMapZone extends VaDropZone
{
    constructor() 
    {
        super(["tif", "tiff"]);

        this.template = document.createElement('template');
        this.template.innerHTML = `<div><ui-selection-list single required><button class="vx-secondary" name="elevation">elevation</button><button class="vx-secondary" name="color">color</button></ui-selection-list></div>`;

        this.addEventListener("upload-end", (event) =>
        {
            let buttons = this.template.content.cloneNode(true);
            buttons.querySelector("ui-selection-list").addEventListener("change", this._updateType.bind(this));
            buttons.querySelector(`[name=color`).toggleAttribute("active", true);
            event.detail.querySelector("div.file").appendChild(buttons);
            super.dispatchEvent(new CustomEvent("file-meta", { bubbles: true, detail: { path: event.detail.file.path, value: { type: 'color' } } }));
        })
    }

    _filter(files)
    {
        if (this.main.childElementCount + files.length > 2)
        {
            files.splice(0, files.length);

            let dialog = this.dom.querySelector("ui-modal");
            dialog.innerHTML = "Only 2 maps supported... contact info@voxxlr.com"
            dialog.hidden = false;
        }
    }

    _createLine(file, state)
    {
        let div = super._createLine(file, state);

        if (state == "uploaded")
        {
            let buttons = this.template.content.cloneNode(true);
            buttons.querySelector("ui-selection-list").addEventListener("change", this._updateType.bind(this));
            buttons.querySelector(`button[name="${file.meta.type}"]`).toggleAttribute("active", true);
            div.querySelector("div.file").appendChild(buttons);

        }

        return div;
    }

    _updateType(event)
    {
        let mapType = event.currentTarget.querySelector("[active]").getAttribute("name")

        let entry = event.currentTarget.closest("div.file")
        let path = entry.querySelector("span").textContent;
        super.dispatchEvent(new CustomEvent("file-meta", { bubbles: true, detail: { path, value: { type: mapType } } }));
    }

    isValid()
    {
        return this.main.firstElementChild != null;
    }
}

customElements.define("va-map-zone", VaMapZone);



class VaPanoramaZone extends VaDropZone
{
    constructor() 
    {
        super(["jpg", "jpeg"]);
    }


    _filter(files)
    {
    }

    isValid()
    {
        return this.main.firstElementChild != null;
    }
}

customElements.define("va-panorama-zone", VaPanoramaZone);


//title = "Equirectangular 360 Image"
//title = "Color map in UTM format"
//title = "Elevation map in UTM format"
//title = "Single file or directory tree"
// title="Single point cloud file"