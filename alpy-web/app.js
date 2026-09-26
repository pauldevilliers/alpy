(() => {
  'use strict';

  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];

  const state = {
    z: 10,
    windows: new Map(),
    settings: loadJSON('alpy-web:settings', {
      showGrid: true,
      clock24: true,
      launcher: ['files','notes','terminal','system','settings']
    }),
    notes: localStorage.getItem('alpy-web:notes') || ''
  };

  const apps = {
    files: {
      name: 'Files', glyph: '▱', desc: 'Browse your cloud workspace',
      render() {
        return appShell('Files', `
          <p>Alpy Web currently exposes a virtual workspace. Cloud file adapters will plug into this surface later.</p>
          <div class="file-list">
            ${['Desktop','Documents','Projects','Downloads'].map(x => `
              <div class="file-row"><span class="file-icon">▱</span><span>${x}</span></div>`).join('')}
          </div>`);
      }
    },
    notes: {
      name: 'Notes', glyph: 'N', desc: 'Persistent scratchpad',
      render() {
        return appShell('Notes', `
          <textarea id="notesArea" spellcheck="true" placeholder="Write something…"></textarea>`);
      },
      mount(win) {
        const area = $('#notesArea', win);
        area.value = state.notes;
        area.addEventListener('input', () => {
          state.notes = area.value;
          localStorage.setItem('alpy-web:notes', state.notes);
        });
      }
    },
    terminal: {
      name: 'Terminal', glyph: '>_', desc: 'OS-like command surface',
      render() {
        return `<div class="terminal"><div id="termOut"></div><div class="terminal-prompt"><span>alpy&gt;</span><input id="termInput" autocomplete="off" spellcheck="false"></div></div>`;
      },
      mount(win) {
        const out = $('#termOut', win);
        const input = $('#termInput', win);
        print(out, 'Alpy Web terminal');
        print(out, 'Type "help" for commands.');
        input.addEventListener('keydown', e => {
          if (e.key !== 'Enter') return;
          const command = input.value.trim();
          print(out, 'alpy> ' + command);
          runCommand(command, out);
          input.value = '';
        });
        setTimeout(() => input.focus(), 0);
      }
    },
    system: {
      name: 'System', glyph: '◫', desc: 'Environment and device info',
      render() {
        const info = [
          ['Mode','Alpy Web'],
          ['Platform', navigator.platform || 'web'],
          ['Language', navigator.language || 'unknown'],
          ['Online', navigator.onLine ? 'yes' : 'no'],
          ['Screen', `${screen.width} × ${screen.height}`],
          ['Viewport', `${innerWidth} × ${innerHeight}`],
          ['Storage', 'local browser storage'],
          ['Installable', 'PWA-capable browser recommended']
        ];
        return appShell('System', `<div class="kv">${info.map(([k,v]) => `<div class="k">${escapeHTML(k)}</div><div class="v">${escapeHTML(v)}</div>`).join('')}</div>`);
      }
    },
    settings: {
      name: 'Settings', glyph: '⚙', desc: 'Configure Alpy Web',
      render() {
        return appShell('Settings', `
          <div class="setting-row">
            <label>Desktop grid<small>Show the subtle black desktop grid.</small></label>
            <input id="gridSetting" type="checkbox">
          </div>
          <div class="setting-row">
            <label>24-hour clock<small>Use 24-hour time in the dock.</small></label>
            <input id="clockSetting" type="checkbox">
          </div>
          <div class="setting-row">
            <label>Reset local state<small>Clears notes, settings and window preferences on this device.</small></label>
            <button id="resetState">Reset</button>
          </div>`);
      },
      mount(win) {
        const grid = $('#gridSetting', win);
        const clock = $('#clockSetting', win);
        grid.checked = state.settings.showGrid;
        clock.checked = state.settings.clock24;
        grid.onchange = () => { state.settings.showGrid = grid.checked; saveSettings(); applySettings(); };
        clock.onchange = () => { state.settings.clock24 = clock.checked; saveSettings(); updateClock(); };
        $('#resetState', win).onclick = () => {
          if (!confirm('Reset Alpy Web local state on this device?')) return;
          localStorage.removeItem('alpy-web:settings');
          localStorage.removeItem('alpy-web:notes');
          location.reload();
        };
      }
    }
  };

  function appShell(title, body) {
    return `<div class="app-shell"><h1>${escapeHTML(title)}</h1>${body}</div>`;
  }

  function openApp(id) {
    const app = apps[id];
    if (!app) return;
    if (state.windows.has(id)) {
      const win = state.windows.get(id);
      win.classList.remove('hidden');
      focusWindow(win);
      return;
    }

    const win = document.createElement('section');
    win.className = 'window active';
    win.dataset.app = id;
    const offset = state.windows.size * 26;
    win.style.left = Math.max(18, 90 + offset) + 'px';
    win.style.top = Math.max(18, 70 + offset) + 'px';
    win.style.zIndex = ++state.z;
    win.innerHTML = `
      <div class="window-titlebar">
        <div class="window-title">${escapeHTML(app.name)}</div>
        <div class="window-actions">
          <button class="window-action" data-act="min">—</button>
          <button class="window-action" data-act="max">□</button>
          <button class="window-action" data-act="close">×</button>
        </div>
      </div>
      <div class="window-body">${app.render()}</div>
      <div class="window-resize"></div>`;

    $('#windows').appendChild(win);
    state.windows.set(id, win);
    installWindowBehaviour(win);
    app.mount?.(win);
    rebuildTasks();
    focusWindow(win);
  }

  function installWindowBehaviour(win) {
    const bar = $('.window-titlebar', win);
    let drag = null;

    bar.addEventListener('pointerdown', e => {
      if (e.target.closest('button') || win.classList.contains('maximized')) return;
      focusWindow(win);
      drag = {x:e.clientX,y:e.clientY,left:win.offsetLeft,top:win.offsetTop};
      bar.setPointerCapture(e.pointerId);
    });
    bar.addEventListener('pointermove', e => {
      if (!drag) return;
      win.style.left = Math.max(0, drag.left + e.clientX - drag.x) + 'px';
      win.style.top = Math.max(0, drag.top + e.clientY - drag.y) + 'px';
    });
    bar.addEventListener('pointerup', () => drag = null);
    bar.addEventListener('dblclick', () => toggleMax(win));

    win.addEventListener('pointerdown', () => focusWindow(win));

    const resizer = $('.window-resize', win);
    let resize = null;
    resizer.addEventListener('pointerdown', e => {
      resize = {x:e.clientX,y:e.clientY,w:win.offsetWidth,h:win.offsetHeight};
      resizer.setPointerCapture(e.pointerId);
      e.stopPropagation();
    });
    resizer.addEventListener('pointermove', e => {
      if (!resize || win.classList.contains('maximized')) return;
      win.style.width = Math.max(280, resize.w + e.clientX - resize.x) + 'px';
      win.style.height = Math.max(200, resize.h + e.clientY - resize.y) + 'px';
    });
    resizer.addEventListener('pointerup', () => resize = null);

    $$('[data-act]', win).forEach(btn => btn.onclick = e => {
      e.stopPropagation();
      const act = btn.dataset.act;
      if (act === 'close') closeWindow(win);
      if (act === 'min') { win.classList.add('hidden'); rebuildTasks(); }
      if (act === 'max') toggleMax(win);
    });
  }

  function toggleMax(win) {
    win.classList.toggle('maximized');
    focusWindow(win);
  }

  function closeWindow(win) {
    state.windows.delete(win.dataset.app);
    win.remove();
    rebuildTasks();
  }

  function focusWindow(win) {
    $$('.window').forEach(w => w.classList.remove('active'));
    win.classList.add('active');
    win.style.zIndex = ++state.z;
    rebuildTasks();
  }

  function rebuildTasks() {
    const host = $('#runningApps');
    host.innerHTML = '';
    for (const [id, win] of state.windows) {
      const app = apps[id];
      const b = document.createElement('button');
      b.className = 'task-button' + (win.classList.contains('active') && !win.classList.contains('hidden') ? ' active' : '');
      b.textContent = app.name;
      b.onclick = () => {
        if (!win.classList.contains('hidden') && win.classList.contains('active')) {
          win.classList.add('hidden');
          win.classList.remove('active');
        } else {
          win.classList.remove('hidden');
          focusWindow(win);
        }
        rebuildTasks();
      };
      host.appendChild(b);
    }
  }

  function buildLauncher() {
    const host = $('#launcherApps');
    host.innerHTML = '';
    state.settings.launcher.filter(id => apps[id]).forEach(id => {
      const app = apps[id];
      const b = document.createElement('button');
      b.className = 'launcher-app';
      b.dataset.app = id;
      b.innerHTML = `<span class="app-glyph">${escapeHTML(app.glyph)}</span><span class="app-copy"><span class="app-name">${escapeHTML(app.name)}</span><span class="app-desc">${escapeHTML(app.desc)}</span></span>`;
      b.onclick = () => { openApp(id); hideLauncher(); };
      host.appendChild(b);
    });
  }

  function showLauncher() {
    $('#launcher').classList.remove('hidden');
    $('#menuButton').classList.add('open');
    $('#launcherSearch').value = '';
    filterLauncher('');
    setTimeout(() => $('#launcherSearch').focus(), 0);
  }
  function hideLauncher() {
    $('#launcher').classList.add('hidden');
    $('#menuButton').classList.remove('open');
  }
  function filterLauncher(q) {
    q = q.trim().toLowerCase();
    $$('.launcher-app').forEach(b => {
      const app = apps[b.dataset.app];
      b.classList.toggle('hidden', q && !(app.name+' '+app.desc).toLowerCase().includes(q));
    });
  }

  function lock() {
    hideLauncher();
    const el = document.createElement('div');
    el.className = 'lock-screen';
    el.innerHTML = `<div class="lock-card"><div id="lockTime" class="lock-time"></div><div class="lock-text">Alpy Web is locked on this device</div><button>Unlock</button></div>`;
    document.body.appendChild(el);
    const tick = () => {
      if (!el.isConnected) return;
      $('#lockTime', el).textContent = new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
      setTimeout(tick, 1000);
    };
    tick();
    $('button', el).onclick = () => el.remove();
  }

  function runCommand(cmd, out) {
    const [name, ...args] = cmd.split(/\s+/);
    if (!name) return;
    if (name === 'help') print(out, 'help, clear, date, apps, open <app>, whoami, online');
    else if (name === 'clear') out.innerHTML = '';
    else if (name === 'date') print(out, new Date().toString());
    else if (name === 'apps') print(out, Object.keys(apps).join(', '));
    else if (name === 'open') {
      if (apps[args[0]]) openApp(args[0]);
      else print(out, 'Unknown app.');
    }
    else if (name === 'whoami') print(out, 'local-web-user');
    else if (name === 'online') print(out, navigator.onLine ? 'online' : 'offline');
    else print(out, 'Command not found. Type "help".');
  }

  function print(out, text) {
    const line = document.createElement('div');
    line.className = 'terminal-line';
    line.textContent = text;
    out.appendChild(line);
    out.parentElement.scrollTop = out.parentElement.scrollHeight;
  }

  function updateClock() {
    $('#clock').textContent = new Date().toLocaleTimeString([], {
      hour:'2-digit', minute:'2-digit', hour12: !state.settings.clock24
    });
  }

  function applySettings() {
    document.body.classList.toggle('no-grid', !state.settings.showGrid);
    const styleId = 'alpy-setting-style';
    let style = document.getElementById(styleId);
    if (!style) { style = document.createElement('style'); style.id = styleId; document.head.appendChild(style); }
    style.textContent = state.settings.showGrid ? '' : '.desktop::before{display:none}';
  }

  function saveSettings() {
    localStorage.setItem('alpy-web:settings', JSON.stringify(state.settings));
  }

  function loadJSON(key, fallback) {
    try { return {...fallback, ...JSON.parse(localStorage.getItem(key) || '{}')}; }
    catch { return fallback; }
  }

  function escapeHTML(v) {
    return String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  $('#menuButton').onclick = () => $('#launcher').classList.contains('hidden') ? showLauncher() : hideLauncher();
  $('#launcherClose').onclick = hideLauncher;
  $('#launcherSearch').oninput = e => filterLauncher(e.target.value);
  $('#launcherSearch').onkeydown = e => {
    if (e.key === 'Escape') hideLauncher();
    if (e.key === 'Enter') {
      const first = $('.launcher-app:not(.hidden)');
      first?.click();
    }
  };
  $$('.launcher-foot-btn').forEach(b => b.onclick = () => {
    if (b.dataset.action === 'settings') { openApp('settings'); hideLauncher(); }
    if (b.dataset.action === 'lock') lock();
  });
  $('#clock').onclick = () => openApp('system');

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') hideLauncher();
    if ((e.ctrlKey || e.metaKey) && e.code === 'Space') {
      e.preventDefault();
      $('#launcher').classList.contains('hidden') ? showLauncher() : hideLauncher();
    }
  });

  document.addEventListener('pointerdown', e => {
    if (!e.target.closest('#launcher') && !e.target.closest('#menuButton')) hideLauncher();
  });

  window.addEventListener('online', () => rebuildTasks());
  window.addEventListener('offline', () => rebuildTasks());

  buildLauncher();
  applySettings();
  updateClock();
  setInterval(updateClock, 1000);

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
