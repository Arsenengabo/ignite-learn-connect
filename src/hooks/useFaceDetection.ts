import { useRef, useState, useCallback, useEffect } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as faceDetection from '@tensorflow-models/face-detection';

export interface FaceDetectionResult {
  faceCount: number;
  faceDetected: boolean;
  multipleFaces: boolean;
  isLoading: boolean;
  isModelLoaded: boolean;
  error: string | null;
}

export function useFaceDetection() {
  const [result, setResult] = useState<FaceDetectionResult>({
    faceCount: 0,
    faceDetected: false,
    multipleFaces: false,
    isLoading: true,
    isModelLoaded: false,
    error: null
  });

  const detectorRef = useRef<faceDetection.FaceDetector | null>(null);
  const isInitializingRef = useRef(false);

  // Initialize TensorFlow.js and load face detection model
  const initializeDetector = useCallback(async () => {
    if (isInitializingRef.current || detectorRef.current) return;
    
    isInitializingRef.current = true;
    setResult(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Set backend to webgl for better performance
      await tf.setBackend('webgl');
      await tf.ready();
      
      console.log('TensorFlow.js initialized with backend:', tf.getBackend());

      // Create detector using MediaPipe FaceMesh model
      const model = faceDetection.SupportedModels.MediaPipeFaceDetector;
      const detectorConfig: faceDetection.MediaPipeFaceDetectorTfjsModelConfig = {
        runtime: 'tfjs',
        maxFaces: 5, // Detect up to 5 faces
        modelType: 'short' // 'short' is faster, 'full' is more accurate
      };

      const detector = await faceDetection.createDetector(model, detectorConfig);
      detectorRef.current = detector;

      console.log('Face detection model loaded successfully');
      
      setResult(prev => ({ 
        ...prev, 
        isLoading: false, 
        isModelLoaded: true,
        error: null 
      }));
    } catch (error) {
      console.error('Failed to initialize face detector:', error);
      setResult(prev => ({ 
        ...prev, 
        isLoading: false, 
        isModelLoaded: false,
        error: error instanceof Error ? error.message : 'Failed to load model' 
      }));
    } finally {
      isInitializingRef.current = false;
    }
  }, []);

  // Detect faces in video element
  const detectFaces = useCallback(async (
    videoElement: HTMLVideoElement
  ): Promise<FaceDetectionResult> => {
    if (!detectorRef.current) {
      return {
        faceCount: 0,
        faceDetected: false,
        multipleFaces: false,
        isLoading: result.isLoading,
        isModelLoaded: false,
        error: 'Model not loaded'
      };
    }

    if (videoElement.readyState !== 4) {
      return result;
    }

    try {
      const faces = await detectorRef.current.estimateFaces(videoElement, {
        flipHorizontal: false
      });

      const faceCount = faces.length;
      const newResult: FaceDetectionResult = {
        faceCount,
        faceDetected: faceCount >= 1,
        multipleFaces: faceCount > 1,
        isLoading: false,
        isModelLoaded: true,
        error: null
      };

      setResult(newResult);
      return newResult;
    } catch (error) {
      console.error('Face detection error:', error);
      const errorResult: FaceDetectionResult = {
        ...result,
        error: error instanceof Error ? error.message : 'Detection failed'
      };
      setResult(errorResult);
      return errorResult;
    }
  }, [result]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (detectorRef.current) {
        detectorRef.current.dispose();
        detectorRef.current = null;
      }
    };
  }, []);

  return {
    result,
    initializeDetector,
    detectFaces,
    isReady: result.isModelLoaded && !result.isLoading
  };
}
