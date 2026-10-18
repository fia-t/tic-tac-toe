// Анімовані картинки карток альбому кампанії: по три на стандартний розділ (пройдено, бос,
// золото). Статичні SVG-рядки без даних користувача; анімації - CSS усередині SVG (класи al-*,
// щоб не перетинатися зі стилями гри), з prefers-reduced-motion вони вимикаються.
// Для розділів, доданих в адмінці, є лише золота картка (з зіркою); "пройдено" й "бос" там
// показують фон розділу й портрет боса, як і раніше.

type Kind = "done" | "boss" | "gold";

const CSS = `
.al *{transform-box:fill-box}
.al-bob{animation:al-bob 3s ease-in-out infinite}
@keyframes al-bob{50%{transform:translateY(-2.5px)}}
.al-rock{animation:al-rock 3s ease-in-out infinite;transform-origin:50% 100%}
@keyframes al-rock{0%,100%{transform:rotate(-5deg)}50%{transform:rotate(5deg)}}
.al-sway{animation:al-sway 4s ease-in-out infinite;transform-origin:50% 100%}
@keyframes al-sway{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(3deg)}}
.al-drift{animation:al-drift 16s linear infinite}
@keyframes al-drift{from{transform:translateX(-40px)}to{transform:translateX(120px)}}
.al-waves{animation:al-waves 2.4s linear infinite}
@keyframes al-waves{to{transform:translateX(-20px)}}
.al-spin{animation:al-spin 14s linear infinite;transform-origin:50% 50%}
@keyframes al-spin{to{transform:rotate(360deg)}}
.al-blink{animation:al-blink 4s infinite;transform-origin:50% 50%}
@keyframes al-blink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}
.al-flap{animation:al-flap .5s ease-in-out infinite alternate;transform-origin:50% 50%}
@keyframes al-flap{to{transform:scaleY(-.5)}}
.al-fall{animation:al-fall 6s linear infinite;opacity:0}
@keyframes al-fall{0%{transform:translate(0,-6px) rotate(0);opacity:0}10%,85%{opacity:1}100%{transform:translate(14px,64px) rotate(320deg);opacity:0}}
.al-glow{animation:al-glow 2.4s ease-in-out infinite}
@keyframes al-glow{0%,100%{opacity:.15}50%{opacity:1}}
.al-twinkle{animation:al-twinkle 2.2s ease-in-out infinite;transform-origin:50% 50%}
@keyframes al-twinkle{0%,100%{transform:scale(.2) rotate(0);opacity:0}50%{transform:scale(1) rotate(45deg);opacity:1}}
.al-pop{animation:al-pop 3.6s ease-in-out infinite}
@keyframes al-pop{0%,100%{transform:translateY(18px)}22%,78%{transform:translateY(0)}}
.al-rise{animation:al-rise 3s ease-in infinite;opacity:0}
@keyframes al-rise{0%{transform:translateY(0);opacity:0}20%{opacity:.9}100%{transform:translateY(-26px);opacity:0}}
.al-flag{animation:al-flag 1s ease-in-out infinite alternate;transform-origin:0 50%}
@keyframes al-flag{to{transform:skewY(-9deg) scaleX(.88)}}
.al-claw{animation:al-claw .9s ease-in-out infinite alternate;transform-origin:100% 100%}
@keyframes al-claw{to{transform:rotate(-16deg)}}
.al-wingl{animation:al-wingl .7s ease-in-out infinite alternate;transform-origin:100% 60%}
@keyframes al-wingl{from{transform:rotate(18deg)}to{transform:rotate(-22deg)}}
.al-wingr{animation:al-wingr .7s ease-in-out infinite alternate;transform-origin:0 60%}
@keyframes al-wingr{from{transform:rotate(-18deg)}to{transform:rotate(22deg)}}
.al-shine{animation:al-shine 3.6s ease-in-out infinite}
@keyframes al-shine{0%{transform:translateX(-90px)}55%,100%{transform:translateX(150px)}}
.al-orbit{animation:al-spin 2.4s linear infinite;transform-origin:50% 50%}
@media (prefers-reduced-motion:reduce){.al *{animation:none!important;opacity:1}}
`;

const svg = (body: string) =>
    `<svg class="al" viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><style>${CSS}</style>${body}</svg>`;

const star = (cx: number, cy: number, r: number, fill: string, extra = "") => {
    const pts = Array.from({ length: 10 }, (_, i) => {
        const a = (Math.PI / 5) * i - Math.PI / 2;
        const rr = i % 2 ? r * 0.45 : r;
        return `${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`;
    }).join(" ");
    return `<polygon points="${pts}" fill="${fill}" ${extra}/>`;
};

// Іскорка-ромб, що мерехтить.
const sparkle = (x: number, y: number, s: number, delay: number, fill = "#fff") =>
    `<path class="al-twinkle" style="animation-delay:${delay}s" d="M${x} ${y - s}Q${x} ${y} ${x + s} ${y}Q${x} ${y} ${x} ${y + s}Q${x} ${y} ${x - s} ${y}Q${x} ${y} ${x} ${y - s}z" fill="${fill}"/>`;

const waves = (y: number, stroke: string, opacity: number, dur: number) => {
    let d = `M-20 ${y}`;
    for (let i = 0; i < 8; i++) d += " q5 -2.6 10 0 q5 2.6 10 0";
    return `<g class="al-waves" style="animation-duration:${dur}s"><path d="${d}" stroke="${stroke}" stroke-opacity="${opacity}" stroke-width="1.6" fill="none" stroke-linecap="round"/></g>`;
};

const cloud = (x: number, y: number, s: number, dur: number, delay: number) =>
    `<g class="al-drift" style="animation-duration:${dur}s;animation-delay:${delay}s"><g fill="#fff" fill-opacity=".9"><ellipse cx="${x}" cy="${y}" rx="${9 * s}" ry="${4 * s}"/><circle cx="${x - 3 * s}" cy="${y - 3 * s}" r="${4 * s}"/><circle cx="${x + 3 * s}" cy="${y - 4 * s}" r="${5 * s}"/></g></g>`;

const gull = (x: number, y: number, delay: number) =>
    `<g class="al-bob" style="animation-delay:${delay}s"><path class="al-flap" style="animation-delay:${delay}s" d="M${x - 5} ${y}q2.5 -3 5 0q2.5 -3 5 0" stroke="#49301f" stroke-width="1.3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>`;

// Прапорець "пройдено" з галочкою, що майорить.
const doneFlag = (x: number, y: number, color: string) =>
    `<path d="M${x} ${y + 24}V${y}" stroke="#6b4423" stroke-width="2" stroke-linecap="round"/><g class="al-flag"><path d="M${x} ${y}h15l-4 5 4 5h-15z" fill="${color}"/><path d="M${x + 3.5} ${y + 5}l2.5 2.5 4.5 -5" stroke="#fff" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>`;

// Запаморочення переможеного боса: зірки по еліпсу над головою.
const dizzy = (cx: number, cy: number) =>
    `<g transform="translate(${cx} ${cy}) scale(1 .55)"><g class="al-orbit">${star(-13, 0, 4.6, "#ffd34f")}${star(13, 0, 4.6, "#ffd34f")}${star(0, -13, 4.6, "#ffd34f")}${star(0, 13, 4.6, "#ffd34f")}</g></g>`;

// Білий прапор капітуляції в лапі боса.
const whiteFlag = (x: number, y: number) =>
    `<path d="M${x} ${y + 18}V${y}" stroke="#8a5a2a" stroke-width="1.6" stroke-linecap="round"/><g class="al-flag" style="animation-duration:.7s"><path d="M${x} ${y}q5 -2 10 0t10 0v9q-5 -2 -10 0t-10 0z" fill="#fff" stroke="#d9cbb5" stroke-width=".6"/></g>`;

// --- Пляж ---

const beachDone = svg(`
<defs><linearGradient id="al-bd-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6fc8ee"/><stop offset="1" stop-color="#d9f3fb"/></linearGradient></defs>
<rect width="100" height="100" fill="url(#al-bd-sky)"/>
<g class="al-spin"><g stroke="#ffd34f" stroke-width="2.2" stroke-linecap="round">${Array.from({ length: 8 }, (_, i) => {
    const a = (Math.PI / 4) * i;
    return `<path d="M${(78 + 12 * Math.cos(a)).toFixed(1)} ${(20 + 12 * Math.sin(a)).toFixed(1)}L${(78 + 17 * Math.cos(a)).toFixed(1)} ${(20 + 17 * Math.sin(a)).toFixed(1)}"/>`;
}).join("")}</g></g>
<circle cx="78" cy="20" r="9" fill="#ffd34f"/><circle cx="75" cy="17" r="3" fill="#fff3b0"/>
${cloud(10, 22, 1, 18, -4)}${cloud(10, 12, 0.7, 24, -15)}
${gull(40, 26, 0)}${gull(54, 20, -0.8)}
<rect y="50" width="100" height="24" fill="#1fb3d9"/>
<rect y="50" width="100" height="5" fill="#57cbe9"/>
${waves(57, "#fff", 0.7, 2.6)}${waves(64, "#fff", 0.45, 3.4)}
<g class="al-rock" style="animation-duration:3.4s"><path d="M30 56V38" stroke="#6b4423" stroke-width="1.4"/><path d="M31 39l11 15H31z" fill="#fff"/><path d="M29 41l-7 13h7z" fill="#ffe0a3"/><path d="M30 38l5 -2 -5 -2z" fill="#e8452f"/><path d="M20 56h22l-4 5H24z" fill="#8b5a2b"/></g>
<path d="M0 72c25 -6 60 -6 100 0v28H0z" fill="#f6d39e"/>
<path d="M0 80c30 -4 70 -4 100 2v18H0z" fill="#efc488"/>
<g fill="#d9a865"><circle cx="40" cy="90" r=".9"/><circle cx="55" cy="94" r=".9"/><circle cx="88" cy="92" r=".9"/><circle cx="10" cy="95" r=".9"/></g>
<path d="M76 92V66" stroke="#8a5a2a" stroke-width="1.6"/>
<g class="al-sway" style="animation-duration:5s"><path d="M62 69q14 -14 28 0z" fill="#e8452f"/><path d="M71 69q5 -12 10 0z" fill="#fff"/></g>
${star(48, 88, 4, "#ff8a5c")}
${doneFlag(18, 66, "#2f8a3e")}
`);

const beachBoss = svg(`
<defs><linearGradient id="al-bb-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fe0f5"/><stop offset="1" stop-color="#e6f8fc"/></linearGradient></defs>
<rect width="100" height="100" fill="url(#al-bb-sky)"/>
<rect y="46" width="100" height="22" fill="#1fb3d9"/>
${waves(52, "#fff", 0.6, 2.8)}
<g fill="#fff" fill-opacity=".8"><circle class="al-rise" cx="14" cy="64" r="1.6"/><circle class="al-rise" style="animation-delay:-1s" cx="20" cy="66" r="1.1"/><circle class="al-rise" style="animation-delay:-2s" cx="86" cy="64" r="1.4"/></g>
<path d="M0 66c30 -5 70 -5 100 0v34H0z" fill="#f6d39e"/>
<g class="al-bob" style="animation-duration:2.2s">
  <g stroke="#b8301f" stroke-width="3" stroke-linecap="round" fill="none"><path d="M30 70l-10 5M30 76l-10 8M70 70l10 5M70 76l10 8"/></g>
  <g class="al-claw"><path d="M32 62l-12 -12" stroke="#e8452f" stroke-width="4" stroke-linecap="round"/><path d="M14 44c-5 -2 -6 -8 -2 -11 1 4 5 5 8 4 -2 -4 0 -9 4 -9 -1 6 1 11 -2 15z" fill="#e8452f"/>${whiteFlag(19, 24)}</g>
  <path d="M68 62l10 -10" stroke="#e8452f" stroke-width="4" stroke-linecap="round"/><path d="M84 46c5 -2 6 -8 2 -11 -1 4 -5 5 -8 4 2 -4 0 -9 -4 -9 1 6 -1 11 2 15z" fill="#e8452f"/>
  <ellipse cx="50" cy="68" rx="22" ry="15" fill="#e8452f"/><ellipse cx="50" cy="64" rx="15" ry="7" fill="#f26b52"/>
  <path d="M43 52v-8M57 52v-8" stroke="#b8301f" stroke-width="3" stroke-linecap="round"/>
  <circle cx="43" cy="42" r="5.5" fill="#fff"/><circle cx="57" cy="42" r="5.5" fill="#fff"/>
  <path d="M43 42m-2.6 0a2.6 2.6 0 1 1 2.6 2.6a1.5 1.5 0 1 1 -1.4 -1.6M57 42m-2.6 0a2.6 2.6 0 1 1 2.6 2.6a1.5 1.5 0 1 1 -1.4 -1.6" stroke="#2a1a10" stroke-width="1.1" fill="none"/>
  <path d="M42 74q4 -3 8 0t8 0" stroke="#7a1d10" stroke-width="2" fill="none" stroke-linecap="round"/>
  <path d="M36 34l14 -7 14 7 -2 4H38z" fill="#2a3b55"/><path d="M44 31h12" stroke="#ffd34f" stroke-width="2"/><path d="M36 38h28" stroke="#1a2638" stroke-width="2"/>
  ${dizzy(50, 22)}
</g>
`);

// --- Ліс ---

const pine = (x: number, base: number, h: number, color: string, delay: number) =>
    `<g class="al-sway" style="animation-delay:${delay}s;animation-duration:${4 + (x % 3)}s"><path d="M${x} ${base - h}l${h * 0.32} ${h * 0.45}h-${h * 0.14}l${h * 0.22} ${h * 0.4}h-${h * 0.8}l${h * 0.22} -${h * 0.4}h-${h * 0.14}z" fill="${color}"/></g><path d="M${x} ${base - h * 0.15}v${h * 0.2}" stroke="#6b4423" stroke-width="2"/>`;

const leaf = (x: number, y: number, color: string, delay: number, dur: number) =>
    `<g class="al-fall" style="animation-delay:${delay}s;animation-duration:${dur}s"><path d="M${x} ${y}q3 -3 6 0q-3 3 -6 0z" fill="${color}"/></g>`;

const forestDone = svg(`
<defs><linearGradient id="al-fd-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d7efc4"/><stop offset="1" stop-color="#f4f9e6"/></linearGradient></defs>
<rect width="100" height="100" fill="url(#al-fd-sky)"/>
<circle cx="80" cy="18" r="8" fill="#ffe28a"/>
<path d="M0 64c20 -14 45 -16 60 -8s30 4 40 -2v46H0z" fill="#9cc77e"/>
${pine(12, 72, 34, "#3f7a2e", 0)}${pine(84, 70, 38, "#356b27", -1.2)}${pine(68, 76, 26, "#4f8a3a", -2)}${pine(28, 78, 24, "#4f8a3a", -0.6)}
<path d="M0 76c30 -8 70 -8 100 0v24H0z" fill="#7aa85a"/>
<path d="M0 86c30 -5 70 -5 100 0v14H0z" fill="#6a9a4c"/>
<path d="M58 88c0 -5 4 -8 8 -8s8 3 8 8z" fill="#e8452f"/><g fill="#fff"><circle cx="63" cy="83" r="1.3"/><circle cx="69" cy="84" r="1.1"/></g><path d="M64 88v5M68 88v5" stroke="#fff8ec" stroke-width="2.4"/>
${doneFlag(42, 60, "#e8862f")}<ellipse cx="42" cy="85" rx="6" ry="2.4" fill="#8b5a2b"/>
${leaf(20, 10, "#e8862f", 0, 6)}${leaf(50, 4, "#e8452f", -2, 7)}${leaf(74, 12, "#f2b53a", -4, 6.5)}${leaf(36, 2, "#d9702a", -5.2, 8)}
<g fill="#fff6a0"><circle class="al-glow" cx="24" cy="70" r="1.4"/><circle class="al-glow" style="animation-delay:-.8s" cx="78" cy="66" r="1.2"/><circle class="al-glow" style="animation-delay:-1.6s" cx="54" cy="58" r="1.1"/></g>
`);

const forestBoss = svg(`
<defs><linearGradient id="al-fb-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfe8b8"/><stop offset="1" stop-color="#eef7e2"/></linearGradient></defs>
<rect width="100" height="100" fill="url(#al-fb-sky)"/>
${pine(10, 70, 36, "#4f8a3a", 0)}${pine(90, 72, 40, "#3f7a2e", -1.5)}
<path d="M0 70c30 -6 70 -6 100 0v30H0z" fill="#7aa85a"/>
<ellipse cx="50" cy="80" rx="22" ry="6" fill="#3d2616"/>
<g class="al-pop">
  ${whiteFlag(68, 40)}
  <ellipse cx="50" cy="66" rx="18" ry="20" fill="#5c4033"/>
  <ellipse cx="50" cy="70" rx="9" ry="8" fill="#7a5a48"/>
  <path d="M50 54c-3 4 -5 9 -5 12h10c0 -3 -2 -8 -5 -12z" fill="#f2a5a0"/><circle cx="50" cy="55" r="3.4" fill="#d9706a"/>
  <g class="al-blink"><path d="M40 60l4 3M44 60l-4 3M56 60l4 3M60 60l-4 3" stroke="#1a1008" stroke-width="1.6" stroke-linecap="round"/></g>
  <g fill="#f2c9a0"><ellipse cx="34" cy="76" rx="6" ry="4"/><ellipse cx="68" cy="74" rx="5" ry="4"/></g>
  <path d="M28 76l-3 -2M28 78l-4 0M66 72l4 -2" stroke="#f2c9a0" stroke-width="1.6" stroke-linecap="round"/>
  <path d="M36 46c3 -6 25 -6 28 0" stroke="#2a1a10" stroke-width="3" fill="none"/><rect x="38" y="32" width="24" height="13" rx="2.5" fill="#2a1a10"/><rect x="38" y="40" width="24" height="3" fill="#8b2a1a"/><rect x="33" y="44" width="34" height="3.4" rx="1.7" fill="#2a1a10"/>
  ${dizzy(50, 26)}
</g>
<path d="M24 82c6 -8 14 -10 26 -10s20 2 26 10c-8 4 -44 4 -52 0z" fill="#9a6a3c"/>
<g fill="#7a4f28"><circle cx="34" cy="80" r="1.4"/><circle cx="62" cy="79" r="1.2"/><circle cx="48" cy="82" r="1"/></g>
<path d="M0 88c30 -4 70 -4 100 0v12H0z" fill="#6a9a4c"/>
`);

// --- Гори ---

const mountainsDone = svg(`
<defs><linearGradient id="al-md-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9cc8ee"/><stop offset="1" stop-color="#e3eef8"/></linearGradient></defs>
<rect width="100" height="100" fill="url(#al-md-sky)"/>
<circle cx="20" cy="20" r="7" fill="#fff8ec"/>
${cloud(10, 30, 0.9, 20, -6)}
<path d="M-4 84l26 -36 14 16 20 -38 48 58z" fill="#8aa1b8"/>
<path d="M56 26l9 15 -5 -2 -4 5 -4 -6 -4 3z" fill="#fff"/><path d="M22 48l6 8 -4 -1 -3 3 -3 -4z" fill="#fff"/>
<path d="M-4 90l30 -26 20 14 24 -20 34 32z" fill="#6f8aa6"/>
${doneFlag(56, 10, "#e8452f")}
${cloud(-10, 48, 1.2, 26, -12)}
${gull(76, 34, -0.3)}${gull(86, 28, -0.9)}
<path d="M0 88c30 -5 70 -5 100 0v12H0z" fill="#c9d8e6"/>
${pine(10, 96, 16, "#3f6b4a", 0)}${pine(90, 96, 18, "#35603f", -1)}${pine(80, 98, 12, "#4a7a56", -2)}
`);

const mountainsBoss = svg(`
<defs><linearGradient id="al-mb-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bcd8f0"/><stop offset="1" stop-color="#eef4fa"/></linearGradient></defs>
<rect width="100" height="100" fill="url(#al-mb-sky)"/>
<path d="M-4 70l24 -30 16 18 18 -26 50 38z" fill="#a9bccf"/><path d="M52 32l7 10 -4 -1 -3 3 -3 -4z" fill="#fff"/>
${cloud(0, 18, 1, 22, -8)}
<g class="al-fall" style="animation-duration:7s;animation-delay:-2s"><path d="M78 30q4 -5 2 -10q-4 5 -2 10z" fill="#fff8ec" stroke="#c9b8a0" stroke-width=".5"/></g>
<path d="M14 100l8 -18h56l10 18z" fill="#7d6a58"/><path d="M22 82h56l-6 -6H30z" fill="#948070"/>
<g class="al-bob" style="animation-duration:2.6s">
  <g class="al-wingl"><path d="M38 60c-12 -4 -24 -2 -32 6 8 0 12 2 16 6 4 -2 10 -2 16 -4z" fill="#6b4423"/></g>
  <g class="al-wingr"><path d="M62 60c12 -4 24 -2 32 6 -8 0 -12 2 -16 6 -4 -2 -10 -2 -16 -4z" fill="#6b4423"/></g>
  <ellipse cx="50" cy="66" rx="14" ry="16" fill="#7a5030"/>
  <path d="M44 78l-3 6M50 79v6M56 78l3 6" stroke="#f2a516" stroke-width="2" stroke-linecap="round"/>
  <path d="M38 50c2 -12 22 -12 24 0v8H38z" fill="#fff8ec"/>
  <path d="M42 50l4 3M46 50l-4 3M54 50l4 3M58 50l-4 3" stroke="#1a1008" stroke-width="1.4" stroke-linecap="round"/>
  <path d="M47 55h6l-3 7z" fill="#f2a516"/>
  ${whiteFlag(62, 58)}
  ${dizzy(50, 36)}
</g>
`);

// --- Золото: кубок з емблемою розділу, промені, іскри й відблиск ---

const EMBLEMS: Record<string, string> = {
    // мушля
    beach: `<path d="M50 44c-8 0 -12 6 -12 12h24c0 -6 -4 -12 -12 -12z" fill="#b8730c"/><path d="M50 44v12M45 45l-2 11M55 45l2 11" stroke="#ffe7a0" stroke-width="1.2"/><path d="M47 56h6l-1 3h-4z" fill="#b8730c"/>`,
    // жолудь
    forest: `<path d="M42 50c0 -5 16 -5 16 0z" fill="#8a5a0a"/><path d="M50 43v3" stroke="#8a5a0a" stroke-width="1.6" stroke-linecap="round"/><path d="M43 50h14c0 6 -3 10 -7 10s-7 -4 -7 -10z" fill="#b8730c"/>`,
    // вершина
    mountains: `<path d="M38 59l7 -12 4 5 5 -9 9 16z" fill="#b8730c"/><path d="M54 43l3 5 -2 -1 -1 2 -2 -2z" fill="#ffe7a0"/>`,
};

const goldScene = (key: string, emblem: string) =>
    svg(`
<defs>
  <radialGradient id="al-g-${key}-bg" cx="50%" cy="45%" r="70%"><stop offset="0" stop-color="#fff6cf"/><stop offset=".55" stop-color="#ffd76a"/><stop offset="1" stop-color="#e09a14"/></radialGradient>
  <linearGradient id="al-g-${key}-cup" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f5b82e"/><stop offset=".35" stop-color="#ffe7a0"/><stop offset=".6" stop-color="#f5c04a"/><stop offset="1" stop-color="#c98a12"/></linearGradient>
</defs>
<rect width="100" height="100" fill="url(#al-g-${key}-bg)"/>
<g class="al-spin" style="animation-duration:24s"><g fill="#fff" fill-opacity=".22">${Array.from({ length: 12 }, (_, i) => `<path d="M50 46L46 -30h8z" transform="rotate(${i * 30} 50 46)"/>`).join("")}</g></g>
<g class="al-bob" style="animation-duration:3.4s">
  <path d="M34 36c-10 0 -12 14 2 18M66 36c10 0 12 14 -2 18" stroke="#c98a12" stroke-width="3.4" fill="none" stroke-linecap="round"/>
  <path d="M32 32h36c0 20 -8 32 -18 32s-18 -12 -18 -32z" fill="url(#al-g-${key}-cup)" stroke="#a8700c" stroke-width="1"/>
  <ellipse cx="50" cy="32" rx="18" ry="3" fill="#ffe7a0" stroke="#a8700c" stroke-width="1"/>
  ${emblem}
  <path d="M46 64h8v8h-8z" fill="#d9a12a"/><path d="M38 72h24l2 8H36z" fill="url(#al-g-${key}-cup)" stroke="#a8700c" stroke-width="1"/>
</g>
<path d="M18 84h64l-4 5 4 5H18l4 -5z" fill="#e8452f"/><path d="M22 84h56v10H22z" fill="#c8382a"/>
${star(38, 89, 3.4, "#ffd34f")}${star(50, 89, 3.4, "#ffd34f")}${star(62, 89, 3.4, "#ffd34f")}
${sparkle(22, 26, 4, 0)}${sparkle(80, 22, 5, -0.7)}${sparkle(78, 62, 3.4, -1.4)}${sparkle(20, 60, 3, -1.9)}
<g class="al-shine"><path d="M-30 0h14l-30 100h-14z" fill="#fff" fill-opacity=".35"/></g>
`);

const GENERIC_GOLD = `${star(50, 50, 9, "#b8730c")}`;

const SCENES: Record<string, Partial<Record<Kind, string>>> = {
    beach: { done: beachDone, boss: beachBoss, gold: goldScene("beach", EMBLEMS.beach) },
    forest: { done: forestDone, boss: forestBoss, gold: goldScene("forest", EMBLEMS.forest) },
    mountains: { done: mountainsDone, boss: mountainsBoss, gold: goldScene("mountains", EMBLEMS.mountains) },
};

const genericGold = goldScene("generic", GENERIC_GOLD);

// Картинка картки або null - тоді картка малюється як раніше (фон розділу / портрет боса).
export const albumArt = (chapterId: string, kind: Kind): string | null => SCENES[chapterId]?.[kind] ?? (kind === "gold" ? genericGold : null);
