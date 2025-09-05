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
    console.log('Starting bubble detection for file:', imageFile.name);
    
    const image = await this.loadImage(imageFile);
    console.log('Image loaded:', image.width, 'x', image.height);
    
    this.canvas.width = image.width;
    this.canvas.height = image.height;
    this.ctx.drawImage(image, 0, 0);

    // Apply image preprocessing for better bubble detection
    const processedImageData = this.preprocessImage();
    
    // Detect bubble regions with improved algorithm
    const bubbleRegions = this.detectBubbleRegionsAdvanced();
    console.log('Detected bubble regions:', bubbleRegions.length);
    
    // Analyze each bubble region to determine if it's filled
    const results: DetectionResult[] = [];
    
    for (let question = 1; question <= 10; question++) {
      const questionBubbles = bubbleRegions.filter(b => b.question === question);
      console.log(`Question ${question} bubbles:`, questionBubbles.length);
      
      if (questionBubbles.length > 0) {
        const detectedAnswer = this.analyzeQuestionBubblesAdvanced(questionBubbles, processedImageData);
        console.log(`Question ${question} detected:`, detectedAnswer);
        
        results.push({
          question,
          detectedAnswer: detectedAnswer.answer,
          confidence: detectedAnswer.confidence
        });
      } else {
        console.warn(`No bubbles found for question ${question}`);
        results.push({
          question,
          detectedAnswer: '',
          confidence: 0
        });
      }
    }

    console.log('Final detection results:', results);
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

  private preprocessImage(): ImageData {
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;

    // Convert to grayscale and apply contrast enhancement
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      
      // Apply contrast enhancement
      const enhanced = gray < 128 ? Math.max(0, gray - 30) : Math.min(255, gray + 30);
      
      data[i] = enhanced;     // Red
      data[i + 1] = enhanced; // Green
      data[i + 2] = enhanced; // Blue
      // Alpha channel (data[i + 3]) remains unchanged
    }

    this.ctx.putImageData(imageData, 0, 0);
    return imageData;
  }

  private detectBubbleRegionsAdvanced(): BubbleRegion[] {
    const regions: BubbleRegion[] = [];
    const width = this.canvas.width;
    const height = this.canvas.height;

    console.log('Canvas dimensions:', width, 'x', height);

    // More precise detection based on actual OMR sheet layout
    // Questions typically start after the header (around 25% from top)
    const headerHeight = Math.floor(height * 0.25);
    const questionAreaHeight = height - headerHeight - Math.floor(height * 0.1); // Leave 10% at bottom
    const questionHeight = questionAreaHeight / 10; // 10 questions

    // Bubbles are typically in the left 60% of the page width
    const leftMargin = Math.floor(width * 0.08);
    const bubbleAreaWidth = Math.floor(width * 0.6);
    const bubbleSpacing = bubbleAreaWidth / 4; // 4 options (A, B, C, D)

    console.log('Detection parameters:', {
      headerHeight,
      questionAreaHeight,
      questionHeight,
      leftMargin,
      bubbleAreaWidth,
      bubbleSpacing
    });

    for (let question = 1; question <= 10; question++) {
      const questionCenterY = headerHeight + (question - 0.5) * questionHeight;
      const bubbleHeight = Math.floor(questionHeight * 0.3); // Bubble height
      const bubbleWidth = Math.floor(bubbleSpacing * 0.4); // Bubble width
      
      const options = ['A', 'B', 'C', 'D'];

      for (let optionIndex = 0; optionIndex < 4; optionIndex++) {
        const bubbleCenterX = leftMargin + (optionIndex + 0.5) * bubbleSpacing;
        
        const region = {
          x: Math.floor(bubbleCenterX - bubbleWidth / 2),
          y: Math.floor(questionCenterY - bubbleHeight / 2),
          width: bubbleWidth,
          height: bubbleHeight,
          option: options[optionIndex],
          question
        };
        
        regions.push(region);
        
        if (question <= 2) { // Debug first 2 questions
          console.log(`Q${question}${options[optionIndex]}:`, region);
        }
      }
    }

    return regions;
  }

  private analyzeQuestionBubblesAdvanced(bubbles: BubbleRegion[], imageData: ImageData): { answer: string; confidence: number } {
    const bubbleAnalysis: { option: string; darkness: number; pixelCount: number }[] = [];

    for (const bubble of bubbles) {
      const analysis = this.calculateBubbleDarknessAdvanced(bubble, imageData);
      bubbleAnalysis.push({
        option: bubble.option,
        darkness: analysis.averageDarkness,
        pixelCount: analysis.pixelCount
      });
    }

    console.log(`Question ${bubbles[0].question} analysis:`, bubbleAnalysis);

    // Sort by darkness (lower values = darker = more filled)
    const sortedBubbles = bubbleAnalysis.sort((a, b) => a.darkness - b.darkness);
    
    if (sortedBubbles.length === 0) {
      return { answer: '', confidence: 0 };
    }

    const darkest = sortedBubbles[0];
    const secondDarkest = sortedBubbles[1];
    
    // Calculate confidence based on darkness difference and absolute darkness
    let confidenceScore = 0;
    
    if (darkest.darkness < 180) { // Must be reasonably dark to be considered filled
      const darknessDiff = secondDarkest ? secondDarkest.darkness - darkest.darkness : 50;
      confidenceScore = Math.min(darknessDiff / 40, 1); // Normalize difference
      
      // Boost confidence if bubble is very dark
      if (darkest.darkness < 120) {
        confidenceScore = Math.min(confidenceScore + 0.3, 1);
      }
    }

    const isSignificantlyDark = darkest.darkness < 160 && confidenceScore > 0.3;

    console.log(`Question ${bubbles[0].question} result:`, {
      darkest: darkest.darkness,
      secondDarkest: secondDarkest?.darkness,
      confidenceScore,
      isSignificantlyDark,
      selectedAnswer: isSignificantlyDark ? darkest.option : ''
    });

    return {
      answer: isSignificantlyDark ? darkest.option : '',
      confidence: isSignificantlyDark ? confidenceScore : 0
    };
  }

  private calculateBubbleDarknessAdvanced(bubble: BubbleRegion, imageData: ImageData): { averageDarkness: number; pixelCount: number } {
    const { x, y, width, height } = bubble;
    const data = imageData.data;
    const canvasWidth = imageData.width;
    
    let totalDarkness = 0;
    let pixelCount = 0;

    // Sample all pixels in the bubble region for accuracy
    for (let dy = 0; dy < height; dy++) {
      for (let dx = 0; dx < width; dx++) {
        const pixelX = x + dx;
        const pixelY = y + dy;
        
        if (pixelX >= 0 && pixelX < canvasWidth && pixelY >= 0 && pixelY < imageData.height) {
          const index = (pixelY * canvasWidth + pixelX) * 4;
          const grayValue = data[index]; // R value (since it's grayscale, R=G=B)
          totalDarkness += grayValue;
          pixelCount++;
        }
      }
    }

    return {
      averageDarkness: pixelCount > 0 ? totalDarkness / pixelCount : 255,
      pixelCount
    };
  }
}
