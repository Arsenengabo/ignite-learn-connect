import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Camera, 
  CameraOff, 
  Mic, 
  MicOff, 
  Maximize, 
  AlertTriangle, 
  Shield,
  Eye,
  CheckCircle,
  XCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Violation, ProctoringState, ProctoringConfig } from "@/hooks/useProctoring";

interface ProctoringOverlayProps {
  state: ProctoringState;
  config: ProctoringConfig;
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  onDismissWarning?: () => void;
}

export default function ProctoringOverlay({
  state,
  config,
  videoRef,
  canvasRef,
  onDismissWarning
}: ProctoringOverlayProps) {
  const [showWarning, setShowWarning] = useState(false);
  const [latestViolation, setLatestViolation] = useState<Violation | null>(null);

  // Show warning when new violation occurs
  useEffect(() => {
    if (state.violations.length > 0) {
      const latest = state.violations[state.violations.length - 1];
      setLatestViolation(latest);
      setShowWarning(true);

      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => {
        setShowWarning(false);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [state.violations.length]);

  // Attach video stream to video element
  useEffect(() => {
    if (videoRef.current && state.cameraStream) {
      videoRef.current.srcObject = state.cameraStream;
      videoRef.current.play().catch(console.error);
    }
  }, [state.cameraStream, videoRef]);

  const warningsRemaining = config.maxWarnings - state.warningCount;

  return (
    <>
      {/* Camera Preview - Fixed position */}
      {config.enableCamera && state.isCameraAllowed && (
        <div className="fixed bottom-20 right-4 z-50">
          <Card className="w-48 overflow-hidden shadow-lg border-2 border-primary/20">
            <div className="relative aspect-video bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {/* Face detection indicator */}
              <div className="absolute bottom-2 left-2 flex items-center gap-1">
                {state.faceDetected ? (
                  <Badge className="bg-success/80 text-success-foreground text-xs">
                    <Eye className="h-3 w-3 mr-1" />
                    Face OK
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="text-xs animate-pulse">
                    <XCircle className="h-3 w-3 mr-1" />
                    No Face
                  </Badge>
                )}
              </div>

              {/* Recording indicator */}
              <div className="absolute top-2 right-2">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
                  <span className="text-xs text-white bg-black/50 px-1 rounded">REC</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Proctoring Status Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Proctoring Active</span>
              </div>

              <div className="flex items-center gap-2">
                {state.isCameraAllowed ? (
                  <Badge variant="outline" className="text-success border-success">
                    <Camera className="h-3 w-3 mr-1" />
                    Camera
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-destructive border-destructive">
                    <CameraOff className="h-3 w-3 mr-1" />
                    Camera
                  </Badge>
                )}

                {state.isMicrophoneAllowed ? (
                  <Badge variant="outline" className="text-success border-success">
                    <Mic className="h-3 w-3 mr-1" />
                    Mic
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-destructive border-destructive">
                    <MicOff className="h-3 w-3 mr-1" />
                    Mic
                  </Badge>
                )}

                {state.isFullscreen ? (
                  <Badge variant="outline" className="text-success border-success">
                    <Maximize className="h-3 w-3 mr-1" />
                    Fullscreen
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-warning border-warning">
                    <Maximize className="h-3 w-3 mr-1" />
                    Windowed
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className={cn(
                  "h-4 w-4",
                  warningsRemaining <= 1 ? "text-destructive" : "text-warning"
                )} />
                <span className="text-sm">
                  Warnings: <strong>{state.warningCount}</strong> / {config.maxWarnings}
                </span>
              </div>
              <Progress 
                value={(state.warningCount / config.maxWarnings) * 100} 
                className="w-24 h-2"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Warning Overlay */}
      {showWarning && latestViolation && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <Alert 
            variant={latestViolation.severity === 'critical' ? 'destructive' : 'default'}
            className="w-full max-w-md mx-4 animate-in zoom-in-95 duration-200"
          >
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle className="text-lg">
              {latestViolation.severity === 'critical' ? 'Critical Violation!' : 'Warning!'}
            </AlertTitle>
            <AlertDescription className="mt-2">
              <p className="mb-2">{latestViolation.description}</p>
              <p className="text-sm opacity-80">
                {warningsRemaining > 0 ? (
                  <>
                    <strong>{warningsRemaining}</strong> warning(s) remaining before automatic submission.
                  </>
                ) : (
                  <span className="text-destructive font-bold">
                    Maximum warnings reached! Exam will be submitted automatically.
                  </span>
                )}
              </p>
              <div className="mt-4 flex justify-end">
                <Button
                  size="sm"
                  onClick={() => {
                    setShowWarning(false);
                    onDismissWarning?.();
                  }}
                >
                  I Understand
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Auto-submit warning */}
      {state.warningCount >= config.maxWarnings && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-destructive/90">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-6 w-6" />
                Exam Auto-Submitted
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                Your exam has been automatically submitted due to multiple violations
                of the proctoring guidelines.
              </p>
              <div className="space-y-2">
                {state.violations.map((v) => (
                  <div key={v.id} className="text-sm flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-destructive" />
                    <span>{v.description}</span>
                    <span className="text-muted-foreground ml-auto">
                      {v.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
