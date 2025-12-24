import { useState, useEffect, useRef, useCallback } from 'react';
import { useFaceDetection } from './useFaceDetection';

export type ViolationType = 
  | 'tab_switch'
  | 'fullscreen_exit'
  | 'multiple_faces'
  | 'no_face'
  | 'audio_anomaly'
  | 'copy_paste'
  | 'right_click'
  | 'devtools';

export interface Violation {
  id: string;
  type: ViolationType;
  timestamp: Date;
  severity: 'warning' | 'critical';
  description: string;
}

export interface ProctoringConfig {
  enableCamera: boolean;
  enableMicrophone: boolean;
  enableTabDetection: boolean;
  enforceFullscreen: boolean;
  maxWarnings: number;
  faceDetectionInterval: number;
  onAutoSubmit: () => void;
}

export interface ProctoringState {
  isActive: boolean;
  cameraStream: MediaStream | null;
  isCameraAllowed: boolean;
  isMicrophoneAllowed: boolean;
  isFullscreen: boolean;
  violations: Violation[];
  warningCount: number;
  faceDetected: boolean;
  multipleFaces: boolean;
  faceCount: number;
  lastFaceCheck: Date | null;
  isModelLoading: boolean;
  isModelLoaded: boolean;
}

const defaultConfig: ProctoringConfig = {
  enableCamera: true,
  enableMicrophone: true,
  enableTabDetection: true,
  enforceFullscreen: true,
  maxWarnings: 3,
  faceDetectionInterval: 2000, // Faster detection with TensorFlow
  onAutoSubmit: () => {}
};

export function useProctoring(config: Partial<ProctoringConfig> = {}) {
  const fullConfig = { ...defaultConfig, ...config };
  
  const [state, setState] = useState<ProctoringState>({
    isActive: false,
    cameraStream: null,
    isCameraAllowed: false,
    isMicrophoneAllowed: false,
    isFullscreen: false,
    violations: [],
    warningCount: 0,
    faceDetected: true,
    multipleFaces: false,
    faceCount: 0,
    lastFaceCheck: null,
    isModelLoading: true,
    isModelLoaded: false
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const faceCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastNoFaceTimeRef = useRef<number | null>(null);
  const lastMultipleFacesTimeRef = useRef<number | null>(null);

  // TensorFlow.js face detection
  const { 
    result: faceResult, 
    initializeDetector, 
    detectFaces, 
    isReady: isFaceDetectionReady 
  } = useFaceDetection();

  // Update state when model loading status changes
  useEffect(() => {
    setState(prev => ({
      ...prev,
      isModelLoading: faceResult.isLoading,
      isModelLoaded: faceResult.isModelLoaded
    }));
  }, [faceResult.isLoading, faceResult.isModelLoaded]);

  // Add a violation with debounce logic
  const addViolation = useCallback((type: ViolationType, severity: 'warning' | 'critical') => {
    const descriptions: Record<ViolationType, string> = {
      tab_switch: 'Switched away from exam tab',
      fullscreen_exit: 'Exited fullscreen mode',
      multiple_faces: 'Multiple faces detected in camera',
      no_face: 'Face not visible in camera',
      audio_anomaly: 'Suspicious audio detected',
      copy_paste: 'Copy/paste attempt blocked',
      right_click: 'Right-click blocked',
      devtools: 'Developer tools detected'
    };

    const violation: Violation = {
      id: crypto.randomUUID(),
      type,
      timestamp: new Date(),
      severity,
      description: descriptions[type]
    };

    setState(prev => {
      const newWarningCount = severity === 'warning' ? prev.warningCount + 1 : prev.warningCount;
      
      // Auto-submit if max warnings exceeded
      if (newWarningCount >= fullConfig.maxWarnings) {
        setTimeout(() => fullConfig.onAutoSubmit(), 500);
      }

      return {
        ...prev,
        violations: [...prev.violations, violation],
        warningCount: newWarningCount
      };
    });

    return violation;
  }, [fullConfig]);

  // Request camera and microphone access
  const requestMediaAccess = useCallback(async () => {
    try {
      const constraints: MediaStreamConstraints = {
        video: fullConfig.enableCamera ? {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        } : false,
        audio: fullConfig.enableMicrophone
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      setState(prev => ({
        ...prev,
        cameraStream: stream,
        isCameraAllowed: fullConfig.enableCamera,
        isMicrophoneAllowed: fullConfig.enableMicrophone
      }));

      return stream;
    } catch (error) {
      console.error('Media access denied:', error);
      setState(prev => ({
        ...prev,
        isCameraAllowed: false,
        isMicrophoneAllowed: false
      }));
      return null;
    }
  }, [fullConfig.enableCamera, fullConfig.enableMicrophone]);

  // Enter fullscreen
  const enterFullscreen = useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen();
      setState(prev => ({ ...prev, isFullscreen: true }));
      return true;
    } catch (error) {
      console.error('Fullscreen request failed:', error);
      return false;
    }
  }, []);

  // Exit fullscreen
  const exitFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
      setState(prev => ({ ...prev, isFullscreen: false }));
    } catch (error) {
      console.error('Exit fullscreen failed:', error);
    }
  }, []);

  // Start proctoring
  const startProctoring = useCallback(async () => {
    // Initialize face detection model
    await initializeDetector();

    // Request media access
    if (fullConfig.enableCamera || fullConfig.enableMicrophone) {
      await requestMediaAccess();
    }

    // Enter fullscreen if required
    if (fullConfig.enforceFullscreen) {
      await enterFullscreen();
    }

    setState(prev => ({ ...prev, isActive: true }));
  }, [fullConfig, requestMediaAccess, enterFullscreen, initializeDetector]);

  // Stop proctoring
  const stopProctoring = useCallback(() => {
    // Stop camera stream
    if (state.cameraStream) {
      state.cameraStream.getTracks().forEach(track => track.stop());
    }

    // Exit fullscreen
    exitFullscreen();

    // Clear intervals
    if (faceCheckIntervalRef.current) {
      clearInterval(faceCheckIntervalRef.current);
    }

    setState(prev => ({
      ...prev,
      isActive: false,
      cameraStream: null
    }));
  }, [state.cameraStream, exitFullscreen]);

  // Tab visibility detection
  useEffect(() => {
    if (!state.isActive || !fullConfig.enableTabDetection) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        addViolation('tab_switch', 'warning');
      }
    };

    const handleBlur = () => {
      addViolation('tab_switch', 'warning');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [state.isActive, fullConfig.enableTabDetection, addViolation]);

  // Fullscreen change detection
  useEffect(() => {
    if (!state.isActive || !fullConfig.enforceFullscreen) return;

    const handleFullscreenChange = () => {
      const isFullscreen = !!document.fullscreenElement;
      setState(prev => ({ ...prev, isFullscreen }));

      if (!isFullscreen && state.isActive) {
        addViolation('fullscreen_exit', 'warning');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [state.isActive, fullConfig.enforceFullscreen, addViolation]);

  // Block copy/paste
  useEffect(() => {
    if (!state.isActive) return;

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      addViolation('copy_paste', 'warning');
    };

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      addViolation('copy_paste', 'warning');
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      addViolation('right_click', 'warning');
    };

    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [state.isActive, addViolation]);

  // Keyboard shortcuts blocking
  useEffect(() => {
    if (!state.isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Block common shortcuts
      if (
        (e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'u')) ||
        (e.key === 'F12') ||
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        (e.altKey && e.key === 'Tab') ||
        (e.metaKey && e.key === 'Tab')
      ) {
        e.preventDefault();
        if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
          addViolation('devtools', 'critical');
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [state.isActive, addViolation]);

  // TensorFlow.js face detection with debouncing
  const checkFacePresence = useCallback(async () => {
    if (!videoRef.current || !isFaceDetectionReady) return;

    const video = videoRef.current;
    if (video.readyState !== 4) return;

    const result = await detectFaces(video);
    const now = Date.now();
    const DEBOUNCE_MS = 3000; // 3 seconds debounce for violations

    setState(prev => {
      let shouldAddNoFaceViolation = false;
      let shouldAddMultipleFacesViolation = false;

      // Check for no face with debounce
      if (!result.faceDetected && prev.faceDetected) {
        if (!lastNoFaceTimeRef.current || now - lastNoFaceTimeRef.current > DEBOUNCE_MS) {
          shouldAddNoFaceViolation = true;
          lastNoFaceTimeRef.current = now;
        }
      } else if (result.faceDetected) {
        lastNoFaceTimeRef.current = null;
      }

      // Check for multiple faces with debounce
      if (result.multipleFaces && !prev.multipleFaces) {
        if (!lastMultipleFacesTimeRef.current || now - lastMultipleFacesTimeRef.current > DEBOUNCE_MS) {
          shouldAddMultipleFacesViolation = true;
          lastMultipleFacesTimeRef.current = now;
        }
      } else if (!result.multipleFaces) {
        lastMultipleFacesTimeRef.current = null;
      }

      return {
        ...prev,
        faceDetected: result.faceDetected,
        multipleFaces: result.multipleFaces,
        faceCount: result.faceCount,
        lastFaceCheck: new Date()
      };
    });

    // Add violations outside of setState to avoid stale closure
    if (!result.faceDetected && state.faceDetected) {
      const timeSinceLastNoFace = lastNoFaceTimeRef.current ? now - lastNoFaceTimeRef.current : Infinity;
      if (timeSinceLastNoFace > 3000 || !lastNoFaceTimeRef.current) {
        addViolation('no_face', 'warning');
      }
    }

    if (result.multipleFaces && !state.multipleFaces) {
      const timeSinceLastMultiple = lastMultipleFacesTimeRef.current ? now - lastMultipleFacesTimeRef.current : Infinity;
      if (timeSinceLastMultiple > 3000 || !lastMultipleFacesTimeRef.current) {
        addViolation('multiple_faces', 'critical');
      }
    }
  }, [isFaceDetectionReady, detectFaces, addViolation, state.faceDetected, state.multipleFaces]);

  // Set up face detection interval
  useEffect(() => {
    if (!state.isActive || !fullConfig.enableCamera || !state.cameraStream || !isFaceDetectionReady) return;

    faceCheckIntervalRef.current = setInterval(checkFacePresence, fullConfig.faceDetectionInterval);

    return () => {
      if (faceCheckIntervalRef.current) {
        clearInterval(faceCheckIntervalRef.current);
      }
    };
  }, [state.isActive, fullConfig.enableCamera, fullConfig.faceDetectionInterval, state.cameraStream, checkFacePresence, isFaceDetectionReady]);

  return {
    state,
    videoRef,
    canvasRef,
    startProctoring,
    stopProctoring,
    enterFullscreen,
    exitFullscreen,
    addViolation,
    config: fullConfig
  };
}
