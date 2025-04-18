document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const whiteboard = document.getElementById('whiteboard');
    const ctx = whiteboard.getContext('2d');
    const userCursors = document.getElementById('userCursors');
    const colorPicker = document.getElementById('colorPicker');
    const brushSize = document.getElementById('brushSize');
    const clearBoard = document.getElementById('clearBoard');
    const undoAction = document.getElementById('undoAction');
    const redoAction = document.getElementById('redoAction');
    const addSlide = document.getElementById('addSlide');
    const prevSlide = document.getElementById('prevSlide');
    const nextSlide = document.getElementById('nextSlide');
    const slideCounter = document.getElementById('slideCounter');
    const slidesThumbnails = document.getElementById('slidesThumbnails');
    const saveBoard = document.getElementById('saveBoard');
    const loadBoard = document.getElementById('loadBoard');
    const exportBoard = document.getElementById('exportBoard');
    const toolButtons = document.querySelectorAll('.tool-btn[data-tool]');
    const localVideo = document.getElementById('localVideo');
    const remoteVideos = document.getElementById('remoteVideos');
    const toggleMic = document.getElementById('toggleMic');
    const toggleVideo = document.getElementById('toggleVideo');
    const toggleBackground = document.getElementById('toggleBackground');
    const participantsList = document.getElementById('participantsList');
    const participantCount = document.getElementById('participantCount');
    const userCount = document.getElementById('userCount');
    const chatPanel = document.getElementById('chatPanel');
    const chatMessages = document.getElementById('chatMessages');
    const chatInput = document.getElementById('chatInput');
    const sendMessage = document.getElementById('sendMessage');
    const closeChat = document.getElementById('closeChat');
    const settingsPanel = document.getElementById('settingsPanel');
    const closeSettings = document.getElementById('closeSettings');
    const inviteModal = document.getElementById('inviteModal');
    const meetingLink = document.getElementById('meetingLink');
    const meetingId = document.getElementById('meetingId');
    const copyLink = document.getElementById('copyLink');
    const copyId = document.getElementById('copyId');
    const closeInviteModal = document.getElementById('closeInviteModal');
    const inviteButton = document.getElementById('inviteButton');
    const moreOptions = document.getElementById('moreOptions');
    const waitingRoomModal = document.getElementById('waitingRoomModal');
    const leaveWaitingRoom = document.getElementById('leaveWaitingRoom');
    const leaveMeetingModal = document.getElementById('leaveMeetingModal');
    const confirmLeave = document.getElementById('confirmLeave');
    const cancelLeave = document.getElementById('cancelLeave');
    const leaveControl = document.getElementById('leaveControl');
    const micControl = document.getElementById('micControl');
    const videoControl = document.getElementById('videoControl');
    const screenShareControl = document.getElementById('screenShareControl');
    const raiseHand = document.getElementById('raiseHand');
    const participantsControl = document.getElementById('participantsControl');
    const moreControls = document.getElementById('moreControls');
    const chatOption = document.getElementById('chatOption');
    const screenShareOption = document.getElementById('screenShareOption');
    const settingsOption = document.getElementById('settingsOption');
    const recordOption = document.getElementById('recordOption');
    const leaveOption = document.getElementById('leaveOption');

    // Application State
    let state = {
        isDrawing: false,
        currentTool: 'pencil',
        color: '#000000',
        brushSize: 5,
        slides: [],
        currentSlide: 0,
        undoStack: [],
        redoStack: [],
        users: [],
        localStream: null,
        remoteStreams: {},
        socket: null,
        peerConnections: {},
        dataChannel: null,
        isHost: false,
        isInWaitingRoom: true,
        isMicOn: true,
        isVideoOn: true,
        isScreenSharing: false,
        isHandRaised: false,
        backgroundEffect: 'none',
        whiteboardBackground: 'white',
        autoSave: true,
        showCursors: true
    };

    // Initialize the application
    init();

    function init() {
        setupWhiteboard();
        setupEventListeners();
        setupSocketConnection();
        checkPreviousSession();
        showWaitingRoom();
    }

    function setupWhiteboard() {
        // Set canvas size
        resizeCanvas();
        
        // Create first slide
        createNewSlide();
        
        // Set initial background
        updateWhiteboardBackground();
    }

    function resizeCanvas() {
        const container = whiteboard.parentElement;
        whiteboard.width = container.clientWidth;
        whiteboard.height = container.clientHeight;
        
        // Redraw current slide
        if (state.slides.length > 0) {
            redrawSlide(state.currentSlide);
        }
    }

    function createNewSlide() {
        const slide = {
            id: Date.now(),
            data: [],
            thumbnail: null
        };
        
        state.slides.push(slide);
        state.currentSlide = state.slides.length - 1;
        updateSlideCounter();
        createSlideThumbnail(slide);
        
        // Clear undo/redo stacks for new slide
        state.undoStack[state.currentSlide] = [];
        state.redoStack[state.currentSlide] = [];
        
        // Clear canvas
        clearCanvas();
    }

    function createSlideThumbnail(slide) {
        const thumbnail = document.createElement('div');
        thumbnail.className = 'slide-thumbnail';
        thumbnail.innerHTML = `
            <canvas></canvas>
            <span class="slide-number">${state.slides.length}</span>
        `;
        
        thumbnail.addEventListener('click', () => {
            switchToSlide(state.slides.indexOf(slide));
        });
        
        slidesThumbnails.appendChild(thumbnail);
        updateThumbnail(slide, thumbnail);
    }

    function updateThumbnail(slide, thumbnailElement) {
        const thumbnailCanvas = thumbnailElement.querySelector('canvas');
        const thumbnailCtx = thumbnailCanvas.getContext('2d');
        
        // Set thumbnail size
        thumbnailCanvas.width = 200;
        thumbnailCanvas.height = 150;
        
        // Draw white background
        thumbnailCtx.fillStyle = 'white';
        thumbnailCtx.fillRect(0, 0, thumbnailCanvas.width, thumbnailCanvas.height);
        
        // Draw slide content
        if (slide.data.length > 0) {
            drawOnCanvas(thumbnailCtx, slide.data, 200 / whiteboard.width);
        }
        
        // Update active state
        thumbnailElement.classList.toggle('active', state.slides.indexOf(slide) === state.currentSlide);
    }

    function switchToSlide(index) {
        if (index >= 0 && index < state.slides.length) {
            state.currentSlide = index;
            redrawSlide(index);
            updateSlideCounter();
            
            // Update thumbnail active states
            document.querySelectorAll('.slide-thumbnail').forEach((thumb, i) => {
                thumb.classList.toggle('active', i === index);
            });
            
            // Broadcast slide change
            if (state.socket) {
                state.socket.emit('slideChanged', index);
            }
        }
    }

    function redrawSlide(index) {
        clearCanvas();
        const slide = state.slides[index];
        
        if (slide && slide.data) {
            drawOnCanvas(ctx, slide.data);
        }
    }

    function drawOnCanvas(context, drawingData, scale = 1) {
        drawingData.forEach(drawing => {
            context.strokeStyle = drawing.color;
            context.lineWidth = drawing.size * scale;
            context.lineCap = 'round';
            context.lineJoin = 'round';
            
            if (drawing.tool === 'pencil' || drawing.tool === 'line') {
                context.beginPath();
                context.moveTo(drawing.points[0].x * scale, drawing.points[0].y * scale);
                
                for (let i = 1; i < drawing.points.length; i++) {
                    context.lineTo(drawing.points[i].x * scale, drawing.points[i].y * scale);
                }
                
                context.stroke();
            } else if (drawing.tool === 'rectangle') {
                const start = drawing.points[0];
                const end = drawing.points[1];
                const width = end.x - start.x;
                const height = end.y - start.y;
                
                context.beginPath();
                context.rect(start.x * scale, start.y * scale, width * scale, height * scale);
                context.stroke();
            } else if (drawing.tool === 'circle') {
                const start = drawing.points[0];
                const end = drawing.points[1];
                const radius = Math.sqrt(
                    Math.pow(end.x - start.x, 2) + 
                    Math.pow(end.y - start.y, 2)
                );
                
                context.beginPath();
                context.arc(start.x * scale, start.y * scale, radius * scale, 0, Math.PI * 2);
                context.stroke();
            } else if (drawing.tool === 'text') {
                context.font = `${drawing.size * scale}px Arial`;
                context.fillStyle = drawing.color;
                context.fillText(drawing.text, drawing.points[0].x * scale, drawing.points[0].y * scale);
            }
        });
    }

    function clearCanvas() {
        ctx.clearRect(0, 0, whiteboard.width, whiteboard.height);
        
        // Apply whiteboard background
        updateWhiteboardBackground();
    }

    function updateWhiteboardBackground() {
        switch (state.whiteboardBackground) {
            case 'white':
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, whiteboard.width, whiteboard.height);
                break;
            case 'black':
                ctx.fillStyle = 'black';
                ctx.fillRect(0, 0, whiteboard.width, whiteboard.height);
                break;
            case 'grid':
                drawGridBackground('#f0f0f0', '#e0e0e0', 20);
                break;
            case 'dots':
                drawDotBackground('#f0f0f0', '#e0e0e0', 20);
                break;
        }
    }

    function drawGridBackground(bgColor, gridColor, gridSize) {
        // Fill background
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, whiteboard.width, whiteboard.height);
        
        // Draw grid
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;
        
        // Vertical lines
        for (let x = 0; x <= whiteboard.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, whiteboard.height);
            ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = 0; y <= whiteboard.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(whiteboard.width, y);
            ctx.stroke();
        }
    }

    function drawDotBackground(bgColor, dotColor, gridSize) {
        // Fill background
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, whiteboard.width, whiteboard.height);
        
        // Draw dots
        ctx.fillStyle = dotColor;
        
        for (let x = gridSize; x < whiteboard.width; x += gridSize) {
            for (let y = gridSize; y < whiteboard.height; y += gridSize) {
                ctx.beginPath();
                ctx.arc(x, y, 1, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    function updateSlideCounter() {
        slideCounter.textContent = `${state.currentSlide + 1}/${state.slides.length}`;
    }

    function saveDrawingState() {
        if (!state.undoStack[state.currentSlide]) {
            state.undoStack[state.currentSlide] = [];
        }
        
        // Save current drawing data
        const currentData = JSON.parse(JSON.stringify(state.slides[state.currentSlide].data));
        state.undoStack[state.currentSlide].push(currentData);
        
        // Limit undo stack size
        if (state.undoStack[state.currentSlide].length > 50) {
            state.undoStack[state.currentSlide].shift();
        }
        
        // Clear redo stack when new action is performed
        state.redoStack[state.currentSlide] = [];
    }

    function undo() {
        if (state.undoStack[state.currentSlide] && state.undoStack[state.currentSlide].length > 0) {
            const undoneData = state.undoStack[state.currentSlide].pop();
            
            if (!state.redoStack[state.currentSlide]) {
                state.redoStack[state.currentSlide] = [];
            }
            
            // Save current state to redo stack
            state.redoStack[state.currentSlide].push(JSON.parse(JSON.stringify(state.slides[state.currentSlide].data)));
            
            // Apply undone state
            state.slides[state.currentSlide].data = undoneData;
            redrawSlide(state.currentSlide);
            
            // Broadcast undo action
            if (state.socket) {
                state.socket.emit('drawingAction', {
                    type: 'undo',
                    slideIndex: state.currentSlide
                });
            }
        }
    }

    function redo() {
        if (state.redoStack[state.currentSlide] && state.redoStack[state.currentSlide].length > 0) {
            const redoneData = state.redoStack[state.currentSlide].pop();
            
            // Save current state to undo stack
            state.undoStack[state.currentSlide].push(JSON.parse(JSON.stringify(state.slides[state.currentSlide].data)));
            
            // Apply redone state
            state.slides[state.currentSlide].data = redoneData;
            redrawSlide(state.currentSlide);
            
            // Broadcast redo action
            if (state.socket) {
                state.socket.emit('drawingAction', {
                    type: 'redo',
                    slideIndex: state.currentSlide
                });
            }
        }
    }

    function saveWhiteboard() {
        const whiteboardData = {
            slides: state.slides,
            createdAt: new Date().toISOString()
        };
        
        // Convert to JSON
        const dataStr = JSON.stringify(whiteboardData);
        
        // Save to localStorage
        localStorage.setItem('whiteboard-save', dataStr);
        
        // Option to download as file
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `whiteboard-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification('Whiteboard saved successfully!');
    }

    function loadWhiteboard() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = e => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = event => {
                try {
                    const data = JSON.parse(event.target.result);
                    
                    if (data.slides && Array.isArray(data.slides)) {
                        // Clear current slides
                        state.slides = [];
                        state.currentSlide = 0;
                        state.undoStack = [];
                        state.redoStack = [];
                        slidesThumbnails.innerHTML = '';
                        
                        // Load new slides
                        data.slides.forEach(slide => {
                            state.slides.push({
                                id: slide.id || Date.now(),
                                data: slide.data || [],
                                thumbnail: null
                            });
                            
                            // Create undo/redo stacks
                            state.undoStack.push([]);
                            state.redoStack.push([]);
                            
                            // Create thumbnail
                            createSlideThumbnail(state.slides[state.slides.length - 1]);
                        });
                        
                        // Switch to first slide
                        if (state.slides.length > 0) {
                            switchToSlide(0);
                        } else {
                            createNewSlide();
                        }
                        
                        showNotification('Whiteboard loaded successfully!');
                        
                        // Broadcast load action to other users
                        if (state.socket) {
                            state.socket.emit('whiteboardLoaded', data.slides);
                        }
                    } else {
                        showNotification('Invalid whiteboard file format', 'error');
                    }
                } catch (err) {
                    console.error('Error loading whiteboard:', err);
                    showNotification('Error loading whiteboard file', 'error');
                }
            };
            
            reader.readAsText(file);
        };
        
        input.click();
    }

    function exportWhiteboard(format) {
        // Create a temporary canvas for export
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = whiteboard.width;
        exportCanvas.height = whiteboard.height;
        const exportCtx = exportCanvas.getContext('2d');
        
        // Draw white background
        exportCtx.fillStyle = 'white';
        exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
        
        // Draw current slide content
        if (state.slides[state.currentSlide] && state.slides[state.currentSlide].data) {
            drawOnCanvas(exportCtx, state.slides[state.currentSlide].data);
        }
        
        // Convert to requested format
        let mimeType, extension;
        switch (format) {
            case 'png':
                mimeType = 'image/png';
                extension = 'png';
                break;
            case 'jpg':
                mimeType = 'image/jpeg';
                extension = 'jpg';
                break;
            case 'pdf':
                // For PDF we'll use jsPDF library (would need to include it)
                if (typeof jsPDF !== 'undefined') {
                    const pdf = new jsPDF({
                        orientation: 'landscape',
                        unit: 'mm'
                    });
                    
                    // Calculate dimensions to fit the PDF page
                    const imgData = exportCanvas.toDataURL('image/jpeg', 1.0);
                    const pdfWidth = pdf.internal.pageSize.getWidth();
                    const pdfHeight = pdf.internal.pageSize.getHeight();
                    const ratio = exportCanvas.width / exportCanvas.height;
                    let width = pdfWidth;
                    let height = width / ratio;
                    
                    if (height > pdfHeight) {
                        height = pdfHeight;
                        width = height * ratio;
                    }
                    
                    pdf.addImage(imgData, 'JPEG', (pdfWidth - width) / 2, (pdfHeight - height) / 2, width, height);
                    pdf.save(`whiteboard-${new Date().toISOString().split('T')[0]}.pdf`);
                    showNotification('Whiteboard exported as PDF!');
                } else {
                    showNotification('PDF export requires jsPDF library', 'error');
                }
                return;
            default:
                mimeType = 'image/png';
                extension = 'png';
        }
        
        // For image formats
        const dataUrl = exportCanvas.toDataURL(mimeType);
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `whiteboard-${new Date().toISOString().split('T')[0]}.${extension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        showNotification(`Whiteboard exported as ${format.toUpperCase()}!`);
    }

    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    function setupEventListeners() {
        // Window events
        window.addEventListener('resize', resizeCanvas);
        window.addEventListener('beforeunload', handleBeforeUnload);
        
        // Whiteboard drawing events
        whiteboard.addEventListener('mousedown', startDrawing);
        whiteboard.addEventListener('mousemove', draw);
        whiteboard.addEventListener('mouseup', stopDrawing);
        whiteboard.addEventListener('mouseout', stopDrawing);
        
        whiteboard.addEventListener('touchstart', handleTouchStart);
        whiteboard.addEventListener('touchmove', handleTouchMove);
        whiteboard.addEventListener('touchend', handleTouchEnd);
        
        // Tool events
        toolButtons.forEach(button => {
            button.addEventListener('click', () => {
                setTool(button.dataset.tool);
            });
        });
        
        colorPicker.addEventListener('input', (e) => {
            state.color = e.target.value;
        });
        
        brushSize.addEventListener('input', (e) => {
            state.brushSize = parseInt(e.target.value);
        });
        
        clearBoard.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear the current slide?')) {
                clearCurrentSlide();
            }
        });
        
        undoAction.addEventListener('click', undo);
        redoAction.addEventListener('click', redo);
        
        // Slide management
        addSlide.addEventListener('click', createNewSlide);
        prevSlide.addEventListener('click', () => {
            if (state.currentSlide > 0) {
                switchToSlide(state.currentSlide - 1);
            }
        });
        
        nextSlide.addEventListener('click', () => {
            if (state.currentSlide < state.slides.length - 1) {
                switchToSlide(state.currentSlide + 1);
            }
        });
        
        // Save/Load/Export
        saveBoard.addEventListener('click', saveWhiteboard);
        loadBoard.addEventListener('click', loadWhiteboard);
        exportBoard.addEventListener('click', () => {
            // Show export options
            const exportMenu = document.createElement('div');
            exportMenu.className = 'export-menu';
            exportMenu.innerHTML = `
                <button data-format="png">PNG</button>
                <button data-format="jpg">JPG</button>
                <button data-format="pdf">PDF</button>
            `;
            
            exportMenu.style.position = 'absolute';
            exportMenu.style.bottom = '50px';
            exportMenu.style.right = '10px';
            exportMenu.style.backgroundColor = 'white';
            exportMenu.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
            exportMenu.style.borderRadius = '5px';
            exportMenu.style.overflow = 'hidden';
            exportMenu.style.zIndex = '100';
            
            exportMenu.querySelectorAll('button').forEach(btn => {
                btn.addEventListener('click', () => {
                    exportWhiteboard(btn.dataset.format);
                    document.body.removeChild(exportMenu);
                });
            });
            
            document.body.appendChild(exportMenu);
            
            // Close menu when clicking elsewhere
            const closeMenu = (e) => {
                if (!exportMenu.contains(e.target) {
                    document.body.removeChild(exportMenu);
                    document.removeEventListener('click', closeMenu);
                }
            };
            
            setTimeout(() => {
                document.addEventListener('click', closeMenu);
            }, 0);
        });
        
        // Video controls
        toggleMic.addEventListener('click', toggleMicrophone);
        toggleVideo.addEventListener('click', toggleVideoStream);
        toggleBackground.addEventListener('click', toggleVirtualBackground);
        
        // Bottom controls
        micControl.addEventListener('click', toggleMicrophone);
        videoControl.addEventListener('click', toggleVideoStream);
        screenShareControl.addEventListener('click', toggleScreenSharing);
        raiseHand.addEventListener('click', toggleRaiseHand);
        participantsControl.addEventListener('click', toggleParticipantsPanel);
        moreControls.addEventListener('click', showMoreControls);
        leaveControl.addEventListener('click', showLeaveModal);
        
        // Chat controls
        chatOption.addEventListener('click', toggleChatPanel);
        closeChat.addEventListener('click', toggleChatPanel);
        sendMessage.addEventListener('click', sendChatMessage);
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendChatMessage();
            }
        });
        
        // Settings controls
        settingsOption.addEventListener('click', toggleSettingsPanel);
        closeSettings.addEventListener('click', toggleSettingsPanel);
        
        // Invite controls
        inviteButton.addEventListener('click', showInviteModal);
        copyLink.addEventListener('click', copyMeetingLink);
        copyId.addEventListener('click', copyMeetingId);
        closeInviteModal.addEventListener('click', hideInviteModal);
        
        // Waiting room controls
        leaveWaitingRoom.addEventListener('click', leaveWaitingRoom);
        
        // Leave meeting controls
        leaveOption.addEventListener('click', showLeaveModal);
        confirmLeave.addEventListener('click', leaveMeeting);
        cancelLeave.addEventListener('click', hideLeaveModal);
    }

    function setTool(tool) {
        state.currentTool = tool;
        
        // Update active state of tool buttons
        toolButtons.forEach(button => {
            button.classList.toggle('active', button.dataset.tool === tool);
        });
        
        // Change cursor based on tool
        switch (tool) {
            case 'pencil':
            case 'line':
                whiteboard.style.cursor = 'crosshair';
                break;
            case 'rectangle':
            case 'circle':
                whiteboard.style.cursor = 'crosshair';
                break;
            case 'text':
                whiteboard.style.cursor = 'text';
                break;
            case 'eraser':
                whiteboard.style.cursor = 'url("eraser.cur"), auto';
                break;
            default:
                whiteboard.style.cursor = 'default';
        }
    }

    function startDrawing(e) {
        if (state.currentTool === 'text') {
            // For text tool, show a text input at the clicked position
            showTextInput(e.clientX, e.clientY);
            return;
        }
        
        state.isDrawing = true;
        
        // Get position relative to canvas
        const rect = whiteboard.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Start a new drawing
        const newDrawing = {
            tool: state.currentTool,
            color: state.color,
            size: state.brushSize,
            points: [{ x, y }]
        };
        
        // For shapes, we need exactly 2 points (start and end)
        if (state.currentTool === 'rectangle' || state.currentTool === 'circle') {
            newDrawing.points.push({ x, y });
        }
        
        // Add to current slide's data
        state.slides[state.currentSlide].data.push(newDrawing);
        
        // Save state for undo
        saveDrawingState();
        
        // Broadcast drawing start
        if (state.socket) {
            state.socket.emit('drawingAction', {
                type: 'start',
                tool: state.currentTool,
                color: state.color,
                size: state.brushSize,
                x,
                y,
                slideIndex: state.currentSlide
            });
        }
    }

    function draw(e) {
        if (!state.isDrawing) {
            // Update cursor position for other users
            if (state.socket && state.showCursors) {
                const rect = whiteboard.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                state.socket.emit('cursorMove', { x, y });
            }
            return;
        }
        
        const rect = whiteboard.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Get current drawing
        const currentDrawing = state.slides[state.currentSlide].data[state.slides[state.currentSlide].data.length - 1];
        
        // For shapes, update the end point
        if (state.currentTool === 'rectangle' || state.currentTool === 'circle') {
            currentDrawing.points[1] = { x, y };
        } else {
            // For pencil/line, add a new point
            currentDrawing.points.push({ x, y });
        }
        
        // Redraw canvas
        redrawSlide(state.currentSlide);
        
        // Broadcast drawing update
        if (state.socket) {
            state.socket.emit('drawingAction', {
                type: 'draw',
                x,
                y,
                slideIndex: state.currentSlide
            });
        }
    }

    function stopDrawing() {
        if (!state.isDrawing) return;
        
        state.isDrawing = false;
        
        // Broadcast drawing end
        if (state.socket) {
            state.socket.emit('drawingAction', {
                type: 'end',
                slideIndex: state.currentSlide
            });
        }
        
        // Update thumbnail
        updateThumbnail(state.slides[state.currentSlide], 
                       document.querySelectorAll('.slide-thumbnail')[state.currentSlide]);
    }

    function handleTouchStart(e) {
        e.preventDefault();
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousedown', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            whiteboard.dispatchEvent(mouseEvent);
        }
    }

    function handleTouchMove(e) {
        e.preventDefault();
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            whiteboard.dispatchEvent(mouseEvent);
        }
    }

    function handleTouchEnd(e) {
        e.preventDefault();
        const mouseEvent = new MouseEvent('mouseup', {});
        whiteboard.dispatchEvent(mouseEvent);
    }

    function showTextInput(x, y) {
        const rect = whiteboard.getBoundingClientRect();
        const canvasX = x - rect.left;
        const canvasY = y - rect.top;
        
        const input = document.createElement('input');
        input.type = 'text';
        input.style.position = 'absolute';
        input.style.left = `${x}px`;
        input.style.top = `${y}px`;
        input.style.zIndex = '1000';
        input.style.fontSize = `${state.brushSize}px`;
        input.style.color = state.color;
        input.style.background = 'transparent';
        input.style.border = '1px dashed #999';
        input.style.outline = 'none';
        input.style.padding = '2px 5px';
        
        document.body.appendChild(input);
        input.focus();
        
        input.addEventListener('blur', () => {
            if (input.value.trim()) {
                // Add text to drawing
                const newDrawing = {
                    tool: 'text',
                    color: state.color,
                    size: state.brushSize,
                    text: input.value.trim(),
                    points: [{ x: canvasX, y: canvasY }]
                };
                
                state.slides[state.currentSlide].data.push(newDrawing);
                redrawSlide(state.currentSlide);
                
                // Save state for undo
                saveDrawingState();
                
                // Broadcast text addition
                if (state.socket) {
                    state.socket.emit('drawingAction', {
                        type: 'text',
                        color: state.color,
                        size: state.brushSize,
                        text: input.value.trim(),
                        x: canvasX,
                        y: canvasY,
                        slideIndex: state.currentSlide
                    });
                }
                
                // Update thumbnail
                updateThumbnail(state.slides[state.currentSlide], 
                               document.querySelectorAll('.slide-thumbnail')[state.currentSlide]);
            }
            
            document.body.removeChild(input);
        });
        
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                input.blur();
            }
        });
    }

    function clearCurrentSlide() {
        state.slides[state.currentSlide].data = [];
        clearCanvas();
        
        // Save state for undo
        saveDrawingState();
        
        // Broadcast clear action
        if (state.socket) {
            state.socket.emit('drawingAction', {
                type: 'clear',
                slideIndex: state.currentSlide
            });
        }
        
        // Update thumbnail
        updateThumbnail(state.slides[state.currentSlide], 
                       document.querySelectorAll('.slide-thumbnail')[state.currentSlide]);
    }

    function setupSocketConnection() {
        // Connect to Socket.io server
        const socket = io('https://your-socket-server.com');
        state.socket = socket;
        
        // Get meeting ID from URL or generate a new one
        const urlParams = new URLSearchParams(window.location.search);
        let meetingId = urlParams.get('meeting');
        
        if (!meetingId) {
            meetingId = generateMeetingId();
            window.history.replaceState({}, '', `?meeting=${meetingId}`);
            state.isHost = true;
        }
        
        // Set meeting link and ID
        state.meetingId = meetingId;
        meetingLink.value = window.location.href;
        meetingId.value = meetingId;
        
        // Join meeting
        socket.emit('joinMeeting', {
            meetingId,
            user: {
                name: getUserName(),
                id: getUserId()
            }
        });
        
        // Socket event listeners
        socket.on('connect', () => {
            console.log('Connected to socket server');
        });
        
        socket.on('disconnect', () => {
            console.log('Disconnected from socket server');
        });
        
        socket.on('userJoined', (user) => {
            addUser(user);
            
            // If host, approve or reject the user
            if (state.isHost && state.isInWaitingRoom) {
                // In a real app, you'd show a UI to approve/reject
                // For demo, auto-approve
                socket.emit('approveUser', { userId: user.id, approved: true });
            }
        });
        
        socket.on('userLeft', (userId) => {
            removeUser(userId);
            showNotification(`${getUserById(userId)?.name || 'A user'} has left the whiteboard`);
        });
        
        socket.on('userApproved', (approved) => {
            if (approved) {
                state.isInWaitingRoom = false;
                hideWaitingRoom();
                setupVideoChat();
            } else {
                showNotification('Host has not approved your entry yet', 'error');
            }
        });
        
        socket.on('drawingAction', (data) => {
            handleRemoteDrawing(data);
        });
        
        socket.on('cursorMove', (data) => {
            updateUserCursor(data.userId, data.x, data.y);
        });
        
        socket.on('slideChanged', (slideIndex) => {
            if (slideIndex !== state.currentSlide) {
                switchToSlide(slideIndex);
            }
        });
        
        socket.on('whiteboardLoaded', (slides) => {
            // Replace current slides with loaded ones
            state.slides = slides.map(slide => ({
                id: slide.id || Date.now(),
                data: slide.data || [],
                thumbnail: null
            }));
            
            // Reset thumbnails
            slidesThumbnails.innerHTML = '';
            state.slides.forEach(slide => createSlideThumbnail(slide));
            
            // Switch to first slide
            if (state.slides.length > 0) {
                switchToSlide(0);
            }
            
            showNotification('Whiteboard loaded by host');
        });
        
        socket.on('chatMessage', (message) => {
            addChatMessage(message);
        });
        
        socket.on('userRaisedHand', (userId) => {
            const user = getUserById(userId);
            if (user) {
                user.isHandRaised = true;
                updateParticipantList();
                showNotification(`${user.name} raised their hand`);
            }
        });
        
        socket.on('userLoweredHand', (userId) => {
            const user = getUserById(userId);
            if (user) {
                user.isHandRaised = false;
                updateParticipantList();
            }
        });
    }

    function generateMeetingId() {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    function getUserName() {
        // In a real app, you'd get this from user input or auth system
        return `User${Math.floor(Math.random() * 1000)}`;
    }

    function getUserId() {
        // Generate a unique ID for the user
        if (!localStorage.getItem('userId')) {
            localStorage.setItem('userId', Math.random().toString(36).substring(2, 15));
        }
        return localStorage.getItem('userId');
    }

    function addUser(user) {
        if (!state.users.some(u => u.id === user.id)) {
            state.users.push({
                ...user,
                isHandRaised: false
            });
            
            updateUserCount();
            updateParticipantList();
            
            if (!state.isInWaitingRoom) {
                showNotification(`${user.name} has joined the whiteboard`);
            }
        }
    }

    function removeUser(userId) {
        state.users = state.users.filter(user => user.id !== userId);
        updateUserCount();
        updateParticipantList();
        
        // Remove remote video if exists
        const videoContainer = document.getElementById(`remoteVideo-${userId}`);
        if (videoContainer) {
            videoContainer.remove();
        }
        
        // Remove cursor if exists
        const cursor = document.getElementById(`cursor-${userId}`);
        if (cursor) {
            cursor.remove();
        }
    }

    function getUserById(userId) {
        return state.users.find(user => user.id === userId);
    }

    function updateUserCount() {
        userCount.textContent = state.users.length + 1; // +1 for local user
        participantCount.textContent = state.users.length + 1;
    }

    function updateParticipantList() {
        participantsList.innerHTML = '';
        
        // Add local user first
        addParticipantItem({
            id: getUserId(),
            name: 'You (Me)',
            isHandRaised: state.isHandRaised
        }, true);
        
        // Add remote users
        state.users.forEach(user => {
            addParticipantItem(user, false);
        });
    }

    function addParticipantItem(user, isLocal) {
        const participant = document.createElement('div');
        participant.className = 'participant-item';
        participant.id = `participant-${user.id}`;
        
        const avatar = document.createElement('div');
        avatar.className = 'participant-avatar';
        avatar.textContent = user.name.charAt(0).toUpperCase();
        
        const name = document.createElement('div');
        name.className = 'participant-name';
        name.textContent = user.name;
        
        const status = document.createElement('div');
        status.className = 'participant-status';
        status.textContent = isLocal ? 'Me' : 'Connected';
        
        const controls = document.createElement('div');
        controls.className = 'participant-controls';
        
        if (!isLocal && state.isHost) {
            const muteBtn = document.createElement('button');
            muteBtn.className = 'btn-icon';
            muteBtn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
            muteBtn.title = 'Mute';
            controls.appendChild(muteBtn);
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'btn-icon';
            removeBtn.innerHTML = '<i class="fas fa-times"></i>';
            removeBtn.title = 'Remove';
            removeBtn.addEventListener('click', () => {
                if (confirm(`Remove ${user.name} from the meeting?`)) {
                    state.socket.emit('removeUser', user.id);
                }
            });
            controls.appendChild(removeBtn);
        }
        
        if (user.isHandRaised) {
            const handIcon = document.createElement('span');
            handIcon.className = 'raise-hand';
            handIcon.innerHTML = '<i class="fas fa-hand-paper"></i>';
            name.appendChild(handIcon);
        }
        
        participant.appendChild(avatar);
        participant.appendChild(name);
        participant.appendChild(status);
        participant.appendChild(controls);
        
        participantsList.appendChild(participant);
    }

    function handleRemoteDrawing(data) {
        switch (data.type) {
            case 'start':
                // Start a new drawing
                const newDrawing = {
                    tool: data.tool,
                    color: data.color,
                    size: data.size,
                    points: [{ x: data.x, y: data.y }]
                };
                
                if (data.tool === 'rectangle' || data.tool === 'circle') {
                    newDrawing.points.push({ x: data.x, y: data.y });
                }
                
                state.slides[data.slideIndex].data.push(newDrawing);
                break;
                
            case 'draw':
                // Update current drawing
                const currentDrawing = state.slides[data.slideIndex].data[state.slides[data.slideIndex].data.length - 1];
                
                if (currentDrawing.tool === 'rectangle' || currentDrawing.tool === 'circle') {
                    currentDrawing.points[1] = { x: data.x, y: data.y };
                } else {
                    currentDrawing.points.push({ x: data.x, y: data.y });
                }
                break;
                
            case 'end':
                // No action needed for end
                break;
                
            case 'text':
                // Add text to drawing
                const textDrawing = {
                    tool: 'text',
                    color: data.color,
                    size: data.size,
                    text: data.text,
                    points: [{ x: data.x, y: data.y }]
                };
                
                state.slides[data.slideIndex].data.push(textDrawing);
                break;
                
            case 'clear':
                // Clear current slide
                state.slides[data.slideIndex].data = [];
                break;
                
            case 'undo':
                // Undo last action
                if (state.undoStack[data.slideIndex] && state.undoStack[data.slideIndex].length > 0) {
                    const undoneData = state.undoStack[data.slideIndex].pop();
                    state.redoStack[data.slideIndex].push(JSON.parse(JSON.stringify(state.slides[data.slideIndex].data)));
                    state.slides[data.slideIndex].data = undoneData;
                }
                break;
                
            case 'redo':
                // Redo last undone action
                if (state.redoStack[data.slideIndex] && state.redoStack[data.slideIndex].length > 0) {
                    const redoneData = state.redoStack[data.slideIndex].pop();
                    state.undoStack[data.slideIndex].push(JSON.parse(JSON.stringify(state.slides[data.slideIndex].data)));
                    state.slides[data.slideIndex].data = redoneData;
                }
                break;
        }
        
        // Redraw slide if it's the current one
        if (data.slideIndex === state.currentSlide) {
            redrawSlide(state.currentSlide);
        }
        
        // Update thumbnail
        updateThumbnail(state.slides[data.slideIndex], 
                       document.querySelectorAll('.slide-thumbnail')[data.slideIndex]);
    }

    function updateUserCursor(userId, x, y) {
        if (!state.showCursors) return;
        
        let cursor = document.getElementById(`cursor-${userId}`);
        
        if (!cursor) {
            cursor = document.createElement('div');
            cursor.id = `cursor-${userId}`;
            cursor.className = 'user-cursor';
            cursor.style.backgroundColor = getColorForUserId(userId);
            cursor.setAttribute('data-name', getUserById(userId)?.name || 'Unknown');
            userCursors.appendChild(cursor);
        }
        
        cursor.style.left = `${x}px`;
        cursor.style.top = `${y}px`;
    }

    function getColorForUserId(userId) {
        // Generate a consistent color based on user ID
        const hash = userId.split('').reduce((acc, char) => {
            return char.charCodeAt(0) + ((acc << 5) - acc);
        }, 0);
        
        const hue = Math.abs(hash) % 360;
        return `hsl(${hue}, 80%, 60%)`;
    }

    function setupVideoChat() {
        // Get user media
        navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true
        }).then(stream => {
            state.localStream = stream;
            localVideo.srcObject = stream;
            
            // Setup WebRTC connections with other users
            state.users.forEach(user => {
                if (user.id !== getUserId()) {
                    setupPeerConnection(user.id);
                }
            });
        }).catch(err => {
            console.error('Error accessing media devices:', err);
            showNotification('Could not access camera/microphone', 'error');
        });
    }

    function setupPeerConnection(userId) {
        // Create RTCPeerConnection
        const configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' }
                // Add your TURN servers here if needed
            ]
        };
        
        const peerConnection = new RTCPeerConnection(configuration);
        state.peerConnections[userId] = peerConnection;
        
        // Add local stream to connection
        if (state.localStream) {
            state.localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, state.localStream);
            });
        }
        
        // Handle incoming tracks
        peerConnection.ontrack = (event) => {
            const remoteStream = event.streams[0];
            state.remoteStreams[userId] = remoteStream;
            
            // Create video element for remote stream
            const videoContainer = document.createElement('div');
            videoContainer.className = 'remote-video-container';
            videoContainer.id = `remoteVideo-${userId}`;
            
            const video = document.createElement('video');
            video.autoplay = true;
            video.playsInline = true;
            video.srcObject = remoteStream;
            
            const name = document.createElement('div');
            name.className = 'user-name';
            name.textContent = getUserById(userId)?.name || 'Unknown';
            
            videoContainer.appendChild(video);
            videoContainer.appendChild(name);
            remoteVideos.appendChild(videoContainer);
        };
        
        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                state.socket.emit('iceCandidate', {
                    to: userId,
                    candidate: event.candidate
                });
            }
        };
        
        // Create offer
        peerConnection.createOffer()
            .then(offer => peerConnection.setLocalDescription(offer))
            .then(() => {
                state.socket.emit('offer', {
                    to: userId,
                    offer: peerConnection.localDescription
                });
            })
            .catch(err => {
                console.error('Error creating offer:', err);
            });
        
        // Listen for answer
        state.socket.on('answer', (data) => {
            if (data.from === userId) {
                peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer))
                    .catch(err => {
                        console.error('Error setting remote description:', err);
                    });
            }
        });
        
        // Listen for ICE candidates
        state.socket.on('iceCandidate', (data) => {
            if (data.from === userId) {
                peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate))
                    .catch(err => {
                        console.error('Error adding ICE candidate:', err);
                    });
            }
        });
    }

    function toggleMicrophone() {
        if (state.localStream) {
            const audioTracks = state.localStream.getAudioTracks();
            if (audioTracks.length > 0) {
                state.isMicOn = !audioTracks[0].enabled;
                audioTracks[0].enabled = state.isMicOn;
                
                // Update UI
                toggleMic.classList.toggle('active', state.isMicOn);
                micControl.classList.toggle('active', state.isMicOn);
                
                // Broadcast mute state
                if (state.socket) {
                    state.socket.emit('muteState', {
                        isMuted: !state.isMicOn
                    });
                }
            }
        }
    }

    function toggleVideoStream() {
        if (state.localStream) {
            const videoTracks = state.localStream.getVideoTracks();
            if (videoTracks.length > 0) {
                state.isVideoOn = !videoTracks[0].enabled;
                videoTracks[0].enabled = state.isVideoOn;
                
                // Update UI
                toggleVideo.classList.toggle('active', state.isVideoOn);
                videoControl.classList.toggle('active', state.isVideoOn);
            }
        }
    }

    function toggleVirtualBackground() {
        // In a real app, you'd use a library like TensorFlow.js or a WebGL shader
        // This is a simplified version that just toggles between blur and none
        state.backgroundEffect = state.backgroundEffect === 'blur' ? 'none' : 'blur';
        
        // Update UI
        toggleBackground.classList.toggle('active', state.backgroundEffect !== 'none');
        
        // Apply effect (simplified)
        if (state.backgroundEffect === 'blur') {
            localVideo.style.filter = 'blur(10px)';
        } else {
            localVideo.style.filter = 'none';
        }
    }

    function toggleScreenSharing() {
        if (state.isScreenSharing) {
            stopScreenSharing();
        } else {
            startScreenSharing();
        }
    }

    function startScreenSharing() {
        navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true
        }).then(stream => {
            state.screenStream = stream;
            state.isScreenSharing = true;
            
            // Replace video track in all peer connections
            const videoTrack = stream.getVideoTracks()[0];
            
            Object.values(state.peerConnections).forEach(pc => {
                const sender = pc.getSenders().find(s => s.track.kind === 'video');
                if (sender) {
                    sender.replaceTrack(videoTrack);
                }
            });
            
            // Update UI
            screenShareControl.classList.add('active');
            
            // Handle when user stops sharing
            videoTrack.onended = () => {
                stopScreenSharing();
            };
        }).catch(err => {
            console.error('Error sharing screen:', err);
            showNotification('Could not share screen', 'error');
        });
    }

    function stopScreenSharing() {
        if (state.screenStream) {
            state.screenStream.getTracks().forEach(track => track.stop());
            state.screenStream = null;
        }
        
        state.isScreenSharing = false;
        
        // Restore camera video track in all peer connections
        if (state.localStream) {
            const videoTrack = state.localStream.getVideoTracks()[0];
            
            Object.values(state.peerConnections).forEach(pc => {
                const sender = pc.getSenders().find(s => s.track.kind === 'video');
                if (sender && videoTrack) {
                    sender.replaceTrack(videoTrack);
                }
            });
        }
        
        // Update UI
        screenShareControl.classList.remove('active');
    }

    function toggleRaiseHand() {
        state.isHandRaised = !state.isHandRaised;
        
        // Update UI
        raiseHand.classList.toggle('raise-hand', state.isHandRaised);
        
        // Broadcast state
        if (state.socket) {
            if (state.isHandRaised) {
                state.socket.emit('raiseHand');
                showNotification('You raised your hand');
            } else {
                state.socket.emit('lowerHand');
            }
        }
        
        // Update participant list
        updateParticipantList();
    }

    function toggleParticipantsPanel() {
        // In mobile view, this would show/hide the right panel
        const rightPanel = document.querySelector('.right-panel');
        rightPanel.classList.toggle('active');
        participantsControl.classList.toggle('active', rightPanel.classList.contains('active'));
    }

    function showMoreControls() {
        // Show a menu with additional controls
        const menu = document.createElement('div');
        menu.className = 'more-controls-menu';
        menu.innerHTML = `
            <button id="recordBtn"><i class="fas fa-circle"></i> Record</button>
            <button id="inviteBtn"><i class="fas fa-user-plus"></i> Invite</button>
            <button id="settingsBtn"><i class="fas fa-cog"></i> Settings</button>
            <button id="chatBtn"><i class="fas fa-comment"></i> Chat</button>
        `;
        
        menu.style.position = 'absolute';
        menu.style.bottom = '60px';
        menu.style.right = '10px';
        menu.style.backgroundColor = 'white';
        menu.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
        menu.style.borderRadius = '5px';
        menu.style.overflow = 'hidden';
        menu.style.zIndex = '100';
        
        document.body.appendChild(menu);
        
        // Add event listeners
        menu.querySelector('#recordBtn').addEventListener('click', () => {
            toggleRecording();
            document.body.removeChild(menu);
        });
        
        menu.querySelector('#inviteBtn').addEventListener('click', () => {
            showInviteModal();
            document.body.removeChild(menu);
        });
        
        menu.querySelector('#settingsBtn').addEventListener('click', () => {
            toggleSettingsPanel();
            document.body.removeChild(menu);
        });
        
        menu.querySelector('#chatBtn').addEventListener('click', () => {
            toggleChatPanel();
            document.body.removeChild(menu);
        });
        
        // Close menu when clicking elsewhere
        const closeMenu = (e) => {
            if (!menu.contains(e.target) && e.target !== moreControls) {
                document.body.removeChild(menu);
                document.removeEventListener('click', closeMenu);
            }
        };
        
        setTimeout(() => {
            document.addEventListener('click', closeMenu);
        }, 0);
    }

    function toggleRecording() {
        // In a real app, you'd use the MediaRecorder API
        showNotification('Recording feature would be implemented here');
    }

    function toggleChatPanel() {
        chatPanel.classList.toggle('active');
    }

    function sendChatMessage() {
        const message = chatInput.value.trim();
        if (message) {
            const chatMessage = {
                id: Date.now(),
                sender: {
                    id: getUserId(),
                    name: 'You'
                },
                text: message,
                timestamp: new Date().toISOString()
            };
            
            // Add to local chat
            addChatMessage(chatMessage);
            
            // Broadcast to others
            if (state.socket) {
                state.socket.emit('chatMessage', chatMessage);
            }
            
            // Clear input
            chatInput.value = '';
        }
    }

    function addChatMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${message.sender.id === getUserId() ? 'sent' : 'received'}`;
        
        const senderElement = document.createElement('div');
        senderElement.className = 'message-sender';
        senderElement.textContent = message.sender.name;
        
        const textElement = document.createElement('div');
        textElement.className = 'message-text';
        textElement.textContent = message.text;
        
        const timeElement = document.createElement('div');
        timeElement.className = 'message-time';
        timeElement.textContent = new Date(message.timestamp).toLocaleTimeString();
        
        messageElement.appendChild(senderElement);
        messageElement.appendChild(textElement);
        messageElement.appendChild(timeElement);
        
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function toggleSettingsPanel() {
        settingsPanel.classList.toggle('active');
    }

    function showInviteModal() {
        inviteModal.style.display = 'flex';
    }

    function hideInviteModal() {
        inviteModal.style.display = 'none';
    }

    function copyMeetingLink() {
        meetingLink.select();
        document.execCommand('copy');
        showNotification('Meeting link copied to clipboard!');
    }

    function copyMeetingId() {
        meetingId.select();
        document.execCommand('copy');
        showNotification('Meeting ID copied to clipboard!');
    }

    function showWaitingRoom() {
        waitingRoomModal.style.display = 'flex';
        
        // Populate device selectors
        populateDeviceSelectors();
    }

    function hideWaitingRoom() {
        waitingRoomModal.style.display = 'none';
    }

    function leaveWaitingRoom() {
        if (state.socket) {
            state.socket.emit('leaveWaitingRoom');
        }
        window.location.href = '/';
    }

    function populateDeviceSelectors() {
        navigator.mediaDevices.enumerateDevices()
            .then(devices => {
                const micSelect = document.getElementById('micSelect');
                const cameraSelect = document.getElementById('cameraSelect');
                
                // Clear existing options
                micSelect.innerHTML = '';
                cameraSelect.innerHTML = '';
                
                // Add default options
                const defaultMicOption = document.createElement('option');
                defaultMicOption.value = 'default';
                defaultMicOption.textContent = 'Default Microphone';
                micSelect.appendChild(defaultMicOption);
                
                const defaultCameraOption = document.createElement('option');
                defaultCameraOption.value = 'default';
                defaultCameraOption.textContent = 'Default Camera';
                cameraSelect.appendChild(defaultCameraOption);
                
                // Add available devices
                devices.forEach(device => {
                    const option = document.createElement('option');
                    option.value = device.deviceId;
                    option.textContent = device.label || `${device.kind} (${device.deviceId.slice(0, 5)})`;
                    
                    if (device.kind === 'audioinput') {
                        micSelect.appendChild(option);
                    } else if (device.kind === 'videoinput') {
                        cameraSelect.appendChild(option);
                    }
                });
            })
            .catch(err => {
                console.error('Error enumerating devices:', err);
            });
    }

    function showLeaveModal() {
        leaveMeetingModal.style.display = 'flex';
    }

    function hideLeaveModal() {
        leaveMeetingModal.style.display = 'none';
    }

    function leaveMeeting() {
        // Clean up resources
        if (state.localStream) {
            state.localStream.getTracks().forEach(track => track.stop());
        }
        
        if (state.screenStream) {
            state.screenStream.getTracks().forEach(track => track.stop());
        }
        
        Object.values(state.peerConnections).forEach(pc => pc.close());
        
        // Notify server
        if (state.socket) {
            state.socket.emit('leaveMeeting');
            state.socket.disconnect();
        }
        
        // Redirect or show leave screen
        window.location.href = '/leave.html';
    }

    function handleBeforeUnload(e) {
        if (state.autoSave) {
            saveWhiteboard();
        }
        
        // Show confirmation if there are unsaved changes
        if (hasUnsavedChanges()) {
            e.preventDefault();
            e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            return e.returnValue;
        }
    }

    function hasUnsavedChanges() {
        // Check if there are any drawings that haven't been saved
        return state.slides.some(slide => slide.data.length > 0);
    }

    function checkPreviousSession() {
        // Check if there's a previous session to restore
        const savedData = localStorage.getItem('whiteboard-save');
        if (savedData && confirm('Would you like to continue from your previous whiteboard session?')) {
            try {
                const data = JSON.parse(savedData);
                
                if (data.slides && Array.isArray(data.slides)) {
                    // Clear current slides
                    state.slides = [];
                    state.currentSlide = 0;
                    state.undoStack = [];
                    state.redoStack = [];
                    slidesThumbnails.innerHTML = '';
                    
                    // Load saved slides
                    data.slides.forEach(slide => {
                        state.slides.push({
                            id: slide.id || Date.now(),
                            data: slide.data || [],
                            thumbnail: null
                        });
                        
                        // Create undo/redo stacks
                        state.undoStack.push([]);
                        state.redoStack.push([]);
                        
                        // Create thumbnail
                        createSlideThumbnail(state.slides[state.slides.length - 1]);
                    });
                    
                    // Switch to first slide
                    if (state.slides.length > 0) {
                        switchToSlide(0);
                    } else {
                        createNewSlide();
                    }
                    
                    showNotification('Previous whiteboard session restored');
                }
            } catch (err) {
                console.error('Error loading previous session:', err);
            }
        }
    }
});
