import jsPDF from 'jspdf';
import { ComicPage } from '../types';

/**
 * Load image and convert to data URL if needed
 */
const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // For CORS images
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

/**
 * Convert image URL to base64 data URL
 */
const getImageDataUrl = async (src: string): Promise<string> => {
  // If already a data URL, return as is
  if (src.startsWith('data:')) {
    return src;
  }

  // For remote URLs, we need to load through canvas to get data URL
  try {
    const img = await loadImage(src);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.95);
  } catch (error) {
    console.error('Failed to load image:', src, error);
    throw new Error(`Failed to load image: ${src}`);
  }
};

/**
 * Export comic pages to PDF
 */
export const exportComicToPDF = async (
  pages: ComicPage[],
  title: string = 'Comic Book'
): Promise<void> => {
  if (pages.length === 0) {
    throw new Error('No pages to export');
  }

  // Show loading indicator
  const loadingDiv = document.createElement('div');
  loadingDiv.innerHTML = `
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      color: white;
      font-family: sans-serif;
      flex-direction: column;
      gap: 16px;
    ">
      <div style="font-size: 24px; font-weight: bold;">生成 PDF 中...</div>
      <div id="pdf-progress" style="font-size: 18px;">0 / ${pages.length}</div>
      <div style="
        width: 300px;
        height: 8px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 4px;
        overflow: hidden;
      ">
        <div id="pdf-progress-bar" style="
          width: 0%;
          height: 100%;
          background: linear-gradient(90deg, #3b82f6, #60a5fa);
          transition: width 0.3s ease;
        "></div>
      </div>
    </div>
  `;
  document.body.appendChild(loadingDiv);

  const updateProgress = (current: number, total: number) => {
    const progressText = document.getElementById('pdf-progress');
    const progressBar = document.getElementById('pdf-progress-bar');
    if (progressText) progressText.textContent = `${current} / ${total}`;
    if (progressBar) progressBar.style.width = `${(current / total) * 100}%`;
  };

  try {
    // Create PDF with portrait orientation (2:3 aspect ratio)
    // A4 size: 210mm x 297mm
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // A4 dimensions in mm
    const pageWidth = 210;
    const pageHeight = 297;

    // Process each page
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];

      updateProgress(i, pages.length);

      // Add new page for all pages except the first
      if (i > 0) {
        pdf.addPage();
      }

      try {
        // Load and convert image to data URL
        const imageDataUrl = await getImageDataUrl(page.imageUrl);

        // Load image to get dimensions
        const img = await loadImage(imageDataUrl);
        const imgWidth = img.naturalWidth;
        const imgHeight = img.naturalHeight;
        const imgRatio = imgWidth / imgHeight;

        // Calculate dimensions to fit the image on the page while maintaining aspect ratio
        let finalWidth = pageWidth;
        let finalHeight = pageWidth / imgRatio;

        // If image is too tall, scale based on height instead
        if (finalHeight > pageHeight) {
          finalHeight = pageHeight;
          finalWidth = pageHeight * imgRatio;
        }

        // Center the image on the page
        const xOffset = (pageWidth - finalWidth) / 2;
        const yOffset = (pageHeight - finalHeight) / 2;

        // Add image to PDF
        pdf.addImage(imageDataUrl, 'JPEG', xOffset, yOffset, finalWidth, finalHeight);

        // Add page number at the bottom
        pdf.setFontSize(10);
        pdf.setTextColor(100);
        pdf.text(
          `Page ${page.pageNumber}`,
          pageWidth / 2,
          pageHeight - 5,
          { align: 'center' }
        );

      } catch (error) {
        console.error(`Failed to add page ${page.pageNumber} to PDF:`, error);
        // Add error page
        pdf.setFontSize(16);
        pdf.setTextColor(200, 0, 0);
        pdf.text(
          `Error loading page ${page.pageNumber}`,
          pageWidth / 2,
          pageHeight / 2,
          { align: 'center' }
        );
      }
    }

    updateProgress(pages.length, pages.length);

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '').replace('T', '_');
    const filename = `${title.replace(/[^a-z0-9]/gi, '_')}_${timestamp}.pdf`;

    // Save the PDF
    pdf.save(filename);

    // Remove loading indicator after a short delay
    setTimeout(() => {
      document.body.removeChild(loadingDiv);
    }, 500);

  } catch (error) {
    // Remove loading indicator
    document.body.removeChild(loadingDiv);
    console.error('PDF export error:', error);
    throw error;
  }
};
