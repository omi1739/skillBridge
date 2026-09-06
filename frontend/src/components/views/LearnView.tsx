'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { BookOpen, Search, ExternalLink, Youtube, FileText } from 'lucide-react';
import { TOPIC_RESOURCES, ResourceLink } from '@/lib/learning-resources';

function ResourceLinkRow({ res }: { res: ResourceLink }) {
  const Icon = res.kind === 'Video' ? Youtube : FileText;
  return (
    <a
      href={res.url}
      target="_blank"
      rel="noreferrer"
      className="learn-resource-link"
    >
      <Icon size={13} />
      <span style={{ flex: 1 }}>{res.name}</span>
      <span className="badge" style={{ fontSize: '0.62rem' }}>{res.source}</span>
      <ExternalLink size={11} style={{ opacity: 0.7 }} />
    </a>
  );
}

export default function LearnView() {
  const [query, setQuery] = useState('');

  const topics = TOPIC_RESOURCES.filter(topic =>
    query.trim() === '' ||
    topic.title.toLowerCase().includes(query.trim().toLowerCase()) ||
    topic.blurb.toLowerCase().includes(query.trim().toLowerCase()) ||
    topic.keywords.some(k => k.includes(query.trim().toLowerCase()))
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Learning Resources</h1>
          <p className="page-subtitle">
            Free, trusted materials — W3Schools, GeeksforGeeks, and famous copyright-free YouTube playlists — to strengthen the exact skills employers ask for.
          </p>
        </div>
      </div>

      <div style={{ position: 'relative', maxWidth: '480px' }}>
        <Search size={15} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          className="learn-search-input"
          placeholder="Search topics (e.g. SQL, Node.js, Docker)…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          aria-label="Search learning topics"
        />
      </div>

      <div className="grid-2">
        {topics.map(topic => (
          <div key={topic.key} id={topic.key} className="card learn-topic-card">
            <div className="learn-topic-head">
              <div className="learn-topic-icon"><BookOpen size={15} /></div>
              <div>
                <h3 className="learn-topic-title">{topic.title}</h3>
                <p className="learn-topic-blurb">{topic.blurb}</p>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.9rem' }}>
              {topic.resources.map((res, idx) => (
                <ResourceLinkRow key={idx} res={res} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {topics.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            No topics match “{query}”. Try one of the cards above, or check your skill gaps for personalized suggestions.
          </p>
        </div>
      )}

      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <BookOpen size={18} style={{ color: 'var(--accent-text)' }} />
        <div style={{ flex: 1, minWidth: '200px' }}>
          <strong style={{ fontSize: '0.9rem' }}>Personalized suggestions</strong>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
            Your skill gaps and assessment results link directly to resources for the exact topics you need to improve.
          </div>
        </div>
        <Link href="/gaps" className="btn btn-secondary" style={{ fontSize: '0.82rem', padding: '0.5rem 0.9rem' }}>
          View My Skill Gaps
        </Link>
      </div>
    </div>
  );
}