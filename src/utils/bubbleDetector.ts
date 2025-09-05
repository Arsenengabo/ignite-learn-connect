interface BubbleRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  option: string;
  question: number;
}

interface DetectionResult {
  question: number;
  detectedAnswer: string;
  confidence: number;
}

export class BubbleDetector {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
  }

  async detectBubbles(imageFile: File): Promise<DetectionResult[]> {
    const image = await this.loadImage(imageFile);
    this.canvas.width = image.width;
    this.canvas.height = image.height;
    this.ctx.drawImage(image, 0, 0);

    // Convert to grayscale for better bubble detection
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const grayImageData = this.convertToGrayscale(imageData);
    this.ctx.putImageData(grayImageData, 0, 0);

    // Detect bubble regions based on standard OMR sheet layout
    const bubbleRegions = this.detectBubbleRegions();
    
    // Analyze each bubble region to determine if it's filled
    const results: DetectionResult[] = [];
    
    for (let question = 1; question <= 10; question++) {
      const questionBubbles = bubbleRegions.filter(b => b.question === question);
      const detectedAnswer = this.analyzeQuestionBubbles(questionBubbles, grayImageData);
      
      results.push({
        question,
        detectedAnswer: detectedAnswer.answer,
        confidence: detectedAnswer.confidence
      });
    }

    return results;
  }

  private loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  private convertToGrayscale(imageData: ImageData): ImageData {
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      data[i] = gray;     // Red
      data[i + 1] = gray; // Green
      data[i + 2] = gray; // Blue
      // Alpha channel (data[i + 3]) remains unchanged
    }
    return imageData;
  }

  private detectBubbleRegions(): BubbleRegion[] {
    const regions: BubbleRegion[] = [];
    const width = this.canvas.width;
    const height = this.canvas.height;

    // Standard OMR sheet has questions starting around 30% from top
    // and bubbles are arranged in a grid pattern
    const startY = Math.floor(height * 0.3);
    const endY = Math.floor(height * 0.9);
    const questionHeight = (endY - startY) / 10; // 10 questions

    // Bubble positions (A, B, C, D) are typically spread across width
    const startX = Math.floor(width * 0.1);
    const endX = Math.floor(width * 0.7);
    const bubbleWidth = Math.floor((endX - startX) / 4); // 4 options per question

    for (let question = 1; question <= 10; question++) {
      const questionY = startY + (question - 1) * questionHeight;
      const options = ['A', 'B', 'C', 'D'];

      for (let optionIndex = 0; optionIndex < 4; optionIndex++) {
        const bubbleX = startX + optionIndex * bubbleWidth;
        
        regions.push({
          x: bubbleX,
          y: questionY,
          width: Math.floor(bubbleWidth * 0.3), // Bubble is smaller than full width
          height: Math.floor(questionHeight * 0.4),
          option: options[optionIndex],
          question
        });
      }
    }

    return regions;
  }

  private analyzeQuestionBubbles(bubbles: BubbleRegion[], imageData: ImageData): { answer: string; confidence: number } {
    let darkestBubble = '';
    let darkestValue = 255;
    let confidenceScore = 0;

    const bubbleValues: { option: string; darkness: number }[] = [];

    for (const bubble of bubbles) {
      const darkness = this.calculateBubbleDarkness(bubble, imageData);
      bubbleValues.push({ option: bubble.option, darkness });

      if (darkness < darkestValue) {
        darkestValue = darkness;
        darkestBubble = bubble.option;
      }
    }

    // Calculate confidence based on darkness difference
    const sortedBubbles = bubbleValues.sort((a, b) => a.darkness - b.darkness);
    const darkest = sortedBubbles[0];
    const secondDarkest = sortedBubbles[1];
    
    // Higher confidence if there's a clear difference between darkest and second darkest
    const darknessDiff = secondDarkest.darkness - darkest.darkness;
    confidenceScore = Math.min(darknessDiff / 50, 1); // Normalize to 0-1

    // Only consider it filled if it's significantly darker than average
    const averageDarkness = bubbleValues.reduce((sum, b) => sum + b.darkness, 0) / bubbleValues.length;
    const isSignificantlyDark = darkest.darkness < averageDarkness - 20;

    return {
      answer: isSignificantlyDark ? darkestBubble : '',
      confidence: isSignificantlyDark ? confidenceScore : 0
    };
  }

  private calculateBubbleDarkness(bubble: BubbleRegion, imageData: ImageData): number {
    const { x, y, width, height } = bubble;
    const data = imageData.data;
    const canvasWidth = imageData.width;
    
    let totalDarkness = 0;
    let pixelCount = 0;

    // Sample pixels in the bubble region
    for (let dy = 0; dy < height; dy += 2) { // Sample every other pixel for performance
      for (let dx = 0; dx < width; dx += 2) {
        const pixelX = Math.floor(x + dx);
        const pixelY = Math.floor(y + dy);
        
        if (pixelX >= 0 && pixelX < canvasWidth && pixelY >= 0 && pixelY < imageData.height) {
          const index = (pixelY * canvasWidth + pixelX) * 4;
          const grayValue = data[index]; // R value (since it's grayscale, R=G=B)
          totalDarkness += grayValue;
          pixelCount++;
        }
      }
    }

    return pixelCount > 0 ? totalDarkness / pixelCount : 255;
  }
}
