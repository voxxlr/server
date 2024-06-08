class VaLink extends HTMLElement
{
    constructor() 
    {
        super();
        
        this.dom = this.attachShadow({mode: 'open'});
        this.dom.innerHTML = `
        
            <link rel="stylesheet" href="${window.app_domain}/ui.css">
            <style>
            
                :host
                {
                    display: flex; 
                    flex-direction: column;
                }

                .permission
                {
                    display: flex;
                    margin-top: 1em;
                    margin-bottom: 2em;
                }

                .tags
                {
                    display: flex;
                    margin-top: 1em;
                }
                .tags > input { margin-right: 1em; }

                .document
                {
                    position: relative;
                    height: 12em;
                }

                .document > img
                {
                    position: absolute;
                    display: block;
                    top: 0;
                    left: 0;
                    margin: 0px;
                    padding: 0px;
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .document > .header
                {
                    position: absolute;
                    width: 100%;
                    top: 0;
                    left: 0;
                    z-index: 9;
                    display: flex;
                    background-color: var(--border-transparent);
                    padding: 0.3em;
                    box-sizing: border-box;
                }

                .document > .header > input
                {
                    padding-left: 0.3em;
                    padding-top: 0.3em;
                }
                .document > .header > span
                {
                    text-align: center;
                    vertical-align: middle;
                    margin-left: 1em;
                }
                  
                vx-dataset-info { position:absolute; bottom:0; }				

            </style>

            <div class="permission">
                <ui-selection-list single required>
                    <button id="W" class="vx-primary" active>Full Access</button>
                    <button id="R" class="vx-primary">Read Only</button>
                </ui-selection-list>
                <input type="text" required="" placeholder="Enter password ..." name='password'>
            </div>
            <div class="document">
                <div class="header">
                    <span>Open link with:</span>
                </div>
                <img src="${window.app_domain}/images/camera.webp">
            </div>
            <div class="tags">
                <ui-tag-list tags="">
                    <ui-tag-input placeholder="tags..." type="text" ></ui-tag-input>
                </ui-tag-list>
            </div>
        `;

        this.tagsList = this.dom.querySelector("ui-tag-list");
        this.tagsList.addEventListener("tags-changed", event =>
        {
            let tags = event.currentTarget.get();
            this.key.data.tags = tags;
            this.saveKey()
        })

        this.pwdInput = this.dom.querySelector("input[name='password']");
        this.pwdInput.addEventListener("focusout", (event) =>
        {
            let password = event.currentTarget.value;
            if (password.length > 0)
            {
                this.link.password = password;
            }
            else
            {
                this.link.password = null;
            }
            this.saveLink();
        });


        this.documentImg = this.dom.querySelector("img");
        this.documentImg.onerror = () =>
        {
            this.documentImg.src = `${window.app_domain}/images/camera.webp`;
        }

        this.perm = this.dom.querySelector("ui-selection-list");
        this.perm.addEventListener("down", event =>
        {
            this.key.permission = event.detail.id;
            this.saveKey()
        });

        window.addEventListener("message", async (event) =>
        {
            if (event.data.action == "dataset-load")
            {
                let dataset = event.data.dataset;
                this.documentImg.src = dataset.files["preview.jpg"];
            }
        });
    }

    connectedCallback()
    {
        fetch(`${window.app_domain}/manifest`,
        {
            method: 'GET'
        }).then(async (response) => {

            let manifest = await response.json();
            this.apps = manifest.apps;
        });
    }
    saveKey()
    {
        fetch(`${window.doc_domain}/key/${this.link.key}`,
        { 
            method: 'PUT', 
            headers: new Headers({
             'x-account-token': this.getAttribute("token"), 
             'Content-Type': "application/json"
            }),
            body: JSON.stringify(this.key)
        }); 
    }

    saveLink()
    {
        fetch(`${window.app_domain}/link/${this.id}`,
        {
            method: 'PUT',
            headers: new Headers({
                'x-account-token': this.getAttribute("token"),
                'Content-Type': "application/json"
            }),
            body: JSON.stringify(this.link)
        });
    }

    setLink(id, link)
    {
        this.id = id;
        this.link = link;

        // display password
        if (this.link.password)
        {
            this.pwdInput.value = this.link.password;
        }
        else
        {
            this.pwdInput.value = "";
        }

        fetch(`${window.doc_domain}/key/${link.key}`,
        {
            headers: new Headers({ 'x-account-token': this.getAttribute("token") }),

        }).then(async (response) =>
        {
            this.key = await response.json();

            let manifest = this.apps[this.link.app];

            // display permissions
            this.dom.getElementById("W").toggleAttribute("active", this.key.permission === "W");
            this.dom.getElementById("R").toggleAttribute("active", this.key.permission === "R");

            // display selected document
            this.documentImg.parentElement.hidden = !manifest.document;
            if (manifest.document && this.key.data.id)
            {
                fetch(`${window.doc_domain}/token/${this.key.data.id}`,
                {
                    headers: new Headers({ 'x-api-key': link.key }),
                }).then(async (response) =>
                {
                    let token = await response.text();
                    if (response.ok)
                    {
                        fetch(`${window.doc_domain}/file/preview.jpg`,
                        {
                            headers: new Headers({ 'x-doc-token': token }),
                        }).then(async (response) =>
                        {
                            let files = await response.json();
                            if (files.length)
                            {
                                this.documentImg.src = files[0].url;
                            }
                        });
                    }
                    else if (response.status == 410)
                    {
                        this.documentImg.src = `${window.app_domain}/images/deleted.webp`;
                    }
                });
            }
            else
            {
                this.documentImg.src = `${window.app_domain}/images/camera.webp`;
            }

            // display tags
            this.tagsList.hidden = !manifest.tags;
            if (manifest.tags)
            {
                if (this.key.data.hasOwnProperty("tags"))
                {
                    this.tagsList.setAttribute("tags", this.key.data.tags.join(",") || "");
                }
                else
                {
                    this.dom.querySelector("ui-tag-list").setAttribute("tags", "");
                }
            }
        });
    }
    
    async deleteLink(key)
    {
        this.perm.toggleAttribute("disabled", true);

        return fetch(`${window.doc_domain}/key/${key}`,
        { 
            method: 'DELETE',
            headers: new Headers({
             'x-account-token': this.getAttribute("token"), 
            })
        });
    }

    clrLink()
    {	
        delete this.key;
        delete this.link;

        this.documentImg.src = `${window.app_domain}/images/camera.webp`;
        this.dom.querySelector("ui-tag-list").setAttribute("tags", "");
    }

}

customElements.define("va-link", VaLink);






class VaLinkList extends HTMLElement
{
    static get observedAttributes() 
    {
        return ['app'];
    }

    constructor() 
    {
        super();

        this.dom = this.attachShadow({ mode: 'open' });

        this.dom.innerHTML = `

            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css" >
            <link rel="stylesheet" href="${window.app_domain}/ui.css">
        
            <style>
            
                :host
                {
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }
                
                header
                {
                    display: flex;
                    align-items: center;
                    margin-top: 0.3em;
                }
                main
                {
                    margin-top: 1em;
                    overflow-y: auto;
                    flex: 1;
                }
                
                #create span { line-height: 2em }

                .link
                {
                    flex: 1;					
                    position: relative;
                    background-color: var(--primary-transparent);
                    border: 1px solid var(--border);
                    border-radius: 6px;
                    padding: 0.5em;
                    margin-left: 1em;
                    width: 30em;
                }

                .link > span
                {
                    white-space: nowrap;
                    height: 1.4em;
                    font-size: 1.2em;
                }
                
                .link > i 
                { 
                    color: var(--primary);
                    float: right;
                }
                    
                table
                {
                     display: block;
                    border-collapse: collapse;
                    white-space: nowrap;
                    overflow-y: auto;
                } 
                tr[selected] { background-color: var(--selected); }
                
                th
                {
                    border-top: 1px solid rgba(0,0,0,.12);
                    border-bottom: 1px solid rgba(0,0,0,.12);
                    padding: 4px 4px 4px 4px;
                    box-sizing: border-box;
                    white-space: nowrap;
                    overflow: hidden;
                    font-weight: 700;
                    letter-spacing: 0;
                    font-size: 0.9em;
                    box-sizing: border-box;
                    text-align: left;				
                    color: rgba(0,0,0,.54);
                }
                th:nth-of-type(2) {  width: 100%; }
                th:nth-of-type(4) { text-align: right; }

                td 
                {
                    border-top: 1px solid rgba(0,0,0,.12);
                    border-bottom: 1px solid rgba(0,0,0,.12);
                    padding: 4px 4px 4px 4px;
                    box-sizing: border-box;
                    white-space: nowrap;
                    overflow: hidden;
                    color: rgba(0,0,0,.54);
                }				
                td:nth-of-type(2) {  
                
                    text-overflow: ellipsis;
                    letter-spacing: 0;
                    font-size: 12px;
                    box-sizing: border-box;
                    text-align: left;				
                    width: 100%;
                }
                td:nth-of-type(4) { text-align: right; }
                    
                tr.invalid { background-color: var(--severe)}			
     

            </style>

            <template>
                <tr>
                    <td><input type='checkbox'/></td>
                    <td contenteditable='true'></td>
                    <td></td>
                    <td></td>
                    <td></td>
                </tr> 
            </template>

            <header>
                <button id="create" class="vx-tool vx-secondary"><i></i>
                    <span>Create Link</span>
                </button>
                <div class="link">
                    <span></span>
                    <i class="fas fa-copy"></i>
                    <ui-tooltip hidden>
                        <p>Click to copy the App link</p>
                    </ui-tooltip>
                </div>
            </header>
                
            <main>
                <table >
                    <thead>
                        <tr>
                            <th>
                                <input type="checkbox" disabled>
                            </th>											
                            <th>Name</th>
                            <th>App</th>
                            <th>Views</th>
                            <th>
                                <ui-selection-list spring>
                                    <button disabled class="vx-secondary" hidden><i class="fas fa-eye"></i></button>
                                    <button disabled class="vx-secondary"><i class="fas fa-trash"></i></button>
                                </ui-selection-list>
                            </th>
                        </tr>
                    </thead>
                    <tbody class="list">
                    </tbody>
                </table>
            </main>

            `;

        //
        // create
        //

        this.link = this.dom.querySelector(".link");
        this.link.addEventListener('click', () => { navigator.clipboard.writeText(this.link.querySelector("span").textContent) });

        this.dom.getElementById("create").addEventListener("click", async (event) =>
        {
            let key = { data: { tags: [] }, permission: "W", name: "link" }
            if (this.currentDataset)
            {
                key.data.id = this.currentDataset.id;
            }

            await fetch(`${window.doc_domain}/key`,
            {
                method: 'POST',
                headers: new Headers({
                    'x-account-token': this.getAttribute("token"),
                    'Content-Type': "application/json"
                }),
                body: JSON.stringify(key)

            }).then(async (response) =>
            {
                let key = await response.text();

                await fetch(`${window.app_domain}/link`,
                {
                    method: 'POST',
                    headers: new Headers({
                        'x-account-token': this.getAttribute("token"),
                        'Content-Type': "application/json"
                    }),
                    body: JSON.stringify({ app: this.getAttribute("app"), key, auth: {}, name: "link name" })
                }).then(async (response) => 
                {
                    let link = await response.json();
                    for (var id in link)
                    {
                        let tr = this.createRow(id, link[id]);
                        tr.dispatchEvent(new CustomEvent("click"));
                    }
                });
            });
        });

        //
        // table
        //
        this.table = this.dom.querySelector("table");
        this.template = this.dom.querySelector("template");

        this.selectAll = this.table.querySelector('th input[type=checkbox]');
        this.selectAll.addEventListener('change', (event) => 
        {
            if (event.target.checked) 
            {
                this.table.querySelectorAll('tbody tr').forEach(row =>
                {
                    row.querySelector('input').checked = true;
                });
                this.delete.disabled = false;
            }
            else 
            {
                this.dom.querySelectorAll('tbody input').forEach((value) =>
                {
                    value.checked = false;
                });
                this.delete.disabled = true;
            }
        });

        this.delete = this.dom.querySelector("th button:nth-child(2)");
        this.delete.addEventListener('click', async () =>
        {
            this.delete.disabled = true;

            let list = this.dom.querySelectorAll("tbody input:checked");
            for (var i = 0; i < list.length; i++)
            {
                var row = list[i].parentNode.parentNode;
                row.remove();
                if (row.hasAttribute("selected"))
                {
                    this.unselectRow(row)
                }

                await fetch(`${window.app_domain}/link/${row.id}`,
                {
                    method: 'DELETE',
                    headers: new Headers({ 'x-account-token': this.getAttribute("token") })
                }).then(async response => 
                {
                    await fetch(`${window.doc_domain}/key/${row.content.key}`,
                    {
                        method: 'DELETE',
                        headers: new Headers({'x-account-token': this.getAttribute("token")})
                    });
                });
            }

            this.selectAll.disabled = this.dom.querySelectorAll("tbody tr").length == 0;
            this.selectAll.checked = false;
        });


        window.addEventListener("message", async (event) =>
        {
            if (event.data.action == "dataset-load")
            {
                this.currentDataset = event.data.dataset;
            }
        });

    }

    connectedCallback()
    {
        fetch(`${window.app_domain}/manifest`,
        {
            method: 'GET'
        }).then(async (response) => {

            let manifest = await response.json();
            this.apps = manifest.apps;

            if (this.hasAttribute("app"))
            {
                let manifest = this.apps[this.getAttribute("app")];
                this.dom.querySelector("#create i").setAttribute("class", `fas fa-2x ${manifest.icon}`);
            }

            fetch(`${window.app_domain}/link`,
            {
                method: 'GET',
                headers: new Headers({
                    'x-account-token': this.getAttribute("token")
                })
            }).then(async (response) => {
                let list = await response.json();
                for (var id in list) {
                    this.createRow(id, list[id]);
                }
            });
        });
    }

    attributeChangedCallback(name, oldValue, newValue)
    {
        if (name == "app")
        {
            if (this.apps)
            {
                let manifest = this.apps[this.getAttribute("app")];
                this.dom.querySelector("#create i").setAttribute("class", `fas fa-2x ${manifest.icon}`);
            }
        }
    }

    createRow(id, item)
    {
        this.selectAll.disabled = false;

        let tr = this.template.content.cloneNode(true).firstElementChild;
        tr.content = item;
        tr.id = id;
        let name = tr.querySelector("td:nth-of-type(2)")
        name.textContent = item.name;
        name.addEventListener("focusout", this.editTitle.bind(this));
        tr.querySelector("td:nth-of-type(4)").textContent = item.views;

        let manifest = this.apps[item.app]
        if (manifest)
        {
            tr.querySelector("td:nth-of-type(3)").textContent = manifest.title;
            tr.addEventListener("click", this.selectRow.bind(this));
        }
        else
        {
            tr.querySelector("td:nth-of-type(3)").textContent = "Invalid App !!";
            tr.classList.add("invalid");
        }

        tr.addEventListener("change", this.selectCheckbox.bind(this));
        this.dom.querySelector('tbody').appendChild(tr);
        return tr;
    };

    editTitle(event)
    {
        var row = event.currentTarget.parentElement;
        if (row.content.name !== event.currentTarget.textContent)
        {
            row.content.name = event.currentTarget.textContent;
            this.saveLink(row.id, row.content);
        }
    };

    selectCheckbox(event)
    {
        this.delete.disabled = this.dom.querySelector('tbody input:checked') == null;
        event.preventDefault();
    }

    saveLink(id, entry)
    {
        fetch(`${window.app_domain}/link/${id}`,
        {
            method: 'PUT',
            headers: new Headers({
                'x-account-token': this.getAttribute("token"),
                'Content-Type': "application/json"
            }),
            body: JSON.stringify(entry)
        });
    }

    async selectRow(event)
    {
        if (!event.currentTarget.hasAttribute("selected"))
        {
            var selected = this.dom.querySelector('tr[selected]');
            if (selected != null)
            {
                selected.toggleAttribute("selected");
            }
            event.currentTarget.toggleAttribute("selected");

            this.link.querySelector("span").textContent = `${window.app_domain}/${event.currentTarget.id}`;

            this.dispatchEvent(new CustomEvent("select-link",
            {
                detail: {
                        id: event.currentTarget.id,
                        content: event.currentTarget.content
                    }
            }));
        }
    };

    async unselectRow(row)
    {
        this.link.querySelector("span").textContent = "";
        this.dispatchEvent(new CustomEvent("unselect-link", { detail: {} }));
        row.toggleAttribute("selected", false);
    }
}

customElements.define("va-link-list", VaLinkList);
