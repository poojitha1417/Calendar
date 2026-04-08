import { useState, useEffect, useRef, useCallback } from "react";

// ── Helpers ──────────────────────────────────────────────────────────────────
const MONTHS = ["January","February","March","April","May","June",
                 "July","August","September","October","November","December"];
const DAYS   = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

const MONTH_PALETTES = [
  { bg:"#0d1b2a", accent:"#4fc3f7", img:"https://images.unsplash.com/photo-1516912481808-3406841bd33c?w=800&q=80", label:"Winter Peaks" },
  { bg:"#1a0a2e", accent:"#ce93d8", img:"https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?w=800&q=80", label:"Dusk Bloom" },
  { bg:"#0a2218", accent:"#81c784", img:"https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&q=80", label:"Forest Awake" },
  { bg:"#1a1200", accent:"#ffca28", img:"https://images.unsplash.com/photo-1462275646964-a0e3386b89fa?w=800&q=80", label:"Golden Hour" },
  { bg:"#001529", accent:"#4dd0e1", img:"https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=800&q=80", label:"Coastal Mist" },
  { bg:"#2a1200", accent:"#ff8a65", img:"https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=800&q=80", label:"Summer Burn" },
  { bg:"#0d2137", accent:"#80deea", img:"https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80", label:"Ocean Breath" },
  { bg:"#1a0d00", accent:"#ffb74d", img:"https://images.unsplash.com/photo-1476611317561-60117649dd94?w=800&q=80", label:"Amber Tide" },
  { bg:"#0a1a0a", accent:"#a5d6a7", img:"https://images.unsplash.com/photo-1466781783364-36c955e42a7f?w=800&q=80", label:"Harvest Fields" },
  { bg:"#1a0808", accent:"#ef9a9a", img:"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80", label:"Ember Fall" },
  { bg:"#050d1f", accent:"#90caf9", img:"https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&q=80", label:"Starfield" },
  { bg:"#0d0d0d", accent:"#b0bec5", img:"https://images.unsplash.com/photo-1418985991508-e47386d96a71?w=800&q=80", label:"Silent Snow" },
];

const HOLIDAYS = {
  "1-1":  "New Year's Day",  "2-14": "Valentine's Day",
  "3-17": "St. Patrick's",   "4-22": "Earth Day",
  "5-1":  "Labour Day",      "6-21": "Summer Solstice",
  "7-4":  "Independence",    "8-12": "World Elephant Day",
  "9-22": "Autumn Equinox",  "10-31":"Halloween",
  "11-11":"Remembrance Day", "12-25":"Christmas",
};

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfWeek(year, month) {
  let d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1; 
}
function isSameDay(a, b) {
  if (!a || !b) return false;
  const d1 = typeof a === "string" ? new Date(a) : a;
  const d2 = typeof b === "string" ? new Date(b) : b;
  return d1.getFullYear()===d2.getFullYear() &&
    d1.getMonth()===d2.getMonth() && d1.getDate()===d2.getDate();
}

function dateKey(d) { 
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  return `${MONTHS[dt.getMonth()]} ${dt.getDate()} ${dt.getFullYear()}`; 
}

// ── Spiral SVG ────────────────────────────────────────────────────────────────
function SpiralBinding({ accent }) {
  const rings = 14;
  return (
    <div style={{ display:"flex", justifyContent:"center", gap:"18px",
                  padding:"8px 0 0", zIndex:10, position:"relative" }}>
      {Array.from({length:rings}).map((_,i) => (
        <div key={i} style={{
          width:14, height:28,
          border:`2.5px solid ${accent}`,
          borderRadius:"50%",
          background:"transparent",
          boxShadow:`0 1px 6px ${accent}44`,
          position:"relative",
        }}>
          <div style={{
            position:"absolute", top:-4, left:"50%", transform:"translateX(-50%)",
            width:4, height:8, borderRadius:"2px",
            background: accent, opacity:0.7
          }}/>
        </div>
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function WallCalendar() {
  const now = new Date();
  
  // Core state
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [rangeStart, setRangeStart] = useState(null);
  const [rangeEnd,   setRangeEnd]   = useState(null);
  const [hoverDay,   setHoverDay]   = useState(null);
  
  const [noteText,   setNoteText]   = useState("");
  const [imgLoaded,  setImgLoaded]  = useState(false);
  const [flipping,   setFlipping]   = useState(false);
  const [flipDir,    setFlipDir]    = useState(1);
  const [isMobile,   setIsMobile]   = useState(false);
  
  // Storage state
  const [notes, setNotes] = useState(() => {
    try {
      const stored = localStorage.getItem("wallcalendar-notes");
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  const palette = MONTH_PALETTES[month];
  const { bg, accent, img } = palette;

  useEffect(() => {
    localStorage.setItem("wallcalendar-notes", JSON.stringify(notes));
  }, [notes]);

  // Responsive detection
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => { setImgLoaded(false); }, [month]);

  // Navigate months with flip animation
  const navigate = (dir) => {
    if (flipping) return;
    setFlipDir(dir);
    setFlipping(true);
    setTimeout(() => {
      setMonth(m => {
        const nm = m + dir;
        if (nm < 0) { setYear(y => y - 1); return 11; }
        if (nm > 11) { setYear(y => y + 1); return 0; }
        return nm;
      });
      setHoverDay(null);
      setFlipping(false);
    }, 320);
  };

  // Build calendar grid
  const totalDays = getDaysInMonth(year, month);
  const startOffset = getFirstDayOfWeek(year, month);
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  // Core Selection Logic
  const handleDayClick = (d) => {
    if (!d) return;
    const clicked = new Date(year, month, d);
    if (!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(clicked);
      setRangeEnd(null);
      
      const match = notes.find(n => isSameDay(n.startDate, clicked) && isSameDay(n.endDate, clicked));
      setNoteText(match ? match.text : "");
    } else {
      let s = rangeStart, e = clicked;
      if (clicked < rangeStart) { s = clicked; e = rangeStart; }
      setRangeStart(s);
      setRangeEnd(e);
      
      const match = notes.find(n => isSameDay(n.startDate, s) && isSameDay(n.endDate, e));
      setNoteText(match ? match.text : "");
    }
  };

  const getDayState = useCallback((d) => {
    if (!d) return { empty: true };
    const date = new Date(year, month, d);
    const isStart = isSameDay(date, rangeStart);
    const isEnd   = isSameDay(date, rangeEnd);
    const isSingleDayRange = isStart && !rangeEnd; 
    const isToday = isSameDay(date, now);
    
    const preview = rangeStart && !rangeEnd && hoverDay;
    const inPreview = preview && (
      (hoverDay >= d && d >= rangeStart.getDate() && month === rangeStart.getMonth()) ||
      (hoverDay <= d && d <= rangeStart.getDate() && month === rangeStart.getMonth())
    );
    const inRange = rangeStart && rangeEnd && date > rangeStart && date < rangeEnd;
    
    // Find if any note covers this date
    const notesForDay = notes.filter(n => {
      const ns = new Date(n.startDate);
      const ne = new Date(n.endDate);
      const current = date.getTime();
      return current >= ns.getTime() && current <= ne.getTime();
    }).map(n => n.text);

    return { isStart, isEnd, isSingleDayRange, isToday, inRange, inPreview, notesForDay };
  }, [year, month, rangeStart, rangeEnd, hoverDay, notes]);

  const saveNote = () => {
    if (!rangeStart || !noteText.trim()) return;
    const s = rangeStart;
    const e = rangeEnd || rangeStart;
    
    const filtered = notes.filter(n => !(isSameDay(n.startDate, s) && isSameDay(n.endDate, e)));
    setNotes([
      {
        id: Date.now().toString(),
        startDate: s.toISOString(),
        endDate: e.toISOString(),
        text: noteText.trim()
      },
      ...filtered
    ]);
  };

  // ── Styles ─────────────────────────────────────────────────────────────────
  const card = {
    background: bg,
    borderRadius: isMobile ? "16px" : "20px",
    overflow:"hidden",
    boxShadow:`0 30px 80px #00000088, 0 0 0 1px ${accent}22`,
    transition:"box-shadow 0.4s",
    transform: flipping
      ? `perspective(900px) rotateY(${flipDir * -8}deg) scale(0.97)`
      : "perspective(900px) rotateY(0deg) scale(1)",
    transformOrigin:"center center",
    transitionProperty:"transform, box-shadow",
    transitionDuration:"0.32s",
    transitionTimingFunction:"cubic-bezier(.4,0,.2,1)",
    width:"100%",
    maxWidth: isMobile ? "100%" : "860px",
    margin:"0 auto",
    fontFamily:"'DM Sans', 'Segoe UI', sans-serif",
  };

  const dayCell = (state, isWeekend) => {
    const { isStart, isEnd, isToday, inRange, inPreview, isSingleDayRange } = state;
    
    const isPillEdge = isStart || isEnd;
    const pillRadius = isSingleDayRange ? "8px" : isStart ? "8px 0 0 8px" : isEnd ? "0 8px 8px 0" : inRange ? "0" : "8px";
    const bgMap = isPillEdge ? accent : inRange ? `${accent}40` : inPreview ? `${accent}22` : "transparent";
    const colorMap = isPillEdge ? bg : isToday ? accent : isWeekend ? `${accent}cc` : "#e0e0e0";

    return {
      position:"relative",
      width: isMobile ? "36px" : "100%",
      height: isMobile ? "36px" : "42px",
      display:"flex", alignItems:"center", justifyContent:"center",
      borderRadius: pillRadius,
      background: bgMap,
      color: colorMap,
      fontWeight: isPillEdge || isToday ? "700" : "500",
      fontSize: isMobile ? "12px" : "13px",
      cursor:"pointer",
      transition:"all 0.1s ease",
      outline: isToday && !isPillEdge && !inRange ? `1.5px solid ${accent}` : "none",
      boxShadow: isToday && !isPillEdge ? `0 0 8px ${accent}66` : isPillEdge ? `0 4px 12px ${accent}66` : "none",
      letterSpacing:"0.02em",
      margin: (inRange || isPillEdge) && !isSingleDayRange ? "0" : "1px",
    };
  };

  const rangeLabel = rangeStart && rangeEnd
    ? `${MONTHS[rangeStart.getMonth()].slice(0,3)} ${rangeStart.getDate()} - ${MONTHS[rangeEnd.getMonth()].slice(0,3)} ${rangeEnd.getDate()}`
    : rangeStart ? `${MONTHS[rangeStart.getMonth()].slice(0,3)} ${rangeStart.getDate()}` : null;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;700&family=Playfair+Display:ital,wght@0,700;1,400&display=swap');
        body { margin:0; min-height:100vh;
          background: radial-gradient(ellipse at 60% 20%, #1a2a3a 0%, #0a0a0f 70%);
          display:flex; align-items:center; justify-content:center; padding:24px;
          box-sizing:border-box; }
        * { box-sizing:border-box; }
        textarea { resize:none; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:#ffffff22; border-radius:2px; }
        .note-btn { transition:all 0.2s; }
        .note-btn:hover { opacity:0.85; transform:translateY(-1px); }
        .nav-btn:hover { background: rgba(255,255,255,0.12) !important; }
        @keyframes fadeImg { from{opacity:0;transform:scale(1.04)} to{opacity:1;transform:scale(1)} }
        
        .day-cell-wrapper { position: relative; width:100%; height:100%; display:flex; justify-content:center; }
        .day-tooltip {
           visibility: hidden; opacity: 0;
           position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%) translateY(4px);
           background: #ffffff; color: #111; padding: 4px 8px; border-radius: 4px;
           font-size: 10px; font-weight: 600; white-space: nowrap; pointer-events: none;
           transition: all 0.2s; z-index: 20; box-shadow: 0 4px 12px rgba(0,0,0,0.5);
           max-width: 150px; overflow: hidden; text-overflow: ellipsis;
        }
        .day-cell-wrapper:hover .day-tooltip {
           visibility: visible; opacity: 1; transform: translateX(-50%) translateY(-4px);
        }
      `}</style>

      <div style={{ width:"100%", maxWidth:"900px", margin:"0 auto", padding: isMobile?"0":"16px" }}>
        <SpiralBinding accent={accent} />

        <div style={card}>
          <div style={{ position:"relative", height: isMobile?"180px":"260px", overflow:"hidden" }}>
            <img src={img} alt={palette.label} onLoad={() => setImgLoaded(true)}
                 style={{ width:"100%", height:"100%", objectFit:"cover",
                          animation: imgLoaded ? "fadeImg 0.6s ease" : "none",
                          opacity: imgLoaded ? 1 : 0, transition:"opacity 0.4s", display:"block" }}/>
            <div style={{ position:"absolute", inset:0, background:`linear-gradient(to bottom, transparent 30%, ${bg} 100%)` }}/>
            <svg style={{ position:"absolute", bottom:0, left:0, width:"100%", height:"80px" }} viewBox="0 0 860 80" preserveAspectRatio="none">
              <polygon points="0,80 0,50 260,0 860,60 860,80" fill={bg} opacity="0.95"/>
              <polygon points="0,80 0,60 200,20 520,55 860,30 860,80" fill={accent} opacity="0.18"/>
            </svg>
            <div style={{ position:"absolute", bottom:"14px", right:"24px", textAlign:"right", lineHeight:1.1 }}>
              <div style={{ color:`${accent}cc`, fontSize: isMobile?"11px":"13px", fontWeight:500, letterSpacing:"0.18em", textTransform:"uppercase" }}>{year}</div>
              <div style={{ color:"#fff", fontSize: isMobile?"28px":"42px", fontFamily:"'Playfair Display', serif", fontWeight:700, textShadow:`0 2px 20px ${accent}55` }}>{MONTHS[month]}</div>
            </div>
            
            {/* Auto jump to today logic button optional, but we can do a standard today jump in nav */}
            <button className="nav-btn" onClick={() => { setMonth(now.getMonth()); setYear(now.getFullYear()); setRangeStart(null); setRangeEnd(null); }}
               style={{ position:"absolute", bottom:"14px", left:"20px", background:"none", border:"none",
                        color:`${accent}88`, fontSize:"10px", letterSpacing:"0.12em", fontWeight:700,
                        textTransform:"uppercase", cursor:"pointer", padding:"4px 8px", borderRadius:"4px" }}>
              Jump to Today
            </button>

            <button className="nav-btn" onClick={() => navigate(-1)} style={{ position:"absolute", top:"12px", left:"12px", background:"rgba(0,0,0,0.35)", border:`1px solid ${accent}44`, borderRadius:"50%", width:36, height:36, cursor:"pointer", color:"#fff", fontSize:"16px", display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(4px)" }}>‹</button>
            <button className="nav-btn" onClick={() => navigate(1)} style={{ position:"absolute", top:"12px", right:"12px", background:"rgba(0,0,0,0.35)", border:`1px solid ${accent}44`, borderRadius:"50%", width:36, height:36, cursor:"pointer", color:"#fff", fontSize:"16px", display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(4px)" }}>›</button>
          </div>

          <div style={{ display:"flex", flexDirection: isMobile?"column":"row" }}>
            <div style={{ flex:1, padding: isMobile?"16px 12px":"28px 28px 28px 32px" }}>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", marginBottom:"8px" }}>
                {DAYS.map((d,i) => (
                  <div key={d} style={{ textAlign:"center", color: i>=5 ? accent : `${accent}66`, fontSize:"10px", fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", padding:"4px 0" }}>{d}</div>
                ))}
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:"0px", rowGap:"4px" }}>
                {cells.map((d, i) => {
                  const state = getDayState(d);
                  const weekPos = i % 7;
                  const isWeekend = weekPos >= 5;

                  return (
                    <div key={i} className="day-cell-wrapper">
                      <div
                        style={d ? dayCell(state, isWeekend) : { width: isMobile?"36px":"42px", height: isMobile?"36px":"42px" }}
                        onClick={() => handleDayClick(d)}
                        onMouseEnter={() => d && setHoverDay(d)}
                        onMouseLeave={() => setHoverDay(null)}
                      >
                        {d && <>
                          <span>{d}</span>
                          {/* Note Dot Indicator */}
                          {state.notesForDay.length > 0 && (
                            <span style={{ position:"absolute", bottom:4, left:"50%", transform:"translateX(-50%)", width:4, height:4, borderRadius:"50%", background: state.isStart||state.isEnd ? bg : accent, opacity:0.9 }}/>
                          )}
                        </>}
                      </div>
                      
                      {/* Note Tooltips showing on Hover */}
                      {d && state.notesForDay.length > 0 && !isMobile && (
                        <div className="day-tooltip">
                           {state.notesForDay[0]} {state.notesForDay.length > 1 && `(+${state.notesForDay.length-1})`}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              <div style={{marginTop: "16px", fontSize: "11px", color: `${accent}77`, textAlign: "center"}}>
                 <i>Select a range to log or view notes. Data syncs locally.</i>
              </div>
            </div>

            {!isMobile && <div style={{ width:"1px", background:`linear-gradient(to bottom, transparent, ${accent}33 20%, ${accent}33 80%, transparent)`, margin:"20px 0" }}/>}
            {isMobile && <div style={{ height:"1px", background:`linear-gradient(to right, transparent, ${accent}33 20%, ${accent}33 80%, transparent)`, margin:"0 20px" }}/>}

            <div style={{ width: isMobile?"100%":"280px", padding: isMobile?"16px":"24px 24px 28px", display:"flex", flexDirection:"column", gap:"12px" }}>
              <div style={{ color:`${accent}cc`, fontSize:"10px", fontWeight:700, letterSpacing:"0.18em", textTransform:"uppercase" }}>Details & Notes</div>
              
              {!rangeStart ? (
                <div style={{ flex: 1, display:"flex", alignItems:"center", justifyContent:"center", color:`${accent}55`, fontSize:"11px", lineHeight:1.5, textAlign:"center" }}>
                   Click on any date to manage notes. Hover over dates with dots to instantly preview memories.
                </div>
              ) : (
                <>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div style={{ color:accent, fontSize:"12px", fontWeight:700, letterSpacing:"0.06em", padding: "4px 8px", background: `${accent}22`, borderRadius: "6px" }}>
                      📅 {rangeLabel}
                    </div>
                    <button onClick={() => { setRangeStart(null); setRangeEnd(null); }} style={{ background:"none", border:"none", color:`${accent}88`, cursor:"pointer", fontSize:"18px", fontWeight:"300", lineHeight:1 }}>×</button>
                  </div>
                  
                  <textarea
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    placeholder={`Write your memory, task, or note for this date...`}
                    rows={isMobile ? 4 : 8}
                    style={{ background:"rgba(255,255,255,0.05)", border:`1px solid ${accent}44`, borderRadius:"10px", color:"#e0e0e0", fontSize:"13px", lineHeight:"1.7", padding:"12px", outline:"none", fontFamily:"'DM Sans', sans-serif", width:"100%", transition:"border-color 0.2s" }}
                    onFocus={e => e.target.style.borderColor=accent}
                    onBlur={e => e.target.style.borderColor=`${accent}44`}
                  />
                  <button className="note-btn" onClick={saveNote} style={{ background: accent, color: bg, border:"none", borderRadius:"10px", padding:"12px 0", fontWeight:700, fontSize:"12px", letterSpacing:"0.08em", cursor:"pointer", fontFamily:"'DM Sans', sans-serif", textTransform:"uppercase", boxShadow: `0 4px 14px ${accent}40` }}>
                    Save Note
                  </button>
                  
                  {/* Quick history for context */}
                  {notes.length > 0 && (
                     <div style={{ marginTop:"8px" }}>
                       <div style={{ color:`${accent}66`, fontSize:"9px", letterSpacing:"0.12em", marginBottom:"8px", textTransform:"uppercase", fontWeight:700 }}>Log History</div>
                       <div style={{ display:"flex", flexDirection:"column", gap:"6px", maxHeight:"120px", overflowY:"auto", paddingRight: "4px" }}>
                         {notes.map((n, i) => (
                           <div key={n.id} style={{ background:`${accent}11`, borderRadius:"6px", padding:"8px 10px", fontSize:"11px", color:`${accent}ee`, borderLeft:`3px solid ${accent}aa` }}>
                             <div style={{ color:`${accent}88`, fontSize:"9px", marginBottom:"3px", letterSpacing:"0.04em", fontWeight:700 }}>
                                {dateKey(n.startDate)} {n.startDate !== n.endDate && `→ ${dateKey(n.endDate)}`}
                             </div>
                             {n.text.length > 50 ? n.text.slice(0,50)+"…" : n.text}
                           </div>
                         ))}
                       </div>
                     </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
