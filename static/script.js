// --- ДАННЫЕ ИГРЫ ---
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

// Глобальное состояние
let state = {
    bolts: 0,
    click_power: 1, // Пересчитывается при загрузке
    auto_income: 0,
    first_run: true,
    workers: {},
    upgrades: {},
    boosters: {}
};

// --- ИНИЦИАЛИЗАЦИЯ ДАННЫХ (Пустая игра) ---
function initGameData() {
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

// --- СИСТЕМА СОХРАНЕНИЯ (LocalStorage) ---
const SAVE_KEY = 'arsyusha_tycoon_v1';

function saveGame() {
    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch (e) {
        console.error("Save failed", e);
    }
}

function loadGame() {
    initGameData(); // Сначала создаем структуру по умолчанию
    
    const savedJSON = localStorage.getItem(SAVE_KEY);
    if (savedJSON) {
        try {
            const savedState = JSON.parse(savedJSON);
            
            // Восстанавливаем базовые значения
            state.bolts = savedState.bolts || 0;
            state.first_run = (savedState.first_run !== undefined) ? savedState.first_run : true;

            // Восстанавливаем Работников (Count и Cost)
            for (let id in savedState.workers) {
                if (state.workers[id]) {
                    state.workers[id].count = savedState.workers[id].count;
                    state.workers[id].cost = savedState.workers[id].cost;
                }
            }

            // Восстанавливаем Апгрейды (Level и Cost)
            for (let id in savedState.upgrades) {
                if (state.upgrades[id]) {
                    state.upgrades[id].lvl = savedState.upgrades[id].lvl;
                    state.upgrades[id].cost = savedState.upgrades[id].cost;
                }
            }
            
            // Восстанавливаем Бустеры (Время действия)
            // При загрузке проверяем, не истек ли бустер пока игра была закрыта
            // (можно сделать сложнее и начислить оффлайн доход, но пока просто сохраним время)
            // let now = Date.now() / 1000;
            // for (let id in savedState.boosters) {
            //     if (state.boosters[id]) {
            //         state.boosters[id].active_until = savedState.boosters[id].active_until;
            //     }
            // }

            // ПЕРЕСЧЕТ СТАТИСТИКИ (Чтобы не было багов с силой клика)
            recalcStats();

        } catch (e) {
            console.error("Load failed, reset to default", e);
        }
    }
}

// Пересчитываем силу клика на основе купленных апгрейдов
function recalcStats() {
    let power = 1; // Базовая сила
    for (let id in state.upgrades) {
        let u = state.upgrades[id];
        if (u.lvl > 0) {
            // Если апгрейд куплен, добавляем его бонус столько раз, какой у него уровень
            power += (u.bonus * u.lvl);
        }
    }
    state.click_power = power;
}

// --- АУДИО ---
const audio = {
    click: new Audio('static/click.mp3'),
    buy: new Audio('static/buy.mp3'),
    booster: new Audio('static/booster.mp3'),
    music: new Audio('static/music.mp3')
};

for(let k in audio) { 
    audio[k].volume = k==='music'?0.2:0.5; 
    if(k==='music') audio[k].loop=true;
    audio[k].load();
}

function tryPlayMusic() {
    if(audio.music && audio.music.paused) {
        audio.music.play().catch(()=>{});
    }
}

function playSound(name) {
    if(audio[name]) {
        const c = audio[name].cloneNode();
        c.volume = name==='click'?0.3:0.5;
        c.play().catch(()=>{});
    }
}

// --- ЗАПУСК ---
window.onload = () => {
    loadGame(); // 1. Загрузили сохранение
    
    let bar = document.getElementById('progress-fill');
    let w = 0;
    
    // Анимация загрузки
    let int = setInterval(() => {
        w += 2; 
        bar.style.width = w + '%';
        if(w >= 100) {
            clearInterval(int);
            tryPlayMusic();
            
            setTimeout(() => {
                document.getElementById('loader').style.display = 'none';
                
                // Если это ПЕРВЫЙ запуск (нет сейва или флаг true)
                if (state.first_run) {
                    let m = document.getElementById('intro-modal');
                    m.classList.remove('hidden');
                    setTimeout(()=>m.classList.add('visible'), 10);
                }
            }, 500);
        }
    }, 30);

    // Запасной старт музыки
    document.body.addEventListener('click', tryPlayMusic, {once:true});
    document.body.addEventListener('touchstart', tryPlayMusic, {once:true});
};

// --- ГЛАВНЫЙ ЦИКЛ (Тик каждые 100мс) ---
setInterval(() => {
    // 1. Считаем доход
    let income = 0;
    for(let k in state.workers) income += state.workers[k].count * state.workers[k].cps;
    
    // 2. Бустеры
    let mult = 1; 
    let now = Date.now() / 1000;
    for(let k in state.boosters) if(state.boosters[k].active_until > now) mult *= state.boosters[k].mult;
    
    income *= mult;
    state.auto_income = income;
    
    // 3. Начисляем (разделив на 10, т.к. тик 10 раз в секунду)
    if(income > 0) state.bolts += income / 10;
    
    // 4. Обновляем экран
    updateUI();
    
}, 100);

// --- АВТО-СОХРАНЕНИЕ (Каждую 1 секунду) ---
// Чаще = надежнее. LocalStorage быстрый, это не лагает.
setInterval(saveGame, 1000);

// Сохранение при закрытии вкладки/сворачивании
window.addEventListener("beforeunload", saveGame);
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === 'hidden') saveGame();
});


// --- UI ---
function updateUI() {
    document.getElementById('score').innerText = formatScore(state.bolts);
    document.getElementById('cps').innerText = formatNumber(state.auto_income);
    
    let now = Date.now() / 1000;
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
    
    refreshShop('upgrades');
    refreshShop('workers');
    refreshShop('boosters');
}

function refreshShop(type) {
    const list = document.getElementById(`list-${type}`);
    // Если список пуст - создаем элементы
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
        // Иначе обновляем существующие (текст кнопок и инфо)
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

// --- ПОКУПКА (С МГНОВЕННЫМ СОХРАНЕНИЕМ) ---
window.buyItem = function(type, id) {
    let item = state[type][id];
    if(!item) return;
    
    if(state.bolts >= item.cost) {
        if(type === 'boosters') {
            let now = Date.now() / 1000;
            if(item.active_until > now) return;
            state.bolts -= item.cost;
            item.active_until = now + item.dur;
            playSound('booster');
        } else if(type === 'workers') {
            state.bolts -= item.cost;
            item.count++;
            item.cost = Math.floor(item.cost * 1.25);
            playSound('buy');
        } else if(type === 'upgrades') {
            state.bolts -= item.cost;
            item.lvl++;
            state.click_power += item.bonus; // Увеличиваем силу сразу
            item.cost = Math.floor(item.cost * 1.6);
            playSound('buy');
        }
        
        saveGame(); // СОХРАНЯЕМ СРАЗУ ПОСЛЕ ПОКУПКИ
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

function createParticle(x, y, amount) {
    const el = document.createElement('div');
    el.className = 'particle-wrapper';
    el.innerHTML = `<img src="static/bolt.png" style="width:25px"><span class="particle-text">+${formatScore(amount)}</span>`;
    el.style.left = x + 'px';
    el.style.top = (y - 80) + 'px';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 800);
}

// --- НАВИГАЦИЯ ---
window.openPanel = function(id) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('open'));
    document.getElementById(`panel-${id}`).classList.add('open');
    refreshShop(id);
};

window.closeAllPanels = function() {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('open'));
};

window.closeIntro = function() {
    tryPlayMusic();
    document.getElementById('intro-modal').classList.remove('visible');
    setTimeout(() => document.getElementById('intro-modal').style.display='none', 300);
    state.first_run = false;
    saveGame(); // Сохраняем, что интро просмотрено
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
