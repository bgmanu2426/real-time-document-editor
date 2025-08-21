'use client';

import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

/**
 * Convert HTML content to plain text
 */
function htmlToText(html: string): string {
  // Create a temporary DOM element to parse HTML
  const temp = document.createElement('div');
  temp.innerHTML = html;
  
  // Get text content and clean up whitespace
  return temp.textContent || temp.innerText || '';
}

/**
 * Convert HTML content to structured text with formatting
 */
function htmlToStructuredText(html: string): string {
  const temp = document.createElement('div');
  temp.innerHTML = html;
  
  let text = '';
  
  function processNode(node: Node): void {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      
      switch (element.tagName.toLowerCase()) {
        case 'h1':
        case 'h2':
        case 'h3':
        case 'h4':
        case 'h5':
        case 'h6':
          text += '\n\n' + element.textContent?.toUpperCase() + '\n' + '='.repeat(element.textContent?.length || 0) + '\n\n';
          break;
        case 'p':
          text += element.textContent + '\n\n';
          break;
        case 'strong':
        case 'b':
          text += '**' + element.textContent + '**';
          break;
        case 'em':
        case 'i':
          text += '*' + element.textContent + '*';
          break;
        case 'ul':
          element.childNodes.forEach(child => {
            if (child.nodeName.toLowerCase() === 'li') {
              text += '• ' + (child.textContent || '') + '\n';
            }
          });
          text += '\n';
          break;
        case 'ol':
          let counter = 1;
          element.childNodes.forEach(child => {
            if (child.nodeName.toLowerCase() === 'li') {
              text += counter + '. ' + (child.textContent || '') + '\n';
              counter++;
            }
          });
          text += '\n';
          break;
        case 'li':
          // Skip processing here as it's handled by ul/ol
          break;
        case 'br':
          text += '\n';
          break;
        default:
          // Process child nodes for other elements
          node.childNodes.forEach(processNode);
      }
    }
  }
  
  temp.childNodes.forEach(processNode);
  
  return text.trim();
}

/**
 * Export document as plain text
 */
export function exportAsText(content: string, title: string): void {
  const textContent = htmlToStructuredText(content);
  const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
  saveAs(blob, `${title}.txt`);
}

/**
 * Export document as PDF
 */
export function exportAsPDF(content: string, title: string): void {
  // Create new jsPDF instance
  const doc = new jsPDF();
  
  // Set up the document
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - (margin * 2);
  let currentY = margin;
  
  // Add title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(title, margin, currentY);
  currentY += 20;
  
  // Add a line under the title
  doc.setLineWidth(0.5);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 15;
  
  // Reset font for content
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  
  // Convert HTML to text and split into lines
  const textContent = htmlToStructuredText(content);
  const lines = doc.splitTextToSize(textContent, maxWidth);
  
  // Add content with page breaks
  lines.forEach((line: string) => {
    if (currentY > pageHeight - margin) {
      doc.addPage();
      currentY = margin;
    }
    
    doc.text(line, margin, currentY);
    currentY += 6; // Line height
  });
  
  // Save the PDF
  doc.save(`${title}.pdf`);
}

/**
 * Parse HTML content and convert to DOCX paragraphs
 */
function parseHtmlToDocxParagraphs(html: string): Paragraph[] {
  const temp = document.createElement('div');
  temp.innerHTML = html;
  
  const paragraphs: Paragraph[] = [];
  
  function processNode(node: Node): Paragraph[] {
    const nodeParagraphs: Paragraph[] = [];
    
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      
      switch (element.tagName.toLowerCase()) {
        case 'h1':
          nodeParagraphs.push(new Paragraph({
            text: element.textContent || '',
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 200 }
          }));
          break;
        case 'h2':
          nodeParagraphs.push(new Paragraph({
            text: element.textContent || '',
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 200 }
          }));
          break;
        case 'h3':
          nodeParagraphs.push(new Paragraph({
            text: element.textContent || '',
            heading: HeadingLevel.HEADING_3,
            spacing: { after: 200 }
          }));
          break;
        case 'h4':
          nodeParagraphs.push(new Paragraph({
            text: element.textContent || '',
            heading: HeadingLevel.HEADING_4,
            spacing: { after: 200 }
          }));
          break;
        case 'p':
          const textRuns = parseInlineElements(element);
          nodeParagraphs.push(new Paragraph({
            children: textRuns,
            spacing: { after: 120 }
          }));
          break;
        case 'ul':
          element.querySelectorAll('li').forEach((li) => {
            nodeParagraphs.push(new Paragraph({
              text: li.textContent || '',
              bullet: { level: 0 },
              spacing: { after: 60 }
            }));
          });
          break;
        case 'ol':
          element.querySelectorAll('li').forEach((li, index) => {
            nodeParagraphs.push(new Paragraph({
              text: li.textContent || '',
              numbering: { reference: 'default-numbering', level: 0 },
              spacing: { after: 60 }
            }));
          });
          break;
        case 'br':
          nodeParagraphs.push(new Paragraph({ text: '' }));
          break;
        default:
          // For other elements, process their children
          Array.from(element.childNodes).forEach(child => {
            nodeParagraphs.push(...processNode(child));
          });
      }
    } else if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
      nodeParagraphs.push(new Paragraph({
        children: [new TextRun({ text: node.textContent })],
        spacing: { after: 120 }
      }));
    }
    
    return nodeParagraphs;
  }
  
  function parseInlineElements(element: Element): TextRun[] {
    const textRuns: TextRun[] = [];
    
    Array.from(element.childNodes).forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        if (node.textContent?.trim()) {
          textRuns.push(new TextRun({ text: node.textContent }));
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element;
        const text = el.textContent || '';
        
        if (!text.trim()) return;
        
        let textRun: TextRun;
        
        switch (el.tagName.toLowerCase()) {
          case 'strong':
          case 'b':
            textRun = new TextRun({ text, bold: true });
            break;
          case 'em':
          case 'i':
            textRun = new TextRun({ text, italics: true });
            break;
          case 'u':
            textRun = new TextRun({ text, underline: {} });
            break;
          case 'sup':
            textRun = new TextRun({ text, superScript: true });
            break;
          case 'sub':
            textRun = new TextRun({ text, subScript: true });
            break;
          default:
            textRun = new TextRun({ text });
        }
        
        textRuns.push(textRun);
      }
    });
    
    return textRuns.length > 0 ? textRuns : [new TextRun({ text: element.textContent || '' })];
  }
  
  Array.from(temp.childNodes).forEach(node => {
    paragraphs.push(...processNode(node));
  });
  
  return paragraphs.length > 0 ? paragraphs : [new Paragraph({ text: 'Empty document' })];
}

/**
 * Export document as DOCX
 */
export async function exportAsDocx(content: string, title: string): Promise<void> {
  try {
    const paragraphs = parseHtmlToDocxParagraphs(content);
    
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // Title paragraph
          new Paragraph({
            children: [
              new TextRun({
                text: title,
                bold: true,
                size: 32, // 16pt
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
          }),
          // Content paragraphs
          ...paragraphs
        ],
      }],
    });
    
    const buffer = await Packer.toBlob(doc);
    saveAs(buffer, `${title}.docx`);
  } catch (error) {
    console.error('Error exporting to DOCX:', error);
    throw new Error('Failed to export document as DOCX');
  }
}

/**
 * Export formats enum
 */
export enum ExportFormat {
  TEXT = 'text',
  PDF = 'pdf',
  DOCX = 'docx'
}

/**
 * Main export function that handles all formats
 */
export async function exportDocument(
  content: string, 
  title: string, 
  format: ExportFormat
): Promise<void> {
  try {
    switch (format) {
      case ExportFormat.TEXT:
        exportAsText(content, title);
        break;
      case ExportFormat.PDF:
        exportAsPDF(content, title);
        break;
      case ExportFormat.DOCX:
        await exportAsDocx(content, title);
        break;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  } catch (error) {
    console.error(`Error exporting document as ${format}:`, error);
    throw error;
  }
}