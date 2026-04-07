import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PageTransition, { cardVariants } from '../components/PageTransition';
import LoadingSpinner from '../components/LoadingSpinner';
import { createContract, getContractReview } from '../api';
import { SECTION_COLORS as COLORS, SECTION_EMOJIS as EMOJIS, SECTION_LABELS as LABELS } from '../constants/domain';
const R = 40, C = 2 * Math.PI * R;

export default function Contracts() {
  const [tab, setTab] = useState('review');
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [goals, setGoals] = useState({ dsa: '', dev: '', semester: '' });
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const revRes = await getContractReview();
      setReview(revRes.data);
      setError('');
    } catch (e) { setError(e?.message || 'Unable to load contracts.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async () => {
    const p = { dsa: parseInt(goals.dsa)||0, dev: parseInt(goals.dev)||0, semester: parseInt(goals.semester)||0 };
    if (!p.dsa && !p.dev && !p.semester) return;
    setCreating(true);
    try {
      await createContract({ weekStart: new Date().toISOString(), goals: p });
      setGoals({ dsa: '', dev: '', semester: '' });
      setTab('review');
      await fetchData();
      setError('');
    } catch (e) { setError(e?.message || 'Unable to create contract.'); }
    finally { setCreating(false); }
  };

  if (loading) return <LoadingSpinner text="Loading contracts..." />;

  return (
    <PageTransition>
      <div className="page-container">
        <motion.div variants={cardVariants} className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2" style={{ color: '#f0f0ff' }}>Weekly Contract</h1>
            <p className="text-sm" style={{ color: '#555577' }}>Set goals. Track progress. Hold yourself accountable.</p>
          </div>
          <div className="flex gap-2">
            {['review','create'].map(t=>(
              <button key={t} onClick={()=>setTab(t)} className="px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-300 cursor-pointer"
                style={{ background: tab===t?'rgba(168,85,247,0.15)':'rgba(255,255,255,0.03)', border:`1px solid ${tab===t?'rgba(168,85,247,0.3)':'rgba(255,255,255,0.06)'}`, color: tab===t?'#a855f7':'#555577' }}>
                {t==='review'?'📊 Review':'✍️ New'}
              </button>
            ))}
          </div>
        </motion.div>
        {error ? <div className="glass-card p-3 mb-6 text-sm text-red-300">{error}</div> : null}

        <AnimatePresence mode="wait">
          {tab === 'review' && (
            <motion.div key="review" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-20}}>
              {!review ? (
                <div className="glass-card p-12 text-center">
                  <p className="text-4xl mb-4">📋</p>
                  <h3 className="text-lg font-semibold mb-2" style={{color:'#f0f0ff'}}>No Contract Yet</h3>
                  <p className="text-sm mb-6" style={{color:'#555577'}}>Create a weekly contract to start tracking</p>
                  <button onClick={()=>setTab('create')} className="btn-primary cursor-pointer">Create Contract</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {Object.keys(LABELS).map((sec,i)=>{
                    const pct=review.percentage?.[sec]||0, status=review.status?.[sec]||'pending', color=COLORS[sec];
                    return (
                      <motion.div key={sec} variants={cardVariants} className="glass-card-glow p-6 relative overflow-hidden" whileHover={{y:-4}}>
                        <div className="absolute top-4 right-4">
                          <span className="text-[9px] px-2 py-1 rounded-full font-bold tracking-wider uppercase"
                            style={{ background: status==='completed'?'rgba(16,185,129,0.15)':'rgba(245,158,11,0.15)', color: status==='completed'?'#10b981':'#f59e0b', border:`1px solid ${status==='completed'?'rgba(16,185,129,0.3)':'rgba(245,158,11,0.3)'}` }}>
                            {status}
                          </span>
                        </div>
                        <span className="text-3xl mb-3 block">{EMOJIS[sec]}</span>
                        <h3 className="text-lg font-bold mb-1" style={{color:'#f0f0ff'}}>{LABELS[sec]}</h3>
                        <p className="text-xs mb-6" style={{color:'#555577'}}>{review.progress?.[sec]||0} / {review.goals?.[sec]||0} min</p>
                        <div className="flex items-center justify-center mb-4">
                          <div className="relative w-24 h-24">
                            <svg width="96" height="96" viewBox="0 0 96 96">
                              <circle cx="48" cy="48" r={R} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="6"/>
                              <motion.circle cx="48" cy="48" r={R} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
                                strokeDasharray={C} initial={{strokeDashoffset:C}} animate={{strokeDashoffset:C*(1-pct/100)}}
                                transition={{duration:1.5,delay:i*0.2}} transform="rotate(-90 48 48)"/>
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-lg font-bold" style={{color}}>{pct}%</span>
                            </div>
                          </div>
                        </div>
                        <div className="progress-bar-track">
                          <motion.div className="progress-bar-fill" initial={{width:0}} animate={{width:`${pct}%`}}
                            transition={{duration:1.2,delay:0.3+i*0.15}} style={{background:`linear-gradient(90deg,${color},${color}80)`}}/>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {tab === 'create' && (
            <motion.div key="create" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-20}} className="max-w-lg mx-auto">
              <div className="glass-card-glow p-8 flex flex-col gap-6">
                <div className="text-center mb-4">
                  <p className="text-3xl mb-2">🎯</p>
                  <h3 className="text-lg font-bold" style={{color:'#f0f0ff'}}>New Weekly Contract</h3>
                  <p className="text-xs mt-1" style={{color:'#555577'}}>Set goals in minutes</p>
                </div>
                {Object.keys(LABELS).map(sec=>(
                  <div key={sec}>
                    <label className="text-xs font-semibold uppercase tracking-widest mb-2 flex items-center gap-2" style={{color:'#8888aa'}}>
                      {EMOJIS[sec]} {LABELS[sec]}
                    </label>
                    <input type="number" value={goals[sec]} onChange={e=>setGoals({...goals,[sec]:e.target.value})}
                      placeholder="e.g., 300" className="input-glass" min="0"/>
                  </div>
                ))}
                <motion.button onClick={handleCreate} className="btn-primary w-full py-4 mt-2"
                  disabled={creating} style={{opacity:creating?0.5:1,cursor:creating?'not-allowed':'pointer'}}
                  whileHover={{scale:1.02}} whileTap={{scale:0.98}}>
                  {creating ? 'Creating...' : '🔒 Lock In Contract'}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
}
