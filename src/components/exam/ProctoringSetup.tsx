import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Camera, 
  Mic, 
  Maximize, 
  Shield, 
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Eye
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProctoringSetupProps {
  onStart: () => void;
  onCancel: () => void;
  examTitle: string;
}

export default function ProctoringSetup({
  onStart,
  onCancel,
  examTitle
}: ProctoringSetupProps) {
  const [cameraAllowed, setCameraAllowed] = useState<boolean | null>(null);
  const [micAllowed, setMicAllowed] = useState<boolean | null>(null);
  const [consentGiven, setConsentGiven] = useState(false);
  const [testing, setTesting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Request camera/mic access for preview
  const testMediaAccess = async () => {
    setTesting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: true
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraAllowed(true);
      setMicAllowed(true);
    } catch (error) {
      console.error('Media access error:', error);
      const err = error as DOMException;
      if (err.name === 'NotAllowedError') {
        setCameraAllowed(false);
        setMicAllowed(false);
      }
    } finally {
      setTesting(false);
    }
  };

  // Clean up stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const canStart = cameraAllowed && micAllowed && consentGiven;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Proctored Exam Setup</CardTitle>
          <CardDescription>
            Complete the following steps before starting <strong>"{examTitle}"</strong>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Camera Preview */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Camera & Microphone Check</Label>
              {cameraAllowed === null ? (
                <Button onClick={testMediaAccess} disabled={testing} size="sm">
                  {testing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Camera className="h-4 w-4 mr-2" />
                      Test Camera & Mic
                    </>
                  )}
                </Button>
              ) : cameraAllowed ? (
                <div className="flex items-center text-success">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  <span className="text-sm">Working</span>
                </div>
              ) : (
                <div className="flex items-center text-destructive">
                  <XCircle className="h-4 w-4 mr-1" />
                  <span className="text-sm">Blocked</span>
                </div>
              )}
            </div>

            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              {cameraAllowed ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover transform -scale-x-100"
                  />
                  <div className="absolute bottom-3 left-3 flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-success/80 text-white px-2 py-1 rounded text-xs">
                      <Camera className="h-3 w-3" />
                      Camera OK
                    </div>
                    <div className="flex items-center gap-1 bg-success/80 text-white px-2 py-1 rounded text-xs">
                      <Mic className="h-3 w-3" />
                      Mic OK
                    </div>
                  </div>
                </>
              ) : cameraAllowed === false ? (
                <div className="flex flex-col items-center justify-center h-full text-destructive">
                  <XCircle className="h-12 w-12 mb-2" />
                  <p className="font-medium">Camera access denied</p>
                  <p className="text-sm text-muted-foreground">
                    Please enable camera access in your browser settings
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Camera className="h-12 w-12 mb-2" />
                  <p>Click "Test Camera & Mic" to begin</p>
                </div>
              )}
            </div>
          </div>

          {/* Requirements */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Proctoring Requirements:</strong>
              <ul className="mt-2 space-y-1 text-sm list-disc list-inside">
                <li>Webcam must be enabled throughout the exam</li>
                <li>Face must remain visible in the camera</li>
                <li>Exam must be taken in fullscreen mode</li>
                <li>Do not switch tabs or open other applications</li>
                <li>Copy, paste, and right-click are disabled</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Violation Warnings */}
          <Alert variant="destructive" className="bg-destructive/10 border-destructive/30">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> You will receive warnings for suspicious activity.
              After <strong>3 warnings</strong>, your exam will be automatically submitted.
            </AlertDescription>
          </Alert>

          {/* Privacy & Consent */}
          <Card className="bg-muted/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Privacy Notice & Consent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-32 text-sm text-muted-foreground">
                <div className="space-y-2 pr-4">
                  <p>
                    By proceeding with this proctored exam, you acknowledge and consent to the following:
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Your webcam will record video during the exam session</li>
                    <li>Your microphone may capture audio for verification purposes</li>
                    <li>Your browser activity (tab switches, fullscreen status) will be monitored</li>
                    <li>Suspicious activities will be flagged and logged</li>
                    <li>Recording data will be retained for review by exam administrators</li>
                    <li>Data is handled in accordance with our privacy policy</li>
                  </ul>
                  <p className="mt-2">
                    <strong>Data Retention:</strong> Proctoring data is retained for 90 days after the exam 
                    and may be reviewed in case of academic integrity concerns.
                  </p>
                  <p>
                    <strong>Accessibility:</strong> If you require accommodations, please contact your 
                    instructor before starting the exam.
                  </p>
                </div>
              </ScrollArea>

              <div className="flex items-center space-x-2 mt-4 pt-4 border-t">
                <Checkbox
                  id="consent"
                  checked={consentGiven}
                  onCheckedChange={(checked) => setConsentGiven(checked === true)}
                />
                <Label htmlFor="consent" className="text-sm">
                  I have read and agree to the proctoring terms and conditions
                </Label>
              </div>
            </CardContent>
          </Card>
        </CardContent>

        <CardFooter className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => {
              if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
              }
              onCancel();
            }}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              // Keep stream running for exam
              onStart();
            }}
            disabled={!canStart}
            className="flex-1"
          >
            {canStart ? (
              <>
                <Maximize className="h-4 w-4 mr-2" />
                Start Exam in Fullscreen
              </>
            ) : (
              "Complete all steps to continue"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
