import { auth } from "../firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  onAuthStateChanged
} from "firebase/auth";
import { googleProvider, githubProvider } from "../firebase";

export class AuthManager {
  constructor() {
    this.user = null;
    this.initAuthListeners();
  }

  initAuthListeners() {
    onAuthStateChanged(auth, (user) => {
      this.user = user;
      this.onAuthStateChangedCallback?.(user);
    });
  }

  async loginWithEmail(email, password) {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return true;
    } catch (error) {
      console.error("Login error:", error);
      return false;
    }
  }

  async registerWithEmail(name, email, password) {
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(user, { displayName: name });
      return true;
    } catch (error) {
      console.error("Registration error:", error);
      return false;
    }
  }

  async loginWithGoogle() {
    try {
      await signInWithPopup(auth, googleProvider);
      return true;
    } catch (error) {
      console.error("Google login error:", error);
      return false;
    }
  }

  async loginWithGitHub() {
    try {
      await signInWithPopup(auth, githubProvider);
      return true;
    } catch (error) {
      console.error("GitHub login error:", error);
      return false;
    }
  }

  async logout() {
    try {
      await signOut(auth);
      return true;
    } catch (error) {
      console.error("Logout error:", error);
      return false;
    }
  }

  setAuthStateCallback(callback) {
    this.onAuthStateChangedCallback = callback;
  }
}
