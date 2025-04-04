import { database } from "../firebase";
import { ref, push, set, onChildAdded, onChildChanged, onValue } from "firebase/database";

export class Whiteboard {
  constructor(canvasElement, userId, userName, sessionId = 'default') {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d');
    this.userId = userId;
    this.userName = userName;
    this.sessionId = sessionId;
    this.currentTool = 'pen';
    this.currentColor = '#000000';
    this.currentWidth = 3;
    this.isDrawing = false;
    this.lastX = 0;
    this.lastY = 0;
    this.drawingHistory = [];
    this.historyIndex = -1;
    this.cursors = {};

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    const container = this.canvas.parentElement;
    this.canvas.width = container.clientWidth;
    this.canvas.height = container.clientHeight;
    this.redrawCanvas();
  }

  init() {
    this.setupEventListeners();
    this.setupFirebaseListeners();
    this.setupUserPresence();
  }

  setupEventListeners() {
    // Mouse events
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('mouseout', this.handleMouseUp.bind(this));

    // Touch events
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
  }

  setupFirebaseListeners() {
    // Drawings
    onChildAdded(ref(database, `drawings/${this.sessionId}`), (snapshot) => {
      const drawing = snapshot.val();
      if (drawing.userId !== this.userId) {
        this.renderRemoteDrawing(drawing);
      }
    });

    // Cursors
    onChildChanged(ref(database, `cursors/${this.sessionId}`), (snapshot) => {
      const cursor = snapshot.val();
      if (cursor.userId !== this.userId) {
        this.updateRemoteCursor(snapshot.key, cursor);
      }
    });

    // User presence
    onValue(ref(database, `presence/${this.sessionId}`), (snapshot) => {
      this.updateUserList(snapshot.val());
    });
  }

  setupUserPresence() {
    const presenceRef = ref(database, `presence/${this.sessionId}/${this.userId}`);
    
    set(presenceRef, {
      name: this.userName,
      color: this.getUserColor(),
      lastOnline: Date.now()
    });

    // Disconnect handling
    onDisconnect(presenceRef).remove();
  }

  // Drawing methods...
  // (Include all the drawing methods from previous implementation)
}
