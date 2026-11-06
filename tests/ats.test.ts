import { describe, expect, it } from 'vitest';
import { scoreResume } from '../src/lib/ats/score';
import { containsTerm, extractKeywords } from '../src/lib/ats/keywords';
import { defaultLayout, emptyResume, sampleResume } from '../src/data/sections';

describe('ATS scoring', () => {
  it('rates the polished sample highly and an empty resume poorly', () => {
    const good = scoreResume(sampleResume(), defaultLayout('harvard'), { templateSafety: 98 });
    const empty = scoreResume(emptyResume(), defaultLayout('harvard'), { templateSafety: 98 });
    expect(good.score).toBeGreaterThan(70);
    expect(empty.score).toBeLessThan(45);
    expect(good.score).toBeLessThanOrEqual(100);
  });

  it('measures keyword coverage against a job description', () => {
    const jd = 'We need a React and TypeScript engineer with AWS, Kubernetes and Kafka experience. React performance and Kubernetes ops matter. Experience with Rust is a plus. Rust, Rust.';
    const r = scoreResume(sampleResume(), defaultLayout(), { jobDescription: jd });
    expect(r.keywords.fromJob).toBe(true);
    expect(r.keywords.matched).toEqual(expect.arrayContaining(['react', 'typescript', 'aws', 'kafka']));
    expect(r.keywords.missing).toContain('rust');
  });

  it('flags weak phrasing', () => {
    const data = sampleResume();
    data.experience[0].description = 'Responsible for the website\nWorked on various tasks\nHelped with testing';
    data.experience[1].description = 'I was involved in meetings';
    const impact = scoreResume(data, defaultLayout()).categories.find((c) => c.id === 'impact')!;
    expect(impact.checks.find((c) => c.id === 'weak')!.status).toBe('fail');
    expect(impact.checks.find((c) => c.id === 'pronouns')!.status).toBe('warn');
  });
});

describe('keyword helpers', () => {
  it('matches symbol-heavy terms on boundaries', () => {
    expect(containsTerm('skilled in c++ and node.js', 'c++')).toBe(true);
    expect(containsTerm('javascript developer', 'java')).toBe(false);
  });

  it('extracts known and frequent terms', () => {
    const kws = extractKeywords('Machine learning engineer. Machine learning pipelines with Python. Stakeholders love dashboards; dashboards drive decisions.');
    expect(kws).toEqual(expect.arrayContaining(['machine learning', 'python', 'dashboards']));
  });
});
