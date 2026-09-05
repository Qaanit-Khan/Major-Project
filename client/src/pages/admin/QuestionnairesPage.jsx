import { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import api from '../../api/client';
import {
  Plus, GripVertical, Trash2, ToggleLeft, ToggleRight,
  Upload, BookOpen, ChevronDown, ChevronUp, Send, X
} from 'lucide-react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import toast from 'react-hot-toast';

function SortableQuestion({ q, onToggle, onDelete, onUpdate }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: q.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const [expanded, setExpanded] = useState(false);
  const [newAnswer, setNewAnswer] = useState('');

  function addAnswer() {
    if (!newAnswer.trim()) return;
    onUpdate(q.id, { expected_answers: [...(q.expected_answers || []), newAnswer.trim()] });
    setNewAnswer('');
  }

  function removeAnswer(idx) {
    onUpdate(q.id, { expected_answers: q.expected_answers.filter((_, i) => i !== idx) });
  }

  return (
    <div ref={setNodeRef} style={{ ...style, marginBottom: 10 }}>
      <div className="card" style={{ padding: '14px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span {...attributes} {...listeners} style={{ cursor: 'grab', color: 'var(--color-text-tertiary)', flexShrink: 0 }}>
            <GripVertical size={16} strokeWidth={1.75} />
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-primary)', minWidth: 24 }}>#{q.order_index + 1}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, color: 'var(--color-text-primary)', fontWeight: 500 }}>{q.text}</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>
              {q.question_type?.replace('_', ' ')} · {q.expected_answers?.length || 0} expected answers
            </div>
          </div>
          <button onClick={() => setExpanded(v => !v)} className="btn-ghost" style={{ padding: '4px 8px' }}>
            {expanded ? <ChevronUp size={14} strokeWidth={1.75} /> : <ChevronDown size={14} strokeWidth={1.75} />}
          </button>
          <button onClick={() => onToggle(q.id)} className="btn-ghost" style={{ padding: '4px 8px' }}>
            {q.is_active ? <ToggleRight size={18} strokeWidth={1.75} color="var(--color-success)" /> : <ToggleLeft size={18} strokeWidth={1.75} color="var(--color-text-tertiary)" />}
          </button>
          <button onClick={() => onDelete(q.id)} className="btn-ghost" style={{ padding: '4px 8px' }}>
            <Trash2 size={14} strokeWidth={1.75} color="var(--color-danger)" />
          </button>
        </div>

        {expanded && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 8, fontWeight: 600 }}>
              Expected Answers (for AI reference only — not computed by this app)
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {(q.expected_answers || []).map((ans, idx) => (
                <span key={idx} className="chip" style={{ alignItems: 'center', gap: 6 }}>
                  {ans}
                  <button onClick={() => removeAnswer(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--color-primary)', lineHeight: 1 }}>
                    <X size={10} strokeWidth={1.75} />
                  </button>
                </span>
              ))}
              {(q.expected_answers || []).length === 0 && (
                <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>No expected answers yet</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input" style={{ flex: 1 }} placeholder="Add expected answer…"
                value={newAnswer} onChange={e => setNewAnswer(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addAnswer()} />
              <button className="btn-secondary" onClick={addAnswer} style={{ flexShrink: 0 }}>Add</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function QuestionnairesPage() {
  const [questionnaires, setQuestionnaires] = useState([]);
  const [selected, setSelected] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newQ, setNewQ] = useState({ text: '', question_type: 'open_ended', expected_answers: [] });
  const [importFile, setImportFile] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [campaignId, setCampaignId] = useState('');

  useEffect(() => {
    fetchQuestionnaires();
    api.get('/campaigns').then(r => setCampaigns(r.data)).catch(() => {});
  }, []);

  async function fetchQuestionnaires() {
    setLoading(true);
    try {
      const { data } = await api.get('/questionnaires');
      setQuestionnaires(data);
      if (data.length && !selected) {
        selectQ(data[0]);
      }
    } catch { toast.error('Failed to load questionnaires'); }
    finally { setLoading(false); }
  }

  function selectQ(q) {
    setSelected(q);
    setQuestions((q.questions || []).sort((a, b) => a.order_index - b.order_index));
  }

  async function createQ(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      const { data } = await api.post('/questionnaires', { name: newName, campaign_id: campaignId || null, questions: [] });
      setQuestionnaires(prev => [data, ...prev]);
      selectQ(data);
      setShowCreate(false);
      setNewName('');
      toast.success('Questionnaire created!');
    } catch { toast.error('Create failed'); }
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = questions.findIndex(q => q.id === active.id);
    const newIdx = questions.findIndex(q => q.id === over.id);
    const reordered = arrayMove(questions, oldIdx, newIdx).map((q, i) => ({ ...q, order_index: i }));
    setQuestions(reordered);
  }

  function updateQ(id, patch) {
    setQuestions(qs => qs.map(q => q.id === id ? { ...q, ...patch } : q));
  }

  function toggleQ(id) {
    setQuestions(qs => qs.map(q => q.id === id ? { ...q, is_active: !q.is_active } : q));
  }

  function deleteQ(id) {
    setQuestions(qs => qs.filter(q => q.id !== id));
  }

  function addQuestion() {
    if (!newQ.text.trim()) return;
    setQuestions(qs => [...qs, { id: `temp-${Date.now()}`, ...newQ, order_index: qs.length, is_active: true }]);
    setNewQ({ text: '', question_type: 'open_ended', expected_answers: [] });
  }

  async function save() {
    if (!selected) return;
    try {
      await api.put(`/questionnaires/${selected.id}`, {
        name: selected.name,
        questions: questions.map((q, i) => ({ ...q, order_index: i })),
      });
      toast.success('Questionnaire saved!');
      fetchQuestionnaires();
    } catch { toast.error('Save failed'); }
  }

  async function publish() {
    if (!selected) return;
    await save();
    try {
      await api.post(`/questionnaires/${selected.id}/publish`);
      toast.success('✅ Questionnaire published! AI model can now fetch it.');
      fetchQuestionnaires();
    } catch { toast.error('Publish failed'); }
  }

  async function importQuestions() {
    if (!importFile || !selected) return;
    const fd = new FormData();
    fd.append('file', importFile);
    try {
      const { data } = await api.post(`/questionnaires/${selected.id}/import-questions`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(`${data.imported} questions imported!`);
      fetchQuestionnaires();
      setImportFile(null);
    } catch { toast.error('Import failed'); }
  }

  return (
    <AdminLayout title="Questionnaires" subtitle="Build dynamic question sets for AI calling">
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20 }}>
        {/* Left: list */}
        <div>
          <button className="btn-primary" style={{ width: '100%', marginBottom: 12 }} onClick={() => setShowCreate(true)}>
            <Plus size={14} strokeWidth={1.75} /> New Questionnaire
          </button>

          {showCreate && (
            <div className="card" style={{ padding: 16, marginBottom: 12 }}>
              <form onSubmit={createQ} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input required className="input" placeholder="Questionnaire name" value={newName} onChange={e => setNewName(e.target.value)} />
                <select className="input" value={campaignId} onChange={e => setCampaignId(e.target.value)}>
                  <option value="">No campaign</option>
                  {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="submit" className="btn-primary" style={{ flex: 1, padding: '8px' }}>Create</button>
                  <button type="button" className="btn-ghost" onClick={() => setShowCreate(false)}>✕</button>
                </div>
              </form>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {questionnaires.map(q => (
              <div key={q.id} onClick={() => selectQ(q)}
                style={{
                  padding: '12px 16px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                  background: selected?.id === q.id ? 'var(--color-primary-light)' : 'var(--color-surface)',
                  border: `1px solid ${selected?.id === q.id ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  transition: 'all 0.15s ease',
                }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text-primary)' }}>{q.name}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 3 }}>
                  {q.questions?.length || 0} questions · v{q.version}
                  {q.is_active && <span style={{ color: 'var(--color-success)', marginLeft: 6 }}>● Published</span>}
                </div>
              </div>
            ))}
            {questionnaires.length === 0 && !loading && (
              <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', padding: '20px 0', textAlign: 'center' }}>No questionnaires yet</div>
            )}
          </div>
        </div>

        {/* Right: editor */}
        {selected ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div>
                <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontWeight: 700, fontSize: 18, color: 'var(--color-text-primary)' }}>{selected.name}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Drag to reorder · Toggle to enable/disable · Edit expected answers</div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                {/* Import CSV */}
                <label className="btn-ghost" style={{ cursor: 'pointer' }}>
                  <Upload size={14} strokeWidth={1.75} /> Import CSV
                  <input type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={e => { setImportFile(e.target.files[0]); }} />
                </label>
                {importFile && (
                  <button className="btn-secondary" onClick={importQuestions}>Import {importFile.name}</button>
                )}
                <button className="btn-secondary" onClick={save}><BookOpen size={14} strokeWidth={1.75} /> Save</button>
                <button className="btn-primary" onClick={publish}>
                  <Send size={14} strokeWidth={1.75} /> Publish
                </button>
              </div>
            </div>

            {/* Questions */}
            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={questions.map(q => q.id)} strategy={verticalListSortingStrategy}>
                {questions.map(q => (
                  <SortableQuestion
                    key={q.id} q={q}
                    onToggle={toggleQ}
                    onDelete={deleteQ}
                    onUpdate={updateQ}
                  />
                ))}
              </SortableContext>
            </DndContext>

            {questions.length === 0 && (
              <div className="empty-state card" style={{ padding: 48 }}><BookOpen size={36} strokeWidth={1.75} /><p style={{ fontWeight: 600 }}>No questions yet</p><p>Add questions below</p></div>
            )}

            {/* Add question form */}
            <div className="card" style={{ padding: 20, marginTop: 16 }}>
              <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontWeight: 700, fontSize: 14, color: 'var(--color-text-primary)', marginBottom: 14 }}>+ Add Question</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input className="input" placeholder="Question text…" value={newQ.text}
                  onChange={e => setNewQ(q => ({ ...q, text: e.target.value }))} />
                <div style={{ display: 'flex', gap: 12 }}>
                  <select className="input" value={newQ.question_type} onChange={e => setNewQ(q => ({ ...q, question_type: e.target.value }))}>
                    <option value="open_ended">Open-ended</option>
                    <option value="yes_no">Yes / No</option>
                    <option value="multiple_choice">Multiple Choice</option>
                  </select>
                  <button className="btn-primary" onClick={addQuestion} style={{ flexShrink: 0 }}>
                    <Plus size={14} strokeWidth={1.75} /> Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="empty-state card" style={{ padding: 60 }}>
            <BookOpen size={40} strokeWidth={1.75} />
            <p style={{ fontWeight: 600, marginTop: 12 }}>Select a questionnaire</p>
            <p>or create a new one to start building</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
