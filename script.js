(() => {
  let data, fileName = 'acc-setup-edited.json', dirty = false, active = 'TYRES';
  const f = document.querySelector('#file'),
        tabs = document.querySelector('#tabs'),
        content = document.querySelector('#content'),
        notice = document.querySelector('#notice'),
        save = document.querySelector('#save'),
        helpTitle = document.querySelector('#helpTitle'),
        helpText = document.querySelector('#helpText'),
        fileLine = document.querySelector('#fileLine');

  const cats = ['TYRES', 'ELECTRONICS', 'FUEL & STRATEGY', 'MECHANICAL GRIP', 'DAMPERS', 'AERO', 'OTHER'],
        wheel = ['Front Left', 'Front Right', 'Rear Left', 'Rear Right'],
        leaf = v => v === null || typeof v !== 'object',
        human = k => String(k).replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  function walk(v, p = [], out = []) {
    if (leaf(v)) out.push({ p, v });
    else if (Array.isArray(v)) v.forEach((x, i) => walk(x, [...p, i], out));
    else Object.entries(v).forEach(([k, x]) => walk(x, [...p, k], out));
    return out;
  }

  const get = p => p.reduce((o, k) => o[k], data);

  function set(p, v) {
    p.slice(0, -1).reduce((o, k) => o[k], data)[p.at(-1)] = v;
    dirty = true;
    save.disabled = false;
    notice.textContent = 'UNSAVED CHANGES — save exports a new setup JSON.';
    notice.className = 'notice changed';
  }

  function category(x) {
    let s = (x.p.length ? x.p : x.full).join(' ').toLowerCase();
    if (/tyre|tire|alignment|camber|toe|caster/.test(s)) return 'TYRES';
    if (/electronics|\btc\d|\babs\b|ecumap|telemetry/.test(s)) return 'ELECTRONICS';
    if (/fuel|strategy|pit|brakepad/.test(s)) return 'FUEL & STRATEGY';
    if (/aero|wing|splitter|rideheight/.test(s)) return 'AERO';
    if (/damper|bump|rebound|compression|fast|slow/.test(s)) return 'DAMPERS';
    if (/mechanical|wheelrate|bumpstop|arb|spring/.test(s)) return 'MECHANICAL GRIP';
    return 'OTHER';
  }

  function label(x) {
    let k = x.p.length ? x.p.at(-1) : x.full.at(-1);
    if (typeof k === 'number') return wheel[k] || 'Wheel ' + (k + 1);
    if (k === 'aRBFront') return 'ARB Front';
    if (k === 'aRBRear') return 'ARB Rear';
    if (/^tC\d+$/.test(k)) return 'TC ' + k.slice(2);
    if (k === 'eCUMap') return 'ECU Map';
    if (k === 'tyreCompound') return 'Tyre Compound';
    if (k === 'bumpFast' || k === 'fastBump') return 'Bump Fast';
    if (k === 'bumpSlow' || k === 'slowBump') return 'Bump Slow';
    if (k === 'reboundFast' || k === 'fastRebound') return 'Rebound Fast';
    if (k === 'reboundSlow' || k === 'slowRebound') return 'Rebound Slow';
    if (k === 'bumpStopRateUp') return 'Bump Stop Rate Up';
    if (k === 'bumpStopRateDn') return 'Bump Stop Rate Down';
    return human(k);
  }

  function group(x) {
    let a = x.p.length ? x.p : x.full, k = a[1] || a[0] || 'general';
    if (k === 'tyrePressure') return 'Tyre pressures';
    if (k === 'tyreCompound') return 'Tyre compound';
    if (k === 'toe' || k === 'toeOutLinear') return 'Toe';
    if (k === 'camber' || k === 'staticCamber') return 'Camber';
    if (/bump|rebound|damper|compression|fast|slow/i.test(String(k))) return label({ p: [k], full: [k] });
    if (a[0] === 'electronics') return 'Electronics';
    if (a[0] === 'mechanicalBalance') return 'Mechanical balance';
    return human(k);
  }

  const pressure = p => p.includes('tyrePressure');

  function describe(x) {
    let l = label(x), g = group(x);
    helpTitle.textContent = l;
    helpText.textContent = g === 'Tyre pressures' 
      ? 'Tyre pressure is displayed as JSON value ÷ 10 + 20.2 PSI. Saving converts it back to the JSON value.' 
      : g === 'Toe' || g === 'Camber' 
        ? 'Each wheel is shown in its real car position so front/rear and left/right values are easy to compare.' 
        : 'Adjust this setup value with the left and right arrows, or type an exact value. The original setup is preserved until you save a copy.';
  }

  function num(p, v, x) {
    let w = document.createElement('div');
    w.className = 'control';
    let i = document.createElement('input');
    i.className = 'value';
    i.type = 'number';
    let isPressure = pressure(p),
        isSteer = p.includes('steerRatio'),
        isToe = p.includes('toe'),
        isBrakeTorque = p.includes('brakeTorque'),
        raw = Number(v),
        shownRaw = isPressure ? raw / 10 + 20.2 : isSteer ? 16 - raw : isToe ? -0.4 + raw / 100 : raw,
        shown = isPressure ? Number(shownRaw.toFixed(1)) : isToe ? Number(shownRaw.toFixed(2)) : shownRaw,
        decimals = (String(shown).split('.')[1] || '').length;

    i.step = isPressure ? 0.1 : isToe ? 0.01 : (decimals ? Math.pow(10, -Math.min(decimals, 3)) : 1);
    i.value = isPressure ? shown.toFixed(1) : isToe ? shown.toFixed(2) : shown;
    i.oninput = () => {
      if (Number.isFinite(Number(i.value))) {
        let entered = Number(i.value),
            stored = isPressure ? Math.round((entered - 20.2) * 10) : isSteer ? 16 - entered : isToe ? Math.round((entered + 0.4) * 100) : entered;
        set(p, stored);
        describe(x);
      }
    };
    w.append(i);
    let unit = isPressure ? 'psi' : isBrakeTorque ? 'Nm' : isToe ? '°' : '';
    if (unit) {
      let u = document.createElement('span');
      u.className = 'unit';
      u.textContent = unit;
      w.append(u);
    }
    return w;
  }

  function control(p, v, x) {
    if (typeof v === 'number') return num(p, v, x);
    let w = document.createElement('div');
    w.className = 'control';
    if (typeof v === 'boolean') {
      let b = document.createElement('button');
      b.type = 'button';
      b.className = 'bool ' + (v ? 'on' : '');
      b.textContent = v ? 'ON' : 'OFF';
      b.onclick = () => {
        let n = !get(p);
        set(p, n);
        b.textContent = n ? 'ON' : 'OFF';
        b.classList.toggle('on', n);
        describe(x);
      };
      w.append(b);
    } else if (v === null) {
      w.textContent = '—';
    } else {
      let i = document.createElement('input');
      i.className = 'textvalue';
      i.value = String(v);
      i.onchange = () => {
        set(p, i.value);
        describe(x);
      };
      w.append(i);
    }
    return w;
  }

  function rowLabel(x) {
    if (category(x) === 'DAMPERS' && typeof x.p.at(-1) === 'number') return group(x) + ' · ' + label(x);
    return label(x);
  }

  function makeRow(x) {
    let r = document.createElement('div');
    r.className = 'row';
    let l = document.createElement('div');
    l.innerHTML = '<div class="label">' + rowLabel(x) + '</div>';
    r.append(l, control(x.full, x.v, x));
    r.onclick = () => describe(x);
    return r;
  }

  function settingName(x) {
    let k = x.p.length > 1 ? x.p.at(-2) : x.full.at(-1);
    if (k === 'tyrePressure') return 'Tyre pressure';
    if (k === 'toeOutLinear' || k === 'toe') return 'Toe';
    if (k === 'staticCamber' || k === 'camber') return 'Camber';
    return human(k);
  }

  function cornerRow(x) {
    let r = document.createElement('div');
    r.className = 'row';
    let l = document.createElement('div');
    l.innerHTML = '<div class="label">' + settingName(x) + '</div>';
    r.append(l, control(x.full, x.v, x));
    r.onclick = () => describe(x);
    return r;
  }

  function tyreLayout(items, generic) {
    let setup = document.createElement('div');
    setup.className = 'setup';
    if (items.length) {
      let scene = document.createElement('section');
      scene.className = 'group';
      scene.innerHTML = '<div class="grouphead">Tyre and alignment setup</div>';
      let grid = document.createElement('div');
      grid.className = 'wheel-layout';
      ['fl', 'fr', 'rl', 'rr'].forEach((place, index) => {
        let card = document.createElement('section');
        card.className = 'tyre-corner ' + place;
        card.innerHTML = '<div class="cornerhead">' + wheel[index] + '</div>';
        let rows = document.createElement('div');
        rows.className = 'cornerrows';
        items.filter(x => x.p.at(-1) === index).forEach(x => rows.append(cornerRow(x)));
        card.append(rows);
        grid.append(card);
      });
      let car = document.createElement('div');
      car.className = 'car-schema';
      car.innerHTML = '<div class="car-arrow"></div><div class="car-top"><i class="car-wheel fl"></i><i class="car-wheel fr"></i><i class="car-wheel rl"></i><i class="car-wheel rr"></i></div>';
      grid.append(car);
      scene.append(grid);
      setup.append(scene);
    }
    let groups = new Map();
    generic.forEach(x => {
      let g = group(x);
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(x);
    });
    groups.forEach((items, name) => {
      let g = document.createElement('section');
      g.className = 'group';
      g.innerHTML = '<div class="grouphead">' + name + '</div>';
      let rows = document.createElement('div');
      rows.className = 'rows';
      items.forEach(x => rows.append(makeRow(x)));
      g.append(rows);
      setup.append(g);
    });
    return setup;
  }

  function all() {
    let out = [];
    Object.entries(data).forEach(([k, v]) => walk(v, [], out).forEach(x => {
      x.full = [k, ...x.p];
      out.push(x);
    }));
    return out;
  }

  function displayKey(x) {
    let p = x.p.length ? x.p : x.full,
        k = p.filter(v => typeof v !== 'number').at(-1) || 'general';
    if (k === 'staticCamber') k = 'camber';
    if (k === 'toeOutLinear') k = 'toe';
    let corner = typeof p.at(-1) === 'number' ? p.at(-1) : 'single';
    return category(x) + '|' + k + '|' + corner;
  }

  function duplicateRank(x) {
    let p = x.p.length ? x.p : x.full,
        k = p.filter(v => typeof v !== 'number').at(-1);
    return k === 'staticCamber' || k === 'toeOutLinear' ? 1 : 0;
  }

  function uniqueSettings(entries) {
    let kept = new Map();
    entries.forEach(x => {
      let key = displayKey(x), current = kept.get(key);
      if (!current || duplicateRank(x) < duplicateRank(current)) kept.set(key, x);
    });
    return [...kept.values()];
  }

  function render() {
    let entries = uniqueSettings(all()),
        byCat = Object.fromEntries(cats.map(c => [c, entries.filter(x => category(x) === c)]));
    if (!byCat[active].length) active = cats.find(c => byCat[c].length) || 'OTHER';
    tabs.innerHTML = '';
    cats.slice(0, 6).forEach(c => {
      let total = byCat[c].length, b = document.createElement('button');
      b.className = 'tab ' + (c === active ? 'active' : '');
      b.disabled = !total;
      b.innerHTML = '<span>' + c + '</span><small>' + total + ' SETTINGS</small>';
      b.onclick = () => { active = c; render(); };
      tabs.append(b);
    });
    content.innerHTML = '';
    let head = document.createElement('div');
    head.className = 'pagehead';
    head.innerHTML = '<h1>' + active + '</h1><span>' + byCat[active].length + ' SETTINGS</span>';
    content.append(head);
    let wheelItems = active === 'TYRES' ? byCat[active].filter(x => typeof x.p.at(-1) === 'number' && x.p.at(-1) >= 0 && x.p.at(-1) < 4) : [];
    let standard = active === 'TYRES' ? byCat[active].filter(x => !wheelItems.includes(x)) : byCat[active];
    let setup;
    if (active === 'TYRES') setup = tyreLayout(wheelItems, standard);
    else {
      setup = document.createElement('div');
      setup.className = 'setup';
      let groups = new Map();
      standard.forEach(x => {
        let g = group(x);
        if (!groups.has(g)) groups.set(g, []);
        groups.get(g).push(x);
      });
      groups.forEach((items, name) => {
        let g = document.createElement('section');
        g.className = 'group ' + (items.length === 4 && items.every(x => typeof x.p.at(-1) === 'number') ? 'wheelgroup' : '');
        g.innerHTML = '<div class="grouphead">' + name + '</div>';
        let holder = document.createElement('div');
        holder.className = items.length === 4 && items.every(x => typeof x.p.at(-1) === 'number') ? 'wheels' : 'rows';
        items.forEach(x => holder.append(makeRow(x)));
        g.append(holder);
        setup.append(g);
      });
    }
    content.append(setup);
    save.disabled = false;
  }

  async function open(x) {
    if (!x) return;
    try {
      let d = JSON.parse(await x.text());
      if (!d || typeof d !== 'object' || Array.isArray(d)) throw Error('Top-level JSON must be an object.');
      data = d;
      fileName = x.name.replace(/\.json$/i, '') + '-edited.json';
      dirty = false;
      notice.textContent = 'LOADED ' + x.name.toUpperCase();
      notice.className = 'notice';
      fileLine.textContent = 'FILE: ' + fileName;
      render();
    } catch (e) {
      notice.textContent = 'Could not load setup: ' + e.message;
      notice.className = 'notice error';
    }
  }

  f.onchange = e => open(e.target.files[0]);
  document.addEventListener('dragover', e => e.preventDefault());
  document.addEventListener('drop', e => {
    e.preventDefault();
    open(e.dataTransfer.files[0]);
  });
  save.onclick = () => {
    let b = new Blob([JSON.stringify(data, null, 2) + '\n'], { type: 'application/json' }),
        u = URL.createObjectURL(b),
        a = document.createElement('a');
    a.href = u;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(u);
    notice.textContent = 'SETUP SAVED: ' + fileName;
    notice.className = 'notice';
  };
})();