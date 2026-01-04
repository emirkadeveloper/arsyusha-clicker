let state = {};

// --- ЗВУКОВАЯ СИСТЕМА ---
const audio = {
    click: new Audio('/static/click.mp3'),
    buy: new Audio('/static/buy.mp3'),
    booster: new Audio('/static/booster.mp3'),
    music: new Audio('/static/music.mp3')
};

// Настройка звуков
for (let key in audio) {
    if (key === 'music') {
        audio[key].volume = 0.2; // Музыка тихая
        audio[key].loop = true;  // Зацикливание
    } else {
        audio[key].volume = 0.5;
    }
    // Важно: на мобилках load() иногда не работает без клика, но мы попробуем
    audio[key].load(); 
}

// Функция для быстрого воспроизведения
function playSound(name) {
    const sound = audio[name];
    if (sound) {
        const clone = sound.cloneNode(); 
        clone.volume = (name === 'click') ? 0.3 : 0.5; 
        clone.play().catch(e => {}); // Игнорим ошибки если спам кликов
    }
}

// Умный запуск музыки
function startMusic() {
    // Если музыка уже играет, ничего не делаем
    if (audio.music && !audio.music.paused) return;

    if (audio.music) {
        const playPromise = audio.music.play();
        
        if (playPromise !== undefined) {
            playPromise.then(() => {
                console.log("Music started automatically!");
                // Если музыка пошла, удаляем слушатель кликов, он больше не нужен
                document.body.removeEventListener('click', startMusic);
                document.body.removeEventListener('touchstart', startMusic);
            }).catch(error => {
                console.log("Autoplay blocked. Waiting for interaction.");
                // Если автозапуск заблокирован, музыка включится при следующем клике
            });
        }
    }
}

// --- ЗАПУСК ---
window.onload = () => {
    let progress = 0;
    const bar = document.getElementById('progress-fill');
    
    // Глобальные слушатели на ЛЮБОЕ касание экрана (на случай если автозапуск не сработал)
    document.body.addEventListener('click', startMusic, { once: true });
    document.body.addEventListener('touchstart', startMusic, { once: true });

    const loadInterval = setInterval(() => {
        progress += Math.random() * 15;
        if(progress > 100) progress = 100;
        bar.style.width = progress + '%';
        
        if(progress === 100) {
            clearInterval(loadInterval);
            
            sync().then(() => {
                // ПЫТАЕМСЯ ЗАПУСТИТЬ МУЗЫКУ СРАЗУ ПОСЛЕ ЗАГРУЗКИ
                startMusic(); 

                setTimeout(() => {
                    document.getElementById('loader').style.opacity = '0';
                    setTimeout(() => {
                        document.getElementById('loader').style.display = 'none';
                        
                        if (state.first_run) {
                            showIntro();
                        }
                    }, 500);
                }, 600);
                
                setInterval(sync, 500);
            });
        }
    }, 150);
};

// --- КЛИКЕР ---
document.getElementById('hero').addEventListener('click', (e) => {
    playSound('click'); // Звук клика

    let mult = 1;
    if(state.boosters) {
        Object.values(state.boosters).forEach(b => { if(b.is_active) mult *= b.multiplier; });
    }
    let income = (state.click_power || 1) * mult;

    createParticle(e.clientX, e.clientY, income);
    
    fetch('/api/click', { method: 'POST' })
    .then(r => r.json())
    .then(data => {
        document.getElementById('score').innerText = formatScore(data.bolts);
    });
});

function createParticle(x, y, amount) {
    const wrap = document.createElement('div');
    wrap.className = 'particle-wrapper';
    const text = "+" + formatScore(amount);
    wrap.innerHTML = `<img src="/static/bolt.png" style="width:25px"><span class="particle-text">${text}</span>`;
    
    // Рандом позиция
    const rx = (Math.random() - 0.5) * 60;
    const ry = (Math.random() - 0.5) * 60;
    
    wrap.style.left = (x + rx) + 'px';
    wrap.style.top = (y - 80 + ry) + 'px';
    document.body.appendChild(wrap);
    setTimeout(() => wrap.remove(), 800);
}

// --- СИНХРОНИЗАЦИЯ ---
function sync() {
    return fetch('/api/sync')
    .then(r => r.json())
    .then(data => {
        state = data;
        updateUI(data);
    });
}

function updateUI(data) {
    document.getElementById('score').innerText = formatScore(data.bolts);
    document.getElementById('cps').innerText = formatNumber(data.auto_income);
    
    renderList('upgrades', data.upgrades, 'upgrade');
    renderList('workers', data.workers, 'worker');
    renderList('boosters', data.boosters, 'booster');
    
    const activeDiv = document.getElementById('active-boosters-list');
    activeDiv.innerHTML = '';
    Object.values(data.boosters).forEach(b => {
        if(b.is_active) {
            const badge = document.createElement('div');
            badge.className = 'booster-badge';
            badge.innerText = `🔥 ${b.name} (x${b.multiplier}): ${b.time_left}с`;
            activeDiv.appendChild(badge);
        }
    });
}

function renderList(id, itemsObj, type) {
    const container = document.getElementById(`list-${id}`);
    let items = Object.values(itemsObj).sort((a, b) => a.order - b.order);

    if(container.children.length === 0) {
        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'card';
            div.id = `card-${item.id}`;
            div.innerHTML = getCardHTML(item, type);
            container.appendChild(div);
        });
    } else {
        items.forEach(item => {
            const div = document.getElementById(`card-${item.id}`);
            if(div) {
                const btn = div.querySelector('button');
                const canBuy = state.bolts >= item.cost;
                
                if (type === 'booster') {
                    if (item.is_active) {
                        btn.disabled = true;
                        btn.innerText = `Работает (${item.time_left}с)`;
                        btn.classList.add('active-booster');
                    } else {
                        btn.disabled = !canBuy;
                        btn.innerText = `${formatNumber(item.cost)} 🔩`;
                        btn.classList.remove('active-booster');
                    }
                } else {
                    btn.disabled = !canBuy;
                    btn.innerText = `${formatNumber(item.cost)} 🔩`;
                    const info = div.querySelector('.card-info p');
                    if(type === 'worker') info.innerText = `В штате: ${item.count} | +${formatNumber(item.cps)}/сек`;
                    if(type === 'upgrade') info.innerText = `Ур. ${item.lvl} | Сила: +${formatNumber(item.bonus)}`;
                }
            }
        });
    }
}

function getCardHTML(item, type) {
    let sub = "";
    if(type === 'worker') sub = `В штате: ${item.count} | +${formatNumber(item.cps)}/сек`;
    if(type === 'upgrade') sub = `Ур. ${item.lvl} | Сила: +${formatNumber(item.bonus)}`;
    if(type === 'booster') sub = `x${item.multiplier} на ${item.duration} сек`;

    return `
        <div class="card-info">
            <h4>${item.name}</h4>
            <p>${sub}</p>
        </div>
        <button class="btn-buy ${type==='booster'?'booster-btn':''}" onclick="buy('${type}', '${item.id}')">
            ${formatNumber(item.cost)} 🔩
        </button>
    `;
}

function buy(cat, id) {
    fetch('/api/buy', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ category: cat, id: id })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            if (cat === 'booster') {
                playSound('booster');
            } else {
                playSound('buy');
            }
            sync();
        }
    });
}

function openPanel(id) {
    closeAllPanels();
    document.getElementById(`panel-${id}`).classList.add('open');
}

function closeAllPanels() {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('open'));
}

function showIntro() {
    const modal = document.getElementById('intro-modal');
    modal.classList.remove('hidden');
    setTimeout(() => { modal.classList.add('visible'); }, 10);
}

// При нажатии кнопки "Понятно" музыка точно запустится, так как это клик
function closeIntro() {
    startMusic(); // ГАРАНТИРОВАННЫЙ ЗАПУСК
    const modal = document.getElementById('intro-modal');
    modal.classList.remove('visible');
    setTimeout(() => {
        modal.classList.add('hidden');
        fetch('/api/close_intro', { method: 'POST' });
        state.first_run = false; 
    }, 300);
}

function formatScore(num) {
    let floored = Math.floor(num);
    if (floored >= 1000000) return (floored / 1000000).toFixed(2) + "M";
    if (floored >= 1000) return (floored / 1000).toFixed(1) + "k";
    return floored;
}

function formatNumber(num) {
    if (num < 1000) return (num % 1 === 0) ? num : num.toFixed(1);
    if (num >= 1000000) return (num / 1000000).toFixed(2) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "k";
    return Math.floor(num);
}
