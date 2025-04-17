// DOM Elements
const whiteboard = document.getElementById('whiteboard');
const ctx = whiteboard.getContext('2d');
const tools = document.querySelectorAll('.tool');
const colorPicker = document.getElementById('colorPicker');
const fillPicker = document.getElementById('fillPicker');
const lineWidthSlider = document.getElementById('lineWidth');
const userList = document.getElementById('userList');
const boardIdElement = document.getElementById('boardId');
const saveBoardBtn = document.getElementById('saveBoard');
const notification = document.getElementById('notification');
const micBtn = document.getElementById('micBtn');
const videoBtn = document.getElementById('videoBtn');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const remoteVideoLabel = document.getElementById('remoteVideoLabel');
const localVideoPlaceholder = localVideo.nextElementSibling;
const remoteVideoPlaceholder = remoteVideo.nextElementSibling;
const togglePanelBtn = document.getElementById('togglePanel');
const loadingScreen = document.getElementById('loading');
const loadingText = loadingScreen.querySelector('.loading-text');
const shapePreview = document.getElementById('shapePreview');
const prevPage = document.getElementById('prevPage');
const nextPage = document.getElementById('nextPage');
const addPage = document.getElementById('addPage');
const pageCount = document.getElementById('pageCount');
const whiteboardBgs = document.querySelectorAll('.whiteboard-bg');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const chatSend = document.getElementById('chatSend');
const chatBadge = document.getElementById('chatBadge');
const chatTabBadge = document.getElementById('chatTabBadge');
const participantsTabBadge = document.getElementById('participantsTabBadge');

// Control buttons
const micControl = document.getElementById('micControl');
const videoControl = document.getElementById('videoControl');
const participantsControl = document.getElementById('participantsControl');
const screenShareControl = document.getElementById('screenShareControl');
const chatControl = document.getElementById('chatControl');
const recordControl = document.getElementById('recordControl');
const raiseHandControl = document.getElementById('raiseHandControl');
const reactionsBtn = document.getElementById('reactionsBtn');
const leaveControl = document.getElementById('leaveControl');

// Modals
const imageModal = document.getElementById('imageModal');
const imageModalClose = document.getElementById('imageModalClose');
const imageModalCancel = document.getElementById('imageModalCancel');
const imageModalInsert = document.getElementById('imageModalInsert');
const imageUrl = document.getElementById('imageUrl');
const imageUpload = document.getElementById('imageUpload');
const imagePreview = document.getElementById('imagePreview');
const imagePlaceholder = document.getElementById('imagePlaceholder');

const stickyModal = document.getElementById('stickyModal');
const stickyModalClose = document.getElementById('stickyModalClose');
const stickyModalCancel = document.getElementById('stickyModalCancel');
const stickyModalAdd = document.getElementById('stickyModalAdd');
const stickyContent = document.getElementById('stickyContent');
const stickyColorOptions = document.querySelectorAll('.color-option');

const textModal = document.getElementById('textModal');
const textModalClose = document.getElementById('textModalClose');
const textModalCancel = document.getElementById('textModalCancel');
const textModalAdd = document.getElementById('textModalAdd');
const textContent = document.getElementById('textContent');
const textColor = document.getElementById('textColor');
const textSize = document.getElementById('textSize');

const leaveModal = document.getElementById('leaveModal');
const leaveModalClose = document.getElementById('leaveModalClose');

// Whiteboard state
let currentTool = 'pencil';
let currentColor = '#000000';
let currentFill = 'transparent';
let currentLineWidth = 3;
let isDrawing = false;
let startX = 0;
let startY = 0;
let lastX = 0;
let lastY = 0;
let drawingHistory = [];
let historyPointer = -1;
let users = {};
let textInputActive = false;
let tempCanvas = document.createElement('canvas');
let tempCtx = tempCanvas.getContext('2d');
let savedState = null;
let floatingElements = [];

// Multi-page support
let pages = [];
let currentPageIndex = 0;

// Session state
let isHost = false;
let waitingForApproval = false;
let requireApprovalSetting = true;
let allowDrawingSetting = true;

// Chat state
let chatMessagesCount = 0;
let unreadChatMessages = 0;

// Media state
let localStream = null;
let peerConnection = null;
let isMicOn = false;
let isVideoOn = false;
let currentBackground = 'none';
const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
    ]
};

// Socket.io connection
const socket = io();
let boardId = '';
let userId = generateUserId();
let userName = `User-${userId.substring(0, 4)}`;
let userColor = generateRandomColor();

// Initialize whiteboard
function initWhiteboard() {
    // Set canvas size
    resizeCanvas();
    
    // Set initial styles
    ctx.strokeStyle = currentColor;
    ctx.fillStyle = currentFill;
    ctx.lineWidth = currentLineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.font = `${currentLineWidth * 5}px Arial`;
    
    // Initialize temp canvas
    tempCanvas.width = whiteboard.width;
    tempCanvas.height = whiteboard.height;
    
    // Initialize pages
    pages = [{
        drawings: [],
        historyPointer: -1,
        floatingElements: []
    }];
    updatePageControls();
    
    // Load board if ID exists in URL
    const urlParams = new URLSearchParams(window.location.search);
    const urlBoardId = urlParams.get('board');
    
    if (urlBoardId) {
        showLoading('Joining board...');
        socket.emit('joinBoard', { 
            boardId: urlBoardId, 
            userId, 
            userName, 
            userColor 
        });
    } else {
        showLoading('Creating new board...');
        isHost = true;
        socket.emit('createBoard', { 
            userId, 
            userName, 
            userColor,
            requireApproval: requireApprovalSetting,
            allowDrawing: allowDrawingSetting
        });
    }
    
    // Initialize chat
    initChat();
    
    // Add event listeners
    addEventListeners();
}

function addEventListeners() {
    // Window events
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Toolbar events
    tools.forEach(tool => {
        tool.addEventListener('click', () => {
            if (textInputActive) return;
            
            const toolName = tool.dataset.tool;
            selectTool(toolName);
            
            // Add selection animation
            tool.classList.add('selected');
            setTimeout(() => {
                tool.classList.remove('selected');
            }, 500);
        });
    });
    
    colorPicker.addEventListener('input', (e) => {
        currentColor = e.target.value;
        ctx.strokeStyle = currentColor;
    });
    
    fillPicker.addEventListener('input', (e) => {
        currentFill = e.target.value;
    });
    
    lineWidthSlider.addEventListener('input', (e) => {
        currentLineWidth = parseInt(e.target.value);
        ctx.lineWidth = currentLineWidth;
        ctx.font = `${currentLineWidth * 5}px Arial`;
    });
    
    // Whiteboard events
    whiteboard.addEventListener('mousedown', startDrawing);
    whiteboard.addEventListener('mousemove', draw);
    whiteboard.addEventListener('mouseup', stopDrawing);
    whiteboard.addEventListener('mouseout', stopDrawing);
    whiteboard.addEventListener('click', handleClick);
    
    // Page controls
    prevPage.addEventListener('click', () => {
        if (currentPageIndex > 0) {
            saveCurrentPage();
            currentPageIndex--;
            loadPage(currentPageIndex);
            updatePageControls();
        }
    });
    
    nextPage.addEventListener('click', () => {
        if (currentPageIndex < pages.length - 1) {
            saveCurrentPage();
            currentPageIndex++;
            loadPage(currentPageIndex);
            updatePageControls();
        }
    });
    
    addPage.addEventListener('click', () => {
        saveCurrentPage();
        pages.push({
            drawings: [],
            historyPointer: -1,
            floatingElements: []
        });
        currentPageIndex = pages.length - 1;
        loadPage(currentPageIndex);
        updatePageControls();
    });
    
    // Whiteboard background selection
    whiteboardBgs.forEach(bg => {
        bg.addEventListener('click', () => {
            whiteboardBgs.forEach(b => b.classList.remove('active'));
            bg.classList.add('active');
            
            const bgType = bg.dataset.bg;
            updateWhiteboardBackground(bgType);
        });
    });
    
    // Control buttons
    micControl.addEventListener('click', toggleMic);
    videoControl.addEventListener('click', toggleVideo);
    participantsControl.addEventListener('click', toggleParticipantsPanel);
    screenShareControl.addEventListener('click', toggleScreenShare);
    chatControl.addEventListener('click', toggleChatPanel);
    recordControl.addEventListener('click', toggleRecording);
    raiseHandControl.addEventListener('click', toggleRaiseHand);
    leaveControl.addEventListener('click', showLeaveModal);
    
    // Reactions
    document.querySelectorAll('.reaction-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            sendReaction(e.target.dataset.reaction);
        });
    });
    
    // Save button
    saveBoardBtn.addEventListener('click', saveBoardState);
    
    // Image modal events
    imageUpload.addEventListener('change', handleImageUpload);
    imageModalInsert.addEventListener('click', insertImageFromModal);
    
    // Sticky note modal events
    stickyModalAdd.addEventListener('click', addStickyNote);
    
    // Text modal events
    textModalAdd.addEventListener('click', addTextElement);
    
    // Leave modal
    leaveModalClose.addEventListener('click', () => {
        hideModal(leaveModal);
        window.location.href = window.location.origin;
    });
    
    // Modal close buttons
    imageModalClose.addEventListener('click', () => hideModal(imageModal));
    imageModalCancel.addEventListener('click', () => hideModal(imageModal));
    stickyModalClose.addEventListener('click', () => hideModal(stickyModal));
    stickyModalCancel.addEventListener('click', () => hideModal(stickyModal));
    textModalClose.addEventListener('click', () => hideModal(textModal));
    textModalCancel.addEventListener('click', () => hideModal(textModal));
}

function handleBeforeUnload(e) {
    if (drawingHistory.length > 0) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
    }
}

function generateUserId() {
    return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

function generateRandomColor() {
    return `hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)`;
}

function resizeCanvas() {
    const container = whiteboard.parentElement;
    whiteboard.width = container.offsetWidth;
    whiteboard.height = container.offsetHeight;
    tempCanvas.width = container.offsetWidth;
    tempCanvas.height = container.offsetHeight;
    
    redrawWhiteboard();
}

function updateWhiteboardBackground(bgType) {
    const container = document.querySelector('.whiteboard-container');
    switch (bgType) {
        case 'white':
            container.style.backgroundColor = 'white';
            container.style.backgroundImage = 'none';
            break;
        case 'black':
            container.style.backgroundColor = 'black';
            container.style.backgroundImage = 'none';
            break;
        case 'grid':
            container.style.backgroundColor = 'white';
            container.style.backgroundImage = `
                linear-gradient(#e9ecef 1px, transparent 1px),
                linear-gradient(90deg, #e9ecef 1px, transparent 1px)
            `;
            container.style.backgroundSize = '20px 20px';
            break;
        case 'dotted':
            container.style.backgroundColor = 'white';
            container.style.backgroundImage = `
                radial-gradient(#e9ecef 1px, transparent 1px),
                radial-gradient(#e9ecef 1px, transparent 1px)
            `;
            container.style.backgroundSize = '20px 20px';
            container.style.backgroundPosition = '0 0, 10px 10px';
            break;
    }
}

function initChat() {
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendChatMessage();
        }
    });
    
    chatSend.addEventListener('click', sendChatMessage);
}

function sendChatMessage() {
    const message = chatInput.value.trim();
    if (message) {
        const chatMessage = {
            senderId: userId,
            senderName: userName,
            senderColor: userColor,
            content: message,
            timestamp: new Date().toISOString()
        };
        
        socket.emit('chatMessage', chatMessage);
        addChatMessage(chatMessage, true);
        chatInput.value = '';
        chatInput.style.height = '40px';
    }
}

function addChatMessage(message, isSelf = false) {
    const messageElement = document.createElement('div');
    messageElement.className = `chat-message ${isSelf ? 'self' : 'other'}`;
    
    const messageHeader = document.createElement('div');
    messageHeader.className = 'chat-message-header';
    
    const senderElement = document.createElement('span');
    senderElement.className = 'chat-message-sender';
    senderElement.textContent = message.senderName;
    senderElement.style.color = isSelf ? 'white' : message.senderColor;
    
    const timeElement = document.createElement('span');
    timeElement.className = 'chat-message-time';
    timeElement.textContent = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    messageHeader.appendChild(senderElement);
    messageHeader.appendChild(timeElement);
    
    const contentElement = document.createElement('div');
    contentElement.className = 'chat-message-content';
    contentElement.textContent = message.content;
    
    messageElement.appendChild(messageHeader);
    messageElement.appendChild(contentElement);
    
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    if (!isSelf) {
        chatMessagesCount++;
        if (!document.querySelector('.panel-tab[data-tab="chat"]').classList.contains('active')) {
            unreadChatMessages++;
            updateChatBadges();
        }
    }
}

function updateChatBadges() {
    chatBadge.textContent = unreadChatMessages > 0 ? unreadChatMessages : '';
    chatTabBadge.textContent = unreadChatMessages > 0 ? unreadChatMessages : '';
}

function selectTool(toolName) {
    if (currentTool === toolName && toolName !== 'text') return;
    
    tools.forEach(t => t.classList.remove('active'));
    
    const newTool = Array.from(tools).find(t => t.dataset.tool === toolName);
    if (newTool) {
        newTool.classList.add('active');
        currentTool = toolName;
        
        if (toolName === 'undo') {
            undo();
            selectTool('pencil');
        } else if (toolName === 'redo') {
            redo();
            selectTool('pencil');
        } else if (toolName === 'clear') {
            clearBoard();
            selectTool('pencil');
        } else if (toolName === 'text') {
            showModal(textModal);
        } else if (toolName === 'image') {
            showModal(imageModal);
        } else if (toolName === 'sticky') {
            showModal(stickyModal);
        }
    }
}

function startDrawing(e) {
    if (currentTool === 'undo' || currentTool === 'redo' || currentTool === 'clear' || textInputActive) return;
    
    isDrawing = true;
    startX = e.offsetX;
    startY = e.offsetY;
    lastX = e.offsetX;
    lastY = e.offsetY;
    
    if (currentTool === 'pencil' || currentTool === 'eraser') {
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
    }
    
    socket.emit('cursorMove', { x: e.offsetX, y: e.offsetY, userId });
}

function draw(e) {
    const x = e.offsetX;
    const y = e.offsetY;
    
    socket.emit('cursorMove', { x, y, userId });
    
    if (!isDrawing) return;
    
    lastX = x;
    lastY = y;
    
    switch (currentTool) {
        case 'pencil':
            ctx.strokeStyle = currentColor;
            ctx.lineTo(x, y);
            ctx.stroke();
            
            socket.emit('draw', {
                tool: currentTool,
                color: currentColor,
                x1: lastX,
                y1: lastY,
                x2: x,
                y2: y,
                lineWidth: currentLineWidth,
                userId
            });
            break;
            
        case 'eraser':
            ctx.strokeStyle = document.querySelector('.whiteboard-container').style.backgroundColor || 'white';
            ctx.lineTo(x, y);
            ctx.stroke();
            
            socket.emit('draw', {
                tool: currentTool,
                color: document.querySelector('.whiteboard-container').style.backgroundColor || 'white',
                x1: lastX,
                y1: lastY,
                x2: x,
                y2: y,
                lineWidth: currentLineWidth,
                userId
            });
            break;
            
        case 'line':
        case 'rectangle':
        case 'circle':
        case 'arrow':
            drawShapePreview(startX, startY, x, y, currentTool);
            break;
    }
}

function drawShapePreview(x1, y1, x2, y2, shapeType) {
    shapePreview.innerHTML = '';
    
    const preview = document.createElement('div');
    preview.style.position = 'absolute';
    preview.style.border = `${currentLineWidth}px solid ${currentColor}`;
    preview.style.backgroundColor = shapeType === 'rectangle' ? currentFill : 'transparent';
    
    switch (shapeType) {
        case 'line':
            const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
            const angle = Math.atan2(y2 - y1, x2 - x1);
            
            preview.style.width = `${length}px`;
            preview.style.height = '0';
            preview.style.borderBottom = `${currentLineWidth}px solid ${currentColor}`;
            preview.style.transformOrigin = '0 0';
            preview.style.transform = `rotate(${angle}rad)`;
            preview.style.left = `${x1}px`;
            preview.style.top = `${y1}px`;
            break;
            
        case 'rectangle':
            preview.style.left = `${Math.min(x1, x2)}px`;
            preview.style.top = `${Math.min(y1, y2)}px`;
            preview.style.width = `${Math.abs(x2 - x1)}px`;
            preview.style.height = `${Math.abs(y2 - y1)}px`;
            break;
            
        case 'circle':
            const radius = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
            preview.style.width = `${radius * 2}px`;
            preview.style.height = `${radius * 2}px`;
            preview.style.borderRadius = '50%';
            preview.style.left = `${x1 - radius}px`;
            preview.style.top = `${y1 - radius}px`;
            break;
            
        case 'arrow':
            const arrowLength = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
            const arrowAngle = Math.atan2(y2 - y1, x2 - x1);
            
            const arrowLine = document.createElement('div');
            arrowLine.style.position = 'absolute';
            arrowLine.style.width = `${arrowLength}px`;
            arrowLine.style.height = '0';
            arrowLine.style.borderBottom = `${currentLineWidth}px solid ${currentColor}`;
            arrowLine.style.transformOrigin = '0 0';
            arrowLine.style.transform = `rotate(${arrowAngle}rad)`;
            arrowLine.style.left = `${x1}px`;
            arrowLine.style.top = `${y1}px`;
            shapePreview.appendChild(arrowLine);
            
            const arrowHead = document.createElement('div');
            arrowHead.style.position = 'absolute';
            arrowHead.style.width = '0';
            arrowHead.style.height = '0';
            arrowHead.style.borderLeft = `${currentLineWidth * 2}px solid transparent`;
            arrowHead.style.borderRight = `${currentLineWidth * 2}px solid transparent`;
            arrowHead.style.borderBottom = `${currentLineWidth * 3}px solid ${currentColor}`;
            arrowHead.style.transformOrigin = 'center';
            arrowHead.style.transform = `rotate(${arrowAngle}rad)`;
            arrowHead.style.left = `${x2}px`;
            arrowHead.style.top = `${y2}px`;
            shapePreview.appendChild(arrowHead);
            break;
    }
    
    if (shapeType !== 'arrow') {
        shapePreview.appendChild(preview);
    }
}

function handleClick(e) {
    if (currentTool === 'text') {
        lastX = e.offsetX;
        lastY = e.offsetY;
        showModal(textModal);
    }
}

function stopDrawing(e) {
    if (!isDrawing || currentTool === 'text') return;
    
    const x = e.offsetX;
    const y = e.offsetY;
    
    shapePreview.innerHTML = '';
    
    if (currentTool === 'line' || currentTool === 'rectangle' || currentTool === 'circle' || currentTool === 'arrow') {
        const shape = {
            tool: currentTool,
            color: currentColor,
            fill: currentFill,
            x1: startX,
            y1: startY,
            x2: x,
            y2: y,
            lineWidth: currentLineWidth,
            userId
        };
        
        addToHistory(shape);
        socket.emit('draw', shape);
        drawAction(shape);
    } else if (currentTool === 'pencil' || currentTool === 'eraser') {
        ctx.closePath();
    }
    
    isDrawing = false;
}

function addToHistory(action) {
    if (historyPointer < drawingHistory.length - 1) {
        drawingHistory = drawingHistory.slice(0, historyPointer + 1);
    }
    
    drawingHistory.push(action);
    historyPointer = drawingHistory.length - 1;
}

function undo() {
    if (historyPointer >= 0) {
        historyPointer--;
        redrawWhiteboard();
        socket.emit('undo', { userId });
    }
}

function redo() {
    if (historyPointer < drawingHistory.length - 1) {
        historyPointer++;
        redrawWhiteboard();
        socket.emit('redo', { userId });
    }
}

function clearBoard() {
    showConfirmation('Are you sure you want to clear the board? This cannot be undone.', () => {
        drawingHistory = [];
        historyPointer = -1;
        floatingElements.forEach(el => el.element.remove());
        floatingElements = [];
        redrawWhiteboard();
        socket.emit('clear', { userId });
    });
}

function redrawWhiteboard() {
    ctx.clearRect(0, 0, whiteboard.width, whiteboard.height);
    
    for (let i = 0; i <= historyPointer; i++) {
        const action = drawingHistory[i];
        drawAction(action, false);
    }
}

function drawAction(action, addToHistoryFlag = true) {
    ctx.strokeStyle = action.color;
    ctx.fillStyle = action.fill || 'transparent';
    ctx.lineWidth = action.lineWidth || 3;
    
    switch (action.tool) {
        case 'pencil':
        case 'eraser':
            ctx.beginPath();
            ctx.moveTo(action.x1, action.y1);
            ctx.lineTo(action.x2, action.y2);
            ctx.stroke();
            break;
            
        case 'line':
            ctx.beginPath();
            ctx.moveTo(action.x1, action.y1);
            ctx.lineTo(action.x2, action.y2);
            ctx.stroke();
            break;
            
        case 'arrow':
            ctx.beginPath();
            ctx.moveTo(action.x1, action.y1);
            ctx.lineTo(action.x2, action.y2);
            ctx.stroke();
            
            const angle = Math.atan2(action.y2 - action.y1, action.x2 - action.x1);
            ctx.save();
            ctx.translate(action.x2, action.y2);
            ctx.rotate(angle);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-10, -5);
            ctx.lineTo(-10, 5);
            ctx.closePath();
            ctx.fillStyle = action.color;
            ctx.fill();
            ctx.restore();
            break;
            
        case 'rectangle':
            ctx.beginPath();
            const rectWidth = action.x2 - action.x1;
            const rectHeight = action.y2 - action.y1;
            ctx.rect(action.x1, action.y1, rectWidth, rectHeight);
            ctx.fill();
            ctx.stroke();
            break;
            
        case 'circle':
            ctx.beginPath();
            const radius = Math.sqrt(Math.pow(action.x2 - action.x1, 2) + Math.pow(action.y2 - action.y1, 2));
            ctx.arc(action.x1, action.y1, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            break;
    }
    
    if (addToHistoryFlag) {
        addToHistory(action);
    }
}

function saveCurrentPage() {
    pages[currentPageIndex] = {
        drawings: [...drawingHistory],
        historyPointer: historyPointer,
        floatingElements: [...floatingElements]
    };
}

function loadPage(index) {
    drawingHistory = [...pages[index].drawings];
    historyPointer = pages[index].historyPointer;
    
    // Remove existing floating elements
    floatingElements.forEach(el => el.element.remove());
    
    // Create new floating elements
    floatingElements = pages[index].floatingElements.map(elData => {
        const el = createFloatingElement(elData);
        return { ...elData, element: el };
    });
    
    redrawWhiteboard();
}

function updatePageControls() {
    pageCount.textContent = `${currentPageIndex + 1}/${pages.length}`;
    prevPage.disabled = currentPageIndex === 0;
    nextPage.disabled = currentPageIndex === pages.length - 1;
}

function saveBoardState() {
    saveCurrentPage();
    
    savedState = {
        pages: pages,
        currentPageIndex: currentPageIndex
    };
    
    localStorage.setItem(`whiteboard-${boardId}`, JSON.stringify(savedState));
    showNotification('Board state saved locally');
    
    socket.emit('saveBoard', {
        boardId,
        pages,
        currentPageIndex,
        userId
    });
}

function loadBoardState() {
    const saved = localStorage.getItem(`whiteboard-${boardId}`);
    if (saved) {
        try {
            const state = JSON.parse(saved);
            pages = state.pages || [];
            currentPageIndex = state.currentPageIndex || 0;
            
            if (pages.length === 0) {
                pages = [{
                    drawings: [],
                    historyPointer: -1,
                    floatingElements: []
                }];
            }
            
            loadPage(currentPageIndex);
            updatePageControls();
            showNotification('Previous session restored');
        } catch (e) {
            console.error('Error loading saved state:', e);
        }
    }
}

// Floating elements (images, text, sticky notes)
function createFloatingElement(data) {
    const element = document.createElement('div');
    element.className = `floating-element floating-${data.type}`;
    element.style.left = `${data.x}px`;
    element.style.top = `${data.y}px`;
    
    const controls = document.createElement('div');
    controls.className = 'element-controls';
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'element-control';
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeFloatingElement(data.id);
    });
    
    const resizeBtn = document.createElement('button');
    resizeBtn.className = 'element-control';
    resizeBtn.innerHTML = '<i class="fas fa-expand"></i>';
    resizeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Implement resize functionality
    });
    
    controls.appendChild(deleteBtn);
    controls.appendChild(resizeBtn);
    
    switch (data.type) {
        case 'image':
            const img = document.createElement('img');
            img.src = data.src;
            img.style.width = `${data.width}px`;
            img.style.height = `${data.height}px`;
            element.appendChild(img);
            break;
            
        case 'text':
            element.contentEditable = true;
            element.textContent = data.text;
            element.style.color = data.color;
            element.style.fontSize = `${data.size}px`;
            break;
            
        case 'sticky':
            element.style.backgroundColor = data.bgColor;
            element.style.width = `${data.width}px`;
            element.style.height = `${data.height}px`;
            element.textContent = data.text;
            break;
    }
    
    element.appendChild(controls);
    
    // Make draggable
    makeDraggable(element, data);
    
    whiteboard.parentElement.appendChild(element);
    return element;
}

function makeDraggable(element, data) {
    let isDragging = false;
    let offsetX, offsetY;
    
    element.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('element-control')) return;
        
        isDragging = true;
        offsetX = e.clientX - element.getBoundingClientRect().left;
        offsetY = e.clientY - element.getBoundingClientRect().top;
        element.style.cursor = 'grabbing';
        e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const x = e.clientX - offsetX - whiteboard.getBoundingClientRect().left;
        const y = e.clientY - offsetY - whiteboard.getBoundingClientRect().top;
        
        element.style.left = `${x}px`;
        element.style.top = `${y}px`;
        
        // Update position in floatingElements array
        const elementIndex = floatingElements.findIndex(el => el.id === data.id);
        if (elementIndex !== -1) {
            floatingElements[elementIndex].x = x;
            floatingElements[elementIndex].y = y;
        }
    });
    
    document.addEventListener('mouseup', () => {
        isDragging = false;
        element.style.cursor = 'move';
    });
}

function removeFloatingElement(id) {
    const elementIndex = floatingElements.findIndex(el => el.id === id);
    if (elementIndex !== -1) {
        floatingElements[elementIndex].element.remove();
        floatingElements.splice(elementIndex, 1);
    }
}

// Image handling
function handleImageUpload(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            imagePreview.src = event.target.result;
            imagePreview.style.display = 'block';
            imagePlaceholder.style.display = 'none';
        };
        reader.readAsDataURL(file);
    }
}

function insertImageFromModal() {
    let imageSrc = imageUrl.value.trim();
    
    if (imageUpload.files[0]) {
        const reader = new FileReader();
        reader.onload = (event) => {
            insertImage(event.target.result);
        };
        reader.readAsDataURL(imageUpload.files[0]);
    } else if (imageSrc) {
        if (!imageSrc.startsWith('http')) {
            imageSrc = 'https://' + imageSrc;
        }
        
        const testImg = new Image();
        testImg.onload = () => {
            insertImage(imageSrc);
        };
        testImg.onerror = () => {
            showNotification('Could not load image from URL');
        };
        testImg.src = imageSrc;
    } else {
        showNotification('Please provide an image URL or upload a file');
    }
}

function insertImage(src) {
    const img = new Image();
    img.onload = function() {
        const elementId = generateId();
        const width = this.width > 300 ? 300 : this.width;
        const height = this.width > 300 ? (300 / this.width) * this.height : this.height;
        
        const elementData = {
            id: elementId,
            type: 'image',
            src: src,
            x: lastX,
            y: lastY,
            width: width,
            height: height
        };
        
        const element = createFloatingElement(elementData);
        floatingElements.push({ ...elementData, element });
        
        hideModal(imageModal);
        imageUrl.value = '';
        imageUpload.value = '';
        imagePreview.src = '';
        imagePreview.style.display = 'none';
        imagePlaceholder.style.display = 'flex';
    };
    img.src = src;
}

// Sticky note handling
function addStickyNote() {
    const content = stickyContent.value.trim();
    if (content) {
        const selectedColor = document.querySelector('.color-option[style*="border: 2px solid var(--primary-color)"]') || 
                              document.querySelector('.color-option');
        
        const elementId = generateId();
        const elementData = {
            id: elementId,
            type: 'sticky',
            text: content,
            x: lastX,
            y: lastY,
            width: 200,
            height: 150,
            bgColor: selectedColor.dataset.color
        };
        
        const element = createFloatingElement(elementData);
        floatingElements.push({ ...elementData, element });
        
        hideModal(stickyModal);
        stickyContent.value = '';
    } else {
        showNotification('Please enter some content for the sticky note');
    }
}

// Text handling
function addTextElement() {
    const content = textContent.value.trim();
    if (content) {
        const elementId = generateId();
        const elementData = {
            id: elementId,
            type: 'text',
            text: content,
            x: lastX,
            y: lastY,
            color: textColor.value,
            size: textSize.value
        };
        
        const element = createFloatingElement(elementData);
        floatingElements.push({ ...elementData, element });
        
        hideModal(textModal);
        textContent.value = '';
    } else {
        showNotification('Please enter some text');
    }
}

function generateId() {
    return Math.random().toString(36).substring(2, 9);
}

// Media functions
async function toggleMic() {
    try {
        if (!localStream) {
            localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: isVideoOn });
            if (isVideoOn) {
                localVideo.srcObject = localStream;
                localVideoPlaceholder.style.display = 'none';
                localVideo.style.display = 'block';
            }
        }
        
        const audioTracks = localStream.getAudioTracks();
        audioTracks.forEach(track => {
            track.enabled = !track.enabled;
        });
        
        isMicOn = !isMicOn;
        micControl.classList.toggle('off', !isMicOn);
        micControl.querySelector('i').className = isMicOn ? 'fas fa-microphone' : 'fas fa-microphone-slash';
        showNotification(isMicOn ? 'Microphone enabled' : 'Microphone muted');
        
        if (peerConnection) {
            setupPeerConnection();
        }
    } catch (err) {
        console.error('Error accessing microphone:', err);
        showNotification('Could not access microphone');
        isMicOn = false;
        micControl.classList.add('off');
        micControl.querySelector('i').className = 'fas fa-microphone-slash';
    }
}

async function toggleVideo() {
    try {
        if (!localStream) {
            localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: isMicOn });
            localVideo.srcObject = localStream;
            localVideoPlaceholder.style.display = 'none';
            localVideo.style.display = 'block';
            isVideoOn = true;
            videoControl.classList.remove('off');
            videoControl.querySelector('i').className = 'fas fa-video';
            showNotification('Video enabled');
            
            setupPeerConnection();
        } else {
            const videoTracks = localStream.getVideoTracks();
            videoTracks.forEach(track => {
                track.enabled = !track.enabled;
            });
            
            isVideoOn = !isVideoOn;
            videoControl.classList.toggle('off', !isVideoOn);
            videoControl.querySelector('i').className = isVideoOn ? 'fas fa-video' : 'fas fa-video-slash';
            localVideoPlaceholder.style.display = isVideoOn ? 'none' : 'flex';
            localVideo.style.display = isVideoOn ? 'block' : 'none';
            showNotification(isVideoOn ? 'Video enabled' : 'Video disabled');
            
            if (peerConnection) {
                setupPeerConnection();
            }
        }
    } catch (err) {
        console.error('Error accessing camera:', err);
        showNotification('Could not access camera');
        isVideoOn = false;
        videoControl.classList.add('off');
        videoControl.querySelector('i').className = 'fas fa-video-slash';
        localVideoPlaceholder.style.display = 'flex';
        localVideo.style.display = 'none';
    }
}

function setupPeerConnection() {
    if (peerConnection) {
        peerConnection.close();
    }
    
    peerConnection = new RTCPeerConnection(configuration);
    
    if (localStream) {
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });
    }
    
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('iceCandidate', { 
                candidate: event.candidate,
                boardId,
                userId
            });
        }
    };
    
    peerConnection.ontrack = (event) => {
        remoteVideo.srcObject = event.streams[0];
        remoteVideoPlaceholder.style.display = 'none';
        remoteVideo.style.display = 'block';
        
        const remoteUserId = Object.keys(users).find(id => id !== userId);
        if (remoteUserId) {
            remoteVideoLabel.textContent = users[remoteUserId]?.userName || 'Participant';
            document.getElementById('remoteVideoPlaceholderText').textContent = `${users[remoteUserId]?.userName || 'Participant'}'s video`;
        }
    };
    
    peerConnection.createOffer()
        .then(offer => peerConnection.setLocalDescription(offer))
        .then(() => {
            socket.emit('offer', {
                offer: peerConnection.localDescription,
                boardId,
                userId
            });
        })
        .catch(err => {
            console.error('Error creating offer:', err);
        });
}

async function toggleScreenShare() {
    try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const videoTrack = stream.getVideoTracks()[0];
        
        if (localStream) {
            const currentVideoTrack = localStream.getVideoTracks()[0];
            if (currentVideoTrack) {
                currentVideoTrack.stop();
                localStream.removeTrack(currentVideoTrack);
            }
            localStream.addTrack(videoTrack);
        } else {
            localStream = new MediaStream([videoTrack]);
        }
        
        localVideo.srcObject = localStream;
        localVideoPlaceholder.style.display = 'none';
        localVideo.style.display = 'block';
        
        videoTrack.onended = () => {
            toggleScreenShare();
        };
        
        if (peerConnection) {
            setupPeerConnection();
        }
        
        showNotification('Screen sharing started');
    } catch (err) {
        console.error('Error sharing screen:', err);
        showNotification('Could not share screen');
    }
}

function toggleRecording() {
    showNotification('Recording feature coming soon!');
}

function toggleRaiseHand() {
    showNotification('Raise hand feature coming soon!');
}

function sendReaction(reaction) {
    showNotification(`You reacted with ${reaction}`);
    socket.emit('reaction', {
        userId,
        userName,
        reaction,
        boardId
    });
}

// Panel controls
function toggleParticipantsPanel() {
    document.querySelector('.container').classList.remove('panel-collapsed');
    const icon = togglePanelBtn.querySelector('i');
    icon.classList.remove('fa-chevron-right');
    icon.classList.add('fa-chevron-left');
    
    document.querySelector('.panel-tab[data-tab="participants"]').click();
}

function toggleChatPanel() {
    document.querySelector('.container').classList.remove('panel-collapsed');
    const icon = togglePanelBtn.querySelector('i');
    icon.classList.remove('fa-chevron-right');
    icon.classList.add('fa-chevron-left');
    
    document.querySelector('.panel-tab[data-tab="chat"]').click();
    unreadChatMessages = 0;
    updateChatBadges();
}

// Modal functions
function showModal(modal) {
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function hideModal(modal) {
    modal.classList.remove('show');
    document.body.style.overflow = '';
}

function showConfirmation(message, callback) {
    // Simplified for this example
    if (confirm(message)) {
        callback();
    }
}

function showLeaveModal() {
    showModal(leaveModal);
}

// Loading screen functions
function showLoading(message) {
    loadingScreen.style.display = 'flex';
    loadingText.textContent = message;
}

function hideLoading() {
    loadingScreen.style.display = 'none';
}

function showNotification(message) {
    notification.textContent = message;
    notification.style.display = 'block';
    
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

// Socket.io event handlers
socket.on('boardCreated', (data) => {
    boardId = data.boardId;
    isHost = true;
    
    const url = new URL(window.location.href);
    url.searchParams.set('board', data.boardId);
    window.history.pushState({}, '', url);
    
    showNotification('New board created! Share the URL to collaborate.');
    hideLoading();
    
    updateUserList();
});

socket.on('boardJoined', (data) => {
    boardId = data.boardId;
    
    if (data.waitingForApproval) {
        waitingForApproval = true;
        showModal(lobbyModal);
    } else {
        pages = data.pages || [];
        currentPageIndex = data.currentPageIndex || 0;
        
        if (pages.length === 0) {
            pages = [{
                drawings: [],
                historyPointer: -1,
                floatingElements: []
            }];
        }
        
        loadPage(currentPageIndex);
        updatePageControls();
        loadBoardState();
    }
    
    showNotification(`Joined board ${data.boardId}`);
    hideLoading();
});

socket.on('userApproved', () => {
    waitingForApproval = false;
    hideModal(lobbyModal);
    showNotification('You have been approved to join the board');
    
    socket.emit('getBoardData', { boardId, userId });
});

socket.on('boardData', (data) => {
    pages = data.pages || [];
    currentPageIndex = data.currentPageIndex || 0;
    
    if (pages.length === 0) {
        pages = [{
            drawings: [],
            historyPointer: -1,
            floatingElements: []
        }];
    }
    
    loadPage(currentPageIndex);
    updatePageControls();
    loadBoardState();
});

socket.on('userJoined', (user) => {
    users[user.userId] = user;
    updateUserList();
    
    if (user.userId !== userId) {
        showNotification(`${user.userName} joined the board`);
        document.getElementById('remoteVideoPlaceholderText').textContent = `${user.userName}'s video`;
        
        if (localStream && Object.keys(users).length === 2) {
            setupPeerConnection();
        }
    }
});

socket.on('existingUsers', (existingUsers) => {
    users = { ...users, ...existingUsers };
    updateUserList();
    
    if (localStream && Object.keys(existingUsers).length > 0) {
        setupPeerConnection();
    }
});

socket.on('userLeft', (userId) => {
    const userName = users[userId]?.userName || 'A user';
    delete users[userId];
    
    const cursor = document.getElementById(`cursor-${userId}`);
    if (cursor) cursor.remove();
    
    updateUserList();
    showNotification(`${userName} left the board`);
    
    if (Object.keys(users).length <= 1 && peerConnection) {
        peerConnection.close();
        peerConnection = null;
        remoteVideo.srcObject = null;
        remoteVideo.style.display = 'none';
        remoteVideoPlaceholder.style.display = 'flex';
    }
});

socket.on('userCursor', (data) => {
    const userId = data.userId;
    const x = data.x;
    const y = data.y;
    const color = users[userId]?.userColor || '#000000';
    const name = users[userId]?.userName || 'User';
    
    let cursor = document.getElementById(`cursor-${userId}`);
    
    if (!cursor) {
        cursor = document.createElement('div');
        cursor.id = `cursor-${userId}`;
        cursor.className = 'cursor';
        cursor.style.backgroundColor = color;
        
        const userName = document.createElement('div');
        userName.className = 'cursor-name';
        userName.textContent = name;
        userName.style.color = color;
        cursor.appendChild(userName);
        
        whiteboard.parentElement.appendChild(cursor);
    }
    
    cursor.style.left = `${x}px`;
    cursor.style.top = `${y}px`;
});

socket.on('drawing', (action) => {
    drawAction(action);
});

socket.on('undo', () => {
    if (historyPointer >= 0) {
        historyPointer--;
        redrawWhiteboard();
    }
});

socket.on('redo', () => {
    if (historyPointer < drawingHistory.length - 1) {
        historyPointer++;
        redrawWhiteboard();
    }
});

socket.on('clear', () => {
    drawingHistory = [];
    historyPointer = -1;
    floatingElements.forEach(el => el.element.remove());
    floatingElements = [];
    redrawWhiteboard();
});

socket.on('userCount', (count) => {
    participantsTabBadge.textContent = count > 1 ? count - 1 : '';
});

socket.on('chatMessage', (message) => {
    addChatMessage(message, message.senderId === userId);
});

socket.on('reaction', (data) => {
    showNotification(`${data.userName} reacted with ${data.reaction}`);
});

// WebRTC events
socket.on('offer', async (data) => {
    if (data.userId === userId) return;
    
    if (!peerConnection) {
        setupPeerConnection();
    }
    
    try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        
        socket.emit('answer', {
            answer,
            boardId,
            userId,
            toUserId: data.userId
        });
    } catch (err) {
        console.error('Error handling offer:', err);
    }
});

socket.on('answer', async (data) => {
    if (data.userId === userId) return;
    try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
    } catch (err) {
        console.error('Error handling answer:', err);
    }
});

socket.on('iceCandidate', async (data) => {
    if (data.userId === userId) return;
    try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    } catch (err) {
        console.error('Error adding ICE candidate:', err);
    }
});

// Helper functions
function updateUserList() {
    userList.innerHTML = '';
    
    if (isHost) {
        const userItem = document.createElement('div');
        userItem.className = 'user-item host';
        
        const userAvatar = document.createElement('div');
        userAvatar.className = 'user-avatar';
        userAvatar.style.backgroundColor = userColor;
        userAvatar.textContent = userName.substring(0, 1).toUpperCase();
        
        const userNameEl = document.createElement('div');
        userNameEl.className = 'user-name';
        userNameEl.textContent = userName;
        
        userItem.appendChild(userAvatar);
        userItem.appendChild(userNameEl);
        userList.appendChild(userItem);
    }
    
    Object.values(users).forEach(user => {
        if (user.userId === userId) return;
        
        const userItem = document.createElement('div');
        userItem.className = 'user-item';
        if (isHost) userItem.classList.add('host');
        
        const userAvatar = document.createElement('div');
        userAvatar.className = 'user-avatar';
        userAvatar.style.backgroundColor = user.userColor;
        userAvatar.textContent = user.userName.substring(0, 1).toUpperCase();
        
        const userNameEl = document.createElement('div');
        userNameEl.className = 'user-name';
        userNameEl.textContent = user.userName;
        
        const userControls = document.createElement('div');
        userControls.className = 'user-controls';
        
        if (isHost) {
            const kickBtn = document.createElement('button');
            kickBtn.className = 'user-control';
            kickBtn.innerHTML = '<i class="fas fa-user-slash"></i>';
            kickBtn.title = 'Remove participant';
            kickBtn.onclick = () => {
                socket.emit('removeUser', { userId: user.userId, boardId });
            };
            userControls.appendChild(kickBtn);
        }
        
        userItem.appendChild(userAvatar);
        userItem.appendChild(userNameEl);
        userItem.appendChild(userControls);
        userList.appendChild(userItem);
    });
}

// Initialize the application
document.addEventListener('DOMContentLoaded', initWhiteboard);
