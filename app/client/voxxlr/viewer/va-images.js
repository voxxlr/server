(function() {

const template = document.createElement('template');

template.innerHTML = `

    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css" >
    <link rel="stylesheet" href="${window.app_domain}/ui.css">

    <style>
        
        :host
        {
            position: relative;
            height: 100%;
        }
        
        .slides 
        { 
            height: 60vh; 
        }
        .slide { display: none;  }
        .slide img 
        { 
            max-height: 100%; 
            max-width: 100%; 
            margin: auto;
        }
            
        .slide.visible { display: block; height: 100% }
        
        .prev, .next 
        {
            cursor: pointer;
            padding: 16px;
            color: white;
            font-weight: bold;
            font-size: 20px;
            transition: 0.6s ease;
            border-radius: 0 3px 3px 0;
            user-select: none;
            background-color: rgba(0, 0, 0, 0.2);
        }
        
        .next 
        {
            position: absolute;
            right: 0;
            top: 50%;
            margin-top: -50px;
        }
        
        .prev 
        {
            position: absolute;
            left: 0;
            top: 0;
            margin-top: -50px;
        }
        
        .prev:hover, .next:hover { background-color: rgba(0, 0, 0, 0.8); }
        
        .caption-container 
        {
            text-align: center;
            background-color: black;
            padding: 2px 16px;
            color: white;
        }
        
        .preview 
        {
            height: 15vh;
            display: flex;
            flex-direction: row;
        }
        
        .column 
        {
            flex: 1;
            height: 100%;
            opacity: 0.3;
        }
        
        .column img 
        { 
            height: 100%; 
            object-fit: cover;  
        }
        
        img.hover-shadow { transition: 0.3s; }
        .column.active { opacity: 1 }
        .column:hover { opacity: 1; }
        
        .hover-shadow:hover { box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19); }		 
                        
    </style>
        
    <div>
        <div class="slides"></div>
        <div class="prev">&#10094;</div>
        <div class="next">&#10095;</div>
    </div>

    <div class="caption-container">
        <p class="caption"></p>
    </div>

    <div class="preview"></div>
    `;


class VaImages extends HTMLElement 
{
    constructor() 
    {
        super();
            
        this.dom = this.attachShadow({mode: 'open'});
        this.dom.appendChild(template.content.cloneNode(true));

        this.slides = this.dom.querySelector(".slides");
        this.preview = this.dom.querySelector(".preview");
        
        this.dom.querySelectorAll("a").forEach(button => button.addEventListener("click", (event) =>
        {
            let visible = this.dom.querySelector(".slides .slide.visible");
            let index = Array.prototype.indexOf.call(this.slides.children, visible);
            if (event.currentTarget.classList.contains("next"))
            {
                this.setSlide((index + 1) % this.slides.children.length);
            }
            else
            {
                this.setSlide((index - 1 + this.slides.children.length) % this.slides.children.length);
            };
        }));
    }
    
    
    async init(images)
    {
        while (this.slides.firstChild)
        {
            this.slides.firstChild.remove();
        }
        while (this.preview.firstChild)
        {
            this.preview.firstChild.remove();
        }
        
        images.forEach((entry, index) => 
        {
            let image = document.createElement("img");
            image.src = entry.url;
            
            let slide = document.createElement("div");
            slide.classList.add("slide");
            if (index == 0)
            {
                slide.classList.add("visible");
                this.dom.querySelector(".caption").textContent = entry.caption;
            }
            slide.setAttribute("data-caption",  entry.caption);
            slide.appendChild(image);
            this.slides.appendChild(slide);
        });
        
        let preview = this.dom.querySelector(".preview");
        images.forEach((entry,index) => 
        {
            let column = document.createElement("div");
            column.classList.add("column");
            let image = document.createElement("img");
            image.src = entry.url;
            column.appendChild(image);
            if (index == 0)
            {
                column.classList.add("active");
            }
            preview.appendChild(column);
            
            column.addEventListener("click", (event)=>
            {
                this.setSlide(Array.prototype.indexOf.call(this.preview.children, event.currentTarget));
            })
        });
    }

    
    setSlide(index)
    {
        let current = Array.prototype.indexOf.call(this.slides.children, this.dom.querySelector(".slides .slide.visible"))
        
        this.slides.children[current].classList.remove("visible");
        this.preview.children[current].classList.remove("active");
        this.dom.querySelector(".caption").textContent = this.slides.children[index].getAttribute("data-caption");
        this.slides.children[index].classList.add("visible");
        this.preview.children[index].classList.add("active");
    }	
}

customElements.define("va-images", VaImages);

})();


