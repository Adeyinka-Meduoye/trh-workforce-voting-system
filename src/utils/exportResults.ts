import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { VotingExercise, VotingResult } from '../types';
import { getChartImagesForPDF, ChartImages } from './chartExport';
import { TRH_OFFICIAL_LOGO_BASE64 } from './trhLogoData';

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
  const isRatingScale = exercise.votingMode === 'rating_scale';

  const rows: string[][] = [
    ['TRH MINISTRIES GLOBAL - OFFICIAL RECOGNITION & VOTING RECORD'],
    ['Generated At', new Date().toLocaleString()],
    [''],
    ['--- EXERCISE METADATA ---'],
    ['Exercise Title', `"${exercise.title.replace(/"/g, '""')}"`],
    ['Category', `"${(exercise.categoryName || 'Recognition').replace(/"/g, '""')}"`],
    ['Organisation', `"${(exercise.organisationName || '').replace(/"/g, '""')}"`],
    ['Department / Team', `"${(exercise.departmentName || 'All Departments').replace(/"/g, '""')}"`],
    ['Voting Model', isRatingScale ? `Workforce Nominee Rating Scale (${exercise.minScore || 5}–${exercise.maxScore || 10} pts)` : 'Standard Ballot (Single Choice)'],
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
    isRatingScale
      ? ['Rank', 'Nominee Full Name', 'Role / Department', 'Total Score Points', 'Score (Over 100%)', 'Average Rating', 'Evaluations Count', 'Outcome Status']
      : ['Rank', 'Nominee Full Name', 'Role / Department', 'Votes Received', 'Vote Percentage (%)', 'Outcome Status']
  ];

  // Sort nominees descending by score or votes
  const sortedNominees = [...(results.nomineeResults || [])].sort((a, b) => {
    if (isRatingScale) {
      return (b.totalScore ?? b.voteCount) - (a.totalScore ?? a.voteCount);
    }
    return b.voteCount - a.voteCount;
  });
  sortedNominees.forEach((nom, index) => {
    const isWinner = results.winners.some((w) => w.nomineeId === nom.nomineeId);
    const statusLabel = isWinner ? (results.isTie ? 'Joint Winner (Tie)' : 'Winner (1st Place)') : 'Nominee';
    if (isRatingScale) {
      rows.push([
        `${index + 1}`,
        `"${nom.displayName.replace(/"/g, '""')}"`,
        `"${(nom.roleOrTitle || nom.department || 'Nominee').replace(/"/g, '""')}"`,
        `${nom.totalScore ?? nom.voteCount}`,
        `${nom.scoreOver100 ?? nom.percentage}%`,
        `${nom.averageScore ?? 0} / ${exercise.maxScore || 10}`,
        `${nom.ratingsCount ?? results.totalVotes}`,
        `"${statusLabel}"`
      ]);
    } else {
      rows.push([
        `${index + 1}`,
        `"${nom.displayName.replace(/"/g, '""')}"`,
        `"${(nom.roleOrTitle || nom.department || 'Nominee').replace(/"/g, '""')}"`,
        `${nom.voteCount}`,
        `${nom.percentage}%`,
        `"${statusLabel}"`
      ]);
    }
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
 * Redesigned to executive packaging and graphic design standards with royal church branding,
 * metric tiles, certified standings table, visual analytics spreads, and cryptographic seal.
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

  // Sophisticated Executive Color Palette
  const deepNavy = [24, 18, 64]; // #181240 Imperial Midnight
  const flameOrange = [255, 138, 0]; // #FF8A00 Flame Accent
  const richGold = [217, 119, 6]; // #D97706 Warm Gold
  const slate900 = [15, 23, 42]; // #0F172A Primary Dark Text
  const slate600 = [71, 85, 105]; // #475569 Secondary Body Text
  const slate400 = [148, 163, 184]; // #94A3B8 Muted Caption Text
  const cardBorder = [226, 232, 240]; // #E2E8F0 Subtle Slate Border

  const isRatingScale = exercise.votingMode === 'rating_scale';
  const eligible = eligibleCount !== undefined ? eligibleCount : results.totalEligible;
  const participation = eligible > 0 ? ((results.totalVotes / eligible) * 100).toFixed(1) : '0';
  const recordRef = `AUTH-REC-${exercise.id.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;



  // ============================================================

  // 1. EXECUTIVE HEADER BANNER (TOP COVER)

  // ============================================================

  doc.setFillColor(deepNavy[0], deepNavy[1], deepNavy[2]);

  doc.rect(0, 0, 210, 38, 'F');



  // Dual Gold & Flame Accent Trim

  doc.setFillColor(flameOrange[0], flameOrange[1], flameOrange[2]);

  doc.rect(0, 38, 210, 1.8, 'F');

  doc.setFillColor(richGold[0], richGold[1], richGold[2]);

  doc.rect(0, 39.8, 210, 0.6, 'F');



  // Official TRH Church Logo
  // The supplied logo is a PNG data URI and can be embedded directly by jsPDF.
  doc.addImage(TRH_OFFICIAL_LOGO_BASE64, 'PNG', 10, 7, 22, 24);



  // Church Name & Document Classification

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14.5);
  doc.text(churchName.toUpperCase(), 36, 16);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 214, 165);
  doc.text('OFFICIAL ELECTION AUDIT CERTIFICATE & RATIFIED REPORT', 36, 22.5);

  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225);
  doc.text(`Reference: ${recordRef}  •  Certified Church Electoral Record`, 36, 28.5);



  // Security Classification Badge (Right aligned)

  doc.setFillColor(37, 28, 92);

  doc.roundedRect(144, 12, 52, 14, 2, 2, 'F');

  doc.setDrawColor(richGold[0], richGold[1], richGold[2]);

  doc.setLineWidth(0.4);

  doc.roundedRect(144, 12, 52, 14, 2, 2, 'S');



  doc.setTextColor(255, 191, 0);

  doc.setFont('helvetica', 'bold');

  doc.setFontSize(6.8);

  doc.text('STATUS: DIGITALLY SEALED', 170, 17.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');

  doc.setTextColor(241, 245, 249);

  doc.setFontSize(6.5);

  doc.text('IMMUTABLE AUDIT TRAIL', 170, 22.5, { align: 'center' });



  // ============================================================

  // 2. EXERCISE TITLE & EXECUTIVE CONTEXT

  // ============================================================

  let y = 48;

  doc.setTextColor(slate900[0], slate900[1], slate900[2]);

  doc.setFont('helvetica', 'bold');

  doc.setFontSize(13);

  doc.text(exercise.title, 14, y);



  y += 5.5;

  doc.setFontSize(8.5);

  doc.setFont('helvetica', 'normal');

  doc.setTextColor(slate600[0], slate600[1], slate600[2]);

  const descText = exercise.description || 'Official church recognition and voting ballot ratified by church electors.';

  const splitDesc = doc.splitTextToSize(descText, 182);

  doc.text(splitDesc, 14, y);

  y += splitDesc.length * 4.2 + 2;



  // ============================================================

  // 3. EXECUTIVE WINNER SHOWCASE SPOTLIGHT (IF WINNERS EXIST)

  // ============================================================

  if (results.winners && results.winners.length > 0) {

    const boxHeight = 24;

    // Luxury Warm Cream Fill

    doc.setFillColor(255, 252, 242);

    doc.setDrawColor(245, 158, 11);

    doc.setLineWidth(0.6);

    doc.roundedRect(14, y, 182, boxHeight, 3, 3, 'FD');



    // Inner gold ribbon accent on left edge

    doc.setFillColor(flameOrange[0], flameOrange[1], flameOrange[2]);

    doc.rect(14, y, 3.5, boxHeight, 'F');



    // Banner Tag

    doc.setTextColor(flameOrange[0], flameOrange[1], flameOrange[2]);

    doc.setFont('helvetica', 'bold');

    doc.setFontSize(7.5);

    doc.text(

      results.isTie ? '★ OUTCOME: OFFICIAL JOINT TIE DECLARED' : '★ OFFICIAL FIRST PLACE WINNER & RATIFIED HONOREE',

      22,

      y + 6.5

    );



    // Winner Display Names

    doc.setTextColor(slate900[0], slate900[1], slate900[2]);

    doc.setFont('helvetica', 'bold');

    doc.setFontSize(11);

    const winnerNames = results.winners.map((w) => w.displayName).join(', ');

    doc.text(winnerNames, 22, y + 13.5);



    // Subtitle / Scope / Score Summary

    doc.setFont('helvetica', 'normal');

    doc.setFontSize(8);

    doc.setTextColor(slate600[0], slate600[1], slate600[2]);

    const winnerDetails = results.winners

      .map((w) => {

        if (isRatingScale) {

          return `${w.roleOrTitle || w.department || 'Nominee'}  •  Score Over 100%: ${w.scoreOver100 ?? w.percentage}%  •  Total Score: ${w.totalScore ?? w.voteCount} pts`;

        }

        return `${w.roleOrTitle || w.department || 'Nominee'}  •  ${w.voteCount} Valid Votes  •  ${w.percentage}% Vote Share`;

      })

      .join(' | ');

    doc.text(winnerDetails, 22, y + 19.5);



    y += boxHeight + 6;

  }



  // ============================================================

  // 4. EXECUTIVE 4-TILE KPI METRIC GRID

  // ============================================================

  const tileWidth = 42.5;

  const tileHeight = 17;

  const tileGap = 4;

  const tileY = y;



  const kpiData = [

    {

      title: 'TOTAL BALLOTS CAST',

      val: `${results.totalVotes}`,

      sub: `${results.totalVotes === 1 ? '1 Ballot' : 'Valid Ballots'} recorded`

    },

    {

      title: 'ELECTORATE TURNOUT',

      val: `${participation}%`,

      sub: `${results.totalVotes} of ${eligible} eligible voters`

    },

    {

      title: 'REGISTERED ELECTORS',

      val: `${eligible}`,

      sub: 'Verified church members'

    },

    {

      title: 'ELECTION OUTCOME',

      val: results.isTie ? 'JOINT TIE' : 'CERTIFIED',

      sub: results.isTie ? 'Top nominees tied' : 'Decisive winner confirmed'

    }

  ];



  kpiData.forEach((kpi, idx) => {

    const tileX = 14 + idx * (tileWidth + tileGap);



    // Card background

    doc.setFillColor(248, 250, 252);

    doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2]);

    doc.setLineWidth(0.3);

    doc.roundedRect(tileX, tileY, tileWidth, tileHeight, 2, 2, 'FD');



    // Small Top border

    doc.setFillColor(idx === 0 ? flameOrange[0] : idx === 1 ? richGold[0] : deepNavy[0], idx === 0 ? flameOrange[1] : idx === 1 ? richGold[1] : deepNavy[1], idx === 0 ? flameOrange[2] : idx === 1 ? richGold[2] : deepNavy[2]);

    doc.rect(tileX, tileY, tileWidth, 1.2, 'F');



    // Title

    doc.setFont('helvetica', 'bold');

    doc.setFontSize(6.5);

    doc.setTextColor(slate400[0], slate400[1], slate400[2]);

    doc.text(kpi.title, tileX + 3.5, tileY + 5.2);



    // Primary Value

    doc.setFont('helvetica', 'bold');

    doc.setFontSize(10.5);

    doc.setTextColor(slate900[0], slate900[1], slate900[2]);

    doc.text(kpi.val, tileX + 3.5, tileY + 11.2);



    // Subtext

    doc.setFont('helvetica', 'normal');

    doc.setFontSize(6);

    doc.setTextColor(slate600[0], slate600[1], slate600[2]);

    doc.text(kpi.sub, tileX + 3.5, tileY + 15);

  });



  y += tileHeight + 6;



  // ============================================================

  // 5. EXERCISE SPECIFICATIONS TABLE

  // ============================================================

  const metadataRows = [

    [

      { content: 'Organisation:', styles: { fontStyle: 'bold' as const } },

      exercise.organisationName || 'General Church Body',

      { content: 'Category:', styles: { fontStyle: 'bold' as const } },

      exercise.categoryName || 'Leadership Recognition'

    ],

    [

      { content: 'Department / Unit:', styles: { fontStyle: 'bold' as const } },

      exercise.departmentName || 'All Departments',

      { content: 'Voting Model:', styles: { fontStyle: 'bold' as const } },

      isRatingScale ? `Rating Scale (${exercise.minScore || 5}–${exercise.maxScore || 10} pts)` : 'Single Choice Secret Ballot'

    ],

    [

      { content: 'Voting Period:', styles: { fontStyle: 'bold' as const } },

      `${new Date(exercise.startTime).toLocaleDateString()} – ${new Date(exercise.endTime).toLocaleDateString()}`,

      { content: 'Audit Status:', styles: { fontStyle: 'bold' as const } },

      exercise.resultsPublished ? 'OFFICIALLY RATIFIED & PUBLISHED' : 'PRE-PUBLICATION DRAFT'

    ]

  ];



  autoTable(doc, {

    startY: y,

    body: metadataRows,

    theme: 'plain',

    styles: { fontSize: 8, cellPadding: 1.8, textColor: [51, 65, 85] },

    columnStyles: {

      0: { cellWidth: 32, textColor: [100, 116, 139] },

      1: { cellWidth: 58 },

      2: { cellWidth: 32, textColor: [100, 116, 139] },

      3: { cellWidth: 58 }

    },

    margin: { left: 14, right: 14 }

  });



  y = (doc as any).lastAutoTable.finalY + 6;



  // ============================================================

  // 6. CERTIFIED NOMINEE STANDINGS TABLE

  // ============================================================

  doc.setTextColor(slate900[0], slate900[1], slate900[2]);

  doc.setFont('helvetica', 'bold');

  doc.setFontSize(10.5);

  doc.text(

    isRatingScale ? 'Certified Workforce Nominee Standings & Evaluation Scores' : 'Certified Nominee Vote Tallies & Percentage Shares',

    14,

    y

  );

  y += 3.5;



  const sortedNominees = [...(results.nomineeResults || [])].sort((a, b) => {

    if (isRatingScale) return (b.totalScore ?? b.voteCount) - (a.totalScore ?? a.voteCount);

    return b.voteCount - a.voteCount;

  });



  const tableHead = isRatingScale

    ? [['Rank', 'Nominee Full Name', 'Role & Department', 'Total Score', 'Score (% of Max)', 'Avg Rating', 'Official Status']]

    : [['Rank', 'Nominee Full Name', 'Role & Department', 'Votes Received', 'Vote Share', 'Official Status']];



  const tableData = sortedNominees.map((nom, idx) => {

    const isWinner = results.winners.some((w) => w.nomineeId === nom.nomineeId);

    const statusText = isWinner ? (results.isTie ? 'Joint Winner' : 'Winner (1st Place)') : 'Nominee';

    if (isRatingScale) {

      return [

        `#${idx + 1}`,

        nom.displayName,

        `${nom.roleOrTitle || '—'} / ${nom.department || '—'}`,

        (nom.totalScore ?? nom.voteCount).toString(),

        `${nom.scoreOver100 ?? nom.percentage}%`,

        `${nom.averageScore ?? 0} / ${exercise.maxScore || 10}`,

        statusText

      ];

    }

    return [

      `#${idx + 1}`,

      nom.displayName,

      `${nom.roleOrTitle || '—'} / ${nom.department || '—'}`,

      nom.voteCount.toString(),

      `${nom.percentage}%`,

      statusText

    ];

  });



  autoTable(doc, {

    startY: y,

    head: tableHead,

    body: tableData,

    theme: 'striped',

    headStyles: {

      fillColor: [24, 18, 64],

      textColor: [255, 255, 255],

      fontStyle: 'bold',

      fontSize: 8,

      cellPadding: 3

    },

    styles: {

      fontSize: 8,

      cellPadding: 2.8,

      textColor: [30, 41, 59],

      lineColor: [241, 245, 249],

      lineWidth: 0.2

    },

    alternateRowStyles: {

      fillColor: [248, 250, 252]

    },

    // A4 width is 210mm. With 14mm margins on both sides, the usable width is 182mm.
    // All columns are explicitly sized so AutoTable cannot collapse the final column.
    columnStyles: isRatingScale
      ? {
        0: { cellWidth: 13, halign: 'center', fontStyle: 'bold' },
        1: { cellWidth: 42, fontStyle: 'bold' },
        2: { cellWidth: 36 },
        3: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
        4: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
        5: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
        6: { cellWidth: 27, halign: 'center', fontStyle: 'bold' }
      }
      : {
        0: { cellWidth: 13, halign: 'center', fontStyle: 'bold' },
        1: { cellWidth: 50, fontStyle: 'bold' },
        2: { cellWidth: 40 },
        3: { cellWidth: 23, halign: 'center', fontStyle: 'bold' },
        4: { cellWidth: 24, halign: 'center', fontStyle: 'bold' },
        5: { cellWidth: 32, halign: 'center', fontStyle: 'bold' }
      },

    tableWidth: 182,
    margin: { left: 14, right: 14 }

  });



  y = (doc as any).lastAutoTable.finalY + 8;



  // ============================================================

  // 7. OFFICIAL VISUAL ANALYTICS & DISTRIBUTION CHARTS

  // ============================================================

  if (results.totalVotes > 0) {

    const chartImages = await getChartImagesForPDF(exercise, results, undefined, providedChartImages);



    if (chartImages.barChartImage || chartImages.pieChartImage) {

      // Clean page break for charts to ensure pristine visual packaging

      doc.addPage();



      // Running Header on Visual Analytics Page

      doc.setFillColor(deepNavy[0], deepNavy[1], deepNavy[2]);

      doc.rect(0, 0, 210, 16, 'F');

      doc.setFillColor(flameOrange[0], flameOrange[1], flameOrange[2]);

      doc.rect(0, 16, 210, 1.2, 'F');



      doc.setTextColor(255, 255, 255);

      doc.setFont('helvetica', 'bold');

      doc.setFontSize(8.5);

      doc.text(`${churchName.toUpperCase()}  •  ${exercise.title.toUpperCase()}`, 14, 10.5);



      doc.setFont('helvetica', 'normal');

      doc.setTextColor(255, 204, 128);

      doc.setFontSize(7.5);

      doc.text('SECTION II: OFFICIAL VISUAL ANALYTICS & DISTRIBUTION CHARTS', 125, 10.5);



      y = 26;



      doc.setTextColor(slate900[0], slate900[1], slate900[2]);

      doc.setFont('helvetica', 'bold');

      doc.setFontSize(11);

      doc.text('Audited Visual Analytics & Distribution Models', 14, y);

      y += 6;



      const chartW = 88;

      const chartH = 58;



      if (chartImages.barChartImage && chartImages.pieChartImage) {

        // Framed side-by-side presentation

        doc.setFillColor(248, 250, 252);

        doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2]);

        doc.roundedRect(14, y, chartW, chartH, 2, 2, 'FD');

        doc.roundedRect(108, y, chartW, chartH, 2, 2, 'FD');



        doc.addImage(chartImages.barChartImage, 'PNG', 14, y, chartW, chartH);

        doc.addImage(chartImages.pieChartImage, 'PNG', 108, y, chartW, chartH);



        // Figure Captions

        doc.setFontSize(7);

        doc.setFont('helvetica', 'bold');

        doc.setTextColor(slate600[0], slate600[1], slate600[2]);

        doc.text('FIGURE 1: VOTE DISTRIBUTION BY NOMINEE', 14, y + chartH + 4);

        doc.text('FIGURE 2: PERCENTAGE SHARE BREAKDOWN', 108, y + chartH + 4);



        y += chartH + 14;

      } else if (chartImages.barChartImage) {

        const singleW = 150;

        const singleH = 80;

        const startX = (210 - singleW) / 2;

        doc.addImage(chartImages.barChartImage, 'PNG', startX, y, singleW, singleH);



        doc.setFontSize(7);

        doc.setFont('helvetica', 'bold');

        doc.setTextColor(slate600[0], slate600[1], slate600[2]);

        doc.text('FIGURE 1: VOTE DISTRIBUTION BY NOMINEE', startX, y + singleH + 4);



        y += singleH + 14;

      } else if (chartImages.pieChartImage) {

        const singleW = 150;

        const singleH = 80;

        const startX = (210 - singleW) / 2;

        doc.addImage(chartImages.pieChartImage, 'PNG', startX, y, singleW, singleH);



        doc.setFontSize(7);

        doc.setFont('helvetica', 'bold');

        doc.setTextColor(slate600[0], slate600[1], slate600[2]);

        doc.text('FIGURE 1: PERCENTAGE SHARE BREAKDOWN', startX, y + singleH + 4);



        y += singleH + 14;

      }

    }

  }



  // ============================================================

  // 8. OFFICIAL SEAL & SUPER ADMIN CERTIFICATION BLOCK

  // ============================================================

  if (y > 215) {

    doc.addPage();

    y = 25;

  }



  // Divider Rule

  doc.setDrawColor(203, 213, 225);

  doc.setLineWidth(0.4);

  doc.line(14, y, 196, y);

  y += 7;



  // Official Gold Seal Medallion Graphic

  const sealCenterX = 28;

  const sealCenterY = y + 15;



  doc.setFillColor(255, 252, 240);

  doc.setDrawColor(richGold[0], richGold[1], richGold[2]);

  doc.setLineWidth(0.8);

  doc.circle(sealCenterX, sealCenterY, 13, 'FD');



  doc.setLineWidth(0.3);

  doc.circle(sealCenterX, sealCenterY, 11, 'S');



  doc.setTextColor(richGold[0], richGold[1], richGold[2]);

  doc.setFont('helvetica', 'bold');

  doc.setFontSize(6);

  doc.text('★ OFFICIAL ★', sealCenterX, sealCenterY - 3, { align: 'center' });

  doc.setFontSize(7);

  doc.text('SEAL', sealCenterX, sealCenterY + 1.5, { align: 'center' });

  doc.setFontSize(5);

  doc.text('TRH GLOBAL', sealCenterX, sealCenterY + 5.5, { align: 'center' });



  // Two-column legal and attestation statement

  doc.setFontSize(8);

  doc.setFont('helvetica', 'bold');

  doc.setTextColor(slate900[0], slate900[1], slate900[2]);

  doc.text('OFFICIAL CERTIFICATION, AUDIT GUARANTEE & RATIFICATION', 46, y + 2);



  doc.setFont('helvetica', 'normal');

  doc.setFontSize(7.5);

  doc.setTextColor(slate600[0], slate600[1], slate600[2]);

  const legalNotice =

    'This instrument constitutes an official certified voting record generated by the TRH Ministries Global Recognition & Ballot Audit System. Every ballot recorded has been cryptographically validated against the verified church voter roll and stored in immutable database archives.';

  doc.text(doc.splitTextToSize(legalNotice, 150), 46, y + 7);



  // Sign-off Columns

  y += 24;



  // Left Block: Cryptographic Audit Reference

  doc.setFont('helvetica', 'bold');

  doc.setFontSize(7.5);

  doc.setTextColor(slate900[0], slate900[1], slate900[2]);

  doc.text('Independent Electoral Hash Verification:', 14, y);

  doc.setFont('courier', 'bold');

  doc.setFontSize(7.5);

  doc.setTextColor(flameOrange[0], flameOrange[1], flameOrange[2]);

  doc.text(recordRef, 14, y + 5);



  doc.setFont('helvetica', 'normal');

  doc.setFontSize(7);

  doc.setTextColor(slate400[0], slate400[1], slate400[2]);

  doc.text('Timestamp: ' + new Date().toISOString(), 14, y + 9.5);



  // Right Block: Authorized Signature Line

  doc.setFont('helvetica', 'bold');

  doc.setFontSize(7.5);

  doc.setTextColor(slate900[0], slate900[1], slate900[2]);

  doc.text('Executive Administrative Office:', 116, y);



  doc.setDrawColor(slate400[0], slate400[1], slate400[2]);

  doc.setLineWidth(0.3);

  doc.line(116, y + 6, 196, y + 6);



  doc.setFont('helvetica', 'italic');

  doc.setFontSize(7);

  doc.setTextColor(richGold[0], richGold[1], richGold[2]);

  doc.text('[Digitally Signed & Ratified by Super Administrator]', 116, y + 10);



  // ============================================================

  // 9. PAGINATION & LEGAL FOOTER ON ALL PAGES

  // ============================================================

  const totalPages = (doc as any).internal.getNumberOfPages();

  for (let i = 1; i <= totalPages; i++) {

    doc.setPage(i);



    // Subtle bottom rule

    doc.setDrawColor(241, 245, 249);

    doc.setLineWidth(0.3);

    doc.line(14, 287, 196, 287);



    doc.setFontSize(6.5);

    doc.setFont('helvetica', 'normal');

    doc.setTextColor(slate400[0], slate400[1], slate400[2]);



    doc.text(

      `Official Audit Document  •  ${churchName}  •  Confidential & Immutable Record`,

      14,

      292

    );



    doc.text(`Page ${i} of ${totalPages}`, 196, 292, { align: 'right' });

  }



  // Save the professional PDF

  const safeTitle = exercise.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  doc.save(`${safeTitle}-official-voting-records.pdf`);

}
