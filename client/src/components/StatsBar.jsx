import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function StatsBar() {
  const [stats, setStats] = useState({ total_items: 0, total_racks: 0, zones: 0, categories: 0 });

  useEffect(() => {
    axios.get('/api/layout').then(r => {
      const s = r.data?.stats;
      if (s) {
        setStats({
          total_items: s.total_items ?? 0,
          total_racks: s.total_racks ?? 0,
          zones:       s.zones       ?? 4,
          categories:  s.categories  ?? 4,
        });
      }
    }).catch(() => {});
  }, []);

  const chips = [
    { value: stats.total_items,  label: 'Total Items' },
    { value: stats.total_racks,  label: 'Total Racks' },
    { value: stats.zones,        label: 'Zones'       },
    { value: stats.categories,   label: 'Categories'  },
  ];

  return (
    <div style={{ display: 'flex', gap: 20 }}>
      {chips.map(c => (
        <div key={c.label} className="stat-chip">
          <div className="stat-chip-value">{c.value.toLocaleString()}</div>
          <div className="stat-chip-label">{c.label}</div>
        </div>
      ))}
    </div>
  );
}
