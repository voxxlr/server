import { LitElement, html } from 'https://cdn.jsdelivr.net/npm/lit@3/+esm';

export class VaLogin extends LitElement {
  static properties = {
    oauth2: { type: String },
    platforms: { type: Object, state: true }
  };

  constructor() {
    super();
    this.platforms = {};
    
    // Listen for OAuth popup messages
    window.addEventListener('message', (e) => {
      switch (e.data.action) {
        case 'login':
          this._login(e.data.token);
          break;
        case 'logout':
          window.sessionStorage.removeItem('voxxlr');
          window.location = `${window.www_domain}/index.html`;
          break;
      }
    });
  }

  connectedCallback() {
    super.connectedCallback();
    if (this.oauth2) {
      this.platforms = JSON.parse(this.oauth2);
    }
  }

  updated(changedProperties) {
    if (changedProperties.has('oauth2') && this.oauth2) {
      this.platforms = JSON.parse(this.oauth2);
    }
  }

  _handleButtonClick(id) {
    const input = this.renderRoot.querySelector('input');
    let join = input?.value;
    
    if (join) {
      join = '&state=' + join;
    } else {
      join = '&state=' + Math.floor(Math.random() * 1000 + 1);
    }

    const platform = this.platforms[id];
    let url = platform.url;
    
    if (platform.redirect_uri) {
      url += `&redirect_uri=${platform.redirect_uri}`;
    }
    if (platform.client_id) {
      url += `&client_id=${platform.client_id}`;
    }

    const left = (screen.width / 2) - 320;
    const top = (screen.height / 2) - 240;
    window.open(url + join, 'Login', `width=640, height=480, left=${left}, top=${top}`);
  }

  init() {
    const results = new RegExp('[?&]token=([^&#]*)').exec(window.location.href);
    if (results === null) {
      const session = window.sessionStorage.getItem('voxxlr');
      if (session) {
        this._login(session);
      } else {
        this._logout();
      }
    } else {
      this._login(decodeURIComponent(results[1]));
    }
  }

  _logout() {
    window.sessionStorage.removeItem('voxxlr');
    this.dispatchEvent(new CustomEvent('logout', { bubbles: true }));
  }

  logout() {
    this._logout();
  }

  _login(token) {
    window.sessionStorage.setItem('voxxlr', token);
    this.dispatchEvent(new CustomEvent('login', { bubbles: true, detail: token }));
  }

  getToken() {
    return window.sessionStorage.getItem('voxxlr');
  }

  render() {
    return html`
      <link rel="stylesheet" href="${window.cdn_domain}/styles-built.css">
      
      <div class="w-80">
        <p class="text-base-content/65 mb-4">
          A free trial account is automatically created for you when you first log in.
        </p>
        
        <div class="flex flex-col gap-2">
          ${Object.entries(this.platforms).map(([id, platform]) => html`
            <button 
              id=${id}
              class="btn btn-outline"
              style=${platform.style || ''}
              @click=${() => this._handleButtonClick(id)}
            >${platform.textContent}</button>
          `)}
        </div>
        
        <div id="join" class="hidden mt-4">
          <p class="text-base-content/65 mb-2">
            You can also join an existing account by entering the account email address below.
          </p>
          <input 
            class="input input-bordered w-full" 
            placeholder="Join Account ..." 
            type="text"
          >
          <p class="text-base-content/65 mt-2">
            The owner of this account must have invited you in order for you to join.
          </p>
        </div>
      </div>
    `;
  }
}

customElements.define('va-login', VaLogin);
