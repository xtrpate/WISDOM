// src/pages/blueprints/BlueprintsPage.jsx – Blueprint Management (My, Imports, Gallery, Archive)
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';

const STAGE_COLORS = {
  design:     ['#e0f2fe','#075985'],
  estimation: ['#fef9c3','#854d0e'],
  approval:   ['#f3e8ff','#6b21a8'],
  production: ['#fed7aa','#9a3412'],
  delivery:   ['#dbeafe','#1e40af'],
  completed:  ['#d1fae5','#065f46'],
  archived:   ['#f1f5f9','#475569'],
};

const TABS = ['my', 'imports', 'gallery', 'archive'];

export default function BlueprintsPage() {
  const navigate    = useNavigate();
  const [tab,   setTab]   = useState('my');
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [importModal, setImportModal] = useState(false);
  const [importForm,  setImportForm]  = useState({ title:'', file: null });

  const load = useCallback(async () => {
    const { data } = await api.get('/blueprints', { params: { tab, search, limit: 20 } });
    setItems(data.rows); setTotal(data.total);
  }, [tab, search]);

  useEffect(() => { load(); }, [load]);

  const handleArchive = async (id) => {
    if (!window.confirm('Move this blueprint to archive?')) return;
    await api.delete(`/blueprints/${id}`);
    toast.success('Blueprint archived.'); load();
  };

  const handleRestore = async (id) => {
    await api.patch(`/blueprints/${id}/restore`);
    toast.success('Blueprint restored.'); load();
  };

  const handleImport = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('title', importForm.title);
    fd.append('source', 'imported');
    fd.append('file', importForm.file);
    await api.post('/blueprints', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    toast.success('Blueprint file imported.');
    setImportModal(false); load();
  };

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <h1 style={{ fontSize:22, fontWeight:700, color:'#1e2a38', margin:0 }}>Blueprint Management</h1>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => setImportModal(true)} style={btnGhost}>📂 Import File</button>
          <button onClick={() => navigate('/blueprints/new/design')} style={btnPrimary}>+ New Blueprint</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:16, borderBottom:'2px solid #e2e8f0' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding:'8px 20px', border:'none', background:'none', cursor:'pointer',
            fontWeight:600, fontSize:13, color: tab===t ? '#1e40af' : '#64748b',
            borderBottom: tab===t ? '2px solid #1e40af' : '2px solid transparent',
            marginBottom:-2, textTransform:'capitalize',
          }}>{t === 'my' ? 'My Blueprints' : t === 'imports' ? 'Device Imports' : t === 'gallery' ? 'Blueprint Gallery' : 'Archive'}</button>
        ))}
        <span style={{ marginLeft:'auto', fontSize:12, color:'#94a3b8', alignSelf:'center' }}>{total} items</span>
      </div>

      {/* Search */}
      <input placeholder="Search blueprints..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...inputSm, marginBottom:16, minWidth:300 }} />

      {/* Grid */}
      {items.length === 0 ? (
        <div style={{ background:'#fff', borderRadius:12, padding:60, textAlign:'center', color:'#94a3b8', boxShadow:'0 1px 6px rgba(0,0,0,.08)' }}>
          No blueprints found in this section.
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:16 }}>
          {items.map(bp => {
            const [stageBg, stageColor] = STAGE_COLORS[bp.stage] || ['#f1f5f9','#475569'];
            return (
              <div key={bp.id} style={{ background:'#fff', borderRadius:12, boxShadow:'0 1px 6px rgba(0,0,0,.08)', overflow:'hidden' }}>
                {/* Thumbnail */}
                <div style={{ height:140, background:'linear-gradient(135deg, #e0f2fe, #ddd6fe)', display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
                  {bp.thumbnail_url
                    ? <img src={bp.thumbnail_url} alt={bp.title} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                    : <span style={{ fontSize:48 }}>🗺️</span>
                  }
                  <span style={{ position:'absolute', top:8, right:8, background:stageBg, color:stageColor, padding:'2px 10px', borderRadius:12, fontSize:11, fontWeight:600 }}>
                    {bp.stage}
                  </span>
                  {bp.is_template && <span style={{ position:'absolute', top:8, left:8, background:'#fbbf24', color:'#78350f', padding:'2px 8px', borderRadius:12, fontSize:10, fontWeight:700 }}>TEMPLATE</span>}
                </div>

                <div style={{ padding:16 }}>
                  <h3 style={{ margin:'0 0 4px', fontSize:14, fontWeight:600, color:'#1e2a38' }}>{bp.title}</h3>
                  {bp.client_name && <p style={{ fontSize:11, color:'#64748b', margin:'0 0 4px' }}>Client: {bp.client_name}</p>}
                  <p style={{ fontSize:11, color:'#94a3b8', margin:'0 0 12px' }}>By {bp.creator_name} · {new Date(bp.updated_at).toLocaleDateString('en-PH')}</p>

                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    {tab !== 'archive' ? (
                      <>
                        <button onClick={() => navigate(`/blueprints/${bp.id}/design`)} style={btnEdit}>✏️ Design</button>
                        <button onClick={() => navigate(`/blueprints/${bp.id}/estimation`)} style={{ ...btnEdit, background:'#f3e8ff', color:'#6b21a8' }}>💰 Estimate</button>
                        <button onClick={() => handleArchive(bp.id)} style={{ ...btnEdit, background:'#f1f5f9', color:'#64748b' }}>🗑 Archive</button>
                      </>
                    ) : (
                      <button onClick={() => handleRestore(bp.id)} style={btnEdit}>↩ Restore</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Import Modal */}
      {importModal && (
        <div style={overlay}>
          <div style={modalBox}>
            <h3 style={{ margin:'0 0 20px' }}>Import Blueprint File</h3>
            <p style={{ fontSize:12, color:'#64748b', marginBottom:16 }}>Accepted formats: PDF, JPG, PNG. The file will be stored and can be used as a traceable background in the design tool.</p>
            <form onSubmit={handleImport}>
              <div style={{ marginBottom:12 }}>
                <label style={labelSm}>Blueprint Title *</label>
                <input required value={importForm.title} onChange={e => setImportForm(f=>({...f,title:e.target.value}))} style={inputFull} />
              </div>
              <div style={{ marginBottom:12 }}>
                <label style={labelSm}>File (PDF / JPG / PNG) *</label>
                <input type="file" required accept=".pdf,.jpg,.jpeg,.png" onChange={e => setImportForm(f=>({...f,file:e.target.files[0]}))} style={inputFull} />
              </div>
              <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
                <button type="button" onClick={() => setImportModal(false)} style={btnGhost}>Cancel</button>
                <button type="submit" style={btnPrimary}>Import</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const inputSm    = { padding:'7px 12px', border:'1px solid #d1d5db', borderRadius:6, fontSize:13 };
const inputFull  = { width:'100%', padding:'8px 12px', border:'1px solid #d1d5db', borderRadius:6, fontSize:13, boxSizing:'border-box' };
const labelSm    = { fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:4 };
const btnPrimary = { padding:'8px 18px', background:'#1e40af', color:'#fff', border:'none', borderRadius:6, cursor:'pointer', fontSize:13, fontWeight:600 };
const btnGhost   = { padding:'8px 18px', background:'#f1f5f9', color:'#374151', border:'none', borderRadius:6, cursor:'pointer', fontSize:13 };
const btnEdit    = { padding:'4px 12px', background:'#e0f2fe', color:'#0369a1', border:'none', borderRadius:6, cursor:'pointer', fontSize:12 };
const overlay    = { position:'fixed', inset:0, background:'rgba(0,0,0,.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 };
const modalBox   = { background:'#fff', borderRadius:12, padding:28, width:480, boxShadow:'0 20px 60px rgba(0,0,0,.3)' };
