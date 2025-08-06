// ▼ グローバル定義
const LS_KEY = 'paveAppAllSites_v5'; // 新バージョンに合わせて更新
const PRICE_KEY = 'paveAppPrices_v1';
let allSites = {};
let currentSite = '';
let nextFocus = null;
let prices = {};
const paveTypes = ["アスファルト", "コンクリート", "オーバーレイ"];
const worksList = [
  { id: "Works", label: "工種設定", always: true, panel: "panelWorks" },
  { id: "Earth", label: "土工", chk: "chkWorksEarth", setting: "worksEarthSetting", panel: "panelEarth" },
  { id: "Pave", label: "舗装工", always: true, panel: "panelPave" },
  { id: "Demo", label: "取り壊し工", chk: "chkWorksDemo", setting: "worksDemoSetting", panel: "panelDemo" },
  { id: "Anzen", label: "安全施設工", chk: "chkWorksAnzen", setting: "worksAnzenSetting", panel: null },
  { id: "Kari", label: "仮設工", chk: "chkWorksKari", setting: "worksKariSetting", panel: null },
  { id: "Zatsu", label: "雑工", chk: "chkWorksZatsu", panel: "panelZatsu" },
  { id: "Price", label: "単価設定", always: true, panel: "panelPrice" },
  { id: "Data", label: "データ管理・出力", always: true, panel: "panelData" },
  { id: "Disclaimer", label: "免責事項", always: true, panel: "panelDisclaimer"}
];

// ▼ タブUI生成＆切り替え
function renderTabs() {
  if(currentSite && allSites[currentSite]) saveWorksChk();
  const earthSame = document.getElementById('earthSamePave')?.checked;
  const demoSame = document.getElementById('demoSamePave')?.checked;
  let tabHtml = '';
  for(const w of worksList) {
    const chkEl = document.getElementById(w.chk);
    let show = w.always || (chkEl && chkEl.checked);
    if(w.id === 'Earth' && earthSame) show = false;
    if(w.id === 'Demo' && demoSame) show = false;
    if(show && w.panel) {
      tabHtml += `<div class="tab" id="tab${w.id}" onclick="showTab('${w.id}')">${w.label}</div>`;
    }
    if(w.setting) {
      const settingDiv = document.getElementById(w.setting);
      if(settingDiv)
        document.getElementById(w.chk).checked ? settingDiv.classList.remove('hidden') : settingDiv.classList.add('hidden');
    }
    if(w.panel && w.chk) {
      const panelEl = document.getElementById(w.panel);
      if(panelEl) panelEl.classList[show ? 'remove' : 'add']('hidden');    }
  }
  document.getElementById('tabsArea').innerHTML = tabHtml;
  const firstActive = worksList.find(w => {
    const el = document.getElementById(w.chk);
    const same = (w.id === 'Earth' && earthSame) || (w.id === 'Demo' && demoSame);
    return (w.always || (el && el.checked && !same)) && w.panel;
  });
  if(firstActive) showTab(firstActive.id);
  saveAndUpdate();
}
function showTab(tabId) {
  for(const w of worksList) {
    const tabEl = document.getElementById('tab'+w.id);
    if(tabEl) tabEl.classList.remove('active');
    if(w.panel) {
      const panelEl = document.getElementById(w.panel);
      if(panelEl) panelEl.classList.add('hidden');
    }
  }
  const activeTabEl = document.getElementById('tab'+tabId);
  if(activeTabEl) activeTabEl.classList.add('active');  worksList.forEach(w => {
    if(w.id === tabId && w.panel) {
      const panelEl = document.getElementById(w.panel);
      if(panelEl) panelEl.classList.remove('hidden');
    }  });
}

// ▼ データ保存・復元
function saveData() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(allSites)); } catch(e) {}
}
function loadData() {
  try {
    const dat = JSON.parse(localStorage.getItem(LS_KEY));
      if (dat && typeof dat === "object") {
        Object.values(dat).forEach(s => {
          if(!s.kari) s.kari = { traffic_b: 0, temp_signal: 0, machine_transport: 0 };
          if(!s.curb) s.curb = { use: false, std: 0, small: 0, hand: 0 };
          if(!s.works) s.works = { earth: false, demo: false, anzen: false, kari: false, zatsu: false };
          if(!s.zatsu) s.zatsu = [];
            if(!s.price) s.price = {};
          if(Array.isArray(s.zatsu)) {
            s.zatsu.forEach(z => { if(z.spec === undefined) z.spec = ''; });
          }
          if(!s.demoSetting) s.demoSetting = { same: true, type: 'As', thick: 0, cutting: 0 };
          else if(s.demoSetting.cutting === undefined) s.demoSetting.cutting = 0;
        });
        allSites = dat;
      // サイトリスト描画
      const siteList = Object.keys(allSites);
      if (siteList.length) {
        currentSite = siteList[0];
        let opt = '';
        for (const s of siteList) opt += `<option>${s}</option>`;
        document.getElementById('siteList').innerHTML = opt;
        document.getElementById('siteList').value = currentSite;
      }
    }
  } catch(e){}
}

function savePrices() {
  const data = {};
  document.querySelectorAll('input[data-price-work]').forEach(el => {
    data[el.dataset.priceWork] = parseFloat(el.value) || 0;
  });
  prices = data;
  try { localStorage.setItem(PRICE_KEY, JSON.stringify(prices)); } catch(e) {}
}

function loadPrices() {
  try {
    const dat = JSON.parse(localStorage.getItem(PRICE_KEY));
    if(dat && typeof dat === 'object') {
      prices = dat;
      Object.entries(prices).forEach(([work, val]) => {
        const el = document.querySelector(`input[data-price-work="${work}"]`);
        if(el) el.value = val;
      });
    }
  } catch(e) {}
}

// ▼ バックアップ・インポート
function backupData() {
  const blob = new Blob([JSON.stringify(allSites)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'pave_backup.json';
  a.click();
}
function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const dat = JSON.parse(ev.target.result);
      if (dat && typeof dat === 'object') {
        Object.values(dat).forEach(s => {
          if(Array.isArray(s.zatsu)) {
            s.zatsu.forEach(z => { if(z.spec === undefined) z.spec = ''; });
          }
            if(!s.price) s.price = {};
        });
        allSites = dat;
        const siteList = Object.keys(allSites);
        if (siteList.length) {
          currentSite = siteList[0];
          let opt = '';
          for (const s of siteList) opt += `<option>${s}</option>`;
          document.getElementById('siteList').innerHTML = opt;
          document.getElementById('siteList').value = currentSite;
        }
        renderAllAndSave();
      } else {
        alert('読み込み失敗');
      }
    } catch (err) {
      alert('読み込み失敗');
    }
    e.target.value = '';
  };
  reader.readAsText(file);
}
function renderAllAndSave() {
  const focus = nextFocus;
  renderAll();
  saveData();
  if(focus) {
    const selector = `[data-type="${focus.type}"][data-idx="${focus.idx}"][data-key="${focus.key}"]`;
    const el = document.querySelector(selector);
    if(el) {
      el.focus();
      if(el.setSelectionRange) {
        const len = el.value.length;
        el.setSelectionRange(len, len);
      }
    }
  }
}
function addSite() {
  const name = document.getElementById('siteName').value.trim();
  if (!name || allSites[name]) return;
  saveAndUpdate();
  allSites[name] = {
    pave: [],
    earth: [],
    demo: [],
    anzen: { line_outer: 0, line_stop: 0, line_symbol: 0 },
    kari: { traffic_b: 0, temp_signal: 0, machine_transport: 0 },
    zatsu: [],
      price: {},
    curb: { use: false, std: 0, small: 0, hand: 0 },
    works: { earth: false, demo: false, anzen: false, kari: false, zatsu: false },
    earthSetting: { same: true, type: '標準掘削', thick: 0 },
    demoSetting: { same: true, type: 'As', thick: 0, cutting: 0 }
  };
  document.getElementById('siteList').innerHTML += `<option>${name}</option>`;
  document.getElementById('siteList').value = name;
  currentSite = name;
  renderEarthSetting();
  renderDemoSetting();
  renderWorksChk();
  renderTabs();
  renderAllAndSave();
}
function renameSite() {
  const newName = document.getElementById('siteName').value.trim();
  if (!currentSite || !newName || newName === currentSite || allSites[newName]) return;
  saveAndUpdate(false);
  allSites[newName] = allSites[currentSite];
  delete allSites[currentSite];
  currentSite = newName;
  let opt = '';
  for (const s of Object.keys(allSites)) opt += `<option>${s}</option>`;
  document.getElementById('siteList').innerHTML = opt;
  document.getElementById('siteList').value = currentSite;
  renderEarthSetting();
  renderDemoSetting();
  renderWorksChk();
  renderTabs();
  renderAllAndSave();
}
function switchSite() {
  saveAndUpdate();
  currentSite = document.getElementById('siteList').value;
  renderEarthSetting();
  renderDemoSetting();
  renderWorksChk();
  renderTabs();
  renderAllAndSave();
}

// ▼ 各工種設定値を工種設定タブから取得
function getEarthSetting() {
  return {
    same: document.getElementById('earthSamePave').checked,
    type: document.getElementById('earthType').value,
    thick: parseFloat(document.getElementById('earthThick').value)||0
  };
}
function getDemoSetting() {
  return {
    same: document.getElementById('demoSamePave').checked,
    type: document.getElementById('demoType').value,
    thick: parseFloat(document.getElementById('demoThick').value)||0,
    cutting: parseFloat(document.getElementById('demoCutting').value)||0  };
}

// ▼ 舗装工タブ
function addRow(type) {
  if (!currentSite) return;
  if(type === 'pave') {
    allSites[currentSite].pave.push({
      種別:"アスファルト", 測点:'', 単距:'', 追距:'', 幅員:'', 平均幅員:'', 面積:''
    });
   } else if (type === 'earth' || type === 'demo') {
    allSites[currentSite][type].push({測点:'', 単距:'', 追距:'', 幅員:'', 面積:''});
  } else if (type === 'zatsu') {
    allSites[currentSite].zatsu.push({ name:'', spec:'', unit:'', qty:'' });
  }
  renderAllAndSave();
}
function editRow(type, idx, key, val, update = false) {
  if (type === "pave" && key === "種別") {
    for (let i = idx; i < allSites[currentSite][type].length; i++) {
      allSites[currentSite][type][i][key] = val;
    }
  } else {
    allSites[currentSite][type][idx][key] = val;
  }
  // 入力中は再描画しない！
  if (update) renderAllAndSave();
}
function editAnzen(key, val, update = false) {  if (!currentSite) return;
  if (!allSites[currentSite].anzen) {
    allSites[currentSite].anzen = { line_outer: 0, line_stop: 0, line_symbol: 0 };
  }
  allSites[currentSite].anzen[key] = parseFloat(val) || 0;
  if(update) renderAllAndSave();
}
function editKari(key, val, update = false) {
  if (!currentSite) return;
  if (!allSites[currentSite].kari) {
    allSites[currentSite].kari = { traffic_b: 0, temp_signal: 0, machine_transport: 0 };
  }
  allSites[currentSite].kari[key] = parseFloat(val) || 0;
  if(update) renderAllAndSave();
}
function editPrice(key, val, update = false) {
  if(!currentSite) return;
    if(!allSites[currentSite].price) {
      allSites[currentSite].price = {};
    }
  allSites[currentSite].price[key] = parseFloat(val) || 0;
  if(update) {
    renderAllAndSave();
    renderPriceTotal();
  }
}
function toggleCurbInputs() {
  if(!currentSite) return;
  const use = document.getElementById('chkCurbUse').checked;
  const area = document.getElementById('curbInputs');
  if(use) area.classList.remove('hidden');
  else area.classList.add('hidden');
  if(!allSites[currentSite].curb) {
    allSites[currentSite].curb = { use: false, std: 0, small: 0, hand: 0 };
  }
  allSites[currentSite].curb.use = use;
  renderAllAndSave();
}
function editCurb(key, val, update = false) {
  if(!currentSite) return;
  if(!allSites[currentSite].curb) {
    allSites[currentSite].curb = { use: false, std: 0, small: 0, hand: 0 };
  }
  allSites[currentSite].curb[key] = parseFloat(val) || 0;
  if(update) renderAllAndSave();
}
function renderTablePave() {
  if(!currentSite) return;
  const list = allSites[currentSite].pave;
  let widthSum = 0, cnt = 0;
  list.forEach(r => {
    const w = parseFloat(r.幅員);
    if (!isNaN(w)) {
      widthSum += w;
      cnt++;
    }
  });
  let avgW = cnt ? widthSum / cnt : 0;
  let label = "";
  if (avgW < 1.4) label = "1.4未満";
  else if (avgW < 3.0) label = "1.4以上";
  else label = "3.0以上";
  for(let i=0;i<list.length;i++) {
    let r = list[i];
    r.追距 = (i===0) ? (parseFloat(r.単距)||0)
      : ((parseFloat(list[i-1].追距)||0)+(parseFloat(r.単距)||0));
    r.平均幅員 = label;
    r._平均幅員値 = avgW;
    if (i === 0) {
      r.面積 = (r.単距 && r.幅員) ? (parseFloat(r.単距)*parseFloat(r.幅員)).toFixed(2) : '';
    } else {
      let 上幅員 = parseFloat(list[i-1].幅員)||0;
      let 幅員 = parseFloat(r.幅員)||0;
      let 単距 = parseFloat(r.単距)||0;
      if (幅員 > 0 && 上幅員 > 0 && 単距 > 0) {
        r.面積 = (((幅員 + 上幅員)/2)*単距).toFixed(2);
      } else {
        r.面積 = '';
      }
    }
  }
  let tbody = '';
  list.forEach((r,idx)=>{
    tbody += `<tr>
      <td>
        <select class="pave-type" data-type="pave" data-idx="${idx}" data-key="種別" onchange="editRow('pave',${idx},'種別',this.value,true)" onkeydown="handleKey(event)">
          ${paveTypes.map(tp=>`<option value="${tp}"${r.種別===tp?' selected':''}>${tp}</option>`).join('')}
        </select>
      </td>
      <td><input data-type="pave" data-idx="${idx}" data-key="測点" value="${r.測点||''}" type="text" inputmode="decimal" pattern="[0-9+\-.]*" oninput="editRow('pave',${idx},'測点',this.value)" onblur="editRow('pave',${idx},'測点',this.value,true)" onkeydown="handleKey(event)"></td>
      <td><input data-type="pave" data-idx="${idx}" data-key="単距" value="${r.単距||''}" type="text" inputmode="decimal" pattern="[0-9.+-]*" oninput="editRow('pave',${idx},'単距',this.value)" onblur="editRow('pave',${idx},'単距',this.value,true)" onkeydown="handleKey(event)"></td>
      <td><input value="${r.追距||''}" class="readonly" readonly></td>
      <td><input data-type="pave" data-idx="${idx}" data-key="幅員" value="${r.幅員||''}" type="text" inputmode="decimal" pattern="[0-9.+-]*" oninput="editRow('pave',${idx},'幅員',this.value)" onblur="editRow('pave',${idx},'幅員',this.value,true)" onkeydown="handleKey(event)"></td>      <td><input value="${r.平均幅員||''}" class="readonly" readonly></td>      <td><input value="${r.面積||''}" class="readonly" readonly></td>
    </tr>`;
  });
  document.getElementById('tbodyPave').innerHTML = tbody;
  let sum = {アスファルト:0, コンクリート:0, オーバーレイ:0};
  list.forEach(r=>{
    if(!isNaN(parseFloat(r.面積))){
      sum[r.種別] += parseFloat(r.面積);
    }
  });
  document.getElementById('sumPave').innerHTML =
    `<table class="ss-table">
      <tr>
        <th>現場名</th>
        <th>アスファルト合計</th>
        <th>コンクリート合計</th>
        <th>オーバーレイ合計</th>
      </tr>
      <tr>
        <td>${currentSite}</td>
        <td>${sum.アスファルト.toFixed(2)}</td>
        <td>${sum.コンクリート.toFixed(2)}</td>
        <td>${sum.オーバーレイ.toFixed(2)}</td>
      </tr>
    </table>`;
}

function renderTableEarth() {
  if(!currentSite) return;
  const setting = getEarthSetting();
  const table = document.getElementById('earthTable');
  if(setting.same) {
    table.classList.add('hidden');
  } else {
    table.classList.remove('hidden');
  }
  if(setting.same) return;
  const list = allSites[currentSite].earth;
  for(let i=0;i<list.length;i++) {
    let r = list[i];
    r.追距 = (i===0) ? (parseFloat(r.単距)||0)
      : ((parseFloat(list[i-1].追距)||0) + (parseFloat(r.単距)||0));
    if(i===0) {
      r.面積 = (r.単距 && r.幅員) ? (parseFloat(r.単距)*parseFloat(r.幅員)).toFixed(2) : '';
    } else {
      let 上幅員 = parseFloat(list[i-1].幅員)||0;
      let 幅員 = parseFloat(r.幅員)||0;
      let 単距 = parseFloat(r.単距)||0;
      if(幅員>0 && 上幅員>0 && 単距>0) {
        r.面積 = (((幅員 + 上幅員)/2)*単距).toFixed(2);
      } else {
        r.面積 = '';
      }
    }
  }
  let tbody = '';
  list.forEach((r,idx)=>{
    tbody += `<tr>
      <td><input data-type="earth" data-idx="${idx}" data-key="測点" value="${r.測点||''}" type="text" inputmode="decimal" pattern="[0-9+\-.]*" oninput="editRow('earth',${idx},'測点',this.value)" onblur="editRow('earth',${idx},'測点',this.value,true)" onkeydown="handleKey(event)"></td>
      <td><input data-type="earth" data-idx="${idx}" data-key="単距" value="${r.単距||''}" type="text" inputmode="decimal" pattern="[0-9.+-]*" oninput="editRow('earth',${idx},'単距',this.value)" onblur="editRow('earth',${idx},'単距',this.value,true)" onkeydown="handleKey(event)"></td>
      <td><input value="${r.追距||''}" class="readonly" readonly></td>
      <td><input data-type="earth" data-idx="${idx}" data-key="幅員" value="${r.幅員||''}" type="text" inputmode="decimal" pattern="[0-9.+-]*" oninput="editRow('earth',${idx},'幅員',this.value)" onblur="editRow('earth',${idx},'幅員',this.value,true)" onkeydown="handleKey(event)"></td>
      <td><input value="${r.面積||''}" class="readonly" readonly></td>
    </tr>`;
  });
  document.getElementById('tbodyEarth').innerHTML = tbody;
}

function renderTableDemo() {
  if(!currentSite) return;
  const setting = getDemoSetting();
  const table = document.getElementById('demoTable');
  if(setting.same) {
    table.classList.add('hidden');
  } else {
    table.classList.remove('hidden');
  }
  if(setting.same) return;
  const list = allSites[currentSite].demo;
  for(let i=0;i<list.length;i++) {
    let r = list[i];
    r.追距 = (i===0) ? (parseFloat(r.単距)||0)
      : ((parseFloat(list[i-1].追距)||0) + (parseFloat(r.単距)||0));
    if(i===0) {
      r.面積 = (r.単距 && r.幅員) ? (parseFloat(r.単距)*parseFloat(r.幅員)).toFixed(2) : '';
    } else {
      let 上幅員 = parseFloat(list[i-1].幅員)||0;
      let 幅員 = parseFloat(r.幅員)||0;
      let 単距 = parseFloat(r.単距)||0;
      if(幅員>0 && 上幅員>0 && 単距>0) {
        r.面積 = (((幅員 + 上幅員)/2)*単距).toFixed(2);
      } else {
        r.面積 = '';
      }
    }
  }
  let tbody = '';
  list.forEach((r,idx)=>{
    tbody += `<tr>
      <td><input data-type="demo" data-idx="${idx}" data-key="測点" value="${r.測点||''}" type="text" inputmode="decimal" pattern="[0-9+\-.]*" oninput="editRow('demo',${idx},'測点',this.value)" onblur="editRow('demo',${idx},'測点',this.value,true)" onkeydown="handleKey(event)"></td>
      <td><input data-type="demo" data-idx="${idx}" data-key="単距" value="${r.単距||''}" type="text" inputmode="decimal" pattern="[0-9.+-]*" oninput="editRow('demo',${idx},'単距',this.value)" onblur="editRow('demo',${idx},'単距',this.value,true)" onkeydown="handleKey(event)"></td>
      <td><input value="${r.追距||''}" class="readonly" readonly></td>
      <td><input data-type="demo" data-idx="${idx}" data-key="幅員" value="${r.幅員||''}" type="text" inputmode="decimal" pattern="[0-9.+-]*" oninput="editRow('demo',${idx},'幅員',this.value)" onblur="editRow('demo',${idx},'幅員',this.value,true)" onkeydown="handleKey(event)"></td>
      <td><input value="${r.面積||''}" class="readonly" readonly></td>
    </tr>`;
  });
  document.getElementById('tbodyDemo').innerHTML = tbody;
}

// ▼ 土工集計
function renderEarthResult() {
  if(!currentSite) return;
  const setting = getEarthSetting();
  const paveSum = (allSites[currentSite].pave||[]).reduce((a,r)=>a+(parseFloat(r.面積)||0),0);
  let html = '';
  if(setting.same) {
    const vol = (paveSum * setting.thick / 100).toFixed(2);
    html = `<div>合計体積：${vol} m³　（面積：${paveSum.toFixed(2)}㎡ × 厚さ：${setting.thick}cm）</div>`;
  } else {
    const list = allSites[currentSite].earth || [];
    const area = list.reduce((a,r)=>a+(parseFloat(r.面積)||0),0);
    const vol = (area * setting.thick / 100).toFixed(2);
    html = `<div>合計体積：${vol} m³　（面積：${area.toFixed(2)}㎡ × 厚さ：${setting.thick}cm）</div>`;  }
  document.getElementById('earthResult').innerHTML = html;
}
// ▼ 取壊し工集計
function renderDemoResult() {
  if(!currentSite) return;
  const setting = getDemoSetting();
  const paveSum = (allSites[currentSite].pave||[]).reduce((a,r)=>a+(parseFloat(r.面積)||0),0);
  let html = '';
  if(setting.same) {
    const vol = (paveSum * setting.thick / 100).toFixed(2);
    html = `<div>合計体積：${vol} m³　（面積：${paveSum.toFixed(2)}㎡ × 厚さ：${setting.thick}cm）</div>`;
  } else {
    const list = allSites[currentSite].demo || [];
    const area = list.reduce((a,r)=>a+(parseFloat(r.面積)||0),0);
    const vol = (area * setting.thick / 100).toFixed(2);
    html = `<div>合計体積：${vol} m³　（面積：${area.toFixed(2)}㎡ × 厚さ：${setting.thick}cm）</div>`;  }
  document.getElementById('demoResult').innerHTML = html;
}

function renderAnzenInputs() {
  if(!currentSite) return;
  const dat = allSites[currentSite].anzen || {};
  document.getElementById('anzenLineOuter').value = dat.line_outer || 0;
  document.getElementById('anzenLineStop').value = dat.line_stop || 0;
  document.getElementById('anzenLineSymbol').value = dat.line_symbol || 0;
}

function renderEarthSetting() {
  if(!currentSite) return;
  const set = allSites[currentSite].earthSetting || { same: true, type: '標準掘削', thick: 0 };
  document.getElementById('earthSamePave').checked = set.same || false;
  document.getElementById('earthType').value = set.type || '標準掘削';
  document.getElementById('earthThick').value = set.thick || 0;
}

function renderDemoSetting() {
  if(!currentSite) return;
  const set = allSites[currentSite].demoSetting || { same: true, type: 'As', thick: 0, cutting: 0 };
  document.getElementById('demoSamePave').checked = set.same || false;
  document.getElementById('demoType').value = set.type || 'As';
  document.getElementById('demoThick').value = set.thick || 0;
  document.getElementById('demoCutting').value = set.cutting || 0;
}
function renderKariInputs() {
  if(!currentSite) return;
  const dat = allSites[currentSite].kari || {};
  document.getElementById('kariTrafficB').value = dat.traffic_b || 0;
  document.getElementById('kariTempSignal').value = dat.temp_signal || 0;
  document.getElementById('kariMachineTrans').value = dat.machine_transport || 0;
}
function renderPriceInputs() {
  if(!currentSite) return;
  const dat = allSites[currentSite].price || {};
  document.querySelectorAll('#panelPrice input[data-price-work]').forEach(el => {
    const key = el.dataset.priceWork;
    el.value = dat[key] || 0;
  });
}
function renderPriceTotal() {
  if(!currentSite) return;
  const site = allSites[currentSite] || {};
  const prices = site.price || {};
  const works = site.works || {};
  const paveList = site.pave || [];
  const paveSum = paveList.reduce((a, r) => a + (parseFloat(r.面積) || 0), 0);
  let total = 0;

  if (works.earth) {
    const set = site.earthSetting || {};
    const area = set.same
      ? paveSum
      : (site.earth || []).reduce((a, r) => a + (parseFloat(r.面積) || 0), 0);
    const thick = parseFloat(set.thick) || 0;
    const vol = area * thick / 100;
    total += vol * (prices.earth_machine || 0);
    total += vol * (prices.earth_soil || 0);
  }

  if (works.demo) {
    const set = site.demoSetting || {};
    const thick = parseFloat(set.thick) || 0;
    const cutting = parseFloat(set.cutting) || 0;
    total += cutting * (prices.demo_cut || 0);
    const areaDemo = set.same
      ? paveSum
      : (site.demo || []).reduce((a, r) => a + (parseFloat(r.面積) || 0), 0);
    let break_as = 0, break_con = 0;
    if (set.type === 'As') break_as = areaDemo;
    else if (set.type === 'Con') break_con = areaDemo;
    else if (set.type === 'As+Con') { break_as = areaDemo; break_con = areaDemo; }
    const haul_as = break_as * thick / 100;
    const dispose_as = haul_as * 2.35;
    const haul_con = break_con * thick / 100;
    const dispose_con = haul_con * 2.35;
    total += break_as * (prices.demo_break_as || 0);
    total += haul_as * (prices.demo_haul_as || 0);
    total += dispose_as * (prices.demo_dispose_as || 0);
    total += break_con * (prices.demo_break_con || 0);
    total += haul_con * (prices.demo_haul_con || 0);
    total += dispose_con * (prices.demo_dispose_con || 0);
  }

  let as_lt1_4 = 0, as_ge1_4 = 0, as_ge3_0 = 0,
      ovl_lt1_4 = 0, ovl_ge1_4 = 0, ovl_ge3_0 = 0, con_total = 0;
  paveList.forEach(r => {
    const area = parseFloat(r.面積) || 0;
    if (r.種別 === 'アスファルト') {
      if (r.平均幅員 === '1.4未満') as_lt1_4 += area;
      else if (r.平均幅員 === '1.4以上') as_ge1_4 += area;
      else if (r.平均幅員 === '3.0以上') as_ge3_0 += area;
    } else if (r.種別 === 'オーバーレイ') {
      if (r.平均幅員 === '1.4未満') ovl_lt1_4 += area;
      else if (r.平均幅員 === '1.4以上') ovl_ge1_4 += area;
      else if (r.平均幅員 === '3.0以上') ovl_ge3_0 += area;
    } else if (r.種別 === 'コンクリート') {
      con_total += area;
    }
  });
  const base_area = as_lt1_4 + as_ge1_4 + as_ge3_0;
  total += as_lt1_4 * (prices.pave_as_lt14 || 0);
  total += as_ge1_4 * (prices.pave_as_ge14 || 0);
  total += as_ge3_0 * (prices.pave_as_ge3 || 0);
  total += base_area * (prices.pave_base || 0);
  total += ovl_lt1_4 * (prices.pave_overlay_lt14 || 0);
  total += ovl_ge1_4 * (prices.pave_overlay_ge14 || 0);
  total += ovl_ge3_0 * (prices.pave_overlay_ge3 || 0);
  total += con_total * (prices.pave_concrete || 0);

  const curb = site.curb || {};
  if (curb.use) {
    total += (curb.std || 0) * (prices.curb_std || 0);
    total += (curb.small || 0) * (prices.curb_small || 0);
    total += (curb.hand || 0) * (prices.curb_hand || 0);
  }

  const anzen = site.anzen || {};
  total += (anzen.line_outer || 0) * (prices.safety_line_outer || 0);
  total += (anzen.line_stop || 0) * (prices.safety_line_stop || 0);
  total += (anzen.line_symbol || 0) * (prices.safety_line_symbol || 0);

  const kari = site.kari || {};
  total += (kari.traffic_b || 0) * (prices.safety_traffic_b || 0);
  total += (kari.temp_signal || 0) * (prices.safety_temp_signal || 0);
  total += (kari.machine_transport || 0) * (prices.other_machine_transport || 0);

  const el = document.getElementById('priceTotal');
  if(el) {
    el.textContent = `合計金額：${Math.round(total).toLocaleString()}円`;
  }
}
function renderCurbInputs() {
  if(!currentSite) return;
  const dat = allSites[currentSite].curb || { use: false, std: 0, small: 0, hand: 0 };
  const chk = document.getElementById('chkCurbUse');
  const area = document.getElementById('curbInputs');
  if(chk) chk.checked = dat.use || false;
  if(area) {
    if(chk.checked) area.classList.remove('hidden');
    else area.classList.add('hidden');
  }
  document.getElementById('curbStd').value = dat.std || 0;
  document.getElementById('curbSmall').value = dat.small || 0;
  document.getElementById('curbHand').value = dat.hand || 0;
}

function updateZatsuNameList() {
  const listEl = document.getElementById('zatsuNameList');
  if(!listEl) return;
  const set = new Set();
  Object.values(allSites).forEach(s => {
    if(Array.isArray(s.zatsu)) {
      s.zatsu.forEach(z => { if(z && z.name) set.add(z.name); });
    }
  });
  listEl.innerHTML = Array.from(set).map(n => `<option value="${n}"></option>`).join('');
}

function renderTableZatsu() {
  if(!currentSite) return;
  const list = allSites[currentSite].zatsu || [];
  let tbody = '';
  list.forEach((r, idx) => {
    tbody += `<tr>
      <td><input list="zatsuNameList" data-type="zatsu" data-idx="${idx}" data-key="name" value="${r.name||''}" type="text" oninput="editRow('zatsu',${idx},'name',this.value)" onblur="editRow('zatsu',${idx},'name',this.value,true)" onkeydown="handleKey(event)"></td>
      <td><input data-type="zatsu" data-idx="${idx}" data-key="spec" value="${r.spec||''}" type="text" oninput="editRow('zatsu',${idx},'spec',this.value)" onblur="editRow('zatsu',${idx},'spec',this.value,true)" onkeydown="handleKey(event)"></td>
      <td><input data-type="zatsu" data-idx="${idx}" data-key="unit" value="${r.unit||''}" type="text" oninput="editRow('zatsu',${idx},'unit',this.value)" onblur="editRow('zatsu',${idx},'unit',this.value,true)" onkeydown="handleKey(event)"></td>
      <td><input data-type="zatsu" data-idx="${idx}" data-key="qty" value="${r.qty||''}" type="text" inputmode="decimal" pattern="[0-9.+-]*" oninput="editRow('zatsu',${idx},'qty',this.value)" onblur="editRow('zatsu',${idx},'qty',this.value,true)" onkeydown="handleKey(event)"></td>
    </tr>`;
  });
  document.getElementById('tbodyZatsu').innerHTML = tbody;
  const totals = {};
  list.forEach(r => {
    const n = r.name || '';
    totals[n] = (totals[n] || 0) + (parseFloat(r.qty) || 0);
  });
  const html = Object.entries(totals)
    .filter(([n, t]) => t && n)
    .map(([n, t]) => `${n}: ${t.toFixed(2)}`)
    .join('　');
  document.getElementById('zatsuResult').innerHTML = html ? `<div>${html}</div>` : '';
  updateZatsuNameList();
}

function renderWorksChk() {
  if(!currentSite) return;
  const w = allSites[currentSite].works || { earth:false, demo:false, anzen:false, kari:false, zatsu:false };
  document.getElementById('chkWorksEarth').checked = w.earth || false;
  document.getElementById('chkWorksDemo').checked = w.demo || false;
  document.getElementById('chkWorksAnzen').checked = w.anzen || false;
  document.getElementById('chkWorksKari').checked = w.kari || false;
  document.getElementById('chkWorksZatsu').checked = w.zatsu || false;
}

function saveWorksChk() {
  if(!currentSite) return;
  allSites[currentSite].works = {
    earth: document.getElementById('chkWorksEarth').checked,
    demo: document.getElementById('chkWorksDemo').checked,
    anzen: document.getElementById('chkWorksAnzen').checked,
    kari: document.getElementById('chkWorksKari').checked,
    zatsu: document.getElementById('chkWorksZatsu').checked
  };
}


// ▼ まとめて再描画
function renderAll() {
  renderWorksChk();
  renderEarthSetting();
  renderDemoSetting();
  renderTablePave();
  renderTableEarth();
  renderEarthResult();
  renderTableDemo();
  renderDemoResult();
  renderTableZatsu();
  renderCurbInputs();
  renderAnzenInputs();
  renderKariInputs();
  renderPriceInputs();
  renderPriceTotal();
  showSummary();
}

// ▼ DXF生成
function generateDXF(siteName) {
  const list = (allSites[siteName] && allSites[siteName].pave) || [];
  if (list.length < 2) {
    return null;
  }
  let scale = 100;
  let points = [];
  let x = 0;

  // レイヤー名を日本語で
  const LAYER_FRAME   = 'FRAME';
  const LAYER_BASE    = '---';
  const LAYER_WIDTH   = 'W';
  const LAYER_LEN     = 'L';
  const LAYER_STATION = 'No';

  // 1点目
  let width0 = parseFloat((list[0].幅員 + '').replace(/[Ａ-Ｚａ-ｚ０-９＋]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)).replace(/[^\d.-]/g, '')) || 0;
  points.push({
    x: 0,
    up: width0 / 2,
    down: -width0 / 2,
    width: width0,
    st: list[0].測点
  });

  // 2点目以降
  for (let i = 1; i < list.length; i++) {
    let len = (list[i].単距 + '').replace(/[Ａ-Ｚａ-ｚ０-９＋]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)).replace(/[^\d.-]/g, '');
    let width = (list[i].幅員 + '').replace(/[Ａ-Ｚａ-ｚ０-９＋]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)).replace(/[^\d.-]/g, '');
    len = parseFloat(len) || 0;
    width = parseFloat(width) || 0;
    x += len;
    points.push({
      x: x,
      up: width / 2,
      down: -width / 2,
      width: width,
      st: list[i].測点
    });
  }

  let lines = [];
  // 枠線（LAYER_FRAME）
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i], p1 = points[i + 1];
    lines.push(`0\nLINE\n8\n${LAYER_FRAME}\n10\n${p0.x * scale}\n20\n${p0.up * scale}\n11\n${p1.x * scale}\n21\n${p1.up * scale}\n`);
    lines.push(`0\nLINE\n8\n${LAYER_FRAME}\n10\n${p1.x * scale}\n20\n${p1.up * scale}\n11\n${p1.x * scale}\n21\n${p1.down * scale}\n`);
    lines.push(`0\nLINE\n8\n${LAYER_FRAME}\n10\n${p1.x * scale}\n20\n${p1.down * scale}\n11\n${p0.x * scale}\n21\n${p0.down * scale}\n`);
    lines.push(`0\nLINE\n8\n${LAYER_FRAME}\n10\n${p0.x * scale}\n20\n${p0.down * scale}\n11\n${p0.x * scale}\n21\n${p0.up * scale}\n`);
  }

  // 基準線（LAYER_BASE）＆点間距離（LAYER_LEN）
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i], p1 = points[i + 1];
    // 基準線
    lines.push(`0\nLINE\n8\n${LAYER_BASE}\n10\n${p0.x * scale}\n20\n0\n11\n${p1.x * scale}\n21\n0\n`);
    // 点間距離（ラベル：LAYER_LEN、横書き）
    const len = (p1.x - p0.x).toFixed(2);
    lines.push(`0\nTEXT\n8\n${LAYER_LEN}\n10\n${((p0.x + p1.x) / 2) * scale}\n20\n-35\n40\n7\n1\n${len}m\n50\n0\n`);
  }

  // 幅員線・幅員値（LAYER_WIDTH）、測点（LAYER_STATION, 90°時計回り＝-90°）
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    // 幅員線（LAYER_WIDTH）
    lines.push(`0\nLINE\n8\n${LAYER_WIDTH}\n10\n${p.x * scale}\n20\n${p.down * scale}\n11\n${p.x * scale}\n21\n${p.up * scale}\n`);
    // 幅員値（LAYER_WIDTH、-90°：時計回り90度回転）
    lines.push(`0\nTEXT\n8\n${LAYER_WIDTH}\n10\n${p.x * scale}\n20\n${((p.up + p.down) / 2) * scale}\n40\n7\n1\n${p.width.toFixed(2)}m\n50\n-90\n`);
    // 測点名（LAYER_STATION、-90°：時計回り90度回転）
    if (p.st && p.st.trim()) {
      lines.push(`0\nTEXT\n8\n${LAYER_STATION}\n10\n${p.x * scale}\n20\n${(p.up * scale + 30)}\n40\n7\n1\n${p.st}\n50\n-90\n`);
    }
  }

  let dxf = '0\nSECTION\n2\nHEADER\n0\nENDSEC\n0\nSECTION\n2\nTABLES\n0\nENDSEC\n0\nSECTION\n2\nBLOCKS\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n'
    + lines.join('')
    + '0\nENDSEC\n0\nEOF\n';
  return dxf;
}

// ▼ DXFエクスポート
function exportDXF() {
  const dxf = generateDXF(currentSite);
  if (!dxf) {
    alert('最低2行以上必要です');
    return;
  }
  let safeSiteName = currentSite.replace(/[\\/:*?"<>|]/g, "_");
  let a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([dxf], { type: 'text/plain' }));
  a.download = safeSiteName + '.dxf';
  a.click();
}

// ▼ 全集計（従来形式）
function getSummaryHtml(forExcel = false) {
  const border = forExcel ? "1px" : "2px";
  const tableStyle = `min-width:1200px;border-collapse:collapse;border:${border} solid #555;background:#fff;width:auto;`;
  const thStyle1 = `border:${border} solid #555;background:#e6eef5;color:#007acc;font-weight:bold;text-align:center;padding:8px 5px;`;
  const thStyle2 = `border:${border} solid #555;background:#f7fbff;color:#007acc;font-weight:bold;text-align:center;padding:5px 5px;`;
  const tdStyle = `border:${border} solid #555;text-align:center;padding:6px 5px;`;
  const tdStyleFirst = tdStyle + "border-bottom:none;";
  const tdStyleSecond = tdStyle + "border-top:none;";

  const zatsuEnabled = Object.values(allSites).some(s => s.works && s.works.zatsu);
  let zatsuNames = [];
  if(zatsuEnabled) {
    const set = new Set();
    Object.values(allSites).forEach(s => {
      if(s.works && s.works.zatsu && Array.isArray(s.zatsu)) {
        s.zatsu.forEach(z => { if(z && z.name) set.add(z.name); });
      }
    });
    zatsuNames = Array.from(set);
  }

  const dataCols = [
    "site",
    "machine_excavation", "residual_soil",
    "cutting", "break_as", "haizan_unpan_as", "haizan_shori_as",
    "break_con", "haizan_unpan_con", "haizan_shori_con",
    "as_lt1_4", "as_ge1_4", "as_ge3_0",
    "base_course",
    "ovl_lt1_4", "ovl_ge1_4", "ovl_ge3_0",
    "con_total",
    "curb_std", "curb_small", "curb_hand",
    "line_outer", "line_stop", "line_symbol",
    "traffic_b", "temp_signal", "machine_transport"
  ];
  dataCols.push(...zatsuNames);  let html = `<div style="overflow-x:auto;"><table class="ss-table" style="${tableStyle}">`;
  html += `
<tr>
    <th rowspan="3" style="${thStyle1}">箇所名</th>
    <th colspan="2" style="${thStyle1}">土工</th>
    <th colspan="6" style="${thStyle1}">取壊工</th>
    <th colspan="12" style="${thStyle1}">舗装工</th>
    <th colspan="3" style="${thStyle1}">安全施設工</th>
    <th colspan="3" style="${thStyle1}">仮設工</th>
    ${zatsuEnabled ? `<th colspan="${zatsuNames.length}" style="${thStyle1}">雑工</th>` : ''}
  </tr>
  <tr>
    <th rowspan="2" style="${thStyle2}">機械掘削</th>
    <th rowspan="2" style="${thStyle2}">残土処理</th>
    <th rowspan="2" style="${thStyle2}">舗装版切断</th>
    <th rowspan="2" style="${thStyle2}">舗装版破砕As</th>
    <th rowspan="2" style="${thStyle2}">廃材運搬As</th>
    <th rowspan="2" style="${thStyle2}">廃材処理As</th>
    <th rowspan="2" style="${thStyle2}">舗装版破砕Con</th>
    <th rowspan="2" style="${thStyle2}">廃材運搬Con</th>
    <th rowspan="2" style="${thStyle2}">廃材処理Con</th>
    <th colspan="3" style="${thStyle2}">アスファルト</th>
    <th rowspan="2" style="${thStyle2}">上層路盤工</th>
    <th colspan="3" style="${thStyle2}">オーバーレイ</th>
    <th rowspan="2" style="${thStyle2}">コンクリート</th>
    <th colspan="3" style="${thStyle2}">アスカーブ</th>
    <th colspan="3" style="${thStyle2}">区画線設置</th>
    <th rowspan="2" style="${thStyle2}">交通誘導員B</th>
    <th rowspan="2" style="${thStyle2}">仮設信号機</th>
    <th rowspan="2" style="${thStyle2}">重機運搬費</th>
    ${zatsuNames.map(n=>`<th rowspan="2" style="${thStyle2}">${n}</th>`).join('')}
  </tr>
  <tr>
    <th style="${thStyle2}">t=4cm<br>1.4未満</th>
    <th style="${thStyle2}">t=4cm<br>1.4以上</th>
    <th style="${thStyle2}">t=4cm<br>3.0以上</th>
    <th style="${thStyle2}">t=4cm<br>1.4未満</th>
    <th style="${thStyle2}">t=4cm<br>1.4以上</th>
    <th style="${thStyle2}">t=4cm<br>3.0以上</th>
    <th style="${thStyle2}">標準</th>
    <th style="${thStyle2}">小型</th>
    <th style="${thStyle2}">手盛</th>
    <th style="${thStyle2}">外側線</th>
    <th style="${thStyle2}">停止線</th>
    <th style="${thStyle2}">文字記号</th>
  </tr>`;

  let totalRow = {};
  dataCols.forEach(k => totalRow[k] = 0);
  totalRow.site = "総合計";

  Object.keys(allSites).forEach(site => {
    let row = {};
    row.site = site;

    let machine_excavation = 0, residual_soil = 0;
    let earthSetting = allSites[site].earthSetting || {};
    let paveSum = 0;
    (allSites[site].pave||[]).forEach(r=>paveSum+=parseFloat(r.面積)||0);
    if (allSites[site].works && allSites[site].works.earth) {
      let thick = parseFloat(earthSetting.thick) || 0;
      machine_excavation = residual_soil = paveSum * thick / 100;
    }
    row.machine_excavation = machine_excavation > 0 ? machine_excavation.toFixed(2) : "";
    row.residual_soil = residual_soil > 0 ? residual_soil.toFixed(2) : "";

    let cutting = 0, break_as = 0, break_con = 0;
    let haizan_unpan_as = 0, haizan_shori_as = 0, haizan_unpan_con = 0, haizan_shori_con = 0;
    let demoSetting = allSites[site].demoSetting || {};
    let demoType = demoSetting.type;
    let demoThick = parseFloat(demoSetting.thick)||0;
    if (allSites[site].works && allSites[site].works.demo) {
      cutting = parseFloat(demoSetting.cutting) || 0;
      let areaDemo = demoSetting.same ? paveSum : (allSites[site].demo || []).reduce((a, r) => a + (parseFloat(r.面積) || 0), 0);
      if (demoType === "As") {
        break_as = areaDemo;
      } else if (demoType === "Con") {
        break_con = areaDemo;
      } else if (demoType === "As+Con") {
        break_as = areaDemo;
        break_con = areaDemo;
      }
      haizan_unpan_as = break_as * demoThick / 100;
      haizan_shori_as = haizan_unpan_as * 2.35;
      haizan_unpan_con = break_con * demoThick / 100;
      haizan_shori_con = haizan_unpan_con * 2.35;
    }
    row.cutting = cutting > 0 ? cutting.toFixed(1) : "";
    row.break_as = break_as > 0 ? break_as.toFixed(1) : "";
    row.haizan_unpan_as = haizan_unpan_as > 0 ? haizan_unpan_as.toFixed(2) : "";
    row.haizan_shori_as = haizan_shori_as > 0 ? haizan_shori_as.toFixed(2) : "";
    row.break_con = break_con > 0 ? break_con.toFixed(1) : "";
    row.haizan_unpan_con = haizan_unpan_con > 0 ? haizan_unpan_con.toFixed(2) : "";
    row.haizan_shori_con = haizan_shori_con > 0 ? haizan_shori_con.toFixed(2) : "";

    let as_lt1_4 = 0, as_ge1_4 = 0, as_ge3_0 = 0,
        ovl_lt1_4 = 0, ovl_ge1_4 = 0, ovl_ge3_0 = 0, con_total = 0;
    const paveFormulaMap = {
      as_lt1_4: [], as_ge1_4: [], as_ge3_0: [],
      ovl_lt1_4: [], ovl_ge1_4: [], ovl_ge3_0: [], con_total: []
    };

    (allSites[site].pave || []).forEach(r => {
      let area = parseFloat(r.面積) || 0;
      if (r.種別 === "アスファルト") {
        if (r.平均幅員 === "1.4未満") as_lt1_4 += area;
        else if (r.平均幅員 === "1.4以上") as_ge1_4 += area;
        else if (r.平均幅員 === "3.0以上") as_ge3_0 += area;
      } else if (r.種別 === "オーバーレイ") {
        if (r.平均幅員 === "1.4未満") ovl_lt1_4 += area;
        else if (r.平均幅員 === "1.4以上") ovl_ge1_4 += area;
        else if (r.平均幅員 === "3.0以上") ovl_ge3_0 += area;
      } else if (r.種別 === "コンクリート") {
        con_total += area;
      }
    });
    row.as_lt1_4 = as_lt1_4 > 0 ? as_lt1_4.toFixed(1) : "";
    row.as_ge1_4 = as_ge1_4 > 0 ? as_ge1_4.toFixed(1) : "";
    row.as_ge3_0 = as_ge3_0 > 0 ? as_ge3_0.toFixed(1) : "";
    row.base_course = "";
    row.ovl_lt1_4 = ovl_lt1_4 > 0 ? ovl_lt1_4.toFixed(1) : "";
    row.ovl_ge1_4 = ovl_ge1_4 > 0 ? ovl_ge1_4.toFixed(1) : "";
    row.ovl_ge3_0 = ovl_ge3_0 > 0 ? ovl_ge3_0.toFixed(1) : "";
    row.con_total = con_total > 0 ? con_total.toFixed(1) : "";
    const curb = allSites[site].curb || {};
    row.curb_std = (curb.use && curb.std > 0) ? curb.std : "";
    row.curb_small = (curb.use && curb.small > 0) ? curb.small : "";
    row.curb_hand = (curb.use && curb.hand > 0) ? curb.hand : "";
    const anzen = allSites[site].anzen || {};
    row.line_outer = anzen.line_outer || "";
    row.line_stop = anzen.line_stop || "";
    row.line_symbol = anzen.line_symbol || "";
    row.traffic_b = "";
    row.temp_signal = "";
    row.machine_transport = "";
    const kari = allSites[site].kari || {};
    row.traffic_b = kari.traffic_b || "";
    row.temp_signal = kari.temp_signal || "";
    row.machine_transport = kari.machine_transport || "";
 
    if(zatsuEnabled) {
      const sums = {};
      zatsuNames.forEach(n => sums[n] = 0);
      if(allSites[site].works && allSites[site].works.zatsu && Array.isArray(allSites[site].zatsu)) {
        allSites[site].zatsu.forEach(z => {
          const n = z.name;
          if(sums[n] !== undefined) sums[n] += parseFloat(z.qty) || 0;
        });
      }
      zatsuNames.forEach(n => {
        row[n] = sums[n] > 0 ? sums[n].toFixed(2) : "";
      });
    }

    dataCols.forEach(k => {
      if (k !== "site") totalRow[k] += parseFloat(row[k]) || 0;
    });

    if (forExcel) {
      html += `<tr>${dataCols.map(k => `<td style="${tdStyleFirst}"></td>`).join("")}</tr>`;
      html += `<tr>${dataCols.map(k => `<td style="${tdStyleSecond}">${row[k] || ""}</td>`).join("")}</tr>`;
    } else {
      html += `<tr>${dataCols.map(k => `<td style="${tdStyle}">${row[k] || ""}</td>`).join("")}</tr>`;
    }
  });

  html += `<tr style="background:#f3f9ff;font-weight:bold;">${
    dataCols.map(k =>
      `<td style="${tdStyle}">${k==="site" ? "総合計" : (totalRow[k] ? totalRow[k].toFixed(2) : "")}</td>`
    ).join("")
  }</tr>`;
  html += '</table></div>';
  return html;
}

function showSummary() {
  const html = getSummaryHtml(false);
  document.querySelectorAll('.summary-table').forEach(el => {
    el.innerHTML = html;
  });
}

// ▼ 集計表をExcel形式でダウンロード
function exportSummaryExcel() {
  showSummary();
  const html = '<html><head><meta charset="UTF-8"></head><body>' +
               getSummaryHtml(true) +
               '</body></html>';
  const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'summary.xls';
  a.click();
}

function getQuantityHtml() {
  const border = '1px';
  const tableStyle = `min-width:1200px;border-collapse:collapse;border:${border} solid #555;background:#fff;width:auto;`;
  const thStyle = `border:${border} solid #555;background:#e6eef5;color:#007acc;font-weight:bold;text-align:center;padding:8px 5px;`;
  const tdStyle = `border:${border} solid #555;text-align:center;padding:6px 5px;`;
  const tdStyleFirst = tdStyle + 'border-bottom:none;';
  const tdStyleSecond = tdStyle + 'border-top:none;';
  const catStyle = `border:${border} solid #555;background:#f3f3f3;font-weight:bold;text-align:left;padding:6px 5px;`;

  const getAreaFormula = (list, idx) => {
    const r = list[idx] || {};
    const d = parseFloat(r.単距) || 0;
    const w = parseFloat(r.幅員) || 0;
    if(idx === 0) {
      return d ? `${d}×${w}` : '';
    }
    const prevW = parseFloat(list[idx - 1].幅員) || 0;
    return `${d}×(${prevW}+${w})/2`;
  };

  let html = `<table class="ss-table" style="${tableStyle}">`;
  html += `<colgroup>` +
          `<col>` +
          `<col style="width:15mm">` +
          `<col style="width:20mm">` +
          `<col style="width:60mm">` +
          `<col style="width:5mm">` +
          `<col style="width:15mm">` +
          `</colgroup>`;
  html += `<tr><th style="${thStyle}">箇所名</th><th style="${thStyle}">工種</th><th style="${thStyle}">規格</th><th style="${thStyle}">計算式</th><th style="${thStyle}">単位</th><th style="${thStyle}">数量</th></tr>`;

  const addRow = (site, work, spec, formula, unit, qty) => {
    html += `<tr>` +
            `<td style="${tdStyleFirst}">${site}</td>` +
            `<td style="${tdStyleFirst}"></td>` +
            `<td style="${tdStyleFirst}"></td>` +
            `<td style="${tdStyleFirst}"></td>` +
            `<td style="${tdStyleFirst}"></td>` +
            `<td style="${tdStyleFirst}"></td>` +
            `</tr>` +
            `<tr>` +
            `<td style="${tdStyleSecond}"></td>` +
            `<td style="${tdStyleSecond}">${work}</td>` +
            `<td style="${tdStyleSecond}">${spec}</td>` +
            `<td style="${tdStyleSecond}">${formula}</td>` +
            `<td style="${tdStyleSecond}">${unit}</td>` +
            `<td style="${tdStyleSecond}">${qty}</td>` +
            `</tr>`;
  };
  
  const addCatRow = (site, label) => {
    html += `<tr><td style="${tdStyle}">${site}</td><td style="${catStyle}" colspan="5">${label}</td></tr>`;
  };

  Object.keys(allSites).forEach(site => {
    const dat = allSites[site] || {};
    let first = true;
    const getSite = () => { const s = first ? site : ''; first = false; return s; };
    const row = (w,spec,f,u,q) => addRow(getSite(), w, spec, f, u, q);
    const cat = label => addCatRow(getSite(), label);
    
    let paveSum = 0;
    (dat.pave || []).forEach(r => {
      paveSum += parseFloat(r.面積) || 0;
    });
    
    if(dat.works && dat.works.earth) {
      const set = dat.earthSetting || {};
      const thick = parseFloat(set.thick) || 0;
      const vol = paveSum * thick / 100;
      if(vol > 0) {
        const formula = `${paveSum.toFixed(1)}×(${thick}/100)`;
        cat('土工');
        row('機械掘削', set.type || '', formula, 'm³', vol.toFixed(2));
        row('残土処理', set.type || '', formula, 'm³', vol.toFixed(2));
      }
    }

    if(dat.works && dat.works.demo) {
      const set = dat.demoSetting || {};
      const demoType = set.type;
      const thick = parseFloat(set.thick) || 0;
      const demoList = set.same ? (dat.pave || []) : (dat.demo || []);
      const areaDemoFormula = demoList
        .map((_, i) => getAreaFormula(demoList, i))
        .filter(f => f)
        .join(' + ');      const areaDemo = demoList.reduce((a,r)=>a+(parseFloat(r.面積)||0),0)     
      const cutting = parseFloat(set.cutting)||0;

      let break_as=0, break_con=0;
      if(demoType==='As') break_as = areaDemo;
      else if(demoType==='Con') break_con = areaDemo;
      else if(demoType==='As+Con') { break_as = areaDemo; break_con = areaDemo; }

      if(cutting>0 || break_as>0 || break_con>0) {
        cat('取り壊し工');
        if(cutting>0) row('舗装版切断','',`${cutting}`, 'm', cutting.toFixed(1));
          if(break_as>0) {
            row('舗装版破砕','As',areaDemoFormula,'m²',break_as.toFixed(1));
            const unpan = break_as * thick / 100;
            row('廃材運搬','As',`(${areaDemoFormula})×(${thick}/100)`,'m³',unpan.toFixed(2));
            row('廃材処理','As',`(${areaDemoFormula})×(${thick}/100)×2.35`,'t',(unpan*2.35).toFixed(2));
          }
          if(break_con>0) {
            row('舗装版破砕','Con',areaDemoFormula,'m²',break_con.toFixed(1));
            const unpan = break_con * thick / 100;
            row('廃材運搬','Con',`(${areaDemoFormula})×(${thick}/100)`,'m³',unpan.toFixed(2));
            row('廃材処理','Con',`(${areaDemoFormula})×(${thick}/100)×2.35`,'t',(unpan*2.35).toFixed(2));
          }
      }
    }

    let as_lt1_4 = 0, as_ge1_4 = 0, as_ge3_0 = 0,
        ovl_lt1_4 = 0, ovl_ge1_4 = 0, ovl_ge3_0 = 0, con_total = 0;
    const paveFormulaMap = {
      as_lt1_4: [], as_ge1_4: [], as_ge3_0: [],
      ovl_lt1_4: [], ovl_ge1_4: [], ovl_ge3_0: [], con_total: []
    };

    (dat.pave || []).forEach((r, idx) => {
      const area = parseFloat(r.面積) || 0;
      const f = getAreaFormula(dat.pave, idx);
      if (r.種別 === 'アスファルト') {
        if (r.平均幅員 === '1.4未満') {
          as_lt1_4 += area;
          if (f) paveFormulaMap.as_lt1_4.push(f);
        } else if (r.平均幅員 === '1.4以上') {
          as_ge1_4 += area;
          if (f) paveFormulaMap.as_ge1_4.push(f);
        } else if (r.平均幅員 === '3.0以上') {
          as_ge3_0 += area;
          if (f) paveFormulaMap.as_ge3_0.push(f);
        }
      } else if (r.種別 === 'オーバーレイ') {
        if (r.平均幅員 === '1.4未満') {
          ovl_lt1_4 += area;
          if (f) paveFormulaMap.ovl_lt1_4.push(f);
        } else if (r.平均幅員 === '1.4以上') {
          ovl_ge1_4 += area;
          if (f) paveFormulaMap.ovl_ge1_4.push(f);
        } else if (r.平均幅員 === '3.0以上') {
          ovl_ge3_0 += area;
          if (f) paveFormulaMap.ovl_ge3_0.push(f);
        }
      } else if (r.種別 === 'コンクリート') {
        con_total += area;
        if (f) paveFormulaMap.con_total.push(f);
      }
    });

    const paveRows = [];
      if(as_lt1_4>0) paveRows.push(['アスファルト','t=4cm 1.4未満',paveFormulaMap.as_lt1_4.join(' + '), 'm²', as_lt1_4.toFixed(1)]);
      if(as_ge1_4>0) paveRows.push(['アスファルト','t=4cm 1.4以上',paveFormulaMap.as_ge1_4.join(' + '), 'm²', as_ge1_4.toFixed(1)]);
      if(as_ge3_0>0) paveRows.push(['アスファルト','t=4cm 3.0以上',paveFormulaMap.as_ge3_0.join(' + '), 'm²', as_ge3_0.toFixed(1)]);
      if(ovl_lt1_4>0) paveRows.push(['オーバーレイ','t=4cm 1.4未満',paveFormulaMap.ovl_lt1_4.join(' + '), 'm²', ovl_lt1_4.toFixed(1)]);
      if(ovl_ge1_4>0) paveRows.push(['オーバーレイ','t=4cm 1.4以上',paveFormulaMap.ovl_ge1_4.join(' + '), 'm²', ovl_ge1_4.toFixed(1)]);
      if(ovl_ge3_0>0) paveRows.push(['オーバーレイ','t=4cm 3.0以上',paveFormulaMap.ovl_ge3_0.join(' + '), 'm²', ovl_ge3_0.toFixed(1)]);
      if(con_total>0) paveRows.push(['コンクリート','', paveFormulaMap.con_total.join(' + '), 'm²', con_total.toFixed(1)]);

    const curb = dat.curb || {};
    if(curb.use) {
      if(curb.std>0) paveRows.push(['アスカーブ','標準','', 'm', curb.std]);
      if(curb.small>0) paveRows.push(['アスカーブ','小型','', 'm', curb.small]);
      if(curb.hand>0) paveRows.push(['アスカーブ','手盛','', 'm', curb.hand]);
    }

    if(paveRows.length>0) {
      cat('舗装工');
      paveRows.forEach(r => row(...r));
    }

    const anzen = dat.anzen || {};
    const anzenRows = [];
    if(anzen.line_outer>0) anzenRows.push(['区画線設置','外側線','', 'm', anzen.line_outer]);
    if(anzen.line_stop>0) anzenRows.push(['区画線設置','停止線','', 'm', anzen.line_stop]);
    if(anzen.line_symbol>0) anzenRows.push(['区画線設置','文字記号','', 'm²', anzen.line_symbol]);
    if(anzenRows.length>0) {
      cat('安全施設工');
      anzenRows.forEach(r => row(...r));
    }

    const kari = dat.kari || {};
    const kariRows = [];
    if(kari.traffic_b>0) kariRows.push(['仮設工','交通誘導員B','', '人日', kari.traffic_b]);
    if(kari.temp_signal>0) kariRows.push(['仮設工','仮設信号機','', '基', kari.temp_signal]);
    if(kari.machine_transport>0) kariRows.push(['仮設工','重機運搬費','', '式', kari.machine_transport]);
    if(kariRows.length>0) {
      cat('仮設工');
      kariRows.forEach(r => row(...r));
    }

    const zatsuRows = [];
    if(dat.works && dat.works.zatsu) {
      (dat.zatsu || []).forEach(z => {
        const q = parseFloat(z.qty) || 0;
        if(q>0) zatsuRows.push([z.name || '', z.spec || '', '', z.unit || '', q]);
      });
    }
    if(zatsuRows.length>0) {
      cat('雑工');
      zatsuRows.forEach(r => row(...r));
    }
  });
  html += '</table>';
  return html;
}

function exportQuantityExcel() {
  const html = '<html><head><meta charset="UTF-8"><style>@page{size:A4 landscape;}</style></head><body>' +
               getQuantityHtml() +
               '</body></html>';
  const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
  const a = document.createElement('a');
  const now = new Date();
  const ymd = now.getFullYear() +
              ('0'+(now.getMonth()+1)).slice(-2) +
              ('0'+now.getDate()).slice(-2);
  a.href = URL.createObjectURL(blob);
  a.download = `数量計算書_${ymd}.xls`;
  a.click();
}

// ▼ 簡易CRC32計算
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for(let i=0;i<256;i++) {
    let c = i;
    for(let j=0;j<8;j++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c >>> 0;
  }
  return t;
})();

function crc32(arr) {
  let c = 0xffffffff;
  for(let i=0;i<arr.length;i++)
    c = CRC_TABLE[(c ^ arr[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// ▼ ZIP生成（無圧縮）
function makeZip(files) {
  const enc = new TextEncoder();
  let localParts = [], centralParts = [];
  let offset = 0;
  for(const f of files) {
    const nameBytes = enc.encode(f.name);
    const data = f.data;
    const crc = crc32(data);

    const local = new Uint8Array(30 + nameBytes.length);
    const dv = new DataView(local.buffer);
    dv.setUint32(0, 0x04034b50, true);
    dv.setUint16(4, 20, true);
    dv.setUint16(6, 0x0800, true);
    dv.setUint16(8, 0, true);
    dv.setUint16(10, 0, true);
    dv.setUint16(12, 0, true);
    dv.setUint32(14, crc, true);
    dv.setUint32(18, data.length, true);
    dv.setUint32(22, data.length, true);
    dv.setUint16(26, nameBytes.length, true);
    dv.setUint16(28, 0, true);
    local.set(nameBytes, 30);
    localParts.push(local, data);

    const central = new Uint8Array(46 + nameBytes.length);
    const cdv = new DataView(central.buffer);
    cdv.setUint32(0, 0x02014b50, true);
    cdv.setUint16(4, 20, true);
    cdv.setUint16(6, 20, true);
    cdv.setUint16(8, 0x0800, true);
    cdv.setUint16(10, 0, true);
    cdv.setUint16(12, 0, true);
    cdv.setUint16(14, 0, true);
    cdv.setUint32(16, crc, true);
    cdv.setUint32(20, data.length, true);
    cdv.setUint32(24, data.length, true);
    cdv.setUint16(28, nameBytes.length, true);
    cdv.setUint16(30, 0, true);
    cdv.setUint16(32, 0, true);
    cdv.setUint16(34, 0, true);
    cdv.setUint16(36, 0, true);
    cdv.setUint32(38, 0, true);
    cdv.setUint32(42, offset, true);
    central.set(nameBytes, 46);
    centralParts.push(central);

    offset += local.length + data.length;
  }

  const centralSize = centralParts.reduce((a,b)=>a+b.length,0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);

  const total = offset + centralSize + end.length;
  const out = new Uint8Array(total);
  let pos = 0;
  for(const p of localParts) { out.set(p, pos); pos += p.length; }
  for(const p of centralParts) { out.set(p, pos); pos += p.length; }
  out.set(end, pos);
  return out;
}

// ▼ 一括出力（Excel & DXF ZIP）
function exportAllZip() {
  showSummary();
  const enc = new TextEncoder();
  const files = [];
  const summaryHtml = '<html><head><meta charset="UTF-8"></head><body>' +
                      getSummaryHtml(true) + '</body></html>';
  files.push({name: '合計表.xls', data: enc.encode(summaryHtml)});
  const quantityHtml = '<html><head><meta charset="UTF-8"><style>@page{size:A4 landscape;}</style></head><body>' +
                       getQuantityHtml() + '</body></html>';
  files.push({name: '数量計算書.xls', data: enc.encode(quantityHtml)});
  Object.keys(allSites).forEach(site => {
    const dxf = generateDXF(site);
    if(dxf) {
      const safe = site.replace(/[\\/:*?"<>|]/g, '_');
      files.push({name: safe + '.dxf', data: enc.encode(dxf)});
    }
  });
  const zipData = makeZip(files);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([zipData], {type:'application/zip'}));
  a.download = 'all_data.zip';
  a.click();
}

// ▼ 設定保存＋再描画
function saveAndUpdate(update = true) {
  if(currentSite && allSites[currentSite]) {
    allSites[currentSite].earthSetting = getEarthSetting();
    allSites[currentSite].demoSetting = getDemoSetting();
  }
  if(update) renderAllAndSave();
}

function handleKey(e) {
  if(e.key === 'Enter' || e.key === 'Tab') {
    e.preventDefault();
    const focusable = Array.from(document.querySelectorAll('input[data-idx], select[data-idx]'));
    const idx = focusable.indexOf(e.target);
    if(idx !== -1 && idx < focusable.length - 1) {
      const n = focusable[idx + 1];
      nextFocus = {type: n.dataset.type, idx: n.dataset.idx, key: n.dataset.key};
    } else {
      nextFocus = null;
    }
    e.target.blur();
  }
}

function handlePointerDown(e) {
  const t = e.target.closest('input[data-idx], select[data-idx]');
  if(t) {
    nextFocus = {type: t.dataset.type, idx: t.dataset.idx, key: t.dataset.key};
  } else {
    nextFocus = null;
  }
}

function openCalc() {
  document.getElementById('calcOverlay').classList.remove('hidden');
  document.getElementById('calcInput').focus();
  document.getElementById('calcResult').textContent = '';
}

function closeCalc() {
  document.getElementById('calcOverlay').classList.add('hidden');
}
function calcInsert(char) {
  const input = document.getElementById('calcInput');
  input.value += char;
  input.focus();
}

function calcClear() {
  document.getElementById('calcInput').value = '';
  document.getElementById('calcResult').textContent = '';
}

function calcCalculate() {
  try {
    const v = document.getElementById('calcInput').value;
    const r = eval(v);
    document.getElementById('calcResult').textContent = r;
  } catch(err) {
    document.getElementById('calcResult').textContent = 'Error';
  }
}

function calcKey(e) {
  if(e.key === 'Enter') {
    calcCalculate();
  }
}

document.addEventListener('pointerdown', handlePointerDown, true);

window.addEventListener('DOMContentLoaded', () => {
  loadData();
  loadPrices();
  renderAll();
  renderTabs();
  updateZatsuNameList();
  document.querySelectorAll('input[data-price-work]').forEach(el => {
    el.addEventListener('input', savePrices);
  });
});
