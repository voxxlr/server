
class VxHierarchy extends HTMLElement 
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
                    position: relative;		
                    height: 100%;			
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }
                
                main
                {
                    flex: 1;
                    overflow-y: auto;					
                }
                main:focus { outline: none; }
                main > ul { margin-left: -20px; }
                
                ul 
                {
                    background: 0 0;
                    list-style: none;
                    position: relative;
                    overflow: hidden;
                }
                ul.closed { max-height: 0; }
                
                li {
                    outline-style: none;
                    margin: 0;
                    padding: 0;
                    border-width: 0;
                    display: block;
                }
                
                li i {
                    width: 20px; 
                    height: 20px; 
                    display: inline-block;
                    font-size: 1.33333em;
                }
                
                li i:before { font-family: "Font Awesome 5 Free" !important; }
                li i.closed:before { content: "\\f078";}
                li i:not(.closed):before { content: "\\f077";}
                
                        
                li input {
                    width: 20px; 
                    height: 20px; 
                }
                
        
                /* physical nodes */
                li.node > div { 
                    display: flex; 
                    flex-direction: row; 
                    align-items: center;
                    padding-left: 4px;
                }
                li.node > div:hover { background-color: var(--hover); }
                li.node > div.selected, li.node > div.selected:hover { background-color: var(--selected); }
                li.node > div.focussed, li.node > div.focussed:hover { 
                    background-color: var(--selected);  
                    box-shadow:inset 0px 0px 0px  3px ; 
                }
                
                span.level {
                    font-size: 14px;
                    padding-left: 4px;
                    vertical-align: baseline;
                    line-height: 24px;
                }
        
                
                /* logical nodes */
                li.leaf:hover { background-color: var(--hover); }
                li.leaf.selected { background-color: var(--selected); }
                li.leaf.selected, li.leaf.selected:hover { background-color: var(--selected); } 
        
                li.leaf > span {
                    font-size: 12px;
                    vertical-align: baseline;
                    line-height: 24px;
                    padding-left: 4px;
                }
        
            </style>

            <main tabindex="-1">
                <ul></ul>
            <main>
            
            <slot></slot>
            `;		
            
        this.tree = this.dom.querySelector("ul");
        this.tree.addEventListener("keydown", this.keydown.bind(this));
        this.tree.addEventListener("click", this.click.bind(this));
        this.tree.addEventListener("dblclick", this.dblclick.bind(this));
        
        this.main = this.dom.querySelector("main");
        this.main.addEventListener("keydown", this.keydown.bind(this));
        this.dom.addEventListener("keydown", event=> 
        {
            event.preventDefault();
        })
    }
    
    connectedCallback()
    {
        this.viewer = document.querySelector(this.getAttribute("viewer"));;
    
        this.viewer.on("viewer.load", async args =>
        {
            if (args.type == "model")
            {
                let tree = await this.viewer.get("model.hierarchy", { id: args.id });
                if (tree.children)
                {
                    this.tree.setAttribute("data-records", JSON.stringify({ [tree.id] : [] }));
                    for (var i=0; i<tree.children.length; i++)
                    {
                        this.tree.appendChild(this.createTree(tree.children[i]));
                    }
                }
                
                this.viewer.on("viewpoint", (viewpoint) =>
                {
                    this.dom.querySelectorAll("input:not(:checked)").forEach((item)=>
                    {
                        item.checked = true;
                    });
                    this.dom.querySelectorAll(".selected").forEach((item)=>
                    {
                        item.classList.remove("selected");
                    });
                    this.dom.querySelectorAll(".focussed").forEach((item)=>
                    {
                        item.classList.remove("focussed");
                    });
                    
                    if (viewpoint)
                    {
                        if (viewpoint[this.viewer.content.id])
                        {
                            var details = viewpoint[this.viewer.content.id];
                            for (let key in details.hidden) 
                            {
                                let div = this.dom.getElementById(key);
                                if (div)
                                {
                                    let input = div.querySelector("input");
                                    input.checked = false;
                                }
                            }
                            
                            if (details.focal)
                            {
                                let div = this.dom.getElementById(details.focal);
                                div.classList.toggle("focussed", true);
                            }
                        }
                    }
                }, this)
                    
                        
                this.viewer.on("controller.set", (args) =>
                {
                    if (args.name !== "orbiter")
                    {	
                        this.viewer.post("node.unselect", { [this.viewer.content.id]: null });
                        this.selectionDisabled = true;
                    }
                    else
                    {
                        this.selectionDisabled = false;			
                    }
                }, this);
                
                /*
                viewer.on(["line.select", "polygon.select", "point.select", "import.select" ], (event)=>
                {
                    let selected = this.dom.querySelector(".selected");
                    if (selected)
                    {
                        selected.classList.toggle("selected", false);
                        this.viewer.post("node.unselect", { [this.viewer.content.id]: null });
                    }
                }, this);
                */
                
                if (this.tree.children.length == 1)
                {
                    let button = this.tree.querySelector("li > div > i");
                    button.dispatchEvent(new CustomEvent("click", { bubbles: true }));
                }
            }			
        });

        this.viewer.on("viewer.unload", async args =>
        {
            while (this.tree.firstChild) 
            {
                this.tree.removeChild(this.tree.firstChild);
            }
            
            if (args.type == "model")
            {
                this.viewer.un("viewpoint", this);
                this.viewer.un("controller.set", this);
                //this.viewer.un(["line.select", "polygon.select", "point.select", "import.select" ], this);
            }
        });
    }
    
    //
    // dom events 
    //

    click(event)
    {
        if (event.target.matches("input"))
        {
            // checkbox
            var div = event.target.parentNode.parentNode;
            if (event.target.checked)
            {
                this.viewer.post("node.show",  { [this.viewer.content.id] : { [div.id]: [] } });
            }
            else
            {
                this.viewer.post("node.hide",  { [this.viewer.content.id] : { [div.id]: [] } });
            }
        }
        else if (event.target.matches("i"))
        {
            // arrow
            let ul = event.target.parentNode.nextSibling;
            ul.classList.toggle("closed");
            
            var icon = event.target; 
            icon.classList.toggle("closed");
        }
        else 
        {
            // node
            let node = null;
            if (event.target.matches("span"))
            {
                if (event.target.matches(".level"))
                {
                    node = event.target.closest("div");
                }
                else
                {
                    node = event.target.closest("li");
                }			
            }
            else if (event.target.matches("div") || event.target.matches("li"))
            {
                node = event.target;				
            }
                
            if (node)
            {
                let selected = this.dom.querySelector(".selected");
                if (selected != event.target)
                {
                    if (selected)
                    {
                        selected.classList.toggle("selected", false);
                        this.viewer.post("node.unselect", { [this.viewer.content.id]: null });
                    }
                    
                    node.classList.toggle("selected", true);
                    var records = JSON.parse(node.getAttribute("data-records"))
                    this.viewer.post("node.select", {[this.viewer.content.id]: records });
                }
            }
        }
    }

    async dblclick(event)
    {
        let node = null;
        
        if (event.target.matches("span.level"))
        {
            node = event.target.closest("div");
        }
        else if (event.target.matches("div"))
        {
            node = event.target;				
        }
        
        var focussed = this.dom.querySelector(".node div.focussed");
        if (focussed)
        {
            focussed.classList.toggle("focussed", false);
            this.viewer.post("node.focus", { [this.viewer.content.id]: null });
        }
        
        if (node)
        {
            // internal - focus
            if (focussed != node)
            {
                node.classList.toggle("focussed", true);
                this.viewer.post("controller.view", await this.viewer.get("node.aabb",  { [this.viewer.content.id]: JSON.parse(node.getAttribute("data-records")) } ));
                
                node.classList.toggle("selected", false);
                this.viewer.post("node.unselect", { [this.viewer.content.id]: null });
                
                this.viewer.post("node.show",  { [this.viewer.content.id] : { [node.id]: [] } });
                
                node.querySelector("input").checked = true;
                this.viewer.post("node.focus", { [this.viewer.content.id]: node.id });
            }
        }
        else 
        {
            if (event.target.matches("span"))		
            {
                node = event.target.closest("li");
            }			
            else if (event.target.matches("li"))
            {
                node = event.target;				
            }
            
            if (node)
            {
                this.viewer.post("controller.view",  await this.viewer.get("node.aabb", { [this.viewer.content.id]: JSON.parse(node.getAttribute("data-records"))} ));
                event.stopPropagation();
            }
        }
    }	
    
    
    //
    // 
    // 
    selectNode(node)
    {
        node.classList.toggle("selected", true);
        this.viewer.post("node.unselect", { [this.viewer.content.id]: null });
        let records = JSON.parse(node.getAttribute("data-records"))
        this.viewer.post("node.select", {[this.viewer.content.id]: records });
        this.scrollTree(node);
    }
    
    //
    // arrow key selection
    //
    
    selectNextUp(li)
    {
        var li = li.parentNode.closest("li");
        if (li)
        {
            if (li.nextElementSibling)
            {
                this.selectNode(li.nextElementSibling.firstChild);
            }
            else
            {
                this.selectNextUp(li);
            }
        }
    }
    
    selectNext(selected)
    {
        if (selected.nodeName == "LI")
        {
            if (selected.nextElementSibling)
            {
                this.selectNode(selected.nextElementSibling);
            }
            else 
            {
                this.selectNextUp(selected);
            }
        }
        else if (selected.nodeName == "DIV")
        {
            var ul = selected.nextElementSibling;
            if (!ul.classList.contains("closed"))
            {
                let next = ul.firstElementChild;
                if (next.classList.contains("leaf"))
                {
                    this.selectNode(next);
                }
                else
                {
                    this.selectNode(next.firstElementChild);
                }
            }
            else
            {
                var li = selected.parentNode;
                if (li.nextElementSibling)
                {
                    this.selectNode(li.nextElementSibling.firstElementChild);
                }
                else
                {
                    this.selectNextUp(li);
                }
            }
        }
    }
    
    selectPrevDown(li)
    {
        var ul = li.querySelector("ul");
        if (ul)
        {
            if (ul.classList.contains("closed"))
            {
                this.selectNode(ul.previousElementSibling);
            }
            else
            {
                this.selectPrevDown(ul.lastChild);
            }
        }
        else
        {
            this.selectNode(li);
        }
    }
    
    selectPrev(selected)
    {
        if (selected.nodeName == "LI")
        {
            if (selected.previousElementSibling)
            {
                this.selectNode(selected.previousElementSibling);
            }
            else
            {
                if (selected.parentNode)
                {
                    this.selectNode(selected.parentNode.previousElementSibling);
                }
            }
        }
        else if (selected.nodeName == "DIV")
        {
            var li = selected.parentNode;
            if (li.previousElementSibling )
            {
                this.selectPrevDown(li.previousElementSibling);
            }
            else
            {
                var ul = selected.closest("ul");
                if (ul.previousElementSibling)
                {
                    this.selectNode(ul.previousElementSibling);
                }
            }
        }
    }
    
    
    keydown(event)
    {
        var selected = this.dom.querySelector(".selected");
        if (selected)
        {
            this.viewer.post("node.unselect",  { [this.viewer.content.id]: null });
            selected.classList.toggle("selected", false);
        }

        if (event.key == "ArrowUp")
        {
            if (!selected)
            {
                let hover = this.dom.querySelector("div:hover") || this.dom.querySelector("li.leaf:hover");
                if (hover)
                {
                    this.selectPrev(hover);
                }
            }
            else
            {
                this.selectPrev(selected);
            }
        }
        else if (event.key == "ArrowDown")
        {
            if (!selected)
            {
                let hover = this.dom.querySelector("div:hover") || this.dom.querySelector("li.leaf:hover");
                if (hover)
                {
                    this.selectNext(hover);
                }
            }
            else
            {
                this.selectNext(selected);
            }
        }
        
        event.preventDefault();
    }
    
    scrollTree(node)
    {
        let rect = node.getBoundingClientRect();
        this.main.scrollTop = this.main.scrollTop + rect.top - this.main.offsetHeight/2;
    }

    createTree(node)
    {
        var li = document.createElement("li");

        var span = document.createElement("span");
        span.textContent = node.name;

        if (node.children)
        {
            li.classList.add("node");
            
            var ul = document.createElement("ul");
            for (var i=0; i<node.children.length; i++)
            {
                var child = this.createTree(node.children[i]);
                if (child)
                {
                    ul.appendChild(child);
                }
            }
            ul.classList.add("closed");
            
            span.setAttribute("class", "level");
                        
            var div = document.createElement("div");
            div.id = node.id;
            div.setAttribute("data-records", JSON.stringify({ [node.id] : true }));

            // dropdown button
            var icon = document.createElement("i");
            icon.setAttribute("class", "fa closed");
            div.appendChild(icon);
            
            // checkbox
            var checkbox = document.createElement("div");
            var input = document.createElement("input");
            input.type = "checkbox";
            input.checked = true;
            checkbox.appendChild(input);
            var label = document.createElement("label");
            label.setAttribute("for", id);
            checkbox.appendChild(label);
            
            div.appendChild(checkbox);
            div.appendChild(span);
            li.appendChild(div);
            li.appendChild(ul);
        }
        else
        {
            if (node.records instanceof Array)
            {
                let records = {};
                // legacy transfrom to new. 
                node.records.forEach(record =>
                {
                    records[record.object] = record.parts;
                });
                
                node.records = records;
            }
            
            let objects = "";
            for (var id in node.records)
            {
                objects += id + " ";
            }
            
            li.setAttribute("id", node.id);
            li.setAttribute("class", "leaf");
            li.setAttribute("data-records", JSON.stringify(node.records));
            li.setAttribute("data-objects", objects)
            li.appendChild(span);
        }
        
        return li;
    }	
    
    
    select(event)
    {
        let selected = this.dom.querySelector(".selected");
        if (selected)
        {
            selected.classList.toggle("selected", false);
            this.viewer.post("node.unselect", { [this.viewer.content.id]: null });
        }
        
        let node = null
        let list = this.dom.querySelectorAll(`[data-objects~="${event.object}"]`);
        for (var i=0; i<list.length; i++)
        {
            let records = JSON.parse(list[i].getAttribute("data-records"));
            for (var id in records)
            {
                if (id == event.object)
                {
                    let parts = records[id];
                    for (var p=0; p<parts.length; p++)
                    {
                        if (parts[p] == event.parts[0])  // JSTIER assumes there is only one!!
                        {
                            node = list[i];
                            break;
                        }
                    }
                }
            }
        }
        
        if (node)
        {
            node.classList.toggle("selected", true);
            this.viewer.post("node.select", { [event.id] : { [event.object]  : event.parts } });
            // focus on selected node
            let ul = node.closest("ul");
            while (ul) 
            {
                ul.classList.toggle("closed", false)
                if (ul.parentNode != this.dom)
                {
                    ul = ul.parentNode.closest("ul");
                }
                else
                {
                    ul = null;
                }
            }
            
            this.scrollTree(node);
        }		
    }
    
    hide(event)
    {
        this.viewer.post("node.hide",  { [event.id] : { [event.object]  : event.parts } });
    }
    
    reset()
    {
        this.viewer.post("model.reset", { id: this.viewer.content.id });
        /*
        this.viewer.post("node.focus", { [this.viewer.content.id]: null });
        this.viewer.post("node.unselect", { [this.viewer.content.id]: null });
        this.viewer.post("node.show", { [this.viewer.content.id]: null });
        */
        this.tree.querySelectorAll("input:not(:checked)").forEach((item)=>
        {
            item.checked = true;
            let checkbox = item.closest("div");
            let div = checkbox.parentNode;
        });
        this.tree.querySelectorAll(".selected").forEach(item => item.classList.remove("selected"));
        this.tree.querySelectorAll(".focussed").forEach(item => item.classList.remove("focussed"));
        this.tree.querySelectorAll("ul:not(.closed)").forEach(item=> item.classList.toggle("closed", true));
        this.tree.querySelectorAll("i:not(.closed)").forEach(item=> item.classList.toggle("closed", true));
        
        if (this.tree.children.length == 1)
        {
            let button = this.tree.querySelector("li > div > i");
            button.dispatchEvent(new CustomEvent("click", { bubbles: true }));
        }
    }
}

customElements.define("vx-hierarchy", VxHierarchy);

