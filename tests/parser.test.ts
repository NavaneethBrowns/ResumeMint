import { describe, expect, it } from 'vitest';
import { parseResumeText, detectHeading } from '../src/lib/parser/parseResume';
import { normalizeResumeData } from '../src/lib/parser/normalize';

const SAMPLE = `PRIYA SHARMA
Data Scientist
priya.sharma@gmail.com | +91 98200 12345 | Mumbai, India | linkedin.com/in/priyasharma

SUMMARY
Data scientist with 5 years of experience building machine learning models for retail and fintech, improving forecast accuracy by 22%.

WORK EXPERIENCE
Senior Data Scientist | Flipkart | Bengaluru
Jan 2022 - Present
• Built demand forecasting models in Python and Spark, reducing stockouts by 18%
• Led a team of 4 analysts delivering weekly insights to category heads

Data Analyst, Tata Consultancy Services
Jul 2019 – Dec 2021
- Automated reporting pipelines with Airflow, saving 30 hours per month

EDUCATION
B.Tech in Computer Science
IIT Bombay
2015 - 2019

SKILLS
Languages: Python, SQL, R
Tools: Spark, Airflow, Tableau

CERTIFICATIONS
AWS Certified Machine Learning – Amazon, 2023

LANGUAGES
English, Hindi, Marathi
`;

describe('parseResumeText', () => {
  const data = parseResumeText(SAMPLE);

  it('extracts contact details', () => {
    expect(data.personal.fullName).toBe('Priya Sharma');
    expect(data.personal.title).toBe('Data Scientist');
    expect(data.personal.email).toBe('priya.sharma@gmail.com');
    expect(data.personal.phone).toContain('98200');
    expect(data.personal.linkedin).toBe('linkedin.com/in/priyasharma');
    expect(data.personal.location).toBe('Mumbai, India');
  });

  it('extracts summary', () => {
    expect(data.summary).toMatch(/^Data scientist with 5 years/);
  });

  it('splits experience into entries with dates and bullets', () => {
    expect(data.experience).toHaveLength(2);
    const [first, second] = data.experience;
    expect(first.title).toBe('Senior Data Scientist');
    expect(first.organization).toBe('Flipkart');
    expect(first.location).toBe('Bengaluru');
    expect(first.startDate).toBe('Jan 2022');
    expect(first.current).toBe(true);
    expect(first.description.split('\n')).toHaveLength(2);
    expect(second.organization).toBe('Tata Consultancy Services');
    expect(second.endDate).toBe('Dec 2021');
  });

  it('parses education with degree as title', () => {
    expect(data.education[0].title).toMatch(/B\.Tech/);
    expect(data.education[0].organization).toBe('IIT Bombay');
    expect(data.education[0].startDate).toBe('2015');
    expect(data.education[0].endDate).toBe('2019');
  });

  it('parses skill groups and simple lists', () => {
    expect(data.skills.map((g) => g.name)).toEqual(['Languages', 'Tools']);
    expect(data.skills[0].skills).toBe('Python, SQL, R');
    expect(data.certifications[0].name).toMatch(/AWS Certified/);
    expect(data.languages.map((l) => l.name)).toEqual(['English', 'Hindi', 'Marathi']);
  });
});

describe('detectHeading', () => {
  it('recognises common variants', () => {
    expect(detectHeading('Professional Experience:')).toBe('experience');
    expect(detectHeading('TECHNICAL SKILLS')).toBe('skills');
    expect(detectHeading('Honors & Awards')).toBe('awards');
    expect(detectHeading('I gained experience in many things')).toBeNull();
  });

  it('tolerates qualifiers after the heading', () => {
    expect(detectHeading('PROFESSIONAL EXPERIENCE (4+ YEARS)')).toBe('experience');
    expect(detectHeading('Work Experience - 5 Years')).toBe('experience');
    expect(detectHeading('Education (Relevant)')).toBe('education');
  });
});

describe('experience with inline tech-stack labels', () => {
  const data = parseResumeText(`PROFESSIONAL EXPERIENCE (4+ YEARS)
Software Engineer | Apr 2025 - Present
Onward Technologies | Hyderabad
Redesigned the eRFQ procurement system by automating vendor validation and approval chains, cutting sourcing cycles by 25% and accelerating time-to-contract.
Technologies Used: Angular, Node.js, Express, TypeScript, Docker, Kubernetes
`);

  it('captures the role despite the "(4+ YEARS)" suffix', () => {
    expect(data.experience).toHaveLength(1);
    expect(data.experience[0].title).toBe('Software Engineer');
    expect(data.experience[0].organization).toBe('Onward Technologies');
    expect(data.experience[0].current).toBe(true);
  });

  it('keeps the "Technologies Used:" line inside the entry instead of a junk item', () => {
    expect(data.experience).toHaveLength(1);
    expect(data.experience[0].description).toMatch(/Technologies Used: Angular/);
  });
});

describe('experience with wrapped / fragmented bullet lines', () => {
  // Simulates PDF extraction that breaks single bullets across physical lines.
  const data = parseResumeText(`PROFESSIONAL EXPERIENCE
Software Engineer | Onward Technologies | Hyderabad
Apr 2025 - Present
Redesigned the eRFQ procurement system by automating vendor validation and approval
chains, cutting sourcing cycles by 25% and accelerating time-to-contract.
Operational Continuity: Engineered Kubernetes environments with multi-region Okta identity patterns, maintaining 99.5% uptime for mission-critical enterprise workflows.
Process Efficiency: Established automated SonarQube quality gates and AI error tracking, reducing deployment risk
by 90% and cutting developer onboarding time.
`);

  it('produces a single entry with the designation, organization and place', () => {
    expect(data.experience).toHaveLength(1);
    expect(data.experience[0].title).toBe('Software Engineer');
    expect(data.experience[0].organization).toBe('Onward Technologies');
    expect(data.experience[0].location).toBe('Hyderabad');
    expect(data.experience[0].current).toBe(true);
  });

  it('does not turn wrapped sentence fragments into separate roles', () => {
    const titles = data.experience.map((e) => e.title);
    expect(titles).not.toContain('chains, cutting sourcing cycles by 25% and accelerating time-to-contract.');
    // The wrapped fragment is stitched back into the first bullet.
    expect(data.experience[0].description).toMatch(/approval chains, cutting sourcing cycles/);
  });
});

describe('normalizeResumeData', () => {
  it('sanitises untrusted input', () => {
    const data = normalizeResumeData({
      personal: { fullName: 'A', photo: 'javascript:alert(1)' },
      experience: [{ title: 'Dev', company: 'X', endDate: 'Present', bullets: ['One', 'Two'] }],
      skills: [{ name: 'Core', skills: ['TS', 'Go'] }],
      interests: ['Chess'],
    });
    expect(data.personal.photo).toBe('');
    expect(data.experience[0]).toMatchObject({ organization: 'X', current: true, description: 'One\nTwo' });
    expect(data.skills[0].skills).toBe('TS, Go');
    expect(data.interests[0].name).toBe('Chess');
  });
});
