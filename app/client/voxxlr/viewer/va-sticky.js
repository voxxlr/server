
class VaSticky extends HTMLElement 
{
    constructor() 
    {
        super();
        
        this.dom = this.attachShadow({mode: 'open'});
        
        this.dom.innerHTML = `
        
            <style>
            
                :host
                {
                    position: absolute;
                }
                
                :host([hidden])
                {
                    display: none;
                }
                        
            </style>
            
            <slot></slot>			
            
            `;
    }
    
    connectedCallback() 
    {
        if (this.parentNode.tagName == "VX-VIEWER")
        {
            this.parentNode.on(["viewer.mousedown", "viewpoint"], (event) =>
            {
                this.toggleAttribute("hidden", true);
            });
        }
    }
    
    open(position)
    {
        this.dom.host.style.left = `${position.pageX}px`;
        this.dom.host.style.top = `${position.pageY}px`;
        this.toggleAttribute("hidden", false);
    }
}

customElements.define("va-sticky", VaSticky);

