// src/pages/blueprints/BlueprintDesign.jsx
// Enhanced: Multi-view (Front/Side/Top/3D), drag-drop, axis indicators, Blender-style 3D
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Stage, Layer, Rect, Text, Transformer, Line, Arrow, Group } from 'react-konva';
import * as THREE from 'three';
import api from '../../services/api';
import toast from 'react-hot-toast';

const GRID_SIZE = 20;

const COMPONENT_TYPES = [
  { label: 'Upper Cabinet',  type: 'upper_cabinet', w: 120, h: 80,  d: 60,  fill: '#bfdbfe' },
  { label: 'Base Cabinet',   type: 'base_cabinet',  w: 120, h: 100, d: 80,  fill: '#bbf7d0' },
  { label: 'Drawer',         type: 'drawer',        w: 100, h: 40,  d: 60,  fill: '#fde68a' },
  { label: 'Door (Single)',  type: 'door_single',   w: 60,  h: 120, d: 5,   fill: '#ddd6fe' },
  { label: 'Door (Double)',  type: 'door_double',   w: 120, h: 120, d: 5,   fill: '#fbcfe8' },
  { label: 'Shelf',          type: 'shelf',         w: 120, h: 20,  d: 40,  fill: '#e9d5ff' },
  { label: 'Countertop',     type: 'countertop',    w: 200, h: 20,  d: 80,  fill: '#fed7aa' },
  { label: 'Hardware',       type: 'hardware',      w: 30,  h: 30,  d: 10,  fill: '#fca5a5' },
];

const VIEWS = [
  { key: 'front', label: 'Front View',  axis: 'X / Y' },
  { key: 'side',  label: 'Side View',   axis: 'Z / Y' },
  { key: 'top',   label: 'Top View',    axis: 'X / Z' },
  { key: '3d',    label: '3D View',     axis: '' },
];

function snap(v) { return Math.round(v / GRID_SIZE) * GRID_SIZE; }
function makeId() { return `c_${Date.now()}_${Math.random().toString(36).slice(2,6)}`; }

// ─── 2D Canvas ───────────────────────────────────────────────────────────────
function Canvas2D({ components, selectedId, setSelectedId, onUpdateComp, lockedFields, view, canvasW, canvasH, showGrid }) {
  const stageRef = useRef(null);
  const trRef    = useRef(null);

  useEffect(() => {
    if (!trRef.current || !stageRef.current) return;
    const node = selectedId ? stageRef.current.findOne(`#${selectedId}`) : null;
    trRef.current.nodes(node ? [node] : []);
    trRef.current.getLayer()?.batchDraw();
  }, [selectedId]);

  const project = (comp) => {
    const depth = comp.depth || 60;
    if (view === 'front') return { x: comp.x, y: comp.y, w: comp.width,  h: comp.height };
    if (view === 'side')  return { x: comp.x, y: comp.y, w: depth,       h: comp.height };
    if (view === 'top')   return { x: comp.x, y: comp.y, w: comp.width,  h: depth };
    return null;
  };

  const isLocked = (comp) => comp.locked || lockedFields.includes(comp.type) || lockedFields.includes('all');

  const gridLines = () => {
    if (!showGrid) return [];
    const lines = [];
    for (let x = 0; x <= canvasW; x += GRID_SIZE)
      lines.push(<Line key={`gx${x}`} points={[x,0,x,canvasH]} stroke="#e2e8f0" strokeWidth={0.5} listening={false}/>);
    for (let y = 0; y <= canvasH; y += GRID_SIZE)
      lines.push(<Line key={`gy${y}`} points={[0,y,canvasW,y]} stroke="#e2e8f0" strokeWidth={0.5} listening={false}/>);
    return lines;
  };

  const rulerMarks = () => {
    const marks = [];
    for (let x = GRID_SIZE*5; x <= canvasW; x += GRID_SIZE*5)
      marks.push(<Text key={`rx${x}`} x={x+2} y={3} text={`${x}`} fontSize={8} fill="#94a3b8" listening={false}/>);
    for (let y = GRID_SIZE*5; y <= canvasH; y += GRID_SIZE*5)
      marks.push(<Text key={`ry${y}`} x={3} y={y+2} text={`${y}`} fontSize={8} fill="#94a3b8" listening={false}/>);
    return marks;
  };

  const [xLabel, yLabel] = view === 'side' ? ['Z (Depth)', 'Y (Height)']
    : view === 'top' ? ['X (Width)', 'Z (Depth)']
    : ['X (Width)', 'Y (Height)'];

  return (
    <Stage ref={stageRef} width={canvasW} height={canvasH}
      onMouseDown={e => { if (e.target === e.target.getStage()) setSelectedId(null); }}>
      <Layer>
        {gridLines()}
        {rulerMarks()}
        {components.map(comp => {
          const p = project(comp);
          if (!p) return null;
          const locked = isLocked(comp);
          const sel    = selectedId === comp.id;
          return (
            <Group key={comp.id}>
              <Rect
                id={comp.id}
                x={p.x} y={p.y} width={p.w} height={p.h}
                fill={comp.fill}
                stroke={sel ? '#1e40af' : locked ? '#ef4444' : '#94a3b8'}
                strokeWidth={sel ? 2.5 : 1}
                draggable={!locked}
                shadowBlur={sel ? 8 : 0}
                shadowColor="#1e40af"
                opacity={locked ? 0.65 : 1}
                onClick={() => setSelectedId(comp.id)}
                onDragEnd={e => onUpdateComp(comp.id, { x: snap(e.target.x()), y: snap(e.target.y()) })}
                onTransformEnd={e => {
                  const n = e.target;
                  const updates = { x: snap(n.x()), y: snap(n.y()) };
                  const newW = Math.max(20, Math.round(n.width()  * n.scaleX()));
                  const newH = Math.max(20, Math.round(n.height() * n.scaleY()));
                  if (view === 'front') { updates.width = newW; updates.height = newH; }
                  if (view === 'side')  { updates.depth  = newW; updates.height = newH; }
                  if (view === 'top')   { updates.width  = newW; updates.depth  = newH; }
                  onUpdateComp(comp.id, updates);
                  n.scaleX(1); n.scaleY(1);
                }}
              />
              <Text x={p.x+4} y={p.y+4} text={comp.label} fontSize={10} fill="#1e293b" fontStyle="bold" listening={false}/>
              <Text x={p.x+4} y={p.y+p.h-14} text={`${p.w}×${p.h}`} fontSize={8} fill="#64748b" listening={false}/>
              {locked && <Text x={p.x+p.w-16} y={p.y+4} text="🔒" fontSize={10} listening={false}/>}
            </Group>
          );
        })}
        {/* Axis arrows */}
        <Arrow points={[20, canvasH-20, 70, canvasH-20]} stroke="#ef4444" strokeWidth={2} fill="#ef4444" pointerLength={8} pointerWidth={6} listening={false}/>
        <Text x={74} y={canvasH-26} text={xLabel} fontSize={10} fill="#ef4444" listening={false}/>
        <Arrow points={[20, canvasH-20, 20, canvasH-70]} stroke="#22c55e" strokeWidth={2} fill="#22c55e" pointerLength={8} pointerWidth={6} listening={false}/>
        <Text x={24} y={canvasH-82} text={yLabel} fontSize={10} fill="#22c55e" listening={false}/>
        <Transformer ref={trRef} rotateEnabled={false} keepRatio={false}
          boundBoxFunc={(_, newBox) => ({ ...newBox, width: Math.max(20, newBox.width), height: Math.max(20, newBox.height) })}/>
      </Layer>
    </Stage>
  );
}

// ─── 3D Viewer ───────────────────────────────────────────────────────────────
function ThreeDViewer({ components }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const w = mount.clientWidth || 800;
    const h = mount.clientHeight || 560;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.setClearColor(0x1a2332);
    mount.appendChild(renderer.domElement);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, w/h, 0.5, 3000);

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const sun = new THREE.DirectionalLight(0xfff0e0, 1.0);
    sun.position.set(300, 600, 300);
    sun.castShadow = true;
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xe0f0ff, 0.3);
    fill.position.set(-200, 200, -200);
    scene.add(fill);

    scene.add(new THREE.GridHelper(1000, 50, 0x334155, 0x1e293b));

    // World axes
    const axPts = (a, b) => new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...a), new THREE.Vector3(...b)]);
    scene.add(new THREE.Line(axPts([-500,0,0],[500,0,0]), new THREE.LineBasicMaterial({color:0xef4444})));
    scene.add(new THREE.Line(axPts([0,-200,0],[0,500,0]), new THREE.LineBasicMaterial({color:0x22c55e})));
    scene.add(new THREE.Line(axPts([0,0,-500],[0,0,500]), new THREE.LineBasicMaterial({color:0x3b82f6})));

    const group = new THREE.Group();
    scene.add(group);

    components.forEach(comp => {
      const depth = comp.depth || 60;
      const hex   = comp.fill.replace('#','');
      const color = new THREE.Color(parseInt(hex.slice(0,2),16)/255, parseInt(hex.slice(2,4),16)/255, parseInt(hex.slice(4,6),16)/255);
      const geo   = new THREE.BoxGeometry(comp.width, comp.height, depth);
      const mat   = new THREE.MeshPhongMaterial({ color, transparent:true, opacity:0.88, shininess:30 });
      const mesh  = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.position.set(comp.x - 450 + comp.width/2, -(comp.y - 300) + comp.height/2, depth/2);
      group.add(mesh);
      const edges = new THREE.EdgesGeometry(geo);
      const line  = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({color:0xffffff, transparent:true, opacity:0.2}));
      line.position.copy(mesh.position);
      group.add(line);
    });

    // Orbit state
    let spherical = { theta: 0.6, phi: 0.9, radius: 700 };
    let target    = new THREE.Vector3(0, 60, 0);
    let state     = { rotating: false, panning: false };
    let last      = { x: 0, y: 0 };

    const updateCam = () => {
      const { theta, phi, radius } = spherical;
      camera.position.set(
        target.x + radius * Math.sin(phi) * Math.sin(theta),
        target.y + radius * Math.cos(phi),
        target.z + radius * Math.sin(phi) * Math.cos(theta)
      );
      camera.lookAt(target);
    };
    updateCam();

    const onDown  = e => { if (e.button===0) state.rotating=true; if (e.button===2) state.panning=true; last.x=e.clientX; last.y=e.clientY; };
    const onUp    = () => { state.rotating=false; state.panning=false; };
    const onMove  = e => {
      const dx = e.clientX-last.x, dy = e.clientY-last.y;
      last.x=e.clientX; last.y=e.clientY;
      if (state.rotating) {
        spherical.theta -= dx*0.007;
        spherical.phi = Math.max(0.05, Math.min(Math.PI-0.05, spherical.phi + dy*0.007));
        updateCam();
      }
      if (state.panning) {
        const right = new THREE.Vector3().crossVectors(camera.getWorldDirection(new THREE.Vector3()), camera.up).normalize();
        target.addScaledVector(right, -dx*0.6);
        target.addScaledVector(camera.up, dy*0.6);
        updateCam();
      }
    };
    const onWheel = e => { spherical.radius = Math.max(80, Math.min(2000, spherical.radius + e.deltaY*0.6)); updateCam(); e.preventDefault(); };

    renderer.domElement.addEventListener('mousedown', onDown);
    renderer.domElement.addEventListener('wheel', onWheel, {passive:false});
    renderer.domElement.addEventListener('contextmenu', e => e.preventDefault());
    window.addEventListener('mouseup',   onUp);
    window.addEventListener('mousemove', onMove);

    let animId;
    const animate = () => { animId = requestAnimationFrame(animate); renderer.render(scene, camera); };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      renderer.domElement.removeEventListener('mousedown', onDown);
      renderer.domElement.removeEventListener('wheel', onWheel);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('mousemove', onMove);
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [components]);

  return (
    <div style={{ position:'relative', width:'100%', height:'100%' }}>
      <div ref={mountRef} style={{ width:'100%', height:'100%' }}/>
      <div style={{ position:'absolute', bottom:14, left:14, background:'rgba(0,0,0,.6)', borderRadius:8, padding:'7px 12px', fontSize:11, color:'#fff', lineHeight:1.9 }}>
        <div><span style={{color:'#ef4444',fontWeight:700}}>━</span> X axis — Width</div>
        <div><span style={{color:'#22c55e',fontWeight:700}}>━</span> Y axis — Height</div>
        <div><span style={{color:'#3b82f6',fontWeight:700}}>━</span> Z axis — Depth</div>
      </div>
      <div style={{ position:'absolute', bottom:14, right:14, background:'rgba(0,0,0,.6)', borderRadius:8, padding:'7px 12px', fontSize:11, color:'#94a3b8', lineHeight:1.9 }}>
        <div>Left drag — Rotate</div>
        <div>Right drag — Pan</div>
        <div>Scroll — Zoom</div>
      </div>
    </div>
  );
}

// ─── Main Export ─────────────────────────────────────────────────────────────
export default function BlueprintDesign() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const CANVAS_W = 900, CANVAS_H = 580;

  const [blueprint,    setBlueprint]    = useState(null);
  const [components,   setComponents]   = useState([]);
  const [selectedId,   setSelectedId]   = useState(null);
  const [showGrid,     setShowGrid]     = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [view,         setView]         = useState('front');
  const [lockedFields, setLockedFields] = useState([]);

  useEffect(() => {
    if (!id || id === 'new') return;
    api.get(`/blueprints/${id}`)
      .then(r => {
        setBlueprint(r.data);
        setLockedFields(JSON.parse(r.data.locked_fields || '[]'));
        const saved = JSON.parse(r.data.design_data || '{}');
        if (saved.components) setComponents(saved.components);
      })
      .catch(() => toast.error('Failed to load blueprint.'));
  }, [id]);

  const addComponent = (t) => setComponents(prev => [...prev, {
    id: makeId(), type: t.type, label: t.label,
    x: snap(60 + (prev.length % 6)*25), y: snap(60 + (prev.length % 5)*25),
    width: t.w, height: t.h, depth: t.d, fill: t.fill, locked: false,
  }]);

  const updateComp = useCallback((cid, attrs) =>
    setComponents(prev => prev.map(c => c.id === cid ? { ...c, ...attrs } : c)), []);

  const removeSelected = () => {
    const comp = components.find(c => c.id === selectedId);
    if (!comp) return;
    if (comp.locked || lockedFields.includes('all')) return toast.error('Component is locked.');
    setComponents(prev => prev.filter(c => c.id !== selectedId));
    setSelectedId(null);
  };

  const saveDesign = async () => {
    setSaving(true);
    try {
      await api.put(`/blueprints/${id}`, {
        design_data: JSON.stringify({ components, canvasSize: { w: CANVAS_W, h: CANVAS_H } }),
        change_note: 'Design updated via canvas editor.',
      });
      toast.success('Blueprint saved.');
    } catch { toast.error('Save failed. Check server connection.'); }
    finally { setSaving(false); }
  };

  const selectedComp = components.find(c => c.id === selectedId);
  const isLocked = (comp) => comp?.locked || lockedFields.includes(comp?.type) || lockedFields.includes('all');

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 64px)', background:'#0f172a' }}>

      {/* Toolbar */}
      <div style={{ background:'#1e2a38', padding:'8px 16px', display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', borderBottom:'2px solid #334155' }}>
        <button onClick={() => navigate('/blueprints')} style={S.toolBtn}>← Back</button>
        <span style={{ fontWeight:700, fontSize:15, color:'#e2e8f0' }}>{blueprint?.title || 'Blueprint Design'}</span>
        {blueprint && <span style={{ fontSize:11, background:'#2d4a6e', padding:'2px 10px', borderRadius:20, color:'#93c5fd' }}>Stage: {blueprint.stage}</span>}

        {/* View Switcher */}
        <div style={{ display:'flex', gap:3, marginLeft:16, background:'#0f172a', borderRadius:8, padding:3 }}>
          {VIEWS.map(v => (
            <button key={v.key} onClick={() => setView(v.key)} style={{
              ...S.toolBtn,
              background: view===v.key ? '#3b82f6' : 'transparent',
              fontWeight: view===v.key ? 700 : 400,
              padding:'4px 14px',
            }}>{v.label}</button>
          ))}
        </div>

        <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
          {view !== '3d' && <button onClick={() => setShowGrid(g=>!g)} style={S.toolBtn}>{showGrid?'⊞ Hide Grid':'⊞ Grid'}</button>}
          <button onClick={removeSelected} disabled={!selectedId||view==='3d'} style={{ ...S.toolBtn, background:'#7f1d1d', opacity:(!selectedId||view==='3d')?0.4:1 }}>🗑 Delete</button>
          <button onClick={saveDesign} disabled={saving} style={{ ...S.toolBtn, background:'#065f46' }}>{saving?'Saving…':'💾 Save'}</button>
          <button onClick={() => navigate(`/blueprints/${id}/estimation`)} style={{ ...S.toolBtn, background:'#4c1d95' }}>💰 Estimate</button>
        </div>
      </div>

      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>

        {/* Left: Component Palette */}
        {view !== '3d' && (
          <div style={{ width:180, background:'#1e293b', borderRight:'1px solid #334155', padding:10, overflowY:'auto', flexShrink:0 }}>
            <p style={S.panelLabel}>Add Component</p>
            {COMPONENT_TYPES.map(t => (
              <button key={t.type} onClick={() => addComponent(t)} style={S.paletteBtn}>
                <span style={{ width:12, height:12, background:t.fill, borderRadius:2, flexShrink:0 }}/>
                {t.label}
              </button>
            ))}
            {/* Properties */}
            {selectedComp && (
              <div style={{ marginTop:14, paddingTop:12, borderTop:'1px solid #334155' }}>
                <p style={S.panelLabel}>Properties</p>
                {[['Width','width'],['Height','height'],['Depth','depth']].map(([lbl,key]) => (
                  <div key={key} style={{ marginBottom:7 }}>
                    <label style={S.propLabel}>{lbl} (px)</label>
                    <input type="number" value={selectedComp[key]||0}
                      disabled={isLocked(selectedComp)}
                      onChange={e => updateComp(selectedComp.id, {[key]: parseInt(e.target.value)||0})}
                      style={S.propInput}/>
                  </div>
                ))}
                <label style={S.propLabel}>Label</label>
                <input value={selectedComp.label} onChange={e => updateComp(selectedComp.id, {label:e.target.value})} style={S.propInput}/>
                {isLocked(selectedComp) && <p style={{fontSize:10,color:'#ef4444',marginTop:6}}>🔒 Locked at this stage</p>}
              </div>
            )}
          </div>
        )}

        {/* Center: Canvas */}
        <div style={{ flex:1, overflow:'auto', display:'flex', flexDirection:'column' }}>
          <div style={{ padding:'5px 14px', background:'#1e293b', borderBottom:'1px solid #334155', display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ fontSize:12, fontWeight:700, color:'#93c5fd' }}>
              {VIEWS.find(v=>v.key===view)?.label}
            </span>
            <span style={{ fontSize:11, color:'#475569' }}>
              {view !== '3d' ? `Axes: ${VIEWS.find(v=>v.key===view)?.axis} · ${components.length} component${components.length!==1?'s':''}` : 'Left drag: Rotate · Right drag: Pan · Scroll: Zoom'}
            </span>
          </div>
          <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding: view==='3d'?0:20, overflow:'auto' }}>
            {view === '3d' ? (
              <div style={{width:'100%',height:'100%'}}><ThreeDViewer components={components}/></div>
            ) : (
              <div style={{ background:'#fff', boxShadow:'0 8px 40px rgba(0,0,0,.5)', display:'inline-block' }}>
                <Canvas2D
                  components={components} selectedId={selectedId} setSelectedId={setSelectedId}
                  onUpdateComp={updateComp} lockedFields={lockedFields}
                  view={view} canvasW={CANVAS_W} canvasH={CANVAS_H} showGrid={showGrid}
                />
              </div>
            )}
          </div>
        </div>

        {/* Right: Component list */}
        {view !== '3d' && (
          <div style={{ width:190, background:'#1e293b', borderLeft:'1px solid #334155', padding:10, overflowY:'auto', flexShrink:0 }}>
            <p style={S.panelLabel}>Objects ({components.length})</p>
            {components.length === 0 && <p style={{fontSize:11,color:'#475569',fontStyle:'italic'}}>No components yet.</p>}
            {[...components].reverse().map(comp => (
              <div key={comp.id} onClick={() => setSelectedId(comp.id)} style={{
                padding:'6px 8px', borderRadius:6, marginBottom:3, cursor:'pointer', fontSize:11,
                background: selectedId===comp.id ? '#1e3a8a' : '#0f172a',
                color: selectedId===comp.id ? '#fff' : '#94a3b8',
                border: `1px solid ${selectedId===comp.id ? '#3b82f6' : '#1e293b'}`,
                display:'flex', alignItems:'center', gap:6,
              }}>
                <span style={{width:10,height:10,background:comp.fill,borderRadius:2,flexShrink:0}}/>
                <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>{comp.label}</span>
                {isLocked(comp) && <span>🔒</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const S = {
  toolBtn:    { padding:'5px 12px', background:'#2d4a6e', color:'#fff', border:'none', borderRadius:6, cursor:'pointer', fontSize:12, fontWeight:500, whiteSpace:'nowrap' },
  paletteBtn: { width:'100%', textAlign:'left', padding:'7px 8px', border:'1px solid #1e293b', background:'#0f172a', borderRadius:5, cursor:'pointer', fontSize:11, marginBottom:3, color:'#cbd5e1', display:'flex', alignItems:'center', gap:7 },
  propInput:  { width:'100%', padding:'4px 7px', border:'1px solid #334155', borderRadius:4, fontSize:11, background:'#0f172a', color:'#e2e8f0', boxSizing:'border-box' },
  panelLabel: { fontSize:10, fontWeight:700, color:'#475569', textTransform:'uppercase', letterSpacing:1, margin:'0 0 8px' },
  propLabel:  { fontSize:10, color:'#64748b', display:'block', marginBottom:3 },
};
