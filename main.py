import threading
import time
import json
import os
import sys
import webview
from flask import Flask, render_template, jsonify, request

# Путь к сохранению
def get_save_path():
    if 'ANDROID_ARGUMENT' in os.environ:
        from android.storage import app_storage_path
        return os.path.join(app_storage_path(), 'save.json')
    return 'save.json'

SAVE_FILE = get_save_path()

app = Flask(__name__, static_folder='static', template_folder='templates')
import logging
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

# --- ГЕНЕРАТОР КОНТЕНТА ---
def generate_default_state():
    workers = {}
    upgrades = {}
    boosters = {}

    # Работники
    worker_names = [
        "Муравей-грузчик", "Таракан-стажер", "Хомяк в колесе", "Кот-лапкой-тык", "Школьник",
        "Студент", "Дворник", "Офисный планктон", "Менеджер", "Директор",
        "Депутат", "Мэр", "Президент", "Илон Маск", "ИИ Скайнет",
        "Ботнет", "Серверная", "Дата-центр", "Крипто-ферма", "АЭС",
        "Ветряк", "Дамба", "Вулкан", "Тектоника", "Ядро Земли",
        "Луна-парк", "Марсоход", "Сфера Дайсона", "Звезда Смерти", "Черная дыра",
        "Квазар", "Галактика", "Скопление", "Вселенная", "Мультивселенная",
        "Бог кликов", "Кодер Python", "Баг системы", "Глитч", "Матрица",
        "Архитектор", "Агент Смит", "Нео", "Тринити", "Морфеус",
        "Оракул", "Зион", "Реальность", "Абсолют", "THE END"
    ]
    base_cost = 15
    base_cps = 0.5
    for i in range(50):
        w_id = f"worker_{i}"
        cost = int(base_cost * (1.55 ** i))
        cps = round(base_cps * (1.45 ** i), 1)
        workers[w_id] = {"id": w_id, "name": worker_names[i], "cost": cost, "cps": cps, "count": 0, "order": i}

    # Улучшения
    items_data = [("Мышка", "F"), ("Палец", "M"), ("Перчатка", "F"), ("Молот", "M"), ("Усилитель", "M"), ("Чип", "M"), ("Кабель", "M"), ("Сервер", "M"), ("Квант", "M"), ("Бог", "M")]
    materials_data = [("Деревянный", "Деревянная"), ("Медный", "Медная"), ("Железный", "Железная"), ("Золотой", "Золотая"), ("Алмазный", "Алмазная"), ("Изумрудный", "Изумрудная"), ("Плазменный", "Плазменная"), ("Космический", "Космическая"), ("Божественный", "Божественная"), ("Омега", "Омега")]
    count = 0
    current_bonus = 1
    current_cost = 50
    for mat_m, mat_f in materials_data:
        for item_name, gender in items_data:
            u_id = f"upgrade_{count}"
            adjective = mat_f if gender == 'F' else mat_m
            full_name = f"{adjective} {item_name}"
            upgrades[u_id] = {"id": u_id, "name": full_name, "cost": current_cost, "bonus": current_bonus, "lvl": 0, "order": count}
            current_bonus = int(current_bonus * 1.25) + 1
            current_cost = int(current_cost * 1.40)
            count += 1

    # Бустеры
    booster_types = [
        {"name": "Кофе-брейк", "mult": 2, "dur": 30, "cost": 500},
        {"name": "Энергетик", "mult": 3, "dur": 25, "cost": 2500},
        {"name": "Турбо-режим", "mult": 5, "dur": 20, "cost": 10000},
        {"name": "Хакерская атака", "mult": 10, "dur": 15, "cost": 50000},
        {"name": "Оверклокинг", "mult": 15, "dur": 15, "cost": 150000},
        {"name": "Квантовый скачок", "mult": 20, "dur": 10, "cost": 500000},
        {"name": "Искривление", "mult": 50, "dur": 10, "cost": 2000000},
        {"name": "Матрица", "mult": 100, "dur": 5, "cost": 10000000},
        {"name": "Щелчок Таноса", "mult": 500, "dur": 5, "cost": 100000000},
        {"name": "BIG BANG", "mult": 1000, "dur": 5, "cost": 1000000000},
    ]
    for i, b in enumerate(booster_types):
        b_id = f"booster_{i}"
        boosters[b_id] = {"id": b_id, "name": b["name"], "cost": b["cost"], "multiplier": b["mult"], "duration": b["dur"], "active_until": 0, "order": i}

    return {"bolts": 0, "click_power": 1, "auto_income": 0, "workers": workers, "upgrades": upgrades, "boosters": boosters, "first_run": True}

game_state = generate_default_state()

# Сохранение/Загрузка
def save_game():
    try:
        with open(SAVE_FILE, 'w', encoding='utf-8') as f:
            json.dump(game_state, f, indent=4, ensure_ascii=False)
    except: pass

def load_game():
    global game_state
    if not os.path.exists(SAVE_FILE): return
    try:
        with open(SAVE_FILE, 'r', encoding='utf-8') as f:
            saved_data = json.load(f)
        game_state['bolts'] = saved_data.get('bolts', 0)
        game_state['click_power'] = saved_data.get('click_power', 1)
        game_state['first_run'] = saved_data.get('first_run', True)
        for key, w in game_state['workers'].items():
            if key in saved_data.get('workers', {}):
                w['count'] = saved_data['workers'][key]['count']
                w['cost'] = saved_data['workers'][key]['cost']
        for key, u in game_state['upgrades'].items():
            if key in saved_data.get('upgrades', {}):
                u['lvl'] = saved_data['upgrades'][key]['lvl']
                u['cost'] = saved_data['upgrades'][key]['cost']
    except: pass

load_game()

# Экономика
def auto_farm_loop():
    last_save = time.time()
    while True:
        base_income = sum(w['cps'] * w['count'] for w in game_state['workers'].values())
        curr_time = time.time()
        mult = 1
        for b in game_state['boosters'].values():
            if b['active_until'] > curr_time: mult *= b['multiplier']
        income = base_income * mult
        game_state['auto_income'] = income
        if income > 0: game_state['bolts'] += income / 10
        if time.time() - last_save > 10:
            save_game()
            last_save = time.time()
        time.sleep(0.1)

# Routes
@app.route('/')
def index(): return render_template('index.html')

@app.route('/api/sync')
def sync():
    curr_time = time.time()
    for b in game_state['boosters'].values():
        b['is_active'] = b['active_until'] > curr_time
        b['time_left'] = max(0, int(b['active_until'] - curr_time))
    return jsonify(game_state)

@app.route('/api/click', methods=['POST'])
def click():
    curr_time = time.time()
    mult = 1
    for b in game_state['boosters'].values():
        if b['active_until'] > curr_time: mult *= b['multiplier']
    income = game_state['click_power'] * mult
    game_state['bolts'] += income
    return jsonify({"bolts": game_state['bolts']})

@app.route('/api/buy', methods=['POST'])
def buy():
    data = request.json
    cat = data.get('category')
    item_id = data.get('id')
    if cat == 'worker':
        item = game_state['workers'][item_id]
        if game_state['bolts'] >= item['cost']:
            game_state['bolts'] -= item['cost']
            item['count'] += 1
            item['cost'] = int(item['cost'] * 1.25)
            save_game()
            return jsonify({"success": True})
    elif cat == 'upgrade':
        item = game_state['upgrades'][item_id]
        if game_state['bolts'] >= item['cost']:
            game_state['bolts'] -= item['cost']
            item['lvl'] += 1
            item['cost'] = int(item['cost'] * 1.6)
            game_state['click_power'] += item['bonus']
            save_game()
            return jsonify({"success": True})
    elif cat == 'booster':
        item = game_state['boosters'][item_id]
        is_active = item['active_until'] > time.time()
        if game_state['bolts'] >= item['cost'] and not is_active:
            game_state['bolts'] -= item['cost']
            item['active_until'] = time.time() + item['duration']
            save_game()
            return jsonify({"success": True})
    return jsonify({"success": False})

@app.route('/api/close_intro', methods=['POST'])
def close_intro():
    game_state['first_run'] = False
    save_game()
    return jsonify({"success": True})

# --- ИСПРАВЛЕННЫЙ ЗАПУСК ---
if __name__ == '__main__':
    # 1. Запуск экономики
    t_farm = threading.Thread(target=auto_farm_loop, daemon=True)
    t_farm.start()
    
    # 2. Запуск Flask на 0.0.0.0 (Важно для Android)
    t_flask = threading.Thread(target=lambda: app.run(host='0.0.0.0', port=5000, threaded=True, use_reloader=False), daemon=True)
    t_flask.start()
    
    # 3. Даем серверу проснуться
    time.sleep(2)
    
    # 4. Запуск WebView БЕЗ лишних параметров, которые крашат Android
    # Убрали width, height и resizable.
    try:
        webview.create_window("Arsyusha Tycoon", "http://127.0.0.1:5000", background_color='#00C6FF')
        webview.start()
    except Exception as e:
        # Этот блок спасет от мгновенного краша, если Webview не инициализируется
        print(f"CRASH AVOIDED: {e}")
