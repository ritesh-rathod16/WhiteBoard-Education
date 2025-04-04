import { AuthManager } from "../auth/AuthManager";
import { Whiteboard } from "../canvas/Whiteboard";

export class App {
  constructor() {
    this.authManager = new AuthManager();
    this.whiteboard = null;
    this.init();
  }

  init() {
    this.authManager.setAuthStateCallback((user) => {
      if (user) {
        this.handleUserLogin(user);
      } else {
        this.handleUserLogout();
      }
    });

    this.bindAuthEvents();
  }

  handleUserLogin(user) {
    document.getElementById('auth-container').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');
    
    const canvas = document.getElementById('whiteboard');
    this.whiteboard = new Whiteboard(
      canvas,
      user.uid,
      user.displayName || user.email
    );
    this.whiteboard.init();
  }

  handleUserLogout() {
    document.getElementById('auth-container').classList.remove('hidden');
    document.getElementById('app-container').classList.add('hidden');
    
    if (this.whiteboard) {
      this.whiteboard.cleanup();
      this.whiteboard = null;
    }
  }

  bindAuthEvents() {
    // Login form
    document.getElementById('login-btn').addEventListener('click', async () => {
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;
      await this.authManager.loginWithEmail(email, password);
    });

    // Register form
    document.getElementById('register-btn').addEventListener('click', async () => {
      const name = document.getElementById('register-name').value;
      const email = document.getElementById('register-email').value;
      const password = document.getElementById('register-password').value;
      const confirm = document.getElementById('register-confirm').value;
      
      if (password === confirm) {
        await this.authManager.registerWithEmail(name, email, password);
      } else {
        alert("Passwords don't match!");
      }
    });

    // Social logins
    document.querySelector('.google').addEventListener('click', () => 
      this.authManager.loginWithGoogle());
    document.querySelector('.github').addEventListener('click', () => 
      this.authManager.loginWithGitHub());
    
    // Logout
    document.getElementById('logout-btn').addEventListener('click', () => 
      this.authManager.logout());
    
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        document.querySelectorAll('.auth-form').forEach(form => 
          form.classList.remove('active'));
        document.querySelectorAll('.tab-btn').forEach(btn => 
          btn.classList.remove('active'));
        
        document.getElementById(`${tab}-form`).classList.add('active');
        btn.classList.add('active');
      });
    });
  }
}
