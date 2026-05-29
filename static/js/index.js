const DATA_PATH = './data/cases.json';

const APP_STATE = {
  data: null,
  focusedCaseId: null,
  captionLang: 'en',
};

const FULL_DATASET_OVERVIEW = {
  total_tracks: 6255,
  splits: { train: 5004, valid: 625, test: 626 },
  emotion_count: 12,
  genre_count: 90,
  valence: { mean: 4.99, min: 1.0, max: 9.0 },
  arousal: { mean: 5.05, min: 1.0, max: 9.0 },
  audio_meta: {
    sample_rate_hz: 44100,
    channels: 2,
    format: 'wav',
  },
};

const EMOTION_STYLE = {
  'Beautiful': { bg: '#fff3bf', border: '#f59e0b', text: '#92400e', point: '#f59e0b' },
  'Joyful, cheerful': { bg: '#fee2e2', border: '#dc2626', text: '#991b1b', point: '#dc2626' },
  'Amusing': { bg: '#ffedd5', border: '#f97316', text: '#c2410c', point: '#f97316' },
  'Dreamy': { bg: '#fce7f3', border: '#ec4899', text: '#9d174d', point: '#ec4899' },
  'Triumphant, heroic': { bg: '#f8d7da', border: '#7f1d1d', text: '#7f1d1d', point: '#7f1d1d' },
  'Energizing, pump-up': { bg: '#ecfccb', border: '#84cc16', text: '#3f6212', point: '#84cc16' },
  'Calm, relaxing, serene': { bg: '#dcfce7', border: '#22c55e', text: '#166534', point: '#22c55e' },
  'Indignant, defiant': { bg: '#ede9fe', border: '#8b5cf6', text: '#5b21b6', point: '#8b5cf6' },
  'Anxious, tense': { bg: '#dbeafe', border: '#2563eb', text: '#1d4ed8', point: '#2563eb' },
  'Sad, depressing': { bg: '#cffafe', border: '#06b6d4', text: '#155e75', point: '#06b6d4' },
  'Scary, fearful': { bg: '#e5e7eb', border: '#4b5563', text: '#1f2937', point: '#4b5563' },
  'Annoying': { bg: '#f3f4f6', border: '#9ca3af', text: '#4b5563', point: '#9ca3af' },
};

const EMOTION_ZH = {
  'Beautiful': '美好',
  'Joyful, cheerful': '欢快',
  'Amusing': '有趣',
  'Dreamy': '梦幻',
  'Triumphant, heroic': '胜利感、英雄感',
  'Energizing, pump-up': '振奋、有能量',
  'Calm, relaxing, serene': '平静、放松、安宁',
  'Indignant, defiant': '愤慨、反抗',
  'Anxious, tense': '焦虑、紧张',
  'Sad, depressing': '悲伤、低落',
  'Scary, fearful': '恐怖、害怕',
  'Annoying': '烦躁',
};

const GENRE_ZH = {
  'Ambient': '氛围音乐',
  'Ambient Electronic': '氛围电子',
  'Americana': '美式民谣',
  'Big Band/Swing': '大乐队/摇摆乐',
  'Bigbeat': '大节拍电子',
  'Bluegrass': '蓝草',
  'Chill-out': '驰放',
  'Contemporary Classical': '当代古典',
  'Death-Metal': '死亡金属',
  'Downtempo': '慢拍电子',
  'Drone': '持续音氛围',
  'Funk': '放克',
  'Hardcore': '硬核',
  'House': '浩室',
  'Industrial': '工业音乐',
  'Krautrock': '德国实验摇滚',
  'Lounge': '休闲音乐',
  'Metal': '金属',
  'Minimalism': '极简主义',
  'New Age': '新世纪',
  'Noise-Rock': '噪音摇滚',
  'Nu-Jazz': '新爵士',
  'Post-Punk': '后朋克',
  'Post-Rock': '后摇滚',
  'Power-Pop': '强力流行',
  'Punk': '朋克',
  'Soundtrack': '影视配乐',
  'Symphony': '交响乐',
  'Thrash': '鞭挞金属',
  'Trip-Hop': '神游舞曲',
};

const INSTRUMENT_ZH = {
  'Accordion': '手风琴',
  'Acoustic guitar': '原声吉他',
  'Alto saxophone': '中音萨克斯',
  'Bass guitar': '贝斯吉他',
  'Bassoon': '巴松管',
  'Brass section': '铜管组',
  'Cello': '大提琴',
  'Clarinet': '单簧管',
  'Clavinet': '击弦古钢琴',
  'Double bass': '低音提琴',
  'Drum kit': '架子鼓',
  'Drum machine': '鼓机',
  'Electric guitar': '电吉他',
  'Flute': '长笛',
  'Glockenspiel': '钟琴',
  'Hammond organ': '哈蒙德风琴',
  'Harp': '竖琴',
  'Marimba': '马林巴',
  'Mandolin': '曼陀林',
  'Piano': '钢琴',
  'Sampler': '采样器',
  'String section': '弦乐组',
  'Synthesizer': '合成器',
  'Timpani': '定音鼓',
  'Trumpet': '小号',
  'Violin': '小提琴',
  'Wind chime': '风铃',
};

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatNumber(value, digits = 2) {
  return Number(value).toFixed(digits).replace(/\.00$/, '');
}

function cleanPrompt(text) {
  return String(text || '').replace(/\s+--[a-z].*$/i, '').trim();
}

function splitListField(value) {
  return String(value || '')
    .replace(/^\[|\]$/g, '')
    .split(',')
    .map(item => item.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean);
}

function localizeList(items, dictionary) {
  return items.map(item => dictionary[item] || item).join('、');
}

function keyToZh(key) {
  const normalized = String(key || '').trim();
  const modeMap = {
    Major: '大调',
    Minor: '小调',
    Dorian: '多利亚调式',
    Phrygian: '弗里吉亚调式',
    Lydian: '利底亚调式',
    Mixolydian: '混合利底亚调式',
  };
  return normalized.replace(/\b(Major|Minor|Dorian|Phrygian|Lydian|Mixolydian)\b/g, match => modeMap[match] || match);
}

function hasChineseText(text) {
  return /[\u3400-\u9fff]/.test(String(text || ''));
}

function buildChineseCaption(caseItem) {
  const genre = GENRE_ZH[caseItem.genre] || caseItem.genre || '音乐';
  const emotion = EMOTION_ZH[caseItem.emotion] || caseItem.emotion || '情绪';
  const leads = localizeList(splitListField(caseItem.lead_instruments), INSTRUMENT_ZH) || '主奏声部';
  const supports = localizeList(splitListField(caseItem.supporting_instruments), INSTRUMENT_ZH);
  const tempo = caseItem.tempo ? `${caseItem.tempo} BPM` : '稳定速度';
  const key = keyToZh(caseItem.key);
  const vocal = String(caseItem.vocal || '').toLowerCase() === 'yes' ? '包含人声' : '纯器乐';
  const supportClause = supports ? `，并由${supports}铺陈背景与节奏层次` : '';
  return `这是一段${vocal}的${genre}作品，情绪指向“${emotion}”，效价为 ${formatNumber(caseItem.valence, 1)}，唤醒度为 ${formatNumber(caseItem.arousal, 1)}。音乐以 ${leads} 作为主要声音线索${supportClause}。整体速度约为 ${tempo}，调性为 ${key || '未标注'}，围绕“${caseItem.theme || '主题'}”形成清晰的氛围和叙事感。`;
}

function getEmotionStyle(emotion) {
  return EMOTION_STYLE[emotion] || { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8', point: '#2563eb' };
}

function createMetricCard(label, value) {
  const div = document.createElement('div');
  div.className = 'metric-card';
  div.innerHTML = `
    <span class="metric-label">${escapeHtml(label)}</span>
    <span class="metric-value">${escapeHtml(value)}</span>
  `;
  return div;
}

function createSummaryTag(item, className = '') {
  const span = document.createElement('span');
  span.className = `summary-tag ${className}`.trim();
  span.textContent = `${item.name} (${item.count})`;
  return span;
}

function getCaptionForCase(caseItem) {
  if (APP_STATE.captionLang !== 'zh') return caseItem.caption_full;
  return hasChineseText(caseItem.caption_full_zh) ? caseItem.caption_full_zh : caseItem.caption_full;
}

function syncCaptionLanguageUI(caseItem) {
  const captionNode = document.querySelector('#active-case-card .text-copy');
  const labelNode = document.querySelector('#active-case-card .text-label');
  const langButtons = document.querySelectorAll('#active-case-card .lang-btn');
  if (captionNode) {
    captionNode.textContent = getCaptionForCase(caseItem);
  }
  if (labelNode) {
    labelNode.textContent = APP_STATE.captionLang === 'zh' ? '音乐描述' : 'Music caption';
  }
  langButtons.forEach(btn => {
    btn.classList.toggle('is-active', btn.dataset.lang === APP_STATE.captionLang);
  });
}

function renderStatistics(dataset, selectedSummary) {
  const datasetNode = document.getElementById('dataset-stats');
  const emotionBarsNode = document.getElementById('emotion-bars');
  const fullDataset = { ...dataset, ...FULL_DATASET_OVERVIEW };

  const fullMetrics = [
    ['Tracks', String(fullDataset.total_tracks)],
    ['Genres', String(fullDataset.genre_count)],
    ['Valence range', `${formatNumber(fullDataset.valence.min, 1)} - ${formatNumber(fullDataset.valence.max, 1)}`],
    ['Arousal range', `${formatNumber(fullDataset.arousal.min, 1)} - ${formatNumber(fullDataset.arousal.max, 1)}`],
    ['Valence mean', formatNumber(fullDataset.valence.mean, 2)],
    ['Arousal mean', formatNumber(fullDataset.arousal.mean, 2)],
    ['Sample rate', `${fullDataset.audio_meta.sample_rate_hz} Hz`],
    ['Channels', String(fullDataset.audio_meta.channels)],
  ];

  datasetNode.innerHTML = '';
  emotionBarsNode.innerHTML = '';

  fullMetrics.forEach(metric => datasetNode.appendChild(createMetricCard(...metric)));
  Object.keys(selectedSummary.emotion_distribution).forEach(name => {
    const style = getEmotionStyle(name);
    const tag = document.createElement('div');
    tag.className = 'emotion-tag';
    tag.style.setProperty('--emotion-bg', style.bg);
    tag.style.setProperty('--emotion-border', style.border);
    tag.style.setProperty('--emotion-text', style.text);
    tag.innerHTML = `<span>${escapeHtml(name)}</span>`;
    emotionBarsNode.appendChild(tag);
  });
}

function renderActiveCase(caseItem) {
  const wrap = document.getElementById('active-case-wrap');
  const node = document.getElementById('active-case-card');
  const style = getEmotionStyle(caseItem.emotion);
  const caption = getCaptionForCase(caseItem);
  wrap.classList.remove('is-hidden');
  node.innerHTML = `
    <audio class="audio-player active-audio-row" controls preload="metadata" src="${escapeHtml(caseItem.audio_file)}"></audio>
    <div class="case-content-row">
      <div class="case-media">
        <img class="case-image" src="${escapeHtml(caseItem.image_file)}" alt="${escapeHtml(caseItem.emotion)} case image">
      </div>
      <div class="case-body">
        <div class="emotion-meta-strip">
          <span class="meta-pill is-id">ID:${escapeHtml(caseItem.music_id)}</span>
          <span class="meta-pill">Valence: ${formatNumber(caseItem.valence, 1)} ｜ Arousal: ${formatNumber(caseItem.arousal, 1)}</span>
          <span class="meta-pill is-emotion" style="--emotion-bg:${style.bg};--emotion-border:${style.border};--emotion-text:${style.text};">${escapeHtml(caseItem.emotion)}</span>
        </div>
        <div class="text-block">
          <div class="caption-header">
            <p class="text-label">${APP_STATE.captionLang === 'zh' ? '音乐描述' : 'Music caption'}</p>
            <div class="lang-switch">
              <button class="lang-btn ${APP_STATE.captionLang === 'en' ? 'is-active' : ''}" data-lang="en" type="button">English</button>
              <button class="lang-btn ${APP_STATE.captionLang === 'zh' ? 'is-active' : ''}" data-lang="zh" type="button">中文</button>
            </div>
          </div>
          <p class="text-copy">${escapeHtml(caption)}</p>
        </div>
      </div>
    </div>
  `;
  node.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      APP_STATE.captionLang = btn.dataset.lang;
      syncCaptionLanguageUI(caseItem);
    });
  });
}

function focusCase(caseId) {
  APP_STATE.focusedCaseId = caseId;
  const caseItem = APP_STATE.data.cases.find(item => item.id === caseId);
  if (!caseItem) return;

  document.querySelectorAll('.scatter-point').forEach(node => {
    node.classList.toggle('is-focused', node.dataset.caseId === caseId);
  });

  document.querySelectorAll('.case-card').forEach(node => {
    node.classList.toggle('is-focused', node.dataset.caseId === caseId);
  });

  renderActiveCase(caseItem);
}

function renderScatter(cases) {
  const container = document.getElementById('va-scatter');
  const width = 760;
  const height = 560;
  const margin = { top: 32, right: 36, bottom: 52, left: 56 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const scaleX = value => margin.left + ((value - 1) / 8) * innerWidth;
  const scaleY = value => margin.top + innerHeight - ((value - 1) / 8) * innerHeight;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const hashText = text => String(text).split('').reduce((acc, char) => ((acc * 31) + char.charCodeAt(0)) >>> 0, 7);
  const jitterValue = (item, axis) => {
    const hash = hashText(`${item.id}-${axis}`);
    return ((hash % 1000) / 999 - 0.5) * 0.18;
  };

  let svg = `
    <svg class="va-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Valence arousal scatter plot">
      <rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff"></rect>
  `;

  for (let tick = 1; tick <= 9; tick += 1) {
    const x = scaleX(tick);
    const y = scaleY(tick);
    svg += `
      <line class="grid-line" x1="${x}" y1="${margin.top}" x2="${x}" y2="${margin.top + innerHeight}"></line>
      <line class="grid-line" x1="${margin.left}" y1="${y}" x2="${margin.left + innerWidth}" y2="${y}"></line>
      <text class="tick-label" x="${x}" y="${margin.top + innerHeight + 20}" text-anchor="middle">${tick}</text>
      <text class="tick-label" x="${margin.left - 10}" y="${y + 3}" text-anchor="end">${tick}</text>
    `;
  }

  svg += `
      <rect class="plot-border" x="${margin.left}" y="${margin.top}" width="${innerWidth}" height="${innerHeight}"></rect>
      <text class="axis-label" x="${margin.left + innerWidth / 2}" y="${height - 12}" text-anchor="middle">Valence</text>
      <text class="axis-label" transform="translate(18 ${margin.top + innerHeight / 2}) rotate(-90)" text-anchor="middle">Arousal</text>
  `;

  cases.forEach(item => {
    const x = scaleX(clamp(item.valence + jitterValue(item, 'x'), 1, 9));
    const y = scaleY(clamp(item.arousal + jitterValue(item, 'y'), 1, 9));
    svg += `
      <g class="scatter-point" data-case-id="${escapeHtml(item.id)}">
        <circle cx="${x}" cy="${y}" r="3.6"></circle>
      </g>
    `;
  });

  svg += '</svg>';
  container.innerHTML = svg;

  container.querySelectorAll('.scatter-point').forEach(point => {
    point.addEventListener('click', () => focusCase(point.dataset.caseId));
  });
}

function bindScrollTop() {
  const btn = document.getElementById('scroll-top-btn');
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  window.addEventListener('scroll', () => {
    btn.classList.toggle('is-visible', window.scrollY > 280);
  });
}

async function loadData() {
  const response = await fetch(DATA_PATH, { cache: 'no-cache' });
  if (!response.ok) {
    throw new Error(`Failed to load ${DATA_PATH}: ${response.status}`);
  }
  return response.json();
}

async function main() {
  bindScrollTop();
  const data = await loadData();
  APP_STATE.data = data;

  renderStatistics(data.dataset, data.selected_summary);
  renderScatter(data.cases);
}

main().catch(error => {
  console.error(error);
  document.body.innerHTML = `<main class="section"><div class="container"><div class="notification is-danger is-light">${escapeHtml(error.message || String(error))}</div></div></main>`;
});
