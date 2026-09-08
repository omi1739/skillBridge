'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  BookOpen, Search, ExternalLink, Youtube, FileText, Code2,
  Briefcase, Building2, ChevronRight, Target, Wrench
} from 'lucide-react';
import {
  TOPIC_RESOURCES, TOPIC_CATEGORIES, TopicResources, ResourceLink,
  getTopicsByCategory
} from '@/lib/learning-resources';

const DIFFICULTY_COLORS: Record<string, string> = {
  Beginner: 'badge-strength',
  Intermediate: 'badge-gap',
  Advanced: 'badge-critical'
};

function ResourceRow({ res }: { res: ResourceLink }) {
  const Icon = res.kind === 'Video' ? Youtube : res.kind === 'Practice' ? Code2 : FileText;
  return (
    <a href={res.url} target="_blank" rel="noreferrer" className="learn-resource-link">
      <Icon size={14} />
      <span style={{ flex: 1 }}>{res.name}</span>
      <span className="badge" style={{ fontSize: '0.6rem' }}>{res.source}</span>
      <ExternalLink size={11} style={{ opacity: 0.6, flexShrink: 0 }} />
    </a>
  );
}

function TopicDetail({ topic }: { topic: TopicResources }) {
  return (
    <article className="learn-detail">
      <div className="learn-detail-header">
        <h1 className="learn-detail-title">{topic.title}</h1>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span className={`badge ${DIFFICULTY_COLORS[topic.difficulty]}`}>{topic.difficulty}</span>
          <span className="badge badge-preferred">{topic.category}</span>
        </div>
      </div>

      <section className="learn-section">
        <h2>What is {topic.title}?</h2>
        <p>{topic.description}</p>
      </section>

      <section className="learn-section">
        <div className="learn-section-head">
          <Briefcase size={16} />
          <h2>Job Market Demand</h2>
        </div>
        <p className="learn-demand-text">{topic.jobDemand}</p>
      </section>

      <section className="learn-section">
        <div className="learn-section-head">
          <Building2 size={16} />
          <h2>Industries &amp; Sectors</h2>
        </div>
        <div className="learn-sectors-grid">
          {topic.sectors.map((sector, i) => (
            <div key={i} className="learn-sector-card">
              <div className="learn-sector-name">{sector.name}</div>
              <div className="learn-sector-detail">{sector.detail}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="learn-section">
        <div className="learn-section-head">
          <Target size={16} />
          <h2>Key Concepts</h2>
        </div>
        <div className="learn-keywords">
          {topic.keywords.filter(k => k.trim().length > 1).map((kw, i) => (
            <span key={i} className="badge">{kw.trim()}</span>
          ))}
        </div>
      </section>

      <section className="learn-section">
        <div className="learn-section-head">
          <Wrench size={16} />
          <h2>Learning Resources</h2>
        </div>
        <div className="learn-resources-grid">
          <div className="learn-resource-group">
            <h3 className="learn-resource-group-title">Documentation &amp; Tutorials</h3>
            <div className="learn-resource-list">
              {topic.resources.filter(r => r.kind === 'Docs').map((res, i) => (
                <ResourceRow key={i} res={res} />
              ))}
            </div>
          </div>
          <div className="learn-resource-group">
            <h3 className="learn-resource-group-title">Video Courses</h3>
            <div className="learn-resource-list">
              {topic.resources.filter(r => r.kind === 'Video').map((res, i) => (
                <ResourceRow key={i} res={res} />
              ))}
            </div>
          </div>
        </div>
      </section>
    </article>
  );
}

export default function LearnView() {
  const searchParams = useSearchParams();
  const [selectedKey, setSelectedKey] = useState<string>(() => {
    return searchParams.get('topic') || 'sql';
  });
  const [search, setSearch] = useState('');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const grouped = getTopicsByCategory();
  const selected = TOPIC_RESOURCES.find(t => t.key === selectedKey) || TOPIC_RESOURCES[0] || null;

  useEffect(() => {
    const topic = searchParams.get('topic');
    if (topic && topic !== selectedKey) {
      setSelectedKey(topic);
    }
  }, [searchParams]);

  const filteredCategories = TOPIC_CATEGORIES.map(cat => {
    const topics = grouped[cat] || [];
    if (!search.trim()) return { cat, topics };
    return {
      cat,
      topics: topics.filter(t =>
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.blurb.toLowerCase().includes(search.toLowerCase())
      )
    };
  }).filter(group => group.topics.length > 0);

  return (
    <div className="learn-layout">
      <aside className={`learn-sidebar ${mobileSidebarOpen ? 'open' : ''}`}>
        <div className="learn-sidebar-search">
          <Search size={14} />
          <input
            placeholder="Search topics…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Search topics"
          />
        </div>
        <nav className="learn-sidebar-nav">
          {filteredCategories.map(group => (
            <div key={group.cat} className="learn-sidebar-group">
              <div className="learn-sidebar-group-title">{group.cat}</div>
              {group.topics.map(topic => (
                <button
                  key={topic.key}
                  className={`learn-sidebar-item ${selectedKey === topic.key ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedKey(topic.key);
                    setMobileSidebarOpen(false);
                  }}
                >
                  <span>{topic.title}</span>
                  <span className={`badge ${DIFFICULTY_COLORS[topic.difficulty]}`} style={{ fontSize: '0.55rem', padding: '0.1rem 0.35rem' }}>
                    {topic.difficulty}
                  </span>
                </button>
              ))}
            </div>
          ))}
          {filteredCategories.length === 0 && (
            <div className="learn-sidebar-empty">No topics match "{search}"</div>
          )}
        </nav>
      </aside>

      <button
        className="learn-sidebar-toggle"
        onClick={() => setMobileSidebarOpen(v => !v)}
        aria-label="Toggle topic list"
      >
        Topics <ChevronRight size={14} />
      </button>

      <main className="learn-main">
        {selected ? <TopicDetail topic={selected} /> : (
          <div className="learn-detail">
            <div className="learn-sidebar-empty">
              No learning resources available yet.
            </div>
          </div>
        )}
      </main>
    </div>
  );
}