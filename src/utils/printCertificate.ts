import { WinnerRecord } from '../types';
import { TRH_OFFICIAL_LOGO_BASE64 } from './trhLogoData';
import { toPng } from 'html-to-image';

/**
 * Official Church Logo URL
 */
export const TRH_LOGO_URL = 'https://i.postimg.cc/4yRFmpJw/TRH-logo.png';

/**
 * Clean inline SVG of the TRH emblem maintained for vector fallbacks.
 */
export const TRH_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="70" height="70" class="trh-logo-vector">
  <defs>
    <linearGradient id="trhShieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#251464" />
      <stop offset="50%" stop-color="#1E1050" />
      <stop offset="100%" stop-color="#0F0826" />
    </linearGradient>
    <linearGradient id="trhGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFD54F" />
      <stop offset="50%" stop-color="#FF8A00" />
      <stop offset="100%" stop-color="#E85B00" />
    </linearGradient>
    <linearGradient id="trhInnerGlow" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.25" />
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0" />
    </linearGradient>
  </defs>
  <path d="M100 15 C145 15, 175 32, 175 75 C175 130, 130 170, 100 185 C70 170, 25 130, 25 75 C25 32, 55 15, 100 15 Z"
        fill="url(#trhShieldGrad)"
        stroke="url(#trhGoldGrad)"
        stroke-width="5" />
  <path d="M100 22 C138 22, 165 37, 165 75 C165 124, 126 160, 100 174 C74 160, 35 124, 35 75 C35 37, 62 22, 100 22 Z"
        fill="url(#trhInnerGlow)" />
  <path d="M72 65 L82 85 L100 55 L118 85 L128 65 L122 95 L78 95 Z" fill="url(#trhGoldGrad)" />
  <circle cx="72" cy="62" r="3" fill="#FFE5B4" />
  <circle cx="100" cy="51" r="3.5" fill="#FFE5B4" />
  <circle cx="128" cy="62" r="3" fill="#FFE5B4" />
  <rect x="94" y="85" width="12" height="48" rx="3" fill="url(#trhGoldGrad)" />
  <rect x="80" y="97" width="40" height="12" rx="3" fill="url(#trhGoldGrad)" />
  <path d="M100 109 C96 103, 88 103, 88 109 C88 115, 100 123, 100 123 C100 123, 112 115, 112 109 C112 103, 104 103, 100 109 Z" fill="#FFFFFF" />
  <text x="100" y="156" text-anchor="middle" font-family="'Inter', sans-serif" font-weight="900" font-size="20" letter-spacing="2" fill="#FFFFFF">TRH</text>
  <text x="100" y="167" text-anchor="middle" font-family="'Inter', sans-serif" font-weight="700" font-size="8" letter-spacing="1.5" fill="#FF8A00">THE REINVENTION HOUSE</text>
</svg>`;

/**
 * Masterpiece 24K Gold Curvy Oscar Statuette vector graphic:
 * Designed by a first-class Oscar award sculptor.
 * Features realistic 24K gold ray-traced shading, Art Deco faceted contours,
 * crusader longsword of honor, curved triumph laurels, and a solid black obsidian
 * marble cylinder plinth with a beveled, screw-bolted engraved brass plaque.
 */
export const OSCAR_STATUETTE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 560" width="320" height="500" class="oscar-svg">
  <defs>
    <!-- Radiant Golden Stage Volumetric Halo -->
    <radialGradient id="oscarHalo" cx="50%" cy="32%" r="52%">
      <stop offset="0%" stop-color="#FFE885" stop-opacity="0.55" />
      <stop offset="25%" stop-color="#FFB300" stop-opacity="0.32" />
      <stop offset="55%" stop-color="#E67E00" stop-opacity="0.12" />
      <stop offset="100%" stop-color="#E67E00" stop-opacity="0" />
    </radialGradient>

    <!-- Statuette 24K Mirror Gold Gradient -->
    <linearGradient id="oscarGoldMain" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#733B00" />
      <stop offset="15%" stop-color="#B86C00" />
      <stop offset="32%" stop-color="#F2AC1B" />
      <stop offset="48%" stop-color="#FFF5BD" />
      <stop offset="55%" stop-color="#FFE169" />
      <stop offset="72%" stop-color="#F29E02" />
      <stop offset="88%" stop-color="#A85700" />
      <stop offset="100%" stop-color="#542400" />
    </linearGradient>

    <!-- High-Intensity Specular Highlights -->
    <linearGradient id="oscarGoldSpecular" x1="20%" y1="0%" x2="80%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.95" />
      <stop offset="25%" stop-color="#FFF9D2" stop-opacity="0.85" />
      <stop offset="55%" stop-color="#FFD54F" stop-opacity="0.6" />
      <stop offset="100%" stop-color="#D47A00" stop-opacity="0.15" />
    </linearGradient>

    <!-- Deep Bronze Gold for Muscular Shadow Facets -->
    <linearGradient id="oscarGoldDark" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFB300" />
      <stop offset="40%" stop-color="#C26A00" />
      <stop offset="85%" stop-color="#592500" />
      <stop offset="100%" stop-color="#361500" />
    </linearGradient>

    <!-- Sword of Honor Steel-Gold Gradient -->
    <linearGradient id="swordBladeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#E0B85C" />
      <stop offset="45%" stop-color="#FFFDE8" />
      <stop offset="50%" stop-color="#FFFFFF" />
      <stop offset="55%" stop-color="#FFF6BA" />
      <stop offset="100%" stop-color="#9C5E06" />
    </linearGradient>

    <!-- Nero Marquina / Black Obsidian Marble Pedestal -->
    <linearGradient id="plinthBody" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#07080B" />
      <stop offset="18%" stop-color="#141720" />
      <stop offset="38%" stop-color="#222838" />
      <stop offset="52%" stop-color="#333C52" />
      <stop offset="68%" stop-color="#1A1F2C" />
      <stop offset="88%" stop-color="#0E1017" />
      <stop offset="100%" stop-color="#040507" />
    </linearGradient>

    <!-- Beveled 24K Gold Pedestal Trim Rings -->
    <linearGradient id="plinthGoldRim" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#5C3300" />
      <stop offset="20%" stop-color="#B87300" />
      <stop offset="45%" stop-color="#FFF6BA" />
      <stop offset="65%" stop-color="#FFD54F" />
      <stop offset="85%" stop-color="#B86C00" />
      <stop offset="100%" stop-color="#4F2700" />
    </linearGradient>

    <!-- Heavy Engraved Solid Brass Plaque Gradient -->
    <linearGradient id="brassPlateGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFF8D1" />
      <stop offset="20%" stop-color="#F2C752" />
      <stop offset="50%" stop-color="#DCA123" />
      <stop offset="80%" stop-color="#AA710C" />
      <stop offset="100%" stop-color="#694002" />
    </linearGradient>

    <!-- Soft Golden Caustics Filter -->
    <filter id="oscarGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="5" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>

    <!-- Diamond Star Sparkle -->
    <g id="starGlint">
      <path d="M0 -7 Q0 0 7 0 Q0 0 0 7 Q0 0 -7 0 Q0 0 0 -7 Z" fill="#FFFFFF" opacity="0.9" />
      <circle cx="0" cy="0" r="1.8" fill="#FFF2A8" />
    </g>
  </defs>

  <!-- Ambient Radiant Stage Halo -->
  <circle cx="180" cy="180" r="170" fill="url(#oscarHalo)" />

  <!-- Stage Floor Caustic Shadow -->
  <ellipse cx="180" cy="510" rx="140" ry="24" fill="#000000" opacity="0.85" />
  <ellipse cx="180" cy="510" rx="90" ry="14" fill="#FF8F00" opacity="0.15" />

  <!-- TWIN CURVING GOLDEN LAURELS OF TRIUMPH -->
  <g fill="url(#oscarGoldMain)" filter="url(#oscarGlow)" opacity="0.9">
    <!-- Left Laurel Stem -->
    <path d="M135 320 C110 290 92 230 102 165 C108 132 124 102 145 82 C142 94 135 116 130 138 C122 176 126 230 146 275 Z" fill="url(#oscarGoldSpecular)" opacity="0.4" />
    <!-- Left Laurel Leaves -->
    <path d="M104 165 C85 156 80 142 92 134 C104 134 107 148 104 165 Z" />
    <path d="M110 202 C92 196 88 180 100 172 C110 174 114 188 110 202 Z" />
    <path d="M120 240 C102 238 98 222 110 212 C120 216 124 228 120 240 Z" />
    <path d="M136 278 C120 278 116 262 127 251 C138 255 140 266 136 278 Z" />
    <path d="M108 128 C94 117 92 103 104 95 C115 99 117 112 108 128 Z" />
    <path d="M126 95 C115 81 118 68 130 63 C139 71 138 85 126 95 Z" />
    <path d="M148 72 C140 58 145 47 156 46 C162 55 158 66 148 72 Z" />

    <!-- Right Laurel Stem -->
    <path d="M225 320 C250 290 268 230 258 165 C252 132 236 102 215 82 C218 94 225 116 230 138 C238 176 234 230 214 275 Z" fill="url(#oscarGoldSpecular)" opacity="0.4" />
    <!-- Right Laurel Leaves -->
    <path d="M256 165 C275 156 280 142 268 134 C256 134 253 148 256 165 Z" />
    <path d="M250 202 C268 196 272 180 260 172 C250 174 246 188 250 202 Z" />
    <path d="M240 240 C258 238 262 222 250 212 C240 216 236 228 240 240 Z" />
    <path d="M224 278 C240 278 244 262 233 251 C222 255 220 266 224 278 Z" />
    <path d="M252 128 C266 117 268 103 256 95 C245 99 243 112 252 128 Z" />
    <path d="M234 95 C245 81 242 68 230 63 C221 71 222 85 234 95 Z" />
    <path d="M212 72 C220 58 215 47 204 46 C198 55 202 66 212 72 Z" />
  </g>

  <!-- THE 24K GOLD SCULPTURAL STATUETTE -->
  <g id="statuetteFigure">
    <!-- Stylized Head & Noble Facial Profile -->
    <ellipse cx="180" cy="56" rx="15" ry="20" fill="url(#oscarGoldMain)" />
    <!-- Head Specular Highlight -->
    <path d="M174 40 C182 40 190 45 191 56 C186 50 179 45 174 40 Z" fill="url(#oscarGoldSpecular)" />
    <!-- Jawline & Brow Structure -->
    <path d="M178 52 L185 57 L180 63 L175 60 Z" fill="url(#oscarGoldSpecular)" opacity="0.75" />

    <!-- Sculpted Neck -->
    <path d="M173 72 L187 72 L190 87 L170 87 Z" fill="url(#oscarGoldMain)" />
    <path d="M176 72 L184 72 L186 87 L174 87 Z" fill="url(#oscarGoldSpecular)" opacity="0.6" />

    <!-- Art Deco Chiseled Shoulders & Chest -->
    <path d="M142 102 C149 89 163 85 180 85 C197 85 211 89 218 102 C222 111 219 126 211 137 C204 146 197 152 180 152 C163 152 156 146 149 137 C141 126 138 111 142 102 Z" fill="url(#oscarGoldMain)" />
    
    <!-- Pectoral Facet Reflections -->
    <path d="M154 105 C162 103 173 105 177 116 C170 117 160 115 154 105 Z" fill="url(#oscarGoldSpecular)" />
    <path d="M206 105 C198 103 187 105 183 116 C190 117 200 115 206 105 Z" fill="url(#oscarGoldSpecular)" />

    <!-- Stylized Arms Holding the Longsword of Honor -->
    <!-- Left Arm -->
    <path d="M142 102 C135 116 138 138 149 157 C155 168 166 177 175 181 L177 172 C170 167 160 157 156 145 C149 133 148 116 152 106 Z" fill="url(#oscarGoldMain)" />
    <!-- Left Forearm Sheen -->
    <path d="M153 145 C158 155 166 165 174 170 L176 166 C168 160 162 150 158 140 Z" fill="url(#oscarGoldSpecular)" />

    <!-- Right Arm -->
    <path d="M218 102 C225 116 222 138 211 157 C205 168 194 177 185 181 L183 172 C190 167 200 157 204 145 C211 133 212 116 208 106 Z" fill="url(#oscarGoldMain)" />
    <!-- Right Forearm Sheen -->
    <path d="M207 145 C202 155 194 165 186 170 L184 166 C192 160 198 150 202 140 Z" fill="url(#oscarGoldSpecular)" />

    <!-- The Golden Longsword of Honor -->
    <!-- Pommel & Hilt -->
    <circle cx="180" cy="162" r="5" fill="url(#oscarGoldSpecular)" />
    <!-- Crossguard Bar -->
    <rect x="165" y="167" width="30" height="5" rx="2" fill="url(#oscarGoldMain)" />
    <rect x="168" y="168" width="24" height="2" rx="1" fill="#FFFFFF" opacity="0.9" />
    <!-- Downward Blade -->
    <rect x="178" y="172" width="4.5" height="150" rx="1" fill="url(#swordBladeGrad)" />
    <!-- Blade Razor Edge Highlight -->
    <line x1="180" y1="172" x2="180" y2="322" stroke="#FFFFFF" stroke-width="1.2" opacity="0.9" />
    <!-- Blade Tip -->
    <polygon points="178,322 182.5,322 180.25,331" fill="url(#swordBladeGrad)" />

    <!-- Chiseled Torso & Abdominal Ribs -->
    <path d="M162 150 C166 163 168 182 170 200 L190 200 C192 182 194 163 198 150 C189 154 171 154 162 150 Z" fill="url(#oscarGoldDark)" />
    <path d="M174 154 L174 198 L177 198 L177 154 Z" fill="url(#oscarGoldSpecular)" opacity="0.8" />
    <path d="M183 154 L183 198 L186 198 L186 154 Z" fill="url(#oscarGoldSpecular)" opacity="0.8" />

    <!-- Athletic Hips & Pelvic Girdle -->
    <path d="M167 199 C162 210 158 225 160 241 L200 241 C202 225 198 210 193 199 Z" fill="url(#oscarGoldMain)" />

    <!-- Draped / Sculpted Legs Standing at Solemn Attention -->
    <!-- Left Leg -->
    <path d="M160 241 C158 266 160 292 162 322 C163 338 164 354 166 368 L176 368 C175 354 173 336 172 317 C171 291 174 265 177 241 Z" fill="url(#oscarGoldMain)" />
    <!-- Left Leg Shimmer Highlight -->
    <path d="M164 250 C162 276 163 308 166 345 L170 345 C167 308 165 276 167 250 Z" fill="url(#oscarGoldSpecular)" opacity="0.85" />

    <!-- Right Leg -->
    <path d="M200 241 C202 266 200 292 198 322 C197 338 196 354 194 368 L184 368 C185 354 187 336 188 317 C189 291 186 265 183 241 Z" fill="url(#oscarGoldMain)" />
    <!-- Right Leg Shimmer Highlight -->
    <path d="M196 250 C198 276 197 308 194 345 L190 345 C193 308 195 276 193 250 Z" fill="url(#oscarGoldSpecular)" opacity="0.85" />

    <!-- Golden Feet Standing on Base -->
    <ellipse cx="171" cy="368" rx="8" ry="4" fill="url(#oscarGoldSpecular)" />
    <ellipse cx="189" cy="368" rx="8" ry="4" fill="url(#oscarGoldSpecular)" />
  </g>

  <!-- FOUR-POINT DIAMOND STARBURST SPECULARS -->
  <use href="#starGlint" x="144" y="96" />
  <use href="#starGlint" x="216" y="96" />
  <use href="#starGlint" x="180" y="162" />
  <use href="#starGlint" x="180" y="374" />

  <!-- CIRCULAR FILM-REEL TIERED DISC BASE -->
  <g id="filmReelBase">
    <!-- Top Cap Bevel -->
    <ellipse cx="180" cy="374" rx="42" ry="9" fill="url(#plinthGoldRim)" />
    <path d="M138 374 C138 384 222 384 222 374 L222 384 C222 394 138 394 138 384 Z" fill="url(#oscarGoldDark)" />
    <ellipse cx="180" cy="384" rx="42" ry="9" fill="url(#plinthGoldRim)" />
    <!-- Film Reel Sprocket Holes with Metallic Rim -->
    <circle cx="156" cy="374" r="4" fill="#2E1600" stroke="#FFE279" stroke-width="0.8" />
    <circle cx="180" cy="375" r="4" fill="#2E1600" stroke="#FFE279" stroke-width="0.8" />
    <circle cx="204" cy="374" r="4" fill="#2E1600" stroke="#FFE279" stroke-width="0.8" />
  </g>

  <!-- LUXURY STEPPED NERO MARQUINA / OBSIDIAN COLUMN PEDESTAL -->
  <g id="marblePedestal">
    <!-- Upper Collar Ring -->
    <ellipse cx="180" cy="392" rx="64" ry="12" fill="url(#plinthGoldRim)" />
    <path d="M116 392 C116 404 244 404 244 392 L246 408 C246 420 114 420 114 408 Z" fill="url(#plinthBody)" />
    <ellipse cx="180" cy="408" rx="66" ry="12" fill="url(#plinthGoldRim)" />

    <!-- Main Solid Obsidian Marble Cylinder -->
    <path d="M106 412 C106 428 254 428 254 412 L262 494 C262 514 98 514 98 494 Z" fill="url(#plinthBody)" />
    <!-- Polished Cylinder Surface Luster Bands -->
    <path d="M152 414 L148 506 L164 506 L168 414 Z" fill="#FFFFFF" opacity="0.08" />
    <path d="M196 414 L200 506 L206 506 L202 414 Z" fill="#FFEAA7" opacity="0.05" />

    <!-- Bottom Footing Gold Rings -->
    <ellipse cx="180" cy="494" rx="82" ry="15" fill="url(#plinthGoldRim)" />
    <path d="M98 494 C98 512 262 512 262 494 L265 512 C265 530 95 530 95 512 Z" fill="url(#plinthBody)" />
    <ellipse cx="180" cy="512" rx="85" ry="15" fill="url(#plinthGoldRim)" />

    <!-- CURVED, SCREW-BOLTED SOLID BRASS ENGRAVED PLAQUE -->
    <g id="engravedBrassPlaque">
      <!-- Plaque Body with 3D Bevel Edge -->
      <rect x="116" y="430" width="128" height="58" rx="8" fill="url(#brassPlateGrad)" stroke="#4A2B00" stroke-width="1.8" />
      <!-- Inner Precision Inset Border -->
      <rect x="120" y="434" width="120" height="50" rx="5" fill="none" stroke="#FFF7B8" stroke-width="0.9" opacity="0.85" />

      <!-- Four Corner Hex/Round Brass Fastener Bolts -->
      <circle cx="123" cy="437" r="1.8" fill="#4A2B00" stroke="#FFE98A" stroke-width="0.5" />
      <circle cx="237" cy="437" r="1.8" fill="#4A2B00" stroke="#FFE98A" stroke-width="0.5" />
      <circle cx="123" cy="481" r="1.8" fill="#4A2B00" stroke="#FFE98A" stroke-width="0.5" />
      <circle cx="237" cy="481" r="1.8" fill="#4A2B00" stroke="#FFE98A" stroke-width="0.5" />

      <!-- Deep Acid-Etched Engraving Typography -->
      <text x="180" y="445" text-anchor="middle" font-family="'Times New Roman', serif" font-weight="900" font-size="7.5" letter-spacing="1.5" fill="#241400">
        THE REINVENTION HOUSE
      </text>
      <text x="180" y="455" text-anchor="middle" font-family="'Georgia', serif" font-weight="700" font-size="6" letter-spacing="1" fill="#4F2F00">
        ACADEMY OF EXCELLENCE
      </text>
      <line x1="135" y1="460" x2="225" y2="460" stroke="#4F2F00" stroke-width="0.7" opacity="0.7" />
      <text x="180" y="469" text-anchor="middle" font-family="'Times New Roman', serif" font-weight="bold" font-size="8" letter-spacing="0.8" fill="#1C0E00">
        WORKFORCE HONORS
      </text>
      <text x="180" y="478" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="5.5" letter-spacing="1.2" fill="#3D1D00">
        STATUETTE OF SUPREME MERIT
      </text>
    </g>
  </g>
</svg>`;

/**
 * Resolves the underlying voting exercise or recognition scope:
 * 'church' | 'workforce' | 'organisation' | 'department' | 'unit'
 */
export function resolveWinnerScope(record: WinnerRecord): 'church' | 'workforce' | 'organisation' | 'department' | 'unit' {
  // 1. Explicit scopeType on record
  const st = (record.scopeType || '').toLowerCase().trim();
  if (st === 'church') return 'church';
  if (st === 'workforce') return 'workforce';
  if (st === 'organisation' || st === 'organization') return 'organisation';
  if (st === 'unit') return 'unit';
  if (st === 'department') return 'department';

  // 2. awardScope text
  const as = (record.awardScope || '').toLowerCase();
  if (as.includes('church')) return 'church';
  if (as.includes('workforce') || as.includes('all department')) return 'workforce';
  if (as.includes('organis') || as.includes('organiz')) return 'organisation';
  if (as.includes('unit')) return 'unit';
  if (as.includes('department')) return 'department';

  // 3. awardCategory
  const ac = (record.awardCategory || '').toLowerCase();
  if (ac === 'innovative' || ac.includes('church')) return 'church';
  if (ac === 'workforce_wide' || ac.includes('workforce')) return 'workforce';
  if (ac.includes('organis') || ac.includes('organiz')) return 'organisation';
  if (ac === 'unit') return 'unit';
  if (ac === 'departmental' || ac.includes('department')) return 'department';

  // 4. Exercise title / category name heuristics
  const title = `${record.exerciseTitle || ''} ${record.categoryName || ''} ${record.awardTitle || ''}`.toLowerCase();
  if (title.includes('church-wide') || title.includes('church wide') || title.includes('entire church')) return 'church';
  if (title.includes('workforce-wide') || title.includes('workforce wide') || title.includes('entire workforce') || title.includes('all departments')) return 'workforce';
  if (title.includes('organisation-wide') || title.includes('organization-wide') || title.includes('organisation wide')) return 'organisation';
  if (title.includes('unit-wide') || title.includes('unit wide') || title.includes('unit voting')) return 'unit';
  if (title.includes('department voting') || title.includes('departmental voting') || title.includes('department-wide')) return 'department';

  // 5. Unit presence
  if (record.unitName?.trim() || record.unitId?.trim()) {
    return 'unit';
  }

  // 6. Department presence
  if (record.departmentName?.trim() || record.departmentId?.trim() || (record.departmentNames && record.departmentNames.length > 0)) {
    return 'department';
  }

  // Fallback default
  return 'workforce';
}

/**
 * Resolves the Certificate Hall of Fame title strictly based on exercise scope:
 * a. Church-wide voting exercise: Church Hall of Fame
 * b. Workforce-wide voting exercise: Workforce Hall of Fame
 * c. Organisation-wide Voting Exercise: Organisation Hall of Fame
 * d. Department Voting Exercise: Department Hall of Fame
 * e. Unit Voting Exercise: Unit Hall of Fame
 */
export function getCertificateHallOfFameTitle(record: WinnerRecord): string {
  const scope = resolveWinnerScope(record);

  switch (scope) {
    case 'church':
      return 'Church Hall of Fame';
    case 'workforce':
      return 'Workforce Hall of Fame';
    case 'organisation':
      return 'Organisation Hall of Fame';
    case 'department':
      return 'Department Hall of Fame';
    case 'unit':
      return 'Unit Hall of Fame';
    default:
      return 'Workforce Hall of Fame';
  }
}

/**
 * Resolves the Award Hall of Fame title strictly based on exercise scope:
 * a. Church-wide voting exercise: Church Hall of Fame
 * b. Workforce-wide voting exercise: Workforce Hall of Fame
 * c. Organisation-wide voting exercise: Organisation Hall of Fame
 * d. Department Voting Exercise: Department Hall of Fame ( Include the name of the department)
 * e. Unit Voting Exercise: Unit Hall of Fame (Include the name of the unit)
 */
export function getAwardHallOfFameTitle(record: WinnerRecord): string {
  const scope = resolveWinnerScope(record);

  switch (scope) {
    case 'church':
      return 'Church Hall of Fame';
    case 'workforce':
      return 'Workforce Hall of Fame';
    case 'organisation':
      return 'Organisation Hall of Fame';
    case 'department': {
      let deptName = record.departmentName?.trim() || '';
      if (!deptName && record.departmentNames && record.departmentNames.length > 0) {
        deptName = record.departmentNames.join(' & ');
      }
      if (record.secondaryDepartmentName?.trim() && record.secondaryDepartmentName.trim() !== deptName) {
        deptName = deptName ? `${deptName} & ${record.secondaryDepartmentName.trim()}` : record.secondaryDepartmentName.trim();
      }
      return deptName ? `Department Hall of Fame (${deptName})` : 'Department Hall of Fame';
    }
    case 'unit': {
      const unitName = record.unitName?.trim() || '';
      return unitName ? `Unit Hall of Fame (${unitName})` : 'Unit Hall of Fame';
    }
    default:
      return 'Workforce Hall of Fame';
  }
}

/**
 * Converts an external or remote image URL into a self-contained Base64 Data URL.
 * Guarantees that downloaded HTML or offline documents embed the image directly.
 */
export async function convertImageUrlToBase64(url: string): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith('data:')) return url;
  try {
    const res = await fetch(url, { mode: 'cors' });
    const blob = await res.blob();
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(url);
      reader.readAsDataURL(blob);
    });
  } catch {
    try {
      return await new Promise<string | null>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || img.width || 300;
            canvas.height = img.naturalHeight || img.height || 300;
            const ctx = canvas.getContext('2d');
            if (!ctx) return resolve(null);
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/jpeg', 0.92));
          } catch {
            resolve(null);
          }
        };
        img.onerror = () => resolve(null);
        img.src = url;
      });
    } catch {
      return null;
    }
  }
}

/**
 * Returns the exact CSS styles for the official certificate document and PNG rendering.
 */
export function getCertificateDocumentStyles(): string {
  return `
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    .certificate-container {
      width: 100%;
      max-width: 1050px;
      border: 8px solid #996515;
      padding: 12px;
      background: #fdfbf7;
      position: relative;
      box-shadow: 0 10px 30px rgba(0,0,0,0.15);
      font-family: 'Times New Roman', Times, serif, system-ui;
      color: #1a1a1a;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .inner-border {
      border: 2px solid #b8860b;
      padding: 24px 36px;
      position: relative;
      background: #ffffff;
      text-align: center;
    }
    /* Corner flourishes */
    .corner {
      position: absolute;
      width: 32px;
      height: 32px;
      border-color: #b8860b;
    }
    .top-left { top: 8px; left: 8px; border-top: 4px solid #b8860b; border-left: 4px solid #b8860b; }
    .top-right { top: 8px; right: 8px; border-top: 4px solid #b8860b; border-right: 4px solid #b8860b; }
    .bottom-left { bottom: 8px; left: 8px; border-bottom: 4px solid #b8860b; border-left: 4px solid #b8860b; }
    .bottom-right { bottom: 8px; right: 8px; border-bottom: 4px solid #b8860b; border-right: 4px solid #b8860b; }

    /* Church Logo & Header at Top */
    .header-logo-wrap {
      display: flex;
      justify-content: center;
      align-items: center;
      margin-bottom: 8px;
    }
    .trh-church-logo {
      width: 84px;
      height: 84px;
      object-fit: contain;
      filter: drop-shadow(0 4px 10px rgba(0,0,0,0.15));
    }
    .header-church {
      font-family: 'Georgia', serif;
      font-size: 23px;
      letter-spacing: 3px;
      text-transform: uppercase;
      font-weight: 900;
      color: #1e1b4b;
      margin-bottom: 3px;
    }
    .header-sub {
      font-family: system-ui, sans-serif;
      font-size: 11px;
      letter-spacing: 3px;
      text-transform: uppercase;
      color: #92400e;
      font-weight: 700;
      margin-bottom: 12px;
    }

    .title-banner {
      font-family: 'Times New Roman', serif;
      font-size: 30px;
      font-weight: 900;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #b45309;
      border-top: 1px solid #e5e7eb;
      border-bottom: 1px solid #e5e7eb;
      padding: 6px 0;
      margin: 10px 0 14px;
    }
    .presentation-text {
      font-family: 'Georgia', italic, serif;
      font-size: 14px;
      color: #4b5563;
      margin-bottom: 12px;
    }

    /* Single Portrait Box */
    .portraits-row {
      display: flex;
      justify-content: center;
      align-items: center;
      margin: 10px 0 14px;
    }
    .portrait-box {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .portrait-img {
      width: 96px;
      height: 96px;
      border-radius: 50%;
      border: 3px solid #b8860b;
      object-fit: cover;
      box-shadow: 0 4px 12px rgba(0,0,0,0.18);
      background: #f3f4f6;
    }
    .portrait-avatar {
      width: 96px;
      height: 96px;
      border-radius: 50%;
      border: 3px solid #b8860b;
      background: #1e1b4b;
      color: #f59e0b;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 34px;
      font-weight: bold;
      font-family: system-ui, sans-serif;
    }

    .winner-name {
      font-family: 'Georgia', serif;
      font-size: 27px;
      font-weight: bold;
      color: #0f172a;
      letter-spacing: 1px;
      margin-bottom: 3px;
    }
    .joint-amp {
      color: #b45309;
      font-size: 24px;
    }
    .winner-roles {
      font-family: system-ui, sans-serif;
      font-size: 13px;
      color: #475569;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .department-badge {
      display: inline-block;
      background: #fef3c7;
      color: #92400e;
      border: 1px solid #fde68a;
      padding: 4px 16px;
      border-radius: 20px;
      font-family: system-ui, sans-serif;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
    }

    .citation-box {
      max-width: 800px;
      margin: 0 auto 16px;
      padding: 12px 20px;
      font-family: 'Georgia', italic, serif;
      font-size: 13.5px;
      line-height: 1.6;
      color: #334155;
      background: #fafaf9;
      border-left: 3px solid #b8860b;
      border-right: 3px solid #b8860b;
      border-radius: 4px;
    }

    .meta-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 24px;
      padding: 0 20px;
    }
    .signature-block {
      text-align: center;
      width: 220px;
    }
    .signature-line {
      border-top: 1.5px solid #4b5563;
      margin-bottom: 6px;
    }
    .signature-title {
      font-family: system-ui, sans-serif;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #6b7280;
    }

    .seal-block {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .gold-seal {
      width: 70px;
      height: 70px;
      border-radius: 50%;
      background: radial-gradient(circle, #ffe082 0%, #ffd54f 40%, #ff8f00 85%, #b26a00 100%);
      border: 3px dashed #78350f;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #451a03;
      font-family: system-ui, sans-serif;
      font-weight: 900;
      font-size: 9px;
      letter-spacing: 1px;
      text-align: center;
      box-shadow: 0 4px 10px rgba(0,0,0,0.15);
      line-height: 1.1;
      margin-bottom: 6px;
    }
    .cert-id {
      font-family: monospace;
      font-size: 9px;
      color: #9ca3af;
      letter-spacing: 1px;
    }
  `;
}

/**
 * Returns the exact certificate inner container HTML markup.
 */
export function getCertificateContainerMarkup(record: WinnerRecord): string {
  const isJoint = Boolean(
    record.isJointWinner ||
    record.isTie ||
    record.secondaryDepartmentName ||
    record.jointWinnerName ||
    (record.allWinners && record.allWinners.length > 1)
  );

  const primaryWinner = record.winner || record.allWinners?.[0];
  const primaryName = primaryWinner?.displayName || record.winner?.displayName || 'Honored Worker';
  const primaryPhoto = primaryWinner?.photoUrl || record.winner?.photoUrl;
  const primaryRole = primaryWinner?.roleOrTitle || record.departmentName || 'Kingdom Contributor';

  const coWinner = record.allWinners && record.allWinners.length > 1 ? record.allWinners[1] : null;
  const coWinnerName = record.jointWinnerName || coWinner?.displayName || '';
  const coWinnerRole = record.jointWinnerRole || coWinner?.roleOrTitle || record.secondaryDepartmentName || 'Kingdom Contributor';

  const orgName = record.organisationName || 'The Reinvention House';
  const certHallOfFameTitle = getCertificateHallOfFameTitle(record);
  const awardTitle = record.categoryName || record.exerciseTitle || 'Worker of the Month';
  const monthYear = `${record.month || ''} ${record.year || ''}`.trim() || new Date(record.endTime).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const citationText = record.citation || 
    `Commended with highest honors for extraordinary dedication, steadfast leadership, and faithful kingdom service within the workforce of ${orgName}.`;

  const certId = `TRH-CERT-${(record.exerciseId || record.legacyId || '0000').replace(/[^a-zA-Z0-9]/g, '').slice(0, 10).toUpperCase()}-${new Date().getFullYear()}`;
  const churchLogoSrc = TRH_OFFICIAL_LOGO_BASE64 || TRH_LOGO_URL;

  return `<div class="certificate-container">
    <div class="inner-border">
      <!-- Corners -->
      <div class="corner top-left"></div>
      <div class="corner top-right"></div>
      <div class="corner bottom-left"></div>
      <div class="corner bottom-right"></div>

      <!-- Header with Official Church Logo, TRH MINISTRIES GLOBAL, and Organisation Name at the top -->
      <div class="header-logo-wrap">
        <img src="${churchLogoSrc}" alt="TRH Ministries Global Logo" class="trh-church-logo" />
      </div>
      <div class="header-church">TRH MINISTRIES GLOBAL</div>
      <div class="header-sub">${escapeHtml(orgName)} • ${escapeHtml(certHallOfFameTitle)}</div>

      <!-- Title -->
      <div class="title-banner">Certificate of Honor</div>

      <div class="presentation-text">This official certificate is proudly conferred upon</div>

      <!-- Single Portrait (Graphic already carries joint winners if applicable) -->
      <div class="portraits-row">
        <div class="portrait-box">
          ${
            primaryPhoto
              ? `<img src="${primaryPhoto.startsWith('data:') ? primaryPhoto : escapeHtml(primaryPhoto)}" alt="${escapeHtml(primaryName)}" class="portrait-img" crossorigin="anonymous" referrerpolicy="no-referrer" onerror="this.style.display='none';if(this.nextElementSibling)this.nextElementSibling.style.display='flex';" />
                 <div class="portrait-avatar" style="display:none;">${escapeHtml(primaryName.charAt(0))}</div>`
              : `<div class="portrait-avatar">${escapeHtml(primaryName.charAt(0))}</div>`
          }
        </div>
      </div>

      <!-- Winner Name(s) -->
      <div class="winner-name">
        ${escapeHtml(primaryName)}
        ${isJoint && coWinnerName ? `<span class="joint-amp"> &amp; </span>${escapeHtml(coWinnerName)}` : ''}
      </div>

      <!-- Role(s) -->
      <div class="winner-roles">
        ${escapeHtml(primaryRole)}
        ${isJoint && coWinnerRole && coWinnerRole !== primaryRole ? ` • ${escapeHtml(coWinnerRole)}` : ''}
      </div>

      <!-- Department Badge -->
      <div class="department-badge">
        ${escapeHtml(awardTitle)} • ${escapeHtml(monthYear)}
        ${record.departmentName ? ` • ${escapeHtml(record.departmentName)}` : ''}
        ${record.secondaryDepartmentName ? ` & ${escapeHtml(record.secondaryDepartmentName)}` : ''}
      </div>

      <!-- Citation -->
      <div class="citation-box">
        &ldquo;${escapeHtml(citationText)}&rdquo;
      </div>

      <!-- Meta and Signatures -->
      <div class="meta-row">
        <div class="signature-block">
          <div class="signature-line"></div>
          <div class="signature-title">Pastoral Oversight &amp; Leadership</div>
        </div>

        <div class="seal-block">
          <div class="gold-seal">OFFICIAL<br/>SEAL</div>
          <div class="cert-id">${escapeHtml(certId)}</div>
        </div>

        <div class="signature-block">
          <div class="signature-line"></div>
          <div class="signature-title">Nominations &amp; Workforce Lead</div>
        </div>
      </div>
    </div>
  </div>`;
}

/**
 * Generates an elegant, high-resolution printable HTML document
 * specifically styled for official certificate printing.
 * Fully carries the official church logo and organisation name at the top,
 * and uses a single photo graphic for both individual and joint winners.
 */
export function generateCertificateHtml(record: WinnerRecord): string {
  const primaryWinner = record.winner || record.allWinners?.[0];
  const primaryName = primaryWinner?.displayName || record.winner?.displayName || 'Honored Worker';
  const isJoint = Boolean(
    record.isJointWinner ||
    record.isTie ||
    record.secondaryDepartmentName ||
    record.jointWinnerName ||
    (record.allWinners && record.allWinners.length > 1)
  );
  const coWinnerName = record.jointWinnerName || (record.allWinners && record.allWinners.length > 1 ? record.allWinners[1].displayName : '');

  const styles = getCertificateDocumentStyles();
  const markup = getCertificateContainerMarkup(record);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Official Certificate - ${escapeHtml(primaryName)}${isJoint && coWinnerName ? ' & ' + escapeHtml(coWinnerName) : ''}</title>
  <style>
    @page {
      size: landscape;
      margin: 10mm;
    }
    body {
      font-family: 'Times New Roman', Times, serif, system-ui;
      background-color: #ffffff;
      color: #1a1a1a;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 24px;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    ${styles}
    .print-actions {
      margin-top: 20px;
      text-align: center;
    }
    .print-btn {
      background: #b45309;
      color: #ffffff;
      border: none;
      padding: 10px 24px;
      font-family: system-ui, sans-serif;
      font-size: 14px;
      font-weight: bold;
      border-radius: 8px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(180, 83, 9, 0.3);
      transition: background-color 0.2s;
    }
    .print-btn:hover {
      background: #92400e;
    }
    @media print {
      body {
        background: #ffffff !important;
        padding: 0;
      }
      .certificate-container {
        box-shadow: none;
        border-width: 6px;
        max-width: 100%;
        page-break-inside: avoid;
      }
      .print-actions {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  ${markup}

  <div class="print-actions">
    <button class="print-btn" onclick="window.print()">Print / Save PDF</button>
  </div>

  <script>
    window.addEventListener('load', function() {
      setTimeout(function() {
        try {
          if (window.location.search.includes('autoprint')) {
            window.print();
          }
        } catch(e) {}
      }, 400);
    });
  </script>
</body>
</html>`;
}

/**
 * Generates an ultra-prestigious Oscar-style Statuette Award document:
 * Designed by a first-class Oscar award sculptor.
 * Features the official church logo, the organization name, radiant volumetric
 * spotlights, 24K gold mirror statuette, 24K gold coin honoree medallion, and
 * a heavy solid brass engraved plinth plaque.
 */
export function generateAwardHtml(record: WinnerRecord): string {
  const isJoint = Boolean(
    record.isJointWinner ||
    record.isTie ||
    record.secondaryDepartmentName ||
    record.jointWinnerName ||
    (record.allWinners && record.allWinners.length > 1)
  );

  const primaryWinner = record.winner || record.allWinners?.[0];
  const primaryName = primaryWinner?.displayName || record.winner?.displayName || 'Honored Contributor';
  const primaryPhoto = primaryWinner?.photoUrl || record.winner?.photoUrl;
  const primaryRole = primaryWinner?.roleOrTitle || record.departmentName || 'Kingdom Contributor';

  const coWinner = record.allWinners && record.allWinners.length > 1 ? record.allWinners[1] : null;
  const coWinnerName = record.jointWinnerName || coWinner?.displayName || '';
  const coWinnerRole = record.jointWinnerRole || coWinner?.roleOrTitle || record.secondaryDepartmentName;

  const orgName = record.organisationName || 'The Reinvention House';
  const awardHallOfFameTitle = getAwardHallOfFameTitle(record);
  const awardTitle = record.categoryName || record.exerciseTitle || 'Worker of the Month';
  const monthYear = `${record.month || ''} ${record.year || ''}`.trim() || new Date(record.endTime).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const citationText = record.citation || 
    `Presented with highest distinction for peerless dedication, steadfast integrity, and extraordinary service to God and humanity within the workforce of ${orgName}.`;

  const trophyId = `TRH-OSCAR-${(record.exerciseId || record.legacyId || '0000').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase()}-${new Date().getFullYear()}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Oscar Award of Excellence - ${escapeHtml(primaryName)}${isJoint && coWinnerName ? ' & ' + escapeHtml(coWinnerName) : ''}</title>
  <style>
    @page {
      size: portrait;
      margin: 8mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: radial-gradient(ellipse at 50% 20%, #15182e 0%, #090b16 45%, #030408 100%);
      color: #ffffff;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px 16px;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    /* Red Carpet Gala Stage Wrapper with Double Gold Frame */
    .award-stage {
      width: 100%;
      max-width: 680px;
      background: linear-gradient(180deg, rgba(24, 21, 48, 0.92) 0%, rgba(10, 13, 24, 0.97) 35%, rgba(4, 6, 12, 0.99) 100%);
      border: 3px solid #D4AF37;
      border-radius: 30px;
      padding: 34px 28px 30px;
      box-shadow: 0 30px 90px rgba(0, 0, 0, 0.9), 0 0 60px rgba(212, 175, 55, 0.25);
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    /* Inner Filigree Inset Border */
    .award-stage::before {
      content: '';
      position: absolute;
      top: 8px;
      left: 8px;
      right: 8px;
      bottom: 8px;
      border: 1px solid rgba(255, 215, 0, 0.35);
      border-radius: 22px;
      pointer-events: none;
    }

    /* Dual Volumetric Stage Spotlights */
    .spotlight-left {
      position: absolute;
      top: -80px;
      left: 15%;
      width: 320px;
      height: 480px;
      background: radial-gradient(ellipse, rgba(255, 224, 130, 0.28) 0%, rgba(255, 179, 0, 0.08) 50%, transparent 70%);
      transform: rotate(-15deg);
      pointer-events: none;
      filter: blur(25px);
    }
    .spotlight-right {
      position: absolute;
      top: -80px;
      right: 15%;
      width: 320px;
      height: 480px;
      background: radial-gradient(ellipse, rgba(255, 224, 130, 0.28) 0%, rgba(255, 179, 0, 0.08) 50%, transparent 70%);
      transform: rotate(15deg);
      pointer-events: none;
      filter: blur(25px);
    }

    /* Header Bar */
    .award-header {
      position: relative;
      z-index: 2;
      margin-bottom: 12px;
    }
    .org-banner {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      background: linear-gradient(90deg, rgba(255, 215, 0, 0.15) 0%, rgba(255, 140, 0, 0.12) 100%);
      border: 1.5px solid rgba(255, 215, 0, 0.5);
      padding: 6px 22px 6px 14px;
      border-radius: 999px;
      margin-bottom: 10px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.4);
    }
    .award-church-logo {
      width: 38px;
      height: 38px;
      object-fit: contain;
      filter: drop-shadow(0 2px 6px rgba(0,0,0,0.5));
    }
    .org-title {
      font-family: 'Georgia', serif;
      font-size: 14px;
      font-weight: 900;
      letter-spacing: 2.5px;
      text-transform: uppercase;
      color: #ffe082;
    }
    .award-prestige-title {
      font-family: 'Times New Roman', serif;
      font-size: 32px;
      font-weight: 900;
      letter-spacing: 4px;
      text-transform: uppercase;
      background: linear-gradient(135deg, #FFFFFF 0%, #FFF4B8 35%, #FFD54F 65%, #FF9100 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 4px;
      text-shadow: 0 2px 20px rgba(255, 193, 7, 0.3);
    }
    .award-subtitle {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 3.5px;
      text-transform: uppercase;
      color: #cbd5e1;
    }

    /* Center Statuette Area */
    .statuette-container {
      position: relative;
      z-index: 2;
      margin: 8px auto 12px;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .oscar-svg {
      max-height: 420px;
      width: auto;
      filter: drop-shadow(0 20px 40px rgba(0, 0, 0, 0.85));
    }

    /* Honoree 24K Gold Coin Medallion */
    .winner-medallion-badge {
      display: inline-flex;
      align-items: center;
      gap: 16px;
      background: linear-gradient(90deg, rgba(38, 20, 78, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%);
      border: 2px solid #FFD54F;
      border-radius: 999px;
      padding: 8px 24px 8px 10px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.7), inset 0 1px 1px rgba(255, 255, 255, 0.3);
      margin: -10px auto 16px;
      position: relative;
      z-index: 3;
    }
    .medallion-img {
      width: 58px;
      height: 58px;
      border-radius: 50%;
      border: 2.5px solid #FFD54F;
      object-fit: cover;
      box-shadow: 0 4px 12px rgba(0,0,0,0.6);
    }
    .medallion-initial {
      width: 58px;
      height: 58px;
      border-radius: 50%;
      border: 2.5px solid #FFD54F;
      background: #1e1b4b;
      color: #FFD54F;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 26px;
      font-weight: 900;
      font-family: 'Times New Roman', serif;
    }
    .medallion-text {
      text-align: left;
    }
    .medallion-name {
      font-family: 'Times New Roman', serif;
      font-size: 20px;
      font-weight: bold;
      color: #ffffff;
      line-height: 1.2;
      letter-spacing: 0.5px;
    }
    .medallion-joint-amp {
      color: #ffd54f;
      font-size: 18px;
    }
    .medallion-role {
      font-size: 12px;
      color: #cbd5e1;
      font-weight: 600;
      letter-spacing: 0.5px;
    }

    /* Engraved Pedestal Plaque Card */
    .pedestal-plaque {
      background: linear-gradient(135deg, #1f2536 0%, #0d121c 100%);
      border: 2px solid #CCA038;
      border-radius: 20px;
      padding: 20px 24px;
      box-shadow: inset 0 2px 12px rgba(255, 213, 79, 0.2), 0 12px 35px rgba(0,0,0,0.7);
      position: relative;
      z-index: 2;
      max-width: 580px;
      margin: 0 auto;
    }
    .plaque-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(204, 160, 56, 0.45);
      padding-bottom: 8px;
      margin-bottom: 12px;
    }
    .plaque-category {
      font-size: 13px;
      font-weight: 900;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #ffd54f;
    }
    .plaque-date {
      font-size: 11.5px;
      font-weight: 700;
      color: #cbd5e1;
      letter-spacing: 1px;
    }
    .plaque-citation {
      font-family: 'Georgia', italic, serif;
      font-size: 13px;
      line-height: 1.65;
      color: #f8fafc;
      margin-bottom: 14px;
    }
    .plaque-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid rgba(255, 255, 255, 0.12);
      padding-top: 10px;
      font-size: 10.5px;
      color: #94a3b8;
    }
    .plaque-gold-text {
      color: #CCA038;
      font-weight: 800;
      letter-spacing: 1.5px;
      text-transform: uppercase;
    }
    .plaque-id {
      font-family: monospace;
      letter-spacing: 1px;
      color: #e2e8f0;
    }

    /* Print & Save Actions */
    .award-actions {
      margin-top: 24px;
      text-align: center;
    }
    .gold-btn {
      background: linear-gradient(135deg, #FFE082 0%, #FFB300 50%, #FF8F00 100%);
      color: #0c0a1a;
      border: none;
      padding: 13px 32px;
      border-radius: 12px;
      font-weight: 900;
      font-size: 13px;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      cursor: pointer;
      box-shadow: 0 4px 18px rgba(255, 143, 0, 0.45);
      transition: transform 0.2s, box-shadow 0.2s;
      margin: 0 6px;
    }
    .gold-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 24px rgba(255, 143, 0, 0.65);
    }

    @media print {
      body {
        background: #000000 !important;
        padding: 0;
      }
      .award-stage {
        box-shadow: none;
        max-width: 100%;
        border-color: #ffd54f !important;
        page-break-inside: avoid;
      }
      .award-actions {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="award-stage">
    <div class="spotlight-left"></div>
    <div class="spotlight-right"></div>

    <!-- Header Section with Church Logo: TRH MINISTRIES GLOBAL, Heading, and Paragraph -->
    <div class="award-header">
      <div class="org-banner">
        <img src="${TRH_LOGO_URL}" alt="TRH Ministries Global Logo" class="award-church-logo" onerror="this.src='${TRH_OFFICIAL_LOGO_BASE64}'" />
        <span class="org-title">TRH MINISTRIES GLOBAL</span>
      </div>
      <h1 class="award-prestige-title">${escapeHtml(awardTitle)}</h1>
      <p class="award-subtitle">${escapeHtml(awardHallOfFameTitle)}</p>
    </div>

    <!-- 24K Gold Curvy Oscar Statuette Sculpture -->
    <div class="statuette-container">
      ${OSCAR_STATUETTE_SVG}
    </div>

    <!-- Congratulation Card (Picture removed, Congratulations added) -->
    <div class="winner-medallion-badge" style="justify-content: center; text-align: center;">
      <div class="medallion-text" style="text-align: center;">
        <div class="medallion-name">
          Congratulations, ${escapeHtml(primaryName)}
          ${isJoint && coWinnerName ? `<span class="medallion-joint-amp"> &amp; </span>${escapeHtml(coWinnerName)}` : ''}!
        </div>
        <div class="medallion-role">
          ${escapeHtml(primaryRole)}
          ${isJoint && coWinnerRole && coWinnerRole !== primaryRole ? ` • ${escapeHtml(coWinnerRole)}` : ''}
        </div>
      </div>
    </div>

    <!-- Engraved Solid Brass Pedestal Plaque -->
    <div class="pedestal-plaque">
      <div class="plaque-header">
        <span class="plaque-category">${escapeHtml(awardTitle)} • ${escapeHtml(awardHallOfFameTitle)}</span>
        <span class="plaque-date">${escapeHtml(monthYear)}</span>
      </div>

      <div class="plaque-citation">
        &ldquo;${escapeHtml(citationText)}&rdquo;
      </div>

      <div class="plaque-footer">
        <span class="plaque-gold-text">Conferred by Decreed Honors</span>
        <span class="plaque-id">${escapeHtml(trophyId)}</span>
      </div>
    </div>
  </div>

  <div class="award-actions">
    <button class="gold-btn" onclick="window.print()">Print Award / Save PDF</button>
  </div>

  <script>
    window.addEventListener('load', function() {
      setTimeout(function() {
        try {
          if (window.location.search.includes('autoprint')) {
            window.print();
          }
        } catch(e) {}
      }, 400);
    });
  </script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Robust document printer helper
 */
export function printCertificateDocument(record: WinnerRecord): Promise<boolean> {
  return new Promise((resolve) => {
    const htmlContent = generateCertificateHtml(record);

    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '10px';
      iframe.style.height = '10px';
      iframe.style.opacity = '0';
      iframe.style.pointerEvents = 'none';
      iframe.style.border = '0';
      iframe.setAttribute('title', 'Print Frame');

      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (iframeDoc) {
        iframeDoc.open();
        iframeDoc.write(htmlContent);
        iframeDoc.close();

        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            resolve(true);
          } catch (err) {
            console.warn('Iframe print execution blocked, downloading certificate file:', err);
            downloadCertificateFile(record, htmlContent);
            resolve(false);
          } finally {
            setTimeout(() => {
              try {
                document.body.removeChild(iframe);
              } catch (e) {
                // ignore
              }
            }, 6000);
          }
        }, 500);
        return;
      }
    } catch (err) {
      console.warn('Could not initialize print iframe:', err);
    }

    downloadCertificateFile(record, htmlContent);
    resolve(true);
  });
}

/**
 * Downloads the official standalone printable HTML certificate file.
 * Automatically embeds the winner photo as a self-contained Base64 data URL
 * so that offline viewing and file transfers retain the winner image flawlessly.
 */
export async function downloadCertificateFile(record: WinnerRecord, htmlContent?: string) {
  let finalRecord = record;
  const winnerPhoto = record.winner?.photoUrl || record.allWinners?.[0]?.photoUrl;
  if (winnerPhoto && !winnerPhoto.startsWith('data:')) {
    try {
      const b64 = await convertImageUrlToBase64(winnerPhoto);
      if (b64) {
        finalRecord = {
          ...record,
          winner: {
            ...record.winner,
            photoUrl: b64,
            displayName: record.winner?.displayName || record.allWinners?.[0]?.displayName || 'Honored Worker',
            roleOrTitle: record.winner?.roleOrTitle || record.allWinners?.[0]?.roleOrTitle || ''
          }
        };
      }
    } catch (e) {
      console.warn('Could not embed base64 image into certificate, falling back:', e);
    }
  }

  const content = htmlContent || generateCertificateHtml(finalRecord);
  const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  
  const primaryName = (finalRecord.winner?.displayName || 'winner')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-');
  const month = (finalRecord.month || 'honor').toLowerCase();
  const year = finalRecord.year || new Date().getFullYear();

  a.href = url;
  a.download = `certificate-trh-${primaryName}-${month}-${year}.html`;
  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}

/**
 * Generates an ultra-high-definition landscape PNG image of the Official Certificate.
 * The PNG matches the contents, fonts, borders, seals, and layout of the Downloaded Certificate Document (HTML) format exactly.
 */
export async function downloadCertificateAsImage(record: WinnerRecord): Promise<void> {
  // Ensure photo is embedded as base64 data URI to avoid any cross-origin tainting or network delay
  let finalRecord = { ...record };
  const winnerPhoto = record.winner?.photoUrl || record.allWinners?.[0]?.photoUrl;
  if (winnerPhoto && !winnerPhoto.startsWith('data:')) {
    try {
      const b64 = await convertImageUrlToBase64(winnerPhoto);
      if (b64) {
        finalRecord = {
          ...record,
          winner: {
            ...record.winner,
            displayName: record.winner?.displayName || record.allWinners?.[0]?.displayName || 'Honored Worker',
            roleOrTitle: record.winner?.roleOrTitle || record.allWinners?.[0]?.roleOrTitle || '',
            photoUrl: b64
          }
        };
      }
    } catch (e) {
      console.warn('Could not embed base64 image into certificate for PNG:', e);
    }
  }

  const primaryWinner = finalRecord.winner || finalRecord.allWinners?.[0];
  const primaryName = (finalRecord.jointWinnerName && finalRecord.winner?.displayName)
    ? finalRecord.winner.displayName
    : (primaryWinner?.displayName || 'Honored Worker');
  const safeName = primaryName.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const month = (finalRecord.month || 'honor').toLowerCase();
  const year = finalRecord.year || new Date().getFullYear();
  const downloadFileName = `certificate-trh-${safeName}-${month}-${year}.png`;

  // 1. ATTEMPT EXACT HTML-TO-IMAGE RENDER (Guarantees 100% identical layout and styles to the HTML document)
  try {
    const offscreen = document.createElement('div');
    offscreen.style.position = 'fixed';
    offscreen.style.left = '-9999px';
    offscreen.style.top = '0';
    offscreen.style.width = '1050px';
    offscreen.style.backgroundColor = '#ffffff';
    offscreen.style.zIndex = '-99999';
    offscreen.style.pointerEvents = 'none';

    const styleEl = document.createElement('style');
    styleEl.textContent = getCertificateDocumentStyles();
    offscreen.appendChild(styleEl);

    const contentWrapper = document.createElement('div');
    contentWrapper.innerHTML = getCertificateContainerMarkup(finalRecord);
    offscreen.appendChild(contentWrapper);

    document.body.appendChild(offscreen);

    const certNode = contentWrapper.firstElementChild as HTMLElement;
    if (!certNode) throw new Error('Could not find rendered certificate container');

    // Wait for DOM painting and any image decoding
    await new Promise((resolve) => setTimeout(resolve, 150));

    const dataUrl = await toPng(certNode, {
      pixelRatio: 2.2,
      backgroundColor: '#fdfbf7',
      cacheBust: false
    });

    document.body.removeChild(offscreen);

    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = downloadFileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
    }, 1000);
    return;
  } catch (renderError) {
    console.warn('Direct html-to-image rendering fallback triggered:', renderError);
  }

  // 2. SYNCHRONIZED HIGH-DEFINITION CANVAS FALLBACK
  const canvas = document.createElement('canvas');
  canvas.width = 1750;
  canvas.height = 1240;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create Canvas 2D context');

  const orgName = finalRecord.organisationName || 'The Reinvention House';
  const awardTitle = finalRecord.categoryName || finalRecord.exerciseTitle || 'Worker of the Month';
  const monthYear = `${finalRecord.month || ''} ${finalRecord.year || ''}`.trim() || new Date(finalRecord.endTime).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const certId = `TRH-CERT-${(finalRecord.exerciseId || finalRecord.legacyId || '0000').replace(/[^a-zA-Z0-9]/g, '').slice(0, 10).toUpperCase()}-${new Date().getFullYear()}`;
  const certScopeTitle = getCertificateHallOfFameTitle(finalRecord);

  // Winner Information (including joint winner support)
  const isJoint = Boolean(
    finalRecord.isJointWinner ||
    finalRecord.jointWinnerName ||
    finalRecord.secondaryDepartmentName ||
    (finalRecord.allWinners && finalRecord.allWinners.length > 1)
  );

  const coWinnerName = finalRecord.jointWinnerName || (finalRecord.allWinners && finalRecord.allWinners.length > 1 ? finalRecord.allWinners[1].displayName : undefined);
  const primaryRole = primaryWinner?.roleOrTitle || (finalRecord.departmentName ? `${finalRecord.departmentName} Contributor` : 'Workforce Member');
  const coWinnerRole = finalRecord.jointWinnerRole || (finalRecord.allWinners && finalRecord.allWinners.length > 1 ? finalRecord.allWinners[1].roleOrTitle : undefined);
  const primaryPhoto = primaryWinner?.photoUrl || finalRecord.winner?.photoUrl;
  const citationText = finalRecord.citation || 
    `Commended with highest honors for extraordinary dedication, steadfast leadership, and faithful kingdom service within the workforce of ${orgName}.`;

  // 1. Warm Ivory Canvas Background
  ctx.fillStyle = '#fdfbf7';
  ctx.fillRect(0, 0, 1750, 1240);

  // 2. Outer Luxury Amber-Gold Border (#996515, 12px)
  const outerX = 45;
  const outerY = 45;
  const outerW = 1660;
  const outerH = 1150;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(outerX, outerY, outerW, outerH);
  ctx.strokeStyle = '#996515';
  ctx.lineWidth = 12;
  ctx.strokeRect(outerX, outerY, outerW, outerH);

  // 3. Inner Gold Border (#b8860b, 3px)
  const innerX = 68;
  const innerY = 68;
  const innerW = 1614;
  const innerH = 1104;

  ctx.strokeStyle = '#b8860b';
  ctx.lineWidth = 3;
  ctx.strokeRect(innerX, innerY, innerW, innerH);

  // 4. Corner Flourishes (48px L-shapes in #b8860b, 5px line)
  ctx.strokeStyle = '#b8860b';
  ctx.lineWidth = 5;
  ctx.lineCap = 'square';

  // Top-Left
  ctx.beginPath();
  ctx.moveTo(78, 126);
  ctx.lineTo(78, 78);
  ctx.lineTo(126, 78);
  ctx.stroke();

  // Top-Right
  ctx.beginPath();
  ctx.moveTo(1672 - 58, 78);
  ctx.lineTo(1672 - 10, 78);
  ctx.lineTo(1672 - 10, 126);
  ctx.stroke();

  // Bottom-Left
  ctx.beginPath();
  ctx.moveTo(78, 1162 - 58);
  ctx.lineTo(78, 1162 - 10);
  ctx.lineTo(126, 1162 - 10);
  ctx.stroke();

  // Bottom-Right
  ctx.beginPath();
  ctx.moveTo(1672 - 58, 1162 - 10);
  ctx.lineTo(1672 - 10, 1162 - 10);
  ctx.lineTo(1672 - 10, 1162 - 58);
  ctx.stroke();

  // 5. Church Logo (84x84)
  let logoImg: HTMLImageElement | null = null;
  try {
    logoImg = new Image();
    logoImg.crossOrigin = 'anonymous';
    logoImg.src = TRH_LOGO_URL;
    await Promise.race([
      logoImg.decode(),
      new Promise((_, r) => setTimeout(() => r(new Error('Logo timeout')), 1500))
    ]);
  } catch {
    try {
      logoImg = new Image();
      logoImg.src = TRH_OFFICIAL_LOGO_BASE64;
      await Promise.race([
        logoImg.decode(),
        new Promise((_, r) => setTimeout(() => r(new Error('Base64 logo timeout')), 1000))
      ]);
    } catch {
      // ignore
    }
  }

  if (logoImg) {
    ctx.drawImage(logoImg, 875 - 42, 92, 84, 84);
  }

  // 6. Header Text
  ctx.fillStyle = '#1e1b4b';
  ctx.font = 'bold 26px "Times New Roman", Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('TRH MINISTRIES GLOBAL', 875, 208);

  ctx.fillStyle = '#92400e';
  ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
  ctx.fillText(`${orgName.toUpperCase()} • ${certScopeTitle.toUpperCase()}`, 875, 232);

  // 7. Title Banner (Certificate of Honor with top & bottom #e5e7eb border lines)
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(220, 252);
  ctx.lineTo(1530, 252);
  ctx.stroke();

  ctx.fillStyle = '#b45309';
  ctx.font = 'bold 38px "Times New Roman", Georgia, serif';
  ctx.fillText('CERTIFICATE OF HONOR', 875, 296);

  ctx.beginPath();
  ctx.moveTo(220, 312);
  ctx.lineTo(1530, 312);
  ctx.stroke();

  // 8. Presentation Text
  ctx.fillStyle = '#4b5563';
  ctx.font = 'italic 17px "Georgia", serif';
  ctx.fillText('This official certificate is proudly conferred upon', 875, 346);

  // 9. Winner Portrait (Circular frame with 3.5px solid #b8860b border)
  const portraitX = 875;
  const portraitY = 430;
  const radius = 58;

  let photoImg: HTMLImageElement | null = null;
  if (primaryPhoto) {
    try {
      photoImg = new Image();
      photoImg.crossOrigin = 'anonymous';
      photoImg.src = primaryPhoto;
      await Promise.race([
        photoImg.decode(),
        new Promise((_, r) => setTimeout(() => r(new Error('Photo timeout')), 2500))
      ]);
    } catch {
      // fallback
    }
  }

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.18)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;
  ctx.beginPath();
  ctx.arc(portraitX, portraitY, radius, 0, Math.PI * 2);
  ctx.fillStyle = '#f3f4f6';
  ctx.fill();
  ctx.restore();

  // Clip and draw image or avatar fallback
  ctx.save();
  ctx.beginPath();
  ctx.arc(portraitX, portraitY, radius, 0, Math.PI * 2);
  ctx.clip();

  if (photoImg) {
    const s = Math.max((radius * 2) / photoImg.width, (radius * 2) / photoImg.height);
    const w = photoImg.width * s;
    const h = photoImg.height * s;
    ctx.drawImage(photoImg, portraitX - w / 2, portraitY - h / 2, w, h);
  } else {
    // Initial letter avatar matching HTML .portrait-avatar
    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(portraitX - radius, portraitY - radius, radius * 2, radius * 2);
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 44px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(primaryName.charAt(0).toUpperCase(), portraitX, portraitY);
  }
  ctx.restore();

  // Draw 3.5px gold rim around portrait
  ctx.beginPath();
  ctx.arc(portraitX, portraitY, radius, 0, Math.PI * 2);
  ctx.strokeStyle = '#b8860b';
  ctx.lineWidth = 3.5;
  ctx.stroke();

  // 10. Winner Name(s) with joint winner formatting
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  if (isJoint && coWinnerName) {
    ctx.font = 'bold 32px "Georgia", serif';
    const name1 = primaryName;
    const amp = ' & ';
    const name2 = coWinnerName;

    const w1 = ctx.measureText(name1).width;
    ctx.font = 'bold 26px "Georgia", serif';
    const wAmp = ctx.measureText(amp).width;
    ctx.font = 'bold 32px "Georgia", serif';
    const w2 = ctx.measureText(name2).width;

    const totalW = w1 + wAmp + w2;
    let curX = 875 - totalW / 2;

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 32px "Georgia", serif';
    ctx.textAlign = 'left';
    ctx.fillText(name1, curX, 538);
    curX += w1;

    ctx.fillStyle = '#b45309';
    ctx.font = 'bold 26px "Georgia", serif';
    ctx.fillText(amp, curX, 538);
    curX += wAmp;

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 32px "Georgia", serif';
    ctx.fillText(name2, curX, 538);
  } else {
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 34px "Georgia", serif';
    ctx.fillText(primaryName, 875, 538);
  }

  // 11. Role(s)
  ctx.textAlign = 'center';
  ctx.fillStyle = '#475569';
  ctx.font = '600 15px system-ui, -apple-system, sans-serif';
  const roleText = `${primaryRole}${isJoint && coWinnerRole && coWinnerRole !== primaryRole ? ' • ' + coWinnerRole : ''}`;
  ctx.fillText(roleText, 875, 568);

  // 12. Department Badge Pill (matching .department-badge in HTML)
  const badgeText = `${awardTitle} • ${monthYear}${record.departmentName ? ' • ' + record.departmentName : ''}${record.secondaryDepartmentName ? ' & ' + record.secondaryDepartmentName : ''}`;
  ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
  const badgeTextWidth = ctx.measureText(badgeText).width;
  const pillW = Math.min(badgeTextWidth + 48, 1400);
  const pillH = 34;
  const pillX = 875 - pillW / 2;
  const pillY = 592;
  const pillR = 17;

  // Draw rounded pill
  ctx.beginPath();
  ctx.moveTo(pillX + pillR, pillY);
  ctx.lineTo(pillX + pillW - pillR, pillY);
  ctx.arc(pillX + pillW - pillR, pillY + pillR, pillR, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(pillX + pillR, pillY + pillH);
  ctx.arc(pillX + pillR, pillY + pillR, pillR, Math.PI / 2, -Math.PI / 2);
  ctx.closePath();

  ctx.fillStyle = '#fef3c7';
  ctx.fill();
  ctx.strokeStyle = '#fde68a';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#92400e';
  ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
  ctx.fillText(badgeText, 875, pillY + 22);

  // 13. Citation Box (matching .citation-box in HTML)
  const wrapText = (text: string, maxWidth: number): string[] => {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
      const testLine = currentLine ? `${currentLine} ${words[i]}` : words[i];
      if (ctx.measureText(testLine).width > maxWidth && i > 0) {
        lines.push(currentLine);
        currentLine = words[i];
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  };

  ctx.font = 'italic 16px "Georgia", serif';
  const citLines = wrapText(`“${citationText}”`, 980);
  const citBoxW = 1060;
  const citBoxX = 875 - citBoxW / 2;
  const citLineH = 26;
  const citBoxH = Math.max(citLines.length * citLineH + 28, 76);
  const citBoxY = 648;

  // Citation container background
  ctx.fillStyle = '#fafaf9';
  ctx.fillRect(citBoxX, citBoxY, citBoxW, citBoxH);

  // Left & Right accent borders (#b8860b, 3.5px)
  ctx.strokeStyle = '#b8860b';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(citBoxX, citBoxY);
  ctx.lineTo(citBoxX, citBoxY + citBoxH);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(citBoxX + citBoxW, citBoxY);
  ctx.lineTo(citBoxX + citBoxW, citBoxY + citBoxH);
  ctx.stroke();

  // Citation Text
  ctx.fillStyle = '#334155';
  ctx.font = 'italic 16px "Georgia", serif';
  let lineY = citBoxY + 24 + citLineH / 2;
  citLines.slice(0, 4).forEach((line) => {
    ctx.fillText(line, 875, lineY);
    lineY += citLineH;
  });

  // 14. Meta and Signatures Row (matching .meta-row in HTML)
  const sigY = 990;

  // Left Signature: Pastoral Oversight & Leadership
  ctx.strokeStyle = '#4b5563';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(240, sigY);
  ctx.lineTo(480, sigY);
  ctx.stroke();

  ctx.fillStyle = '#6b7280';
  ctx.font = 'bold 12.5px system-ui, -apple-system, sans-serif';
  ctx.fillText('PASTORAL OVERSIGHT & LEADERSHIP', 360, sigY + 22);

  // Center Seal: Official Gold Seal
  const sealX = 875;
  const sealY = 960;
  const sealR = 42;

  ctx.save();
  ctx.beginPath();
  ctx.arc(sealX, sealY, sealR, 0, Math.PI * 2);
  const sealGrad = ctx.createRadialGradient(sealX, sealY, 4, sealX, sealY, sealR);
  sealGrad.addColorStop(0, '#ffe082');
  sealGrad.addColorStop(0.4, '#ffd54f');
  sealGrad.addColorStop(0.85, '#ff8f00');
  sealGrad.addColorStop(1, '#b26a00');
  ctx.fillStyle = sealGrad;
  ctx.fill();

  // Dashed border #78350f
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 2.5;
  ctx.setLineDash([5, 4]);
  ctx.stroke();
  ctx.restore();

  // Seal Text
  ctx.fillStyle = '#451a03';
  ctx.font = '900 11px system-ui, sans-serif';
  ctx.fillText('OFFICIAL', sealX, sealY - 4);
  ctx.fillText('SEAL', sealX, sealY + 12);

  // Certificate Verification ID
  ctx.fillStyle = '#9ca3af';
  ctx.font = '11px monospace';
  ctx.fillText(certId, sealX, sealY + 66);

  // Right Signature: Nominations & Workforce Lead
  ctx.strokeStyle = '#4b5563';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(1270, sigY);
  ctx.lineTo(1510, sigY);
  ctx.stroke();

  ctx.fillStyle = '#6b7280';
  ctx.font = 'bold 12.5px system-ui, -apple-system, sans-serif';
  ctx.fillText('NOMINATIONS & WORKFORCE LEAD', 1390, sigY + 22);

  // Convert canvas to download PNG
  return new Promise<void>((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) return resolve();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safeName = primaryName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const month = (record.month || 'honor').toLowerCase();
      const year = record.year || new Date().getFullYear();
      a.href = url;
      a.download = `certificate-trh-${safeName}-${month}-${year}.png`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        resolve();
      }, 1000);
    }, 'image/png');
  });
}

/**
 * Masterpiece 24K Gold Curvy Oscar Statuette Award Canvas Renderer.
 * Generates an ultra-high-definition (1200x1750) PNG image of the Oscar Award.
 * Guaranteed to never be blank, fully self-contained, and crystal clear.
 */
export async function downloadAwardAsImage(record: WinnerRecord): Promise<void> {
  const isJoint = Boolean(
    record.isJointWinner ||
    record.isTie ||
    record.secondaryDepartmentName ||
    record.jointWinnerName ||
    (record.allWinners && record.allWinners.length > 1)
  );

  const primaryWinner = record.winner || record.allWinners?.[0];
  const primaryName = primaryWinner?.displayName || record.winner?.displayName || 'Honored Worker';
  const primaryRole = primaryWinner?.roleOrTitle || record.departmentName || 'Kingdom Contributor';
  const primaryPhoto = primaryWinner?.photoUrl || record.winner?.photoUrl;

  const coWinner = record.allWinners && record.allWinners.length > 1 ? record.allWinners[1] : null;
  const coWinnerName = record.jointWinnerName || coWinner?.displayName || '';
  const coWinnerRole = record.jointWinnerRole || coWinner?.roleOrTitle || record.secondaryDepartmentName || '';
  const coWinnerPhoto = record.jointWinnerPhotoUrl || coWinner?.photoUrl;

  const isJointAward = Boolean(isJoint && coWinnerName);

  const safePrimary = (primaryName || 'honored-worker')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-');
  const safeCo = isJointAward
    ? `-and-${coWinnerName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`
    : '';
  const month = (record.month || 'honor').toLowerCase();
  const year = record.year || new Date().getFullYear();
  const filename = `oscar-award-trh-${safePrimary}${safeCo}-${month}-${year}.png`;

  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 1750;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not initialize Canvas 2D context');
  }

  const orgName = record.organisationName || 'The Reinvention House';
  const monthYear = `${record.month || 'Honor'} ${record.year || new Date().getFullYear()}`;
  const trophyId = (record.exerciseId || 'OSCAR-MERIT').slice(0, 14);

  // Helper to load image safely for canvas without tainting or hanging
  const safeLoadImage = async (url: string): Promise<HTMLImageElement | null> => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = url;
      await Promise.race([
        img.decode(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Img timeout')), 2200))
      ]);
      return img;
    } catch {
      return null;
    }
  };

  // Pre-load winner photos to use as the background image and honoree medallion
  let photo1Img: HTMLImageElement | null = null;
  let photo2Img: HTMLImageElement | null = null;
  if (primaryPhoto) {
    photo1Img = await safeLoadImage(primaryPhoto);
  }
  if (isJointAward && coWinnerPhoto) {
    photo2Img = await safeLoadImage(coWinnerPhoto);
  }

  // 1. Dark Luxury Stage Gradient Base
  const bgGrad = ctx.createLinearGradient(0, 0, 0, 1750);
  bgGrad.addColorStop(0, '#16182c');
  bgGrad.addColorStop(0.35, '#0b0e18');
  bgGrad.addColorStop(0.85, '#04060b');
  bgGrad.addColorStop(1, '#020306');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1200, 1750);

  // 2. Winner(s) Image as the Full Background Image
  if (isJointAward && photo1Img && photo2Img) {
    // Joint Winners: Dual photo split background
    // Left half: Primary Winner
    ctx.save();
    ctx.globalAlpha = 0.32;
    const s1 = Math.max(680 / photo1Img.width, 1750 / photo1Img.height);
    const w1 = photo1Img.width * s1;
    const h1 = photo1Img.height * s1;
    ctx.beginPath();
    ctx.rect(0, 0, 600, 1750);
    ctx.clip();
    ctx.drawImage(photo1Img, 300 - w1 / 2, 875 - h1 / 2, w1, h1);
    ctx.restore();

    // Right half: Co-Winner
    ctx.save();
    ctx.globalAlpha = 0.32;
    const s2 = Math.max(680 / photo2Img.width, 1750 / photo2Img.height);
    const w2 = photo2Img.width * s2;
    const h2 = photo2Img.height * s2;
    ctx.beginPath();
    ctx.rect(600, 0, 600, 1750);
    ctx.clip();
    ctx.drawImage(photo2Img, 900 - w2 / 2, 875 - h2 / 2, w2, h2);
    ctx.restore();
  } else if (photo1Img || photo2Img) {
    // Single Winner (or available photo) as full canvas background cover
    const mainPhoto = photo1Img || photo2Img;
    if (mainPhoto) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      const scale = Math.max(1200 / mainPhoto.width, 1750 / mainPhoto.height);
      const dw = mainPhoto.width * scale;
      const dh = mainPhoto.height * scale;
      const dx = (1200 - dw) / 2;
      const dy = (1750 - dh) / 2;
      ctx.drawImage(mainPhoto, dx, dy, dw, dh);
      ctx.restore();
    }
  }

  // 3. Cinematic Vignette & Gradient Overlays on top of the Winner Background Image
  // Top gradient (ensures official church logo and header text remain high-contrast)
  const topGrad = ctx.createLinearGradient(0, 0, 0, 320);
  topGrad.addColorStop(0, 'rgba(4, 6, 11, 0.94)');
  topGrad.addColorStop(0.65, 'rgba(11, 14, 24, 0.72)');
  topGrad.addColorStop(1, 'rgba(11, 14, 24, 0.25)');
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, 1200, 320);

  // Center radial ambient glow & vignette
  const centerVignette = ctx.createRadialGradient(600, 640, 140, 600, 640, 720);
  centerVignette.addColorStop(0, 'rgba(255, 180, 20, 0.12)');
  centerVignette.addColorStop(0.45, 'rgba(11, 14, 24, 0.48)');
  centerVignette.addColorStop(1, 'rgba(3, 4, 8, 0.92)');
  ctx.fillStyle = centerVignette;
  ctx.fillRect(0, 0, 1200, 1750);

  // Bottom backdrop gradient (ensures the congratulations pedestal plaque has maximum contrast)
  const bottomGrad = ctx.createLinearGradient(0, 980, 0, 1750);
  bottomGrad.addColorStop(0, 'rgba(4, 6, 11, 0.35)');
  bottomGrad.addColorStop(0.25, 'rgba(4, 6, 11, 0.88)');
  bottomGrad.addColorStop(1, 'rgba(2, 3, 6, 0.98)');
  ctx.fillStyle = bottomGrad;
  ctx.fillRect(0, 980, 1200, 770);

  // Stage Volumetric Spotlights
  const spot1 = ctx.createRadialGradient(320, 160, 20, 320, 160, 560);
  spot1.addColorStop(0, 'rgba(255, 200, 40, 0.32)');
  spot1.addColorStop(0.5, 'rgba(255, 140, 0, 0.1)');
  spot1.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = spot1;
  ctx.fillRect(0, 0, 1200, 900);

  const spot2 = ctx.createRadialGradient(880, 160, 20, 880, 160, 560);
  spot2.addColorStop(0, 'rgba(255, 200, 40, 0.32)');
  spot2.addColorStop(0.5, 'rgba(255, 140, 0, 0.1)');
  spot2.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = spot2;
  ctx.fillRect(0, 0, 1200, 900);

  // 4. Double Gold Frame Border with Filigree Corners
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(36, 36, 1128, 1678, 24);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 215, 0, 0.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(50, 50, 1100, 1650, 18);
  ctx.stroke();

  // Corner Accent Flourishes
  const drawCornerFlourish = (x: number, y: number, angle: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.strokeStyle = '#ffd54f';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 28);
    ctx.lineTo(0, 0);
    ctx.lineTo(28, 0);
    ctx.stroke();
    ctx.restore();
  };
  drawCornerFlourish(60, 60, 0);
  drawCornerFlourish(1140, 60, Math.PI / 2);
  drawCornerFlourish(1140, 1690, Math.PI);
  drawCornerFlourish(60, 1690, -Math.PI / 2);

  // 5. Church Logo & Header Pill: TRH MINISTRIES GLOBAL
  ctx.fillStyle = 'rgba(245, 158, 11, 0.2)';
  ctx.beginPath();
  ctx.roundRect(310, 65, 580, 58, 29);
  ctx.fill();
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.7)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Draw Official TRH Church Logo (guaranteed official logo from base64 data URI)
  let churchLogoDrawn = false;
  try {
    const logoImg = new Image();
    logoImg.crossOrigin = 'anonymous';
    logoImg.src = TRH_OFFICIAL_LOGO_BASE64;
    await new Promise<void>((resolve) => {
      if (logoImg.complete && logoImg.naturalWidth > 0) return resolve();
      logoImg.onload = () => resolve();
      logoImg.onerror = () => resolve();
    });

    if (logoImg.naturalWidth > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(352, 94, 22, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(logoImg, 330, 72, 44, 44);
      ctx.restore();

      ctx.strokeStyle = '#ffd54f';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(352, 94, 22, 0, Math.PI * 2);
      ctx.stroke();
      churchLogoDrawn = true;
    }
  } catch (err) {
    console.warn('Could not draw official church logo from base64:', err);
  }

  if (!churchLogoDrawn) {
    try {
      const fallbackLogo = new Image();
      fallbackLogo.crossOrigin = 'anonymous';
      fallbackLogo.src = '/trh-official-logo.png';
      await fallbackLogo.decode();
      ctx.save();
      ctx.beginPath();
      ctx.arc(352, 94, 22, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(fallbackLogo, 330, 72, 44, 44);
      ctx.restore();

      ctx.strokeStyle = '#ffd54f';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(352, 94, 22, 0, Math.PI * 2);
      ctx.stroke();
    } catch {
      ctx.fillStyle = '#ffd54f';
      ctx.beginPath();
      ctx.arc(352, 94, 18, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.fillStyle = '#fde68a';
  ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('TRH MINISTRIES GLOBAL', 615, 102);

  // 6. Heading: The name of the Award (replaces hardcoded "Workforce Statuette of Merit")
  const awardHeading = (record.categoryName || record.awardTitle || record.exerciseTitle || 'Worker of the Month').trim().toUpperCase();
  ctx.fillStyle = '#ffffff';
  let headingSize = 46;
  ctx.font = `900 ${headingSize}px "Times New Roman", Georgia, serif`;
  ctx.textAlign = 'center';
  while (ctx.measureText(awardHeading).width > 1020 && headingSize > 24) {
    headingSize -= 2;
    ctx.font = `900 ${headingSize}px "Times New Roman", Georgia, serif`;
  }
  ctx.fillText(awardHeading, 600, 168);

  // 7. Subheading: Award Hall of Fame Title (Scope-aware, e.g. Department / Unit / Church / Workforce)
  const awardHallOfFameTitle = getAwardHallOfFameTitle(record);
  ctx.fillStyle = '#cbd5e1';
  ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
  ctx.fillText(awardHallOfFameTitle.toUpperCase(), 600, 206);

  // 8. PROMINENT 24K Gold Oscar Statuette Sculpture (Centerpiece of the award)
  // Radiant golden stage volumetric halo centered behind the prominent sculpture
  const statuetteHalo = ctx.createRadialGradient(600, 600, 50, 600, 600, 420);
  statuetteHalo.addColorStop(0, 'rgba(255, 215, 0, 0.45)');
  statuetteHalo.addColorStop(0.4, 'rgba(255, 160, 0, 0.22)');
  statuetteHalo.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = statuetteHalo;
  ctx.fillRect(180, 210, 840, 810);

  let statuetteDrawn = false;
  try {
    const statuetteImg = new Image();
    statuetteImg.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(OSCAR_STATUETTE_SVG)}`;
    await Promise.race([
      statuetteImg.decode(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Statuette decode timeout')), 1000))
    ]);
    // Draw statuette prominently at 480x750 (scaled and commanding center stage)
    ctx.drawImage(statuetteImg, 360, 230, 480, 750);
    statuetteDrawn = true;
  } catch (e) {
    console.warn('SVG decode note, using prominent sculpted Canvas statuette:', e);
  }

  // Guaranteed fallback: if SVG didn't decode, draw the sculpted 24K gold statuette via Canvas paths scaled prominently
  if (!statuetteDrawn) {
    drawSculptedOscarStatuetteOnCanvas(ctx, 600, 600, 1.45);
  }

  // 9. SOLID ENGRAVED BRASS PEDESTAL PLAQUE WITH CONGRATULATIONS TO WINNER(S)
  // (Citation removed, lavish honors pedestal with Congratulations and role presentation)
  const plaqueX = 80;
  const plaqueY = 1015;
  const plaqueW = 1040;
  const plaqueH = 645;

  const plaqueGrad = ctx.createLinearGradient(plaqueX, plaqueY, plaqueX + plaqueW, plaqueY + plaqueH);
  plaqueGrad.addColorStop(0, '#734b00');
  plaqueGrad.addColorStop(0.2, '#c48e19');
  plaqueGrad.addColorStop(0.5, '#ffd966');
  plaqueGrad.addColorStop(0.8, '#b8810e');
  plaqueGrad.addColorStop(1, '#573700');
  ctx.fillStyle = plaqueGrad;
  ctx.beginPath();
  ctx.roundRect(plaqueX, plaqueY, plaqueW, plaqueH, 22);
  ctx.fill();
  ctx.strokeStyle = '#382200';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Brass Plaque Rivet Bolts
  const drawBolt = (bx: number, by: number) => {
    ctx.fillStyle = '#261500';
    ctx.beginPath();
    ctx.arc(bx, by, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffd54f';
    ctx.lineWidth = 2;
    ctx.stroke();
  };
  drawBolt(plaqueX + 22, plaqueY + 22);
  drawBolt(plaqueX + plaqueW - 22, plaqueY + 22);
  drawBolt(plaqueX + 22, plaqueY + plaqueH - 22);
  drawBolt(plaqueX + plaqueW - 22, plaqueY + plaqueH - 22);

  // Dark Obsidian Inner Plate of Plaque
  const innerX = plaqueX + 22;
  const innerY = plaqueY + 22;
  const innerW = plaqueW - 44;
  const innerH = plaqueH - 44;

  ctx.fillStyle = 'rgba(10, 8, 4, 0.94)';
  ctx.beginPath();
  ctx.roundRect(innerX, innerY, innerW, innerH, 16);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 215, 0, 0.45)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Plaque Top Header: Organisation & Month Year
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffd54f';
  let plaqueHeaderTitle = `${orgName.toUpperCase()} • ${awardHallOfFameTitle.toUpperCase()}`;
  let pHeaderSize = 20;
  ctx.font = `bold ${pHeaderSize}px "Times New Roman", Georgia, serif`;
  const maxPHeaderW = innerW - 280;
  while (ctx.measureText(plaqueHeaderTitle).width > maxPHeaderW && pHeaderSize > 13) {
    pHeaderSize -= 1;
    ctx.font = `bold ${pHeaderSize}px "Times New Roman", Georgia, serif`;
  }
  ctx.fillText(plaqueHeaderTitle, innerX + 35, innerY + 48);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#fde68a';
  ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
  ctx.fillText(monthYear.toUpperCase(), innerX + innerW - 35, innerY + 48);

  // Plaque Top Divider
  ctx.strokeStyle = 'rgba(255, 215, 0, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(innerX + 35, innerY + 68);
  ctx.lineTo(innerX + innerW - 35, innerY + 68);
  ctx.stroke();

  // 10. "CONGRATULATIONS" Prestigious Banner Pill
  ctx.fillStyle = 'rgba(245, 158, 11, 0.18)';
  ctx.beginPath();
  ctx.roundRect(600 - 240, innerY + 95, 480, 52, 26);
  ctx.fill();
  ctx.strokeStyle = '#ffd54f';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 28px system-ui, -apple-system, sans-serif';
  const congratsGrad = ctx.createLinearGradient(400, 0, 800, 0);
  congratsGrad.addColorStop(0, '#ffffff');
  congratsGrad.addColorStop(0.3, '#fff6bd');
  congratsGrad.addColorStop(0.6, '#ffd54f');
  congratsGrad.addColorStop(1, '#ff9800');
  ctx.fillStyle = congratsGrad;
  ctx.fillText('★  CONGRATULATIONS  ★', 600, innerY + 121);

  // 11. In the Congratulation card: Picture removed, Congratulations and Winner Name prominently added
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'center';

  if (isJointAward) {
    // Joint Winner Name with Congratulations
    const congratsPrefix = 'Congratulations, ';
    let nameSize = 40;
    ctx.font = `bold ${nameSize}px "Times New Roman", Georgia, serif`;
    const fullText = `${congratsPrefix}${primaryName} & ${coWinnerName}!`;
    const maxTextW = innerW - 60;
    while (ctx.measureText(fullText).width > maxTextW && nameSize > 22) {
      nameSize -= 1;
      ctx.font = `bold ${nameSize}px "Times New Roman", Georgia, serif`;
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillText(fullText, 600, innerY + 230);

    // Roles
    const jointRoleText = (coWinnerRole && coWinnerRole !== primaryRole
      ? `${primaryRole} • ${coWinnerRole}`
      : primaryRole).toUpperCase();
    ctx.fillStyle = '#ffd54f';
    ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
    ctx.fillText(jointRoleText, 600, innerY + 280);
  } else {
    // Single Winner Name with Congratulations
    const congratsPrefix = 'Congratulations, ';
    let nameSize = 44;
    ctx.font = `bold ${nameSize}px "Times New Roman", Georgia, serif`;
    const fullText = `${congratsPrefix}${primaryName}!`;
    const maxTextW = innerW - 60;
    while (ctx.measureText(fullText).width > maxTextW && nameSize > 24) {
      nameSize -= 2;
      ctx.font = `bold ${nameSize}px "Times New Roman", Georgia, serif`;
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillText(fullText, 600, innerY + 230);

    // Role
    ctx.fillStyle = '#ffd54f';
    ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
    ctx.fillText(primaryRole.toUpperCase(), 600, innerY + 280);
  }

  // Elegant subtle golden separator with center diamond accent
  ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(600 - 200, innerY + 330);
  ctx.lineTo(600 - 15, innerY + 330);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(600 + 15, innerY + 330);
  ctx.lineTo(600 + 200, innerY + 330);
  ctx.stroke();

  ctx.fillStyle = '#ffd54f';
  ctx.beginPath();
  ctx.moveTo(600, innerY + 324);
  ctx.lineTo(600 + 6, innerY + 330);
  ctx.lineTo(600, innerY + 336);
  ctx.lineTo(600 - 6, innerY + 330);
  ctx.closePath();
  ctx.fill();

  // Conferred Tribute Accolade (Replaces citation with prestigious honors decree)
  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'italic 21px Georgia, "Times New Roman", serif';
  ctx.fillText(
    'Conferred with highest distinction for peerless dedication, faithful integrity,',
    600,
    innerY + 392
  );
  ctx.fillText(
    'and extraordinary service to God and humanity.',
    600,
    innerY + 428
  );

  // Plaque Footer Divider Line
  ctx.strokeStyle = 'rgba(255, 215, 0, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(innerX + 35, innerY + 472);
  ctx.lineTo(innerX + innerW - 35, innerY + 472);
  ctx.stroke();

  // Plaque Footer: Decreed Honors & Trophy ID
  ctx.textAlign = 'left';
  ctx.fillStyle = '#fde68a';
  ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
  ctx.fillText('CONFERRED BY DECREED HONORS', innerX + 35, innerY + 508);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 18px monospace';
  ctx.fillText(`ID: ${trophyId}`, innerX + innerW - 35, innerY + 508);

  // 13. Generate PNG Blob and trigger instant download
  return new Promise<void>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        // Fallback to dataURL if toBlob is blocked
        try {
          const dataUrl = canvas.toDataURL('image/png');
          const a = document.createElement('a');
          a.href = dataUrl;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            if (document.body.contains(a)) document.body.removeChild(a);
            resolve();
          }, 600);
        } catch (err) {
          reject(err);
        }
        return;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (document.body.contains(a)) document.body.removeChild(a);
        URL.revokeObjectURL(url);
        resolve();
      }, 600);
    }, 'image/png');
  });
}

/**
 * Direct Canvas 2D Sculpted Oscar Statuette Renderer.
 * Ensures the award sculpture is never missing or blank even without external SVG decode.
 */
function drawSculptedOscarStatuetteOnCanvas(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale = 1.35) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  // Radiant halo
  const halo = ctx.createRadialGradient(0, -80, 20, 0, -80, 260);
  halo.addColorStop(0, 'rgba(255, 220, 80, 0.45)');
  halo.addColorStop(0.4, 'rgba(255, 160, 0, 0.2)');
  halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(-260, -340, 520, 520);

  // Pedestal shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.beginPath();
  ctx.ellipse(0, 190, 140, 24, 0, 0, Math.PI * 2);
  ctx.fill();

  // Obsidian Marble Plinth Base
  const plinthGrad = ctx.createLinearGradient(-100, 0, 100, 0);
  plinthGrad.addColorStop(0, '#0a0a0f');
  plinthGrad.addColorStop(0.3, '#2a2c3a');
  plinthGrad.addColorStop(0.7, '#151620');
  plinthGrad.addColorStop(1, '#050508');
  ctx.fillStyle = plinthGrad;
  ctx.beginPath();
  ctx.roundRect(-90, 130, 180, 60, 8);
  ctx.fill();
  ctx.strokeStyle = '#ffd54f';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Gold Trim Ring
  ctx.strokeStyle = '#fff5bd';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-86, 140);
  ctx.lineTo(86, 140);
  ctx.stroke();

  // Central Statuette Figure (24K Gold)
  const goldGrad = ctx.createLinearGradient(-40, 0, 40, 0);
  goldGrad.addColorStop(0, '#9e6200');
  goldGrad.addColorStop(0.3, '#ffd54f');
  goldGrad.addColorStop(0.5, '#fff6bd');
  goldGrad.addColorStop(0.7, '#f59e0b');
  goldGrad.addColorStop(1, '#663b00');
  ctx.fillStyle = goldGrad;

  // Head
  ctx.beginPath();
  ctx.arc(0, -170, 22, 0, Math.PI * 2);
  ctx.fill();

  // Torso / Athletic Wings
  ctx.beginPath();
  ctx.moveTo(0, -145);
  ctx.bezierCurveTo(45, -130, 50, -80, 25, 0);
  ctx.lineTo(18, 130);
  ctx.lineTo(-18, 130);
  ctx.lineTo(-25, 0);
  ctx.bezierCurveTo(-50, -80, -45, -130, 0, -145);
  ctx.fill();

  // Crusader Sword of Honor
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-3, -120, 6, 240);
  ctx.fillStyle = '#ffd54f';
  // Crossguard
  ctx.fillRect(-24, -90, 48, 8);
  // Pommel
  ctx.beginPath();
  ctx.arc(0, -125, 6, 0, Math.PI * 2);
  ctx.fill();

  // Twin Triumph Curved Laurels
  ctx.strokeStyle = '#ffd54f';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(-45, -30, 85, 0.4 * Math.PI, 1.4 * Math.PI);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(45, -30, 85, -0.4 * Math.PI, 0.6 * Math.PI);
  ctx.stroke();

  ctx.restore();
}

/**
 * Downloads the Award as an image file. Maintained for backwards compatibility.
 */
export const downloadAwardFile = downloadAwardAsImage;

/**
 * Generates an HTML card string for temporary off-screen export
 */
function generateAwardCardSnippet(record: WinnerRecord): string {
  const orgName = record.organisationName || 'The Reinvention House';
  const isJoint = Boolean(
    record.isJointWinner ||
    record.isTie ||
    record.secondaryDepartmentName ||
    record.jointWinnerName ||
    (record.allWinners && record.allWinners.length > 1)
  );
  const primaryWinner = record.winner || record.allWinners?.[0];
  const primaryName = primaryWinner?.displayName || record.winner?.displayName || 'Honored Worker';
  const primaryRole = primaryWinner?.roleOrTitle || record.departmentName || 'Kingdom Contributor';
  const primaryPhoto = primaryWinner?.photoUrl || record.winner?.photoUrl;

  const coWinner = record.allWinners && record.allWinners.length > 1 ? record.allWinners[1] : null;
  const coWinnerName = record.jointWinnerName || coWinner?.displayName || '';
  const coWinnerRole = record.jointWinnerRole || coWinner?.roleOrTitle || record.secondaryDepartmentName || '';
  const coWinnerPhoto = record.jointWinnerPhotoUrl || coWinner?.photoUrl;
  const isJointAward = Boolean(isJoint && coWinnerName);

  const monthYear = `${record.month || 'Honor'} ${record.year || new Date().getFullYear()}`;
  const trophyId = (record.exerciseId || 'OSCAR-MERIT').slice(0, 14);

  const bgStyle = primaryPhoto
    ? `background: linear-gradient(to bottom, rgba(4, 6, 11, 0.88), rgba(11, 14, 24, 0.75), rgba(2, 3, 6, 0.94)), url('${primaryPhoto}') center/cover no-repeat;`
    : `background: linear-gradient(to bottom, #16182c, #0b0e18, #04060b);`;

  const awardTitle = record.categoryName || record.awardTitle || record.exerciseTitle || 'Worker of the Month';
  const awardHallOfFameTitle = getAwardHallOfFameTitle(record);

  return `
    <div style="padding: 32px; border-radius: 24px; border: 2px solid rgba(245, 158, 11, 0.7); ${bgStyle} color: #f8fafc; font-family: system-ui, -apple-system, sans-serif; text-align: center; box-sizing: border-box; position: relative; overflow: hidden;">
      <!-- Header with Church Logo & TRH MINISTRIES GLOBAL -->
      <div style="display: inline-flex; align-items: center; gap: 8px; padding: 6px 18px; border-radius: 9999px; background: rgba(245, 158, 11, 0.25); border: 1px solid rgba(245, 158, 11, 0.6); color: #fde68a; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 12px;">
        <img src="${TRH_LOGO_URL}" style="width: 20px; height: 20px; object-fit: contain;" alt="TRH Logo" onerror="this.src='${TRH_OFFICIAL_LOGO_BASE64}'" />
        <span>TRH MINISTRIES GLOBAL</span>
      </div>

      <div>
        <h3 style="font-size: 28px; font-weight: 900; font-family: 'Times New Roman', serif; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 4px 0; color: #ffffff;">
          ${escapeHtml(awardTitle)}
        </h3>
        <p style="font-size: 13px; color: #cbd5e1; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 16px 0;">
          ${escapeHtml(awardHallOfFameTitle)}
        </p>
      </div>

      <!-- Prominent Oscar Statuette SVG -->
      <div style="margin: 12px 0; display: flex; justify-content: center; transform: scale(1.15); transform-origin: center center;">
        ${OSCAR_STATUETTE_SVG}
      </div>

      <!-- Congratulations Pill -->
      <div style="display: inline-block; padding: 6px 24px; border-radius: 9999px; background: rgba(245, 158, 11, 0.2); border: 1px solid #ffd54f; color: #ffd54f; font-weight: 900; font-size: 14px; letter-spacing: 2px; text-transform: uppercase; margin: 10px auto;">
        ★ CONGRATULATIONS ★
      </div>

      <!-- Congratulation Card (Picture removed, Congratulations added) -->
      <div style="display: inline-block; padding: 12px 32px; border-radius: 9999px; background: linear-gradient(to right, #2a1b54, #0d1527); border: 2px solid #ffd54f; margin: 10px auto; box-shadow: 0 10px 25px rgba(0,0,0,0.6); text-align: center;">
        <div style="font-size: 20px; font-weight: bold; color: #ffffff; font-family: 'Times New Roman', serif;">
          Congratulations, ${escapeHtml(primaryName)}${isJointAward ? ` &amp; ${escapeHtml(coWinnerName)}` : ''}!
        </div>
        <div style="font-size: 13px; color: #ffd54f; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px;">
          ${escapeHtml(primaryRole)}${isJointAward && coWinnerRole && coWinnerRole !== primaryRole ? ` • ${escapeHtml(coWinnerRole)}` : ''}
        </div>
      </div>

      <!-- Solid Brass Pedestal Plaque (Citation removed, honors accolade) -->
      <div style="margin-top: 14px; border-radius: 16px; padding: 18px; background: linear-gradient(135deg, #784d00, #b8860b, #ffd700, #b8860b, #613e00); border: 2px solid #382200; box-shadow: 0 10px 30px rgba(0,0,0,0.6); text-align: center;">
        <div style="background: rgba(10, 8, 4, 0.94); border-radius: 10px; padding: 14px; border: 1px solid rgba(255, 215, 0, 0.45);">
          <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; color: #ffd54f; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; border-bottom: 1px solid rgba(255, 215, 0, 0.2); padding-bottom: 6px;">
            <span>${escapeHtml(orgName)}</span>
            <span>${escapeHtml(monthYear)}</span>
          </div>
          <p style="font-size: 13px; font-style: italic; color: #cbd5e1; line-height: 1.6; margin: 0 0 8px 0; font-family: Georgia, serif;">
            Conferred with highest distinction for peerless dedication, faithful integrity, and outstanding service.
          </p>
          <div style="display: flex; justify-content: space-between; font-size: 10px; color: rgba(255, 215, 0, 0.8); border-top: 1px solid rgba(255, 215, 0, 0.2); padding-top: 6px;">
            <span style="text-transform: uppercase; letter-spacing: 1px;">Conferred by Decreed Honors</span>
            <span style="font-family: monospace; color: #94a3b8;">ID: ${escapeHtml(trophyId)}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}
