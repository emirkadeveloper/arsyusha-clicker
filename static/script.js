// --- КОНФИГУРАЦИЯ И ДАННЫЕ (Как было в Python) ---
const workerNames = ["Муравей", "Таракан", "Хомяк", "Кот", "Школьник", "Студент", "Дворник", "Менеджер", "Директор", "Депутат", "Мэр", "Президент", "Илон Маск", "Скайнет", "Ботнет", "Серверная", "Дата-центр", "Крипто-ферма", "АЭС", "Ветряк", "Дамба", "Вулкан", "Тектоника", "Ядро", "Луна", "Марсоход", "Сфера", "Звезда", "Дыра", "Квазар", "Галактика", "Скопление", "Вселенная", "Мультивселенная", "Бог", "Кодер", "Баг", "Глитч", "Матрица", "Архитектор", "Агент", "Нео", "Тринити", "Морфеус", "Оракул", "Зион", "Реальность", "Абсолют", "THE END"];
const itemNouns = [["Мышка", "F"], ["Палец", "M"], ["Перчатка", "F"], ["Молот", "M"], ["Усилитель", "M"], ["Чип", "M"], ["Кабель", "M"], ["Сервер", "M"], ["Квант", "M"], ["Бог", "M"]];
const materials = [["Деревянный", "Деревянная"], ["Медный", "Медная"], ["Железный", "Железная"], ["Золотой", "Золотая"], ["Алмазный", "Алмазная"], ["Изумрудный", "Изумрудная"], ["Плазменный", "Плазменная"], ["Космический", "Космическая"], ["Божественный", "Божественная"], ["Омега", "Омега"]];
const boosterTypes = [
    {id: "b0", name: "Кофе", mult: 2, dur: 30, cost: 500},
    {id: "b1", name: "Энергетик", mult: 3, dur: 25, cost: 2500},
    {id: "b2", name: "Турбо", mult: 5, dur: 20, cost: 10000},
    {id: "b3", name: "Хакер", mult: 10, dur: 15, cost: 50000},
    {id: "b4", name: "Оверклок", mult: 15, dur: 15, cost: 150000},
    {id: "b5", name: "Квант", mult: 20, dur: 10, cost: 500000},
    {id: "b6", name: "Искривление", mult: 50, dur: 10, cost: 2000000},
    {id: "b7", name: "Матрица", mult: 100, dur: 5, cost: 10000000},
    {id: "b8", name: "Танос", mult: 500, dur: 5, cost: 100000000},
    {id: "b9", name: "BIG BANG", mult: 1000, dur: 5, cost: 1000000000}
];

// --- ГЕНЕРАЦИЯ СОСТОЯНИЯ ---
let state = {
    bolts: 0,
    click_power: 1,
    auto_income: 0,
    first_run: true,
    workers: {},
    upgrades: {},
    boosters: {}
};

function initGame() {
    // 1. Работники
    let baseCost = 15;
    let baseCps = 0.5;
    workerNames.forEach((name, i) => {
        let cost = Math.floor(baseCost * Math.pow(1.55, i));
        let cps = Math.round(baseCps * Math.pow(1.45, i) * 10) / 10;
        state.workers[`w_${i}`] = {id: `w_${i}`, name: name, cost: cost, cps: cps, count: 0, order: i};
    });

    // 2. Апгрейды
    let count = 0;
    let currBonus = 1;
    let currCost = 50;
    materials.forEach((mat) => {
        itemNouns.forEach((noun) => {
            let name = (noun[1] === 'F' ? mat[1] : mat[0]) + " " + noun[0];
            state.upgrades[`u_${count}`] = {id: `u_${count}`, name: name, cost: currCost, bonus: currBonus, lvl: 0, order: count};
            currBonus = Math.floor(currBonus * 1.25) + 1;
            currCost = Math.floor(currCost * 1.40);
            count++;
        });
    });

    // 3. Бустеры
    boosterTypes.forEach((b, i) => {
        state.boosters[b.id] = {...b, active_until: 0, order: i};
    });
}

// --- СОХРАНЕНИЕ (LocalStorage) ---
function saveGame() {
    localStorage.setItem('arsyusha_save', JSON.stringify(state));
}

function loadGame() {
    initGame(); // Создаем структуру
    const saved = localStorage.getItem('arsyusha_save');
    if (saved) {
        const parsed = JSON.parse(saved);
        // Восстанавливаем значения
        state.bolts = parsed.bolts || 0;
        state.click_power = parsed.click_power || 1;
        state.first_run = parsed.first_run ?? true;
        
        // Восстанавливаем покупки (слияние)
        for(let k in parsed.workers) if(state.workers[k]) {
            state.workers[k].count = parsed.workers[k].count;
            state.workers[k].cost = parsed.workers[k].cost;
        }
        for(let k in parsed.upgrades) if(state.upgrades[k]) {
            state.upgrades[k].lvl = parsed.upgrades[k].lvl;
            state.upgrades[k].cost = parsed.upgrades[k].cost;
            // Пересчет силы клика на всякий случай
            if(parsed.upgrades[k].lvl > 0) state.click_power += parsed.upgrades[k].bonus;
        }
    }
}

// --- АУДИО ---
const audio = {
    click: new Audio('../static/click.mp3'),
    buy: new Audio('../static/buy.mp3'),
    booster: new Audio('../static/booster.mp3'),
    music: new Audio('../static/music.mp3')
};
for(let k in audio) { 
    audio[k].volume = k==='music'?0.2:0.5; 
    if(k==='music') audio[k].loop=true; 
}

function playSound(name) {
    if(audio[name]) {
        const c = audio[name].cloneNode();
        c.volume = name==='click'?0.3:0.5;
        c.play().catch(()=>{});
    }
}
function startMusic() {
    if(audio.music && audio.music.paused) audio.music.play().catch(()=>{});
}

// --- ЛОГИКА ИГРЫ ---
loadGame(); // Загрузка при старте скрипта

// Авто-фарм (каждые 100мс)
setInterval(() => {
    let income = 0;
    for(let k in state.workers) income += state.workers[k].count * state.workers[k].cps;
    
    // Бустеры
    let mult = 1;
    let now = Date.now() / 1000;
    for(let k in state.boosters) {
        if(state.boosters[k].active_until > now) mult *= state.boosters[k].mult;
    }
    
    income *= mult;
    state.auto_income = income;
    
    if(income > 0) {
        state.bolts += income / 10;
    }
    
    updateUI();
}, 100);

// Авто-сохранение (каждые 5 сек)
setInterval(saveGame, 5000);

// --- UI ОБНОВЛЕНИЕ ---
function updateUI() {
    document.getElementById('score').innerText = formatScore(state.bolts);
    document.getElementById('cps').innerText = formatNumber(state.auto_income);
    
    let now = Date.now() / 1000;
    
    // Рендер активных бустеров
    const activeList = document.getElementById('active-boosters-list');
    activeList.innerHTML = '';
    for(let k in state.boosters) {
        let b = state.boosters[k];
        if(b.active_until > now) {
            let left = Math.ceil(b.active_until - now);
            let d = document.createElement('div');
            d.className = 'booster-badge';
            d.innerText = `🔥 ${b.name} x${b.mult}: ${left}с`;
            activeList.appendChild(d);
        }
    }
    
    // Обновление кнопок (если открыты панели)
    refreshShop('upgrades');
    refreshShop('workers');
    refreshShop('boosters');
}

// --- МАГАЗИН (Рендер) ---
let renderedTabs = {}; 

function refreshShop(type) {
    const list = document.getElementById(`list-${type}`);
    // Если список пустой, рендерим полностью
    if(list.children.length === 0) {
        let items = Object.values(state[type]).sort((a,b) => a.order - b.order);
        items.forEach(item => {
            let el = document.createElement('div');
            el.className = 'card';
            el.id = `card-${item.id}`;
            el.innerHTML = getCardHTML(item, type);
            list.appendChild(el);
        });
    } else {
        // Иначе обновляем только тексты
        let items = Object.values(state[type]);
        items.forEach(item => {
            let el = document.getElementById(`card-${item.id}`);
            if(el) {
                let btn = el.querySelector('button');
                let canBuy = state.bolts >= item.cost;
                let now = Date.now()/1000;
                
                if(type === 'boosters') {
                    let active = item.active_until > now;
                    if(active) {
                        btn.disabled = true;
                        btn.innerText = "Активен";
                        btn.classList.add('active-booster');
                    } else {
                        btn.disabled = !canBuy;
                        btn.innerText = formatScore(item.cost) + " 🔩";
                        btn.classList.remove('active-booster');
                    }
                } else {
                    btn.disabled = !canBuy;
                    btn.innerText = formatScore(item.cost) + " 🔩";
                    let p = el.querySelector('p');
                    if(type==='workers') p.innerText = `Штат: ${item.count} | +${item.cps}/сек`;
                    if(type==='upgrades') p.innerText = `Ур: ${item.lvl} | Сила: +${item.bonus}`;
                }
            }
        });
    }
}

function getCardHTML(item, type) {
    let sub = "";
    if(type==='workers') sub = `Штат: ${item.count} | +${item.cps}/сек`;
    if(type==='upgrades') sub = `Ур: ${item.lvl} | Сила: +${item.bonus}`;
    if(type==='boosters') sub = `x${item.mult} на ${item.dur} сек`;
    
    return `
        <div class="card-info">
            <h4>${item.name}</h4>
            <p>${sub}</p>
        </div>
        <button class="btn-buy" onclick="buyItem('${type}', '${item.id}')">${formatScore(item.cost)} 🔩</button>
    `;
}

// --- ПОКУПКА ---
window.buyItem = function(type, id) {
    let item = state[type][id];
    if(!item) return;
    
    if(state.bolts >= item.cost) {
        // Бустеры
        if(type === 'boosters') {
            let now = Date.now() / 1000;
            if(item.active_until > now) return; // Уже активен
            state.bolts -= item.cost;
            item.active_until = now + item.dur;
            playSound('booster');
        } 
        // Работники
        else if(type === 'workers') {
            state.bolts -= item.cost;
            item.count++;
            item.cost = Math.floor(item.cost * 1.25);
            playSound('buy');
        }
        // Улучшения
        else if(type === 'upgrades') {
            state.bolts -= item.cost;
            item.lvl++;
            state.click_power += item.bonus;
            item.cost = Math.floor(item.cost * 1.6);
            playSound('buy');
        }
        saveGame();
        updateUI();
    }
};

// --- КЛИК ---
document.getElementById('hero').addEventListener('click', (e) => {
    playSound('click');
    let mult = 1;
    let now = Date.now() / 1000;
    for(let k in state.boosters) if(state.boosters[k].active_until > now) mult *= state.boosters[k].mult;
    
    let amount = state.click_power * mult;
    state.bolts += amount;
    
    createParticle(e.clientX, e.clientY, amount);
    updateUI();
});

// --- UI HELPERS ---
function createParticle(x, y, amount) {
    const el = document.createElement('div');
    el.className = 'particle-wrapper';
    el.innerHTML = `<img src="../static/bolt.png" style="width:25px"><span class="particle-text">+${formatScore(amount)}</span>`;
    el.style.left = x + 'px';
    el.style.top = (y - 80) + 'px';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 800);
}

window.openPanel = function(id) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('open'));
    document.getElementById(`panel-${id}`).classList.add('open');
    refreshShop(id); // Рендер при открытии
};

window.closeAllPanels = function() {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('open'));
};

window.closeIntro = function() {
    document.getElementById('intro-modal').classList.remove('visible');
    setTimeout(() => document.getElementById('intro-modal').style.display='none', 300);
    state.first_run = false;
    saveGame();
    startMusic();
};

function formatScore(n) {
    n = Math.floor(n);
    if(n >= 1000000) return (n/1000000).toFixed(2) + 'M';
    if(n >= 1000) return (n/1000).toFixed(1) + 'k';
    return n;
}
function formatNumber(n) {
    if(n < 1000) return (n % 1 === 0) ? n : n.toFixed(1);
    return formatScore(n);
}

// Запуск загрузки
window.onload = () => {
    let bar = document.getElementById('progress-fill');
    let w = 0;
    let int = setInterval(() => {
        w += 5;
        bar.style.width = w + '%';
        if(w >= 100) {
            clearInterval(int);
            setTimeout(() => {
                document.getElementById('loader').style.display = 'none';
                if(state.first_run) {
                    let m = document.getElementById('intro-modal');
                    m.classList.remove('hidden');
                    setTimeout(()=>m.classList.add('visible'), 10);
                }
            }, 500);
        }
    }, 50);
    
    document.body.addEventListener('click', startMusic, {once:true});
};
