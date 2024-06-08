class VaLogin extends HTMLElement 
{
    constructor() 
    {
        super();
        
        this.dom = this.attachShadow({mode: 'open'});
         
        this.dom.innerHTML = `
    
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css" >
            <link rel="stylesheet" href="${window.app_domain}/ui.css">

            <style>
            
                :host 
                {
                    display: flex;
                    flex-direction: column;
                    align-items: stretch;
                    width: 20em;
                }
                
                :host > div { margin-bottom: 1em; }
                
                div.buttons
                { 
                    display: flex;
                    flex-direction: column;
                    align-items: stretch;
                }
            
                div.buttons > button 
                { 
                    height: 2.3em; 
                    margin-bottom: 0.5em; 
                }
   
            </style>

            <div>
                <p>A free trial account is automatically created for you when you first log in. <!--By logging in you agree to our<a href="/account/service.html" target="_blank">Terms of Service</a>--!></p><br>
            </div>	
            <div class="buttons">
            </div> 
            <div id="join" hidden>
                <p>You can also join an existing account by entering the account email address below. </p>
                <input placeholder="Join Account ..." type="text"><span></span>
                <p>The owner of this account must have invited you in order to for you to join.</p>
            <div>
        `;
        
         
        window.addEventListener('message', (e) =>
        {
            switch (e.data.action)
            {
                case "login":
                    this.login(e.data.token);
                    break;
                case "logout":
                    window.sessionStorage.removeItem("voxxlr");
                    window.location = `{window.www_domain}/index.html`;
                    break;
            }
        });
    }
    
    connectedCallback() 
    {
        this.platforms = JSON.parse(this.getAttribute("oauth2"));

        let buttons = this.dom.querySelector(`.buttons`);
        for (var key in this.platforms)
        {
            let button = document.createElement("button");
            button.id = key;
            button.textContent = this.platforms[key].textContent;
            button.style = this.platforms[key].style;
            buttons.appendChild(button);
        }

        this.dom.querySelectorAll("button").forEach((item) => {
            item.addEventListener("click", (event) => {
                var left = (screen.width / 2) - (400 / 2);
                var top = (screen.height / 2) - (400 / 2);

                var join = this.dom.querySelector("input").value;
                if (join) {
                    join = "&state=" + join;
                }
                else {
                    join = "&state=" + Math.floor((Math.random() * 1000) + 1);
                }

                let id = event.currentTarget.id;

                let url = this.platforms[id].url;
                if (this.platforms[id].redirect_uri) {
                    url += `&redirect_uri=${this.platforms[id].redirect_uri}`
                }
                if (this.platforms[id].client_id) {
                    url += `&client_id=${this.platforms[id].client_id}`
                }

                window.open(url + join, "Login", "width=640, height=480, left=" + left + ", top=" + top);
            });
        });

    }

    init()
    {
        var results = new RegExp('[\?&]token=([^&#]*)').exec(window.location.href);
        if (results==null)
        {
            let session = window.sessionStorage.getItem("voxxlr");
            if (session)
            {
                this.login(session);
            }
            else
            {
                this.logout();
            }
        }
        else
        {
            this.login(decodeURIComponent(results[1]));
        }
    }
    
    logout()
    {
        window.sessionStorage.removeItem("voxxlr");
        this.dispatchEvent(new CustomEvent('logout', { bubbles: true }));
    }
    
    login(token)
    {
        window.sessionStorage.setItem("voxxlr", token);
        this.dispatchEvent(new CustomEvent('login',  { bubbles: true, detail: token }));
    }
    
    getToken()
    {
        return window.sessionStorage.getItem("voxxlr");
    }

}
    
customElements.define("va-login", VaLogin);

