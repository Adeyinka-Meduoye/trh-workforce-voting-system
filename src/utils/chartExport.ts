import { toPng } from 'html-to-image';
import { VotingExercise, VotingResult } from '../types';

export const CHART_PALETTE = [
  '#FF8A00', // Flame Orange
  '#251464', // Deep Royal Navy
  '#06B6D4', // Cyan
  '#10B981', // Emerald
  '#8B5CF6', // Purple
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#3B82F6', // Blue
  '#14B8A6', // Teal
  '#F97316'  // Orange
];

export interface ChartImages {
  barChartImage?: string;
  pieChartImage?: string;
}

/**
 * Utility to draw rounded rectangles on HTML5 Canvas.
 */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number
): void {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Generates a high-resolution, branded Bar Chart image using HTML5 Canvas.
 * Used as a 100% reliable fallback or standalone chart generator.
 */
export function generateBarChartImage(
  exercise: VotingExercise,
  results: VotingResult,
  width = 1000,
  height = 620
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const nominees = [...(results.nomineeResults || [])].sort((a, b) => b.voteCount - a.voteCount);
  const totalVotes = results.totalVotes || 0;
  const maxVote = Math.max(...nominees.map((n) => n.voteCount), 1);

  // Background
  ctx.fillStyle = '#1E293B';
  drawRoundedRect(ctx, 0, 0, width, height, 24);
  ctx.fill();

  // Subtle Border
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, 1, 1, width - 2, height - 2, 24);
  ctx.stroke();

  // Top Accent Gradient Line
  const gradient = ctx.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, '#FF8A00');
  gradient.addColorStop(0.5, '#FFA439');
  gradient.addColorStop(1, '#E85B00');
  ctx.fillStyle = gradient;
  drawRoundedRect(ctx, 0, 0, width, 6, 3);
  ctx.fill();

  // Header Title
  ctx.fillStyle = '#94A3B8';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('OFFICIAL ELECTION AUDIT RECORD • VOTE DISTRIBUTION', 40, 48);

  ctx.fillStyle = '#F8FAFC';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('Vote Distribution by Nominee', 40, 78);

  ctx.fillStyle = '#94A3B8';
  ctx.font = 'normal 13px sans-serif';
  const subtitle = `${exercise.title} • Total Ballots Cast: ${totalVotes}`;
  ctx.fillText(subtitle, 40, 102);

  // Chart Dimensions
  const chartTop = 135;
  const chartBottom = height - 125;
  const chartHeight = chartBottom - chartTop;
  const chartLeft = 80;
  const chartRight = width - 40;
  const chartWidth = chartRight - chartLeft;

  // Horizontal Grid Lines
  const gridSteps = 4;
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'right';
  for (let i = 0; i <= gridSteps; i++) {
    const yVal = Math.round((maxVote / gridSteps) * i);
    const yPos = chartBottom - (i / gridSteps) * chartHeight;

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(chartLeft, yPos);
    ctx.lineTo(chartRight, yPos);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#64748B';
    ctx.fillText(`${yVal}`, chartLeft - 12, yPos + 4);
  }

  // Draw Bars
  if (nominees.length > 0) {
    const slotWidth = chartWidth / nominees.length;
    const barWidth = Math.min(slotWidth * 0.65, 80);

    nominees.forEach((nom, index) => {
      const centerX = chartLeft + slotWidth * index + slotWidth / 2;
      const barX = centerX - barWidth / 2;
      const barH = (nom.voteCount / maxVote) * (chartHeight - 30);
      const barY = chartBottom - barH;
      const color = CHART_PALETTE[index % CHART_PALETTE.length];
      const isWinner = results.winners.some((w) => w.nomineeId === nom.nomineeId);

      // Bar with rounded top
      ctx.fillStyle = color;
      if (barH > 6) {
        drawRoundedRect(ctx, barX, barY, barWidth, barH, 8);
        ctx.fill();
        // fill bottom square corners
        ctx.fillRect(barX, chartBottom - 6, barWidth, 6);
      } else {
        ctx.fillRect(barX, chartBottom - 4, barWidth, 4);
      }

      // Value label on top of bar
      ctx.textAlign = 'center';
      ctx.fillStyle = isWinner ? '#FF8A00' : '#F8FAFC';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(`${nom.voteCount} (${nom.percentage}%)`, centerX, barY - 10);

      // Multi-line Nominee Name below bar (Each word on its own line to prevent overlap)
      ctx.fillStyle = isWinner ? '#FF8A00' : '#E2E8F0';
      ctx.font = isWinner ? 'bold 11px sans-serif' : 'normal 11px sans-serif';

      const words = (nom.displayName || '').split(/\s+/).filter(Boolean);
      let textY = chartBottom + 18;
      words.forEach((word) => {
        ctx.fillText(word, centerX, textY);
        textY += 13;
      });

      // Role/Dept label below name
      const roleDept = nom.department || '';;
      if (roleDept) {
        ctx.fillStyle = '#64748B';
        ctx.font = 'normal 9.5px sans-serif';
        const truncatedSub = roleDept.length > 20 ? roleDept.slice(0, 18) + '…' : roleDept;
        ctx.fillText(truncatedSub, centerX, textY + 4);
      }

      // Winner Badge icon or indicator
      if (isWinner) {
        ctx.fillStyle = '#FF8A00';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText('★ 1st', centerX, barY - 26);
      }
    });
  }

  // Footer branding
  ctx.textAlign = 'right';
  ctx.fillStyle = '#475569';
  ctx.font = '10px sans-serif';
  ctx.fillText('TRH Ministries Global • Official Certification', width - 40, height - 20);

  return canvas.toDataURL('image/png');
}

/**
 * Generates a high-resolution, branded Pie/Donut Chart image using HTML5 Canvas.
 * Always renders complete nominee names, vote tallies, percentage breakdown, and slice indicators.
 */
export function generatePieChartImage(
  exercise: VotingExercise,
  results: VotingResult,
  width = 1000,
  height = 600
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const nominees = [...(results.nomineeResults || [])].sort((a, b) => b.voteCount - a.voteCount);
  const totalVotes = results.totalVotes || 0;

  // Background
  ctx.fillStyle = '#1E293B';
  drawRoundedRect(ctx, 0, 0, width, height, 24);
  ctx.fill();

  // Subtle Border
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, 1, 1, width - 2, height - 2, 24);
  ctx.stroke();

  // Top Accent Gradient Line
  const gradient = ctx.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, '#10B981');
  gradient.addColorStop(0.5, '#06B6D4');
  gradient.addColorStop(1, '#FF8A00');
  ctx.fillStyle = gradient;
  drawRoundedRect(ctx, 0, 0, width, 6, 3);
  ctx.fill();

  // Header Title
  ctx.fillStyle = '#94A3B8';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('OFFICIAL ELECTION AUDIT RECORD • PERCENTAGE BREAKDOWN', 40, 48);

  ctx.fillStyle = '#F8FAFC';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('Percentage Share Breakdown', 40, 78);

  ctx.fillStyle = '#94A3B8';
  ctx.font = 'normal 13px sans-serif';
  const subtitle = `${exercise.title} • Total Votes: ${totalVotes} • ${nominees.length} Nominees Evaluated`;
  ctx.fillText(subtitle, 40, 102);

  // Donut Chart center and radii
  const centerX = 260;
  const centerY = 340;
  const outerRadius = 145;
  const innerRadius = 75;

  let currentAngle = -Math.PI / 2;

  if (totalVotes > 0 && nominees.length > 0) {
    nominees.forEach((nom, index) => {
      const sliceAngle = (nom.voteCount / totalVotes) * 2 * Math.PI;
      const color = CHART_PALETTE[index % CHART_PALETTE.length];

      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius, currentAngle, currentAngle + sliceAngle);
      ctx.arc(centerX, centerY, innerRadius, currentAngle + sliceAngle, currentAngle, true);
      ctx.closePath();

      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Draw percentage label on larger slices
      if (nom.percentage && nom.percentage >= 6 && sliceAngle > 0.35) {
        const midAngle = currentAngle + sliceAngle / 2;
        const midRadius = (innerRadius + outerRadius) / 2;
        const lx = centerX + Math.cos(midAngle) * midRadius;
        const ly = centerY + Math.sin(midAngle) * midRadius;

        ctx.textAlign = 'center';
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText(`${nom.percentage}%`, lx, ly + 4);
      }

      currentAngle += sliceAngle;
    });

    // Center Donut Text
    ctx.textAlign = 'center';
    ctx.fillStyle = '#F8FAFC';
    ctx.font = 'bold 32px sans-serif';
    ctx.fillText(`${totalVotes}`, centerX, centerY + 2);

    ctx.fillStyle = '#94A3B8';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('TOTAL VOTES', centerX, centerY + 24);
  } else {
    // Empty state circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRadius, 0, 2 * Math.PI);
    ctx.arc(centerX, centerY, innerRadius, 2 * Math.PI, 0, true);
    ctx.fillStyle = '#334155';
    ctx.fill();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#94A3B8';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('No Votes Recorded', centerX, centerY);
  }

  // Legend on the Right Side (Supports multi-column or single column so all nominees show)
  const isMultiCol = nominees.length > 6;
  const col1X = 490;
  const col2X = 740;
  const startY = 145;
  const availableHeight = height - startY - 50;
  const rowsPerCol = isMultiCol ? Math.ceil(nominees.length / 2) : nominees.length;
  const itemHeight = Math.min(52, Math.max(38, Math.floor(availableHeight / rowsPerCol)));

  ctx.textAlign = 'left';

  nominees.forEach((nom, index) => {
    const col = isMultiCol && index >= rowsPerCol ? 1 : 0;
    const rowIndex = isMultiCol && index >= rowsPerCol ? index - rowsPerCol : index;
    const legendX = col === 0 ? col1X : col2X;
    const legendY = startY + rowIndex * itemHeight;

    const color = CHART_PALETTE[index % CHART_PALETTE.length];
    const isWinner = results.winners.some((w) => w.nomineeId === nom.nomineeId);

    // Color Swatch
    ctx.fillStyle = color;
    drawRoundedRect(ctx, legendX, legendY, 14, 14, 4);
    ctx.fill();

    // Nominee Full Display Name
    ctx.fillStyle = isWinner ? '#FF8A00' : '#F8FAFC';
    ctx.font = isWinner ? 'bold 13px sans-serif' : 'bold 12px sans-serif';
    const maxLen = isMultiCol ? 22 : 32;
    let displayName = nom.displayName;
    if (displayName.length > maxLen) {
      displayName = displayName.slice(0, maxLen - 2) + '…';
    }
    ctx.fillText(displayName, legendX + 22, legendY + 12);

    // Vote tally & percentage
    ctx.fillStyle = isWinner ? '#FF8A00' : '#94A3B8';
    ctx.font = 'normal 11px sans-serif';
    ctx.fillText(
      `${nom.voteCount} votes • ${nom.percentage}% share`,
      legendX + 22,
      legendY + 28
    );

    if (isWinner) {
      ctx.fillStyle = '#FF8A00';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText('★ 1st', legendX + (isMultiCol ? 180 : 280), legendY + 12);
    }
  });

  // Footer branding
  ctx.textAlign = 'right';
  ctx.fillStyle = '#475569';
  ctx.font = '10px sans-serif';
  ctx.fillText('TRH Ministries Global • Official Certification', width - 40, height - 20);

  return canvas.toDataURL('image/png');
}

/**
 * Attempts to capture a live DOM element (e.g. Recharts card) as a PNG data URL.
 * Falls back safely to null if element is not mounted or capture fails.
 */
export async function captureDOMChartImage(
  elementId: string,
  options?: { backgroundColor?: string; pixelRatio?: number }
): Promise<string | null> {
  const element = document.getElementById(elementId);
  if (!element) return null;

  try {
    return await toPng(element, {
      backgroundColor: options?.backgroundColor || '#1E293B',
      pixelRatio: options?.pixelRatio || 2,
      cacheBust: true,
      filter: (node) => {
        if (node instanceof HTMLElement && node.classList.contains('chart-ignore-capture')) {
          return false;
        }
        return true;
      }
    });
  } catch (err) {
    console.warn(`[chartExport] captureDOMChartImage failed for element #${elementId}:`, err);
    return null;
  }
}

/**
 * Triggers a native browser file download for a base64 image data URL.
 */
export function downloadImageFile(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Downloads charts separately as high-resolution PNG images.
 * 'bar' -> Vote Distribution Bar Chart
 * 'pie' -> Percentage Breakdown Pie Chart
 * 'both' -> Both Bar and Pie charts
 */
export async function downloadChartAsImage(
  chartType: 'bar' | 'pie' | 'both',
  exercise: VotingExercise,
  results: VotingResult,
  _domIds?: { bar?: string; pie?: string }
): Promise<{ success: boolean; filenames: string[] }> {
  const safeTitle = exercise.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const filenames: string[] = [];

  if (chartType === 'bar' || chartType === 'both') {
    const barImg = generateBarChartImage(exercise, results);
    if (barImg) {
      const filename = `${safeTitle}-vote-distribution-chart.png`;
      downloadImageFile(barImg, filename);
      filenames.push(filename);
    }
  }

  if (chartType === 'pie' || chartType === 'both') {
    // If downloading both, add a small 250ms delay so browsers don't block simultaneous downloads
    if (chartType === 'both') {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    const pieImg = generatePieChartImage(exercise, results);
    if (pieImg) {
      const filename = `${safeTitle}-percentage-breakdown-chart.png`;
      downloadImageFile(pieImg, filename);
      filenames.push(filename);
    }
  }

  return {
    success: filenames.length > 0,
    filenames
  };
}

/**
 * Resolves both Bar and Pie chart images for embedding into jsPDF.
 * Always renders high-definition, publication-grade vector rasterizations.
 */
export async function getChartImagesForPDF(
  exercise: VotingExercise,
  results: VotingResult,
  _domIds?: { bar?: string; pie?: string },
  providedImages?: ChartImages
): Promise<ChartImages> {
  const barChartImage = providedImages?.barChartImage || generateBarChartImage(exercise, results);
  const pieChartImage = providedImages?.pieChartImage || generatePieChartImage(exercise, results);

  return {
    barChartImage,
    pieChartImage
  };
}
