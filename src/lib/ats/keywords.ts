export const STOPWORDS = new Set(
  `a about above across after again against all also am an and any are as at be because been before being below between both but by can could did do does doing down during each either etc few for from further had has have having he her here hers him his how i if in into is it its itself just least less like make many may me might more most must my no nor not now of off on once only or other our ours out over own per please plus same she should so some such than that the their them then there these they this those through to too under until up upon us very via was we well were what when where which while who whom why will with within without would yet you your yours
  ability able job role team teams work working candidate candidates looking seeking join company opportunity opportunities responsibilities responsibility requirements required requirement preferred preference years year experience experiences strong excellent good great knowledge understanding skills skill including include includes new using use used across within ensure ensuring based related relevant equivalent degree plus etc key highly environment environments help provide providing day days time part full wide range various well-being benefits salary apply application position candidates' we're you'll you're our will be`.split(
    /\s+/,
  ),
);

/** Common multi-word and tech/business terms recognised as atomic keywords. */
export const KNOWN_TERMS = [
  'machine learning', 'deep learning', 'data science', 'data analysis', 'data analytics', 'data engineering', 'data visualization',
  'natural language processing', 'computer vision', 'project management', 'product management', 'program management',
  'stakeholder management', 'change management', 'risk management', 'supply chain', 'customer success', 'customer service',
  'business development', 'business analysis', 'financial modeling', 'financial analysis', 'digital marketing', 'content marketing',
  'social media', 'search engine optimization', 'user research', 'user experience', 'design systems', 'design system',
  'a/b testing', 'unit testing', 'test automation', 'continuous integration', 'continuous delivery', 'ci/cd', 'rest api', 'rest apis',
  'microservices', 'system design', 'distributed systems', 'cloud computing', 'agile', 'scrum', 'kanban', 'devops', 'mlops',
  'react', 'react native', 'next.js', 'angular', 'vue', 'svelte', 'node.js', 'express', 'nestjs', 'typescript', 'javascript',
  'python', 'java', 'kotlin', 'swift', 'golang', 'rust', 'c++', 'c#', '.net', 'php', 'ruby', 'rails', 'django', 'flask',
  'fastapi', 'spring boot', 'sql', 'nosql', 'postgresql', 'mysql', 'mongodb', 'redis', 'kafka', 'rabbitmq', 'elasticsearch',
  'graphql', 'aws', 'azure', 'gcp', 'google cloud', 'docker', 'kubernetes', 'terraform', 'ansible', 'jenkins', 'github actions',
  'linux', 'git', 'html', 'css', 'tailwind', 'sass', 'webpack', 'vite', 'jest', 'cypress', 'playwright', 'selenium',
  'tensorflow', 'pytorch', 'scikit-learn', 'pandas', 'numpy', 'spark', 'hadoop', 'airflow', 'snowflake', 'databricks', 'dbt',
  'tableau', 'power bi', 'looker', 'excel', 'figma', 'sketch', 'adobe xd', 'photoshop', 'illustrator', 'jira', 'confluence',
  'salesforce', 'hubspot', 'sap', 'oracle', 'llm', 'generative ai', 'prompt engineering', 'rag', 'openai', 'security', 'oauth',
  'leadership', 'mentoring', 'communication', 'collaboration', 'problem solving', 'negotiation', 'budgeting', 'forecasting',
  'roadmap', 'okrs', 'kpis', 'seo', 'sem', 'crm', 'erp', 'b2b', 'saas', 'fintech', 'e-commerce', 'accessibility', 'performance',
];

export const ACTION_VERBS = new Set(
  `accelerated achieved acquired adapted addressed administered advised advocated analyzed analysed architected arranged assembled assessed authored automated balanced boosted built calculated captured championed clarified coached collaborated combined communicated compiled completed composed conceived conceptualized conducted consolidated constructed consulted converted coordinated created cultivated customized cut debugged decreased defined delivered demonstrated deployed designed developed devised diagnosed directed discovered doubled drove earned eliminated enabled engineered enhanced established evaluated exceeded executed expanded expedited facilitated forecasted formulated founded generated grew guided halved headed identified implemented improved increased influenced initiated innovated inspired installed instituted integrated introduced invented launched led leveraged maintained managed marketed maximized measured mentored migrated minimized modernized monitored motivated negotiated optimized orchestrated organized originated overhauled oversaw partnered performed persuaded piloted pioneered planned prepared presented prioritized produced programmed promoted proposed prototyped published raised rebuilt recommended redesigned reduced refactored refined reengineered remodeled reorganized replaced researched resolved restructured revamped reviewed revitalized saved scaled secured shaped simplified slashed solved spearheaded standardized steered streamlined strengthened structured supervised surpassed synthesized tested trained transformed tripled troubleshot unified upgraded validated won wrote`.split(
    /\s+/,
  ),
);

export const WEAK_PHRASES = [
  'responsible for', 'worked on', 'helped with', 'helped to', 'assisted with', 'duties included', 'tasked with', 'involved in',
  'participated in', 'in charge of', 'familiar with', 'various tasks', 'etc.',
];

export const STANDARD_TITLES = [
  'summary', 'profile', 'professional summary', 'objective', 'about', 'about me', 'experience', 'work experience',
  'professional experience', 'employment', 'employment history', 'education', 'skills', 'technical skills', 'core skills',
  'key skills', 'projects', 'certifications', 'certificates', 'licenses', 'awards', 'honors', 'achievements', 'languages',
  'interests', 'hobbies', 'volunteering', 'volunteer', 'volunteer experience', 'publications',
];

const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Word-boundary match that also respects tokens like "c++", "c#", "node.js". */
export const containsTerm = (haystack: string, term: string): boolean =>
  new RegExp(`(^|[^a-z0-9+#])${escapeRegExp(term.toLowerCase())}(?=$|[^a-z0-9+#])`).test(haystack);

/** Extracts the most relevant keywords from a job description: known terms first, then frequent words. */
export const extractKeywords = (jd: string, limit = 30): string[] => {
  const text = jd.toLowerCase();
  const found = new Map<string, number>();
  for (const term of KNOWN_TERMS) {
    if (containsTerm(text, term)) found.set(term, 100);
  }
  const tokens = text.match(/[a-z][a-z0-9+#.\-/]{2,}/g) ?? [];
  const freq = new Map<string, number>();
  for (const raw of tokens) {
    const tok = raw.replace(/[.\-/]+$/, '');
    if (tok.length < 3 || STOPWORDS.has(tok) || /^\d/.test(tok)) continue;
    freq.set(tok, (freq.get(tok) ?? 0) + 1);
  }
  for (const [tok, count] of freq) {
    if (count < 2 || found.has(tok)) continue;
    if ([...found.keys()].some((k) => k.includes(tok))) continue;
    found.set(tok, count);
  }
  return [...found.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([k]) => k);
};
