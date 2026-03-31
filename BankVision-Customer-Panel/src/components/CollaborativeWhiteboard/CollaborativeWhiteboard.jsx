import { useState, useRef, useEffect, useCallback } from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import {
  Close as CloseIcon,
  Edit as PenIcon,
  AutoFixNormal as EraserIcon,
  Undo as UndoIcon,
  DeleteOutline as ClearIcon,
} from '@mui/icons-material';
import PropTypes from 'prop-types';

const COLORS = [
  { name: 'Black', value: '#1A1A1A' },
  { name: 'Red', value: '#E53935' },
  { name: 'Blue', value: '#1E88E5' },
  { name: 'Green', value: '#43A047' },
];

const PEN_WIDTH = 3;
const ERASER_WIDTH = 20;

const CollaborativeWhiteboard = ({ open, onClose, socket, role }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef(null);

  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState(COLORS[0].value);
  const [strokes, setStrokes] = useState([]);
  const strokesRef = useRef([]);

  // Keep ref in sync with state for use in socket callbacks
  useEffect(() => {
    strokesRef.current = strokes;
  }, [strokes]);

  // Resize canvas to match container
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    // Redraw all strokes after resize
    redrawAll(strokesRef.current, rect.width, rect.height);
  }, []);

  // Draw a single stroke on the canvas
  const drawStroke = useCallback((stroke, canvasWidth, canvasHeight) => {
    const canvas = canvasRef.current;
    if (!canvas || !stroke.points || stroke.points.length < 2) return;

    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (stroke.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = stroke.lineWidth * canvasWidth / 100;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.lineWidth * canvasWidth / 100;
    }

    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x * canvasWidth, stroke.points[0].y * canvasHeight);
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x * canvasWidth, stroke.points[i].y * canvasHeight);
    }
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  }, []);

  // Redraw all strokes
  const redrawAll = useCallback((allStrokes, width, height) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const w = width || canvas.style.width?.replace('px', '') || canvas.width;
    const h = height || canvas.style.height?.replace('px', '') || canvas.height;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    allStrokes.forEach((stroke) => drawStroke(stroke, Number(w), Number(h)));
  }, [drawStroke]);

  // Setup resize observer
  useEffect(() => {
    if (!open) return;

    const timer = setTimeout(resizeCanvas, 50);
    window.addEventListener('resize', resizeCanvas);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [open, resizeCanvas]);

  // Socket event listeners
  useEffect(() => {
    if (!socket || !open) return;

    const handleRemoteStroke = (data) => {
      if (data.senderRole === role) return; // Ignore own echoes
      const newStrokes = [...strokesRef.current, data];
      strokesRef.current = newStrokes;
      setStrokes(newStrokes);

      const canvas = canvasRef.current;
      if (canvas) {
        const w = parseFloat(canvas.style.width);
        const h = parseFloat(canvas.style.height);
        drawStroke(data, w, h);
      }
    };

    const handleRemoteClear = (data) => {
      if (data.senderRole === role) return;
      strokesRef.current = [];
      setStrokes([]);
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    const handleRemoteUndo = (data) => {
      if (data.senderRole === role) return;
      // Remove last stroke from the sender
      const filtered = [...strokesRef.current];
      for (let i = filtered.length - 1; i >= 0; i--) {
        if (filtered[i].senderRole === data.senderRole) {
          filtered.splice(i, 1);
          break;
        }
      }
      strokesRef.current = filtered;
      setStrokes(filtered);
      const canvas = canvasRef.current;
      if (canvas) {
        redrawAll(filtered, parseFloat(canvas.style.width), parseFloat(canvas.style.height));
      }
    };

    socket.on('whiteboard:stroke', handleRemoteStroke);
    socket.on('whiteboard:clear', handleRemoteClear);
    socket.on('whiteboard:undo', handleRemoteUndo);

    return () => {
      socket.off('whiteboard:stroke', handleRemoteStroke);
      socket.off('whiteboard:clear', handleRemoteClear);
      socket.off('whiteboard:undo', handleRemoteUndo);
    };
  }, [socket, open, role, drawStroke, redrawAll]);

  // Pointer handlers
  const getNormalizedPoint = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  }, []);

  const handlePointerDown = useCallback((e) => {
    const point = getNormalizedPoint(e);
    if (!point) return;

    isDrawingRef.current = true;
    currentStrokeRef.current = {
      id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      senderRole: role,
      tool,
      color: tool === 'eraser' ? '#FFFFFF' : color,
      lineWidth: tool === 'eraser' ? ERASER_WIDTH / 10 : PEN_WIDTH / 10,
      points: [point],
    };

    // Capture pointer for smooth drawing outside canvas bounds
    e.target.setPointerCapture(e.pointerId);
  }, [tool, color, role, getNormalizedPoint]);

  const handlePointerMove = useCallback((e) => {
    if (!isDrawingRef.current || !currentStrokeRef.current) return;

    const point = getNormalizedPoint(e);
    if (!point) return;

    currentStrokeRef.current.points.push(point);

    // Draw incrementally
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = parseFloat(canvas.style.width);
    const h = parseFloat(canvas.style.height);
    const pts = currentStrokeRef.current.points;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (currentStrokeRef.current.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = currentStrokeRef.current.lineWidth * w / 100;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = currentStrokeRef.current.color;
      ctx.lineWidth = currentStrokeRef.current.lineWidth * w / 100;
    }

    ctx.beginPath();
    if (pts.length >= 2) {
      ctx.moveTo(pts[pts.length - 2].x * w, pts[pts.length - 2].y * h);
      ctx.lineTo(pts[pts.length - 1].x * w, pts[pts.length - 1].y * h);
    }
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  }, [getNormalizedPoint]);

  const handlePointerUp = useCallback(() => {
    if (!isDrawingRef.current || !currentStrokeRef.current) return;
    isDrawingRef.current = false;

    const stroke = currentStrokeRef.current;
    currentStrokeRef.current = null;

    if (stroke.points.length < 2) return;

    const newStrokes = [...strokesRef.current, stroke];
    strokesRef.current = newStrokes;
    setStrokes(newStrokes);

    // Emit to other participant
    if (socket) {
      socket.emit('whiteboard:stroke', {
        id: stroke.id,
        tool: stroke.tool,
        color: stroke.color,
        lineWidth: stroke.lineWidth,
        points: stroke.points,
      });
    }
  }, [socket]);

  const handleUndo = useCallback(() => {
    const filtered = [...strokesRef.current];
    for (let i = filtered.length - 1; i >= 0; i--) {
      if (filtered[i].senderRole === role) {
        filtered.splice(i, 1);
        break;
      }
    }
    strokesRef.current = filtered;
    setStrokes(filtered);

    const canvas = canvasRef.current;
    if (canvas) {
      redrawAll(filtered, parseFloat(canvas.style.width), parseFloat(canvas.style.height));
    }

    if (socket) {
      socket.emit('whiteboard:undo', { timestamp: Date.now() });
    }
  }, [role, socket, redrawAll]);

  const handleClear = useCallback(() => {
    strokesRef.current = [];
    setStrokes([]);

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    if (socket) {
      socket.emit('whiteboard:clear', { timestamp: Date.now() });
    }
  }, [socket]);

  if (!open) return null;

  const hasOwnStrokes = strokes.some((s) => s.senderRole === role);

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 16,
        left: 16,
        right: 16,
        bottom: 80,
        zIndex: 120,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2,
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      }}
    >
      {/* Toolbar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 2,
          py: 1,
          backgroundColor: '#2C2C2C',
          borderBottom: '1px solid #444',
        }}
      >
        {/* Pen */}
        <Tooltip title="Pen">
          <IconButton
            size="small"
            onClick={() => setTool('pen')}
            sx={{
              color: tool === 'pen' ? '#0066FF' : '#CCC',
              backgroundColor: tool === 'pen' ? 'rgba(0,102,255,0.15)' : 'transparent',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' },
            }}
          >
            <PenIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        {/* Eraser */}
        <Tooltip title="Eraser">
          <IconButton
            size="small"
            onClick={() => setTool('eraser')}
            sx={{
              color: tool === 'eraser' ? '#FF9800' : '#CCC',
              backgroundColor: tool === 'eraser' ? 'rgba(255,152,0,0.15)' : 'transparent',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' },
            }}
          >
            <EraserIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        {/* Divider */}
        <Box sx={{ width: 1, height: 24, backgroundColor: '#555', mx: 0.5 }} />

        {/* Color Buttons */}
        {COLORS.map((c) => (
          <Tooltip key={c.value} title={c.name}>
            <IconButton
              size="small"
              onClick={() => { setColor(c.value); setTool('pen'); }}
              sx={{ p: 0.5 }}
            >
              <Box
                sx={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  backgroundColor: c.value,
                  border: color === c.value && tool === 'pen'
                    ? '2px solid #0066FF'
                    : '2px solid transparent',
                  outline: color === c.value && tool === 'pen'
                    ? '1px solid rgba(0,102,255,0.5)'
                    : 'none',
                }}
              />
            </IconButton>
          </Tooltip>
        ))}

        {/* Divider */}
        <Box sx={{ width: 1, height: 24, backgroundColor: '#555', mx: 0.5 }} />

        {/* Undo */}
        <Tooltip title="Undo">
          <span>
            <IconButton
              size="small"
              onClick={handleUndo}
              disabled={!hasOwnStrokes}
              sx={{
                color: hasOwnStrokes ? '#CCC' : '#666',
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' },
              }}
            >
              <UndoIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>

        {/* Clear */}
        <Tooltip title="Clear All">
          <span>
            <IconButton
              size="small"
              onClick={handleClear}
              disabled={strokes.length === 0}
              sx={{
                color: strokes.length > 0 ? '#FF4444' : '#666',
                '&:hover': { backgroundColor: 'rgba(255,68,68,0.1)' },
              }}
            >
              <ClearIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>

        {/* Spacer */}
        <Box sx={{ flex: 1 }} />

        {/* Close */}
        <Tooltip title="Close Whiteboard">
          <IconButton
            size="small"
            onClick={onClose}
            sx={{
              color: '#CCC',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Canvas Area */}
      <Box
        ref={containerRef}
        sx={{
          flex: 1,
          backgroundColor: '#FFFFFF',
          cursor: tool === 'eraser' ? 'cell' : 'crosshair',
          touchAction: 'none',
        }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          style={{ display: 'block', width: '100%', height: '100%' }}
        />
      </Box>
    </Box>
  );
};

CollaborativeWhiteboard.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  socket: PropTypes.object,
  role: PropTypes.string.isRequired,
};

export default CollaborativeWhiteboard;
