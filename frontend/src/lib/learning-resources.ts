export interface ResourceLink {
  name: string;
  source: string;
  url: string;
  kind: 'Docs' | 'Video' | 'Practice';
}

export interface TopicResources {
  key: string;
  title: string;
  category: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  blurb: string;
  description: string;
  jobDemand: string;
  sectors: { name: string; detail: string }[];
  keywords: string[];
  resources: ResourceLink[];
}

export const TOPIC_CATEGORIES = [] as const;

export const TOPIC_RESOURCES: TopicResources[] = [];

export function resolveResources(text: string | null | undefined): TopicResources[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  return TOPIC_RESOURCES.filter(topic =>
    topic.keywords.some(keyword => lower.includes(keyword.trim()))
  );
}

export function findTopic(key: string): TopicResources | undefined {
  return TOPIC_RESOURCES.find(t => t.key === key);
}

export function getTopicsByCategory(): Record<string, TopicResources[]> {
  const grouped: Record<string, TopicResources[]> = {};
  for (const topic of TOPIC_RESOURCES) {
    if (!grouped[topic.category]) grouped[topic.category] = [];
    grouped[topic.category].push(topic);
  }
  return grouped;
}