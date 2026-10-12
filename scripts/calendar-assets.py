from pathlib import Path
import shutil

root = Path(__file__).resolve().parents[1]
assets = root / 'public/calendar/assets'
assets.mkdir(parents=True, exist_ok=True)
face = '<circle cx="68" cy="52" r="3" fill="#24344b"/><circle cx="91" cy="52" r="3" fill="#24344b"/><path d="M73 64 Q80 73 88 63" fill="#ec766f" stroke="#24344b" stroke-width="2"/><ellipse cx="62" cy="61" rx="6" ry="3" fill="#f7b1a8"/><ellipse cx="98" cy="61" rx="6" ry="3" fill="#f7b1a8"/>'
clock = '<g transform="translate(112 55)"><path d="M-6-19 Q-18-26-22-13 M6-19 Q18-26 22-13" fill="#ffbca8"/><circle r="20" fill="#fffdf2" stroke="#233c59" stroke-width="3"/><path d="M0-12V0L9 5M-13-16L-17-21M13-16L17-21M-13 17L-17 23M13 17L17 23" fill="none" stroke="#233c59" stroke-width="3" stroke-linecap="round"/></g>'
drawings = {
 'arrival': '<circle cx="70" cy="49" r="27" fill="#ffdabf"/><path d="M44 49Q30 18 57 14Q68 0 85 13Q110 11 104 45L95 40L88 26Q72 43 47 36Z" fill="#574335"/><path d="M47 79Q70 66 95 79L108 105H35Z" fill="#fff"/><path d="M72 78L79 84L73 106H85L80 84L86 78" fill="#eb7b6b"/><path d="M40 82L25 98L38 108L53 88" fill="#3b4756"/>'+face+clock,
 'break': '<path d="M47 32L52 95Q80 110 107 94L112 32" fill="#fff8e6"/><path d="M49 72Q80 88 109 72L107 94Q81 108 53 94Z" fill="#b7e6ca"/><rect x="43" y="21" width="72" height="16" rx="6" fill="#71492e"/><rect x="48" y="15" width="62" height="10" rx="5" fill="#986a42"/>'+face+'<path d="M64 5Q56-3 64-10M85 5Q78-3 86-10" fill="none" stroke="#72ba9c" stroke-width="3"/>',
 'night': '<path d="M40 85L19 68M104 84L121 66" stroke="#254661" stroke-width="5"/><circle cx="19" cy="65" r="6" fill="#9dcfea"/><rect x="38" y="21" width="72" height="68" rx="6" fill="#23455e"/><rect x="43" y="26" width="62" height="56" rx="3" fill="#acdfee"/><path d="M38 89L24 107H119L109 89Z" fill="#457492"/><path d="M43 95H106M40 100H110" stroke="#193f5b" stroke-width="2"/><path d="M55 45L65 49L57 52M92 45L82 49L90 52" fill="none" stroke="#214460" stroke-width="2"/><ellipse cx="74" cy="64" rx="7" ry="10" fill="#ec9590" stroke="#214460" stroke-width="2"/>'+clock,
 'holiday': '<path d="M43 57Q80-6 115 57Z" fill="#7ecfb9"/><path d="M43 57Q62 46 80 57Q97 44 115 57" fill="#b9e9d1"/><path d="M80 24V99Q79 111 66 104" fill="none" stroke="#28415b" stroke-width="4"/><circle cx="34" cy="25" r="12" fill="#f2c865"/><path d="M33 4V0M12 25H5M50 11L55 6" stroke="#e4b044" stroke-width="3"/>',
 'leave': '<rect x="41" y="20" width="76" height="85" rx="10" fill="#fff7e3"/><path d="M41 38H117" stroke="#95bddf" stroke-width="13"/><path d="M57 14V29M101 14V29" stroke="#26405a" stroke-width="5" stroke-linecap="round"/>'+face+'<path d="M65 86L76 96L97 75" fill="none" stroke="#49a382" stroke-width="5"/>',
 'care': '<path d="M80 101Q17 60 41 31Q58 10 80 37Q103 8 122 31Q146 60 80 101Z" fill="#efa59c"/>'+face+'<path d="M27 80L16 92M127 16L138 8" stroke="#e9b957" stroke-width="4"/>',
 'departure': '<rect x="38" y="35" width="84" height="68" rx="12" fill="#efbd6e"/><path d="M62 35V24Q80 10 99 24V35" fill="none" stroke="#62472b" stroke-width="6"/><path d="M49 40V98M109 40V98" stroke="#bf8b49" stroke-width="4"/>'+face+'<path d="M123 24H146M137 15L146 24L137 33" fill="none" stroke="#4d977e" stroke-width="4"/>',
 'notice': '<path d="M47 15H102L117 31V108H47Z" fill="#fff7e7"/><path d="M101 15V33H117" fill="#bdd7ea"/><path d="M60 43H104M60 55H104M60 67H87" stroke="#8ca9c2" stroke-width="4"/><circle cx="102" cy="87" r="22" fill="#efb575"/><path d="M102 73V88" stroke="#654522" stroke-width="4" stroke-linecap="round"/><circle cx="102" cy="98" r="2.5" fill="#654522"/>',
 'pension': '<path d="M55 20L64 38H99L111 20Z" fill="#e4ac52"/><path d="M64 38Q22 69 46 102Q83 123 119 101Q139 68 99 38Z" fill="#f3ce83"/><path d="M65 39H100" stroke="#775734" stroke-width="5"/>'+face+'<path d="M66 84L72 99L79 85L87 99L94 84" fill="none" stroke="#a97b36" stroke-width="3"/>'
}
for name, drawing in drawings.items():
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 125"><ellipse cx="80" cy="71" rx="65" ry="47" fill="{ "#ffe4a9" if name == "night" else "#e8f0df" if name == "break" else "#ffe1d9" }" opacity=".75"/><g stroke="#263b50" stroke-width="2.5" stroke-linejoin="round">{drawing}</g><path d="M124 12L131 3M137 24L149 20" stroke="#f1b94e" stroke-width="4" stroke-linecap="round"/></svg>'
    (assets / f'{name}.svg').write_text(svg, encoding='utf-8')
source = next(Path('C:/Users/504-10/Desktop').glob('*2026*.pdf'))
shutil.copyfile(source, root / 'public/calendar/source.pdf')
