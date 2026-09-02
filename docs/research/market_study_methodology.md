# Labor Market Intelligence Methodology & Legal Compliance

## 1. Legal Compliance & Data Integrity
SkillBridge adheres to ethical and transparent labor market data ingestion:
- **No Blind Scraping**: Ingests only via approved partner APIs, licensed data feeds, open public data sources, or explicit direct job submissions.
- **Privacy & PII Scrubbing**: Job contact details, recruiter personal information, and salary outlier anomalies are scrubbed during ingestion.
- **Traceability**: Raw job postings are hashed and stored with provenance metadata (`source_id`, `external_id`, `collected_at`, `license_terms`).

## 2. Skill Extraction & Normalization
1. **Tokenization & Entity Matching**: Job descriptions are analyzed against the canonical skill ontology dictionary (`docs/ontology/skills.json`).
2. **Alias Resolution**: Synonyms (e.g. `NodeJS`, `Node.js`, `Node`) map to a single stable UUID (`skill_nodejs`).
3. **Requirement Classification**: Skills are categorized as `required` vs. `preferred` based on syntactic context (e.g., "Must have 1+ year in PostgreSQL" vs. "Nice to have: Docker").

## 3. Demand Frequency Metric
The market demand frequency for a skill $s$ within role $r$ over snapshot period $T$ is computed as:

$$\text{Demand Rate}(s, r, T) = \frac{\text{Count of unique valid job postings mentioning } s}{\text{Total valid job postings for role } r \text{ in period } T}$$

Every reported percentage explicitly includes the underlying sample size $N$ to prevent misleading representation of small datasets.
