import React, { useEffect, useState } from 'react';
import { Package, Search, Wrench, ShieldAlert } from 'lucide-react';
import { apiService } from '../services/apiClient';
import { SparePart } from '../types';
import ProcurementLeadTimeBadge from '../components/ProcurementLeadTimeBadge';

const SparePlanning: React.FC = () => {
  const [spares, setSpares] = useState<SparePart[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterMode, setFilterMode] = useState<string>('all'); // all, low, critical

  useEffect(() => {
    const fetchSpares = async () => {
      try {
        setLoading(true);
        const data = await apiService.getSpares();
        setSpares(data);
      } catch (err) {
        console.error('Error fetching spares:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSpares();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column', gap: '16px' }}>
        <div className="loading-spinner" />
        <p style={{ color: 'var(--text-secondary)' }}>Loading Spare Parts Warehouse...</p>
      </div>
    );
  }

  // Filter spares
  const filteredSpares = spares.filter(part => {
    const matchesSearch = 
      part.part_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      part.part_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      part.compatible_equipment_types.toLowerCase().includes(searchQuery.toLowerCase());
      
    if (!matchesSearch) return false;
    
    if (filterMode === 'low') {
      return part.stock_quantity < part.minimum_required_stock && part.stock_quantity > 0;
    } else if (filterMode === 'critical') {
      return part.stock_quantity === 0;
    }
    return true; // 'all'
  });

  return (
    <div>
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="page-title">Spares Logistics & Planning</h1>
          <p className="page-subtitle">Warehouse inventory check, minimum required limits, supplier lead times, and compatibility lists.</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="glass-panel" style={{
        padding: '16px 24px',
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className={`btn ${filterMode === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            onClick={() => setFilterMode('all')}
          >
            All Inventory ({spares.length})
          </button>
          <button 
            className={`btn ${filterMode === 'low' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            onClick={() => setFilterMode('low')}
          >
            Low Stock ({spares.filter(s => s.stock_quantity < s.minimum_required_stock && s.stock_quantity > 0).length})
          </button>
          <button 
            className={`btn ${filterMode === 'critical' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            onClick={() => setFilterMode('critical')}
          >
            Out of Stock ({spares.filter(s => s.stock_quantity === 0).length})
          </button>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', width: '280px' }}>
          <span style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }}>
            <Search size={16} />
          </span>
          <input
            type="text"
            className="input"
            placeholder="Search parts or compatibility..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '36px', width: '100%' }}
          />
        </div>
      </div>

      {/* Spares Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
        {filteredSpares.length === 0 ? (
          <div className="glass-panel" style={{ gridColumn: '1 / -1', padding: '60px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <Package size={32} color="var(--text-muted)" style={{ marginBottom: '12px' }} />
            <h4>No Spares Matching Filters</h4>
          </div>
        ) : (
          filteredSpares.map(part => {
            const isOutOfStock = part.stock_quantity === 0;
            const isLowStock = part.stock_quantity < part.minimum_required_stock && !isOutOfStock;
            
            return (
              <div 
                key={part.part_id}
                className="glass-panel"
                style={{ 
                  padding: '24px',
                  border: isOutOfStock 
                    ? '1px solid var(--critical-border)' 
                    : isLowStock 
                      ? '1px solid var(--high-border)' 
                      : '1px solid var(--border)',
                  background: isOutOfStock 
                    ? 'var(--critical-bg)' 
                    : isLowStock 
                      ? 'var(--high-bg)' 
                      : 'var(--bg-card)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <h4 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                      {part.part_name}
                    </h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{part.part_id}</span>
                  </div>
                  
                  <span className={`badge ${
                    isOutOfStock ? 'badge-critical' : isLowStock ? 'badge-high' : 'badge-low'
                  }`} style={{ fontSize: '0.65rem' }}>
                    {part.status}
                  </span>
                </div>

                <div style={{ marginBottom: '16px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span>Compatible types:</span>
                    <strong style={{ color: 'var(--text-primary)', textAlign: 'right', maxWidth: '180px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {part.compatible_equipment_types}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span>Current Stock:</span>
                    <strong style={{ color: isOutOfStock ? 'var(--critical)' : isLowStock ? 'var(--high)' : 'var(--text-primary)' }}>
                      {part.stock_quantity}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span>Minimum Required:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{part.minimum_required_stock}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span>Supplier:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{part.supplier}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Unit Cost (INR):</span>
                    <strong style={{ color: 'var(--text-primary)' }}>₹{part.unit_cost_inr.toLocaleString()}</strong>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <ProcurementLeadTimeBadge days={part.procurement_lead_days} />
                  
                  {isOutOfStock && (
                    <span style={{ 
                      fontSize: '0.7rem', 
                      color: 'var(--critical)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '4px',
                      fontWeight: '600'
                    }}>
                      <ShieldAlert size={12} />
                      Order immediately
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default SparePlanning;
