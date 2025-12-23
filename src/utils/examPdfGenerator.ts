import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface Question {
  question_text: string;
  question_type: string;
  options: string[] | null;
  correct_answer: string;
  explanation: string;
  marks: number;
}

interface Section {
  title: string;
  instructions: string;
  questions: Question[];
}

interface ExamData {
  title: string;
  subject: string;
  topic: string;
  instructions: string;
  timeLimit: number;
  totalMarks: number;
  sections: Section[];
}

interface Response {
  id: string;
  answer: string;
  is_correct: boolean | null;
  marks_awarded: number;
  feedback: string;
  question: {
    question_text: string;
    question_type: string;
    options: string[] | null;
    correct_answer: string;
    marks: number;
  };
}

interface ResultsData {
  examTitle: string;
  subject: string;
  totalScore: number;
  maxScore: number;
  percentage: number;
  submittedAt: string;
  responses: Response[];
}

export function generateExamPDF(data: ExamData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = margin;

  // Helper function to add new page if needed
  const checkPageBreak = (height: number) => {
    if (yPos + height > pageHeight - margin) {
      doc.addPage();
      yPos = margin;
      addHeader();
      return true;
    }
    return false;
  };

  // Header
  const addHeader = () => {
    doc.setFontSize(10);
    doc.setTextColor(128);
    doc.text(data.title, margin, 10);
    doc.text(`Page ${doc.getNumberOfPages()}`, pageWidth - margin - 20, 10);
    doc.setTextColor(0);
  };

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(data.title, pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  // Subtitle
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.subject} - ${data.topic}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  // Info box
  doc.setDrawColor(200);
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 25, 3, 3, 'FD');

  doc.setFontSize(10);
  doc.text(`Time Allowed: ${data.timeLimit} minutes`, margin + 5, yPos + 8);
  doc.text(`Total Marks: ${data.totalMarks}`, margin + 5, yPos + 16);
  doc.text(`Date: _______________`, pageWidth - margin - 60, yPos + 8);
  doc.text(`Name: _______________`, pageWidth - margin - 60, yPos + 16);
  yPos += 35;

  // Instructions
  if (data.instructions) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('General Instructions:', margin, yPos);
    yPos += 6;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const instructionLines = doc.splitTextToSize(data.instructions, pageWidth - 2 * margin);
    doc.text(instructionLines, margin, yPos);
    yPos += instructionLines.length * 5 + 10;
  }

  // Sections and Questions
  let questionNumber = 0;

  data.sections.forEach((section, sIdx) => {
    checkPageBreak(30);

    // Section header
    doc.setFillColor(230, 240, 250);
    doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 12, 2, 2, 'F');
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(section.title, margin + 5, yPos + 8);
    yPos += 15;

    if (section.instructions) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.text(section.instructions, margin, yPos);
      yPos += 8;
    }

    // Questions
    section.questions.forEach((question, qIdx) => {
      questionNumber++;
      const estimatedHeight = 30 + (question.options?.length || 0) * 6;
      checkPageBreak(estimatedHeight);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      const qText = `${questionNumber}. ${question.question_text}`;
      const qLines = doc.splitTextToSize(qText, pageWidth - 2 * margin - 20);
      doc.text(qLines, margin, yPos);
      
      // Marks
      doc.setFont('helvetica', 'normal');
      doc.text(`[${question.marks}]`, pageWidth - margin - 10, yPos);
      yPos += qLines.length * 5 + 3;

      // Options for MCQ
      if (question.question_type === 'mcq' && question.options) {
        doc.setFont('helvetica', 'normal');
        question.options.forEach((option, optIdx) => {
          checkPageBreak(8);
          doc.text(`   ${String.fromCharCode(65 + optIdx)}) ${option}`, margin + 5, yPos);
          yPos += 5;
        });
        yPos += 3;
      }

      // True/False options
      if (question.question_type === 'true_false') {
        doc.text('   A) True     B) False', margin + 5, yPos);
        yPos += 8;
      }

      // Answer space for short/long answer
      if (question.question_type === 'short_answer') {
        doc.setDrawColor(200);
        doc.line(margin + 5, yPos + 2, pageWidth - margin, yPos + 2);
        doc.line(margin + 5, yPos + 10, pageWidth - margin, yPos + 10);
        yPos += 15;
      }

      if (question.question_type === 'long_answer') {
        for (let i = 0; i < 5; i++) {
          checkPageBreak(8);
          doc.setDrawColor(200);
          doc.line(margin + 5, yPos + 2, pageWidth - margin, yPos + 2);
          yPos += 8;
        }
        yPos += 5;
      }

      // Fill in the blank
      if (question.question_type === 'fill_blank') {
        doc.setDrawColor(200);
        doc.line(margin + 5, yPos + 2, margin + 80, yPos + 2);
        yPos += 10;
      }

      yPos += 5;
    });

    yPos += 10;
  });

  // Footer on last page
  doc.setFontSize(10);
  doc.setTextColor(128);
  doc.text('--- End of Exam ---', pageWidth / 2, pageHeight - 15, { align: 'center' });

  // Save
  doc.save(`${data.title.replace(/[^a-zA-Z0-9]/g, '_')}_Exam.pdf`);
}

export function generateResultsPDF(data: ResultsData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = margin;

  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Exam Results', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  doc.setFontSize(14);
  doc.text(data.examTitle, pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  // Score summary
  doc.setFillColor(240, 248, 255);
  doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 35, 3, 3, 'F');

  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  const scoreText = `${data.totalScore} / ${data.maxScore}`;
  doc.text(scoreText, pageWidth / 2, yPos + 15, { align: 'center' });

  doc.setFontSize(16);
  const percentage = Math.round(data.percentage);
  doc.text(`${percentage}%`, pageWidth / 2, yPos + 28, { align: 'center' });
  yPos += 45;

  // Details
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Subject: ${data.subject}`, margin, yPos);
  doc.text(`Submitted: ${new Date(data.submittedAt).toLocaleString()}`, pageWidth - margin - 80, yPos);
  yPos += 15;

  // Questions review
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Question Review', margin, yPos);
  yPos += 10;

  data.responses.forEach((response, idx) => {
    if (yPos > 260) {
      doc.addPage();
      yPos = margin;
    }

    const isCorrect = response.is_correct;
    const statusColor = isCorrect === true ? [34, 139, 34] : isCorrect === false ? [220, 20, 60] : [128, 128, 128];

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Q${idx + 1}.`, margin, yPos);
    
    doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.text(
      isCorrect === true ? '✓' : isCorrect === false ? '✗' : '○',
      margin + 10,
      yPos
    );
    doc.setTextColor(0);

    doc.setFont('helvetica', 'normal');
    const qLines = doc.splitTextToSize(response.question.question_text, pageWidth - 2 * margin - 30);
    doc.text(qLines, margin + 18, yPos);
    yPos += qLines.length * 5 + 3;

    doc.setFontSize(9);
    doc.text(`Your answer: ${response.answer || '(No answer)'}`, margin + 18, yPos);
    yPos += 5;

    if (isCorrect === false) {
      doc.setTextColor(34, 139, 34);
      doc.text(`Correct answer: ${response.question.correct_answer}`, margin + 18, yPos);
      doc.setTextColor(0);
      yPos += 5;
    }

    doc.text(`Marks: ${response.marks_awarded}/${response.question.marks}`, margin + 18, yPos);
    yPos += 10;
  });

  // Save
  doc.save(`${data.examTitle.replace(/[^a-zA-Z0-9]/g, '_')}_Results.pdf`);
}

export function generateAnswerSheetPDF(data: ExamData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = margin;

  // Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`${data.title} - Answer Key`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  let questionNumber = 0;

  data.sections.forEach((section) => {
    if (yPos > 260) {
      doc.addPage();
      yPos = margin;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(section.title, margin, yPos);
    yPos += 8;

    section.questions.forEach((question) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = margin;
      }

      questionNumber++;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      const text = `${questionNumber}. ${question.correct_answer}`;
      doc.text(text, margin, yPos);

      if (question.explanation) {
        doc.setFontSize(8);
        doc.setTextColor(100);
        const explLines = doc.splitTextToSize(`   Explanation: ${question.explanation}`, pageWidth - 2 * margin);
        yPos += 5;
        doc.text(explLines, margin + 5, yPos);
        doc.setTextColor(0);
        yPos += explLines.length * 4;
      }

      yPos += 6;
    });

    yPos += 5;
  });

  doc.save(`${data.title.replace(/[^a-zA-Z0-9]/g, '_')}_AnswerKey.pdf`);
}
