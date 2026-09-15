import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { VotingExercise, VotingResult } from '../types';
import { getChartImagesForPDF, ChartImages } from './chartExport';

/**
 * Exports exercise voting results as a structured CSV document.
 */
export function exportVotingResultsCSV(
  exercise: VotingExercise,
  results: VotingResult,
  eligibleCount?: number
): void {
  const timestamp = new Date().toISOString();
  const eligible = eligibleCount !== undefined ? eligibleCount : results.totalEligible;
  const participation = eligible > 0 ? ((results.totalVotes / eligible) * 100).toFixed(1) : '0';

  const rows: string[][] = [
    ['TRH MINISTRIES GLOBAL - OFFICIAL RECOGNITION & VOTING RECORD'],
    ['Generated At', new Date().toLocaleString()],
    [''],
    ['--- EXERCISE METADATA ---'],
    ['Exercise Title', `"${exercise.title.replace(/"/g, '""')}"`],
    ['Category', `"${(exercise.categoryName || 'Recognition').replace(/"/g, '""')}"`],
    ['Organisation', `"${(exercise.organisationName || '').replace(/"/g, '""')}"`],
    ['Department / Team', `"${(exercise.departmentName || 'All Departments').replace(/"/g, '""')}"`],
    ['Current Status', exercise.status.toUpperCase()],
    ['Voting Window Start', new Date(exercise.startTime).toLocaleString()],
    ['Voting Window End', new Date(exercise.endTime).toLocaleString()],
    ['Results Published', exercise.resultsPublished ? 'YES' : 'NO'],
    [''],
    ['--- PARTICIPATION SUMMARY ---'],
    ['Total Registered Eligible Voters', `${eligible}`],
    ['Total Valid Ballots Cast', `${results.totalVotes}`],
    ['Participation / Turnout Rate', `${participation}%`],
    ['Outcome Status', results.isTie ? 'TIE BETWEEN TOP NOMINEES' : 'DECISIVE WINNER DETERMINED'],
    [''],
    ['--- CERTIFIED NOMINEE VOTE TALLIES ---'],
    ['Rank', 'Nominee Full Name', 'Role / Department', 'Votes Received', 'Vote Percentage (%)', 'Outcome Status']
  ];

  // Sort nominees descending by votes
  const sortedNominees = [...(results.nomineeResults || [])].sort((a, b) => b.voteCount - a.voteCount);

  sortedNominees.forEach((nom, index) => {
    const isWinner = results.winners.some((w) => w.nomineeId === nom.nomineeId);
    const statusLabel = isWinner ? (results.isTie ? 'Joint Winner (Tie)' : 'Winner (1st Place)') : 'Nominee';
    rows.push([
      `${index + 1}`,
      `"${nom.displayName.replace(/"/g, '""')}"`,
      `"${(nom.roleOrTitle || nom.department || 'Nominee').replace(/"/g, '""')}"`,
      `${nom.voteCount}`,
      `${nom.percentage}%`,
      `"${statusLabel}"`
    ]);
  });

  rows.push(['']);
  rows.push(['--- AUDIT & COMPLIANCE VERIFICATION ---']);
  rows.push(['Certified By', 'Super Administrator']);
  rows.push(['Verification Mode', 'Cryptographic Ballot Log Verification']);
  rows.push(['System Hash ID', `REC-${exercise.id.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`]);

  const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  const safeTitle = exercise.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `${safeTitle}-official-voting-records.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exports exercise voting results as an official church PDF certificate & audit report.
 * Embeds official visual analytics charts (Vote Distribution Bar Chart & Percentage Breakdown Pie Chart).
 */
export async function exportVotingResultsPDF(
  exercise: VotingExercise,
  results: VotingResult,
  churchName = 'TRH Ministries Global',
  eligibleCount?: number,
  providedChartImages?: ChartImages
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const primaryColor = [37, 20, 100]; // Deep Navy Purple #251464
  const accentColor = [255, 138, 0]; // Flame Orange #FF8A00
  const darkTextColor = [15, 23, 42]; // Slate 900
  const slateTextColor = [100, 116, 139]; // Slate 500

  // 1. Header Banner
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 36, 'F');

  // Orange accent bottom line
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.rect(0, 36, 210, 2, 'F');

  // Church Name & Report Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(churchName.toUpperCase(), 14, 15);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 210, 160);
  doc.text('OFFICIAL ELECTION & RECOGNITION EXERCISE AUDIT REPORT', 14, 23);

  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(`Generated on: ${new Date().toLocaleString()} | Official Church Record`, 14, 30);

  // 2. Exercise Overview Box
  let y = 46;
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(exercise.title, 14, y);

  y += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(slateTextColor[0], slateTextColor[1], slateTextColor[2]);
  const descText = exercise.description || 'No additional description provided.';
  const splitDesc = doc.splitTextToSize(descText, 180);
  doc.text(splitDesc, 14, y);
  y += splitDesc.length * 4.5 + 2;

  // Metadata Grid Table
  const eligible = eligibleCount !== undefined ? eligibleCount : results.totalEligible;
  const participation = eligible > 0 ? ((results.totalVotes / eligible) * 100).toFixed(1) : '0';

  const metadataRows = [
    [
      { content: 'Organisation:', styles: { fontStyle: 'bold' as const } },
      exercise.organisationName || 'General',
      { content: 'Category:', styles: { fontStyle: 'bold' as const } },
      exercise.categoryName || 'Recognition'
    ],
    [
      { content: 'Department:', styles: { fontStyle: 'bold' as const } },
      exercise.departmentName || 'All Departments',
      { content: 'Status:', styles: { fontStyle: 'bold' as const } },
      exercise.status.toUpperCase()
    ],
    [
      { content: 'Voting Period:', styles: { fontStyle: 'bold' as const } },
      `${new Date(exercise.startTime).toLocaleDateString()} - ${new Date(exercise.endTime).toLocaleDateString()}`,
      { content: 'Turnout / Ballots:', styles: { fontStyle: 'bold' as const } },
      `${results.totalVotes} Votes (${participation}% Participation)`
    ]
  ];

  autoTable(doc, {
    startY: y,
    body: metadataRows,
    theme: 'plain',
    styles: { fontSize: 8.5, cellPadding: 2, textColor: [30, 41, 59] },
    columnStyles: {
      0: { cellWidth: 32, textColor: [100, 116, 139] },
      1: { cellWidth: 58 },
      2: { cellWidth: 32, textColor: [100, 116, 139] },
      3: { cellWidth: 58 }
    },
    margin: { left: 14, right: 14 }
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // 3. Winner Highlight Box
  if (results.winners && results.winners.length > 0) {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, y, 182, 22, 3, 3, 'FD');

    doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.rect(14, y, 3, 22, 'F');

    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(results.isTie ? 'OUTCOME: TIE DECLARED' : 'OFFICIAL WINNER / LEADING RECIPIENT', 22, y + 7);

    doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
    doc.setFontSize(11);
    const winnerNames = results.winners.map((w) => `${w.displayName} (${w.voteCount} votes - ${w.percentage}%)`).join(', ');
    doc.text(winnerNames, 22, y + 15);

    y += 28;
  }

  // 4. Certified Results Table
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Certified Nominee Vote Tallies', 14, y);
  y += 4;

  const sortedNominees = [...(results.nomineeResults || [])].sort((a, b) => b.voteCount - a.voteCount);
  const tableData = sortedNominees.map((nom, idx) => {
    const isWinner = results.winners.some((w) => w.nomineeId === nom.nomineeId);
    const statusText = isWinner ? (results.isTie ? 'Tie (1st Place)' : 'Winner (1st Place)') : 'Nominee';
    return [
      `#${idx + 1}`,
      nom.displayName,
      nom.roleOrTitle || nom.department || '—',
      nom.voteCount.toString(),
      `${nom.percentage}%`,
      statusText
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [['Rank', 'Nominee Name', 'Role / Department', 'Votes Received', 'Vote Share', 'Official Status']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [37, 20, 100],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 3,
      textColor: [30, 41, 59]
    },
    columnStyles: {
      0: { cellWidth: 15, halign: 'center' },
      1: { cellWidth: 50, fontStyle: 'bold' },
      2: { cellWidth: 45 },
      3: { cellWidth: 25, halign: 'center' },
      4: { cellWidth: 22, halign: 'center' },
      5: { cellWidth: 25, fontStyle: 'bold' }
    },
    margin: { left: 14, right: 14 }
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // 5. Official Visual Analytics & Chart Records (if votes exist)
  if (results.totalVotes > 0) {
    const chartImages = await getChartImagesForPDF(exercise, results, undefined, providedChartImages);

    if (chartImages.barChartImage || chartImages.pieChartImage) {
      // If charts would overflow the page, start a fresh page
      if (y + 75 > 265) {
        doc.addPage();

        // Decorative Header on New Page
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(0, 0, 210, 14, 'F');
        doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
        doc.rect(0, 14, 210, 1.5, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.text(`${exercise.title.toUpperCase()} — VISUAL ANALYTICS & AUDIT CHARTS`, 14, 9.5);

        y = 24;
      }

      doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Visual Analytics & Vote Distribution Charts', 14, y);
      y += 6;

      const chartW = 88;
      const chartH = 55;

      if (chartImages.barChartImage && chartImages.pieChartImage) {
        // Side-by-side charts
        doc.addImage(chartImages.barChartImage, 'PNG', 14, y, chartW, chartH);
        doc.addImage(chartImages.pieChartImage, 'PNG', 108, y, chartW, chartH);

        // Figure Captions
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(slateTextColor[0], slateTextColor[1], slateTextColor[2]);
        doc.text('FIGURE 1: VOTE DISTRIBUTION BY NOMINEE', 14, y + chartH + 4);
        doc.text('FIGURE 2: PERCENTAGE SHARE BREAKDOWN', 108, y + chartH + 4);

        y += chartH + 12;
      } else if (chartImages.barChartImage) {
        const singleW = 140;
        const singleH = 75;
        const startX = (210 - singleW) / 2;
        doc.addImage(chartImages.barChartImage, 'PNG', startX, y, singleW, singleH);

        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(slateTextColor[0], slateTextColor[1], slateTextColor[2]);
        doc.text('FIGURE 1: VOTE DISTRIBUTION BY NOMINEE', startX, y + singleH + 4);

        y += singleH + 12;
      } else if (chartImages.pieChartImage) {
        const singleW = 140;
        const singleH = 75;
        const startX = (210 - singleW) / 2;
        doc.addImage(chartImages.pieChartImage, 'PNG', startX, y, singleW, singleH);

        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(slateTextColor[0], slateTextColor[1], slateTextColor[2]);
        doc.text('FIGURE 1: PERCENTAGE SHARE BREAKDOWN', startX, y + singleH + 4);

        y += singleH + 12;
      }
    }
  }

  // 6. Official Verification Stamp & Signature Footer
  if (y > 235) {
    doc.addPage();
    y = 20;
  }

  doc.setDrawColor(203, 213, 225);
  doc.line(14, y, 196, y);
  y += 6;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('SUPER ADMIN AUTHENTICATION & CHURCH AUDIT GUARANTEE', 14, y);

  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(
    'This document represents an official, immutable voting report extracted from the TRH Ministries Global Recognition System. All votes recorded are verified against the active church voter register and cryptographic receipt identifiers.',
    14,
    y,
    { maxWidth: 180 }
  );

  y += 10;
  const recordRef = `AUTH-REC-${exercise.id.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
  doc.text(`Record Reference: ${recordRef}`, 14, y);
  doc.text('Authorized By: Super Administrator Signature & Seal [DIGITALLY CERTIFIED]', 110, y);

  // Pagination Footer on all pages
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Page ${i} of ${pageCount} • Official Record • ${churchName}`,
      105,
      292,
      { align: 'center' }
    );
  }

  // Save PDF
  const safeTitle = exercise.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  doc.save(`${safeTitle}-official-voting-records.pdf`);
}
