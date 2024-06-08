class Issue extends HTMLElement 
{
    static get observedAttributes() 
    {
        return ['content'];
    }

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
                    display: block;
                    margin-top: 0.5em;
                }
                    
                header
                {
                    padding-left: 0.5em;
                    height: 2em;
                    background-color: var(--hover);	
                }
                header 	span { vertical-align:middle;  }
                                
                p 
                {
                    margin-top: 0; 
                    margin-left: 0.5em; 
                }
                .subject { font-weight: bold;  }
                
                footer
                {
                    color: #777;
                }	
                .assignee { font-style: italic; }
                
                
                i { float: right; }
                i:after
                {
                    vertical-align: middle;
                    position:relative;
                    font-family: "Font Awesome 5 Free";
                    display: inline-block;
                    font-size: 1.3em;
                    margin-top: 0.2em;
                    margin-right: 0.2em
                }

                i.info { color: var(--info); }
                i.warn { color: var(--warn); }
                i.severe { color: var(--severe); }				
                i.resolved { color: var(--resolved); }				

                i.info:after { content: "\\f05a"; }
                i.warn:after { content: "\\f071"; }
                i.severe:after { content: "\\f06a"; }
                i.resolved:after { content: "\\f14a"; }

                :host-context([selected]:hover) i:after
                {
                    content: "\\f142";
                    margin-right: 0.4em;
                }
                
                :host([active]) { border: 2px solid var(--primary) }

            </style>
            
            <header>
                <span class="subject"></span><i class="fas"></i>
            </header>
            <p class="description"></p>
            <footer><p>Assigned to <span class="assignee"></span> on <span class="created"></span></p></footer>
        `;
        
    }
    
    init(id, entry)
    {
        this.dom.querySelector(".subject").textContent = entry.subject;
        this.dom.querySelector(".description").textContent = entry.description;
        
        let assignee = this.dom.querySelector(".assignee");
        switch (entry.assignee)
        {
            case "1":
                assignee.textContent = "Inspector";
                break;
            case "2":
                assignee.textContent = "Contractor";
                break;
            case "3":
                assignee.textContent = "Engineer";
                break;
        }
        this.dom.querySelector(".created").textContent = new Date(parseInt(id)).toLocaleDateString();
        
        let i = this.dom.querySelector("i");
        switch (entry.status)
        {
            case 1: i.classList.add("resolved"); break;
            case 2: i.classList.add("info"); break;
            case 3: i.classList.add("warn"); break;
            case 4: i.classList.add("severe"); break;
        }
        
        i.addEventListener("click", (event)=>
        {
            this.dispatchEvent(new CustomEvent('status-change', { detail: {
                record: this.record,
                pageX: event.pageX,
                pageY: event.pageY
                }, bubbles: true 
            }));
        });
        
        this.id = id;
        this.record = entry;
    }
    
    async setStatus(status, token)
    {
        this.record.status = status;
        
        let i = this.dom.querySelector("i");
        switch (status)
        {
            case 1: i.setAttribute("class",`fas resolved`); break;
            case 2: i.setAttribute("class",`fas info`); break;
            case 3: i.setAttribute("class",`fas warn`); break;
            case 4: i.setAttribute("class",`fas severe`); break;
        }
        
        fetch(`${window.doc_domain}/meta`, 
        { 
            method: 'PATCH', 
            headers: new Headers({
                'x-doc-token': token,
                'Content-Type': "application/json",
            }),
            body: JSON.stringify([{ op: "replace", path: `/issues/${this.id}`, value: this.record }])
        })
    }
}

customElements.define("issue-item", Issue);





class IssueList extends HTMLElement 
{
    static get observedAttributes() 
    {
        return ['token'];
    }

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
                    height: 100%; 
                    display: flex;
                    flex-direction: column
                }
                
                i.info { color: var(--info); }
                i.warn { color: var(--warn); }
                i.severe { color: var(--severe); }				
                i.resolved { color: var(--resolved); }				

                ui-popup i { font-size: 1.5em; }
                ui-popup ui-selection-list { margin-bottom: 0.5em }

                button[name='delete'] { width: 100% }

                ui-selection-list { flex-direction: column; }

            </style>
            
            <ui-selection-list id="list" single vert>
            </ui-selection-list>
            
            <ui-popup id="menu" hidden>
                <ui-selection-list class="vx-bar" single required>
                    <button class="vx-secondary" name="1"><i class="fas fa-check-square resolved"></i></button>
                    <button class="vx-secondary" name="2"><i class="fas fa-info-circle info"></i></button>
                    <button class="vx-secondary" name="3"><i class="fas fa-exclamation-triangle warn"></i></button>
                    <button class="vx-secondary" name="4"><i class="fas fa-exclamation-circle severe"></i></button>
                </ui-selection-list>
                <button name="delete" class="vx-primary">Delete Issue...</button>
            </ui-popup>

        `;
                
        this.popup = this.dom.querySelector("ui-popup");				
        this.template = this.dom.querySelector("template");
        
        this.list = this.dom.querySelector("ui-selection-list");
        this.list.addEventListener("down", event =>
        {
            this.dispatchEvent(new CustomEvent('issue-select', { detail: event.detail.record }));
        });
        this.list.addEventListener("issue-changed", event =>
        {
            // TODO Why does this not bubble up ? this event handler should be unnecessary
            this.dispatchEvent(new CustomEvent("issue-changed", { detail: event.detail, bubbles: true }));
        });
        
        this.level = this.dom.querySelector("ui-popup ui-selection-list")
        this.level.addEventListener("down", async event=>
        {
            let selected = this.list.querySelector("issue-item[selected]");
            selected.setStatus(parseInt(event.detail.getAttribute("name")), this.getAttribute("token"));
            this.popup.close();
            this.dispatchEvent(new CustomEvent("issue-changed", { detail: selected, bubbles: true }));
        });
        
        this.dom.querySelector("ui-popup button[name='delete']").addEventListener("click", async (event)=>
        {
            let selected = this.list.querySelector("issue-item[selected]");
            
            selected.remove();
            this.popup.close();
            
            this.dispatchEvent(new CustomEvent("issue-changed", { detail: selected, bubbles: true }));
            
            fetch(`${window.doc_domain}/meta`, 
            {
                method: 'PATCH',
                headers: new Headers({
                    'x-doc-token': this.getAttribute("token"),
                    'Content-Type': "application/json",
                }),
                body: JSON.stringify([{ op: "remove", path: `/issues/${selected.id}` }])
            })
            
            fetch(`${window.doc_domain}/file/issues/${selected.id}.jpg`, 
            { 
                method: 'DELETE', 
                headers: new Headers({ 'x-doc-token': this.getAttribute("token") })
            })
        });
        
        this.dom.addEventListener("status-change", event=>
        {
            let group = this.popup.querySelector("ui-selection-list");
            group.select(group.querySelector(`button[name='${event.detail.record.status}']`));
            this.popup.open(event.detail.pageX-10, event.detail.pageY-10)
        })
    }
    
    attributeChangedCallback(name, oldValue, newValue)
    {
        if (name == "token")
        {
            while (this.list.firstElementChild)
            {
                this.list.firstElementChild.remove();
            }
                
            fetch(`${window.doc_domain}/meta/issues`, 
            { 
                headers: new Headers({ 'x-doc-token': newValue })
            }).then(async (response) =>
            {
                let list = await response.json();
                for (var id in list)
                {
                    this.add(id, list[id])
                }
            })
        } 
    }
    
    getMaximum()
    {
        let maximum = 1;
        this.list.querySelectorAll("issue-item").forEach(entry=>
        {
            maximum = Math.max(maximum, entry.record.status);
        })
        
        return maximum;
    }
    
    add(id, entry, select)
    {
        let issue = document.createElement("issue-item");
        issue.init(id, entry);
        this.list.insertBefore(issue, this.list.firstElementChild);
    
        if (select)
        {
            this.list.select(issue);			
        }
    }
    
    clear()
    {
        while (this.list.firstElementChild)
        {
            this.list.firstElementChild.remove();
        }
        
        fetch(`${window.doc_domain}/meta`, 
        { 
            method: 'PATCH', 
            headers: new Headers({
             'x-doc-token': this.getAttribute("token"),
            'Content-Type': "application/json"
            }),
            body: JSON.stringify([{ op: "remove", path: "/issues" }])
        })
        
    }
}

customElements.define("issue-list", IssueList);





class IssueForm extends HTMLElement 
{
    static get observedAttributes() 
    {
        return ['image', 'location'];
    }

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
                    display: flex;
                    flex-direction: column;
                    align-items: stretch;
                    z-index: 1;
                }
                
                main
                {
                    display: flex;
                    align-items: stretch;
                }
                
                main > div:nth-of-type(1) 
                { 
                    margin-right: 1em;
                    display: flex;
                    align-items: stretch;
                    flex-direction:column; 
                }

                textarea { margin-top: 1em;}

                img 
                { 
                    height: 65vh;
                    overflow: auto; 
                }
                
                #attachments > div
                {
                    margin-top: 1em;
                    display: flex;
                    flex-direction: column;
                    justify-self: flex-end
                }
                
                ui-panel { position: relative; }
                ui-panel.column { display: flex; flex-direction: column; }
                ui-panel.row { 
                    display: flex; 
                    flex-direction: row; 
                    justify-content: space-between;
                }
                 
                ui-dropdown:not(:first-child)
                {
                    margin-top: 1.0em;
                }
                
                #createIssue { margin-top: auto; }
                
                ui-selection-list  i { font-size: 1.5em }
                
                i.info { color: var(--info); }
                i.warn { color: var(--warn); }
                i.severe { color: var(--severe); }				
                
            </style>
            
            <header>
            </header>
            <main>
                <div>
                    <ui-panel class="column" name="topic" required>
                        <input placeholder="Subject..." value=""></input>
                        <textarea rows="12" placeholder="Description ..." cols="50" tabindex="-1"></textarea>
                    </ui-panel>
                    <ui-panel id="assignment" class="row" name="assignment" required>
                        <ui-dropdown style="flex:2">
                            <ui-option value="1" active>Contractor</ui-option>
                            <ui-option value="2" selected>Inspector</ui-option>
                            <ui-option value="3">Engineer</ui-option>
                        </ui-dropdown>
                        <ui-selection-list class="vx-bar" single>
                            <button class="vx-secondary" name="info" active><i class="fas fa-info-circle info"></i></button>
                            <button class="vx-secondary" name="warn"><i class="fas fa-exclamation-triangle warn"></i></button>
                            <button class="vx-secondary" name="severe"><i class="fas fa-exclamation-circle severe"></i></button>
                        </ui-selection-list>
                    </ui-panel>
                    <button id="createIssue" class="vx-primary">Create</button>
                </div>
                <div>
                    <ui-panel id="attachments" class="column" name="attachments">
                        <img></img>
                    </ui-panel>
                </div>
            </main>
            <ui-modal local hidden>
                Upoading Images ... please wait. 
            </ui-modal>
            
        `;
        
        this.level = this.dom.querySelector("ui-selection-list");
        
        this.subject = this.dom.querySelector("input")
        this.subject.addEventListener("change", event=> { this.validate(); });
        
        this.question = this.dom.querySelector("textarea")
        this.question.addEventListener("change", event=> { this.validate(); });
        
        this.assignee = this.dom.querySelector("ui-dropdown")
    }
    
    connectedCallback() 
    {
        this.dom.getElementById("createIssue").addEventListener("click", async (event) =>
        {
            this.dom.querySelector("ui-modal").hidden = false;
            
            let id = new Date().getTime();
            

            let img = await fetch(this.dom.querySelector("img").src);
            let blob = await img.blob();
            let file = new File([blob], `${id}.jpg`);

            // upload image
            await fetch(`${window.doc_domain}/file/issues/${id}.jpg`, 
            { 
                method: 'POST', 
                headers: new Headers({
                 'x-doc-token': this.getAttribute("token"),
                 'Content-Type': "text/plain",
                }),
            }).then(async (response) =>
            {
                let url = await response.text();
                await fetch(url,
                { 
                    method: 'POST', 
                    headers: new Headers({
                     'Content-Type': "application/octet-stream",
                     "x-goog-resumable": "start"
                    })
                }).then(async (response) =>
                {
                    let url = response.headers.get("Location");
                    await fetch(url,
                    { 
                        method: 'PUT', 
                        headers: new Headers({
                         'Content-Type': "application/octet-stream",
                         'Content-Range': "bytes " + 0 + "-" + (file.size - 1) + "/" + file.size
                        }),
                        body: file
                    });
                });
            });
    
            // create issue entry
            let issue = 
            {
                subject: this.subject.value,
                description: this.question.value,
                assignee: this.assignee.getActive().getAttribute("value"),
            };
            
            switch(this.level.querySelector("button[active]").getAttribute("name"))
            {
                case "info": issue.status = 2; break;
                case "warn": issue.status = 3; break;
                case "severe": issue.status = 4; break;
            }
            
            Object.assign(issue, JSON.parse(this.getAttribute("config")));

            await fetch(`${window.doc_domain}/meta`, 
            {
                method: 'PATCH',
                headers: new Headers({
                    'x-doc-token': this.getAttribute("token"),
                    'Content-Type': "text/plain",
                }),
                body: JSON.stringify([{ op: "replace", path: `/issues/${id}`, value: issue }])
            });
            
            this.dispatchEvent(new CustomEvent('issue-created', { detail: { id, issue }}));
            
            this.dom.querySelector("ui-modal").hidden = true;
        });
        
        this.parentElement.addEventListener("open", event =>
        {
            this.validate();
        });
    }
    
    validate()
    {
        let valid = this.question.value != "" && this.assignee.getActive() && this.subject.value != "";
        this.dom.getElementById("createIssue").disabled = !valid;
        this.dom.getElementById("createIssue").toggleAttribute("primary", valid);
    }

    attributeChangedCallback(name, oldValue, newValue)
    {
        if (name == "image")
        {
            let image = this.dom.querySelector("img");
            image.src = newValue;
        } 
        else if (name == "location")
        {
            if (newValue)
            {
                this.location.setAttribute("value", newValue);
            }
            else
            {
                this.location.removeAttribute("value");
            }
        }
    }
}

customElements.define("issue-form", IssueForm);

