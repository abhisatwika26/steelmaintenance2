import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Cpu, Link, HelpCircle, FileText } from 'lucide-react';
import { apiService } from '../services/apiClient';
import { Equipment, ChatMessage, ChatCitation } from '../types';

const MaintenanceWizard: React.FC = () => {
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [selectedEqId, setSelectedEqId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', content: "Hello! I am the Intelligent Maintenance Wizard. I can help you troubleshoot asset anomalies, search safety guidelines, and verify spare parts stock. Select an equipment above to query with specific asset history context." }
  ]);
  const [inputText, setInputText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [citationsList, setCitationsList] = useState<Record<number, ChatCitation[]>>({});
  
  // Holds the full citation object so the modal can show the real retrieved snippet
  const [selectedCitation, setSelectedCitation] = useState<ChatCitation | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchEquipment = async () => {
      try {
        const data = await apiService.getEquipment();
        setEquipmentList(data);
      } catch (err) {
        console.error('Failed to load equipment list:', err);
      }
    };
    fetchEquipment();
  }, []);

  useEffect(() => {
    // Scroll chat to bottom on new messages
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || loading) return;

    const userMessageText = inputText;
    setInputText('');
    
    // Add user message to state
    const updatedHistory = [...messages, { role: 'user' as const, content: userMessageText }];
    setMessages(updatedHistory);
    setLoading(true);

    try {
      // API requires history without the first introduction greeting
      const historyForApi = updatedHistory.slice(1);
      
      const response = await apiService.postChatMessage(
        userMessageText,
        selectedEqId || null,
        historyForApi
      );

      // Add response
      setMessages(prev => [...prev, { role: 'model', content: response.response }]);
      
      // Store citations linked to this message index
      const nextMsgIndex = updatedHistory.length;
      if (response.citations && response.citations.length > 0) {
        setCitationsList(prev => ({
          ...prev,
          [nextMsgIndex]: response.citations
        }));
      }

    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => [...prev, { 
        role: 'model', 
        content: "I encountered an error trying to process your request. Please check your backend connection." 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel" style={{ height: '78vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      
      {/* Chat Header / Selector */}
      <div style={{ 
        padding: '16px 24px', 
        borderBottom: '1px solid var(--border)',
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        background: 'rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <MessageSquare size={20} color="var(--info)" />
          <div>
            <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>MRO Troubleshooting Wizard</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Contextual dialogue with safety SOP references.</p>
          </div>
        </div>

        {/* Equipment Context Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Cpu size={14} />
            Context:
          </span>
          <select 
            value={selectedEqId} 
            onChange={(e) => setSelectedEqId(e.target.value)}
            style={{
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '6px 12px',
              color: 'var(--text-primary)',
              fontSize: '0.82rem',
              outline: 'none'
            }}
          >
            <option value="">Global Plant Context</option>
            {equipmentList.map(eq => (
              <option key={eq.equipment_id} value={eq.equipment_id}>
                {eq.equipment_id} - {eq.equipment_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Messages Thread Area */}
      <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          const citations = citationsList[idx];
          
          return (
            <div 
              key={idx} 
              style={{ 
                display: 'flex', 
                justifyContent: isUser ? 'flex-end' : 'flex-start',
                width: '100%'
              }}
            >
              <div style={{ 
                maxWidth: '75%', 
                padding: '16px', 
                borderRadius: '12px',
                borderTopRightRadius: isUser ? '2px' : '12px',
                borderTopLeftRadius: isUser ? '12px' : '2px',
                background: isUser ? 'var(--info-bg)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${isUser ? 'var(--info-border)' : 'var(--border)'}`,
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
              }}>
                {/* Message text */}
                <p style={{ 
                  fontSize: '0.9rem', 
                  lineHeight: '1.5', 
                  color: 'var(--text-primary)',
                  whiteSpace: 'pre-line' 
                }}>
                  {msg.content}
                </p>

                {/* Citations Footer inside bubble */}
                {!isUser && citations && citations.length > 0 && (
                  <div style={{ 
                    marginTop: '16px', 
                    paddingTop: '12px', 
                    borderTop: '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Link size={12} />
                      References Cited:
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {citations.map((cit, cidx) => (
                        <button
                          key={cidx}
                          onClick={() => setSelectedCitation(cit)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 8px',
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid var(--border)',
                            borderRadius: '4px',
                            color: 'var(--info)',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            transition: 'var(--transition)'
                          }}
                          className="glass-panel-interactive"
                        >
                          <FileText size={10} />
                          {cit.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ 
              padding: '16px', 
              borderRadius: '12px', 
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div className="loading-spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Wizard is reading manuals...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form Footer */}
      <form 
        onSubmit={handleSend}
        style={{ 
          padding: '16px 24px', 
          borderTop: '1px solid var(--border)',
          display: 'flex',
          gap: '12px',
          background: 'rgba(0,0,0,0.15)'
        }}
      >
        <input
          type="text"
          className="input"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={selectedEqId ? `Ask about ${selectedEqId} (e.g., 'What parts does FM-002 need?', 'Check specs')...` : "Ask about plant equipment diagnostics, LOTO rules, or spares..."}
          style={{ flex: 1 }}
          disabled={loading}
        />
        <button 
          type="submit" 
          className="btn btn-primary"
          style={{ padding: '0 20px' }}
          disabled={loading || !inputText.trim()}
        >
          <Send size={16} />
        </button>
      </form>

      {/* Citation Viewer Modal */}
      {selectedCitation && (
        <div className="modal-overlay" onClick={() => setSelectedCitation(null)}>
          <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} color="var(--info)" />
              Citing Source: {selectedCitation.name}
            </h3>

            {selectedCitation.title && (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {selectedCitation.type} — {selectedCitation.title}
              </p>
            )}

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.55', fontStyle: 'italic', marginBottom: '24px', background: 'rgba(0,0,0,0.15)', padding: '16px', borderRadius: '6px' }}>
              {selectedCitation.snippet
                ? `"${selectedCitation.snippet}${selectedCitation.snippet.length >= 220 ? '…' : '"'}`
                : '"Document chunk retrieved from the local plant knowledge base. Verify LOTO and maintenance safety checks before acting on referenced procedures."'
              }
            </p>

            <div style={{ textAlign: 'right' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedCitation(null)}>
                Close Reference
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default MaintenanceWizard;
