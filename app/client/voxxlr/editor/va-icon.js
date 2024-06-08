
class VaIcon extends HTMLElement 
{
    static get observedAttributes() 
    {
        return ['icon'];
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
                }
                
                ui-selection-list
                { 
                    margin-top: 0.5em;
                }
                
                img 
                {  
                    width: 1.2em;
                    height: 1.2em;
                }
                
            </style>
                
            <ui-selection-list single>
                <button id="info" class="vx-secondary" active><img src="${window.app_domain}/voxxlr/editor/images/info.webp"></button>
                <button id="question" class="vx-secondary"><img src="${window.app_domain}/voxxlr/editor/images/question.webp"></button>
                <button id="warn" class="vx-secondary"><img src="${window.app_domain}/voxxlr/editor/images/warn.webp"></button>
                <button id="alarm" class="vx-secondary"><img src="${window.app_domain}/voxxlr/editor/images/alarm.webp"></button>
                <button id="link" class="vx-secondary"><img src="${window.app_domain}/voxxlr/editor/images/link.webp"></button>
                <button id="window" class="vx-secondary"><img src="${window.app_domain}/voxxlr/editor/images/window.webp"></button>
                <button id="photo" class="vx-secondary"><img src="${window.app_domain}/voxxlr/editor/images/photo.webp"></button>
            </ui-selection-list>

            `;			

        this.dom.querySelector("ui-selection-list").addEventListener("down", async (event) =>
        {
            let image = await VaIcon.getImage(event.detail.id);
            this.dispatchEvent(new CustomEvent('image-changed', { bubbles: true, composed: true, detail: { image, name: event.detail.id } }));
        });
    }
    
    attributeChangedCallback(name, oldValue, newValue)
    {
        if (name == "icon")
        {
            this.dom.querySelector("ui-selection-list").select(this.dom.querySelector(`#${newValue}`), false);
        }
    }
    
    static ICON = 
    {
        info: `${window.app_domain}/voxxlr/editor/images/info.webp`,
        question: `${window.app_domain}/voxxlr/editor/images/question.webp`,
        warn: `${window.app_domain}/voxxlr/editor/images/warn.webp`,
        alarm: `${window.app_domain}/voxxlr/editor/images/alarm.webp`,
        link: `${window.app_domain}/voxxlr/editor/images/link.webp`,
        window: `${window.app_domain}/voxxlr/editor/images/window.webp`,
        photo: `${window.app_domain}/voxxlr/editor/images/photo.webp`,
    }
    
    static getImage(name)
    {
        if (VaIcon.ICON[name] instanceof Image)
        {
            return new Promise((resolve) =>
            {
                var canvas = document.createElement("canvas");
                canvas.width = 60;
                canvas.height = 60;
                var ctx = canvas.getContext("2d");
                ctx.drawImage(this.ICON[name], 0, 0, canvas.width, canvas.height);
                
                resolve(canvas.toDataURL());
            });
        }
        else
        {
            return new Promise((resolve) =>
            {
                let image = new Image()
                image.crossOrigin = "Anonymous";
                image.src = VaIcon.ICON[name];
                image.onload = ()=>
                {
                    VaIcon.ICON[name] = image;
                    this.getImage(name).then((data) =>
                    {
                        resolve(data);
                    });
                };
            });
        }
    }
    
    static CODE  =
    {
         init: encodeURI(function()
         {
             this.icon = new Image();
             this.icon.src = this.image;
         }.toString()),

         render2d: encodeURI(function(ctx, state)
         {
            if (this.frequency)
            {
                ctx.globalAlpha = Easing.Sinusoidal.InOut((state.t%1000)/1000);
            }
            let a = this.radius/2;
            
            ctx.drawImage(this.icon, -a, -a, this.radius, this.radius);
            var angle = 2*(state.t%3000)/3000*Math.PI;
            ctx.beginPath();
            if (this.frequency)
            {
                ctx.globalAlpha = 1.0;
            }
            
            ctx.strokeStyle = "blue";
            ctx.strokeWidth = 3;
            ctx.arc(0, 0, this.radius/1.4, angle, angle + Math.PI/3);
            ctx.stroke();
            
            return true;
         }.toString()),
     
         update: encodeURI(function(state)
         {
            if (state.image)
            {
                 this.icon.src = state.image;
                 this.frequency = state.frequency;
            }
            Object.assign(this, state);
         }.toString()),
        
         intersect: encodeURI(function(ctx, x, y, state)
         {
            var r = this.radius*state.scale;
            var dx = state.x - x;
            var dy = state.y - y;
            return dx*dx+dy*dy < r*r;
         }.toString()),
    }
    
}

customElements.define("va-icon", VaIcon);


