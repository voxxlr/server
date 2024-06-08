class VaDatasets extends HTMLElement
{
    static get observedAttributes() 
    {
        return ['instances', 'key'];
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
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                }
                
                :host([hidden]) { display: none }
                
                :host span:nth-of-type(2)
                {
                    padding-top: 0.4em;
                    font-size: 2em;
                    margin-bottom: 0.4em;
                }

                ui-tag-list
                {
                    margin-top: 1em;
                    margin-bottom: 1em;
                }

                ui-collapsible > div:nth-of-type(1) { margin: 0.5em; }

                ui-collapsible div[slot=header] i
                {
                    cursor: pointer;
                    color: var(--primary);
                    padding: 0.3em;
                }

                ui-collapsible div[slot=header] i[disabled]
                {
                    color: grey;
                    pointer-events: none;
                }

                ui-collapsible i.state:before
                {
                    vertical-align: middle;
                    font-family: "Font Awesome 5 Free";
                    display: inline-block;
                }

                ui-collapsible[state=RUNNING] i.state:before
                {
                    content: "\\f110";
                    animation: fa-spin 1s infinite steps(8);
                    color: green;
                }
                ui-collapsible[state=TERMINATED] i.state:before { content: "\\f071"; color: red; }
                ui-collapsible[state=STAGING] i.state:before { content: "\\f013"; color: orange; }
                ui-collapsible[state=STOPPING] i.state:before { content: "\\f013"; color: orange; }
                ui-collapsible[state=idle] i.state:before { content: "\\f00c"; color: green; }
                ui-collapsible[state=undefined] i.state:before { content: "\\f059"; color: grey; }

                ui-collapsible input 
                {
                    border: none;
                    background-color: transparent;	
                    flex: 1;
                }                


            </style>

            <ui-collapsible-list id="datasets">
            </ui-collapsible-list>

            <template>
                <ui-collapsible editable state="undefined">
                    <div slot="header">
                        <i class="fas fa-trash" disabled></i>
                        <i class="state fas"></i>
                        <input/>
                    </div>
                    <div>
                       <textarea rows="7" placeholder="Description ..." cols="50" tabindex="-1"></textarea>
                       <ui-tag-list tags="">
                            <ui-tag-input type="text" ></ui-tag-input>
                        </ui-tag-list>
                    </div>
                </ui-collapsible>
            </template>
        `;

        this.list = this.dom.getElementById("datasets")
        this.list.addEventListener("open", async event => await this.openDataset(event.target));
        this.list.addEventListener("close", async event => this.dispatchEvent(new CustomEvent('unselect', {})));
        setTimeout(this.updateStatus.bind(this), 15000);
    }

    async openDataset(collapsible)
    {
        await fetch(`/voxxlr/upload/process/${collapsible.id}`,
        {
            method: 'GET',
            headers: new Headers({ 'x-api-key': this.getAttribute("key") })
        }).then(async (response) => 
        {
            let instance = await response.json();
            collapsible.timestamp = Date.now();
            collapsible.setAttribute("state", instance.state);
            this.dispatchEvent(new CustomEvent('select', { detail: collapsible }));
        });
    }

    async updateStatus()
    {
        let datasets = [...this.list.children]
        datasets.sort((a, b) => a.timestamp > b.timestamp ? 1 : -1);
        for (var i=0; i<datasets.length; i++)
        {
            let timestamp = Date.now();
            if (datasets[i].timestamp + 15000 < timestamp)
            {
                await fetch(`/voxxlr/upload/process/${datasets[i].id}`,
                {
                    method: 'GET',
                    headers: new Headers({ 'x-api-key': this.getAttribute("key") })
                }).then(async (response) => 
                {
                    let instance = await response.json();
                    console.log(instance)
                    datasets[i].timestamp = Date.now();
                    datasets[i].setAttribute("state", instance.state);
                    this.dispatchEvent(new CustomEvent('update', { detail: datasets[i] }));
                }).catch(e => { });
            }
        }
        setTimeout(this.updateStatus.bind(this), 15000)
    }

    createDataset(name, type)
    {
        const today = new Date();
        const yyyy = today.getFullYear();
        let mm = today.getMonth() + 1; // Months start at 0!
        let dd = today.getDate();
        if (dd < 10) dd = '0' + dd;
        if (mm < 10) mm = '0' + mm;
        const date = dd + '.' + mm + '.' + yyyy;

        return fetch(`/voxxlr/upload/dataset`,
        {
            method: 'POST',
            headers: new Headers({
                'x-api-key': this.getAttribute("key"),
                'Content-Type': "application/json"
            }),
            body: JSON.stringify({ name, type, tags: [date] })
        }).then(async (response) => 
        {
            if (response.ok)
            {
                this._createDataset(await response.json());
            }
        });
    }
    
    attributeChangedCallback(name, oldValue, newValue)
    {
        if (name == "instances")
        {
        }
        else if (name == "key")
        {
            fetch(`/voxxlr/upload/list`,
            {
                method: 'GET',
                headers: new Headers({
                    'x-api-key': newValue
                })
            }).then(async (response) => 
            {
                if (response.ok)
                {
                    let list = await response.json();
                    list.forEach(entry =>
                    {
                        this._createDataset(entry);
                    })
                }
            });
        }
    }

    getSelected()
    {
        return this.dom.querySelector("ui-collapsible[open]");
    }

    _createDataset(entry)
    {
        let template = this.dom.querySelector("template")
        let div = template.content.cloneNode(true);

        let collapsible = div.querySelector("ui-collapsible");
        collapsible.setAttribute("id", entry.id);
        collapsible.setAttribute("type", entry.type);
        collapsible.timestamp = 0;

        let input = collapsible.querySelector("input");
        input.value = entry.name;
        input.addEventListener("blur", event => 
        { 
            fetch(`/voxxlr/upload/dataset/${entry.id}`,
            {
                method: 'PATCH',
                headers: new Headers({
                    'x-api-key': this.getAttribute("key"),
                    'Content-Type': "application/json"
                }),
                body: JSON.stringify({ name: event.currentTarget.value })
            });
        });
        input.addEventListener('keyup', event =>
        {
            if (event.keyCode == 13) 
            {
                this.blur();
            }
        });        
        input.addEventListener("click", event =>    
        {
            event.target.focus();
            event.target.setSelectionRange(0, event.target.value.length)
            event.target.style.pointerEvents = "auto";	
            event.stopPropagation();
            event.preventDefault();	
        });

        let icon = collapsible.querySelector("div[slot=header] i.fa-trash");
        icon.addEventListener("click", event =>
        {
            let entry = icon.closest("ui-collapsible");
            fetch(`/voxxlr/upload/dataset/${entry.id}`,
            {
                method: 'DELETE',
                headers: new Headers({
                    'x-api-key': this.getAttribute("key")
                })
            }).then(async (response) => 
            {
                if (response.ok)
                {
                    let dataset = this.dom.getElementById(entry.id);
                    dataset.remove();
                }
            });
        });
        
        
        let tags = collapsible.querySelector("ui-tag-list");
        tags.addEventListener("tags-changed", event =>
        {
            fetch(`/voxxlr/upload/dataset/${entry.id}`,
            {
                method: 'PATCH',
                headers: new Headers({
                    'x-api-key': this.getAttribute("key"),
                    'Content-Type': "application/json"
                }),
                body: JSON.stringify({ tags: event.detail.join(",") })
            });
        });
        tags.setAttribute("tags", entry.tags)
       
        this.list.appendChild(div);
    }
}

customElements.define("va-datasets", VaDatasets);
