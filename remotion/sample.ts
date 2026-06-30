// 효과/전환 미리보기용 샘플 이미지(SVG 데이터 URI). 외부 의존성 없이 모션이 잘 보이게 패턴 포함.
function sampleSvg(hue: number, label: string): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='640' height='360'>
    <defs>
      <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0' stop-color='hsl(${hue},65%,58%)'/>
        <stop offset='1' stop-color='hsl(${(hue + 50) % 360},65%,32%)'/>
      </linearGradient>
    </defs>
    <rect width='640' height='360' fill='url(#g)'/>
    <circle cx='150' cy='120' r='70' fill='rgba(255,255,255,0.22)'/>
    <circle cx='520' cy='90' r='40' fill='rgba(255,255,255,0.16)'/>
    <rect x='380' y='210' width='200' height='110' rx='18' fill='rgba(0,0,0,0.18)'/>
    <rect x='60' y='250' width='150' height='70' rx='12' fill='rgba(255,255,255,0.14)'/>
    <text x='320' y='195' font-family='sans-serif' font-size='54' font-weight='700'
      fill='rgba(255,255,255,0.85)' text-anchor='middle'>${label}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const SAMPLE_A = sampleSvg(215, "A");
export const SAMPLE_B = sampleSvg(330, "B");
