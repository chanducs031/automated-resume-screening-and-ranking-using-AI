const STOPWORDS = new Set(["the","a","an","and","or","but","in","on","at","to","for","of","with","by","from","is","are","was","were","be","been","have","has","had","do","does","will","would","could","should","may","might","that","this","these","those","i","you","he","she","it","we","they","my","your","his","her","its","our","their","me","him","us","them","what","which","who","when","where","why","how","all","both","each","few","more","most","other","some","such","no","not","only","same","so","than","too","just","as","if"]);

const SKILLS_LIST = ["python","java","javascript","typescript","react","angular","vue","node","express","django","flask","fastapi","spring","sql","mysql","postgresql","mongodb","redis","docker","kubernetes","aws","azure","gcp","terraform","ansible","git","linux","html","css","rest","graphql","machine learning","deep learning","tensorflow","pytorch","scikit-learn","pandas","numpy","spark","hadoop","kafka","elasticsearch","ci/cd","devops","agile","scrum","c++","c#","go","rust","swift","kotlin","r","matlab","tableau","power bi","nlp","computer vision","data analysis","statistics","excel","jira","jenkins","github","gitlab"];

function tokenize(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s+#.]/g, " ").split(/\s+/).filter(w => w.length > 1 && !STOPWORDS.has(w));
}

function buildTFIDF(docs) {
  const dfs = {};
  docs.forEach(d => { new Set(tokenize(d)).forEach(t => { dfs[t] = (dfs[t] || 0) + 1; }); });
  return docs.map(d => {
    const tokens = tokenize(d);
    const tf = {};
    tokens.forEach(t => { tf[t] = (tf[t] || 0) + 1; });
    const vec = {};
    Object.keys(tf).forEach(t => { vec[t] = (tf[t] / tokens.length) * (Math.log((docs.length + 1) / ((dfs[t] || 0) + 1)) + 1); });
    return vec;
  });
}

function cosineSim(a, b) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  let dot = 0, na = 0, nb = 0;
  keys.forEach(k => { dot += (a[k] || 0) * (b[k] || 0); na += (a[k] || 0) ** 2; nb += (b[k] || 0) ** 2; });
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

export function extractSkills(text) {
  return SKILLS_LIST.filter(s =>
    new RegExp(`\\b${s.replace(/[+#.]/g, m => `\\${m}`)}\\b`, "i").test(text.toLowerCase())
  );
}

// Detect if a resume belongs to a fresher or experienced candidate
export function detectExperience(resumeText) {
  const lower = resumeText.toLowerCase();
  const expPatterns = [
    /(\d+)\s*\+?\s*(?:years?|yrs?)\s*(?:of)?\s*(?:experience|exp|work)/i,
    /experience\s*:\s*(\d+)/i,
    /worked\s+(?:for|at)\s+/i,
    /(\d+)\s*\+?\s*(?:years?|yrs?)\s*(?:in|as|of)/i,
  ];
  const fresherPatterns = [
    /fresher/i, /fresh\s*graduate/i, /entry[\s-]*level/i,
    /no\s*(?:prior\s*)?experience/i, /seeking\s*(?:first|entry)/i,
    /recent\s*graduate/i, /0\s*(?:years?|yrs?)\s*experience/i,
  ];

  let yearsFound = 0;
  for (const pat of expPatterns) {
    const m = lower.match(pat);
    if (m && m[1]) { yearsFound = Math.max(yearsFound, parseInt(m[1], 10)); }
  }

  const isFresher = fresherPatterns.some(p => p.test(lower));
  const hasExperience = yearsFound >= 1;

  if (isFresher && !hasExperience) return "fresher";
  if (hasExperience) return "experienced";
  return "unknown";
}

export function scoreResume(resumeText, jdText, jdSkills, jobExperienceLevel) {
  const [jdVec, resVec] = buildTFIDF([jdText, resumeText]);
  const tfidfScore = cosineSim(jdVec, resVec);
  const resumeSkills = extractSkills(resumeText);
  const skillMatch = jdSkills.length > 0 ? resumeSkills.filter(s => jdSkills.includes(s)).length / jdSkills.length : 0;
  const expMatch = /(\d+)\s*(?:years?|yrs?)/.test(resumeText) ? 0.8 : 0.3;
  const eduMap = { "phd": 1, "m.tech": 0.9, "m.sc": 0.85, "mba": 0.8, "b.tech": 0.75, "be ": 0.75, "bca": 0.6, "fresh": 0.4 };
  let edu = 0.5;
  const lower = resumeText.toLowerCase();
  for (const [k, v] of Object.entries(eduMap)) { if (lower.includes(k)) { edu = v; break; } }

  let finalScore = Math.min(Math.round((0.4 * tfidfScore + 0.4 * skillMatch + 0.12 * expMatch + 0.08 * edu) * 100), 98);

  // Experience level mismatch check
  const expLevel = jobExperienceLevel || "any";
  const candidateExp = detectExperience(resumeText);
  let experience_mismatch = false;

  if (expLevel === "experienced" && (candidateExp === "fresher" || candidateExp === "unknown")) {
    experience_mismatch = true;
    finalScore = Math.min(finalScore, 15); // Cap score at 15% for freshers applying to experienced roles
  } else if (expLevel === "fresher" && candidateExp === "experienced") {
    experience_mismatch = true;
    finalScore = Math.min(finalScore, 25); // Experienced applying for fresher role — slight penalty
  }

  return {
    score: finalScore,
    tfidf_score: Math.round(tfidfScore * 100),
    skill_match: Math.round(skillMatch * 100),
    matched_skills: resumeSkills.filter(s => jdSkills.includes(s)),
    missing_skills: jdSkills.filter(s => !resumeSkills.includes(s)),
    experience_mismatch,
    candidate_experience: candidateExp,
    required_experience: expLevel,
  };
}
