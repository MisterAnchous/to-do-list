(() => {
  'use strict';

  const STORAGE_KEY = 'todo-list:v1';
  const EASE = 'cubic-bezier(.4,0,0,1)';
  const POLISH_EASE = 'cubic-bezier(.2,.8,.2,1)';
  const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  const drawerQuery = matchMedia('(max-width: 1050px)');
  const $ = (id) => document.getElementById(id);
  const ui = Object.fromEntries(['sidebar', 'main', 'main-nav', 'trash-nav', 'custom-lists', 'new-list-host', 'new-list-button', 'nav-toggle', 'nav-selection', 'drawer-backdrop', 'appearance-toggle', 'page-title', 'page-subtitle', 'list-appearance-button', 'heading-action', 'composer', 'task-input', 'composer-list', 'add-task-button', 'task-list', 'empty-state', 'empty-art', 'empty-title', 'trash-toolbar', 'empty-trash-button', 'menu-root', 'toast', 'toast-message', 'toast-close', 'announcer', 'confirm-dialog', 'confirm-title', 'confirm-description', 'confirm-submit', 'dialog-icon'].map((id) => [id.replace(/-([a-z])/g, (_, char) => char.toUpperCase()), $(id)]));
  const colors = ['#5f99e8', '#9a7ae8', '#d0a15c', '#62a99a', '#d5869e', '#8ca3bc'];
  const listPalette = ['#0067bb', '#008fff', '#00bef1', '#00b8ae', '#00bf78', '#e1b400', '#f6e697', '#ff625b', '#ff0050', '#c60016', '#c500aa', '#f65bea', '#8843ff', '#523bff', '#9098aa', '#82786e'];
  const sapphireFiles = ['01_blue_0067BB.webp', '02_sky_blue_008FFF.webp', '03_cyan_00BEF1.webp', '04_turquoise_00B8AE.webp', '05_green_00BF78.webp', '06_gold_E1B400.webp', '07_pale_yellow_F6E697.webp', '08_coral_FF625B.webp', '09_hot_pink_FF0050.webp', '10_red_C60016.webp', '11_magenta_C500AA.webp', '12_pink_lilac_F65BEA.webp', '13_purple_8843FF.webp', '14_blue_violet_523BFF.webp', '15_gray_blue_9098AA.webp', '16_gray_brown_82786E.webp'];
  const sapphireColors = new Map(listPalette.map((color, index) => [color, sapphireFiles[index]]));
  const sapphireLabs = listPalette.map(colorToOklab);
  const sapphireCategories = { all: 'all-tasks-gray-brown.webp', active: 'active-coral-orange.webp', completed: 'completed-green.webp', trash: 'trash-red.webp' };
  const listEmojis = ['🏠', '💼', '📚', '✏️', '💡', '🎯', '🗓️', '📌', '🌱', '🌿', '🌸', '☀️', '🌙', '⭐', '❤️', '✨', '☕', '🍎', '🥑', '🍋', '🍰', '🛒', '🎁', '🎨', '🎵', '🎬', '🎮', '📷', '🚲', '🚗', '✈️', '🧳', '🏃', '🧘', '🏋️', '⚽', '🐈', '🐕', '🐢', '🦋'];
  const rowNodes = new Map();
  const layoutAnimations = new WeakMap();
  const morphAnimations = new WeakMap();
  const holding = new Map();
  const navNodes = new Map();
  const feedbackAnimations = new WeakMap();
  const revealAnimations = new Map();
  const closingMenus = new Set();
  const polishAnimations = new Set();
  let emptyArtKey = '';
  let view = { type: 'all', id: null };
  let composerListId = null;
  let menu = null;
  let toastTimer;
  let dialogAction = null;
  let dialogFocus = null;
  let drawerOpen = false;
  let creatingList = false;
  let editingListId = null;
  let storageProblem = false;
  let initialLoadProblem = '';
  let firstRender = true;

  function svg(content, size = 18, className = '') {
    return `<svg class="${className}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${content}</svg>`;
  }
  const icons = {
    all: svg('<rect x="4" y="4" width="16" height="16" rx="5"/><path d="M8 9h8M8 13h6M8 17h3"/>', 17),
    active: svg('<rect x="4" y="4" width="16" height="16" rx="5"/>', 17),
    completed: svg('<rect x="4" y="4" width="16" height="16" rx="5"/><path d="m8 12 2.7 2.7L16 9"/>', 17),
    trash: svg('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5"/>', 17),
    more: svg('<circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none"/>', 17),
    plus: svg('<path d="M12 5v14M5 12h14"/>', 17),
    enter: svg('<path d="M18 6v7a3 3 0 0 1-3 3H5m4-4-4 4 4 4"/>', 16),
    chevron: svg('<path d="m8 10 4 4 4-4"/>', 12, 'chevron'),
    menu: svg('<path d="M5 7h14M5 12h14M5 17h10"/>', 19),
    appearance: svg('<circle cx="12" cy="12" r="7.5"/><path d="M12 4.5v15A7.5 7.5 0 0 0 12 4.5Z" fill="currentColor" stroke="none"/>', 19),
    sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4 19 5"/>', 17),
    moon: svg('<path d="M20 14a8 8 0 0 1-10-10 8 8 0 1 0 10 10Z"/>', 17),
    black: svg('<circle cx="12" cy="12" r="8" fill="currentColor" stroke="none"/>', 17),
    tick: svg('<path d="m6 12 4 4 8-8"/>', 15),
    move: svg('<path d="M4 7h8M4 12h12M4 17h8m2-9 4 4-4 4"/>', 17),
    back: svg('<path d="m10 5-7 7 7 7M3 12h17"/>', 16),
    rename: svg('<path d="m15 4 5 5M4 20l5-1L20 8a2 2 0 0 0-4-4L5 15l-1 5Z"/>', 16),
    restore: svg('<path d="M4 10a8 8 0 1 1 1 8M4 5v5h5M12 8v4l3 2"/>', 17),
    delete: svg('<path d="m8 8 8 8M16 8l-8 8"/>', 17),
  };

  function sapphireImage(file, isList = false) {
    return `<img class="sapphire-image${isList ? ' sapphire-list-image' : ''}" src="sapphire-icon-set/${file}" width="${isList ? 28 : 22}" height="${isList ? 28 : 22}" alt="" aria-hidden="true" draggable="false" decoding="async">`;
  }
  function emptyArtwork() {
    if (view.type === 'list') return listSymbol(listById(view.id));
    const artwork = el('span');
    artwork.innerHTML = sapphireImage(sapphireCategories[view.type === 'active' ? 'completed' : view.type] || sapphireCategories.all);
    return artwork;
  }
  function updateSceneAccent() {
    const root = document.documentElement;
    if (view.type !== 'list') {
      root.style.removeProperty('--scene-accent');
      root.style.removeProperty('--scene-companion');
      return;
    }
    const color = listColor(view.id);
    root.style.setProperty('--scene-accent', color);
    const rgb = color.slice(1).match(/../g).map((channel) => parseInt(channel, 16) / 255);
    const max = Math.max(...rgb), min = Math.min(...rgb), delta = max - min;
    let hue = 0;
    if (delta) hue = max === rgb[0] ? (rgb[1] - rgb[2]) / delta : max === rgb[1] ? (rgb[2] - rgb[0]) / delta + 2 : (rgb[0] - rgb[1]) / delta + 4;
    const lightness = (max + min) / 2;
    const saturation = delta ? delta / (1 - Math.abs(2 * lightness - 1)) : 0;
    root.style.setProperty('--scene-companion', `hsl(${(hue * 60 + 405) % 360} ${Math.min(100, saturation * 115)}% ${Math.min(65, Math.max(40, lightness * 100))}%)`);
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function button(className, label, icon) {
    const node = el('button', className);
    node.type = 'button';
    if (label) node.setAttribute('aria-label', label);
    if (icon) node.innerHTML = icon;
    return node;
  }
  function uid() {
    return crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }
  function plural(number, forms = ['задача', 'задачи', 'задач']) {
    const n = Math.abs(number) % 100;
    return forms[n > 10 && n < 20 ? 2 : n % 10 === 1 ? 0 : n % 10 > 1 && n % 10 < 5 ? 1 : 2];
  }
  const countLabel = (count) => `${count} ${plural(count)}`;
  function normalizeColor(value) {
    if (typeof value !== 'string') return null;
    const hex = value.trim().replace(/^#/, '');
    if (/^[\da-f]{6}$/i.test(hex)) return `#${hex.toLowerCase()}`;
    if (/^[\da-f]{3}$/i.test(hex)) return `#${[...hex].map((char) => char + char).join('').toLowerCase()}`;
    return null;
  }
  function colorToOklab(color) {
    const [r, g, b] = color.slice(1).match(/../g).map((channel) => {
      const value = parseInt(channel, 16) / 255;
      return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
    });
    const l = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b);
    const m = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b);
    const s = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b);
    return [.2104542553 * l + .793617785 * m - .0040720468 * s, 1.9779984951 * l - 2.428592205 * m + .4505937099 * s, .0259040371 * l + .7827717662 * m - .808675766 * s];
  }
  function sapphireFile(color) {
    const exact = sapphireColors.get(color);
    if (exact) return exact;
    const target = colorToOklab(color);
    let closest = 0, bestDistance = Infinity;
    sapphireLabs.forEach((sample, index) => {
      const distance = sample.reduce((sum, value, channel) => sum + (value - target[channel]) ** 2, 0);
      if (distance < bestDistance) { closest = index; bestDistance = distance; }
    });
    return sapphireFiles[closest];
  }
  function defaultListColor(id, palette = colors) {
    let hash = 0;
    for (const char of id || '') hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
    return palette[Math.abs(hash) % palette.length];
  }
  function listColor(id) {
    const saved = listById(id)?.color;
    if (saved) return saved;
    return defaultListColor(id);
  }
  function paintListSymbol(node, list) {
    node.classList.add('list-symbol');
    node.classList.toggle('is-emoji', Boolean(list?.emoji));
    const color = list?.color || listColor(list?.id);
    node.style.setProperty('--list-color', color);
    if (list?.emoji) node.textContent = list.emoji;
    else node.innerHTML = sapphireImage(sapphireFile(color), true);
    node.setAttribute('aria-hidden', 'true');
  }
  function listSymbol(list, small = false) {
    const node = el('span', small ? 'list-symbol-small' : '');
    paintListSymbol(node, list);
    return node;
  }
  function activeLists() { return state.lists.filter((list) => !list.deletedAt); }
  function listById(id) { return state.lists.find((list) => list.id === id); }
  function taskById(id) { return state.tasks.find((task) => task.id === id); }
  function liveTask(task) { return !task.deletedAt && !listById(task.listId)?.deletedAt; }
  function tasksInCurrentView() {
    return state.tasks.filter((task) => liveTask(task) && (view.type === 'all' || (view.type === 'active' && !task.completed) || (view.type === 'completed' && task.completed) || (view.type === 'list' && task.listId === view.id)));
  }
  function trashItems() {
    const lists = state.lists.filter((list) => list.deletedAt).map((list) => ({ kind: 'list', item: list }));
    const tasks = state.tasks.filter((task) => task.deletedAt && !listById(task.listId)?.deletedAt).map((task) => ({ kind: 'task', item: task }));
    return [...lists, ...tasks].sort((a, b) => b.item.deletedAt - a.item.deletedAt);
  }
  function loadState() {
    const empty = { version: 1, tasks: [], lists: [], theme: 'light' };
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return empty;
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.tasks) || !Array.isArray(parsed.lists)) throw new Error('Invalid saved data');
      const listIds = new Set();
      const lists = parsed.lists.filter((list) => list && typeof list.id === 'string' && !listIds.has(list.id) && typeof list.name === 'string' && list.name.trim() && (listIds.add(list.id), true)).map((list) => ({ id: list.id, name: list.name.trim(), color: normalizeColor(list.color), emoji: listEmojis.includes(list.emoji) ? list.emoji : null, deletedAt: typeof list.deletedAt === 'number' && list.deletedAt > 0 ? list.deletedAt : null }));
      const taskIds = new Set();
      const tasks = parsed.tasks.filter((task) => task && typeof task.id === 'string' && !taskIds.has(task.id) && typeof task.text === 'string' && task.text.trim() && (taskIds.add(task.id), true)).map((task) => ({ id: task.id, text: task.text.trim(), completed: task.completed === true, listId: typeof task.listId === 'string' && listIds.has(task.listId) ? task.listId : null, deletedAt: typeof task.deletedAt === 'number' && task.deletedAt > 0 ? task.deletedAt : null }));
      return { version: 1, tasks, lists, theme: ['light', 'dark', 'black'].includes(parsed.theme) ? parsed.theme : 'light' };
    } catch (error) {
      initialLoadProblem = error instanceof SyntaxError || error.message === 'Invalid saved data' ? 'Не удалось прочитать сохранённые данные. Новые изменения будут сохранены заново.' : 'Сохранение недоступно. Задачи останутся только на этой странице.';
      return empty;
    }
  }
  const state = loadState();
  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      if (storageProblem) { storageProblem = false; notify('Сохранение снова доступно.'); }
    } catch {
      if (!storageProblem) notify('Сохранение недоступно. Задачи останутся только на этой странице.', 10000);
      storageProblem = true;
    }
  }
  function announce(text) {
    ui.announcer.textContent = '';
    requestAnimationFrame(() => { ui.announcer.textContent = text; });
  }
  function notify(text, duration = 5000) {
    clearTimeout(toastTimer);
    ui.toastMessage.textContent = text;
    ui.toast.hidden = false;
    toastTimer = setTimeout(() => { ui.toast.hidden = true; }, duration);
  }

  function playPolish(node, frames, options) {
    if (!node) return null;
    const animation = node.animate(frames, options);
    polishAnimations.add(animation);
    animation.finished.then(() => polishAnimations.delete(animation), () => polishAnimations.delete(animation));
    return animation;
  }
  function feedback(node, type = 'press') {
    if (!node) return;
    const previous = feedbackAnimations.get(node);
    const start = previous ? getComputedStyle(node).transform : null;
    previous?.cancel();
    let frames, duration;
    if (motionQuery.matches) { frames = [{ opacity: .75 }, { opacity: 1 }]; duration = 70; }
    else if (type === 'nav' || type === 'theme') { frames = [{ transform: start && start !== 'none' ? start : 'scale(.96)' }, { transform: 'scale(1)' }]; duration = 180; }
    else if (type === 'check') { frames = [{ opacity: 0 }, { opacity: 1 }]; duration = 120; }
    else { frames = [{ transform: start && start !== 'none' ? start : 'scale(.97)' }, { transform: 'scale(1)' }]; duration = 120; }
    feedbackAnimations.set(node, playPolish(node, frames, { duration, easing: POLISH_EASE }));
  }
  function reveal(node, { delay = 0, duration = 200, y = 4, rotate = 0 } = {}) {
    if (!node) return;
    const previous = revealAnimations.get(node);
    const current = previous ? getComputedStyle(node) : null;
    const opacity = current?.opacity || 0;
    const transform = current?.transform;
    previous?.cancel();
    const frames = motionQuery.matches ? [{ opacity }, { opacity: 1 }] : [{ opacity, transform: transform && transform !== 'none' ? transform : `translateY(${y}px) rotate(${rotate}deg)` }, { opacity: 1, transform: 'translateY(0) rotate(0)' }];
    const animation = playPolish(node, frames, { duration: motionQuery.matches ? 70 : duration, delay: motionQuery.matches ? 0 : delay, easing: POLISH_EASE, fill: 'backwards' });
    revealAnimations.set(node, animation);
    animation.finished.then(() => { if (revealAnimations.get(node) === animation) revealAnimations.delete(node); }, () => { if (revealAnimations.get(node) === animation) revealAnimations.delete(node); });
  }
  function revealEmpty() {
    reveal(ui.emptyArt, { duration: 180, y: 3 });
    reveal(ui.emptyTitle, { delay: 20, duration: 180, y: 3 });
  }
  function revealView() {
    [ui.pageTitle.parentElement, ui.pageSubtitle].forEach((node, index) => reveal(node, { delay: index * 20, duration: 200 }));
    [ui.composer, ui.trashToolbar, ui.taskList].forEach((node) => { if (!node.hidden) reveal(node, { delay: 35, duration: 200 }); });
  }
  function cancelPolishWithin(node) {
    for (const animation of [...polishAnimations]) if (node.contains(animation.effect?.target)) animation.cancel();
  }

  function makeNav(type, label, count, id = null) {
    const selected = view.type === type && (type !== 'list' || view.id === id);
    const key = `${type}:${id || ''}`;
    const existing = navNodes.get(key);
    if (existing) {
      existing.classList.toggle('selected', selected);
      existing.querySelector('.nav-label').textContent = label;
      existing.querySelector('.nav-count').textContent = String(count);
      existing.querySelector('.nav-count').classList.toggle('zero', count === 0);
      const main = existing.querySelector('.nav-main');
      if (selected) main.setAttribute('aria-current', 'page'); else main.removeAttribute('aria-current');
      existing.querySelector('.nav-more')?.setAttribute('aria-label', `Действия со списком «${label}»`);
      if (type === 'list') paintListSymbol(existing.querySelector('.nav-icon'), listById(id));
      return existing;
    }
    const wrap = el('div', `nav-item${selected ? ' selected' : ''}`);
    wrap.dataset.view = type;
    if (id) wrap.dataset.listId = id;
    const main = button('nav-main');
    if (selected) main.setAttribute('aria-current', 'page');
    const icon = el('span', `nav-icon${type === 'list' ? ' list-icon' : ''}`);
    if (type === 'list') paintListSymbol(icon, listById(id));
    else icon.innerHTML = sapphireImage(sapphireCategories[type] || sapphireCategories.all);
    main.append(icon, el('span', 'nav-label', label));
    main.addEventListener('click', () => selectView(type, id));
    wrap.append(main);
    if (type === 'list') {
      const more = button('nav-more', `Действия со списком «${label}»`, icons.more);
      more.setAttribute('aria-haspopup', 'menu'); more.setAttribute('aria-expanded', 'false');
      more.addEventListener('click', () => openListMenu(id, more));
      wrap.append(more);
    }
    const counter = el('span', `nav-count${count === 0 ? ' zero' : ''}`, String(count));
    counter.setAttribute('aria-hidden', 'true');
    wrap.append(counter);
    navNodes.set(key, wrap);
    return wrap;
  }
  function syncChildren(host, nodes) {
    const desired = new Set(nodes);
    for (const child of [...host.children]) if (!desired.has(child)) child.remove();
    let cursor = host.firstElementChild;
    for (const node of nodes) {
      if (node === cursor) cursor = cursor.nextElementSibling;
      else host.insertBefore(node, cursor);
    }
  }
  function updateNavSelection(animate = true) {
    const selected = ui.sidebar.querySelector('.nav-item.selected');
    if (!selected) { ui.navSelection.hidden = true; return; }
    ui.navSelection.hidden = false;
    const rect = selected.getBoundingClientRect();
    const parent = ui.navSelection.parentElement.getBoundingClientRect();
    if (!animate) ui.navSelection.style.transition = 'none';
    ui.navSelection.style.height = `${rect.height}px`;
    ui.navSelection.style.transform = `translateY(${rect.top - parent.top}px)`;
    const accents = { all: '#8a85e8', active: '#e6ad57', completed: '#54ba97', trash: '#df8da4' };
    ui.navSelection.style.setProperty('--selection-accent', view.type === 'list' ? listColor(view.id) : accents[view.type]);
    if (!animate) requestAnimationFrame(() => { ui.navSelection.style.transition = ''; });
  }
  function renderNavigation() {
    const live = state.tasks.filter(liveTask);
    syncChildren(ui.mainNav, [makeNav('all', 'Все задачи', live.length), makeNav('active', 'Активные', live.filter((task) => !task.completed).length), makeNav('completed', 'Выполненные', live.filter((task) => task.completed).length)]);
    const custom = [];
    for (const list of activeLists()) {
      if (editingListId === list.id) custom.push(ui.customLists.querySelector('.renaming') || makeRenameForm(list));
      else custom.push(makeNav('list', list.name, live.filter((task) => task.listId === list.id).length, list.id));
    }
    syncChildren(ui.customLists, custom);
    syncChildren(ui.trashNav, [makeNav('trash', 'Корзина', trashItems().length)]);
    if (creatingList && !ui.newListHost.querySelector('form')) createListForm();
    updateNavSelection(!firstRender);
  }
  function renderHeader() {
    updateSceneAccent();
    const tasks = tasksInCurrentView();
    const date = new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
    if (view.type === 'all') {
      const hour = new Date().getHours();
      ui.pageTitle.textContent = hour >= 5 && hour < 12 ? 'Доброе утро' : hour >= 12 && hour < 18 ? 'Добрый день' : hour >= 18 && hour < 23 ? 'Добрый вечер' : 'Доброй ночи';
      ui.pageSubtitle.textContent = `${date} · ${countLabel(tasks.length)}`;
    } else {
      ui.pageTitle.textContent = view.type === 'list' ? listById(view.id)?.name || 'Список' : view.type === 'active' ? 'Активные' : view.type === 'completed' ? 'Выполненные' : 'Корзина';
      ui.pageSubtitle.textContent = view.type === 'trash' ? `${trashItems().length} ${plural(trashItems().length, ['объект', 'объекта', 'объектов'])}` : countLabel(tasks.length);
    }
    ui.headingAction.hidden = view.type !== 'list';
    ui.listAppearanceButton.hidden = view.type !== 'list';
    if (view.type === 'list') {
      ui.listAppearanceButton.replaceChildren(listSymbol(listById(view.id)));
      ui.listAppearanceButton.setAttribute('aria-label', `Значок и цвет списка «${listById(view.id).name}»`);
    }
    ui.composer.hidden = view.type === 'completed' || view.type === 'trash';
    ui.trashToolbar.hidden = view.type !== 'trash' || trashItems().length === 0;
    renderComposerList();
  }
  function renderComposerList() {
    const list = listById(composerListId);
    if (composerListId && (!list || list.deletedAt)) composerListId = null;
    const dot = el('span', 'picker-color');
    dot.style.setProperty('--picker-color', composerListId ? listColor(composerListId) : 'var(--muted)');
    const name = composerListId ? listById(composerListId).name : 'Без списка';
    ui.composerList.replaceChildren(composerListId ? listSymbol(listById(composerListId), true) : dot, el('span', 'list-picker-label', name));
    ui.composerList.insertAdjacentHTML('beforeend', icons.chevron);
    ui.composerList.title = name;
    ui.composerList.setAttribute('aria-label', `Список для новой задачи: ${name}`);
  }
  function selectView(type, id = null) {
    const changed = view.type !== type || view.id !== id;
    closeMenu(false);
    cancelEditing();
    clearHolding();
    view = { type, id };
    composerListId = type === 'list' ? id : null;
    render();
    closeDrawer(false);
    (drawerQuery.matches ? ui.pageTitle : ui.sidebar.querySelector('[aria-current="page"]'))?.focus({ preventScroll: true });
    if (changed) {
      feedback(ui.sidebar.querySelector('.nav-item.selected .nav-icon'), 'nav');
      revealView();
    }
    announce(type === 'list' ? `Список ${listById(id)?.name || ''}` : ui.pageTitle.textContent);
  }
  function renderEmpty(count) {
    const wasHidden = ui.emptyState.hidden;
    ui.emptyState.hidden = count > 0;
    if (count) return;
    ui.emptyTitle.textContent = view.type === 'trash' ? 'Корзина пуста' : view.type === 'completed' ? 'Пока нет выполненных задач' : view.type === 'active' ? 'Всё готово' : view.type === 'list' ? 'В списке пока нет задач' : 'Пока нет задач';
    const key = `${view.type}:${view.id || ''}:${view.type === 'list' ? `${listColor(view.id)}:${listById(view.id)?.emoji || ''}` : ''}`;
    if (emptyArtKey !== key || wasHidden) { ui.emptyArt.replaceChildren(emptyArtwork()); emptyArtKey = key; revealEmpty(); }
  }

  function shapePoints(x = 0, y = 0, width = 20, height = 20, bend = 0) {
    const right = x + width, bottom = y + height, radius = Math.min(6, height / 3);
    return [x + radius, y, right - radius, y, right, y, right, y + radius, right + bend, y + height * .4, right + bend, y + height * .6, right, bottom - radius, right, bottom, right - radius, bottom, x + radius, bottom, x, bottom, x, bottom - radius, x - bend * .25, y + height * .6, x - bend * .25, y + height * .4, x, y + radius, x, y, x + radius, y];
  }
  function shapePath(p) {
    return `M${p[0]},${p[1]}L${p[2]},${p[3]}Q${p[4]},${p[5]} ${p[6]},${p[7]}C${p[8]},${p[9]} ${p[10]},${p[11]} ${p[12]},${p[13]}Q${p[14]},${p[15]} ${p[16]},${p[17]}L${p[18]},${p[19]}Q${p[20]},${p[21]} ${p[22]},${p[23]}C${p[24]},${p[25]} ${p[26]},${p[27]} ${p[28]},${p[29]}Q${p[30]},${p[31]} ${p[32]},${p[33]}Z`;
  }
  const normalShape = shapePoints();
  function makeTaskRow(task) {
    const row = el('div', 'task-row');
    row.dataset.taskId = task.id;
    const check = button('task-checkbox', '');
    check.setAttribute('role', 'checkbox');
    check.innerHTML = `<svg class="checkbox-svg" width="32" height="28" viewBox="-4 -4 32 28" aria-hidden="true"><path class="checkbox-shape" d="${shapePath(normalShape)}"/><path class="checkbox-tick" d="m5.8 10 2.8 2.8 5.7-5.6"/></svg>`;
    check.addEventListener('click', () => toggleTask(task.id));
    const content = el('div', 'task-content');
    content.append(el('span', 'task-text', task.text));
    const end = el('div', 'task-end');
    const badge = el('span', 'task-list-badge');
    badge.append(el('span', 'tiny-list-dot'));
    const more = button('task-more', 'Действия с задачей', icons.more);
    more.setAttribute('aria-haspopup', 'menu'); more.setAttribute('aria-expanded', 'false');
    more.addEventListener('click', () => openTaskMenu(task.id, more));
    end.append(badge, more);
    row.append(check, content, end);
    updateTaskRow(row, task);
    return row;
  }
  function updateTaskRow(row, task) {
    row.classList.toggle('is-completed', task.completed);
    const check = row.querySelector('.task-checkbox');
    check.setAttribute('aria-checked', String(task.completed));
    check.setAttribute('aria-label', `${task.completed ? 'Вернуть в активные' : 'Выполнить'}: ${task.text}`);
    row.querySelector('.task-text').textContent = task.text;
    const list = listById(task.listId);
    const badge = row.querySelector('.task-list-badge');
    badge.hidden = !list || view.type === 'list';
    if (list) { badge.replaceChildren(listSymbol(list, true)); badge.title = list.name; badge.setAttribute('aria-label', `Список: ${list.name}`); }
    row.querySelector('.task-more').setAttribute('aria-label', `Действия с задачей «${task.text}»`);
  }
  function makeTrashRow(kind, item) {
    const row = el('div', 'task-row trash-row');
    row.dataset.trashId = `${kind}:${item.id}`;
    const icon = el('span', 'trash-row-icon');
    if (kind === 'list') paintListSymbol(icon, item);
    else icon.innerHTML = icons.active;
    const content = el('div', 'task-content');
    const name = item.name || item.text;
    const title = el('div', 'trash-row-title', name);
    const count = state.tasks.filter((task) => task.listId === item.id).length;
    const parentList = listById(item.listId);
    const subtitle = kind === 'list' ? `Список · ${countLabel(count)}` : `Задача${parentList ? ` · ${parentList.name}` : ''}`;
    content.append(title, el('div', 'trash-row-subtitle', subtitle));
    const actions = el('div', 'trash-row-actions');
    const restore = button('restore-button', `Восстановить ${kind === 'list' ? 'список' : 'задачу'} «${name}»`, icons.restore);
    restore.title = 'Восстановить';
    restore.addEventListener('click', () => restoreItem(kind, item.id));
    const remove = button('delete-forever-button', `Удалить навсегда ${kind === 'list' ? 'список' : 'задачу'} «${name}»`, icons.delete);
    remove.title = 'Удалить навсегда';
    remove.addEventListener('click', () => confirmPermanentDelete(kind, item.id));
    actions.append(restore, remove);
    row.append(icon, content, actions);
    return row;
  }
  function capturePositions() {
    const positions = new Map();
    for (const [key, node] of rowNodes) {
      if (node.isConnected) positions.set(key, node.getBoundingClientRect());
      layoutAnimations.get(node)?.cancel();
      layoutAnimations.delete(node);
    }
    return positions;
  }
  function animateLayout(node, from, to) {
    if (motionQuery.matches) return;
    const x = from.left - to.left, y = from.top - to.top;
    if (Math.abs(x) < .1 && Math.abs(y) < .1) return;
    const animation = node.animate([{ transform: `translate(${x}px,${y}px)` }, { transform: 'translate(0,0)' }], { duration: 220, easing: EASE });
    layoutAnimations.set(node, animation);
    animation.onfinish = () => { if (layoutAnimations.get(node) === animation) layoutAnimations.delete(node); };
  }
  function removeAnimated(node, rect) {
    if (!rect || firstRender) { node.remove(); return; }
    const ghost = node.cloneNode(true);
    ghost.classList.add('row-ghost');
    ghost.setAttribute('aria-hidden', 'true');
    ghost.inert = true;
    Object.assign(ghost.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
    document.body.append(ghost);
    node.remove();
    const frames = motionQuery.matches ? [{ opacity: 1 }, { opacity: 0 }] : [{ opacity: 1, transform: 'translateX(0) scale(1)' }, { opacity: 0, transform: 'translateX(8px) scale(.985)' }];
    ghost.animate(frames, { duration: motionQuery.matches ? 70 : 160, easing: EASE }).finished.then(() => ghost.remove()).catch(() => ghost.remove());
  }
  function renderRows() {
    const positions = capturePositions();
    const trash = view.type === 'trash';
    const visibleIds = new Set(tasksInCurrentView().map((task) => task.id));
    const entries = trash ? trashItems().map(({ kind, item }) => ({ key: `${kind}:${item.id}`, kind, item })) : state.tasks.filter((task) => visibleIds.has(task.id) || (holding.has(task.id) && liveTask(task))).map((item) => ({ key: `task:${item.id}`, kind: 'task', item }));
    const desired = new Set(entries.map((entry) => `${trash ? 'trash:' : 'live:'}${entry.key}`));
    for (const [key, node] of rowNodes) {
      if (!desired.has(key)) {
        const hadFocus = node.contains(document.activeElement);
        removeAnimated(node, positions.get(key));
        rowNodes.delete(key);
        if (hadFocus) requestAnimationFrame(() => (ui.taskList.querySelector('button') || (!ui.composer.hidden && ui.taskInput) || ui.pageTitle).focus({ preventScroll: true }));
      }
    }
    const added = new Set();
    let cursor = ui.taskList.firstElementChild;
    for (const entry of entries) {
      const key = `${trash ? 'trash:' : 'live:'}${entry.key}`;
      let node = rowNodes.get(key);
      if (!node) {
        node = trash ? makeTrashRow(entry.kind, entry.item) : makeTaskRow(entry.item);
        rowNodes.set(key, node); added.add(node);
      } else if (!trash) updateTaskRow(node, entry.item);
      if (node === cursor) cursor = cursor.nextElementSibling;
      else ui.taskList.insertBefore(node, cursor);
    }
    for (const [key, node] of rowNodes) {
      if (added.has(node)) {
        if (!firstRender) {
          const frames = motionQuery.matches ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'translateY(0)' }];
          const animation = node.animate(frames, { duration: motionQuery.matches ? 70 : 180, easing: EASE });
          layoutAnimations.set(node, animation);
          animation.onfinish = () => { if (layoutAnimations.get(node) === animation) layoutAnimations.delete(node); };
        }
      } else if (positions.has(key)) animateLayout(node, positions.get(key), node.getBoundingClientRect());
    }
    renderEmpty(entries.length);
  }
  function render() {
    renderNavigation();
    renderHeader();
    renderRows();
    firstRender = false;
  }
  function clearHolding() {
    for (const timer of holding.values()) clearTimeout(timer);
    holding.clear();
  }
  function animateCheckbox(row) {
    if (!row) return;
    const path = row.querySelector('.checkbox-shape');
    const previous = morphAnimations.get(path);
    if (previous) cancelAnimationFrame(previous.frame);
    if (motionQuery.matches) { morphAnimations.delete(path); path.setAttribute('d', shapePath(normalShape)); return; }
    const startShape = previous?.points || normalShape;
    const keyframes = [startShape, shapePoints(1.8, 2, 15.8, 16, -2.5), shapePoints(-.8, .5, 21, 19, 3.6), normalShape];
    const stops = [0, .24, .53, 1];
    const animation = { frame: 0, points: startShape };
    morphAnimations.set(path, animation);
    const start = performance.now();
    function tick(now) {
      const progress = Math.min(1, (now - start) / 420);
      let index = 0;
      while (index < 2 && progress > stops[index + 1]) index++;
      const local = (progress - stops[index]) / (stops[index + 1] - stops[index]);
      const eased = 1 - Math.pow(1 - local, 3);
      animation.points = keyframes[index].map((number, i) => number + (keyframes[index + 1][i] - number) * eased);
      path.setAttribute('d', shapePath(animation.points));
      if (progress < 1) animation.frame = requestAnimationFrame(tick);
      else { path.setAttribute('d', shapePath(normalShape)); morphAnimations.delete(path); }
    }
    animation.frame = requestAnimationFrame(tick);
  }
  function toggleTask(id) {
    const task = taskById(id);
    if (!task || !liveTask(task)) return;
    task.completed = !task.completed;
    save();
    if (holding.has(id)) { clearTimeout(holding.get(id)); holding.delete(id); }
    const filteredOut = (view.type === 'active' && task.completed) || (view.type === 'completed' && !task.completed);
    if (filteredOut) {
      const timer = setTimeout(() => { holding.delete(id); render(); }, motionQuery.matches ? 80 : 420);
      holding.set(id, timer);
    }
    render();
    animateCheckbox(rowNodes.get(`live:task:${id}`));
    announce(task.completed ? 'Задача выполнена' : 'Задача снова активна');
  }
  function resizeInput() {
    ui.taskInput.style.height = '0px';
    ui.taskInput.style.height = `${Math.min(160, Math.max(26, ui.taskInput.scrollHeight))}px`;
    ui.composer.classList.toggle('has-text', Boolean(ui.taskInput.value.trim()));
  }
  function addTask(event) {
    event?.preventDefault();
    const text = ui.taskInput.value.trim();
    if (!text) { ui.taskInput.focus(); return; }
    const task = { id: uid(), text, completed: false, listId: composerListId, deletedAt: null };
    state.tasks.unshift(task);
    save();
    ui.taskInput.value = '';
    resizeInput();
    render();
    ui.taskInput.focus({ preventScroll: true });
    feedback(ui.addTaskButton);
    announce('Задача добавлена');
  }
  function taskRowIndex(id) {
    return [...ui.taskList.children].indexOf(rowNodes.get(`live:task:${id}`));
  }
  function focusTaskPosition(index, preferredId = null) {
    const preferred = preferredId ? rowNodes.get(`live:task:${preferredId}`)?.querySelector('.task-more') : null;
    const rows = [...ui.taskList.children];
    const nearby = rows[Math.max(0, Math.min(index, rows.length - 1))]?.querySelector('button');
    (preferred || nearby || (!ui.composer.hidden && ui.taskInput) || ui.pageTitle).focus({ preventScroll: true });
  }
  function trashTask(id) {
    const task = taskById(id);
    if (!task) return;
    const index = taskRowIndex(id);
    task.deletedAt = Date.now();
    if (holding.has(id)) { clearTimeout(holding.get(id)); holding.delete(id); }
    save(); closeMenu(false); render(); focusTaskPosition(index); announce('Задача в корзине');
  }
  function moveTask(id, listId) {
    const task = taskById(id);
    if (!task) return;
    const index = taskRowIndex(id);
    task.listId = listId;
    save(); closeMenu(false); render(); focusTaskPosition(index, id); announce('Задача перемещена');
  }

  function createListForm() {
    ui.newListButton.hidden = true;
    const form = el('form', 'list-name-form');
    const id = uid();
    const draft = { id, color: defaultListColor(id, listPalette), emoji: null };
    const styleButton = button('list-draft-style', 'Значок и цвет нового списка');
    styleButton.setAttribute('aria-haspopup', 'dialog');
    styleButton.setAttribute('aria-expanded', 'false');
    const updateDraft = () => {
      styleButton.replaceChildren(listSymbol(draft));
      styleButton.insertAdjacentHTML('beforeend', icons.chevron);
    };
    updateDraft();
    styleButton.addEventListener('click', () => openListStyleMenu(styleButton, draft, (appearance) => { Object.assign(draft, appearance); updateDraft(); }));
    const input = el('input', 'list-name-input');
    input.placeholder = 'Название списка'; input.setAttribute('aria-label', 'Название нового списка'); input.autocomplete = 'off';
    form.append(styleButton, input); ui.newListHost.append(form);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const name = input.value.trim();
      if (!name) { input.focus(); return; }
      const list = { ...draft, name, deletedAt: null };
      state.lists.push(list);
      save(); closeMenu(false); creatingList = false; form.remove(); ui.newListButton.hidden = false;
      selectView('list', list.id);
      ui.taskInput.focus({ preventScroll: true });
      announce('Список создан');
    });
    input.addEventListener('keydown', (event) => { if (event.key === 'Escape') { event.stopPropagation(); cancelEditing(); ui.newListButton.focus(); } });
    requestAnimationFrame(() => input.focus());
  }
  function beginCreateList() {
    closeMenu(false);
    if (creatingList) { ui.newListHost.querySelector('input')?.focus(); return; }
    cancelEditing(); creatingList = true; createListForm();
  }
  function makeRenameForm(list) {
    const wrap = el('form', 'nav-item renaming');
    const input = el('input', 'list-name-input');
    input.value = list.name; input.setAttribute('aria-label', 'Новое название списка'); input.autocomplete = 'off';
    wrap.append(input);
    wrap.addEventListener('submit', (event) => {
      event.preventDefault();
      const name = input.value.trim();
      if (!name) { input.focus(); return; }
      list.name = name; save(); editingListId = null; render();
      ui.customLists.querySelector(`[data-list-id="${CSS.escape(list.id)}"] .nav-main`)?.focus();
      announce('Список переименован');
    });
    input.addEventListener('keydown', (event) => { if (event.key === 'Escape') { event.stopPropagation(); editingListId = null; renderNavigation(); ui.customLists.querySelector(`[data-list-id="${CSS.escape(list.id)}"] .nav-main`)?.focus(); } });
    return wrap;
  }
  function beginRenameList(id) {
    closeMenu(false); cancelEditing(); editingListId = id; renderNavigation();
    openDrawer(false);
    const input = ui.customLists.querySelector('.renaming input');
    input?.focus(); input?.select();
  }
  function cancelEditing() {
    const changed = creatingList || editingListId;
    creatingList = false; editingListId = null;
    ui.newListHost.querySelector('form')?.remove(); ui.newListButton.hidden = false;
    if (changed) renderNavigation();
  }
  function trashList(id) {
    const list = listById(id);
    if (!list) return;
    list.deletedAt = Date.now();
    save(); closeMenu(false);
    if (view.type === 'list' && view.id === id) { clearHolding(); view = { type: 'all', id: null }; }
    if (composerListId === id) composerListId = null;
    render();
    (drawerOpen || !drawerQuery.matches ? ui.mainNav.querySelector('.nav-main') : ui.pageTitle).focus({ preventScroll: true });
    announce('Список в корзине');
  }
  function restoreItem(kind, id) {
    const item = kind === 'list' ? listById(id) : taskById(id);
    if (!item) return;
    item.deletedAt = null;
    if (kind === 'task' && (!listById(item.listId) || listById(item.listId).deletedAt)) item.listId = null;
    save(); render(); announce(kind === 'list' ? 'Список восстановлен' : 'Задача восстановлена');
  }
  function confirmAction(title, description, action, submitLabel = 'Удалить навсегда') {
    closeMenu(false);
    dialogFocus = document.activeElement;
    ui.confirmTitle.textContent = title; ui.confirmDescription.textContent = description; ui.confirmSubmit.textContent = submitLabel;
    dialogAction = action; ui.confirmDialog.returnValue = '';
    ui.confirmDialog.showModal();
    ui.confirmDialog.querySelector('[value="cancel"]').focus();
  }
  function confirmPermanentDelete(kind, id) {
    const item = kind === 'list' ? listById(id) : taskById(id);
    if (!item) return;
    const title = kind === 'list' ? 'Удалить список навсегда?' : 'Удалить задачу навсегда?';
    const description = kind === 'list' ? `Список «${item.name}» и все его задачи будут удалены, включая задачи, удалённые отдельно. Вернуть их не получится.` : `Задача «${item.text}» будет удалена. Вернуть её не получится.`;
    confirmAction(title, description, () => {
      if (kind === 'list') { state.lists = state.lists.filter((list) => list.id !== id); state.tasks = state.tasks.filter((task) => task.listId !== id); }
      else state.tasks = state.tasks.filter((task) => task.id !== id);
      save(); render(); announce('Удалено навсегда');
    });
  }
  function emptyTrash() {
    if (!trashItems().length) return;
    confirmAction('Очистить корзину?', 'Все объекты в корзине и все задачи удалённых списков будут удалены навсегда. Вернуть их не получится.', () => {
      const deletedLists = new Set(state.lists.filter((list) => list.deletedAt).map((list) => list.id));
      state.lists = state.lists.filter((list) => !list.deletedAt);
      state.tasks = state.tasks.filter((task) => !task.deletedAt && !deletedLists.has(task.listId));
      save(); render(); announce('Корзина очищена');
    }, 'Очистить корзину');
  }

  function closeMenu(restoreFocus = false, immediate = false) {
    if (!menu) return;
    const { anchor, node } = menu;
    const current = getComputedStyle(node);
    const opacity = current.opacity, transform = current.transform;
    menu = null;
    cancelPolishWithin(node);
    if (immediate) node.remove();
    else {
      node.classList.add('is-closing'); node.setAttribute('aria-hidden', 'true'); node.inert = true;
      closingMenus.add(node);
      const frames = motionQuery.matches ? [{ opacity }, { opacity: 0 }] : [{ opacity, transform }, { opacity: 0, transform: 'translateY(-4px) scale(.98)' }];
      playPolish(node, frames, { duration: motionQuery.matches ? 60 : 120, easing: POLISH_EASE }).finished.then(() => { node.remove(); closingMenus.delete(node); }, () => { node.remove(); closingMenus.delete(node); });
    }
    anchor?.setAttribute('aria-expanded', 'false');
    document.querySelectorAll('.menu-active').forEach((row) => row.classList.remove('menu-active'));
    ui.composer.classList.remove('menu-open');
    if (restoreFocus && anchor?.isConnected) anchor.focus({ preventScroll: true });
  }
  function positionMenu(node, anchor, align = 'right') {
    const rect = anchor.getBoundingClientRect();
    const box = node.getBoundingClientRect();
    const margin = 12;
    let left = align === 'left' ? rect.left : rect.right - box.width;
    left = Math.max(margin, Math.min(left, innerWidth - box.width - margin));
    let top = rect.bottom + 8;
    if (top + box.height > innerHeight - margin) top = Math.max(margin, rect.top - box.height - 8);
    node.style.left = `${left}px`; node.style.top = `${top}px`;
    node.style.maxHeight = `${innerHeight - margin * 2}px`;
  }
  function showMenu(anchor, populate, className = '', focusFirst = true, align = 'right') {
    if (menu?.anchor === anchor) { closeMenu(true); return; }
    closeMenu(false, true);
    for (const closing of closingMenus) { cancelPolishWithin(closing); closing.remove(); }
    closingMenus.clear();
    const node = el('div', `popover ${className}`);
    node.setAttribute('role', 'menu');
    populate(node);
    ui.menuRoot.append(node);
    menu = { node, anchor, align };
    anchor.setAttribute('aria-expanded', 'true');
    anchor.closest('.task-row')?.classList.add('menu-active');
    if (anchor === ui.composerList) ui.composer.classList.add('menu-open');
    positionMenu(node, anchor, align);
    const frames = motionQuery.matches ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'translateY(-6px) scale(.97)' }, { opacity: 1, transform: 'translateY(0) scale(1)' }];
    playPolish(node, frames, { duration: motionQuery.matches ? 70 : 220, easing: POLISH_EASE });
    [...node.querySelectorAll('.menu-item')].forEach((item, index) => reveal(item, { duration: 180, delay: Math.min(index * 20, 80), y: 4 }));
    node.querySelectorAll('.menu-check').forEach((check) => feedback(check, 'check'));
    if (anchor === ui.composerList) feedback(anchor);
    node.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeMenu(true); return; }
      if (event.key === 'Tab') {
        if (node.classList.contains('list-style-menu')) {
          const controls = [...node.querySelectorAll('button,input')].filter((control) => control.tabIndex >= 0 && !control.closest('[hidden]'));
          if ((!event.shiftKey && document.activeElement === controls.at(-1)) || (event.shiftKey && document.activeElement === controls[0])) { event.preventDefault(); closeMenu(true); }
        } else closeMenu(false);
        return;
      }
      if (['INPUT', 'TEXTAREA'].includes(event.target.tagName)) return;
      const items = [...node.querySelectorAll('button:not(:disabled)')];
      let index = items.indexOf(document.activeElement);
      if (['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        if (event.key === 'Home') index = 0;
        else if (event.key === 'End') index = items.length - 1;
        else index = (index + (event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? -1 : 1) + items.length) % items.length;
        items[index]?.focus();
      }
    });
    if (focusFirst) node.querySelector('button')?.focus({ preventScroll: true });
  }
  function menuItem(node, label, icon, action, { danger = false, checked = false, color = null, list = null } = {}) {
    const item = button(`menu-item${danger ? ' danger' : ''}`);
    item.setAttribute('role', 'menuitem');
    if (list) item.append(listSymbol(list));
    else if (color !== null) { const dot = el('span', 'menu-list-dot'); dot.style.setProperty('--list-color', color); item.append(dot); }
    else if (icon) item.insertAdjacentHTML('beforeend', icon);
    item.append(el('span', 'menu-label', label));
    if (checked) { const check = el('span', 'menu-check'); check.innerHTML = icons.tick; item.append(check); item.setAttribute('aria-label', `${label}, выбран`); }
    item.addEventListener('click', action); node.append(item); return item;
  }
  function divider(node) { node.append(el('div', 'menu-divider')); }
  function fillListPicker(node, selectedId, onSelect, goBack) {
    if (goBack) { menuItem(node, 'Переместить в список', icons.back, goBack); divider(node); }
    else node.append(el('div', 'menu-caption', 'Список для задачи'));
    menuItem(node, 'Без списка', icons.active, () => onSelect(null), { checked: !selectedId });
    for (const list of activeLists()) menuItem(node, list.name, null, () => onSelect(list.id), { checked: list.id === selectedId, list });
    if (!activeLists().length) node.append(el('div', 'menu-caption', 'Создайте список в боковом меню'));
  }
  function openComposerListMenu() {
    showMenu(ui.composerList, (node) => fillListPicker(node, composerListId, (id) => { composerListId = id; renderComposerList(); closeMenu(false); ui.taskInput.focus(); }), 'list-picker-menu');
  }
  function openTaskMenu(id, anchor) {
    if (!taskById(id)) return;
    showMenu(anchor, (node) => {
      menuItem(node, 'Переместить в список', icons.move, () => {
        closeMenu(false);
        showMenu(anchor, (listNode) => fillListPicker(listNode, taskById(id)?.listId, (listId) => moveTask(id, listId), () => { closeMenu(false); openTaskMenu(id, anchor); }), 'list-picker-menu');
      });
      divider(node);
      menuItem(node, 'В корзину', icons.trash, () => trashTask(id), { danger: true });
    });
  }
  function openListMenu(id, anchor) {
    if (!listById(id)) return;
    showMenu(anchor, (node) => {
      menuItem(node, 'Переименовать', icons.rename, () => beginRenameList(id));
      menuItem(node, 'Значок и цвет', null, () => { closeMenu(false); editListAppearance(id, anchor); }, { list: listById(id) });
      divider(node);
      menuItem(node, 'В корзину', icons.trash, () => trashList(id), { danger: true });
    });
  }
  function editListAppearance(id, anchor) {
    const list = listById(id);
    if (!list || list.deletedAt) return;
    openListStyleMenu(anchor, { color: listColor(id), emoji: list.emoji }, (appearance) => {
      Object.assign(list, appearance);
      save(); render();
      announce('Оформление списка сохранено');
    });
  }
  function openListStyleMenu(anchor, appearance, onChange) {
    let current = { color: appearance.color, emoji: appearance.emoji || null };
    let activeTab = current.emoji ? 'emoji' : 'colors';
    showMenu(anchor, (node) => {
      node.setAttribute('role', 'dialog'); node.setAttribute('aria-label', 'Значок и цвет списка');
      const tabs = el('div', 'list-style-tabs'); tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', 'Вид значка');
      const panel = el('div', 'list-style-panel'); panel.id = 'list-style-panel'; panel.setAttribute('role', 'tabpanel');
      const tabButtons = [];
      function commit(next) {
        current = { ...current, ...next }; onChange(current);
        for (const swatch of node.querySelectorAll('[data-list-color]')) swatch.setAttribute('aria-pressed', String(!current.emoji && swatch.dataset.listColor === current.color));
        for (const emoji of node.querySelectorAll('[data-list-emoji]')) emoji.setAttribute('aria-pressed', String(emoji.dataset.listEmoji === current.emoji));
        const preview = node.querySelector('.custom-color-preview');
        if (preview) preview.style.backgroundColor = current.color;
        const hex = node.querySelector('.custom-color-input');
        if (hex) {
          if (document.activeElement !== hex) hex.value = current.color;
          hex.dataset.dirty = 'false';
          hex.setAttribute('aria-invalid', 'false');
          node.querySelector('.custom-color-error').hidden = true;
        }
      }
      function renderPanel() {
        panel.replaceChildren();
        for (const tab of tabButtons) {
          const selected = tab.dataset.tab === activeTab;
          tab.setAttribute('aria-selected', String(selected)); tab.tabIndex = selected ? 0 : -1;
        }
        panel.setAttribute('aria-labelledby', `list-style-tab-${activeTab}`);
        if (activeTab === 'colors') {
          const palette = el('div', 'list-style-grid'); palette.setAttribute('aria-label', 'Цвета списка');
          for (const color of listPalette) {
            const swatch = button('color-swatch', `Цвет ${color}`);
            swatch.dataset.listColor = color; swatch.style.setProperty('--swatch', color);
            swatch.setAttribute('aria-pressed', String(!current.emoji && current.color === color));
            swatch.append(el('span'));
            swatch.addEventListener('click', () => commit({ color, emoji: null })); palette.append(swatch);
          }
          const custom = el('label', 'custom-color-row'); custom.append(el('span', '', 'Свой цвет'));
          const control = el('span', 'custom-color-control');
          const preview = el('span', 'custom-color-preview'); preview.style.backgroundColor = current.color; preview.setAttribute('aria-hidden', 'true');
          const input = el('input', 'custom-color-input');
          input.type = 'text'; input.value = current.color; input.maxLength = 7; input.spellcheck = false; input.autocomplete = 'off'; input.dataset.dirty = 'false'; input.setAttribute('aria-label', 'HEX-цвет списка');
          const error = el('span', 'custom-color-error', 'Введите HEX: например, #8843ff'); error.id = 'custom-color-error'; error.hidden = true;
          input.setAttribute('aria-describedby', error.id);
          function applyHex(final = false) {
            const color = normalizeColor(input.value);
            const valid = Boolean(color);
            input.setAttribute('aria-invalid', String(final && !valid)); error.hidden = !final || valid;
            if (valid && (final || /^#?[\da-f]{6}$/i.test(input.value.trim()))) { commit({ color, emoji: null }); if (final) input.value = color; }
            if (menu?.node === node) positionMenu(node, anchor, 'left');
            return valid;
          }
          input.addEventListener('input', () => { input.dataset.dirty = 'true'; applyHex(); });
          input.addEventListener('blur', () => { if (input.dataset.dirty === 'true') applyHex(true); else input.value = current.color; });
          input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') { event.preventDefault(); event.stopPropagation(); if (input.dataset.dirty !== 'true' || applyHex(true)) closeMenu(true); }
          });
          control.append(preview, input); custom.append(control); panel.append(palette, custom, error);
        } else {
          const reset = button('list-style-reset', 'Цветной значок');
          reset.append(listSymbol({ color: current.color }), el('span', '', 'Цветной значок'));
          reset.addEventListener('click', () => { commit({ emoji: null }); activeTab = 'colors'; renderPanel(); tabButtons[0].focus(); });
          const emojis = el('div', 'list-style-grid emoji-grid'); emojis.setAttribute('aria-label', 'Эмодзи для списка');
          for (const emoji of listEmojis) {
            const option = button('emoji-option', `Эмодзи ${emoji}`);
            option.dataset.listEmoji = emoji; option.textContent = emoji; option.setAttribute('aria-pressed', String(current.emoji === emoji));
            option.addEventListener('click', () => commit({ emoji })); emojis.append(option);
          }
          panel.append(reset, emojis);
        }
        if (menu?.node === node) { positionMenu(node, anchor, 'left'); reveal(panel, { duration: 150, y: 2 }); }
      }
      for (const [value, label] of [['colors', 'Цвета'], ['emoji', 'Эмодзи']]) {
        const tab = button('list-style-tab'); tab.textContent = label; tab.dataset.tab = value; tab.id = `list-style-tab-${value}`;
        tab.setAttribute('role', 'tab'); tab.setAttribute('aria-controls', panel.id);
        tab.addEventListener('click', () => { activeTab = value; renderPanel(); });
        tab.addEventListener('keydown', (event) => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault(); event.stopPropagation();
          const index = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : tabButtons.indexOf(tab) === 0 ? 1 : 0;
          activeTab = tabButtons[index].dataset.tab; renderPanel(); tabButtons[index].focus();
        });
        tabButtons.push(tab); tabs.append(tab);
      }
      node.append(tabs, panel); renderPanel();
    }, 'list-style-menu', false, 'left');
    menu?.node.querySelector('[role="tab"][aria-selected="true"]')?.focus({ preventScroll: true });
  }
  function applyTheme() {
    document.documentElement.dataset.theme = state.theme;
    document.querySelector('meta[name="theme-color"]').content = state.theme === 'light' ? '#ECEEEF' : state.theme === 'dark' ? '#1E1F24' : '#000000';
  }
  function openAppearanceMenu() {
    showMenu(ui.appearanceToggle, (node) => {
      node.append(el('div', 'appearance-title', 'Оформление'));
      const segments = el('div', 'theme-segments');
      segments.setAttribute('role', 'radiogroup'); segments.setAttribute('aria-label', 'Тема');
      const indicator = el('span', 'theme-indicator'); indicator.setAttribute('aria-hidden', 'true'); segments.append(indicator);
      const themes = [['light', 'Светлая', icons.sun], ['dark', 'Тёмная', icons.moon], ['black', 'Чёрная', icons.black]];
      themes.forEach(([value, label, icon]) => {
        const option = button('', '', icon);
        option.setAttribute('role', 'radio'); option.dataset.themeValue = value;
        option.append(el('span', '', label));
        option.addEventListener('click', () => {
          state.theme = value; save(); applyTheme(); updateThemeMenu();
          feedback(option.querySelector('svg'), 'theme');
          announce(`Тема: ${label.toLowerCase()}`);
        });
        segments.append(option);
      });
      node.append(segments, el('div', 'theme-note', 'Выбранная тема сохранится на этом устройстве.'));
    }, 'appearance-menu');
    updateThemeMenu();
    menu?.node.querySelector(`[data-theme-value="${state.theme}"]`)?.focus();
  }
  function updateThemeMenu() {
    if (!menu?.node.classList.contains('appearance-menu')) return;
    const index = ['light', 'dark', 'black'].indexOf(state.theme);
    menu.node.querySelector('.theme-indicator').style.transform = `translateX(${index * 100}%)`;
    for (const option of menu.node.querySelectorAll('[data-theme-value]')) option.setAttribute('aria-checked', String(option.dataset.themeValue === state.theme));
  }
  function openDrawer(focus = true) {
    if (!drawerQuery.matches) return;
    drawerOpen = true; ui.sidebar.inert = false;
    ui.sidebar.classList.add('is-open'); ui.drawerBackdrop.hidden = false;
    ui.navToggle.setAttribute('aria-expanded', 'true'); ui.navToggle.setAttribute('aria-label', 'Закрыть меню');
    ui.main.inert = true; ui.appearanceToggle.inert = true;
    if (focus) (ui.sidebar.querySelector('[aria-current="page"]') || ui.sidebar.querySelector('button'))?.focus({ preventScroll: true });
  }
  function closeDrawer(focus = false) {
    drawerOpen = false; ui.sidebar.classList.remove('is-open'); ui.drawerBackdrop.hidden = true;
    ui.navToggle.setAttribute('aria-expanded', 'false'); ui.navToggle.setAttribute('aria-label', 'Открыть меню');
    ui.sidebar.inert = drawerQuery.matches; ui.main.inert = false; ui.appearanceToggle.inert = false;
    if (focus && drawerQuery.matches) ui.navToggle.focus({ preventScroll: true });
  }
  function syncViewport() {
    if (!drawerQuery.matches || !drawerOpen) closeDrawer(false);
    if (menu?.anchor.isConnected) positionMenu(menu.node, menu.anchor, menu.align);
    resizeInput();
    updateNavSelection(false);
  }

  ui.navToggle.innerHTML = icons.menu;
  ui.appearanceToggle.innerHTML = icons.appearance;
  ui.headingAction.innerHTML = icons.more;
  ui.addTaskButton.innerHTML = icons.enter;
  ui.dialogIcon.innerHTML = icons.trash;
  ui.composer.addEventListener('submit', addTask);
  ui.taskInput.addEventListener('input', resizeInput);
  ui.taskInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); addTask(); }
    if (event.key === 'Escape') { ui.taskInput.blur(); }
  });
  ui.composerList.addEventListener('click', openComposerListMenu);
  ui.newListButton.addEventListener('click', beginCreateList);
  ui.emptyTrashButton.addEventListener('click', emptyTrash);
  ui.headingAction.addEventListener('click', () => openListMenu(view.id, ui.headingAction));
  ui.listAppearanceButton.addEventListener('click', () => editListAppearance(view.id, ui.listAppearanceButton));
  ui.appearanceToggle.addEventListener('click', openAppearanceMenu);
  ui.navToggle.addEventListener('click', () => drawerOpen ? closeDrawer(true) : openDrawer());
  ui.drawerBackdrop.addEventListener('click', () => { closeMenu(false); closeDrawer(true); });
  ui.toastClose.addEventListener('click', () => { ui.toast.hidden = true; clearTimeout(toastTimer); });
  ui.confirmDialog.addEventListener('close', () => {
    const action = dialogAction; dialogAction = null;
    if (ui.confirmDialog.returnValue === 'confirm') action?.();
    if (dialogFocus?.isConnected) dialogFocus.focus({ preventScroll: true });
    else (ui.taskList.querySelector('button') || ui.appearanceToggle).focus({ preventScroll: true });
    dialogFocus = null;
  });
  ui.confirmDialog.addEventListener('click', (event) => {
    if (event.target !== ui.confirmDialog) return;
    const rect = ui.confirmDialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) ui.confirmDialog.close('cancel');
  });
  document.addEventListener('pointerdown', (event) => { if (menu && !menu.node.contains(event.target) && !menu.anchor.contains(event.target)) closeMenu(false); });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !ui.confirmDialog.open) {
      if (menu) { event.preventDefault(); closeMenu(true); }
      else if (creatingList || editingListId) cancelEditing();
      else if (drawerOpen) { event.preventDefault(); closeDrawer(true); }
    }
    if (drawerOpen && event.key === 'Tab' && !menu && !ui.confirmDialog.open) {
      const nodes = [...ui.sidebar.querySelectorAll('button,input')].filter((node) => !node.hidden && !node.closest('[hidden]'));
      if (event.shiftKey && document.activeElement === nodes[0]) { event.preventDefault(); nodes.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === nodes.at(-1)) { event.preventDefault(); nodes[0]?.focus(); }
    }
    if (event.key.toLowerCase() === 'n' && !event.ctrlKey && !event.metaKey && !event.altKey && !event.isComposing && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) && !ui.confirmDialog.open) {
      event.preventDefault(); openDrawer(false); beginCreateList();
    }
  });
  window.addEventListener('resize', syncViewport);
  window.addEventListener('scroll', () => { if (menu?.anchor.isConnected) positionMenu(menu.node, menu.anchor, menu.align); }, { passive: true });
  drawerQuery.addEventListener('change', syncViewport);
  motionQuery.addEventListener('change', () => {
    if (motionQuery.matches) {
      for (const animation of [...polishAnimations]) animation.cancel();
      revealAnimations.clear();
      for (const closing of closingMenus) closing.remove();
      closingMenus.clear();
      for (const node of rowNodes.values()) { layoutAnimations.get(node)?.cancel(); const path = node.querySelector('.checkbox-shape'); if (path) { const morph = morphAnimations.get(path); if (morph) cancelAnimationFrame(morph.frame); morphAnimations.delete(path); path.setAttribute('d', shapePath(normalShape)); } }
    }
  });
  applyTheme(); render(); syncViewport();
  if (initialLoadProblem) { storageProblem = true; notify(initialLoadProblem, 10000); }
})();
